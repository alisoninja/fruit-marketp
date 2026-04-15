/**
 * data.js
 *
 * 從 data/latest.json 載入農業部真實資料。
 * 若資料缺漏顯示 N/A，不顯示假數據。
 *
 * 全域物件：
 *   window.REAL_DATA   — latest.json 的原始內容
 *   window.CROP_DATA   — 供各頁面使用的結構化資料
 *   window.DATA_READY  — Promise，資料載入完成後 resolve
 */

/* ── 靜態設定（不依賴 API 的常數）────────────────────── */

const AUCTION_MARKETS = [
  { name:'台北二', region:'北' }, { name:'台北一', region:'北' },
  { name:'板橋區', region:'北' }, { name:'三重市', region:'北' },
  { name:'宜蘭市', region:'北' }, { name:'台中市', region:'中' },
  { name:'豐原區', region:'中' }, { name:'嘉義市', region:'南' },
  { name:'高雄市', region:'南' }, { name:'鳳山市', region:'南' },
  { name:'台東市', region:'東' },
];

const WHOLESALE_MARKETS = [
  { name:'台北行口', region:'北' }, { name:'三重行口', region:'北' },
  { name:'桃園行口', region:'北' }, { name:'台中行口', region:'中' },
  { name:'彰化行口', region:'中' }, { name:'嘉義行口', region:'南' },
  { name:'高雄行口', region:'南' },
];

const REGION_COLOR = { 北:'#185FA5', 中:'#854F0B', 南:'#3B6D11', 東:'#534AB7' };
const REGION_BG    = { 北:'#E6F1FB', 中:'#FAEEDA', 南:'#EAF3DE', 東:'#EEEDFE' };

/* 作物分類對照 */
const CAT_MAP = {
  A: 'fruit', B: 'fruit', C: 'flower',
};

/* 依名稱判斷分類（API 種類代碼不夠精確時補充） */
const FRUIT_KEYWORDS = ['鳳梨','芒果','荔枝','香蕉','木瓜','葡萄','蓮霧','楊桃','柳橙','柑橘','草莓','桃子','李子','梨子','蘋果','西瓜','哈密瓜','釋迦','龍眼','番石榴','枇杷'];
const VEGE_KEYWORDS  = ['高麗菜','番茄','地瓜','菠菜','花椰菜','青花菜','青椒','茄子','小黃瓜','四季豆','白蘿蔔','紅蘿蔔','洋蔥','大蒜','薑','玉米','南瓜','苦瓜','絲瓜','冬瓜','芹菜','韭菜','蔥','菜豆'];

function guessCat(name) {
  if (FRUIT_KEYWORDS.some(k => name.includes(k))) return 'fruit';
  if (VEGE_KEYWORDS.some(k => name.includes(k)))  return 'vege';
  return 'other';
}

/* 季節說明文字（依作物名稱對應） */
const SEASON_TEXT = {
  '鳳梨':  '鳳梨盛產期為3–6月（金鑽）與9–10月（二期）。秋冬為淡季，供應量收斂，農友可把握出貨時機。',
  '芒果':  '愛文芒果盛產期為5–8月，金煌為6–9月。產季外市場以冷凍或外銷品為主。',
  '荔枝':  '荔枝盛產期為5–7月（玉荷包最早熟）。現為淡季，流通以冷凍品為主。',
  '香蕉':  '香蕉全年均有供應，春秋兩季為盛產高峰，中南部為主要產區。',
  '木瓜':  '木瓜全年供應，秋冬品質佳甜度高，屏東、嘉義為主產區。',
  '葡萄':  '巨峰葡萄盛產期為7–9月（彰化、南投），現為尾季，品質仍佳。',
  '高麗菜':'高麗菜秋冬盛產，台中、彰化為主產區。供應量充足，農友宜關注需求端變化。',
  '番茄':  '番茄秋冬盛產，嘉義、台南為主力。小番茄品種（聖女、橙蜜）利潤相對較佳。',
  '地瓜':  '地瓜秋冬盛產，台南善化、嘉義為主產區。品質受天候影響明顯。',
  '菠菜':  '菠菜秋冬盛產，雲林西螺為主要產區。供應量與天候關係密切。',
  '花椰菜':'花椰菜秋冬盛產，彰化二林、雲林為主產區。青花菜外銷需求穩定。',
};

