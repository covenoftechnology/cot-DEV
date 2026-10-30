export function getAdminCenterHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Coven Article Center — Local Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg-dark: #0b090e;
      --bg-panel: #131019;
      --bg-card: #181421;
      --bg-card-hover: #1e192a;
      --border-subtle: rgba(216, 181, 107, 0.16);
      --border-hover: rgba(216, 181, 107, 0.35);
      --border-focus: rgba(216, 181, 107, 0.6);
      --gold-primary: #d8b56b;
      --gold-bright: #f0d38d;
      --gold-dim: rgba(216, 181, 107, 0.12);
      --purple-primary: #9d4edd;
      --purple-bright: #c45aff;
      --purple-dim: rgba(157, 78, 221, 0.15);
      --text-bright: #f7f3eb;
      --text-main: #c5b9a8;
      --text-muted: #8a7e70;
      --status-pub: #52e8a5;
      --status-pub-bg: rgba(82, 232, 165, 0.12);
      --status-unpub: #e09f3e;
      --status-unpub-bg: rgba(224, 159, 62, 0.12);
      --status-draft: #c45aff;
      --status-draft-bg: rgba(196, 90, 255, 0.12);
      --danger: #ff5252;
      --danger-bg: rgba(255, 82, 82, 0.12);
      --font-display: 'Cinzel', serif;
      --font-body: 'EB Garamond', Georgia, serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--bg-dark);
      background-image: 
        radial-gradient(ellipse at 50% 0%, rgba(157, 78, 221, 0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(216, 181, 107, 0.04) 0%, transparent 50%);
      color: var(--text-main);
      font-family: var(--font-body);
      font-size: 16px;
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top sticky header */
    .admin-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(19, 16, 25, 0.94);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .admin-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      text-decoration: none;
    }

    .admin-brand-icon {
      font-size: 20px;
      color: var(--gold-bright);
      text-shadow: 0 0 12px rgba(216, 181, 107, 0.5);
    }

    .admin-brand-title {
      font-family: var(--font-display);
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.06em;
      background: linear-gradient(135deg, var(--gold-bright), var(--gold-primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
    }

    .admin-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(216, 181, 107, 0.1);
      border: 1px solid rgba(216, 181, 107, 0.25);
      color: var(--gold-bright);
    }

    .admin-top-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Buttons */
    .btn {
      font-family: var(--font-display);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed !important;
      pointer-events: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #d8b56b, #b89347);
      color: #0b090e;
      border-color: rgba(216, 181, 107, 0.4);
      box-shadow: 0 2px 8px rgba(216, 181, 107, 0.2);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #f0d38d, #c5a054);
      box-shadow: 0 4px 14px rgba(216, 181, 107, 0.35);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(24, 20, 33, 0.9);
      color: var(--text-bright);
      border: 1px solid var(--border-subtle);
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(30, 25, 42, 0.95);
      border-color: var(--border-hover);
      color: var(--gold-bright);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-main);
      border: 1px solid rgba(216, 181, 107, 0.14);
    }

    .btn-ghost:hover:not(:disabled) {
      background: rgba(216, 181, 107, 0.06);
      border-color: rgba(216, 181, 107, 0.3);
      color: var(--text-bright);
    }

    .btn-danger {
      background: rgba(255, 82, 82, 0.1);
      color: #ff7676;
      border: 1px solid rgba(255, 82, 82, 0.28);
    }

    .btn-danger:hover:not(:disabled) {
      background: rgba(255, 82, 82, 0.2);
      border-color: rgba(255, 82, 82, 0.5);
      color: #ff9e9e;
    }

    .btn-sm {
      font-size: 11px;
      padding: 6px 12px;
    }

    /* Main Container */
    .admin-container {
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 36px 24px 60px;
      flex: 1;
    }

    /* Subheader with title & metrics */
    .admin-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 28px;
      gap: 20px;
      flex-wrap: wrap;
    }

    .admin-heading h1 {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--gold-bright);
      margin-bottom: 6px;
    }

    .admin-heading p {
      font-size: 15px;
      color: var(--text-muted);
    }

    .admin-metrics {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .metric-pill {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .metric-pill .label {
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-pill .val {
      font-weight: 600;
      font-size: 13px;
    }

    .metric-pill.metric-pub .val { color: var(--status-pub); }
    .metric-pill.metric-unpub .val { color: var(--status-unpub); }
    .metric-pill.metric-drafts .val { color: var(--status-draft); }

    /* Filters & Search bar */
    .admin-controls-bar {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .admin-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .tab-btn {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 8px 14px;
      border-radius: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-bright);
      background: rgba(216, 181, 107, 0.05);
    }

    .tab-btn.active {
      color: var(--gold-bright);
      background: var(--bg-card);
      border-color: rgba(216, 181, 107, 0.3);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    .search-wrapper {
      position: relative;
      min-width: 260px;
      flex: 1;
      max-width: 360px;
    }

    .search-input {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 5px;
      padding: 8px 14px 8px 34px;
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--text-bright);
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 1px rgba(216, 181, 107, 0.2);
    }

    .search-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 13px;
      color: var(--text-muted);
      pointer-events: none;
    }

    /* Cards Grid */
    .articles-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .article-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      transition: all 0.2s ease;
      position: relative;
    }

    .article-card:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    }

    .article-card-info {
      flex: 1;
      min-width: 0;
    }

    .article-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }

    .article-title {
      font-family: var(--font-display);
      font-size: 17px;
      font-weight: 700;
      color: var(--gold-bright);
      text-decoration: none;
      transition: color 0.2s;
      word-break: break-word;
    }

    .article-title:hover {
      color: #fff;
    }

    /* Status Badges */
    .status-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }

    .status-published {
      background: var(--status-pub-bg);
      color: var(--status-pub);
      border: 1px solid rgba(82, 232, 165, 0.3);
    }

    .status-unpublished {
      background: var(--status-unpub-bg);
      color: var(--status-unpub);
      border: 1px solid rgba(224, 159, 62, 0.3);
    }

    .status-working-draft {
      background: var(--status-draft-bg);
      color: var(--status-draft);
      border: 1px solid rgba(196, 90, 255, 0.3);
    }

    .status-draft-link {
      background: rgba(157, 78, 221, 0.12);
      color: var(--purple-bright);
      border: 1px solid rgba(157, 78, 221, 0.3);
    }

    .article-meta-line {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }

    .meta-cat {
      color: var(--purple-bright);
    }

    .meta-slug {
      color: var(--text-muted);
      opacity: 0.8;
    }

    .article-tags-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .tag-chip {
      font-family: var(--font-mono);
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(216, 181, 107, 0.06);
      border: 1px solid rgba(216, 181, 107, 0.12);
      color: var(--text-main);
    }

    .working-copy-notice {
      margin-top: 6px;
      font-size: 12px;
      color: var(--gold-bright);
      background: rgba(216, 181, 107, 0.08);
      border: 1px solid rgba(216, 181, 107, 0.2);
      padding: 4px 10px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .article-card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    /* Inline confirmation container */
    .inline-confirm-box {
      background: rgba(24, 20, 33, 0.98);
      border: 1px solid rgba(224, 159, 62, 0.4);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.6);
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .inline-confirm-text {
      font-size: 13px;
      color: var(--text-bright);
      line-height: 1.3;
    }

    .inline-confirm-text .subtext {
      display: block;
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .inline-confirm-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Empty state */
    .empty-state {
      background: var(--bg-panel);
      border: 1px dashed var(--border-subtle);
      border-radius: 8px;
      padding: 48px 24px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 28px;
      color: var(--gold-primary);
      margin-bottom: 12px;
      opacity: 0.6;
    }

    .empty-title {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 600;
      color: var(--text-bright);
      margin-bottom: 6px;
    }

    .empty-desc {
      font-size: 14px;
      max-width: 360px;
      margin: 0 auto 16px;
    }

    /* Toast notification */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .toast {
      background: rgba(24, 20, 33, 0.96);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border-hover);
      border-radius: 6px;
      padding: 12px 18px;
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--text-bright);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
      animation: toastIn 0.25s ease-out;
    }

    .toast-success { border-color: rgba(82, 232, 165, 0.5); }
    .toast-error { border-color: rgba(255, 82, 82, 0.5); color: #ff9e9e; }

    @keyframes toastIn {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .admin-header {
        padding: 12px 16px;
        flex-direction: column;
        align-items: stretch;
      }
      .admin-brand {
        justify-content: space-between;
      }
      .admin-top-actions {
        justify-content: flex-end;
      }
      .admin-container {
        padding: 20px 16px 40px;
      }
      .admin-title-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .article-card {
        flex-direction: column;
        align-items: stretch;
        padding: 16px;
      }
      .article-card-actions {
        justify-content: flex-start;
        border-top: 1px solid rgba(216, 181, 107, 0.08);
        padding-top: 12px;
      }
    }

    @media (max-width: 480px) {
      .admin-controls-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .search-wrapper {
        min-width: 100%;
        max-width: 100%;
      }
      .btn {
        flex: 1;
      }
    }
  </style>
</head>
<body>

  <!-- Top Sticky Header -->
  <header class="admin-header">
    <div class="admin-brand">
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="admin-brand-icon">✶</span>
        <span class="admin-brand-title">Coven Article Center</span>
      </div>
      <span class="admin-badge">Local Admin</span>
    </div>

    <div class="admin-top-actions">
      <a href="/template-preview/studio?new=1" class="btn btn-primary" id="btn-header-new">+ New Article</a>
      <a href="/template-preview/memes" class="btn btn-secondary" id="btn-meme-center">Meme Center</a>
      <a href="/template-preview/studio" class="btn btn-secondary" id="btn-back-studio">Back to Studio</a>
    </div>
  </header>

  <!-- Main Container -->
  <main class="admin-container">
    <!-- Title & Metrics Row -->
    <div class="admin-title-row">
      <div class="admin-heading">
        <h1>Created Scrolls &amp; Working Drafts</h1>
        <p>Manage persisted articles, publication lifecycles, and working drafts.</p>
      </div>

      <div class="admin-metrics">
        <div class="metric-pill metric-pub">
          <span class="label">Published</span>
          <span class="val" id="count-published">0</span>
        </div>
        <div class="metric-pill metric-unpub">
          <span class="label">Unpublished</span>
          <span class="val" id="count-unpublished">0</span>
        </div>
        <div class="metric-pill metric-drafts">
          <span class="label">Working Drafts</span>
          <span class="val" id="count-drafts">0</span>
        </div>
      </div>
    </div>

    <!-- Controls Bar: Filter Tabs & Search -->
    <div class="admin-controls-bar">
      <div class="admin-tabs" id="filter-tabs">
        <button class="tab-btn active" data-tab="all" id="tab-all">All Articles</button>
        <button class="tab-btn" data-tab="published" id="tab-published">Published</button>
        <button class="tab-btn" data-tab="unpublished" id="tab-unpublished">Unpublished</button>
        <button class="tab-btn" data-tab="drafts" id="tab-drafts">Working Drafts</button>
      </div>

      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" id="article-search" class="search-input" placeholder="Search articles..." autocomplete="off" />
      </div>
    </div>

    <!-- Articles Grid / List -->
    <div id="articles-list" class="articles-grid"></div>

    <!-- Empty State Container -->
    <div id="empty-state" class="empty-state" style="display: none;">
      <div class="empty-icon">📜</div>
      <div class="empty-title" id="empty-title">No created scrolls yet.</div>
      <div class="empty-desc" id="empty-desc">Create your first scroll in Article Studio to persist it to the Coven library.</div>
      <a href="/template-preview/studio?new=1" class="btn btn-primary btn-sm">+ Create New Scroll</a>
    </div>
  </main>

  <!-- Toast Container -->
  <div id="toast-container" class="toast-container"></div>

  <script>
    (function() {
      var state = {
        currentTab: 'all', // 'all' | 'published' | 'unpublished' | 'drafts'
        searchQuery: '',
        persistedArticles: [],
        workingDrafts: [],
        loading: true
      };

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function showToast(message, type) {
        var container = document.getElementById('toast-container');
        var toast = document.createElement('div');
        toast.className = 'toast' + (type === 'error' ? ' toast-error' : ' toast-success');
        toast.innerHTML = '<span>' + (type === 'error' ? '⚠' : '✦') + '</span><span>' + escapeHtml(message) + '</span>';
        container.appendChild(toast);
        setTimeout(function() {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(8px)';
          toast.style.transition = 'all 0.25s ease';
          setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 250);
        }, 3200);
      }

      function updateMetrics() {
        var pubCount = state.persistedArticles.filter(function(a) { return a.status === 'published'; }).length;
        var unpubCount = state.persistedArticles.filter(function(a) { return a.status !== 'published'; }).length;
        var draftsCount = state.workingDrafts.length;

        document.getElementById('count-published').textContent = pubCount;
        document.getElementById('count-unpublished').textContent = unpubCount;
        document.getElementById('count-drafts').textContent = draftsCount;
      }

      function loadData() {
        state.loading = true;
        Promise.all([
          fetch('/__article-studio/articles').then(function(r) { return r.json(); }),
          fetch('/__article-studio/drafts').then(function(r) { return r.json(); })
        ])
        .then(function(results) {
          state.persistedArticles = results[0].articles || [];
          state.workingDrafts = results[1].drafts || [];
          state.loading = false;
          updateMetrics();
          renderList();
        })
        .catch(function(err) {
          state.loading = false;
          showToast('Failed to load article inventory: ' + err.message, 'error');
          renderList();
        });
      }

      function renderList() {
        var container = document.getElementById('articles-list');
        var emptyBox = document.getElementById('empty-state');
        container.innerHTML = '';

        var query = state.searchQuery.toLowerCase().trim();

        if (state.currentTab === 'drafts') {
          // Render working drafts
          var filteredDrafts = state.workingDrafts.filter(function(d) {
            if (!query) return true;
            var t = (d.title || '').toLowerCase();
            var s = (d.slug || '').toLowerCase();
            var c = (d.category || '').toLowerCase();
            return t.includes(query) || s.includes(query) || c.includes(query);
          });

          if (filteredDrafts.length === 0) {
            emptyBox.style.display = 'block';
            if (state.workingDrafts.length === 0) {
              document.getElementById('empty-title').textContent = 'No working drafts.';
              document.getElementById('empty-desc').textContent = 'Open Article Studio to begin writing a draft.';
            } else {
              document.getElementById('empty-title').textContent = 'No matching drafts found.';
              document.getElementById('empty-desc').textContent = 'Try adjusting your search terms.';
            }
            return;
          }

          emptyBox.style.display = 'none';
          filteredDrafts.forEach(function(d) {
            container.appendChild(createDraftCard(d));
          });
          return;
        }

        // Render persisted articles
        var filteredArticles = state.persistedArticles.filter(function(a) {
          // Tab filter
          if (state.currentTab === 'published' && a.status !== 'published') return false;
          if (state.currentTab === 'unpublished' && a.status === 'published') return false;

          // Search filter
          if (!query) return true;
          var t = (a.title || '').toLowerCase();
          var s = (a.slug || '').toLowerCase();
          var c = (a.category || '').toLowerCase();
          var tagsStr = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
          return t.includes(query) || s.includes(query) || c.includes(query) || tagsStr.includes(query);
        });

        if (filteredArticles.length === 0) {
          emptyBox.style.display = 'block';
          if (state.persistedArticles.length === 0) {
            document.getElementById('empty-title').textContent = 'No created scrolls yet.';
            document.getElementById('empty-desc').textContent = 'Create your first scroll in Article Studio to persist it to the Coven library.';
          } else {
            document.getElementById('empty-title').textContent = 'No matching scrolls found.';
            document.getElementById('empty-desc').textContent = 'Try adjusting your search terms or active filter.';
          }
          return;
        }

        emptyBox.style.display = 'none';
        filteredArticles.forEach(function(article) {
          container.appendChild(createPersistedArticleCard(article));
        });
      }

      function createPersistedArticleCard(article) {
        var isPublished = article.status === 'published';
        var card = document.createElement('div');
        card.className = 'article-card';
        card.id = 'article-card-' + article.slug;

        var tagsHtml = '';
        if (Array.isArray(article.tags) && article.tags.length > 0) {
          tagsHtml = '<div class="article-tags-line">' +
            article.tags.map(function(tag) {
              return '<span class="tag-chip">' + escapeHtml(tag) + '</span>';
            }).join('') +
          '</div>';
        }

        var draftBadgeHtml = '';
        if (article.hasWorkingDraft) {
          draftBadgeHtml = '<span class="status-badge status-draft-link">Working Copy Active</span>';
        }

        var statusBadge = isPublished
          ? '<span class="status-badge status-published">PUBLISHED</span>'
          : '<span class="status-badge status-unpublished">UNPUBLISHED</span>';

        var titleLink = isPublished
          ? '<a href="/article/' + escapeHtml(article.slug) + '" target="_blank" class="article-title">' + escapeHtml(article.title || article.slug) + '</a>'
          : '<span class="article-title">' + escapeHtml(article.title || article.slug) + '</span>';

        var actionsHtml = '';
        if (isPublished) {
          actionsHtml = 
            '<button type="button" class="btn btn-secondary btn-sm action-preview" data-slug="' + escapeHtml(article.slug) + '" title="Preview complete article using preview pipeline">Preview ↗</button>' +
            '<button type="button" class="btn btn-secondary btn-sm action-edit" data-slug="' + escapeHtml(article.slug) + '" title="Edit existing article in Studio">Edit ✎</button>' +
            '<button type="button" class="btn btn-ghost btn-sm action-unpublish" data-slug="' + escapeHtml(article.slug) + '" title="Unpublish this article">Unpublish</button>' +
            '<a href="/article/' + escapeHtml(article.slug) + '" target="_blank" class="btn btn-ghost btn-sm action-open-public" title="Open public article">Open Public ↗</a>';
        } else {
          actionsHtml = 
            '<button type="button" class="btn btn-secondary btn-sm action-preview" data-slug="' + escapeHtml(article.slug) + '" title="Preview complete unpublished article">Preview ↗</button>' +
            '<button type="button" class="btn btn-secondary btn-sm action-edit" data-slug="' + escapeHtml(article.slug) + '" title="Edit existing article in Studio">Edit ✎</button>' +
            '<button type="button" class="btn btn-primary btn-sm action-publish" data-slug="' + escapeHtml(article.slug) + '" title="Publish this article to public routes">Publish ✦</button>';
        }

        card.innerHTML = 
          '<div class="article-card-info">' +
            '<div class="article-title-row">' +
              titleLink +
              statusBadge +
              draftBadgeHtml +
            '</div>' +
            '<div class="article-meta-line">' +
              '<span class="meta-cat">' + escapeHtml(article.category || 'Salesforce') + '</span> · ' +
              '<span>' + escapeHtml(article.difficulty || 'Lv. 1 - Incantation') + '</span> · ' +
              '<span class="meta-slug">/article/' + escapeHtml(article.slug) + '</span>' +
            '</div>' +
            tagsHtml +
          '</div>' +
          '<div class="article-card-actions" id="actions-' + article.slug + '">' +
            actionsHtml +
          '</div>';

        // Event listeners
        var previewBtn = card.querySelector('.action-preview');
        if (previewBtn) {
          previewBtn.addEventListener('click', function() {
            previewPersistedArticle(article.slug, previewBtn);
          });
        }

        var editBtn = card.querySelector('.action-edit');
        if (editBtn) {
          editBtn.addEventListener('click', function() {
            editPersistedArticle(article.slug, editBtn);
          });
        }

        var unpublishBtn = card.querySelector('.action-unpublish');
        if (unpublishBtn) {
          unpublishBtn.addEventListener('click', function() {
            showUnpublishConfirm(article.slug, card);
          });
        }

        var publishBtn = card.querySelector('.action-publish');
        if (publishBtn) {
          publishBtn.addEventListener('click', function() {
            publishPersistedArticle(article.slug, publishBtn);
          });
        }

        return card;
      }

      function createDraftCard(draft) {
        var card = document.createElement('div');
        card.className = 'article-card';
        card.id = 'draft-card-' + draft.studioId;

        var isCopy = Boolean(draft.sourceArticleSlug);
        var dateStr = draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : 'Recently';

        var noticeHtml = '';
        if (isCopy) {
          noticeHtml = '<div class="working-copy-notice">✦ Working copy of: <strong>' + escapeHtml(draft.sourceArticleSlug) + '</strong></div>';
        }

        var delLabel = isCopy ? 'Delete Working Copy' : 'Delete';

        card.innerHTML = 
          '<div class="article-card-info">' +
            '<div class="article-title-row">' +
              '<span class="article-title">' + escapeHtml(draft.title || 'Untitled Scroll') + '</span>' +
              '<span class="status-badge status-working-draft">WORKING DRAFT</span>' +
            '</div>' +
            '<div class="article-meta-line">' +
              '<span class="meta-cat">' + escapeHtml(draft.category || 'Uncategorized') + '</span> · ' +
              '<span>Saved ' + dateStr + '</span>' +
            '</div>' +
            noticeHtml +
          '</div>' +
          '<div class="article-card-actions" id="actions-draft-' + draft.studioId + '">' +
            '<button type="button" class="btn btn-secondary btn-sm action-preview-draft" title="Preview draft">Preview ↗</button>' +
            '<a href="/template-preview/studio?draft=' + encodeURIComponent(draft.studioId) + '" class="btn btn-secondary btn-sm" title="Edit in Studio">Edit ✎</a>' +
            '<button type="button" class="btn btn-danger btn-sm action-delete-draft" title="Delete draft">' + delLabel + '</button>' +
          '</div>';

        card.querySelector('.action-preview-draft').addEventListener('click', function(e) {
          previewDraft(draft.studioId, e.currentTarget);
        });

        card.querySelector('.action-delete-draft').addEventListener('click', function(e) {
          showDeleteDraftConfirm(draft, card);
        });

        return card;
      }

      // ── Actions ──────────────────────────────────────────

      function previewPersistedArticle(slug, btn) {
        btn.disabled = true;
        fetch('/__article-studio/articles/' + encodeURIComponent(slug) + '/preview', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            btn.disabled = false;
            if (data.success) {
              window.open(data.previewUrl || '/template-preview/article', 'coven-article-preview');
            } else {
              showToast('Preview error: ' + (data.error || 'Failed to prepare preview'), 'error');
            }
          })
          .catch(function(err) {
            btn.disabled = false;
            showToast('Preview network error: ' + err.message, 'error');
          });
      }

      function previewDraft(studioId, btn) {
        btn.disabled = true;
        fetch('/__article-studio/drafts/' + encodeURIComponent(studioId))
          .then(function(r) { return r.json(); })
          .then(function(doc) {
            return fetch('/__article-studio/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(doc)
            });
          })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            btn.disabled = false;
            if (data.success) {
              window.open('/template-preview/article', 'coven-article-preview');
            } else {
              showToast('Preview error: ' + (data.error || 'Failed'), 'error');
            }
          })
          .catch(function(err) {
            btn.disabled = false;
            showToast('Preview error: ' + err.message, 'error');
          });
      }

      function editPersistedArticle(slug, btn) {
        btn.disabled = true;
        fetch('/__article-studio/articles/' + encodeURIComponent(slug) + '/create-draft', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            btn.disabled = false;
            if (data.success && data.studioId) {
              window.location.href = '/template-preview/studio?draft=' + encodeURIComponent(data.studioId);
            } else {
              showToast('Edit error: ' + (data.error || 'Failed to prepare draft'), 'error');
            }
          })
          .catch(function(err) {
            btn.disabled = false;
            showToast('Edit network error: ' + err.message, 'error');
          });
      }

      function showUnpublishConfirm(slug, card) {
        var actionsContainer = card.querySelector('#actions-' + slug);
        var originalHtml = actionsContainer.innerHTML;

        var box = document.createElement('div');
        box.className = 'inline-confirm-box';
        box.innerHTML = 
          '<div class="inline-confirm-text">' +
            'Unpublish this article?<br>' +
            '<span class="subtext">It will disappear from the public Library and public article routes, but its source content will remain safely stored.</span>' +
          '</div>' +
          '<div class="inline-confirm-buttons">' +
            '<button type="button" class="btn btn-ghost btn-sm btn-cancel-unpub">Cancel</button>' +
            '<button type="button" class="btn btn-danger btn-sm btn-do-unpub">Unpublish</button>' +
          '</div>';

        actionsContainer.innerHTML = '';
        actionsContainer.appendChild(box);

        box.querySelector('.btn-cancel-unpub').addEventListener('click', function() {
          actionsContainer.innerHTML = originalHtml;
          // Re-attach listeners
          var article = state.persistedArticles.find(function(a) { return a.slug === slug; });
          if (article) {
            var newCard = createPersistedArticleCard(article);
            card.parentNode.replaceChild(newCard, card);
          }
        });

        box.querySelector('.btn-do-unpub').addEventListener('click', function(e) {
          e.currentTarget.disabled = true;
          fetch('/__article-studio/articles/' + encodeURIComponent(slug) + '/unpublish', { method: 'POST' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (data.success) {
                showToast('Article unpublished. Source files preserved.', 'success');
                loadData();
              } else {
                showToast('Failed to unpublish: ' + (data.error || 'Unknown error'), 'error');
                actionsContainer.innerHTML = originalHtml;
              }
            })
            .catch(function(err) {
              showToast('Unpublish error: ' + err.message, 'error');
              actionsContainer.innerHTML = originalHtml;
            });
        });
      }

      function publishPersistedArticle(slug, btn) {
        btn.disabled = true;
        fetch('/__article-studio/articles/' + encodeURIComponent(slug) + '/publish', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            btn.disabled = false;
            if (data.success) {
              showToast('✦ Article published successfully!', 'success');
              loadData();
            } else {
              showToast('Publish failed: ' + (data.error || 'Server error'), 'error');
            }
          })
          .catch(function(err) {
            btn.disabled = false;
            showToast('Publish error: ' + err.message, 'error');
          });
      }

      function showDeleteDraftConfirm(draft, card) {
        var actionsContainer = card.querySelector('#actions-draft-' + draft.studioId);
        var originalHtml = actionsContainer.innerHTML;
        var isCopy = Boolean(draft.sourceArticleSlug);

        var box = document.createElement('div');
        box.className = 'inline-confirm-box';
        var promptText = isCopy
          ? 'Delete this working copy?<br><span class="subtext">The underlying persisted article will remain untouched.</span>'
          : 'Delete this working draft?<br><span class="subtext">This draft has not been published yet.</span>';
        var confirmBtnText = isCopy ? 'Delete Working Copy' : 'Delete';

        box.innerHTML = 
          '<div class="inline-confirm-text">' + promptText + '</div>' +
          '<div class="inline-confirm-buttons">' +
            '<button type="button" class="btn btn-ghost btn-sm btn-cancel-deldraft">Cancel</button>' +
            '<button type="button" class="btn btn-danger btn-sm btn-do-deldraft">' + confirmBtnText + '</button>' +
          '</div>';

        actionsContainer.innerHTML = '';
        actionsContainer.appendChild(box);

        box.querySelector('.btn-cancel-deldraft').addEventListener('click', function() {
          actionsContainer.innerHTML = originalHtml;
          var newCard = createDraftCard(draft);
          card.parentNode.replaceChild(newCard, card);
        });

        box.querySelector('.btn-do-deldraft').addEventListener('click', function(e) {
          e.currentTarget.disabled = true;
          fetch('/__article-studio/drafts/' + encodeURIComponent(draft.studioId), { method: 'DELETE' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (data.success) {
                showToast(isCopy ? 'Working copy deleted. Persisted article untouched.' : 'Draft deleted.');
                loadData();
              } else {
                showToast('Failed to delete draft: ' + (data.error || 'Server error'), 'error');
                actionsContainer.innerHTML = originalHtml;
              }
            })
            .catch(function(err) {
              showToast('Delete error: ' + err.message, 'error');
              actionsContainer.innerHTML = originalHtml;
            });
        });
      }

      // ── Filter Tabs & Search Listeners ────────────────────

      document.getElementById('filter-tabs').addEventListener('click', function(e) {
        var tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;
        var tab = tabBtn.getAttribute('data-tab');
        if (state.currentTab === tab) return;

        state.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
          btn.classList.toggle('active', btn === tabBtn);
        });

        renderList();
      });

      document.getElementById('article-search').addEventListener('input', function(e) {
        state.searchQuery = e.target.value;
        renderList();
      });

      // Initial load
      loadData();
    })();
  </script>
</body>
</html>`;
}
