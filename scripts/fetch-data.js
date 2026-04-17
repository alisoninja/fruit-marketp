/**
 * scripts/fetch-data.js
 *
 * 從 data.moa.gov.tw 抓農產品批發行情。
 * 資料來源與 amis.afa.gov.tw 同源，略有時間差異屬正常現象。
 *
 * 修正項目：
 * 1. 使用分頁迴圈抓取，不受 $top=2000 限制
 * 2. 抓近 90 天資料建立歷史趨勢
 * 3. 正確保留所有細項品名（鳳梨-金鑽鳳梨、鳳梨-開英等）
 * 4. 同時透過 Claude API 抓農業新聞存入 data/news.json
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR    = path.join(__dirname, '..', 'data');
const LATEST_PATH = path.join(DATA_DIR, 'latest.json');
const NEWS_PATH   = path.join(DATA_DIR, 'news.json');
const BASE_URL    = 'https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx';

/* 每頁筆數（API 上限約 2000） */
const PAGE_SIZE = 2000;

/* 抓近幾天的資料 */
const DAYS_BACK = 30;

/* 追蹤的作物關鍵字（作物名稱包含這些字就納入） */
const TARGET_KEYWORDS = [
  /* 水果 */
  '鳳梨','芒果','荔枝','香蕉','木瓜','葡萄','蓮霧','楊桃',
  '柳橙','草莓','西瓜','哈密瓜','釋迦','龍眼','番石榴','枇杷',
  '百香果','檸檬','文旦','柚','金棗','棗','椰子','桃','李','梨',
  '蘋果','奇異果','柑橘','橘','橙','甜瓜','李','梅','桑椹',
  /* 蔬菜 */
  '甘藍','高麗菜','番茄','地瓜','菠菜','花椰菜','青花菜',
  '青椒','茄子','黃瓜','胡瓜','四季豆','蘿蔔','洋蔥','大蒜',
  '薑','玉米','南瓜','苦瓜','絲瓜','冬瓜','芹菜','韭菜','蔥',
  '菜豆','萵苣','空心菜','莧菜','白菜','芥菜','豌豆','毛豆',
  '蘆筍','山藥','芋頭','辣椒','青蒜','小白菜','蒜苗',
];

/* 新聞抓取的代表作物 */
const NEWS_CROPS = [
  /* 水果 */
  '鳳梨','芒果','荔枝','香蕉','木瓜','葡萄','蓮霧','草莓',
  '西瓜','柳橙','文旦','釋迦','龍眼','番石榴','檸檬',
  /* 蔬菜 */
  '高麗菜','番茄','花椰菜','地瓜','菠菜','青花菜','茄子',
  '黃瓜','蘿蔔','洋蔥','大蒜','玉米','南瓜','苦瓜','蔥',
];

/* 新聞標題關鍵字 → tag 對應 */
const TAG_RULES = [
  { tag: 'weather', words: ['颱風','颱','豪雨','旱','乾旱','低溫','寒害','寒流','霜','冰雹','氣候','天氣','水災'] },
  { tag: 'policy',  words: ['農委會','農業部','補貼','補助','政策','禁令','進口','出口','關稅','法規','農藥','收購'] },
  { tag: 'market',  words: ['市場','批發','外銷','出口','需求','供應','庫存','通路','超市','賣場'] },
  { tag: 'price',   words: ['漲','跌','價格','行情','均價','上價','下價','暴漲','暴跌'] },
];

function guessTag(title) {
  for (const rule of TAG_RULES) {
    if (rule.words.some(w => title.includes(w))) return rule.tag;
  }
  return 'market';
}

