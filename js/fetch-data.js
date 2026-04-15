/**
 * scripts/fetch-data.js
 *
 * 每次執行做兩件事：
 * 1. 從農業部 API 抓近 90 天農產品批發行情 → data/latest.json
 * 2. 用 Claude API (web_search) 抓各作物真實新聞 → data/news.json
 *
 * 執行：node scripts/fetch-data.js
 * 需要：Node.js 18+（內建 fetch）
 * 環境變數：ANTHROPIC_API_KEY（GitHub Actions Secret）
 */

const fs   = require('fs');
const path = require('path');

/* ── 設定 ── */
const DATA_DIR      = path.join(__dirname, '..', 'data');
const LATEST_PATH   = path.join(DATA_DIR, 'latest.json');
const NEWS_PATH     = path.join(DATA_DIR, 'news.json');
const BASE_URL      = 'https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx';
const TOP           = 2000;
const DAYS_BACK     = 90;

/* 追蹤的作物清單 */
const TARGET_CROPS = [
  '鳳梨','芒果','荔枝','香蕉','木瓜','葡萄','蓮霧','楊桃',
  '柳橙','草莓','西瓜','哈密瓜','釋迦','龍眼',
  '高麗菜','番茄','地瓜','菠菜','花椰菜','青花菜',
  '青椒','茄子','小黃瓜','四季豆','白蘿蔔','紅蘿蔔',
];

/* 需要抓新聞的作物（只抓重要的，避免 API 呼叫過多） */
const NEWS_CROPS = ['鳳梨','芒果','荔枝','香蕉','高麗菜','番茄','地瓜','花椰菜'];

/* ── 工具 ── */
function toROCDate(date) {
  const y = date.getFullYear() - 1911;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function isTargetCrop(name) {
  return TARGET_CROPS.some(t => name.includes(t));
}

function avg(arr) {
  if (!arr.length) return null;
  return +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1);
}

