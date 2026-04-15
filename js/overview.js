/* overview.js — 行情總覽頁，使用真實資料，缺漏顯示 N/A */

let ovState = {
  mainCat:      'fruit',
  selectedCrop: null,
  priceType:    'auction',
  mktType:      'auction',
  varIdx:       0,
  range:        30,
  layers:       { lastYear:false, band:false, ma:false, vol:false },
};

function safePrice(val) {
  if (val === null || val === undefined || isNaN(parseFloat(val))) return NA;
  return Units.convPrice(parseFloat(val));
}

function safeVol(val) {
  if (val === null || val === undefined || isNaN(parseFloat(val))) return { val: NA, unit: '' };
  return Units.convVol(parseFloat(val));
}

function safeChg(cur, prev) {
  if (cur === null || prev === null || cur === NA || prev === NA ||
      isNaN(parseFloat(cur)) || isNaN(parseFloat(prev))) {
    return { text: NA, cls: 'color-flat', arrow: '' };
  }
  return Units.formatChange(parseFloat(cur), parseFloat(prev));
}

function guessRegion(name) {
  if (/(台北|板橋|三重|宜蘭|桃園|基隆|新北|新竹|苗栗)/.test(name)) return '北';
  if (/(台中|彰化|南投|豐原|苑裡)/.test(name)) return '中';
  if (/(台南|高雄|嘉義|屏東|鳳山|旗山)/.test(name)) return '南';
  if (/(台東|花蓮)/.test(name)) return '東';
  return '中';
}

/* ── 種類切換 ── */
function switchMainCat(cat) {
  ovState.mainCat = cat;
  ovState.selectedCrop = null;
  ovState.varIdx = 0;
  document.getElementById('tab-fruit').classList.toggle('active', cat === 'fruit');
  document.getElementById('tab-vege').classList.toggle('active', cat === 'vege');
  buildSubPills();
  renderOverview();
  document.getElementById('detail-section').style.display = 'none';
}

function buildSubPills() {
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  if (!keys.length) {
    document.getElementById('sub-pills').innerHTML =
      `<span style="font-size:0.86rem;color:var(--text-tertiary)">資料載入中，請稍後…</span>`;
    return;
  }
  document.getElementById('sub-pills').innerHTML = keys.map(k =>
    `<button class="cpill ${k === ovState.selectedCrop ? 'active' : ''}"
      onclick="selectCrop('${k}')">${k}</button>`
  ).join('');
}

function selectCrop(key) {
  ovState.selectedCrop = ovState.selectedCrop === key ? null : key;
  ovState.varIdx = 0;
  buildSubPills();
  renderOverview();
  const det = document.getElementById('detail-section');
  if (ovState.selectedCrop) {
    det.style.display = 'block';
    renderDetail();
    fetchNews(ovState.selectedCrop, 'news-list');
    det.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    det.style.display = 'none';
  }
}

/* ── 總量摘要 ── */
function renderTotalSummary() {
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  const label = ovState.selectedCrop || (ovState.mainCat === 'fruit' ? '所有水果' : '所有蔬菜');
  document.getElementById('total-summary-sub').textContent = `今日 · ${label}`;
  const targetKeys = ovState.selectedCrop ? [ovState.selectedCrop] : keys;

  if (!targetKeys.length) {
    document.getElementById('total-summary-row').innerHTML =
      `<div style="font-size:0.86rem;color:var(--text-tertiary);padding:8px 0">等待資料更新…</div>`;
    return;
  }

  const validAvgs = targetKeys.map(k => getCropAvgA(k)).filter(v => v !== null);
  const validPrev = targetKeys.map(k => getCropPrevA(k)).filter(v => v !== null);
  const validVols = targetKeys.map(k => getCropTotalVolA(k)).filter(v => v !== null);

  const avgA     = validAvgs.length ? +(validAvgs.reduce((a,b)=>a+b,0)/validAvgs.length).toFixed(1) : null;
  const prevA    = validPrev.length ? +(validPrev.reduce((a,b)=>a+b,0)/validPrev.length).toFixed(1) : null;
  const totalVol = validVols.length ? validVols.reduce((a,b)=>a+b,0) : null;

  const chg     = safeChg(avgA, prevA);
  const pl      = Units.priceLabel();
  const { val:vv, unit:vu } = safeVol(totalVol);
  const avgDisp = safePrice(avgA);
  const retDisp = avgA !== null ? safePrice(avgA * 3) : NA;

  document.getElementById('total-summary-row').innerHTML = `
    <div class="metric"><div class="metric-label">均價（拍賣）</div>
      <div class="metric-value">${avgDisp}<span class="metric-unit">${avgDisp!==NA?pl:''}</span></div>
      <div class="metric-sub ${chg.cls}">${chg.arrow} ${chg.text}</div></div>
    <div class="metric"><div class="metric-label">全台成交總量</div>
      <div class="metric-value">${vv}<span class="metric-unit">${vu}</span></div></div>
    <div class="metric"><div class="metric-label">預估零售均價</div>
      <div class="metric-value">${retDisp}<span class="metric-unit">${retDisp!==NA?pl:''}</span></div></div>
    <div class="metric"><div class="metric-label">追蹤品項數</div>
      <div class="metric-value">${targetKeys.length}<span class="metric-unit">項</span></div></div>
  `;
}

