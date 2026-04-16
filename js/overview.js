/* overview.js — 行情總覽頁 */

let ovState = {
  mainCat:      'fruit',
  selectedCrop: null,
  priceType:    'auction',
  mktType:      'auction',
  varIdx:       0,
  range:        30,
  layers:       { lastYear:false, band:false, ma:false, vol:false },
  searchQuery:  '',
  showAll:      false,
};

const ITEMS_DEFAULT = 10;

/* ── 工具 ── */
function safePrice(val) {
  if (val === null || val === undefined || isNaN(parseFloat(val))) return NA;
  return Units.convPrice(parseFloat(val));
}

function safeVol(val) {
  if (val === null || val === undefined || isNaN(parseFloat(val))) return { val: NA, unit: '' };
  return Units.convVol(parseFloat(val));
}

function safeChg(cur, prev) {
  if (cur === null || prev === null || isNaN(parseFloat(cur)) || isNaN(parseFloat(prev))) {
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
  ovState.mainCat      = cat;
  ovState.selectedCrop = null;
  ovState.varIdx       = 0;
  ovState.searchQuery  = '';
  ovState.showAll      = false;
  document.getElementById('tab-fruit').classList.toggle('active', cat === 'fruit');
  document.getElementById('tab-vege').classList.toggle('active',  cat === 'vege');
  /* 清空搜尋框 */
  const inp = document.getElementById('crop-search');
  if (inp) inp.value = '';
  buildSubPills();
  renderOverview();
  document.getElementById('detail-section').style.display = 'none';
}

/* ── 取得過濾後的作物清單 ── */
function getFilteredKeys() {
  const q    = ovState.searchQuery.trim().toLowerCase();
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  if (!q) return keys;
  return keys.filter(k => k.toLowerCase().includes(q));
}

/* ── sub pills（選中作物的快速 pill，保持不變）── */
function buildSubPills() {
  const keys = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  if (!keys.length) {
    document.getElementById('sub-pills').innerHTML =
      `<span style="font-size:0.86rem;color:var(--text-tertiary)">資料載入中，請稍後…</span>`;
    return;
  }
  /* 只顯示已選中的那一個（讓用戶知道目前選的是什麼） */
  if (ovState.selectedCrop) {
    document.getElementById('sub-pills').innerHTML =
      `<button class="cpill active" onclick="selectCrop('${ovState.selectedCrop}')">${ovState.selectedCrop}</button>
       <button class="cpill" onclick="clearCrop()" style="color:var(--text-tertiary)">✕ 清除選擇</button>`;
  } else {
    document.getElementById('sub-pills').innerHTML = '';
  }
}

function clearCrop() {
  ovState.selectedCrop = null;
  ovState.varIdx = 0;
  buildSubPills();
  renderOverview();
  document.getElementById('detail-section').style.display = 'none';
}

/* ── 搜尋 ── */
function onCropSearch(val) {
  ovState.searchQuery = val;
  ovState.showAll     = val.trim().length > 0; /* 有搜尋時顯示全部結果 */
  renderGrid();
}

/* ── 選擇作物 ── */
function selectCrop(key) {
  if (ovState.selectedCrop === key) {
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
  const {val:vv,unit:vu} = safeVol(totalVol);
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

/* ── 漲跌排行 ── */
function renderRankings() {
  const keys  = Object.keys(CROP_DATA).filter(k => CROP_DATA[k].cat === ovState.mainCat);
  const items = keys.map(k => {
    const avg = getCropAvgA(k), prev = getCropPrevA(k);
    const pct = avg!==null&&prev!==null&&prev!==0 ? (avg-prev)/prev*100 : null;
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

/* ── 商品卡片網格（含搜尋 + 查看更多）── */
function renderGrid() {
  const catLabel = ovState.mainCat === 'fruit' ? '水果' : '蔬菜';
  document.getElementById('grid-title').innerHTML =
    `${catLabel}總覽 <span class="card-title-sub">點擊商品查看詳情</span>`;

  const allKeys      = getFilteredKeys();
  const hasSearch    = ovState.searchQuery.trim().length > 0;
  const showAll      = ovState.showAll || hasSearch;
  const displayKeys  = showAll ? allKeys : allKeys.slice(0, ITEMS_DEFAULT);
  const remaining    = allKeys.length - ITEMS_DEFAULT;
  const pl           = Units.priceLabel();

  /* 搜尋框 */
  const searchHtml = `
    <div style="margin-bottom:10px;position:relative">
      <input
        id="crop-search"
        type="text"
        placeholder="搜尋${catLabel}名稱…"
        value="${escHtml(ovState.searchQuery)}"
        oninput="onCropSearch(this.value)"
        style="width:100%;height:34px;padding:0 10px 0 32px;font-size:0.86rem;
               border:0.5px solid var(--border-strong);border-radius:var(--radius-sm);
               background:var(--bg-card);color:var(--text-primary);outline:none;font-family:var(--font)">
      <svg viewBox="0 0 20 20" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);
        width:14px;height:14px;fill:none;stroke:var(--text-tertiary);stroke-width:2;pointer-events:none">
        <circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/>
      </svg>
    </div>`;

  if (!allKeys.length) {
    document.getElementById('overview-grid').outerHTML =
      `<div id="overview-grid">${searchHtml}
        <div style="font-size:0.86rem;color:var(--text-tertiary);padding:12px 0">
          ${hasSearch ? `找不到「${escHtml(ovState.searchQuery)}」，請換個關鍵字` : '資料尚未更新，等待每日自動更新（每日早上 6:00）'}
        </div>
      </div>`;
    return;
  }

  const cardsHtml = displayKeys.map(key => {
    const avg = getCropAvgA(key), prev = getCropPrevA(key), vol = getCropTotalVolA(key);
    const chg = safeChg(avg, prev);
    const {val:vv, unit:vu} = safeVol(vol);
    const pd  = safePrice(avg);
    const sel = key === ovState.selectedCrop ? 'selected' : '';
    return `<div class="crop-card ${sel}" onclick="selectCrop('${key}')">
      <div class="crop-card-name">${key}</div>
      <div><span class="crop-card-price">${pd}</span><span class="crop-card-unit">${pd!==NA?pl:''}</span></div>
      <div class="crop-card-chg ${chg.cls}">${chg.arrow} ${chg.text}</div>
      <div class="crop-card-vol">${vv!==NA?`成交 ${vv} ${vu}`:'成交量 N/A'}</div>
    </div>`;
  }).join('');

  /* 查看更多 / 收起 按鈕 */
  let moreHtml = '';
  if (!hasSearch) {
    if (!showAll && remaining > 0) {
      moreHtml = `
        <div style="grid-column:1/-1;text-align:center;padding-top:4px">
          <button onclick="toggleShowAll()" style="
            font-size:0.86rem;padding:6px 20px;
            border:0.5px solid var(--border-strong);border-radius:20px;
            color:var(--text-secondary);background:var(--bg-card);cursor:pointer;
            transition:all 0.12s">
            查看更多（還有 ${remaining} 項）
          </button>
        </div>`;
    } else if (showAll && allKeys.length > ITEMS_DEFAULT) {
      moreHtml = `
        <div style="grid-column:1/-1;text-align:center;padding-top:4px">
          <button onclick="toggleShowAll()" style="
            font-size:0.86rem;padding:6px 20px;
            border:0.5px solid var(--border-strong);border-radius:20px;
            color:var(--text-secondary);background:var(--bg-card);cursor:pointer;
            transition:all 0.12s">
            收起
          </button>
        </div>`;
    }
  }

  /* 用 outerHTML 替換，保留 id */
  const el = document.getElementById('overview-grid');
  el.innerHTML = searchHtml +
    `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px">
      ${cardsHtml}${moreHtml}
    </div>`;

  /* 還原 focus 到搜尋框 */
  if (hasSearch) {
    const inp = document.getElementById('crop-search');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
}

function toggleShowAll() {
  ovState.showAll = !ovState.showAll;
  renderGrid();
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  const ad=safePrice(avgKg),hd=safePrice(hiKg),ld=safePrice(loKg);
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
    const a=isA?vv2.avgA:vv2.avgW,pr=isA?vv2.prevA:vv2.prevW;
    const h=isA?vv2.hiA:vv2.hiW,l=isA?vv2.loA:vv2.loW,vol=isA?vv2.volA:vv2.volW;
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

function renderTrendChart() {
  if (!ovState.selectedCrop) return;
  const crop=CROP_DATA[ovState.selectedCrop];
  if (!crop) return;
  const hist=crop.historyPoints||[];
  const slice=hist.slice(-ovState.range);
  if (slice.length<2) {
    document.getElementById('trend-legend').innerHTML=
      `<span style="font-size:0.79rem;color:var(--text-tertiary)">歷史資料不足（N/A）</span>`;
    return;
  }
  const labels=slice.map(d=>{const p=d.date.split('.');return p.length>=3?`${parseInt(p[1])}/${parseInt(p[2])}`:d.date;});
  const thisY=slice.map(d=>d.avg!==null?Units.convPrice(d.avg):null);
  const volD=slice.map(d=>d.vol||0);
  Charts.drawTrendRaw({canvasId:'trendC',labels,thisY,volData:volD,priceType:ovState.priceType,layers:ovState.layers});
  if (ovState.layers.vol) Charts.drawVolRaw({canvasId:'volC',labels,volData:volD});
  const mainColor=ovState.priceType==='auction'?'#854F0B':'#185FA5';
  const pl=Units.priceLabel();
  document.getElementById('trend-legend').innerHTML=
    `<span class="legend-item"><span class="legend-swatch" style="background:${mainColor}"></span>${ovState.priceType==='auction'?'拍賣均價':'行口均價'}（${pl}）— 農業部實際資料</span>`;
  document.getElementById('season-note').textContent=crop.season;
}

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
    const rC=REGION_COLOR[m.region]||'#888',rB=REGION_BG[m.region]||'#eee';
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

document.addEventListener('DOMContentLoaded', () => {
  setPriceType('auction');
  buildSubPills();
  window.DATA_READY.then(() => {
    buildSubPills();
    renderOverview();
  });
  setTimeout(()=>{ const f=document.getElementById('loading-fill'); if(f) f.classList.remove('active'); }, 2000);
});
