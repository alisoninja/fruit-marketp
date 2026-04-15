/* overview.js — 行情總覽頁邏輯 */

let ovState = {
  mainCat:   'fruit',   // 'fruit' | 'vege'
  selectedCrop: null,   // null = 全覽，string = 單一作物
  priceType: 'auction',
  mktType:   'auction',
  varIdx:    0,
  range:     30,
  layers:    { lastYear:false, band:false, ma:false, vol:false },
};

function rng(s){ const x=Math.sin(s+1)*10000; return x-Math.floor(x); }

/* ===== 種類切換 ===== */
function switchMainCat(cat) {
  ovState.mainCat     = cat;
  ovState.selectedCrop = null;
  ovState.varIdx      = 0;
  document.getElementById('tab-fruit').classList.toggle('active', cat === 'fruit');
  document.getElementById('tab-vege').classList.toggle('active',  cat === 'vege');
  buildSubPills();
  renderOverview();
  document.getElementById('detail-section').style.display = 'none';
}

/* ===== 子類品項 pills ===== */
function buildSubPills() {
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  document.getElementById('sub-pills').innerHTML =
    keys.map(k =>
      `<button class="cpill ${k === ovState.selectedCrop ? 'active' : ''}"
        onclick="selectCrop('${k}')">${k}</button>`
    ).join('');
}

/* ===== 選擇單一作物 ===== */
function selectCrop(key) {
  if (ovState.selectedCrop === key) {
    /* 再點一次取消選擇 */
    ovState.selectedCrop = null;
    ovState.varIdx = 0;
  } else {
    ovState.selectedCrop = key;
    ovState.varIdx = 0;
  }
  buildSubPills();
  renderOverview();
  const det = document.getElementById('detail-section');
  if (ovState.selectedCrop) {
    det.style.display = 'block';
    renderDetail();
    det.scrollIntoView({ behavior:'smooth', block:'start' });
  } else {
    det.style.display = 'none';
  }
}

/* ===== 總量摘要 ===== */
function renderTotalSummary() {
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  const label = ovState.selectedCrop || (ovState.mainCat === 'fruit' ? '所有水果' : '所有蔬菜');
  document.getElementById('total-summary-sub').textContent = `今日 · ${label}`;

  const targetKeys = ovState.selectedCrop ? [ovState.selectedCrop] : keys;
  const totalVolA  = targetKeys.reduce((s, k) => s + getCropTotalVolA(k), 0);
  const avgPriceA  = targetKeys.length === 1
    ? getCropAvgA(targetKeys[0])
    : targetKeys.reduce((s, k) => s + getCropAvgA(k), 0) / targetKeys.length;
  const prevPriceA = targetKeys.length === 1
    ? getCropPrevA(targetKeys[0])
    : targetKeys.reduce((s, k) => s + getCropPrevA(k), 0) / targetKeys.length;

  const chg = Units.formatChange(avgPriceA, prevPriceA);
  const { val:vv, unit:vu } = Units.convVol(totalVolA);
  const pl = Units.priceLabel();

  document.getElementById('total-summary-row').innerHTML = `
    <div class="metric">
      <div class="metric-label">均價（拍賣）</div>
      <div class="metric-value">${Units.convPrice(avgPriceA)}<span class="metric-unit">${pl}</span></div>
      <div class="metric-sub ${chg.cls}">${chg.arrow} ${chg.text}</div>
    </div>
    <div class="metric">
      <div class="metric-label">全台成交總量</div>
      <div class="metric-value">${vv}<span class="metric-unit">${vu}</span></div>
    </div>
    <div class="metric">
      <div class="metric-label">預估零售均價</div>
      <div class="metric-value">${Units.convPrice(avgPriceA * 3)}<span class="metric-unit">${pl}</span></div>
    </div>
    <div class="metric">
      <div class="metric-label">追蹤品項數</div>
      <div class="metric-value">${targetKeys.length}<span class="metric-unit">項</span></div>
    </div>
  `;
}

/* ===== 漲跌排行 ===== */
function renderRankings() {
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  const items = keys.map(k => {
    const avg  = getCropAvgA(k);
    const prev = getCropPrevA(k);
    const pct  = prev > 0 ? (avg - prev) / prev * 100 : 0;
    return { key: k, avg, pct };
  });

  const sorted = [...items].sort((a, b) => b.pct - a.pct);
  const pl     = Units.priceLabel();

  const noClass = ['gold','silver','bronze'];

  const renderList = (list) => list.slice(0, 5).map((item, i) => {
    const chg = Units.formatChange(item.avg, item.avg / (1 + item.pct / 100));
    return `<div class="rank-item">
      <span class="rank-no ${noClass[i] || ''}">${i + 1}</span>
      <span class="rank-name">${item.key}</span>
      <span class="rank-price">${Units.convPrice(item.avg)}<span style="font-size:10px;color:var(--text-tertiary);margin-left:2px">${pl}</span></span>
      <span class="rank-chg ${item.pct > 0 ? 'color-up' : item.pct < 0 ? 'color-down' : 'color-flat'}">
        ${item.pct > 0 ? '▲' : item.pct < 0 ? '▼' : '—'} ${Math.abs(item.pct).toFixed(1)}%
      </span>
    </div>`;
  }).join('');

  document.getElementById('rank-up').innerHTML   = renderList(sorted);
  document.getElementById('rank-down').innerHTML = renderList([...sorted].reverse());
}

