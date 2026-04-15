/* news.js — 農業新聞模組
 *
 * 優先從 data/news.json 讀取（由 GitHub Actions 每日預先抓好）。
 * 若找不到該作物的快取，才即時呼叫 Claude API 搜尋。
 * 每則新聞點擊後在新分頁開啟原文連結。
 */

/* 快取（session 內避免重複呼叫） */
const _newsCache = {};
let   _newsJson  = null;   /* data/news.json 的內容 */

/* ── 從 data/news.json 讀取預先抓好的新聞 ── */
async function loadNewsJson() {
  if (_newsJson !== null) return _newsJson;
  try {
    const res  = await fetch('data/news.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _newsJson = await res.json();
    return _newsJson;
  } catch {
    _newsJson = { news: {} };
    return _newsJson;
  }
}

/**
 * 取得指定作物的新聞並渲染到容器
 * @param {string} cropName    作物名稱，例如「鳳梨」
 * @param {string} containerId 容器元素 ID
 */
async function fetchNews(cropName, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  /* 顯示 loading */
  container.innerHTML = `
    <div class="news-loading">
      <div class="news-spinner"></div>
      搜尋「${cropName}」最新農業新聞…
    </div>`;

  /* 有 session 快取就直接渲染 */
  if (_newsCache[cropName]) {
    renderNews(_newsCache[cropName], container, cropName);
    return;
  }

  /* 先嘗試從 data/news.json 讀取 */
  const stored = await loadNewsJson();
  if (stored.news && stored.news[cropName] && stored.news[cropName].length > 0) {
    _newsCache[cropName] = stored.news[cropName];
    renderNews(stored.news[cropName], container, cropName);
    return;
  }

  /* news.json 裡沒有該作物，改用即時 Claude API */
  try {
    const prompt = `你是台灣農業新聞搜尋助手。
使用 web_search 搜尋：
1. "台灣 ${cropName} 批發 價格 2025"
2. "台灣 ${cropName} 農業 新聞 2025"

整理出最多 4 則真實存在的新聞，每則包含：
- title: 新聞標題（來自真實搜尋結果，不可自行創作）
- url: 原文連結（必須是真實的 https:// 網址）
- source: 來源名稱
- date: 發布日期（YYYY-MM-DD）或 null
- tag: price / weather / policy / market 之一

只回傳 JSON 陣列，不要任何其他文字：
[{"title":"...","url":"https://...","source":"...","date":"2025-04-15","tag":"price"}]`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: '只回傳 JSON 陣列，不回傳任何其他文字。',
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!res.ok) throw new Error('API HTTP ' + res.status);
    const data  = await res.json();
    const text  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('no JSON');

    const articles = JSON.parse(match[0]).filter(a => a?.title && a?.url?.startsWith('http'));
    if (!articles.length) throw new Error('empty');

    _newsCache[cropName] = articles;
    renderNews(articles, container, cropName);

  } catch (err) {
    console.warn('[news]', cropName, err.message);
    container.innerHTML = `
      <div class="news-error">
        目前無法取得「${cropName}」的即時新聞。<br>
        請前往
        <a href="https://www.agriharvest.tw/" target="_blank" rel="noopener" style="color:var(--blue-text)">農傳媒</a> 或
        <a href="https://www.afa.gov.tw/cht/index.php?code=list&ids=307" target="_blank" rel="noopener" style="color:var(--blue-text)">農糧署新聞</a>
        查看最新資訊。
      </div>`;
  }
}

/* ── 渲染新聞列表 ── */
const TAG_LABEL = { price:'報價', weather:'天氣', policy:'政策', market:'市場' };
const TAG_CLASS = { price:'tag-price', weather:'tag-weather', policy:'tag-policy', market:'tag-market' };

function renderNews(articles, container, cropName) {
  if (!articles?.length) {
    container.innerHTML = `<div class="news-error">暫無「${cropName}」相關新聞</div>`;
    return;
  }

  container.innerHTML = articles.map(a => {
    const tag      = a.tag || 'market';
    const tagLabel = TAG_LABEL[tag] || '新聞';
    const tagCls   = TAG_CLASS[tag] || 'tag-market';
    const dateStr  = a.date ? formatDate(a.date) : '';
    const meta     = [a.source, dateStr].filter(Boolean).map(esc).join(' · ');

    return `<div class="news-item">
      <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">
        <span class="news-tag ${tagCls}">${tagLabel}</span>
        <div class="news-title">${esc(a.title)}</div>
        <div class="news-meta">${meta}<span class="news-source-badge">外部連結↗</span></div>
      </a>
    </div>`;
  }).join('');
}

function formatDate(str) {
  try {
    const d = new Date(str);
    return `${d.getMonth()+1}/${d.getDate()}`;
  } catch { return str; }
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.fetchNews = fetchNews;
