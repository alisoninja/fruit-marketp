/* =====================================================
   main.js — 主邏輯（依賴 units.js 與 charts.js）
   ===================================================== */

/* =====================================================
   資料定義
   所有價格以「元/公斤」儲存，成交量以「公斤」儲存
   ===================================================== */
   const CROPS = {
    '鳳梨': {
      cat: '水果',
      varieties: [
        { code: 'B1', name: '鳳梨-開英',   avgA: 18.2, avgW: 16.5, hiA: 22.0, loA: 14.5, hiW: 20.0, loW: 13.0, volA: 124000,  volW: 38000,  prevA: 17.1, prevW: 15.8 },
        { code: 'B2', name: '鳳梨-金鑽',   avgA: 25.4, avgW: 22.8, hiA: 31.0, loA: 19.5, hiW: 28.0, loW: 17.0, volA: 776000,  volW: 210000, prevA: 24.2, prevW: 21.5 },
        { code: 'B3', name: '鳳梨-香水',   avgA: 32.6, avgW: 29.0, hiA: 38.0, loA: 26.0, hiW: 34.0, loW: 23.5, volA: 89000,   volW: 25000,  prevA: 31.0, prevW: 27.8 },
        { code: 'B4', name: '鳳梨-牛奶',   avgA: 45.0, avgW: 40.5, hiA: 52.0, loA: 38.0, hiW: 47.0, loW: 33.0, volA: 42000,   volW: 12000,  prevA: 44.2, prevW: 39.0 },
        { code: 'B5', name: '鳳梨-冬蜜',   avgA: 28.8, avgW: 25.5, hiA: 34.0, loA: 23.0, hiW: 30.0, loW: 20.0, volA: 62000,   volW: 18000,  prevA: 30.1, prevW: 26.8 },
      ],
      season: '鳳梨盛產期為3–6月（金鑽）與9–10月（二期），現為尾季。去年同期均價 28.4 元/公斤（拍賣），今年受出口量縮影響，現價低於去年同期。',
      news: [
        { tag: 'tag-price',   label: '報價', title: '金鑽鳳梨批發均價連兩日走升，台南、屏東貨量逐漸收斂', time: '今日 10:15', src: '農傳媒' },
        { tag: 'tag-weather', label: '天氣', title: '西南氣流帶來豐沛雨量，鳳梨甜度略降，部分農友延後採收', time: '今日 08:40', src: '農糧署' },
        { tag: 'tag-market',  label: '市場', title: '日本市場對台灣鳳梨需求回升，屏東農協加強外銷品控',    time: '昨日 16:20', src: '聯合報農業版' },
        { tag: 'tag-policy',  label: '政策', title: '農業部補助鳳梨外銷運費，每公斤補貼 2 元至年底',        time: '昨日 09:00', src: '農業部公告' },
      ],
    },
    '芒果': {
      cat: '水果',
      varieties: [
        { code: 'AW1', name: '芒果-愛文',   avgA: 68.0, avgW: 62.5, hiA: 80.0, loA: 55.0, hiW: 72.0, loW: 50.0, volA: 210000, volW: 65000,  prevA: 64.5, prevW: 59.0 },
        { code: 'AW2', name: '芒果-金煌',   avgA: 52.0, avgW: 47.0, hiA: 62.0, loA: 42.0, hiW: 56.0, loW: 38.0, volA: 185000, volW: 52000,  prevA: 54.0, prevW: 48.5 },
        { code: 'AW3', name: '芒果-土芒果', avgA: 22.0, avgW: 18.5, hiA: 28.0, loA: 16.0, hiW: 24.0, loW: 14.0, volA: 98000,  volW: 30000,  prevA: 20.5, prevW: 17.2 },
        { code: 'AW4', name: '芒果-玉文',   avgA: 75.0, avgW: 69.0, hiA: 88.0, loA: 62.0, hiW: 80.0, loW: 55.0, volA: 44000,  volW: 12000,  prevA: 73.0, prevW: 66.5 },
        { code: 'AW5', name: '芒果-紅蘋果', avgA: 42.0, avgW: 37.5, hiA: 50.0, loA: 34.0, hiW: 46.0, loW: 30.0, volA: 61000,  volW: 18000,  prevA: 45.0, prevW: 40.2 },
      ],
      season: '愛文芒果盛產期為5–8月，現為尾季。去年同期因颱風減產均價一度達 92 元/公斤；今年供應較穩，現價偏低，農友宜把握尾季行情。',
      news: [
        { tag: 'tag-price',   label: '報價', title: '台南玉井愛文尾季惜售，均價回升至 68 元，業者搶貨',     time: '今日 11:00', src: '農傳媒' },
        { tag: 'tag-market',  label: '市場', title: '電商平台芒果禮盒預購熱烈，農場直送訂單創新高',         time: '今日 09:10', src: '數位時代' },
        { tag: 'tag-weather', label: '天氣', title: '秋颱威脅解除，芒果主產區採收作業恢復正常',             time: '昨日 17:30', src: '農糧署' },
        { tag: 'tag-policy',  label: '政策', title: '農業部補助芒果轉型有機，通過認證最高補助 30 萬',       time: '3天前',      src: '農業部公告' },
      ],
    },
    '高麗菜': {
      cat: '蔬菜',
      varieties: [
        { code: 'CA1', name: '高麗菜-平地種', avgA: 12.4, avgW: 10.8, hiA: 15.5, loA: 9.0,  hiW: 13.5, loW: 7.5,  volA: 820000, volW: 240000, prevA: 12.18, prevW: 10.5 },
        { code: 'CA2', name: '高麗菜-山地種', avgA: 18.2, avgW: 15.5, hiA: 22.0, loA: 14.0, hiW: 18.5, loW: 12.0, volA: 320000, volW: 90000,  prevA: 17.5,  prevW: 14.8 },
        { code: 'CA3', name: '高麗菜-紫高麗', avgA: 28.5, avgW: 24.0, hiA: 35.0, loA: 22.0, hiW: 30.0, loW: 18.0, volA: 45000,  volW: 12000,  prevA: 27.0,  prevW: 22.5 },
      ],
      season: '高麗菜秋冬盛產，台中、彰化為主產區。今年種植面積略增，供應充足。去年同期均價 14.2 元/公斤，今年偏低，農友宜控制出貨節奏。',
      news: [
        { tag: 'tag-weather', label: '天氣', title: '東北季風增強，山區高麗菜葉片受損，本週供應量減少約 8%', time: '今日 10:15', src: '農傳媒' },
        { tag: 'tag-price',   label: '報價', title: '高麗菜批發均價連兩日走升，台北市場上價達 15.2 元',      time: '今日 08:40', src: '農業部' },
        { tag: 'tag-market',  label: '市場', title: '超市通路加碼採購，高麗菜大箱裝需求明顯回升',            time: '昨日 16:20', src: '聯合報農業版' },
        { tag: 'tag-policy',  label: '政策', title: '農業部公告本季蔬菜產銷履歷補貼方案，申請截止 11/30',    time: '昨日 09:00', src: '農業部公告' },
      ],
    },
    '番茄': {
      cat: '蔬菜',
      varieties: [
        { code: 'TM1', name: '番茄-牛番茄',    avgA: 38.5, avgW: 34.0, hiA: 46.0,  loA: 30.0, hiW: 40.0, loW: 26.0, volA: 280000, volW: 82000,  prevA: 40.2, prevW: 35.5 },
        { code: 'TM2', name: '番茄-聖女小番茄', avgA: 72.0, avgW: 65.0, hiA: 85.0,  loA: 58.0, hiW: 75.0, loW: 52.0, volA: 150000, volW: 42000,  prevA: 68.5, prevW: 61.8 },
        { code: 'TM3', name: '番茄-黑柿番茄',  avgA: 42.0, avgW: 37.5, hiA: 50.0,  loA: 33.0, hiW: 44.0, loW: 29.0, volA: 95000,  volW: 28000,  prevA: 44.0, prevW: 39.2 },
        { code: 'TM4', name: '番茄-橙蜜小番茄',avgA: 88.0, avgW: 79.5, hiA: 102.0, loA: 72.0, hiW: 92.0, loW: 65.0, volA: 62000,  volW: 18000,  prevA: 85.0, prevW: 76.0 },
      ],
      season: '番茄秋冬盛產，嘉義、台南為主力產區。今年產量大增，均價受壓。小番茄品種（聖女、橙蜜）利潤較佳，建議農友轉型高值品種。',
      news: [
        { tag: 'tag-price',   label: '報價', title: '牛番茄中價跌破 35 元，嘉義產區農友憂心後市',       time: '今日 09:30', src: '農傳媒' },
        { tag: 'tag-weather', label: '天氣', title: '南部豔陽助長著色，品質優良但產量同步大增',         time: '今日 07:55', src: '農糧署' },
        { tag: 'tag-market',  label: '市場', title: '加工醬廠需求穩定，下單量較去年同期增 15%',         time: '昨日 14:00', src: '食品工業研究所' },
        { tag: 'tag-policy',  label: '政策', title: '農業部啟動番茄輸日促銷計畫，目標拓展高價市場',    time: '2天前',      src: '農業部' },
      ],
    },
  };
  
  const AUCTION_MARKETS = [
    { name: '台北二', region: '北' }, { name: '台北一', region: '北' },
    { name: '板橋區', region: '北' }, { name: '三重市', region: '北' },
    { name: '宜蘭市', region: '北' }, { name: '台中市', region: '中' },
    { name: '豐原區', region: '中' }, { name: '嘉義市', region: '南' },
    { name: '高雄市', region: '南' }, { name: '鳳山市', region: '南' },
    { name: '台東市', region: '東' },
  ];
  
  const WHOLESALE_MARKETS = [
    { name: '台北行口', region: '北' }, { name: '三重行口', region: '北' },
    { name: '桃園行口', region: '北' }, { name: '台中行口', region: '中' },
    { name: '彰化行口', region: '中' }, { name: '嘉義行口', region: '南' },
    { name: '高雄行口', region: '南' },
  ];
  
  const REGION_COLOR = { 北: '#185FA5', 中: '#854F0B', 南: '#3B6D11', 東: '#534AB7' };
  const REGION_BG    = { 北: '#E6F1FB', 中: '#FAEEDA', 南: '#EAF3DE', 東: '#EEEDFE' };
  
  /* =====================================================
     狀態
     ===================================================== */
  let state = {
    cropKey:    '鳳梨',
    varIdx:     1,
    priceType:  'auction',
    mktType:    'auction',
    currentCat: '全部',
    range:      30,
    layers:     { lastYear: false, band: false, ma: false, vol: false },
  };
  
  function rng(s) { const x = Math.sin(s + 1) * 10000; return x - Math.floor(x); }
  
  /* =====================================================
     時鐘
     ===================================================== */
  function updateClock() {
    const now = new Date();
    const h  = String(now.getHours()).padStart(2, '0');
    const m  = String(now.getMinutes()).padStart(2, '0');
    const s  = String(now.getSeconds()).padStart(2, '0');
    const y  = now.getFullYear() - 1911;
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d  = String(now.getDate()).padStart(2, '0');
    document.getElementById('clock-pill').textContent  = `${h}:${m}:${s}`;
    document.getElementById('date-pill').textContent   = `民國 ${y}.${mo}.${d}`;
  }
  
  /* =====================================================
     種類 pills
     ===================================================== */
  function buildCatPills() {
    const cats = ['全部', '水果', '蔬菜'];
    document.getElementById('cat-pills').innerHTML = cats.map(c =>
      `<button class="cpill ${c === state.currentCat ? 'active' : ''}"
        onclick="setCat('${c}')">${c}</button>`
    ).join('');
  }
  
  function setCat(c) {
    state.currentCat = c;
    buildCatPills();
  }
  
  /* =====================================================
     作物導覽列（上方 tabs）
     ===================================================== */
  function buildCropNav() {
    const nav = document.getElementById('crop-nav');
    if (!nav) return;
    nav.innerHTML = Object.keys(CROPS).map(key =>
      `<button class="cpill ${key === state.cropKey ? 'active' : ''}"
        onclick="switchCrop('${key}')" style="margin-right:4px">${key}</button>`
    ).join('');
  }
  
  function switchCrop(key) {
    state.cropKey = key;
    state.varIdx  = 0;
    buildCropNav();
    renderAll();
  }
  
  /* =====================================================
     價格類型 / 市場類型
     ===================================================== */
  function setPriceType(t) {
    state.priceType = t;
    document.getElementById('ptab-a').className = 'ptt ' + (t === 'auction' ? 'active auction' : 'auction');
    document.getElementById('ptab-w').className = 'ptt ' + (t === 'wholesale' ? 'active wholesale' : 'wholesale');
    document.getElementById('ptype-note').textContent = t === 'auction'
      ? '拍賣價：農民送拍、市場公開競標，價格透明但波動較大。來源：農業部批發市場 / 高雄果菜公司 / 台中果菜公司'
      : '行口價：行口盤商收購後轉賣，通常比拍賣價低 5–15%，流通較穩定。注意：兩者不可直接比較合併計算。';
    renderAll();
  }
  
  function setMktType(t) {
    state.mktType = t;
    document.getElementById('mptab-a').className = 'ptt ' + (t === 'auction'   ? 'active auction'   : 'auction');
    document.getElementById('mptab-w').className = 'ptt ' + (t === 'wholesale' ? 'active wholesale' : 'wholesale');
    renderMarkets();
  }
  
  /* =====================================================
     單位切換
     ===================================================== */
  function setPriceUnit(u, el) {
    Units.setPriceUnit(u);
    document.querySelectorAll('#price-unit-seg .seg-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    updateTableHeaders();
    renderAll();
  }
  
  function setVolUnit(u, el) {
    Units.setVolUnit(u);
    document.querySelectorAll('#vol-unit-seg .seg-btn').forEach(b => { b.classList.remove('active', 'blue'); });
    el.classList.add('active', 'blue');
    updateTableHeaders();
    renderAll();
  }
  
  function updateTableHeaders() {
    const pl = Units.priceLabel();
    const vl = Units.volLabel();
    const thAvg = document.getElementById('th-avg');
    const thHi  = document.getElementById('th-hi');
    const thLo  = document.getElementById('th-lo');
    const thVol = document.getElementById('th-vol');
    if (thAvg) thAvg.textContent = `均價 (${pl})`;
    if (thHi)  thHi.textContent  = `上價 (${pl})`;
    if (thLo)  thLo.textContent  = `下價 (${pl})`;
    if (thVol) thVol.textContent = `成交量 (${vl})`;
  }
  
  /* =====================================================
     圖表切換
     ===================================================== */
  function setRange(n, el) {
    state.range = n;
    document.querySelectorAll('#range-tg .tb').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    renderTrendChart();
  }
  
  function toggleLayer(k, el) {
    state.layers[k] = !state.layers[k];
    el.classList.toggle('active', state.layers[k]);
    document.getElementById('vol-wrap').style.display = state.layers.vol ? 'block' : 'none';
    renderTrendChart();
  }
  
  /* =====================================================
     摘要卡片
     ===================================================== */
  function renderSummary() {
    const crop = CROPS[state.cropKey];
    const v    = crop.varieties[state.varIdx] || crop.varieties[0];
    const isA  = state.priceType === 'auction';
    const avgKg  = isA ? v.avgA  : v.avgW;
    const prevKg = isA ? v.prevA : v.prevW;
    const hiKg   = isA ? v.hiA   : v.hiW;
    const loKg   = isA ? v.loA   : v.loW;
    const volKg  = isA ? v.volA  : v.volW;
  
    const avg = Units.convPrice(avgKg);
    const hi  = Units.convPrice(hiKg);
    const lo  = Units.convPrice(loKg);
    const ret = Units.convPrice(avgKg * 3.0);
    const pl  = Units.priceLabel();
    const chg = Units.formatChange(avgKg, prevKg);
    const { val: vv, unit: vu } = Units.convVol(volKg);
    const badge = isA
      ? '<span class="badge badge-auction">拍賣</span>'
      : '<span class="badge badge-wholesale">行口</span>';
  
    document.getElementById('crop-title').innerHTML = v.name + ' ' + badge;
    document.getElementById('crop-sub').textContent  = `${v.code} · 單位：${pl}`;
  
    document.getElementById('sum-row').innerHTML = `
      <div class="metric">
        <div class="metric-label">今日均價</div>
        <div class="metric-value">${avg}<span class="metric-unit">${pl}</span></div>
        <div class="metric-sub ${chg.cls}">${chg.arrow} ${chg.text}</div>
      </div>
      <div class="metric">
        <div class="metric-label">上價</div>
        <div class="metric-value color-up">${hi}<span class="metric-unit">${pl}</span></div>
        <div class="metric-sub" style="color:var(--text-tertiary)">最高成交</div>
      </div>
      <div class="metric">
        <div class="metric-label">下價</div>
        <div class="metric-value color-down">${lo}<span class="metric-unit">${pl}</span></div>
        <div class="metric-sub" style="color:var(--text-tertiary)">最低成交</div>
      </div>
      <div class="metric">
        <div class="metric-label">成交量</div>
        <div class="metric-value">${vv}<span class="metric-unit">${vu}</span></div>
      </div>
      <div class="metric">
        <div class="metric-label">預估零售</div>
        <div class="metric-value">${ret}<span class="metric-unit">${pl}</span></div>
        <div class="metric-sub" style="color:var(--text-tertiary)">×3 倍估算</div>
      </div>
    `;
  }
  
  /* =====================================================
     品種比較表
     ===================================================== */
  function renderVarieties() {
    const crop = CROPS[state.cropKey];
    const isA  = state.priceType === 'auction';
    const pl   = Units.priceLabel();
  
    document.getElementById('var-sub').textContent = `${state.cropKey} 所有品種（${pl}）`;
  
    document.getElementById('var-body').innerHTML = crop.varieties.map((v, i) => {
      const avgKg  = isA ? v.avgA  : v.avgW;
      const prevKg = isA ? v.prevA : v.prevW;
      const hiKg   = isA ? v.hiA   : v.hiW;
      const loKg   = isA ? v.loA   : v.loW;
      const volKg  = isA ? v.volA  : v.volW;
  
      const avg = Units.convPrice(avgKg);
      const hi  = Units.convPrice(hiKg);
      const lo  = Units.convPrice(loKg);
      const chg = Units.formatChange(avgKg, prevKg);
      const { val: vv, unit: vu } = Units.convVol(volKg);
      const tagClass = isA ? 'badge-auction' : 'badge-wholesale';
      const tagLabel = isA ? '拍賣' : '行口';
      const sel = i === state.varIdx ? 'selected' : '';
  
      return `<tr class="${sel}" onclick="selectVar(${i})">
        <td><span class="variety-name">${v.name}</span></td>
        <td><span class="badge ${tagClass}">${tagLabel}</span></td>
        <td class="price-cell">${avg}</td>
        <td class="chg-cell ${chg.cls}">${chg.arrow} ${chg.text}</td>
        <td class="vol-cell">${hi}</td>
        <td class="vol-cell">${lo}</td>
        <td class="vol-cell">${vv} ${vu}</td>
      </tr>`;
    }).join('');
  }
  
  function selectVar(i) {
    state.varIdx = i;
    renderAll();
  }
  
  /* =====================================================
     趨勢圖
     ===================================================== */
  function renderTrendChart() {
    const crop = CROPS[state.cropKey];
    const v    = crop.varieties[state.varIdx] || crop.varieties[0];
    const isA  = state.priceType === 'auction';
    const baseKg = isA ? v.avgA : v.avgW;
    const varSeed = state.varIdx * 100;
  
    Charts.drawTrend({
      canvasId:  'trendC',
      baseKg,
      varSeed,
      range:     state.range,
      priceType: state.priceType,
      layers:    state.layers,
    });
  
    if (state.layers.vol) {
      Charts.drawVol({
        canvasId: 'volC',
        n:    state.range,
        seed: varSeed,
      });
    }
  
    /* 圖例 */
    const mainColor = isA ? '#854F0B' : '#185FA5';
    const legParts = [
      `<span class="legend-item"><span class="legend-swatch" style="background:${mainColor}"></span>${isA ? '拍賣均價' : '行口均價'}（${Units.priceLabel()}）</span>`,
    ];
    if (state.layers.lastYear) legParts.push(`<span class="legend-item"><span class="legend-dashed" style="color:#639922"></span>去年同期</span>`);
    if (state.layers.band)     legParts.push(`<span class="legend-item"><span style="display:inline-block;width:18px;height:8px;background:rgba(99,153,34,0.15);border:0.5px solid rgba(99,153,34,0.4);border-radius:2px"></span>歷史價格帶</span>`);
    if (state.layers.ma)       legParts.push(`<span class="legend-item"><span class="legend-dashed" style="color:#BA7517"></span>7日均線</span>`);
    document.getElementById('trend-legend').innerHTML = legParts.join('');
  
    document.getElementById('season-note').textContent = crop.season;
  }
  
  /* =====================================================
     全台市場比較
     ===================================================== */
  function renderMarkets() {
    const crop = CROPS[state.cropKey];
    const v    = crop.varieties[state.varIdx] || crop.varieties[0];
    const isA  = state.mktType === 'auction';
    const mkts = isA ? AUCTION_MARKETS : WHOLESALE_MARKETS;
    const baseKg = isA ? v.avgA : v.avgW;
    const pl     = Units.priceLabel();
  
    const list = mkts.map((m, i) => ({
      ...m,
      priceKg: +(baseKg * (0.82 + rng(i * 13 + state.varIdx * 7) * 0.36)).toFixed(1),
      volKg:   Math.round((20 + rng(i * 17) * 200) * 1000),
    })).sort((a, b) => b.priceKg - a.priceKg);
  
    const maxP = list[0].priceKg;
  
    document.getElementById('mkt-sub').textContent =
      `今日 · ${isA ? '拍賣市場' : '行口市場'} · ${v.name} (${pl})`;
  
    document.getElementById('mkt-section').innerHTML = list.map((m, i) => {
      const pct    = Math.max(15, (m.priceKg / maxP) * 100);
      const isBest  = i === 0;
      const isWorst = i === list.length - 1;
      const fillC  = isBest ? '#C0DD97' : isWorst ? '#F7C1C1' : '#D3D1C7';
      const textC  = isBest ? '#27500A' : isWorst ? '#791F1F' : '#5F5E5A';
      const dPrice = Units.convPrice(m.priceKg);
      const { val: vv, unit: vu } = Units.convVol(m.volKg);
      const rColor = REGION_COLOR[m.region] || '#888';
      const rBg    = REGION_BG[m.region]    || '#eee';
  
      return `<div class="market-row">
        <div class="market-name" title="${m.name}">${m.name}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${fillC}">
            <span class="bar-fill-val" style="color:${textC}">${dPrice}</span>
          </div>
        </div>
        <span class="region-tag" style="color:${rColor};background:${rBg}">${m.region}</span>
        <span class="market-vol">${vv}${vu.slice(0, 1)}</span>
        ${isBest  ? '<span class="best-tag">最高</span>'  : ''}
        ${isWorst ? '<span class="worst-tag">最低</span>' : ''}
      </div>`;
    }).join('');
  }
  
  /* =====================================================
     相關新聞
     ===================================================== */
  function renderNews() {
    const crop = CROPS[state.cropKey];
    document.getElementById('news-ct').innerHTML =
      `相關新聞 <span class="card-title-sub">${state.cropKey} 最新動態</span>`;
  
    document.getElementById('news-list').innerHTML = crop.news.map(n => `
      <div class="news-item">
        <span class="news-tag ${n.tag}">${n.label}</span>
        <div class="news-title">${n.title}</div>
        <div class="news-meta">${n.src} · ${n.time}</div>
      </div>
    `).join('');
  }
  
  /* =====================================================
     renderAll
     ===================================================== */
  function renderAll() {
    renderSummary();
    renderVarieties();
    renderTrendChart();
    renderMarkets();
    renderNews();
  }
  
  /* =====================================================
     初始化
     ===================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    buildCatPills();
    buildCropNav();
    setPriceType('auction');
    updateTableHeaders();
    renderAll();
    setInterval(updateClock, 1000);
    updateClock();
  
    /* 載入動畫結束 */
    const fill = document.getElementById('loading-fill');
    if (fill) {
      fill.classList.add('active');
      setTimeout(() => fill.classList.remove('active'), 1200);
    }
  });