/* ── 排行 ── */
function renderRankings() {
  const keys  = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  const items = keys.map(k => {
    const avg = getCropAvgA(k), prev = getCropPrevA(k);
    const pct = avg!==null && prev!==null && prev!==0 ? (avg-prev)/prev*100 : null;
    return { key:k, avg, pct };
  });
  const sorted = [...items.filter(i=>i.pct!==null).sort((a,b)=>b.pct-a.pct),
                  ...items.filter(i=>i.pct===null)];
  const pl = Units.priceLabel();
  const nc = ['gold','silver','bronze'];
  const mk = (list) => list.slice(0,5).map((item,i) => {
    const pd = safePrice(item.avg);
    const cd = item.pct!==null
      ? `${item.pct>0?'▲':item.pct<0?'▼':'—'} ${Math.abs(item.pct).toFixed(1)}%` : NA;
    const cc = item.pct===null?'color-flat':item.pct>0?'color-up':item.pct<0?'color-down':'color-flat';
    return `<div class="rank-item">
      <span class="rank-no ${nc[i]||''}">${i+1}</span>
      <span class="rank-name">${item.key}</span>
      <span class="rank-price">${pd}<span style="font-size:0.71rem;color:var(--text-tertiary);margin-left:2px">${pd!==NA?pl:''}</span></span>
      <span class="rank-chg ${cc}">${cd}</span>
    </div>`;
  }).join('');
  document.getElementById('rank-up').innerHTML   = mk(sorted);
  document.getElementById('rank-down').innerHTML = mk([...sorted].reverse());
}

/* ── 商品卡片 ── */
function renderGrid() {
  const catLabel = ovState.mainCat==='fruit'?'水果':'蔬菜';
  document.getElementById('grid-title').innerHTML =
    `${catLabel}總覽 <span class="card-title-sub">點擊商品查看詳情</span>`;
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat===ovState.mainCat);
  const pl   = Units.priceLabel();
  if (!keys.length) {
    document.getElementById('overview-grid').innerHTML =
      `<div style="grid-column:1/-1;font-size:0.86rem;color:var(--text-tertiary);padding:16px 0">資料尚未更新，等待每日自動更新（每日早上 6:00）。</div>`;
    return;
  }
  document.getElementById('overview-grid').innerHTML = keys.map(key => {
    const avg=getCropAvgA(key), prev=getCropPrevA(key), vol=getCropTotalVolA(key);
    const chg=safeChg(avg,prev);
    const {val:vv,unit:vu}=safeVol(vol);
    const pd=safePrice(avg);
    const sel=key===ovState.selectedCrop?'selected':'';
    return `<div class="crop-card ${sel}" onclick="selectCrop('${key}')">
      <div class="crop-card-name">${key}</div>
      <div><span class="crop-card-price">${pd}</span><span class="crop-card-unit">${pd!==NA?pl:''}</span></div>
      <div class="crop-card-chg ${chg.cls}">${chg.arrow} ${chg.text}</div>
      <div class="crop-card-vol">${vv!==NA?`成交 ${vv} ${vu}`:'成交量 N/A'}</div>
    </div>`;
  }).join('');
}

function renderOverview() {
  renderTotalSummary();
  renderRankings();
  renderGrid();
}

/* ── 詳情 ── */
function setPriceType(t) {
  ovState.priceType = t;
  document.getElementById('ptab-a').className='ptt '+(t==='auction'?'active auction':'auction');
  document.getElementById('ptab-w').className='ptt '+(t==='wholesale'?'active wholesale':'wholesale');
  document.getElementById('ptype-note').textContent = t==='auction'
    ? '拍賣價：農民送拍、市場公開競標，價格透明。來源：農業部批發市場 / 高雄果菜公司 / 台中果菜公司'
    : '行口價：以拍賣均價 × 0.9 估算，實際行口價依各地市場而異，僅供參考。';
  renderDetail();
}

function setMktType(t) {
  ovState.mktType=t;
  document.getElementById('mptab-a').className='ptt '+(t==='auction'?'active auction':'auction');
  document.getElementById('mptab-w').className='ptt '+(t==='wholesale'?'active wholesale':'wholesale');
  renderMarkets();
}

