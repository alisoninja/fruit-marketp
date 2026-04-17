/* news.js
 * 新聞模組：
 * - 優先讀 data/news.json（由 GitHub Actions 預先抓好）
 * - 若無資料或 API 餘額不足，隱藏新聞卡片
 * - 有新聞才顯示，點擊標題開新分頁
 */

const _newsCache = {};
let   _newsJson  = null;

async function loadNewsJson() {
  if (_newsJson !== null) return _newsJson;
  try {
    const res = await fetch('data/news.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _newsJson = await res.json();
  } catch {
    _newsJson = { news: {} };
  }
  return _newsJson;
}

/**
 * 取得新聞並渲染。若無新聞則隱藏包覆的卡片。
 * @param {string} cropName     作物名稱
 * @param {string} containerId  新聞列表的容器 id（例如 'news-list'）
 * @param {string} cardId       包覆整個新聞卡片的容器 id（例如 'news-card'）
 *                              若有內容則顯示，無內容則隱藏整張卡片
 */
async function fetchNews(cropName, containerId, cardId) {
  const container = document.getElementById(containerId);
  const card      = cardId ? document.getElementById(cardId) : null;
  if (!container) return;

  /* 先隱藏卡片，等確認有資料再顯示 */
  if (card) card.style.display = 'none';

  /* session 快取 */
  if (_newsCache[cropName]) {
    if (_newsCache[cropName].length > 0) {
      if (card) card.style.display = '';
      renderNews(_newsCache[cropName], container);
    }
    return;
  }

  /* 讀 data/news.json，只保留最近 7 天 */
  const stored  = await loadNewsJson();
  const saved   = stored?.news?.[cropName];
  const cutoff  = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent  = (saved || []).filter(a => {
    if (!a.date) return false;
    try { return new Date(a.date).getTime() >= cutoff; } catch { return false; }
  });

  if (recent.length > 0) {
    _newsCache[cropName] = recent;
    if (card) card.style.display = '';
    renderNews(recent, container);
    return;
  }

  /* 無資料或全超過一週 → 卡片保持隱藏 */
  _newsCache[cropName] = [];
}

/* ── 渲染 ── */
const TAG_LABEL = { price:'報價', weather:'天氣', policy:'政策', market:'市場' };
const TAG_CLASS = { price:'tag-price', weather:'tag-weather', policy:'tag-policy', market:'tag-market' };

function renderNews(articles, container) {
  container.innerHTML = articles.map(a => {
    const tag  = a.tag || 'market';
    const date = a.date ? formatDate(a.date) : '';
    const meta = [a.source, date].filter(Boolean).map(esc).join(' · ');
    return `<div class="news-item">
      <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">
        <span class="news-tag ${TAG_CLASS[tag]||'tag-market'}">${TAG_LABEL[tag]||'新聞'}</span>
        <div class="news-title">${esc(a.title)}</div>
        <div class="news-meta">${meta}<span class="news-source-badge">外部連結↗</span></div>
      </a>
    </div>`;
  }).join('');
}

function formatDate(s) {
  try { const d=new Date(s); return `${d.getMonth()+1}/${d.getDate()}`; } catch { return s; }
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.fetchNews = fetchNews;
