/* watchlist.js — 我的關注頁，品項以大類分組 */

const LS_KEY = 'agri_watchlist_v1';

let wState = {
  savedCrops: [],   /* 大類名稱清單，例如 ['鳳梨','高麗菜'] */
  activeCrop: null,
  activeVar:  0,
  priceType:  'auction',
  mktType:    'auction',
  range:      30,
  layers:     { ma:false, vol:false },
};

const W_DEFAULT = 10;

function loadSaved() { try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch { return []; } }
function saveCrops(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

/* ── 建立選擇清單 ── */
function buildPickGrids() {
  const fruits = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === 'fruit');
  const veges  = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === 'vege');

  const renderSection = (keys, containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!keys.length) { el.innerHTML = `<span style="font-size:0.86rem;color:var(--text-tertiary)">資料載入中…</span>`; return; }

    const showAll   = el.dataset.showAll === 'true';
    const display   = showAll ? keys : keys.slice(0, W_DEFAULT);
    const remaining = keys.length - W_DEFAULT;

    const itemsHtml = display.map(k => {
      const checked = wState.savedCrops.includes(k);
      const varCount = CROP_DATA[k]?.varieties?.length || 0;
      return `<div class="pick-item ${checked?'checked':''}" id="pick-${k}" onclick="togglePick('${k}')">
        <span>${k}${varCount>1?`<span style="font-size:0.64rem;opacity:0.7;margin-left:3px">${varCount}品種</span>`:''}</span>
        <span class="pick-check" id="pick-check-${k}">${checked?'✓':''}</span>
      </div>`;
    }).join('');

    let moreHtml = '';
    if (!showAll && remaining > 0) {
      moreHtml = `<div style="grid-column:1/-1;text-align:center;padding-top:2px">
        <button onclick="togglePickShowAll('${containerId}')" style="font-size:0.82rem;padding:5px 16px;border:0.5px solid var(--border-strong);border-radius:20px;color:var(--text-secondary);background:var(--bg-card);cursor:pointer">查看更多（還有 ${remaining} 項）</button></div>`;
    } else if (showAll && keys.length > W_DEFAULT) {
      moreHtml = `<div style="grid-column:1/-1;text-align:center;padding-top:2px">
        <button onclick="togglePickShowAll('${containerId}')" style="font-size:0.82rem;padding:5px 16px;border:0.5px solid var(--border-strong);border-radius:20px;color:var(--text-tertiary);background:var(--bg-card);cursor:pointer">收起</button></div>`;
    }

    el.innerHTML = itemsHtml + moreHtml;
  };

  renderSection(fruits, 'pick-fruit');
  renderSection(veges,  'pick-vege');
}

function togglePickShowAll(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.showAll = el.dataset.showAll === 'true' ? 'false' : 'true';
  buildPickGrids();
}

function togglePick(key) {
  const el    = document.getElementById('pick-' + key);
  const check = document.getElementById('pick-check-' + key);
  const idx   = wState.savedCrops.indexOf(key);
  if (idx >= 0) {
    wState.savedCrops.splice(idx, 1);
    el?.classList.remove('checked');
    if (check) check.textContent = '';
  } else {
    wState.savedCrops.push(key);
    el?.classList.add('checked');
    if (check) check.textContent = '✓';
  }
  document.getElementById('confirm-btn').disabled = wState.savedCrops.length === 0;
}

function confirmSetup() {
  saveCrops(wState.savedCrops);
  wState.activeCrop = wState.savedCrops[0] || null;
  showMainScreen();
}

function showMainScreen() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('main-screen').style.display  = 'block';
  buildWatchTabs();
  if (wState.activeCrop) { wRenderAll(); fetchNews(wState.activeCrop, 'w-news-list'); }
}

function buildWatchTabs() {
  const tabs = wState.savedCrops.map(k =>
    `<button class="watch-tab ${k===wState.activeCrop?'active':''}" onclick="wSelectCrop('${k}')">${k}</button>`
  ).join('');
  document.getElementById('watch-tabs').innerHTML =
    tabs + `<button class="watch-edit-btn" onclick="showSetup()">編輯清單</button>`;
}