/* 從 Google News RSS 抓新聞（免費，無需 API key） */
async function fetchNewsRSS(cropName) {
  /* after: 限制只抓近 30 天，避免 Google 返回太舊的文章 */
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const afterDate     = thirtyDaysAgo.toISOString().slice(0, 10);
  const q   = encodeURIComponent(`台灣 ${cropName} 農業 批發 after:${afterDate}`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=zh-TW&gl=TW&ceid=TW:zh-TW`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'fruit-marketp-bot/2.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  /* 簡單 XML 解析：不依賴外部套件 */
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 4) {
    const block   = m[1];
    const title   = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() || '';
    const link    = (block.match(/<link>(.*?)<\/link>/) || [])[1]?.trim() || '';
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1]?.trim() || '';
    const source  = (block.match(/<source[^>]*>(.*?)<\/source>/) || [])[1]?.trim() || 'Google News';

    if (!title || !link?.startsWith('http')) continue;

    /* pubDate → YYYY-MM-DD */
    let date = '';
    try { date = new Date(pubDate).toISOString().slice(0, 10); } catch { date = ''; }

    items.push({ title, url: link, source, date, tag: guessTag(title) });
  }
  return items;
}

function toROCDate(date) {
  const y = date.getFullYear() - 1911;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function isTarget(name) {
  return TARGET_KEYWORDS.some(k => name.includes(k));
}

function avgArr(arr) {
  if (!arr.length) return null;
  return +(arr.reduce((a,b)=>a+b,0) / arr.length).toFixed(1);
}

/* 分頁抓取一段日期範圍 */
async function fetchDateRange(startDate, endDate) {
  const start = toROCDate(startDate);
  const end   = toROCDate(endDate);
  console.log(`  抓取：${start} ~ ${end}`);

  const all = [];
  let skip  = 0;

  while (true) {
    const url = `${BASE_URL}?$top=${PAGE_SIZE}&$skip=${skip}&StartDate=${start}&EndDate=${end}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'fruit-marketp-bot/2.0' },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) { console.warn(`    HTTP ${res.status}`); break; }
      const text = await res.text();
      if (!text.trim() || text.trim() === '[]') break;
      const page = JSON.parse(text);
      if (!page.length) break;
      all.push(...page);
      if (page.length < PAGE_SIZE) break;  /* 最後一頁 */
      skip += PAGE_SIZE;
      await new Promise(r => setTimeout(r, 300)); /* 避免過快 */
    } catch (err) {
      console.warn(`    fetch error: ${err.message}`);
      break;
    }
  }
  console.log(`    取得 ${all.length} 筆`);
  return all;
}

/* 解析單筆記錄 */
function parseRecord(r) {
  return {
    date:     r['交易日期']           || '',
    catCode:  r['種類代碼']           || '',
    cropCode: r['作物代號']           || '',
    name:     (r['作物名稱']          || '').trim(),
    mktCode:  r['市場代號']           || '',
    mktName:  (r['市場名稱']          || '').trim(),
    hi:       parseFloat(r['上價'])   || 0,
    mid:      parseFloat(r['中價'])   || 0,
    lo:       parseFloat(r['下價'])   || 0,
    avg:      parseFloat(r['平均價']) || 0,
    vol:      parseFloat(r['交易量']) || 0,
  };
}

