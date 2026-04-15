/* charts.js — 圖表模組（依賴 Chart.js 與 units.js） */

const Charts = (() => {

  let trendChart = null;
  let volChart   = null;
  let peerChart  = null;

  /* ── 工具 ── */
  function getMA(data, w) {
    return data.map((v, i) => {
      if (v === null) return null;
      if (i < w - 1) return null;
      const slice = data.slice(i - w + 1, i + 1).filter(x => x !== null);
      if (!slice.length) return null;
      return +(slice.reduce((s, x) => s + x, 0) / slice.length).toFixed(1);
    });
  }

  /* ── drawTrendRaw：接受真實資料（labels + thisY 陣列） ── */
  function drawTrendRaw({ canvasId, labels, thisY, volData, priceType, layers }) {
    const mainColor = priceType === 'auction' ? '#854F0B' : '#185FA5';
    const fillColor = priceType === 'auction' ? 'rgba(186,117,23,0.08)' : 'rgba(24,95,165,0.08)';
    const pl = Units.priceLabel();

    const datasets = [];

    if (layers && layers.ma) {
      const ma7 = getMA(thisY, Math.min(7, thisY.length));
      datasets.push({
        label: 'MA7', data: ma7,
        borderColor: '#BA7517', borderDash: [5,3],
        backgroundColor: 'transparent', borderWidth: 1.5,
        pointRadius: 0, fill: false, tension: 0.3, spanGaps: true,
      });
    }

    datasets.push({
      label: pl, data: thisY,
      borderColor: mainColor, backgroundColor: fillColor,
      borderWidth: 2,
      pointRadius: labels.length <= 14 ? 3 : 1,
      fill: true, tension: 0.35, spanGaps: true,
    });

    if (trendChart) { trendChart.destroy(); trendChart = null; }

    trendChart = new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.y;
                return v !== null ? ` ${ctx.dataset.label}: ${v.toFixed(1)} ${pl}` : ' N/A';
              },
            },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { color: '#888', font: { size: 10 }, maxTicksLimit: 9 } },
          y: {
            grid: { color: 'rgba(128,128,128,0.08)' },
            ticks: { color: '#888', font: { size: 10 }, callback: v => v !== null ? v.toFixed(1) : '' },
            title: { display: true, text: pl, color: '#aaa', font: { size: 10 } },
          },
        },
      },
    });
  }

  /* ── drawVolRaw：接受真實成交量資料 ── */
  function drawVolRaw({ canvasId, labels, volData }) {
    const vu = Units.volLabel();
    const converted = (volData || []).map(v => {
      if (!v) return 0;
      const { raw } = Units.convVol(v);
      return raw || 0;
    });

    if (volChart) { volChart.destroy(); volChart = null; }

    volChart = new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: `成交量 (${vu})`,
          data: converted,
          backgroundColor: 'rgba(99,153,34,0.22)',
          borderColor: 'rgba(99,153,34,0.5)',
          borderWidth: 0.5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { display: false } },
          y: { grid: { color: 'rgba(128,128,128,0.07)' }, ticks: { color: '#888', font: { size: 9 }, maxTicksLimit: 2 } },
        },
      },
    });
  }

  /* ── drawTrend：模擬歷史資料（watchlist 使用，直到累積足夠真實資料）── */
  function rng(s) { const x = Math.sin(s + 1) * 10000; return x - Math.floor(x); }
  function genHistory(base, n, seed) {
    const arr = []; let v = base;
    for (let i = 0; i < n; i++) {
      v = Math.max(base * 0.45, +(v + (rng(i * 7 + seed) - 0.48) * base * 0.07).toFixed(1));
      arr.push(v);
    }
    return arr;
  }
  function getDateLabels(n) {
    const a = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      a.push((d.getMonth() + 1) + '/' + d.getDate());
    }
    return a;
  }

  function drawTrend({ canvasId, baseKg, varSeed, range, priceType, layers }) {
    if (!baseKg) return;
    const n      = range;
    const seed   = varSeed + (priceType === 'auction' ? 0 : 500);
    const labels = getDateLabels(n);
    const rawThis = genHistory(baseKg, n, seed);
    const thisY   = rawThis.map(x => Units.convPrice(x));
    drawTrendRaw({ canvasId, labels, thisY, volData: rawThis.map(()=>Math.round(500+Math.random()*5000)), priceType, layers });
  }

  function drawVol({ canvasId, n, seed }) {
    const vols   = Array.from({length:n}, (_,i) => Math.round(500 + rng(i * 31 + seed) * 8000));
    const labels = getDateLabels(n);
    drawVolRaw({ canvasId, labels, volData: vols });
  }

  /* ── 同類比較圖（watchlist 用）── */
  function drawPeer({ canvasId, peers, range }) {
    const COLORS = ['#854F0B','#185FA5','#3B6D11','#993556'];
    const DASHES = [[],[5,3],[3,2],[6,4]];
    const n      = Math.min(range, 14);
    const labels = getDateLabels(n);
    const pl     = Units.priceLabel();

    const datasets = peers.map((p, i) => {
      const raw  = p.historyPoints && p.historyPoints.length >= n
        ? p.historyPoints.slice(-n).map(d => d.avg !== null ? Units.convPrice(d.avg) : null)
        : genHistory(p.baseKg || 20, n, (p.seed || 0) + i * 200).map(x => Units.convPrice(x));
      return {
        label: p.name,
        data: raw,
        borderColor: COLORS[i], borderDash: DASHES[i],
        backgroundColor: 'transparent',
        borderWidth: i === 0 ? 2 : 1.5,
        pointRadius: n <= 14 ? (i === 0 ? 3 : 2) : 1,
        tension: 0.35, fill: false, spanGaps: true,
      };
    });

    if (peerChart) { peerChart.destroy(); peerChart = null; }

    peerChart = new Chart(document.getElementById(canvasId), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false,
            callbacks: { label: ctx => ctx.parsed.y !== null ? ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} ${pl}` : ' N/A' },
          },
        },
        scales: {
          x: { grid:{color:'rgba(128,128,128,0.08)'}, ticks:{color:'#888',font:{size:10},maxTicksLimit:7} },
          y: { grid:{color:'rgba(128,128,128,0.08)'}, ticks:{color:'#888',font:{size:10},callback:v=>v!==null?v.toFixed(0):''} },
        },
      },
    });

    return COLORS;
  }

  function destroyAll() {
    if (trendChart) { trendChart.destroy(); trendChart = null; }
    if (volChart)   { volChart.destroy();   volChart   = null; }
    if (peerChart)  { peerChart.destroy();  peerChart  = null; }
  }

  return { drawTrend, drawTrendRaw, drawVol, drawVolRaw, drawPeer, destroyAll, genHistory, getDateLabels };
})();

window.Charts = Charts;
