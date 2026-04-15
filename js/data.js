/**
 * data.js — 從 data/latest.json 載入農業部真實資料
 */

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

const FRUIT_KEYWORDS = ['鳳梨','芒果','荔枝','香蕉','木瓜','葡萄','蓮霧','楊桃','柳橙','柑橘','草莓','桃子','李子','梨子','蘋果','西瓜','哈密瓜','釋迦','龍眼','番石榴','枇杷'];
const VEGE_KEYWORDS  = ['高麗菜','番茄','地瓜','菠菜','花椰菜','青花菜','青椒','茄子','小黃瓜','四季豆','白蘿蔔','紅蘿蔔','洋蔥','大蒜','薑','玉米','南瓜','苦瓜','絲瓜','冬瓜','芹菜','韭菜','蔥','菜豆'];

function guessCat(name) {
  if (FRUIT_KEYWORDS.some(k => name.includes(k))) return 'fruit';
  if (VEGE_KEYWORDS.some(k => name.includes(k)))  return 'vege';
  return 'other';
}

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

const NA = 'N/A';

let _resolveDataReady;
window.DATA_READY = new Promise(resolve => { _resolveDataReady = resolve; });

window.CROP_DATA         = {};
window.REAL_DATA         = null;
window.AUCTION_MARKETS   = AUCTION_MARKETS;
window.WHOLESALE_MARKETS = WHOLESALE_MARKETS;
window.REGION_COLOR      = REGION_COLOR;
window.REGION_BG         = REGION_BG;
window.NA                = NA;

const JSON_URL = 'data/latest.json';

/* 格式化更新時間顯示：MM/DD HH:MM（台灣時間） */
function formatUpdatedAt(isoString) {
  if (!isoString) return '資料時間未知';
  try {
    const d   = new Date(isoString);
    /* 轉成台灣時間（UTC+8） */
    const tst = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    const mo  = String(tst.getUTCMonth() + 1).padStart(2, '0');
    const day = String(tst.getUTCDate()).padStart(2, '0');
    const h   = String(tst.getUTCHours()).padStart(2, '0');
    const m   = String(tst.getUTCMinutes()).padStart(2, '0');
    return `${mo}/${day} ${h}:${m}`;
  } catch {
    return '資料時間未知';
  }
}

async function loadRealData() {
  try {
    const res  = await fetch(JSON_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    window.REAL_DATA = json;
    buildCropData(json.crops || {});

    /* 更新資料時間列 */
    const timeStr = formatUpdatedAt(json.updatedAt);
    const elAt    = document.getElementById('data-updated-at');
    const elDot   = document.getElementById('update-dot');

    if (elAt) {
      elAt.textContent = `上次資料更新：${timeStr}（農業部開放資料平台）`;
    }

    /* 判斷資料是否新鮮（6小時內為新鮮，顯示綠色動畫；否則變灰） */
    if (elDot && json.updatedAt) {
      const ageHrs = (Date.now() - new Date(json.updatedAt).getTime()) / 3600000;
      if (ageHrs > 6) elDot.classList.add('stale');
    }

    console.log(`[data] 載入完成，${Object.keys(window.CROP_DATA).length} 種作物，更新於 ${timeStr}`);

  } catch (err) {
    console.warn('[data] 無法載入 latest.json：', err.message);
    buildCropData({});

    const elAt  = document.getElementById('data-updated-at');
    const elDot = document.getElementById('update-dot');
    if (elAt)  elAt.textContent = '資料暫時無法取得，請稍後再試';
    if (elDot) elDot.classList.add('stale');
  }

  _resolveDataReady(window.CROP_DATA);
}

function buildCropData(crops) {
  const result = {};
  for (const [name, crop] of Object.entries(crops)) {
    const cat = guessCat(name);
    if (cat === 'other') continue;

    const latest     = crop.latest     || {};
    const mktSummary = crop.mktSummary || {};
    const hist       = crop.history    || [];

    const allHi = Object.values(mktSummary).map(m => m.hi).filter(v => v !== null);
    const allLo = Object.values(mktSummary).map(m => m.lo).filter(v => v !== null);

    const avgA  = latest.avg     ?? null;
    const prevA = latest.prevAvg ?? null;
    const hiA   = allHi.length ? Math.max(...allHi) : null;
    const loA   = allLo.length ? Math.min(...allLo) : null;
    const volA  = latest.vol    ?? null;

    const avgW  = avgA  !== null ? +(avgA  * 0.90).toFixed(1) : null;
    const prevW = prevA !== null ? +(prevA * 0.90).toFixed(1) : null;
    const hiW   = hiA   !== null ? +(hiA   * 0.90).toFixed(1) : null;
    const loW   = loA   !== null ? +(loA   * 0.90).toFixed(1) : null;
    const volW  = volA  !== null ? Math.round(volA * 0.30)    : null;

    result[name] = {
      cat,
      cropCode:  crop.cropCode || '',
      catCode:   crop.catCode  || '',
      season:    getSeasonText(name),
      varieties: [{
        code: crop.cropCode || name, name,
        avgA, avgW, hiA, hiW, loA, loW,
        volA, volW, prevA, prevW,
      }],
      mktSummary,
      historyPoints: hist,
      latest: {
        date:    latest.date    || NA,
        avg:     avgA,
        prevAvg: prevA,
        hi:      hiA,
        lo:      loA,
        vol:     volA,
        chgPct:  latest.chgPct ?? null,
      },
    };
  }
  window.CROP_DATA = result;
}

function getCropAvgA(key)      { const c = window.CROP_DATA[key]; return c?.latest?.avg     ?? null; }
function getCropPrevA(key)     { const c = window.CROP_DATA[key]; return c?.latest?.prevAvg ?? null; }
function getCropTotalVolA(key) { const c = window.CROP_DATA[key]; return c?.latest?.vol     ?? null; }

function fmtPrice(val) {
  if (val === null || val === undefined || isNaN(parseFloat(val))) return NA;
  return val;
}
function fmtVol(val) {
  if (val === null || val === undefined || isNaN(parseFloat(val))) return { val: NA, unit: '' };
  return Units.convVol(val);
}

window.getCropAvgA       = getCropAvgA;
window.getCropPrevA      = getCropPrevA;
window.getCropTotalVolA  = getCropTotalVolA;
window.fmtPrice          = fmtPrice;
window.fmtVol            = fmtVol;

document.addEventListener('DOMContentLoaded', loadRealData);
