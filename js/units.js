/* =====================================================
   units.js — 單位換算 + 字體大小偏好
   ===================================================== */

const Units = (() => {

  const KG_PER_JIN = 0.6;
  const JIN_PER_KG = 1.0 / 0.6;

  let priceUnit = 'kg';
  let volUnit   = 'jin';

  function setPriceUnit(u) { priceUnit = u; }
  function setVolUnit(u)   { volUnit   = u; }
  function getPriceUnit()  { return priceUnit; }
  function getVolUnit()    { return volUnit; }

  /* ---- 價格換算（原始單位：元/公斤） ---- */
  function convPrice(kgVal) {
    const n = parseFloat(kgVal) || 0;
    if (priceUnit === 'jin') return +(n * KG_PER_JIN).toFixed(1);
    return +n.toFixed(1);
  }

  /* ---- 成交量換算（原始單位：公斤）
     回傳 { val: string, unit: string, raw: number }
     val 已套用智慧縮寫（k / 萬 / 萬噸）             ---- */
  function convVol(kgVal) {
    const n = parseFloat(kgVal) || 0;

    if (volUnit === 'ton') {
      const tons = n / 1000;
      return { val: smartNum(tons, 1), unit: '公噸', raw: tons };
    }
    if (volUnit === 'jin') {
      const jin = n * JIN_PER_KG;
      return { val: smartNum(jin, 0), unit: '台斤', raw: jin };
    }
    return { val: smartNum(n, 0), unit: '公斤', raw: n };
  }

  /* ---- 智慧數字縮寫 ----
     1,000       → 1k
     10,000      → 1萬
     1,000,000   → 100萬
     decimals：小數位數（縮寫後）                     ---- */
  function smartNum(n, decimals) {
    if (n >= 100000000) return (n / 100000000).toFixed(decimals) + '億';
    if (n >= 10000)     return (n / 10000).toFixed(decimals > 0 ? 1 : 0) + '萬';
    if (n >= 1000)      return (n / 1000).toFixed(decimals > 0 ? 1 : 0) + 'k';
    return n.toFixed(decimals);
  }

  /* ---- 標籤 ---- */
  function priceLabel() { return priceUnit === 'jin' ? '元/台斤' : '元/公斤'; }
  function volLabel()   {
    if (volUnit === 'ton') return '公噸';
    if (volUnit === 'jin') return '台斤';
    return '公斤';
  }

  /* ---- 漲跌幅 ---- */
  function formatChange(current, previous) {
    const c = parseFloat(current)  || 0;
    const p = parseFloat(previous) || 0;
    if (p === 0) return { text:'—', cls:'color-flat', arrow:'', pct:0 };
    const pct   = ((c - p) / p) * 100;
    const sign  = pct > 0 ? '+' : '';
    const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
    const cls   = pct > 0 ? 'color-up' : pct < 0 ? 'color-down' : 'color-flat';
    return { text:`${sign}${pct.toFixed(1)}%`, cls, arrow, pct };
  }

  return {
    setPriceUnit, setVolUnit, getPriceUnit, getVolUnit,
    convPrice, convVol, priceLabel, volLabel,
    formatChange, smartNum,
  };
})();

window.Units = Units;

/* =====================================================
   字體大小偏好
   儲存在 localStorage，key: agri_fontsize
   等級: 'sm' | 'md' | 'lg' | 'xl'
   對應 html font-size: 12 / 14 / 16 / 18 px
   ===================================================== */

const FONT_SIZES = {
  sm: { px: 12, label: '小' },
  md: { px: 14, label: '中' },
  lg: { px: 16, label: '大' },
  xl: { px: 18, label: '特大' },
};

const FS_KEY = 'agri_fontsize';

function applyFontSize(level) {
  const size = FONT_SIZES[level] || FONT_SIZES.md;
  document.documentElement.style.fontSize = size.px + 'px';
  localStorage.setItem(FS_KEY, level);

  /* 更新 UI 按鈕狀態 */
  document.querySelectorAll('.fs-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fs === level);
  });
}

function loadFontSize() {
  const saved = localStorage.getItem(FS_KEY) || 'md';
  applyFontSize(saved);
}

function buildFontSizeBar() {
  const saved = localStorage.getItem(FS_KEY) || 'md';
  const bar = document.getElementById('font-size-bar');
  if (!bar) return;

  bar.innerHTML = `
    <span class="fs-label">字體大小：</span>
    ${Object.entries(FONT_SIZES).map(([key, val]) =>
      `<button class="fs-btn ${key === saved ? 'active' : ''}"
        data-fs="${key}"
        onclick="applyFontSize('${key}')">${val.label}</button>`
    ).join('')}
  `;
}

window.applyFontSize = applyFontSize;
window.loadFontSize  = loadFontSize;
window.buildFontSizeBar = buildFontSizeBar;

/* 頁面載入時自動套用 */
document.addEventListener('DOMContentLoaded', () => {
  loadFontSize();
  buildFontSizeBar();
});
