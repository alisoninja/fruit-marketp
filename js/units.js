/* =====================================================
   units.js — 單位換算模組
   所有涉及價格與成交量的換算邏輯集中在這裡
   其他 JS 檔案透過 window.Units 存取
   ===================================================== */

   const Units = (() => {

    const KG_PER_JIN = 0.6;        // 1 台斤 = 0.6 公斤
    const JIN_PER_KG = 1.0 / 0.6;  // 1 公斤 = 1.6667 台斤
  
    /* ---- 目前選擇的單位（由 UI 切換時更新） ---- */
    let priceUnit = 'kg';   // 'kg' | 'jin'
    let volUnit   = 'jin';  // 'jin' | 'kg' | 'ton'
  
    /* ---- Setters ---- */
    function setPriceUnit(u) { priceUnit = u; }
    function setVolUnit(u)   { volUnit   = u; }
  
    /* ---- Getters ---- */
    function getPriceUnit() { return priceUnit; }
    function getVolUnit()   { return volUnit; }
  
    /* ---- 價格換算 ----
       原始資料統一以「元/公斤」儲存
       呼叫此函式取得目前單位的顯示值                */
    function convPrice(kgVal) {
      const n = parseFloat(kgVal) || 0;
      if (priceUnit === 'jin') return +(n * KG_PER_JIN).toFixed(1);
      return +n.toFixed(1);
    }
  
    /* ---- 成交量換算 ----
       原始資料以「公斤」儲存
       回傳 { val: string, unit: string }           */
    function convVol(kgVal) {
      const n = parseFloat(kgVal) || 0;
      if (volUnit === 'ton') {
        return { val: (n / 1000).toFixed(2), unit: '公噸' };
      }
      if (volUnit === 'jin') {
        return { val: Math.round(n * JIN_PER_KG).toLocaleString(), unit: '台斤' };
      }
      /* kg */
      return { val: Math.round(n).toLocaleString(), unit: '公斤' };
    }
  
    /* ---- 單位標籤 ---- */
    function priceLabel() {
      return priceUnit === 'jin' ? '元/台斤' : '元/公斤';
    }
  
    function volLabel() {
      if (volUnit === 'ton') return '公噸';
      if (volUnit === 'jin') return '台斤';
      return '公斤';
    }
  
    /* ---- 格式化價格顯示（含單位） ---- */
    function formatPrice(kgVal) {
      return `${convPrice(kgVal)} ${priceLabel()}`;
    }
  
    /* ---- 漲跌幅文字 ---- */
    function formatChange(current, previous) {
      const c = parseFloat(current)  || 0;
      const p = parseFloat(previous) || 0;
      if (p === 0) return { text: '—', cls: 'color-flat', arrow: '' };
      const pct = ((c - p) / p) * 100;
      const sign  = pct > 0 ? '+' : '';
      const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
      const cls   = pct > 0 ? 'color-up' : pct < 0 ? 'color-down' : 'color-flat';
      return { text: `${sign}${pct.toFixed(1)}%`, cls, arrow, pct };
    }
  
    /* ---- 公開介面 ---- */
    return {
      setPriceUnit,
      setVolUnit,
      getPriceUnit,
      getVolUnit,
      convPrice,
      convVol,
      priceLabel,
      volLabel,
      formatPrice,
      formatChange,
    };
  
  })();
  
  window.Units = Units;