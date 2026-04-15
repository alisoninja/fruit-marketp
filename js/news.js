/* =====================================================
   news.js — 即時農業新聞（透過 Claude API + web_search）
   每次呼叫 fetchNews(cropName) 取得真實新聞
   點擊後開新分頁瀏覽原文
   ===================================================== */

/* 快取：避免同一作物在同一次 session 重複呼叫 */
const newsCache = {};

/**
 * 取得指定作物的農業新聞
 * @param {string} cropName  - 作物名稱，例如「鳳梨」
 * @param {string} containerId - 要渲染的 DOM id
 */
async function fetchNews(cropName, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  /* 顯示 loading */
  container.innerHTML = `
    <div class="news-loading">
      <div class="news-spinner"></div>
      正在搜尋「${cropName}」最新農業新聞…
    </div>
  `;

  /* 有快取直接渲染 */
  if (newsCache[cropName]) {
    renderNews(newsCache[cropName], container);
    return;
  }

  try {
    const prompt = `
你是一個台灣農業新聞搜尋助手。
請使用 web_search 工具，搜尋以下兩個關鍵字：
1. "${cropName} 農產品 批發 價格 2025"
2. "${cropName} 農業 新聞 台灣 2025"

從搜尋結果中整理出 4 則**真實存在**的新聞。
每則新聞必須包含：
- title: 新聞標題（來自真實搜尋結果，不可自行創作）
- url: 原文連結（必須是真實 URL）
- source: 來源名稱（例如：農傳媒、農糧署、聯合報等）
- date: 發布日期（格式：YYYY-MM-DD，若不確定請填 null）
- tag: 分類，只能是以下四種之一：price（價格行情）、weather（天氣產區）、policy（農業政策）、market（市場動態）

如果搜尋結果中找不到 4 則，就回傳實際找到的數量，**不可捏造新聞**。
若完全找不到相關新聞，回傳空陣列。

只回傳 JSON 陣列，格式如下，不要有任何其他文字：
[
  {
    "title": "標題",
    "url": "https://...",
    "source": "來源",
    "date": "2025-04-15",
    "tag": "price"
  }
]
`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: '你是農業新聞搜尋助手，只回傳 JSON，不回傳任何其他文字。',
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    if (!resp.ok) throw new Error('API error: ' + resp.status);

    const data = await resp.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    /* 從回傳文字中提取 JSON 陣列 */
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('no JSON found');

    const articles = JSON.parse(match[0]);

    /* 驗證：過濾掉沒有 url 或 title 的項目 */
    const valid = articles.filter(a => a && a.title && a.url && a.url.startsWith('http'));

    if (valid.length === 0) throw new Error('no valid articles');

    newsCache[cropName] = valid;
    renderNews(valid, container);

  } catch (err) {
    console.warn('[news] fetchNews failed:', err);
    container.innerHTML = `
      <div class="news-error">
        目前無法取得「${cropName}」的即時新聞。<br>
        請稍後再試，或前往
        <a href="https://www.agriharvest.tw/" target="_blank" rel="noopener"
          style="color:var(--blue-text)">農傳媒</a>、
        <a href="https://www.afa.gov.tw/cht/index.php?code=list&ids=307" target="_blank" rel="noopener"
          style="color:var(--blue-text)">農糧署新聞</a>
        查看最新資訊。
      </div>
    `;
  }
}

const TAG_LABEL = { price:'報價', weather:'天氣', policy:'政策', market:'市場' };
const TAG_CLASS = { price:'tag-price', weather:'tag-weather', policy:'tag-policy', market:'tag-market' };

function renderNews(articles, container) {
  if (!articles || articles.length === 0) {
    container.innerHTML = '<div class="news-error">暫無相關新聞</div>';
    return;
  }

  container.innerHTML = articles.map(a => {
    const tag      = a.tag || 'market';
    const tagLabel = TAG_LABEL[tag] || '新聞';
    const tagCls   = TAG_CLASS[tag] || 'tag-market';
    const dateStr  = a.date ? formatNewsDate(a.date) : '';
    const metaParts = [a.source, dateStr].filter(Boolean);

    return `
      <div class="news-item">
        <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">
          <span class="news-tag ${tagCls}">${tagLabel}</span>
          <div class="news-title">${escapeHtml(a.title)}</div>
          <div class="news-meta">
            ${metaParts.map(p => escapeHtml(p)).join(' · ')}
            <span class="news-source-badge">外部連結</span>
          </div>
        </a>
      </div>
    `;
  }).join('');
}

function formatNewsDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d   = new Date(dateStr);
    const mo  = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${mo}/${day}`;
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.fetchNews = fetchNews;
