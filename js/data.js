/**
 * data.js — 從 data/latest.json 載入農業部真實資料
 *
 * 分組邏輯：
 *   作物名稱如「鳳梨-金鑽」，「-」前為大類「鳳梨」，後為子品種「金鑽」。
 *   若名稱不含「-」，則大類 = 子品種 = 本身。
 *
 * CROP_DATA 結構（以大類為 key）：
 *   CROP_DATA['鳳梨'] = {
 *     cat: 'fruit',
 *     varieties: [
 *       { code, name:'鳳梨-金鑽', subName:'金鑽', avgA, ... },
 *       { code, name:'鳳梨-開英', subName:'開英', avgA, ... },
 *     ],
 *     mktSummary: { ... },
 *     historyPoints: [ ... ],
 *     latest: { avg, vol, ... },   ← 以第一個（或最大量）子品種為代表
 *     season: '...',
 *   }
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

/* ── 分類判斷 ── */
const FRUIT_KW = ['鳳梨','芒果','荔枝','香蕉','木瓜','葡萄','蓮霧','楊桃','柳橙','柑橘','草莓','桃','李','梨','蘋果','西瓜','哈密瓜','釋迦','龍眼','番石榴','枇杷','百香果','檸檬','文旦','柚','橘','橙','金棗','棗','椰子'];
const VEGE_KW  = ['高麗菜','甘藍','番茄','地瓜','菠菜','花椰菜','青花菜','青椒','茄子','黃瓜','四季豆','蘿蔔','洋蔥','大蒜','薑','玉米','南瓜','苦瓜','絲瓜','冬瓜','芹菜','韭菜','蔥','菜豆','萵苣','空心菜','地瓜葉','莧菜','小白菜','結球白菜','芥菜','豌豆','毛豆','蘆筍','山藥','芋頭','薑黃','辣椒','青蒜'];

function guessCat(name) {
  if (FRUIT_KW.some(k => name.includes(k))) return 'fruit';
  if (VEGE_KW.some(k => name.includes(k)))  return 'vege';
  return 'other';
}

/* 取大類名稱（「-」前，或本身） */
function getBaseName(name) {
  const idx = name.indexOf('-');
  return idx > 0 ? name.slice(0, idx) : name;
}

/* 取子品種名稱 */
function getSubName(name) {
  const idx = name.indexOf('-');
  return idx > 0 ? name.slice(idx + 1) : name;
}

/* ── 季節說明 ── */
const SEASON_TEXT = {
  '鳳梨':   '鳳梨盛產期為3–6月（金鑽）與9–10月（二期）。秋冬為淡季，供應量收斂，農友可把握出貨時機。',
  '芒果':   '愛文芒果盛產期為5–8月，金煌為6–9月。產季外市場以冷凍或外銷品為主。',
  '荔枝':   '荔枝盛產期為5–7月（玉荷包最早熟）。現為淡季，流通以冷凍品為主。',
  '香蕉':   '香蕉全年均有供應，春秋兩季為盛產高峰，中南部為主要產區。',
  '木瓜':   '木瓜全年供應，秋冬品質佳甜度高，屏東、嘉義為主產區。',
  '葡萄':   '巨峰葡萄盛產期為7–9月（彰化、南投），現為尾季，品質仍佳。',
  '高麗菜': '高麗菜秋冬盛產，台中、彰化為主產區。供應量充足，農友宜關注需求端變化。',
  '甘藍':   '甘藍（高麗菜）秋冬盛產，台中、彰化為主產區。供應量充足，農友宜關注需求端變化。',
  '番茄':   '番茄秋冬盛產，嘉義、台南為主力。小番茄品種（聖女、橙蜜）利潤相對較佳。',
  '地瓜':   '地瓜秋冬盛產，台南善化、嘉義為主產區。品質受天候影響明顯。',
  '菠菜':   '菠菜秋冬盛產，雲林西螺為主要產區。供應量與天候關係密切。',
  '花椰菜': '花椰菜秋冬盛產，彰化二林、雲林為主產區。青花菜外銷需求穩定。',
  '草莓':   '草莓盛產期為11月至翌年4月，苗栗大湖、南投為主要產區。',
  '釋迦':   '釋迦盛產期為8–11月（台東），鳳梨釋迦品質優良深受市場歡迎。',
  '柑橘':   '柑橘類盛產期為10月至翌年3月，台中、南投、台南為主要產區。',
  '西瓜':   '西瓜盛產期為5–8月，雲林、花蓮為主要產區。',
};

function getSeasonText(baseName) {
  return SEASON_TEXT[baseName] || '季節資訊請參考農業部農情報告。';
}

/* ── 資料載入 ── */
const NA = 'N/A';

let _resolveDataReady;
window.DATA_READY = new Promise(r => { _resolveDataReady = r; });

window.CROP_DATA         = {};
window.REAL_DATA         = null;
window.AUCTION_MARKETS   = AUCTION_MARKETS;
window.WHOLESALE_MARKETS = WHOLESALE_MARKETS;
window.REGION_COLOR      = REGION_COLOR;
window.REGION_BG         = REGION_BG;
window.NA                = NA;

const JSON_URL = 'data/latest.json';

function formatUpdatedAt(iso) {
  if (!iso) return '資料時間未知';
  try {
    const d   = new Date(iso);
    const tst = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    const mo  = String(tst.getUTCMonth()+1).padStart(2,'0');
    const day = String(tst.getUTCDate()).padStart(2,'0');
    const h   = String(tst.getUTCHours()).padStart(2,'0');
    const m   = String(tst.getUTCMinutes()).padStart(2,'0');
    return `${mo}/${day} ${h}:${m}`;
  } catch { return '資料時間未知'; }
}