function setRange(n,el) {
  ovState.range=n;
  document.querySelectorAll('#range-tg .tb').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderTrendChart();
}

function toggleLayer(k,el) {
  ovState.layers[k]=!ovState.layers[k];
  el.classList.toggle('active',ovState.layers[k]);
  document.getElementById('vol-wrap').style.display=ovState.layers.vol?'block':'none';
  renderTrendChart();
}

function selectVar(i) { ovState.varIdx=i; renderDetail(); }

function renderDetail() {
  if (!ovState.selectedCrop) return;
  const crop=CROP_DATA[ovState.selectedCrop];
  if (!crop) return;
  const v=crop.varieties[ovState.varIdx]||crop.varieties[0];
  const isA=ovState.priceType==='auction';
  const pl=Units.priceLabel();
  const avgKg=isA?v.avgA:v.avgW, prevKg=isA?v.prevA:v.prevW;
  const hiKg=isA?v.hiA:v.hiW, loKg=isA?v.loA:v.loW, volKg=isA?v.volA:v.volW;
  const chg=safeChg(avgKg,prevKg);
  const {val:vv,unit:vu}=safeVol(volKg);
  const ad=safePrice(avgKg), hd=safePrice(hiKg), ld=safePrice(loKg);
  const rd=avgKg!==null?safePrice(avgKg*3):NA;
  const badge=isA?'<span class="badge badge-auction">拍賣</span>':'<span class="badge badge-wholesale">行口</span>';

  document.getElementById('det-title').innerHTML=ovState.selectedCrop+' '+badge;
  document.getElementById('det-sub').textContent=(v.code||'')+' · '+pl;
  document.getElementById('det-sum-row').innerHTML=`
    <div class="metric"><div class="metric-label">今日均價</div><div class="metric-value">${ad}<span class="metric-unit">${ad!==NA?pl:''}</span></div><div class="metric-sub ${chg.cls}">${chg.arrow} ${chg.text}</div></div>
    <div class="metric"><div class="metric-label">上價</div><div class="metric-value color-up">${hd}<span class="metric-unit">${hd!==NA?pl:''}</span></div></div>
    <div class="metric"><div class="metric-label">下價</div><div class="metric-value color-down">${ld}<span class="metric-unit">${ld!==NA?pl:''}</span></div></div>
    <div class="metric"><div class="metric-label">成交量</div><div class="metric-value">${vv}<span class="metric-unit">${vu}</span></div></div>
    <div class="metric"><div class="metric-label">預估零售</div><div class="metric-value">${rd}<span class="metric-unit">${rd!==NA?pl:''}</span></div><div class="metric-sub" style="color:var(--text-tertiary)">×3 倍估算</div></div>
  `;
  document.getElementById('var-sub').textContent=ovState.selectedCrop+'（'+pl+'）';
  document.getElementById('th-avg').textContent='均價('+pl+')';
  document.getElementById('th-hi').textContent='上價('+pl+')';
  document.getElementById('th-lo').textContent='下價('+pl+')';
  document.getElementById('th-vol').textContent='成交量('+Units.volLabel()+')';
  document.getElementById('var-body').innerHTML=crop.varieties.map((vv2,i)=>{
    const a=isA?vv2.avgA:vv2.avgW, pr=isA?vv2.prevA:vv2.prevW;
    const h=isA?vv2.hiA:vv2.hiW, l=isA?vv2.loA:vv2.loW, vol=isA?vv2.volA:vv2.volW;
    const c=safeChg(a,pr);
    const {val:vval,unit:vunit}=safeVol(vol);
    return `<tr class="${i===ovState.varIdx?'selected':''}" onclick="selectVar(${i})">
      <td><span class="variety-name">${vv2.name}</span></td>
      <td><span class="badge ${isA?'badge-auction':'badge-wholesale'}">${isA?'拍賣':'行口'}</span></td>
      <td class="price-cell">${safePrice(a)}</td>
      <td class="chg-cell ${c.cls}">${c.arrow} ${c.text}</td>
      <td class="vol-cell hide-mobile">${safePrice(h)}</td>
      <td class="vol-cell hide-mobile">${safePrice(l)}</td>
      <td class="vol-cell">${vval} ${vunit}</td>
    </tr>`;
  }).join('');
  renderTrendChart();
  renderMarkets();
}

