/**
 * scripts/fetch-data.js
 *
 * 每日由 GitHub Actions 執行。
 * 從農業部開放資料平台抓取近 90 天農產品批發行情，
 * 整理後寫入 data/latest.json。
 *
 * 執行方式：node scripts/fetch-data.js
 * 需要 Node.js 18+（內建 fetch）
 */

const fs   = require('fs');
const path = require('path');

/* ── 設定 ────────────────────────────────────────────── */

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'latest.json');
const BASE_URL    = 'https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx';
const TOP         = 2000;   // 單次最多筆數
const DAYS_BACK   = 90;     // 抓近幾天

/* 我們追蹤的作物（作物名稱關鍵字） */
const TARGET_CROPS = [
  '鳳梨', '芒果', '荔枝', '香蕉', '木瓜', '葡萄',
  '高麗菜', '番茄', '地瓜', '菠菜', '花椰菜', '青花菜',
  '西瓜', '哈密瓜', '蓮霧', '楊桃', '柳橙', '柑橘',
  '草莓', '桃子', '李子', '梨子', '蘋果',
  '青椒', '茄子', '小黃瓜', '四季豆', '白蘿蔔', '紅蘿蔔',
];

/* ── 工具函式 ────────────────────────────────────────── */

/** 取得民國日期字串，格式：114.04.15 */
function toROCDate(date) {
  const y  = date.getFullYear() - 1911;
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/** 民國日期字串 → Date 物件 */
function rocToDate(roc) {
  const parts = roc.split('.');
  if (parts.length < 3) return null;
  const year  = parseInt(parts[0], 10) + 1911;
  const month = parseInt(parts[1], 10) - 1;
  const day   = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/** 從 API 抓一段日期範圍的資料（分批抓，避免筆數限制） */
async function fetchRange(startDate, endDate) {
  const start = toROCDate(startDate);
  const end   = toROCDate(endDate);
  const url   = `${BASE_URL}?$top=${TOP}&$skip=0&StartDate=${start}&EndDate=${end}`;

  console.log(`  抓取：${start} ~ ${end}`);

  const res  = await fetch(url, { headers: { 'User-Agent': 'fruit-marketp-bot/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const text = await res.text();
  if (!text.trim()) return [];

  try {
    return JSON.parse(text);
  } catch {
    console.warn('  JSON 解析失敗，跳過此批');
    return [];
  }
}

/** 解析單筆 API 記錄 */
function parseRecord(r) {
  return {
    date:    r['交易日期']   || '',
    catCode: r['種類代碼']   || '',
    cropCode:r['作物代號']   || '',
    name:    r['作物名稱']   || '',
    mktCode: r['市場代號']   || '',
    mktName: r['市場名稱']   || '',
    hi:      parseFloat(r['上價(元/公斤)']  || r['上價']  || 0),
    mid:     parseFloat(r['中價(元/公斤)']  || r['中價']  || 0),
    lo:      parseFloat(r['下價(元/公斤)']  || r['下價']  || 0),
    avg:     parseFloat(r['平均價(元/公斤)']|| r['平均價'] || 0),
    vol:     parseFloat(r['交易量(公斤)']   || r['交易量'] || 0),
  };
}

/** 判斷作物名稱是否在追蹤清單內 */
function isTargetCrop(name) {
  return TARGET_CROPS.some(t => name.includes(t));
}

/* ── 主邏輯 ─────────────────────────────────────────── */

async function main() {
  console.log('=== 農產品行情資料抓取開始 ===');

  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - DAYS_BACK);

  /* 分兩段抓（每段 45 天），避免單次 2000 筆不夠 */
  const mid = new Date();
  mid.setDate(endDate.getDate() - Math.floor(DAYS_BACK / 2));

  const raw1 = await fetchRange(startDate, mid);
  const raw2 = await fetchRange(mid, endDate);
  const raw  = [...raw1, ...raw2];

  console.log(`  原始筆數：${raw.length}`);

  /* 解析 + 過濾目標作物 + 過濾無效均價 */
  const records = raw
    .map(parseRecord)
    .filter(r => r.avg > 0 && r.name && isTargetCrop(r.name));

  console.log(`  過濾後筆數：${records.length}`);

  /* 依「作物名稱 + 市場」分組，整理成前端所需結構 */
  const grouped = {};

  for (const r of records) {
    const key = r.name;

    if (!grouped[key]) {
      grouped[key] = {
        name:     key,
        catCode:  r.catCode,
        cropCode: r.cropCode,
        markets:  {},      /* mktName → 該市場的日期序列 */
        history:  [],      /* 全台加總的日期序列（依日期排序）*/
        latest:   null,    /* 最新一天的全台彙總 */
      };
    }

    const mkt = r.mktName;
    if (!grouped[key].markets[mkt]) grouped[key].markets[mkt] = {};

    const dateKey = r.date;
    if (!grouped[key].markets[mkt][dateKey]) {
      grouped[key].markets[mkt][dateKey] = { hi: [], mid: [], lo: [], avg: [], vol: 0 };
    }

    const slot = grouped[key].markets[mkt][dateKey];
    if (r.hi  > 0) slot.hi.push(r.hi);
    if (r.mid > 0) slot.mid.push(r.mid);
    if (r.lo  > 0) slot.lo.push(r.lo);
    if (r.avg > 0) slot.avg.push(r.avg);
    slot.vol += r.vol;
  }

  /* 計算每個市場每天的代表值，並彙整全台 */
  function avg(arr) {
    if (!arr.length) return null;
    return +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1);
  }

  for (const cropKey of Object.keys(grouped)) {
    const crop = grouped[cropKey];

    /* 整理市場資料 */
    const mktSummary = {}; /* mktName → { latestDate, avg, hi, lo, vol } */

    for (const [mktName, dateMap] of Object.entries(crop.markets)) {
      const dates = Object.keys(dateMap).sort();
      const latest = dates[dates.length - 1];
      const slot   = dateMap[latest];
      mktSummary[mktName] = {
        latestDate: latest,
        avg: avg(slot.avg),
        hi:  avg(slot.hi),
        lo:  avg(slot.lo),
        vol: slot.vol,
      };
    }

    crop.mktSummary = mktSummary;

    /* 彙整全台歷史均價（依日期） */
    const allDateMap = {};
    for (const dateMap of Object.values(crop.markets)) {
      for (const [date, slot] of Object.entries(dateMap)) {
        if (!allDateMap[date]) allDateMap[date] = { avgs: [], vols: 0 };
        if (slot.avg.length) allDateMap[date].avgs.push(...slot.avg);
        allDateMap[date].vols += slot.vol;
      }
    }

    crop.history = Object.entries(allDateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        avg: avg(v.avgs),
        vol: v.vols,
      }))
      .filter(d => d.avg !== null);

    /* 最新一天彙總 */
    if (crop.history.length > 0) {
      const last = crop.history[crop.history.length - 1];
      const prev = crop.history.length > 1 ? crop.history[crop.history.length - 2] : null;
      crop.latest = {
        date:    last.date,
        avg:     last.avg,
        vol:     last.vol,
        prevAvg: prev ? prev.avg : null,
        chgPct:  prev && prev.avg
          ? +(((last.avg - prev.avg) / prev.avg) * 100).toFixed(1)
          : null,
      };
    }

    /* 清除內部暫存的 markets 原始資料（減少 JSON 大小） */
    delete crop.markets;
  }

  /* 輸出結果 */
  const output = {
    updatedAt: new Date().toISOString(),
    source:    '農業部農業開放資料平台 FarmTransData API',
    apiUrl:    BASE_URL,
    totalCrops: Object.keys(grouped).length,
    crops:     grouped,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ 完成！共 ${output.totalCrops} 種作物，已寫入 ${OUTPUT_PATH}`);
  console.log(`   更新時間：${output.updatedAt}`);

  /* 顯示前五筆摘要 */
  const keys = Object.keys(grouped).slice(0, 5);
  for (const k of keys) {
    const l = grouped[k].latest;
    if (l) {
      console.log(`   ${k}：${l.avg} 元/kg（${l.date}）漲跌 ${l.chgPct ?? 'N/A'}%`);
    }
  }
}

main().catch(err => {
  console.error('❌ 抓取失敗：', err.message);
  process.exit(1);
});
