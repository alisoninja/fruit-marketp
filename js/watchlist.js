/* watchlist.js — 我的關注頁邏輯（localStorage） */

const LS_KEY = 'agri_watchlist_v1';

let wState = {
  savedCrops: [],
  activeCrop: null,
  priceType:  'auction',
  mktType:    'auction',
  varIdx:     0,
  range:      30,
  layers:     { lastYear:false, band:false, ma:false, vol:false },
};

function rng(s){ const x=Math.sin(s+1)*10000; return x-Math.floor(x); }

/* ===== localStorage ===== */
function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function saveCrops(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

/* ===== Setup screen ===== */
function buildPickGrids() {
  const fruits = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === 'fruit');
  const veges  = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === 'vege');

  const render = (keys) => keys.map(k => `
    <div class="pick-item" id="pick-${k}" onclick="togglePick('${k}')">
      ${k}
      <span class="pick-check" id="pick-check-${k}"></span>
    </div>
  `).join('');

  document.getElementById('pick-fruit').innerHTML = render(fruits);
  document.getElementById('pick-vege').innerHTML  = render(veges);
}

function togglePick(key) {
  const el    = document.getElementById('pick-' + key);
  const check = document.getElementById('pick-check-' + key);
  const idx   = wState.savedCrops.indexOf(key);

  if (idx >= 0) {
    wState.savedCrops.splice(idx, 1);
    el.classList.remove('checked');
    check.textContent = '';
  } else {
    wState.savedCrops.push(key);
    el.classList.add('checked');
    check.textContent = '✓';
  }

  document.getElementById('confirm-btn').disabled = wState.savedCrops.length === 0;
}

function confirmSetup() {
  saveCrops(wState.savedCrops);
  wState.activeCrop = wState.savedCrops[0] || null;
  showMainScreen();
}

/* ===== Main screen ===== */
function showMainScreen() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-screen').style.display  = 'block';
  buildWatchTabs();
  if (wState.activeCrop) wRenderAll();
}

function buildWatchTabs() {
  const tabs = wState.savedCrops.map(k =>
    `<button class="watch-tab ${k === wState.activeCrop ? 'active' : ''}"
      onclick="wSelectCrop('${k}')">${k}</button>`
  ).join('');

  document.getElementById('watch-tabs').innerHTML =
    tabs + `<button class="watch-edit-btn" onclick="showSetup()">編輯清單</button>`;
}

function wSelectCrop(key) {
  wState.activeCrop = key;
  wState.varIdx     = 0;
  buildWatchTabs();
  wRenderAll();
}

/* 回到設定畫面 */
function showSetup() {
  document.getElementById('main-screen').style.display  = 'none';
  document.getElementById('setup-screen').style.display = 'block';

  /* 保持已選狀態 */
  wState.savedCrops.forEach(k => {
    const el    = document.getElementById('pick-' + k);
    const check = document.getElementById('pick-check-' + k);
    if (el)    el.classList.add('checked');
    if (check) check.textContent = '✓';
  });
  document.getElementById('confirm-btn').disabled = false;
  document.getElementById('confirm-btn').textContent = '更新我的清單';
}

/* ===== Price type ===== */
function wSetPriceType(t) {
  wState.priceType = t;
  document.getElementById('w-ptab-a').className = 'ptt ' + (t === 'auction' ? 'active auction' : 'auction');
  document.getElementById('w-ptab-w').className = 'ptt ' + (t === 'wholesale' ? 'active wholesale' : 'wholesale');
  document.getElementById('w-ptype-note').textContent = t === 'auction'
    ? '拍賣價：農民送拍、市場公開競標，價格透明。來源：農業部 / 高雄果菜公司 / 台中果菜公司'
    : '行口價：行口盤商收購，通常比拍賣價低 5–15%，注意兩者不可混合計算。';
  wRenderAll();
}

function wSetMktType(t) {
  wState.mktType = t;
  document.getElementById('w-mptab-a').className = 'ptt ' + (t === 'auction' ? 'active auction' : 'auction');
  document.getElementById('w-mptab-w').className = 'ptt ' + (t === 'wholesale' ? 'active wholesale' : 'wholesale');
  wRenderMarkets();
}

function wSetRange(n, el) {
  wState.range = n;
  document.querySelectorAll('#w-range-tg .tb').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  wRenderTrend();
}

function wToggleLayer(k, el) {
  wState.layers[k] = !wState.layers[k];
  el.classList.toggle('active', wState.layers[k]);
  document.getElementById('w-vol-wrap').style.display = wState.layers.vol ? 'block' : 'none';
  wRenderTrend();
}

function wSelectVar(i) {
  wState.varIdx = i;
  wRenderAll();
}

/* ===== Render ===== */
function wRenderAll() {
  wRenderSummary();
  wRenderVarieties();
  wRenderTrend();
  wRenderMarkets();
  wRenderNews();
}