/* ── 趨勢圖：真實歷史資料 ── */
function renderTrendChart() {
  if (!ovState.selectedCrop) return;
  const crop=CROP_DATA[ovState.selectedCrop];
  if (!crop) return;
  const hist=crop.historyPoints||[];
  const slice=hist.slice(-ovState.range);
  if (slice.length<2) {
    document.getElementById('trend-legend').innerHTML=
      `<span style="font-size:0.79rem;color:var(--text-tertiary)">歷史資料不足，無法繪製趨勢圖（N/A）</span>`;
    return;
  }
  const labels=slice.map(d=>{const p=d.date.split('.');return p.length>=3?`${parseInt(p[1])}/${parseInt(p[2])}`:d.date;});
  const thisY=slice.map(d=>d.avg!==null?Units.convPrice(d.avg):null);
  const volD=slice.map(d=>d.vol||0);
  Charts.drawTrendRaw({canvasId:'trendC',labels,thisY,volData:volD,priceType:ovState.priceType,layers:ovState.layers});
  if (ovState.layers.vol) Charts.drawVolRaw({canvasId:'volC',labels,volData:volD});
  const mainColor=ovState.priceType==='auction'?'#854F0B':'#185FA5';
  const pl=Units.priceLabel();
  const legParts=[`<span class="legend-item"><span class="legend-swatch" style="background:${mainColor}"></span>${ovState.priceType==='auction'?'拍賣均價':'行口均價'}（${pl}）— 農業部實際資料</span>`];
  if (ovState.layers.lastYear) legParts.push(`<span class="legend-item"><span class="legend-dashed" style="color:#639922"></span>去年同期（N/A — 待資料累積）</span>`);
  document.getElementById('trend-legend').innerHTML=legParts.join('');
  document.getElementById('season-note').textContent=crop.season;
}

/* ── 市場比較：真實 mktSummary ── */
function renderMarkets() {
  if (!ovState.selectedCrop) return;
  const crop=CROP_DATA[ovState.selectedCrop];
  if (!crop) return;
  const isA=ovState.mktType==='auction';
  const pl=Units.priceLabel();
  const mktSummary=crop.mktSummary||{};
  const realMkts=Object.entries(mktSummary)
    .filter(([,v])=>v.avg!==null)
    .map(([name,v])=>({name,region:guessRegion(name),priceKg:isA?v.avg:+(v.avg*0.9).toFixed(1),volKg:v.vol||0}))
    .sort((a,b)=>b.priceKg-a.priceKg);
  document.getElementById('mkt-sub').textContent=`今日 · ${isA?'拍賣':'行口'} · ${ovState.selectedCrop} (${pl})`;
  if (!realMkts.length) {
    document.getElementById('mkt-section').innerHTML=
      `<div style="font-size:0.86rem;color:var(--text-tertiary);padding:8px 0">此作物目前無市場行情資料（N/A）</div>`;
    return;
  }
  const maxP=realMkts[0].priceKg;
  document.getElementById('mkt-section').innerHTML=realMkts.map((m,i)=>{
    const pct=Math.max(14,(m.priceKg/maxP)*100);
    const isBest=i===0,isWorst=i===realMkts.length-1;
    const fillC=isBest?'#C0DD97':isWorst?'#F7C1C1':'#D3D1C7';
    const textC=isBest?'#27500A':isWorst?'#791F1F':'#5F5E5A';
    const {val:vv,unit:vu}=safeVol(m.volKg);
    const rC=REGION_COLOR[m.region]||'#888', rB=REGION_BG[m.region]||'#eee';
    return `<div class="market-row">
      <div class="market-name" title="${m.name}">${m.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${fillC}"><span class="bar-fill-val" style="color:${textC}">${safePrice(m.priceKg)}</span></div></div>
      <span class="region-tag" style="color:${rC};background:${rB}">${m.region}</span>
      <span class="market-vol">${vv!==NA?vv+vu.slice(0,1):NA}</span>
      ${isBest?'<span class="best-tag">最高</span>':''}
      ${isWorst?'<span class="worst-tag">最低</span>':''}
    </div>`;
  }).join('');
}

/* ── 單位切換 ── */
function setPriceUnit(u,el) {
  Units.setPriceUnit(u);
  document.querySelectorAll('#price-unit-seg .seg-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderOverview();
  if (ovState.selectedCrop) renderDetail();
}

function setVolUnit(u,el) {
  Units.setVolUnit(u);
  document.querySelectorAll('#vol-unit-seg .seg-btn').forEach(b=>b.classList.remove('active','blue'));
  el.classList.add('active','blue');
  renderOverview();
  if (ovState.selectedCrop) renderDetail();
}

/* ── 初始化 ── */
document.addEventListener('DOMContentLoaded', () => {
  setPriceType('auction');
  buildSubPills();
  window.DATA_READY.then(() => { buildSubPills(); renderOverview(); });
  setTimeout(()=>{ const f=document.getElementById('loading-fill'); if(f) f.classList.remove('active'); },2000);
});
