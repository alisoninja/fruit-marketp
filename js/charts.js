/* =====================================================
   charts.js — 圖表模組（依賴 Chart.js 與 units.js）
   ===================================================== */

   const Charts = (() => {

    let trendChart = null;
    let volChart   = null;
    let peerChart  = null;
  
    /* ---- 亂數產生器（用固定 seed 模擬歷史資料） ---- */
    function rng(s) {
      const x = Math.sin(s + 1) * 10000;
      return x - Math.floor(x);
    }
  
    function genHistory(baseKg, n, seed) {
      const arr = [];
      let v = baseKg;
      for (let i = 0; i < n; i++) {
        v = Math.max(baseKg * 0.45, +(v + (rng(i * 7 + seed) - 0.48) * baseKg * 0.07).toFixed(1));
        arr.push(v);
      }
      return arr; // 單位：元/公斤
    }
  
    function getDateLabels(n) {
      const labels = [];
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push((d.getMonth() + 1) + '/' + d.getDate());
      }
      return labels;
    }
  
    function getMA(data, w) {
      return data.map((v, i) => {
        if (i < w - 1) return null;
        const slice = data.slice(i - w + 1, i + 1);
        return +(slice.reduce((s, x) => s + x, 0) / w).toFixed(1);
      });
    }
  
    /* ---- 趨勢圖 ---- */
    function drawTrend({ canvasId, baseKg, varSeed, range, priceType, layers }) {
      const n      = range;
      const seed   = varSeed + (priceType === 'auction' ? 0 : 500);
      const labels = getDateLabels(n);
  
      const rawThis = genHistory(baseKg, n, seed);
      const rawLast = genHistory(baseKg * 0.95, n, seed + 300);
  
      /* 換算成目前顯示單位 */
      const thisY  = rawThis.map(x => Units.convPrice(x));
      const lastY  = rawLast.map(x => Units.convPrice(x));
      const bandHi = thisY.map((x, i) => +(x * (1.08 + rng(i + 10) * 0.06)).toFixed(1));
      const bandLo = thisY.map((x, i) => +(x * (0.88 - rng(i + 20) * 0.05)).toFixed(1));
      const ma7    = getMA(thisY, Math.min(7, n));
  
      const mainColor = priceType === 'auction' ? '#854F0B' : '#185FA5';
      const fillColor = priceType === 'auction' ? 'rgba(186,117,23,0.08)' : 'rgba(24,95,165,0.08)';
      const pl = Units.priceLabel();
  
      const datasets = [];
  
      if (layers.band) {
        datasets.push({
          label: '帶上', data: bandHi,
          borderColor: 'transparent', backgroundColor: 'rgba(99,153,34,0.12)',
          fill: '+1', pointRadius: 0, tension: 0.3,
        });
        datasets.push({
          label: '帶下', data: bandLo,
          borderColor: 'transparent', backgroundColor: 'rgba(99,153,34,0.12)',
          fill: false, pointRadius: 0, tension: 0.3,
        });
      }
  
      if (layers.lastYear) {
        datasets.push({
          label: '去年同期', data: lastY,
          borderColor: '#639922', borderDash: [4, 3],
          backgroundColor: 'transparent', borderWidth: 1.5,
          pointRadius: 0, fill: false, tension: 0.3,
        });
      }
  
      datasets.push({
        label: pl, data: thisY,
        borderColor: mainColor, backgroundColor: fillColor,
        borderWidth: 2, pointRadius: n <= 14 ? 3 : 1,
        fill: !layers.band, tension: 0.35,
      });
  
      if (layers.ma) {
        datasets.push({
          label: 'MA7', data: ma7,
          borderColor: '#BA7517', borderDash: [5, 3],
          backgroundColor: 'transparent', borderWidth: 1.5,
          pointRadius: 0, fill: false, tension: 0.3,
        });
      }
  
      if (trendChart) { trendChart.destroy(); trendChart = null; }
  
      trendChart = new Chart(document.getElementById(canvasId), {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${typeof ctx.parsed.y === 'number' ? ctx.parsed.y.toFixed(1) : '—'} ${pl}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(128,128,128,0.08)' },
              ticks: { color: '#888', font: { size: 10 }, maxTicksLimit: 9 },
            },
            y: {
              grid: { color: 'rgba(128,128,128,0.08)' },
              ticks: { color: '#888', font: { size: 10 }, callback: v => v.toFixed(1) },
              title: { display: true, text: pl, color: '#aaa', font: { size: 10 } },
            },
          },
        },
      });
  
      return { rawThis, rawLast }; // 回傳原始資料供 volChart 使用
    }
  
    /* ---- 交易量圖 ---- */
    function drawVol({ canvasId, n, seed }) {
      const vols = [];
      for (let i = 0; i < n; i++) {
        vols.push(Math.round(500 + rng(i * 31 + seed) * 8000));
      }
      const labels = getDateLabels(n);
      const { val: maxLabel } = Units.convVol(Math.max(...vols));
      const converted = vols.map(v => {
        const { val } = Units.convVol(v);
        return parseFloat(val.replace(/,/g, ''));
      });
  
      if (volChart) { volChart.destroy(); volChart = null; }
  
      volChart = new Chart(document.getElementById(canvasId), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: `成交量 (${Units.volLabel()})`,
            data: converted,
            backgroundColor: 'rgba(99,153,34,0.22)',
            borderColor: 'rgba(99,153,34,0.5)',
            borderWidth: 0.5,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { display: false } },
            y: {
              grid: { color: 'rgba(128,128,128,0.07)' },
              ticks: { color: '#888', font: { size: 9 }, maxTicksLimit: 2 },
            },
          },
        },
      });
    }
  
    /* ---- 同類產品比較圖 ---- */
    function drawPeer({ canvasId, peers, range }) {
      const COLORS = ['#854F0B', '#185FA5', '#3B6D11', '#993556'];
      const DASHES = [[], [5, 3], [3, 2], [6, 4]];
      const n      = Math.min(range, 14);
      const labels = getDateLabels(n);
      const pl     = Units.priceLabel();
  
      const datasets = peers.map((p, i) => {
        const raw  = genHistory(p.baseKg, n, p.seed);
        const data = raw.map(x => Units.convPrice(x));
        return {
          label: p.name,
          data,
          borderColor: COLORS[i],
          borderDash: DASHES[i],
          backgroundColor: 'transparent',
          borderWidth: i === 0 ? 2 : 1.5,
          pointRadius: n <= 14 ? (i === 0 ? 3 : 2) : 1,
          tension: 0.35,
          fill: false,
        };
      });
  
      if (peerChart) { peerChart.destroy(); peerChart = null; }
  
      peerChart = new Chart(document.getElementById(canvasId), {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} ${pl}`,
              },
            },
          },
          scales: {
            x: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { color: '#888', font: { size: 10 }, maxTicksLimit: 7 } },
            y: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { color: '#888', font: { size: 10 }, callback: v => v.toFixed(0) } },
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
  
    return { drawTrend, drawVol, drawPeer, destroyAll, genHistory, getDateLabels };
  
  })();
  
  window.Charts = Charts;