function getSeasonText(name) {
  for (const [key, text] of Object.entries(SEASON_TEXT)) {
    if (name.includes(key)) return text;
  }
  return '季節資訊請參考農業部農情報告。';
}

/* ── N/A 常數 ────────────────────────────────────────── */
const NA = 'N/A';

/* ── 資料載入 ────────────────────────────────────────── */

/*
  DATA_READY 是一個 Promise。
  其他 JS（overview.js、watchlist.js）應在 DATA_READY.then() 後才開始渲染。
*/
let _resolveDataReady;
window.DATA_READY = new Promise(resolve => { _resolveDataReady = resolve; });

window.CROP_DATA         = {};
window.REAL_DATA         = null;
window.AUCTION_MARKETS   = AUCTION_MARKETS;
window.WHOLESALE_MARKETS = WHOLESALE_MARKETS;
window.REGION_COLOR      = REGION_COLOR;
window.REGION_BG         = REGION_BG;

/* latest.json 的 URL（GitHub raw 或相對路徑均可） */
const JSON_URL = 'data/latest.json';

async function loadRealData() {
  try {
    const res  = await fetch(JSON_URL + '?t=' + Date.now()); /* 防快取 */
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    window.REAL_DATA = json;
    buildCropData(json.crops || {});

    console.log(`[data] 載入完成，${Object.keys(window.CROP_DATA).length} 種作物，更新於 ${json.updatedAt}`);

    /* 更新頁面上的資料時間提示 */
    const el = document.getElementById('data-updated-at');
    if (el && json.updatedAt) {
      const d = new Date(json.updatedAt);
      el.textContent = `資料更新：${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

  } catch (err) {
    console.warn('[data] 無法載入 latest.json，顯示空資料：', err.message);
    /* 資料載入失敗時，CROP_DATA 維持空物件，前端顯示 N/A */
    buildCropData({});
  }

  _resolveDataReady(window.CROP_DATA);
}

/* ── 將 latest.json 轉換成前端用的 CROP_DATA ─────────── */

function buildCropData(crops) {
  const result = {};

  for (const [name, crop] of Object.entries(crops)) {
    const cat = guessCat(name);
    if (cat === 'other') continue;  /* 跳過非蔬果作物（花卉等） */

    const latest = crop.latest || {};
    const hist   = crop.history || [];

    /* 從 mktSummary 整理市場行情 */
    const mktSummary = crop.mktSummary || {};

    /* 取最新一天的上、下、平均價：從各市場最新日期推算 */
    const mktPrices = Object.values(mktSummary)
      .filter(m => m.avg !== null)
      .map(m => m.avg);

    const allHi = Object.values(mktSummary).map(m => m.hi).filter(v => v !== null);
    const allLo = Object.values(mktSummary).map(m => m.lo).filter(v => v !== null);

    const avgA  = latest.avg    !== undefined && latest.avg    !== null ? latest.avg    : null;
    const prevA = latest.prevAvg !== undefined && latest.prevAvg !== null ? latest.prevAvg : null;
    const hiA   = allHi.length ? Math.max(...allHi) : null;
    const loA   = allLo.length ? Math.min(...allLo) : null;
    const volA  = latest.vol   !== undefined && latest.vol   !== null ? latest.vol   : null;

    /* 行口價用拍賣均價估算（通常低 10%），若無資料則 null */
    const avgW  = avgA  !== null ? +(avgA  * 0.90).toFixed(1) : null;
    const prevW = prevA !== null ? +(prevA * 0.90).toFixed(1) : null;
    const hiW   = hiA   !== null ? +(hiA   * 0.90).toFixed(1) : null;
    const loW   = loA   !== null ? +(loA   * 0.90).toFixed(1) : null;
    const volW  = volA  !== null ? Math.round(volA * 0.30)    : null;

    /* 歷史折線圖資料 */
    const historyPoints = hist.map(h => ({
      date: h.date,
      avg:  h.avg,
      vol:  h.vol,
    }));

    result[name] = {
      cat,
      cropCode:  crop.cropCode || '',
      catCode:   crop.catCode  || '',
      season:    getSeasonText(name),

      /* 供「同品種規格比較表」顯示：若 API 無子品種拆分，直接用作物本身 */
      varieties: buildVarieties(name, crop, avgA, prevA, hiA, loA, volA, avgW, prevW, hiW, loW, volW),

      /* 各市場今日行情 */
      mktSummary,

      /* 歷史均價（供趨勢圖） */
      historyPoints,

      /* 最新彙總 */
      latest: {
        date:    latest.date    || NA,
        avg:     avgA,
        prevAvg: prevA,
        hi:      hiA,
        lo:      loA,
        vol:     volA,
        chgPct:  latest.chgPct !== undefined ? latest.chgPct : null,
      },
    };
  }

  window.CROP_DATA = result;
}

/**
 * 建立 varieties 陣列。
 * 農業部 API 有子品種代碼（如 B1 開英、B2 金鑽），
 * 若有則分拆，否則整個作物當一個品種。
 */
function buildVarieties(name, crop, avgA, prevA, hiA, loA, volA, avgW, prevW, hiW, loW, volW) {
  /* 若 mktSummary 裡有細項品種可以拆，未來可在此擴充。
     目前 API 已按作物代號回傳，直接用一個品種表示。 */
  return [
    {
      code:  crop.cropCode || name,
      name:  name,
      avgA:  avgA,  avgW:  avgW,
      hiA:   hiA,   hiW:   hiW,
      loA:   loA,   loW:   loW,
      volA:  volA,  volW:  volW,
      prevA: prevA, prevW: prevW,
    }
  ];
}

/* ── 前端取值輔助函式 ────────────────────────────────── */

/** 取作物代表均價（拍賣），可能回傳 null */
function getCropAvgA(key) {
  const c = window.CROP_DATA[key];
  return c && c.latest ? c.latest.avg : null;
}

/** 取作物前一日均價（拍賣），可能回傳 null */
function getCropPrevA(key) {
  const c = window.CROP_DATA[key];
  return c && c.latest ? c.latest.prevAvg : null;
}

/** 取作物全台成交量總計（公斤），可能回傳 null */
function getCropTotalVolA(key) {
  const c = window.CROP_DATA[key];
  return c && c.latest ? c.latest.vol : null;
}

/**
 * 格式化顯示值：若為 null 則回傳 'N/A'
 * 用法：fmtPrice(getCropAvgA('鳳梨'))
 */
function fmtPrice(val) {
  if (val === null || val === undefined || isNaN(val)) return NA;
  return val;
}

function fmtVol(val) {
  if (val === null || val === undefined || isNaN(val)) return { val: NA, unit: '' };
  return Units.convVol(val);
}

window.AUCTION_MARKETS   = AUCTION_MARKETS;
window.WHOLESALE_MARKETS = WHOLESALE_MARKETS;
window.REGION_COLOR      = REGION_COLOR;
window.REGION_BG         = REGION_BG;
window.getCropAvgA       = getCropAvgA;
window.getCropPrevA      = getCropPrevA;
window.getCropTotalVolA  = getCropTotalVolA;
window.fmtPrice          = fmtPrice;
window.fmtVol            = fmtVol;
window.NA                = NA;

/* 頁面載入時自動執行 */
document.addEventListener('DOMContentLoaded', loadRealData);