/* ===== 商品卡片網格 ===== */
function renderGrid() {
  const catLabel = ovState.mainCat === 'fruit' ? '水果' : '蔬菜';
  document.getElementById('grid-title').innerHTML =
    `${catLabel}總覽 <span class="card-title-sub">點擊商品查看詳情</span>`;

  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  const pl   = Units.priceLabel();

  document.getElementById('overview-grid').innerHTML = keys.map(key => {
    const avg  = getCropAvgA(key);
    const prev = getCropPrevA(key);
    const chg  = Units.formatChange(avg, prev);
    const vol  = getCropTotalVolA(key);
    const { val:vv, unit:vu } = Units.convVol(vol);
    const sel  = key === ovState.selectedCrop ? 'selected' : '';

    return `<div class="crop-card ${sel}" onclick="selectCrop('${key}')">
      <div class="crop-card-name">${key}</div>
      <div>
        <span class="crop-card-price">${Units.convPrice(avg)}</span>
        <span class="crop-card-unit">${pl}</span>
      </div>
      <div class="crop-card-chg ${chg.cls}">${chg.arrow} ${chg.text}</div>
      <div class="crop-card-vol">成交 ${vv} ${vu}</div>
    </div>`;
  }).join('');
}

/* ===== renderOverview ===== */
function renderOverview() {
  renderTotalSummary();
  renderRankings();
  renderGrid();
}

/* ===== 詳情區 ===== */
function setPriceType(t) {
  ovState.priceType = t;
  document.getElementById('ptab-a').className = 'ptt ' + (t === 'auction' ? 'active auction' : 'auction');
  document.getElementById('ptab-w').className = 'ptt ' + (t === 'wholesale' ? 'active wholesale' : 'wholesale');
  document.getElementById('ptype-note').textContent = t === 'auction'
    ? '拍賣價：農民送拍、市場公開競標，價格透明。來源：農業部批發市場 / 高雄果菜公司 / 台中果菜公司'
    : '行口價：行口盤商收購價，通常比拍賣價低 5–15%，注意兩者不可混合計算。';
  renderDetail();
}

function setMktType(t) {
  ovState.mktType = t;
  document.getElementById('mptab-a').className = 'ptt ' + (t === 'auction' ? 'active auction' : 'auction');
  document.getElementById('mptab-w').className = 'ptt ' + (t === 'wholesale' ? 'active wholesale' : 'wholesale');
  renderMarkets();
}

function setRange(n, el) {
  ovState.range = n;
  document.querySelectorAll('#range-tg .tb').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderTrendChart();
}

function toggleLayer(k, el) {
  ovState.layers[k] = !ovState.layers[k];
  el.classList.toggle('active', ovState.layers[k]);
  document.getElementById('vol-wrap').style.display = ovState.layers.vol ? 'block' : 'none';
  renderTrendChart();
}

function selectVar(i) {
  ovState.varIdx = i;
  renderDetail();
}

function renderDetail() {
  if (!ovState.selectedCrop) return;
  const crop = CROP_DATA[ovState.selectedCrop];
  const v    = crop.varieties[ovState.varIdx] || crop.varieties[0];
  const isA  = ovState.priceType === 'auction';
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

  document.getElementById('det-title').innerHTML = ovState.selectedCrop + ' ' + badge;
  document.getElementById('det-sub').textContent  = v.code + ' · ' + pl;

  document.getElementById('det-sum-row').innerHTML = `
    <div class="metric"><div class="metric-label">今日均價</div><div class="metric-value">${Units.convPrice(avgKg)}<span class="metric-unit">${pl}</span></div><div class="metric-sub ${chg.cls}">${chg.arrow} ${chg.text}</div></div>
    <div class="metric"><div class="metric-label">上價</div><div class="metric-value color-up">${Units.convPrice(hiKg)}<span class="metric-unit">${pl}</span></div></div>
    <div class="metric"><div class="metric-label">下價</div><div class="metric-value color-down">${Units.convPrice(loKg)}<span class="metric-unit">${pl}</span></div></div>
    <div class="metric"><div class="metric-label">成交量</div><div class="metric-value">${vv}<span class="metric-unit">${vu}</span></div></div>
    <div class="metric"><div class="metric-label">預估零售</div><div class="metric-value">${Units.convPrice(avgKg*3)}<span class="metric-unit">${pl}</span></div><div class="metric-sub" style="color:var(--text-tertiary)">×3 倍估算</div></div>
  `;

  /* 品種比較表 */
  document.getElementById('var-sub').textContent = ovState.selectedCrop + ' 所有品種（' + pl + '）';
  document.getElementById('th-avg').textContent = '均價(' + pl + ')';
  document.getElementById('th-hi').textContent  = '上價(' + pl + ')';
  document.getElementById('th-lo').textContent  = '下價(' + pl + ')';
  document.getElementById('th-vol').textContent = '成交量(' + Units.volLabel() + ')';

  document.getElementById('var-body').innerHTML = crop.varieties.map((vv2, i) => {
    const a   = isA ? vv2.avgA  : vv2.avgW;
    const pr  = isA ? vv2.prevA : vv2.prevW;
    const h   = isA ? vv2.hiA   : vv2.hiW;
    const l   = isA ? vv2.loA   : vv2.loW;
    const vol = isA ? vv2.volA  : vv2.volW;
    const c   = Units.formatChange(a, pr);
    const { val:vval, unit:vunit } = Units.convVol(vol);
    return `<tr class="${i === ovState.varIdx ? 'selected' : ''}" onclick="selectVar(${i})">
      <td><span class="variety-name">${vv2.name}</span></td>
      <td><span class="badge ${isA ? 'badge-auction' : 'badge-wholesale'}">${isA ? '拍賣' : '行口'}</span></td>
      <td class="price-cell">${Units.convPrice(a)}</td>
      <td class="chg-cell ${c.cls}">${c.arrow} ${c.text}</td>
      <td class="vol-cell hide-mobile">${Units.convPrice(h)}</td>
      <td class="vol-cell hide-mobile">${Units.convPrice(l)}</td>
      <td class="vol-cell">${vval} ${vunit}</td>
    </tr>`;
  }).join('');

  renderTrendChart();
  renderMarkets();
}