function wSelectCrop(key) {
  wState.activeCrop = key;
  wState.activeVar  = 0;
  buildWatchTabs();
  wRenderAll();
  wRenderSubPicker();
  fetchNews(key, 'w-news-list');
}

/* 子品種選擇器 */
function wRenderSubPicker() {
  const el = document.getElementById('w-sub-variety-picker');
  if (!el) return;
  const crop = CROP_DATA[wState.activeCrop];
  if (!crop || crop.varieties.length <= 1) { el.style.display='none'; return; }
  el.style.display = 'flex';
  el.innerHTML = crop.varieties.map((v,i) =>
    `<button class="cpill ${i===wState.activeVar?'active':''}" onclick="wSelectVar(${i})">${v.subName}</button>`
  ).join('');
}

function wSelectVar(i) {
  wState.activeVar = i;
  wRenderSubPicker();
  wRenderAll();
}

function showSetup() {
  document.getElementById('main-screen').style.display  = 'none';
  document.getElementById('setup-screen').style.display = 'block';
  buildPickGrids();
  document.getElementById('confirm-btn').disabled = false;
  document.getElementById('confirm-btn').textContent = '更新我的清單';
}

/* ── 價格/市場類型 ── */
function wSetPriceType(t) {
  wState.priceType = t;
  document.getElementById('w-ptab-a').className='ptt '+(t==='auction'?'active auction':'auction');
  document.getElementById('w-ptab-w').className='ptt '+(t==='wholesale'?'active wholesale':'wholesale');
  document.getElementById('w-ptype-note').textContent = t==='auction'
    ? '拍賣價：農民送拍、市場公開競標，價格透明。來源：農業部批發市場 / 高雄果菜公司 / 台中果菜公司'
    : '行口價：以拍賣均價 × 0.9 估算，實際行口價依各地市場而異，僅供參考。';
  wRenderAll();
}

function wSetMktType(t) {
  wState.mktType=t;
  document.getElementById('w-mptab-a').className='ptt '+(t==='auction'?'active auction':'auction');
  document.getElementById('w-mptab-w').className='ptt '+(t==='wholesale'?'active wholesale':'wholesale');
  wRenderMarkets();
}

function wSetRange(n,el) {
  wState.range=n;
  document.querySelectorAll('#w-range-tg .tb').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  wRenderTrend();
}

function wToggleLayer(k,el) {
  wState.layers[k]=!wState.layers[k];
  el.classList.toggle('active',wState.layers[k]);
  document.getElementById('w-vol-wrap').style.display=wState.layers.vol?'block':'none';
  wRenderTrend();
}

function wSelectVar(i) { wState.activeVar=i; wRenderSubPicker(); wRenderAll(); }

function wRenderAll() { wRenderSummary(); wRenderVarieties(); wRenderTrend(); wRenderMarkets(); }

/* ── 安全工具 ── */
function wP(v) { if(v===null||v===undefined||isNaN(parseFloat(v))) return NA; return Units.convPrice(parseFloat(v)); }
function wV(v) { if(v===null||v===undefined||isNaN(parseFloat(v))) return {val:NA,unit:''}; return Units.convVol(parseFloat(v)); }
function wC(c,p) { if(c===null||p===null||isNaN(parseFloat(c))||isNaN(parseFloat(p))) return {text:NA,cls:'color-flat',arrow:''}; return Units.formatChange(parseFloat(c),parseFloat(p)); }