function wRenderSummary() {
  if (!wState.activeCrop) return;
  const crop = CROP_DATA[wState.activeCrop];
  const v    = crop.varieties[wState.varIdx] || crop.varieties[0];
  const isA  = wState.priceType === 'auction';
  const avgKg  = isA ? v.avgA  : v.avgW;
  const prevKg = isA ? v.prevA : v.prevW;
  const hiKg   = isA ? v.hiA   : v.hiW;
  const loKg   = isA ? v.loA   : v.loW;
  const volKg  = isA ? v.volA  : v.volW;
  const pl     = Units.priceLabel();
  const chg    = Units.formatChange(avgKg, prevKg);
  const { val:vv, unit:vu } = Units.convVol(volKg);
  const badge  = isA
    ? '<span class="badge badge-auction">拍賣</span>'
    : '<span class="badge badge-wholesale">行口</span>';

  document.getElementById('w-crop-title').innerHTML = wState.activeCrop + ' ' + badge;
  document.getElementById('w-crop-sub').textContent  = v.code + ' · ' + pl;

  document.getElementById('w-sum-row').innerHTML = `
    <div class="metric"><div class="metric-label">今日均價</div><div class="metric-value">${Units.convPrice(avgKg)}<span class="metric-unit">${pl}</span></div><div class="metric-sub ${chg.cls}">${chg.arrow} ${chg.text}</div></div>
    <div class="metric"><div class="metric-label">上價</div><div class="metric-value color-up">${Units.convPrice(hiKg)}<span class="metric-unit">${pl}</span></div></div>
    <div class="metric"><div class="metric-label">下價</div><div class="metric-value color-down">${Units.convPrice(loKg)}<span class="metric-unit">${pl}</span></div></div>
    <div class="metric"><div class="metric-label">成交量</div><div class="metric-value">${vv}<span class="metric-unit">${vu}</span></div></div>
    <div class="metric"><div class="metric-label">預估零售</div><div class="metric-value">${Units.convPrice(avgKg*3)}<span class="metric-unit">${pl}</span></div><div class="metric-sub" style="color:var(--text-tertiary)">×3 倍估算</div></div>
  `;
}

function wRenderVarieties() {
  if (!wState.activeCrop) return;
  const crop = CROP_DATA[wState.activeCrop];
  const isA  = wState.priceType === 'auction';
  const pl   = Units.priceLabel();

  document.getElementById('w-var-sub').textContent  = wState.activeCrop + ' 所有品種（' + pl + '）';
  document.getElementById('w-th-avg').textContent = '均價(' + pl + ')';
  document.getElementById('w-th-hi').textContent  = '上價(' + pl + ')';
  document.getElementById('w-th-lo').textContent  = '下價(' + pl + ')';
  document.getElementById('w-th-vol').textContent = '成交量(' + Units.volLabel() + ')';

  document.getElementById('w-var-body').innerHTML = crop.varieties.map((v, i) => {
    const a   = isA ? v.avgA  : v.avgW;
    const pr  = isA ? v.prevA : v.prevW;
    const h   = isA ? v.hiA   : v.hiW;
    const l   = isA ? v.loA   : v.loW;
    const vol = isA ? v.volA  : v.volW;
    const c   = Units.formatChange(a, pr);
    const { val:vval, unit:vunit } = Units.convVol(vol);
    return `<tr class="${i === wState.varIdx ? 'selected' : ''}" onclick="wSelectVar(${i})">
      <td><span class="variety-name">${v.name}</span></td>
      <td><span class="badge ${isA ? 'badge-auction' : 'badge-wholesale'}">${isA ? '拍賣' : '行口'}</span></td>
      <td class="price-cell">${Units.convPrice(a)}</td>
      <td class="chg-cell ${c.cls}">${c.arrow} ${c.text}</td>
      <td class="vol-cell hide-mobile">${Units.convPrice(h)}</td>
      <td class="vol-cell hide-mobile">${Units.convPrice(l)}</td>
      <td class="vol-cell">${vval} ${vunit}</td>
    </tr>`;
  }).join('');
}

function wRenderTrend() {
  if (!wState.activeCrop) return;
  const crop   = CROP_DATA[wState.activeCrop];
  const v      = crop.varieties[wState.varIdx] || crop.varieties[0];
  const isA    = wState.priceType === 'auction';
  const baseKg = isA ? v.avgA : v.avgW;

  Charts.drawTrend({
    canvasId:  'w-trendC',
    baseKg,
    varSeed:   wState.varIdx * 100,
    range:     wState.range,
    priceType: wState.priceType,
    layers:    wState.layers,
  });

  if (wState.layers.vol) {
    Charts.drawVol({ canvasId:'w-volC', n:wState.range, seed:wState.varIdx * 100 });
  }

  const mainColor = isA ? '#854F0B' : '#185FA5';
  const pl        = Units.priceLabel();
  const legParts  = [`<span class="legend-item"><span class="legend-swatch" style="background:${mainColor}"></span>${isA ? '拍賣均價' : '行口均價'}（${pl}）</span>`];
  if (wState.layers.lastYear) legParts.push(`<span class="legend-item"><span class="legend-dashed" style="color:#639922"></span>去年同期</span>`);
  if (wState.layers.band)     legParts.push(`<span class="legend-item"><span style="display:inline-block;width:16px;height:8px;background:rgba(99,153,34,0.15);border:0.5px solid rgba(99,153,34,0.4);border-radius:2px"></span>歷史價格帶</span>`);
  if (wState.layers.ma)       legParts.push(`<span class="legend-item"><span class="legend-dashed" style="color:#BA7517"></span>7日均線</span>`);
  document.getElementById('w-trend-legend').innerHTML = legParts.join('');
  document.getElementById('w-season-note').textContent = crop.season;
}

