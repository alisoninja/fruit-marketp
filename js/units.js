/* units.js — 單位換算，預設台斤 */

const Units = (() => {
  const KG_PER_JIN = 0.6;
  const JIN_PER_KG = 1.0 / 0.6;

  /* 預設均改為台斤 */
  let priceUnit = 'jin';   /* ← 預設台斤 */
  let volUnit   = 'jin';   /* ← 預設台斤 */

  function setPriceUnit(u) { priceUnit = u; }
  function setVolUnit(u)   { volUnit   = u; }
  function getPriceUnit()  { return priceUnit; }
  function getVolUnit()    { return volUnit; }

  function convPrice(kgVal) {
    const n = parseFloat(kgVal) || 0;
    if (priceUnit === 'jin') return +(n * KG_PER_JIN).toFixed(1);
    return +n.toFixed(1);
  }

  function smartNum(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/,'') + '億';
    if (n >= 10000)     return (n / 10000).toFixed(1).replace(/\.0$/,'') + '萬';
    if (n >= 1000)      return (n / 1000).toFixed(1).replace(/\.0$/,'') + 'k';
    return Math.round(n).toString();
  }

  function convVol(kgVal) {
    const n = parseFloat(kgVal) || 0;
    if (volUnit === 'ton') {
      const tons = n / 1000;
      return { val: smartNum(tons), unit: '公噸', raw: tons };
    }
    if (volUnit === 'jin') {
      const jin = n * JIN_PER_KG;
      return { val: smartNum(jin), unit: '台斤', raw: jin };
    }
    return { val: smartNum(n), unit: '公斤', raw: n };
  }

  function priceLabel() { return priceUnit === 'jin' ? '元/台斤' : '元/公斤'; }
  function volLabel() {
    if (volUnit === 'ton') return '公噸';
    if (volUnit === 'jin') return '台斤';
    return '公斤';
  }

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

  return { setPriceUnit, setVolUnit, getPriceUnit, getVolUnit, convPrice, convVol, priceLabel, volLabel, formatChange, smartNum };
})();

window.Units = Units;

/* ── 字體大小 ── */
const FS_KEY     = 'agri_fontsize_v2';
const FS_DEFAULT = 14;
const FS_MIN     = 12;
const FS_MAX     = 20;

function getCurrentFontSize() { return parseInt(localStorage.getItem(FS_KEY) || FS_DEFAULT, 10); }

function applyFontSize(px) {
  const c = Math.max(FS_MIN, Math.min(FS_MAX, px));
  document.documentElement.style.fontSize = c + 'px';
  localStorage.setItem(FS_KEY, c);
}

function fontSizeIncrease() { applyFontSize(getCurrentFontSize() + 1); }
function fontSizeDecrease() { applyFontSize(getCurrentFontSize() - 1); }

window.fontSizeIncrease = fontSizeIncrease;
window.fontSizeDecrease = fontSizeDecrease;

document.addEventListener('DOMContentLoaded', () => {
  applyFontSize(getCurrentFontSize());
});