function renderTrendChart() {
  if (!ovState.selectedCrop) return;
  const crop   = CROP_DATA[ovState.selectedCrop];
  const v      = crop.varieties[ovState.varIdx] || crop.varieties[0];
  const isA    = ovState.priceType === 'auction';
  const baseKg = isA ? v.avgA : v.avgW;

  Charts.drawTrend({
    canvasId:  'trendC',
    baseKg,
    varSeed:   ovState.varIdx * 100,
    range:     ovState.range,
    priceType: ovState.priceType,
    layers:    ovState.layers,
  });

  if (ovState.layers.vol) {
    Charts.drawVol({ canvasId:'volC', n:ovState.range, seed:ovState.varIdx * 100 });
  }

  const mainColor = isA ? '#854F0B' : '#185FA5';
  const pl        = Units.priceLabel();
  const legParts  = [`<span class="legend-item"><span class="legend-swatch" style="background:${mainColor}"></span>${isA ? '拍賣均價' : '行口均價'}（${pl}）</span>`];
  if (ovState.layers.lastYear) legParts.push(`<span class="legend-item"><span class="legend-dashed" style="color:#639922"></span>去年同期</span>`);
  if (ovState.layers.band)     legParts.push(`<span class="legend-item"><span style="display:inline-block;width:16px;height:8px;background:rgba(99,153,34,0.15);border:0.5px solid rgba(99,153,34,0.4);border-radius:2px"></span>歷史價格帶</span>`);
  if (ovState.layers.ma)       legParts.push(`<span class="legend-item"><span class="legend-dashed" style="color:#BA7517"></span>7日均線</span>`);
  document.getElementById('trend-legend').innerHTML = legParts.join('');
  document.getElementById('season-note').textContent = crop.season;
}

function renderMarkets() {
  if (!ovState.selectedCrop) return;
  const crop   = CROP_DATA[ovState.selectedCrop];
  const v      = crop.varieties[ovState.varIdx] || crop.varieties[0];
  const isA    = ovState.mktType === 'auction';
  const mkts   = isA ? AUCTION_MARKETS : WHOLESALE_MARKETS;
  const baseKg = isA ? v.avgA : v.avgW;
  const pl     = Units.priceLabel();

  const list = mkts.map((m, i) => ({
    ...m,
    priceKg: +(baseKg * (0.82 + rng(i * 13 + ovState.varIdx * 7) * 0.36)).toFixed(1),
    volKg:   Math.round((20 + rng(i * 17) * 200) * 1000),
  })).sort((a, b) => b.priceKg - a.priceKg);

  const maxP = list[0].priceKg;
  document.getElementById('mkt-sub').textContent = `今日 · ${isA ? '拍賣' : '行口'} · ${v.name} (${pl})`;

  document.getElementById('mkt-section').innerHTML = list.map((m, i) => {
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

/* ===== 單位切換 ===== */
function setPriceUnit(u, el) {
  Units.setPriceUnit(u);
  document.querySelectorAll('#price-unit-seg .seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderOverview();
  if (ovState.selectedCrop) renderDetail();
}

function setVolUnit(u, el) {
  Units.setVolUnit(u);
  document.querySelectorAll('#vol-unit-seg .seg-btn').forEach(b => b.classList.remove('active','blue'));
  el.classList.add('active','blue');
  renderOverview();
  if (ovState.selectedCrop) renderDetail();
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
  setPriceType('auction');
  buildSubPills();
  renderOverview();
  setInterval(updateClock, 1000);
  updateClock();
  setTimeout(() => {
    const f = document.getElementById('loading-fill');
    if (f) f.classList.remove('active');
  }, 1200);
});