function wRenderSummary() {
  if (!wState.activeCrop) return;
  const crop=CROP_DATA[wState.activeCrop]; if (!crop) return;
  const v=crop.varieties[wState.activeVar]||crop.varieties[0];
  const isA=wState.priceType==='auction';
  const pl=Units.priceLabel();
  const avgKg=isA?v.avgA:v.avgW, prevKg=isA?v.prevA:v.prevW;
  const hiKg=isA?v.hiA:v.hiW, loKg=isA?v.loA:v.loW, volKg=isA?v.volA:v.volW;
  const chg=wC(avgKg,prevKg);
  const {val:vv,unit:vu}=wV(volKg);
  const ad=wP(avgKg),hd=wP(hiKg),ld=wP(loKg);
  const rd=avgKg!==null?wP(avgKg*3):NA;
  const badge=isA?'<span class="badge badge-auction">拍賣</span>':'<span class="badge badge-wholesale">行口</span>';
  document.getElementById('w-crop-title').innerHTML=v.name+' '+badge;
  document.getElementById('w-crop-sub').textContent=v.code+' · '+pl;
  document.getElementById('w-sum-row').innerHTML=`
    <div class="metric"><div class="metric-label">今日均價</div><div class="metric-value">${ad}<span class="metric-unit">${ad!==NA?pl:''}</span></div><div class="metric-sub ${chg.cls}">${chg.arrow} ${chg.text}</div></div>
    <div class="metric"><div class="metric-label">上價</div><div class="metric-value color-up">${hd}<span class="metric-unit">${hd!==NA?pl:''}</span></div></div>
    <div class="metric"><div class="metric-label">下價</div><div class="metric-value color-down">${ld}<span class="metric-unit">${ld!==NA?pl:''}</span></div></div>
    <div class="metric"><div class="metric-label">成交量</div><div class="metric-value">${vv}<span class="metric-unit">${vu}</span></div></div>
    <div class="metric"><div class="metric-label">預估零售</div><div class="metric-value">${rd}<span class="metric-unit">${rd!==NA?pl:''}</span></div><div class="metric-sub" style="color:var(--text-tertiary)">×3 倍估算</div></div>
  `;
}

function wRenderVarieties() {
  if (!wState.activeCrop) return;
  const crop=CROP_DATA[wState.activeCrop]; if (!crop) return;
  const isA=wState.priceType==='auction';
  const pl=Units.priceLabel();
  document.getElementById('w-var-sub').textContent=wState.activeCrop+'（'+pl+'）';
  document.getElementById('w-th-avg').textContent='均價('+pl+')';
  document.getElementById('w-th-hi').textContent='上價('+pl+')';
  document.getElementById('w-th-lo').textContent='下價('+pl+')';
  document.getElementById('w-th-vol').textContent='成交量('+Units.volLabel()+')';
  document.getElementById('w-var-body').innerHTML=crop.varieties.map((v,i)=>{
    const a=isA?v.avgA:v.avgW, pr=isA?v.prevA:v.prevW;
    const h=isA?v.hiA:v.hiW, l=isA?v.loA:v.loW, vol=isA?v.volA:v.volW;
    const c=wC(a,pr);
    const {val:vval,unit:vunit}=wV(vol);
    return `<tr class="${i===wState.activeVar?'selected':''}" onclick="wSelectVar(${i})">
      <td><span class="variety-name">${v.name}</span></td>
      <td><span class="badge ${isA?'badge-auction':'badge-wholesale'}">${isA?'拍賣':'行口'}</span></td>
      <td class="price-cell">${wP(a)}</td>
      <td class="chg-cell ${c.cls}">${c.arrow} ${c.text}</td>
      <td class="vol-cell hide-mobile">${wP(h)}</td>
      <td class="vol-cell hide-mobile">${wP(l)}</td>
      <td class="vol-cell">${vval} ${vunit}</td>
    </tr>`;
  }).join('');
}

function wRenderTrend() {
  if (!wState.activeCrop) return;
  const crop=CROP_DATA[wState.activeCrop]; if (!crop) return;
  const hist=crop.historyPoints||[];
  const slice=hist.slice(-wState.range);
  if (slice.length<2) { document.getElementById('w-trend-legend').innerHTML=`<span style="font-size:0.79rem;color:var(--text-tertiary)">歷史資料不足（N/A）</span>`; return; }
  const labels=slice.map(d=>{const p=d.date.split('.');return p.length>=3?`${parseInt(p[1])}/${parseInt(p[2])}`:d.date;});
  const thisY=slice.map(d=>d.avg!==null?Units.convPrice(d.avg):null);
  const volD=slice.map(d=>d.vol||0);
  Charts.drawTrendRaw({canvasId:'w-trendC',labels,thisY,volData:volD,priceType:wState.priceType,layers:wState.layers});
  if (wState.layers.vol) Charts.drawVolRaw({canvasId:'w-volC',labels,volData:volD});
  const mainColor=wState.priceType==='auction'?'#854F0B':'#185FA5';
  const pl=Units.priceLabel();
  document.getElementById('w-trend-legend').innerHTML=`<span class="legend-item"><span class="legend-swatch" style="background:${mainColor}"></span>${wState.priceType==='auction'?'拍賣均價':'行口均價'}（${pl}）— 農業部實際資料</span>`;
  document.getElementById('w-season-note').textContent=crop.season;
}