/* ── 農業部 API ── */
async function fetchRange(startDate, endDate) {
  const start = toROCDate(startDate);
  const end   = toROCDate(endDate);
  const url   = `${BASE_URL}?$top=${TOP}&$skip=0&StartDate=${start}&EndDate=${end}`;
  console.log(`  抓取範圍：${start} ~ ${end}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'fruit-marketp-bot/1.0 (github.com)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim() || text.trim() === '[]') return [];
  try { return JSON.parse(text); } catch { return []; }
}

function parseRecord(r) {
  return {
    date:     r['交易日期']           || '',
    catCode:  r['種類代碼']           || '',
    cropCode: r['作物代號']           || '',
    name:     r['作物名稱']           || '',
    mktCode:  r['市場代號']           || '',
    mktName:  r['市場名稱']           || '',
    hi:  parseFloat(r['上價(元/公斤)']   || r['上價']  || 0),
    mid: parseFloat(r['中價(元/公斤)']   || r['中價']  || 0),
    lo:  parseFloat(r['下價(元/公斤)']   || r['下價']  || 0),
    avg: parseFloat(r['平均價(元/公斤)'] || r['平均價'] || 0),
    vol: parseFloat(r['交易量(公斤)']    || r['交易量'] || 0),
  };
}

/* ── Claude API 新聞搜尋 ── */
async function fetchNewsForCrop(cropName, apiKey) {
  const prompt = `你是台灣農業新聞搜尋助手。
請使用 web_search 搜尋以下兩個關鍵字：
1. "台灣 ${cropName} 批發 價格 2025"
2. "台灣 ${cropName} 農業 新聞 2025"

從搜尋結果整理出最多 4 則**真實存在**的新聞。
每則必須包含：
- title: 新聞標題（來自真實搜尋結果，不可自行創作）
- url: 原文連結（必須是真實可點擊的 https:// URL）
- source: 來源名稱（例如：農傳媒、農糧署、聯合報等）
- date: 發布日期（格式：YYYY-MM-DD，不確定填 null）
- tag: 只能是 price / weather / policy / market 之一

只回傳 JSON 陣列，不要有任何其他文字或 markdown：
[{"title":"...","url":"https://...","source":"...","date":"2025-04-15","tag":"price"}]`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: '只回傳 JSON 陣列，不回傳任何其他文字。',
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`Claude API HTTP ${res.status}`);
    const data  = await res.json();
    const text  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    const articles = JSON.parse(match[0]);
    return articles.filter(a => a && a.title && a.url && a.url.startsWith('http'));
  } catch (err) {
    console.warn(`  [新聞] ${cropName} 抓取失敗：${err.message}`);
    return [];
  }
}

/* ── 主程式 ── */
async function main() {
  console.log('=== 農產報價 Pro 資料更新開始 ===');
  console.log(`時間（UTC）：${new Date().toISOString()}`);

  /* 確保 data/ 資料夾存在 */
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  /* ── 1. 抓農業部行情資料 ── */
  console.log('\n[1/2] 農業部 API 行情資料...');

  const endDate   = new Date();
  const midDate   = new Date(); midDate.setDate(endDate.getDate() - 45);
  const startDate = new Date(); startDate.setDate(endDate.getDate() - DAYS_BACK);

  let raw = [];
  try {
    const [r1, r2] = await Promise.all([
      fetchRange(startDate, midDate),
      fetchRange(midDate, endDate),
    ]);
    raw = [...r1, ...r2];
    console.log(`  原始筆數：${raw.length}`);
  } catch (err) {
    console.error('  農業部 API 失敗：', err.message);
    /* 若已有舊資料則保留，不覆蓋 */
    if (fs.existsSync(LATEST_PATH)) {
      console.log('  保留舊的 latest.json');
    }
  }

  if (raw.length > 0) {
    const records = raw
      .map(parseRecord)
      .filter(r => r.avg > 0 && r.name && isTargetCrop(r.name));

    console.log(`  過濾後筆數：${records.length}`);

    const grouped = {};
    for (const r of records) {
      const key = r.name;
      if (!grouped[key]) {
        grouped[key] = { name: key, catCode: r.catCode, cropCode: r.cropCode, markets: {}, history: [], latest: null };
      }
      if (!grouped[key].markets[r.mktName]) grouped[key].markets[r.mktName] = {};
      const slot = grouped[key].markets[r.mktName][r.date] || (grouped[key].markets[r.mktName][r.date] = { hi:[], mid:[], lo:[], avg:[], vol:0 });
      if (r.hi  > 0) slot.hi.push(r.hi);
      if (r.mid > 0) slot.mid.push(r.mid);
      if (r.lo  > 0) slot.lo.push(r.lo);
      if (r.avg > 0) slot.avg.push(r.avg);
      slot.vol += r.vol;
    }

    for (const key of Object.keys(grouped)) {
      const crop = grouped[key];

      /* mktSummary */
      const mktSummary = {};
      for (const [mktName, dateMap] of Object.entries(crop.markets)) {
        const latest = Object.keys(dateMap).sort().pop();
        const slot   = dateMap[latest];
        mktSummary[mktName] = { latestDate: latest, avg: avg(slot.avg), hi: avg(slot.hi), lo: avg(slot.lo), vol: slot.vol };
      }
      crop.mktSummary = mktSummary;

      /* 全台歷史均價 */
      const allDateMap = {};
      for (const dateMap of Object.values(crop.markets)) {
        for (const [date, slot] of Object.entries(dateMap)) {
          if (!allDateMap[date]) allDateMap[date] = { avgs: [], vols: 0 };
          allDateMap[date].avgs.push(...slot.avg);
          allDateMap[date].vols += slot.vol;
        }
      }
      crop.history = Object.entries(allDateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, avg: avg(v.avgs), vol: v.vols }))
        .filter(d => d.avg !== null);

      /* latest */
      if (crop.history.length > 0) {
        const last = crop.history[crop.history.length - 1];
        const prev = crop.history.length > 1 ? crop.history[crop.history.length - 2] : null;
        crop.latest = {
          date:    last.date,
          avg:     last.avg,
          vol:     last.vol,
          prevAvg: prev?.avg ?? null,
          chgPct:  prev?.avg ? +(((last.avg - prev.avg) / prev.avg) * 100).toFixed(1) : null,
        };
      }

      delete crop.markets;
    }

    const output = {
      updatedAt:  new Date().toISOString(),
      source:     '農業部農業開放資料平台 FarmTransData API',
      totalCrops: Object.keys(grouped).length,
      crops:      grouped,
    };

    fs.writeFileSync(LATEST_PATH, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`  ✅ latest.json 寫入完成，共 ${output.totalCrops} 種作物`);

    /* 顯示摘要 */
    Object.entries(grouped).slice(0, 6).forEach(([k, v]) => {
      if (v.latest) console.log(`     ${k}：${v.latest.avg} 元/kg (${v.latest.date}) 漲跌 ${v.latest.chgPct ?? 'N/A'}%`);
    });
  }

  /* ── 2. 抓農業新聞 ── */
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('\n[2/2] 跳過新聞抓取（ANTHROPIC_API_KEY 未設定）');
  } else {
    console.log('\n[2/2] 透過 Claude API 搜尋農業新聞...');
    const newsData = {};
    const now      = new Date().toISOString();

    for (const cropName of NEWS_CROPS) {
      console.log(`  搜尋：${cropName}`);
      const articles = await fetchNewsForCrop(cropName, apiKey);
      newsData[cropName] = articles;
      console.log(`     找到 ${articles.length} 則`);
      /* 避免 API rate limit */
      await new Promise(r => setTimeout(r, 1500));
    }

    const newsOutput = { updatedAt: now, news: newsData };
    fs.writeFileSync(NEWS_PATH, JSON.stringify(newsOutput, null, 2), 'utf-8');
    console.log(`  ✅ news.json 寫入完成`);
  }

  console.log('\n=== 完成 ===');
}

main().catch(err => {
  console.error('❌ 執行失敗：', err.message);
  process.exit(1);
});