async function loadRealData() {
  try {
    const res  = await fetch(JSON_URL + '?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    window.REAL_DATA = json;
    buildCropData(json.crops || {});

    const timeStr = formatUpdatedAt(json.updatedAt);
    const elAt    = document.getElementById('data-updated-at');
    const elDot   = document.getElementById('update-dot');
    if (elAt) elAt.textContent = `上次資料更新：${timeStr}（農業部開放資料平台）`;
    if (elDot && json.updatedAt) {
      const ageHrs = (Date.now() - new Date(json.updatedAt).getTime()) / 3600000;
      if (ageHrs > 6) elDot.classList.add('stale');
    }
  } catch (err) {
    console.warn('[data] 載入失敗：', err.message);
    buildCropData({});
    const elAt  = document.getElementById('data-updated-at');
    const elDot = document.getElementById('update-dot');
    if (elAt)  elAt.textContent = '資料暫時無法取得，請稍後再試';
    if (elDot) elDot.classList.add('stale');
  }
  _resolveDataReady(window.CROP_DATA);
}

/* ── 建立 CROP_DATA（以大類分組）── */
function buildCropData(rawCrops) {
  /*
   * rawCrops 的 key 是 API 回傳的作物名稱，例如：
   *   '鳳梨-金鑽', '鳳梨-開英', '芒果-愛文', '甘藍', ...
   *
   * 我們把它們依大類（'鳳梨'、'芒果'、'甘藍'）合併。
   */
  const grouped = {};

  for (const [fullName, crop] of Object.entries(rawCrops)) {
    const baseName = getBaseName(fullName);
    const subName  = getSubName(fullName);
    const cat      = guessCat(fullName);
    if (cat === 'other') continue;

    if (!grouped[baseName]) {
      grouped[baseName] = {
        cat,
        season:        getSeasonText(baseName),
        varieties:     [],
        mktSummary:    {},
        historyPoints: [],
        latest:        null,
      };
    }

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

    /* 行口估算 */
    const avgW  = avgA  !== null ? +(avgA  * 0.90).toFixed(1) : null;
    const prevW = prevA !== null ? +(prevA * 0.90).toFixed(1) : null;
    const hiW   = hiA   !== null ? +(hiA   * 0.90).toFixed(1) : null;
    const loW   = loA   !== null ? +(loA   * 0.90).toFixed(1) : null;
    const volW  = volA  !== null ? Math.round(volA * 0.30)    : null;

    grouped[baseName].varieties.push({
      code:    crop.cropCode || fullName,
      name:    fullName,
      subName,               /* ← 顯示用的簡短名稱 */
      avgA, avgW, hiA, hiW, loA, loW,
      volA, volW, prevA, prevW,
    });

    /* 合併市場摘要（同大類的市場資料合併） */
    for (const [mktName, v] of Object.entries(mktSummary)) {
      if (!grouped[baseName].mktSummary[mktName]) {
        grouped[baseName].mktSummary[mktName] = { avg:[], hi:[], lo:[], vol:0, latestDate:'' };
      }
      const m = grouped[baseName].mktSummary[mktName];
      if (v.avg !== null) m.avg.push(v.avg);
      if (v.hi  !== null) m.hi.push(v.hi);
      if (v.lo  !== null) m.lo.push(v.lo);
      m.vol += v.vol || 0;
      if (!m.latestDate || v.latestDate > m.latestDate) m.latestDate = v.latestDate;
    }

    /* 合併歷史（取最長的那條，或加總） */
    if (hist.length > grouped[baseName].historyPoints.length) {
      grouped[baseName].historyPoints = hist;
    }
  }

  /* 後處理：市場摘要平均化，latest 取 varieties 第一個（量最大的） */
  for (const [baseName, g] of Object.entries(grouped)) {
    /* 市場摘要平均 */
    const newMkt = {};
    for (const [mktName, v] of Object.entries(g.mktSummary)) {
      newMkt[mktName] = {
        avg:         v.avg.length ? +(v.avg.reduce((a,b)=>a+b,0)/v.avg.length).toFixed(1) : null,
        hi:          v.hi.length  ? +(v.hi.reduce((a,b)=>a+b,0)/v.hi.length).toFixed(1)  : null,
        lo:          v.lo.length  ? +(v.lo.reduce((a,b)=>a+b,0)/v.lo.length).toFixed(1)  : null,
        vol:         v.vol,
        latestDate:  v.latestDate,
      };
    }
    g.mktSummary = newMkt;

    /* 以成交量最大的子品種作為大類代表值 */
    const rep = g.varieties
      .filter(v => v.volA !== null)
      .sort((a, b) => (b.volA||0) - (a.volA||0))[0]
      || g.varieties[0];

    if (rep) {
      g.latest = {
        date:    '—',
        avg:     rep.avgA,
        prevAvg: rep.prevA,
        hi:      rep.hiA,
        lo:      rep.loA,
        vol:     rep.volA,
        chgPct:  rep.avgA !== null && rep.prevA !== null && rep.prevA !== 0
          ? +(((rep.avgA - rep.prevA) / rep.prevA) * 100).toFixed(1)
          : null,
      };
    }
  }

  window.CROP_DATA = grouped;
}

/* ── 前端取值輔助 ── */
function getCropAvgA(key)      { return window.CROP_DATA[key]?.latest?.avg     ?? null; }
function getCropPrevA(key)     { return window.CROP_DATA[key]?.latest?.prevAvg ?? null; }
function getCropTotalVolA(key) { return window.CROP_DATA[key]?.latest?.vol     ?? null; }

window.getCropAvgA       = getCropAvgA;
window.getCropPrevA      = getCropPrevA;
window.getCropTotalVolA  = getCropTotalVolA;

document.addEventListener('DOMContentLoaded', loadRealData);