/* 主程式 */
async function main() {
  console.log('=== 農產報價 Pro 資料更新 ===');
  console.log(`時間（UTC）：${new Date().toISOString()}`);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  /* ── 1. 農業部行情資料 ── */
  console.log('\n[1/2] 農業部 FarmTransData API...');

  const endDate   = new Date();
  const midDate   = new Date(); midDate.setDate(endDate.getDate() - 15);
    const startDate = new Date(); startDate.setDate(endDate.getDate() - DAYS_BACK);

  let raw = [];
  try {
    /* 分兩段抓，減少單次資料量 */
    const r1 = await fetchDateRange(startDate, midDate);
  const r2 = await fetchDateRange(midDate, endDate);
  raw = [...r1, ...r2];
  } catch (err) {
    console.error('  API 失敗：', err.message);
  }

  if (raw.length > 0) {
    /* 過濾：只保留目標農產品，且均價 > 0 */
    const records = raw
      .map(parseRecord)
      .filter(r => r.avg > 0 && r.name && isTarget(r.name));

    console.log(`  有效筆數：${records.length}`);

    /* 以「作物名稱」為 key 分組 */
    const grouped = {};

    for (const r of records) {
      const key = r.name;
      if (!grouped[key]) {
        grouped[key] = {
          name:     key,
          catCode:  r.catCode,
          cropCode: r.cropCode,
          markets:  {},  /* mktName → { date → slot } */
        };
      }

      const mkt = r.mktName;
      if (!grouped[key].markets[mkt]) grouped[key].markets[mkt] = {};
      const slot = grouped[key].markets[mkt][r.date]
        || (grouped[key].markets[mkt][r.date] = { hi:[], mid:[], lo:[], avg:[], vol:0 });

      if (r.hi  > 0) slot.hi.push(r.hi);
      if (r.mid > 0) slot.mid.push(r.mid);
      if (r.lo  > 0) slot.lo.push(r.lo);
      if (r.avg > 0) slot.avg.push(r.avg);
      slot.vol += r.vol;
    }

    /* 後處理：整理 mktSummary 和 history */
    for (const key of Object.keys(grouped)) {
      const crop = grouped[key];

      /* mktSummary：各市場最新一天的代表值 */
      const mktSummary = {};
      for (const [mktName, dateMap] of Object.entries(crop.markets)) {
        const dates  = Object.keys(dateMap).sort();
        const latest = dates[dates.length - 1];
        const slot   = dateMap[latest];
        mktSummary[mktName] = {
          latestDate: latest,
          avg: avgArr(slot.avg),
          hi:  avgArr(slot.hi),
          lo:  avgArr(slot.lo),
          vol: slot.vol,
        };
      }
      crop.mktSummary = mktSummary;

      /* history：全台每日均價（加總所有市場） */
      const allDateMap = {};
      for (const dateMap of Object.values(crop.markets)) {
        for (const [date, slot] of Object.entries(dateMap)) {
          if (!allDateMap[date]) allDateMap[date] = { avgs:[], vols:0 };
          allDateMap[date].avgs.push(...slot.avg);
          allDateMap[date].vols += slot.vol;
        }
      }
      crop.history = Object.entries(allDateMap)
        .sort(([a],[b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, avg: avgArr(v.avgs), vol: v.vols }))
        .filter(d => d.avg !== null);

      /* latest：最新一天全台加總 */
      if (crop.history.length > 0) {
        const last = crop.history[crop.history.length - 1];
        const prev = crop.history.length > 1 ? crop.history[crop.history.length - 2] : null;
        crop.latest = {
          date:    last.date,
          avg:     last.avg,
          vol:     last.vol,
          prevAvg: prev?.avg ?? null,
          chgPct:  prev?.avg
            ? +(((last.avg - prev.avg) / prev.avg) * 100).toFixed(1)
            : null,
        };
      }

      /* 清除暫存 markets 物件（減少 JSON 體積） */
      delete crop.markets;
    }

    const output = {
      updatedAt:  new Date().toISOString(),
      source:     'data.moa.gov.tw FarmTransData API（農業部農業開放資料平台）',
      note:       '資料與 amis.afa.gov.tw 同源，更新時間略有差異屬正常現象',
      totalCrops: Object.keys(grouped).length,
      crops:      grouped,
    };

    fs.writeFileSync(LATEST_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n  ✅ latest.json 完成，共 ${output.totalCrops} 種作物`);

    /* 顯示鳳梨相關資料確認 */
    const pineappleKeys = Object.keys(grouped).filter(k => k.includes('鳳梨'));
    console.log(`\n  鳳梨相關品項（${pineappleKeys.length} 種）：`);
    for (const k of pineappleKeys.slice(0, 8)) {
      const l = grouped[k].latest;
      if (l) console.log(`    ${k}：均價 ${l.avg} 元/kg（${l.date}）漲跌 ${l.chgPct ?? 'N/A'}%`);
    }
    /* 顯示台北二金鑽確認 */
    const jinzuan = grouped['鳳梨-金鑽鳳梨'];
    if (jinzuan?.mktSummary?.['台北二']) {
      const m = jinzuan.mktSummary['台北二'];
      console.log(`\n  ✓ 鳳梨-金鑽鳳梨 台北二：上價 ${m.hi} 均價 ${m.avg} 下價 ${m.lo}（${m.latestDate}）`);
    }
  }

  /* ── 2. 農業新聞（Google News RSS，免費無需 API key）── */
  console.log('\n[2/2] 透過 Google News RSS 抓取農業新聞...');
  const newsData = {};

  for (const cropName of NEWS_CROPS) {
    process.stdout.write(`  搜尋：${cropName}... `);
    try {
      const articles = await fetchNewsRSS(cropName);
      newsData[cropName] = articles;
      console.log(`${articles.length} 則`);
    } catch (err) {
      console.log(`失敗（${err.message}）`);
      newsData[cropName] = [];
    }
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(NEWS_PATH, JSON.stringify({
    updatedAt: new Date().toISOString(),
    news: newsData,
  }, null, 2), 'utf-8');
  console.log('  ✅ news.json 完成');

  console.log('\n=== 完成 ===');
}

main().catch(err => {
  console.error('❌ 執行失敗：', err.message);
  process.exit(1);
});