function wRenderMarkets() {
  if (!wState.activeCrop) return;
  const crop   = CROP_DATA[wState.activeCrop];
  const v      = crop.varieties[wState.varIdx] || crop.varieties[0];
  const isA    = wState.mktType === 'auction';
  const mkts   = isA ? AUCTION_MARKETS : WHOLESALE_MARKETS;
  const baseKg = isA ? v.avgA : v.avgW;
  const pl     = Units.priceLabel();

  const list = mkts.map((m, i) => ({
    ...m,
    priceKg: +(baseKg * (0.82 + rng(i * 13 + wState.varIdx * 7) * 0.36)).toFixed(1),
    volKg:   Math.round((20 + rng(i * 17) * 200) * 1000),
  })).sort((a, b) => b.priceKg - a.priceKg);

  const maxP = list[0].priceKg;
  document.getElementById('w-mkt-sub').textContent = `今日 · ${isA ? '拍賣' : '行口'} · ${v.name}`;

  document.getElementById('w-mkt-section').innerHTML = list.map((m, i) => {
    const pct     = Math.max(14, (m.priceKg / maxP) * 100);
    const isBest  = i === 0, isWorst = i === list.length - 1;
    const fillC   = isBest ? '#C0DD97' : isWorst ? '#F7C1C1' : '#D3D1C7';
    const textC   = isBest ? '#27500A' : isWorst ? '#791F1F' : '#5F5E5A';
    const { val:vv, unit:vu } = Units.convVol(m.volKg);
    return `<div class="market-row">
      <div class="market-name">${m.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${fillC}"><span class="bar-fill-val" style="color:${textC}">${Units.convPrice(m.priceKg)}</span></div></div>
      <span class="region-tag" style="color:${REGION_COLOR[m.region]};background:${REGION_BG[m.region]}">${m.region}</span>
      <span class="market-vol">${vv}${vu.slice(0,1)}</span>
      ${isBest  ? '<span class="best-tag">最高</span>'  : ''}
      ${isWorst ? '<span class="worst-tag">最低</span>' : ''}
    </div>`;
  }).join('');
}

function wRenderNews() {
  if (!wState.activeCrop) return;
  const crop = CROP_DATA[wState.activeCrop];
  document.getElementById('w-news-ct').innerHTML =
    `相關新聞 <span class="card-title-sub">${wState.activeCrop} 最新動態</span>`;
  document.getElementById('w-news-list').innerHTML = crop.news.map(n => `
    <div class="news-item">
      <span class="news-tag ${n.tag}">${n.label}</span>
      <div class="news-title">${n.title}</div>
      <div class="news-meta">${n.src} · ${n.time}</div>
    </div>
  `).join('');
}

/* ===== 單位切換 ===== */
function setPriceUnit(u, el) {
  Units.setPriceUnit(u);
  document.querySelectorAll('.seg-btn').forEach(b => {
    if (b.textContent.includes('公斤') || b.textContent.includes('台斤')) {
      const t = b.textContent.trim();
      if ((u === 'kg' && t === '元/公斤') || (u === 'jin' && t === '元/台斤')) {
        b.classList.add('active');
      } else if (t === '元/公斤' || t === '元/台斤') {
        b.classList.remove('active');
      }
    }
  });
  el.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  wRenderAll();
}

function setVolUnit(u, el) {
  Units.setVolUnit(u);
  el.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active','blue'));
  el.classList.add('active','blue');
  wRenderAll();
}

/* ===== 時鐘 ===== */
function updateClock() {
  const n  = new Date();
  const h  = String(n.getHours()).padStart(2,'0');
  const m  = String(n.getMinutes()).padStart(2,'0');
  const s  = String(n.getSeconds()).padStart(2,'0');
  const y  = n.getFullYear() - 1911;
  const mo = String(n.getMonth()+1).padStart(2,'0');
  const d  = String(n.getDate()).padStart(2,'0');
  document.getElementById('clock-pill').textContent = `${h}:${m}:${s}`;
  document.getElementById('date-pill').textContent  = `民國 ${y}.${mo}.${d}`;
}

/* ===== 初始化 ===== */
document.addEventListener('DOMContentLoaded', () => {
  setInterval(updateClock, 1000);
  updateClock();
  buildPickGrids();

  const saved = loadSaved();
  if (saved.length > 0) {
    wState.savedCrops = saved;
    wState.activeCrop = saved[0];
    wSetPriceType('auction');
    showMainScreen();
  }
});