function wRenderMarkets() {
  if (!wState.activeCrop) return;
  const crop=CROP_DATA[wState.activeCrop]; if (!crop) return;
  const isA=wState.mktType==='auction';
  const pl=Units.priceLabel();
  const mktSummary=crop.mktSummary||{};
  const realMkts=Object.entries(mktSummary).filter(([,v])=>v.avg!==null)
    .map(([name,v])=>({name,region:wRegion(name),priceKg:isA?v.avg:+(v.avg*0.9).toFixed(1),volKg:v.vol||0}))
    .sort((a,b)=>b.priceKg-a.priceKg);
  document.getElementById('w-mkt-sub').textContent=`今日 · ${isA?'拍賣':'行口'} · ${wState.activeCrop}`;
  if (!realMkts.length) { document.getElementById('w-mkt-section').innerHTML=`<div style="font-size:0.86rem;color:var(--text-tertiary);padding:8px 0">此作物目前無市場行情資料（N/A）</div>`; return; }
  const maxP=realMkts[0].priceKg;
  document.getElementById('w-mkt-section').innerHTML=realMkts.map((m,i)=>{
    const pct=Math.max(14,(m.priceKg/maxP)*100);
    const isBest=i===0,isWorst=i===realMkts.length-1;
    const fillC=isBest?'#C0DD97':isWorst?'#F7C1C1':'#D3D1C7';
    const textC=isBest?'#27500A':isWorst?'#791F1F':'#5F5E5A';
    const {val:vv,unit:vu}=wV(m.volKg);
    const rC=REGION_COLOR[m.region]||'#888',rB=REGION_BG[m.region]||'#eee';
    return `<div class="market-row">
      <div class="market-name" title="${m.name}">${m.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${fillC}"><span class="bar-fill-val" style="color:${textC}">${wP(m.priceKg)}</span></div></div>
      <span class="region-tag" style="color:${rC};background:${rB}">${m.region}</span>
      <span class="market-vol">${vv!==NA?vv+vu.slice(0,1):NA}</span>
      ${isBest?'<span class="best-tag">最高</span>':''}${isWorst?'<span class="worst-tag">最低</span>':''}
    </div>`;
  }).join('');
}

function wRegion(n) {
  if (/(台北|板橋|三重|宜蘭|桃園|基隆|新北|新竹|苗栗)/.test(n)) return '北';
  if (/(台中|彰化|南投|豐原|苑裡)/.test(n)) return '中';
  if (/(台南|高雄|嘉義|屏東|鳳山|旗山)/.test(n)) return '南';
  if (/(台東|花蓮)/.test(n)) return '東';
  return '中';
}

function setPriceUnit(u,el) {
  Units.setPriceUnit(u);
  el.parentElement.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  wRenderAll();
}

function setVolUnit(u,el) {
  Units.setVolUnit(u);
  el.parentElement.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active','blue'));
  el.classList.add('active','blue');
  wRenderAll();
}

/* ── 初始化 ── */
document.addEventListener('DOMContentLoaded', () => {
  const saved = loadSaved();
  if (saved.length > 0) { wState.savedCrops = saved; wState.activeCrop = saved[0]; }

  window.DATA_READY.then(() => {
    /* 過濾掉新資料中不存在的舊選項 */
    wState.savedCrops = wState.savedCrops.filter(k => CROP_DATA[k]);

    if (wState.savedCrops.length > 0) {
      wState.activeCrop = CROP_DATA[wState.activeCrop] ? wState.activeCrop : wState.savedCrops[0];
      wSetPriceType('auction');
      showMainScreen();
      wRenderSubPicker();
      fetchNews(wState.activeCrop, 'w-news-list');
    } else {
      buildPickGrids();
      document.getElementById('setup-screen').style.display = 'block';
    }
  });
});
