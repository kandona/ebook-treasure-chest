/* Relative paths keep each fork's catalogue independent. */
const PAGE_SIZE = 12;
const MAX_RESULTS = 100;
let books = [], browseBooks = [], selectedCategory = '', visibleCount = PAGE_SIZE;
let loadState = 'loading', searchTimeout, composing = false;
const input = document.getElementById('search-input');
const resultsBox = document.getElementById('search-results');
const resultCount = document.getElementById('result-count');
const resultsTitle = document.getElementById('results-title');
const clearButton = document.getElementById('clear-search');
const moreButton = document.getElementById('show-more');
const notice = document.getElementById('data-notice');
const filters = document.getElementById('category-filters');

function node(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function keywords() {
  return input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
}
function searchBooks(tokens) {
  return books.filter(book => {
    if (selectedCategory && book.category !== selectedCategory) return false;
    const fields = [book.title, book.author, book.category].map(value => String(value || '').toLowerCase());
    return tokens.every(token => fields.some(field => field.includes(token)));
  });
}
function appendHighlighted(element, value, tokens) {
  const text = String(value || '');
  if (!tokens.length) { element.textContent = text; return; }
  const escaped = [...new Set(tokens)].sort((a, b) => b.length - a.length)
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(escaped.join('|'), 'gi');
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    element.append(document.createTextNode(text.slice(cursor, match.index)));
    element.append(node('mark', '', match[0]));
    cursor = match.index + match[0].length;
  }
  element.append(document.createTextNode(text.slice(cursor)));
}
function safeDownloadUrl(link) {
  if (typeof link !== 'string' || !link.trim()) return null;
  try {
    const url = new URL(link, document.baseURI);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function bookCard(book, index, tokens) {
  const card = node('article', 'book-card');
  const top = node('div', 'card-top');
  const category = node('span', 'book-category');
  appendHighlighted(category, book.category || '未分类', tokens);
  top.append(category, node('span', 'book-number', String(index + 1).padStart(2, '0')));
  const title = node('h3', 'book-title');
  title.title = String(book.title || '未命名书籍');
  appendHighlighted(title, book.title || '未命名书籍', tokens);
  const author = node('p', 'book-author');
  author.title = String(book.author || '作者未知');
  appendHighlighted(author, book.author || '作者未知', tokens);
  const bottom = node('div', 'card-bottom');
  const formats = Array.isArray(book.formats) ? book.formats.map(String).join(' / ').toUpperCase() : '';
  bottom.append(node('span', 'book-formats', formats || '格式未标注'));
  const url = safeDownloadUrl(book.link);
  if (url) {
    const download = node('a', 'download-link', '前往下载');
    download.href = url;
    download.target = '_blank';
    download.rel = 'noopener noreferrer';
    download.setAttribute('aria-label', `下载《${book.title || '未命名书籍'}》（新窗口打开外部网盘）`);
    const arrow = node('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    download.append(arrow);
    bottom.append(download);
  } else bottom.append(node('span', 'download-unavailable', '暂无下载链接'));
  card.append(top, title, author, bottom);
  return card;
}
function showState(title, description, action) {
  resultsBox.replaceChildren();
  const panel = node('div', 'state-panel');
  panel.append(node('h3', '', title), node('p', '', description));
  if (action) {
    const button = node('button', 'retry-button', action.label);
    button.type = 'button';
    button.addEventListener('click', action.run);
    panel.append(button);
  }
  resultsBox.append(panel);
  moreButton.hidden = true;
}
function renderResults() {
  clearButton.hidden = input.value.length === 0;
  if (loadState !== 'ready') return;
  const tokens = keywords();
  const isBrowsing = !tokens.length && !selectedCategory;
  const matches = isBrowsing ? browseBooks : searchBooks(tokens);
  const limit = tokens.length ? MAX_RESULTS : matches.length;
  const shown = Math.min(visibleCount, matches.length, limit);
  resultsTitle.textContent = tokens.length ? '搜索结果' : selectedCategory ? `${selectedCategory}书籍` : '随便逛逛';
  if (!matches.length) {
    resultCount.textContent = '0 条结果';
    showState('暂时没有找到', selectedCategory ? '试试其他关键词，或清除分类后搜索。' : '试试更短的书名、作者，或换一个关键词。', {label: '清除筛选', run: resetSearch});
    return;
  }
  resultCount.textContent = isBrowsing ? `先看 ${shown} 条 · 搜索可查全部书籍` : `找到 ${matches.length.toLocaleString()} 条 · 已展示 ${shown}${matches.length > limit ? `（最多 ${limit} 条）` : ''}`;
  const fragment = document.createDocumentFragment();
  matches.slice(0, shown).forEach((book, index) => fragment.append(bookCard(book, index, tokens)));
  resultsBox.replaceChildren(fragment);
  moreButton.hidden = shown >= Math.min(matches.length, limit);
}
function refreshSearch() { clearTimeout(searchTimeout); visibleCount = PAGE_SIZE; renderResults(); }
function resetSearch() { input.value = ''; selectedCategory = ''; updateFilters(); refreshSearch(); input.focus(); }
function updateFilters() {
  filters.querySelectorAll('button[data-category]').forEach(button => {
    const active = button.dataset.category === selectedCategory;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function prepareCatalogue() {
  const categories = new Map();
  books.forEach(book => {
    const category = String(book.category || '未分类');
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(book);
  });
  const popular = [...categories.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  filters.replaceChildren();
  for (const category of ['', ...popular.map(([name]) => name)]) {
    const button = node('button', 'category-button', category || '全部');
    button.type = 'button'; button.dataset.category = category; filters.append(button);
  }
  updateFilters();
  browseBooks = [];
  const seen = new Set();
  // A varied browsing shelf; every record is still searchable.
  for (let row = 0; row < PAGE_SIZE; row++) {
    for (const [, entries] of popular) {
      const book = entries[row];
      if (!book) continue;
      const key = JSON.stringify([book.title, book.author, book.link]);
      if (!seen.has(key)) { seen.add(key); browseBooks.push(book); }
    }
  }
  document.getElementById('total-books').textContent = books.length.toLocaleString();
  document.getElementById('total-categories').textContent = categories.size.toLocaleString();
}
async function loadBooks() {
  loadState = 'loading'; notice.hidden = true;
  resultsBox.setAttribute('aria-busy', 'true');
  resultCount.textContent = '正在加载书籍目录…';
  showState('正在打开书库', '首次访问需要加载目录，请稍候。');
  for (const source of ['all-books.json', 'books.json']) {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || !data.every(book => book && typeof book === 'object' && !Array.isArray(book))) throw new Error('书籍目录格式不正确');
      books = data; loadState = 'ready';
      resultsBox.setAttribute('aria-busy', 'false');
      prepareCatalogue();
      if (source === 'books.json') { notice.textContent = '主目录暂时无法加载，当前显示备用目录。'; notice.hidden = false; }
      if (!books.length) {
        resultCount.textContent = '0 条书籍记录';
        showState('书库暂时为空', '目录更新后，刷新页面即可查看。');
      } else renderResults();
      return;
    } catch (error) { console.warn(`无法加载 ${source}`, error); }
  }
  loadState = 'error'; resultsBox.setAttribute('aria-busy', 'false');
  resultCount.textContent = '目录加载失败';
  showState('书库暂时没有打开', '请检查网络连接，然后重试。', {label: '重新加载', run: loadBooks});
}
input.addEventListener('compositionstart', () => { composing = true; clearTimeout(searchTimeout); });
input.addEventListener('compositionend', () => { composing = false; refreshSearch(); });
input.addEventListener('input', () => {
  clearButton.hidden = input.value.length === 0; clearTimeout(searchTimeout);
  if (!composing) searchTimeout = setTimeout(refreshSearch, 300);
});
input.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.isComposing) resetSearch(); });
document.getElementById('search-form').addEventListener('submit', event => { event.preventDefault(); if (!composing) refreshSearch(); });
clearButton.addEventListener('click', () => { input.value = ''; refreshSearch(); input.focus(); });
filters.addEventListener('click', event => {
  const button = event.target.closest('button[data-category]');
  if (button) { selectedCategory = button.dataset.category; updateFilters(); refreshSearch(); }
});
moreButton.addEventListener('click', () => { visibleCount += PAGE_SIZE; renderResults(); });
loadBooks();
