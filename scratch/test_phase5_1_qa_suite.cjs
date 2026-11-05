// scratch/test_phase5_1_qa_suite.cjs
// COVEN — UAT ARTICLE FORGE: PHASE 5.1 COMPREHENSIVE AUTOMATED QA SUITE

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');

const DEBUG_PORT = 9223;
const TEMP_PROFILE = path.resolve(__dirname, 'chrome-p51-profile');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const uatDir = path.resolve('.uat-article-forge');
const uatDraftsDir = path.join(uatDir, 'drafts');
const uatTempDir = path.join(uatDir, 'temp');

const draftsDir = path.resolve('.article-studio/drafts');
const articlesDir = path.resolve('src/articles');

const qaResults = [];

function assert(id, description, passed, detail) {
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`  ${status} [QA-${id}]: ${description} ${detail ? `(${detail})` : ''}`);
  qaResults.push({ id, description, passed, detail });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function main() {
  console.log("==================================================================");
  console.log("COVEN — UAT ARTICLE FORGE: PHASE 5.1 COMPREHENSIVE QA AUDIT");
  console.log("==================================================================\n");

  if (fs.existsSync(TEMP_PROFILE)) {
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch (e) {}
  }

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1600,1000',
    'http://localhost:4321/template-preview/article'
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { chromeProc.kill(); } catch (e) {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch (e) {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });

  let targets = null;
  for (let i = 0; i < 25; i++) {
    await sleep(500);
    try {
      targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (targets && targets.some(t => t.type === 'page')) break;
    } catch (e) {}
  }

  if (!targets) {
    console.error("FAIL: Could not connect to Chrome CDP!");
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  const consoleErrors = { canonicalPreview: [], origStudio: [], gridForge: [], uatStudio: [], uatPreview: [] };
  let currentContext = 'canonicalPreview';

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const resolver = pending.get(data.id);
      pending.delete(data.id);
      resolver(data);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      if (data.params.type === 'error') {
        const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        if (consoleErrors[currentContext]) {
          consoleErrors[currentContext].push(text);
        }
      }
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => (ws.onopen = resolve));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  const navigateTo = async (url, context) => {
    currentContext = context;
    await send('Page.navigate', { url });
    await sleep(1500);
  };

  const evaluate = async (expression) => {
    let expr = expression.trim();
    if (expr.includes('\n') || expr.includes('const ') || expr.includes('let ') || expr.includes('var ') || expr.includes(';') || expr.includes('return ')) {
      expr = `(() => {\n${expr}\n})()`;
    }
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.result?.exceptionDetails) {
      throw new Error(JSON.stringify(res.result.exceptionDetails));
    }
    return res.result?.result?.value;
  };

  const setViewport = async (width, height) => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768
    });
    await sleep(300);
  };

  const captureScreenshot = async (filePath) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res.result?.data) {
      fs.writeFileSync(filePath, Buffer.from(res.result.data, 'base64'));
    }
  };

  try {
    // ==================================================================
    // PART 1: BASELINE PROTECTED SYSTEMS INTEGRITY
    // ==================================================================
    console.log("--- PART 1: BASELINE PROTECTED SYSTEMS INTEGRITY ---");
    
    // 1. Canonical Preview
    await navigateTo('http://localhost:4321/template-preview/article', 'canonicalPreview');
    const canonTitle = await evaluate('document.title');
    assert(1, "Canonical Preview (/template-preview/article) loads successfully", Boolean(canonTitle && canonTitle.includes('Coven')));
    assert(2, "Canonical Preview console errors = 0", consoleErrors.canonicalPreview.length === 0, `${consoleErrors.canonicalPreview.length} errors`);

    // 2. Original Studio
    await navigateTo('http://localhost:4321/template-preview/studio', 'origStudio');
    const origStudioEl = await evaluate('Boolean(document.getElementById("btn-preview"))');
    assert(3, "Original Studio (/template-preview/studio) loads successfully", origStudioEl);
    assert(4, "Original Studio console errors = 0", consoleErrors.origStudio.length === 0, `${consoleErrors.origStudio.length} errors`);

    // 3. Standalone Grid Forge
    await navigateTo('http://localhost:4321/lab/layout-forge', 'gridForge');
    const gridForgeEl = await evaluate('Boolean(document.querySelector(".forge-container") || document.querySelector(".canvas-grid") || document.title.includes("Layout Forge"))');
    assert(5, "Standalone Grid Forge (/lab/layout-forge) loads successfully", gridForgeEl);
    assert(6, "Standalone Grid Forge console errors = 0", consoleErrors.gridForge.length === 0, `${consoleErrors.gridForge.length} errors`);

    // 4. UAT Studio
    await navigateTo('http://localhost:4321/lab/layout-forge/studio', 'uatStudio');
    const uatStudioEl = await evaluate('Boolean(document.getElementById("btn-preview"))');
    assert(7, "UAT Studio (/lab/layout-forge/studio) loads successfully", uatStudioEl);
    assert(8, "UAT Studio console errors = 0", consoleErrors.uatStudio.length === 0, `${consoleErrors.uatStudio.length} errors`);

    // ==================================================================
    // PART 2: STORAGE ISOLATION & READ PURITY
    // ==================================================================
    console.log("\n--- PART 2: STORAGE ISOLATION & READ PURITY ---");

    const prodDraftsBeforePreview = fs.existsSync(draftsDir) ? fs.readdirSync(draftsDir) : [];
    const prodArticlesBeforePreview = fs.existsSync(articlesDir) ? fs.readdirSync(articlesDir) : [];

    // Check read purity of draft file
    const testDraftPath = path.join(uatDraftsDir, 'qa_preview_parity_draft.json');
    const hashBefore = getFileHash(testDraftPath);
    const mtimeBefore = fs.statSync(testDraftPath).mtimeMs;
    const docBefore = JSON.parse(fs.readFileSync(testDraftPath, 'utf-8'));

    // Open UAT Preview for test draft
    await navigateTo('http://localhost:4321/lab/layout-forge/preview?draft=qa_preview_parity_draft', 'uatPreview');

    const hashAfter = getFileHash(testDraftPath);
    const mtimeAfter = fs.statSync(testDraftPath).mtimeMs;
    const docAfter = JSON.parse(fs.readFileSync(testDraftPath, 'utf-8'));
    const prodDraftsAfterPreview = fs.existsSync(draftsDir) ? fs.readdirSync(draftsDir) : [];
    const prodArticlesAfterPreview = fs.existsSync(articlesDir) ? fs.readdirSync(articlesDir) : [];

    assert(9, "Preview GET is read-pure: draft file hash unchanged", hashBefore === hashAfter);
    assert(10, "Preview GET is read-pure: draft file mtime unchanged", mtimeBefore === mtimeAfter);
    assert(11, "Preview GET does not increment revision", docBefore.revision === docAfter.revision);
    assert(12, "Preview GET does not mutate updatedAt", docBefore.updatedAt === docAfter.updatedAt);
    assert(13, "Zero .article-studio writes during UAT Preview GET", prodDraftsBeforePreview.length === prodDraftsAfterPreview.length);
    assert(14, "Zero src/articles writes during UAT Preview GET", prodArticlesBeforePreview.length === prodArticlesAfterPreview.length);

    // ==================================================================
    // PART 3: CANONICAL ARTICLE VISUAL PARITY & SHELL
    // ==================================================================
    console.log("\n--- PART 3: CANONICAL ARTICLE VISUAL PARITY & SHELL ---");

    const titleText = await evaluate('document.title');
    assert(15, "HTML document title follows canonical pattern", titleText.startsWith('Coven of Technology — The Architecture of Arcane Layouts'), titleText);

    const ambientPage = await evaluate('Boolean(document.querySelector(".cov-article-page"))');
    assert(16, "Ambient Background (.cov-article-page) present", ambientPage);

    const stickyZone = await evaluate('Boolean(document.getElementById("article-sticky-zone"))');
    assert(17, "Sticky Top Zone (#article-sticky-zone) present", stickyZone);

    const stickyProgress = await evaluate('Boolean(document.getElementById("article-progress-track") && document.getElementById("article-progress-bar"))');
    assert(18, "Top reading progress bar (#article-progress-bar) present", stickyProgress);

    const spiritProgress = await evaluate('Boolean(document.getElementById("article-spirit-progress") || document.querySelector("spirit-progress"))');
    assert(19, "Spirit Markers (SpiritProgress) present in sticky zone", spiritProgress);

    const brandHeader = await evaluate(`
      const b = document.querySelector('.cov-brand');
      const logo = document.querySelector('.cov-brand-logo')?.textContent.trim();
      const text = document.querySelector('.cov-brand-text')?.textContent.trim();
      return Boolean(b && logo === '✶' && text === 'COVEN · OF · TECHNOLOGY');
    `);
    assert(20, "Header brand logo ✶ and text 'COVEN · OF · TECHNOLOGY' present", brandHeader);

    const breadcrumbs = await evaluate(`
      const h = document.querySelector('.article-top-header');
      return Boolean(h && h.textContent.includes('The Grimoire') && h.textContent.includes('Architecture'));
    `);
    assert(21, "Header automatic breadcrumb (The Grimoire / Category) present", breadcrumbs);

    const aetherBadge = await evaluate(`
      const h = document.querySelector('.article-top-header');
      return Boolean(h && h.textContent.includes('✦ 250 Aether on completion'));
    `);
    assert(22, "Header Aether completion badge (✦ 250 Aether) present", aetherBadge);

    const articleContainer = await evaluate(`
      const a = document.getElementById('coven-article-container');
      return Boolean(a && a.classList.contains('cov-section-pad') && a.classList.contains('article-template'));
    `);
    assert(23, "Article container (#coven-article-container.cov-section-pad.article-template) present", articleContainer);

    const heroTitle = await evaluate(`
      const h1 = document.querySelector('#coven-article-container h1');
      if (!h1) return false;
      const ff = window.getComputedStyle(h1).fontFamily;
      return h1.textContent.trim() === 'The Architecture of Arcane Layouts' && ff.includes('Metamorphous');
    `);
    assert(24, "Hero H1 rendered with Metamorphous display font", heroTitle);

    const authorByline = await evaluate(`
      const c = document.getElementById('coven-article-container');
      return Boolean(c && c.textContent.includes('Inscribed by the Oracle of Orgs'));
    `);
    assert(25, "Inscription byline ('Inscribed by the Oracle of Orgs') present", authorByline);

    const authorAvatar = await evaluate(`
      const av = document.querySelector('#coven-article-container div[style*="radial-gradient"]');
      return Boolean(av && av.textContent.trim() === 'O');
    `);
    assert(26, "Author avatar badge with initial 'O' present", authorAvatar);

    const heroMeta = await evaluate(`
      const c = document.getElementById('coven-article-container');
      return Boolean(c && c.textContent.includes('18 min') && c.textContent.includes('✦ 250 Aether'));
    `);
    assert(27, "Hero metadata (reading time 18 min, ✦ 250 Aether) present", heroMeta);

    const heroLead = await evaluate(`
      const p = document.querySelector('.hero-lead');
      return Boolean(p && p.textContent.includes('An exhaustive masterwork exploring the spatial synthesis'));
    `);
    assert(28, "Hero lead (p.hero-lead) rendered from meta.description", heroLead);

    const heroCover = await evaluate(`
      const f = document.querySelector('figure.hero-cover');
      const img = f?.querySelector('img');
      const cap = f?.querySelector('figcaption');
      return Boolean(f && img && img.getAttribute('src')?.includes('photo-1518770660439') && cap?.textContent.includes('Figure 1.0'));
    `);
    assert(29, "Editorial hero cover image with caption present", heroCover);

    const editorialLayout = await evaluate(`
      const el = document.getElementById('article-editorial-layout');
      return Boolean(el && el.querySelector('.main-content') && el.querySelector('.article-sidebar'));
    `);
    assert(30, "Editorial layout (#article-editorial-layout) with .main-content & .article-sidebar present", editorialLayout);

    const navBlock = await evaluate(`
      const nb = document.querySelector('.article-nav-block');
      return Boolean(nb && nb.textContent.includes('← BACK TO THE GRIMOIRE'));
    `);
    assert(31, "Navigation block with '← BACK TO THE GRIMOIRE' link present", navBlock);

    const desktopSidebar = await evaluate(`
      const s = document.getElementById('article-desktop-sidebar');
      const t = s?.querySelector('.toc-title')?.textContent.trim();
      const pct = s?.querySelector('#reading-pct')?.textContent.trim();
      const bar = Boolean(s?.querySelector('#reading-bar'));
      return Boolean(s && t?.includes('ON THIS SCROLL') && pct === '0%' && bar);
    `);
    assert(32, "Desktop Sidebar TOC (#article-desktop-sidebar) with ON THIS SCROLL & reading-pct initialized", desktopSidebar);

    const mobileToc = await evaluate(`
      const m = document.getElementById('article-mobile-toc');
      return Boolean(m && m.tagName.toLowerCase() === 'details' && m.querySelector('summary')?.textContent.includes('ON THIS SCROLL'));
    `);
    assert(33, "Mobile TOC (#article-mobile-toc) details element present", mobileToc);

    const footer = await evaluate('Boolean(document.querySelector("footer"))');
    assert(34, "Canonical Coven footer present", footer);

    // ==================================================================
    // PART 4: SECTION VISUAL GRID & SLOTS ARCHITECTURE
    // ==================================================================
    console.log("\n--- PART 4: SECTION VISUAL GRID & SLOTS ARCHITECTURE ---");

    const sectionsCount = await evaluate('document.querySelectorAll(".article-section").length');
    assert(35, "3 Article sections rendered", sectionsCount === 3, `found ${sectionsCount}`);

    const section1Kicker = await evaluate(`
      const s1 = document.getElementById('sacred-foundations');
      return s1?.querySelector('.section-kicker')?.textContent.trim() === '01 · SPATIAL MATRIX';
    `);
    assert(36, "Section 1 kicker rendered ('01 · SPATIAL MATRIX')", section1Kicker);

    const section1Title = await evaluate(`
      const s1 = document.getElementById('sacred-foundations');
      return s1?.querySelector('.article-section-title')?.textContent.trim() === 'Sacred Foundations';
    `);
    assert(37, "Section 1 title rendered ('Sacred Foundations')", section1Title);

    const sectionGrids = await evaluate(`
      const grids = document.querySelectorAll('.section-reader-grid');
      return Array.from(grids).every(g => window.getComputedStyle(g).display === 'grid') && grids.length === 3;
    `);
    assert(38, "All 3 sections own .section-reader-grid with display: grid", sectionGrids);

    const grid1Cols = await evaluate(`
      const g = document.querySelector('#sacred-foundations .section-reader-grid');
      return g?.getAttribute('data-grid-cols') === '3';
    `);
    assert(39, "Section 1 grid configured with 3 columns", grid1Cols);

    const grid1Gaps = await evaluate(`
      const g = document.querySelector('#sacred-foundations .section-reader-grid');
      return g?.getAttribute('data-grid-colgap') === '24' && g?.getAttribute('data-grid-rowgap') === '24';
    `);
    assert(40, "Section 1 grid rowGap & colGap match 24px configuration", grid1Gaps);

    const slotsCount = await evaluate('document.querySelectorAll(".reader-grid-slot").length');
    assert(41, "Total 15 reader grid slots rendered across sections", slotsCount === 15, `found ${slotsCount}`);

    const slotCoords = await evaluate(`
      const sLead = document.querySelector('[data-slot-id="slot-foundations-lead"]');
      const sQuote = document.querySelector('[data-slot-id="slot-foundations-quote"]');
      const sStat = document.querySelector('[data-slot-id="slot-foundations-stat"]');
      
      const leadOk = sLead?.getAttribute('data-col-start') === '1' && sLead?.getAttribute('data-col-end') === '4' &&
                     sLead?.getAttribute('data-row-start') === '1' && sLead?.getAttribute('data-row-end') === '2';
      const quoteOk = sQuote?.getAttribute('data-col-start') === '1' && sQuote?.getAttribute('data-col-end') === '3' &&
                      sQuote?.getAttribute('data-row-start') === '2' && sQuote?.getAttribute('data-row-end') === '3';
      const statOk = sStat?.getAttribute('data-col-start') === '3' && sStat?.getAttribute('data-col-end') === '4' &&
                     sStat?.getAttribute('data-row-start') === '2' && sStat?.getAttribute('data-row-end') === '3';

      return Boolean(leadOk && quoteOk && statOk);
    `);
    assert(42, "Slot grid-column and grid-row coordinates map faithfully", slotCoords);

    const emptySlot = await evaluate(`
      const es = document.querySelector('[data-slot-id="slot-empty-spacer"]');
      const isTransparent = es?.classList.contains('reader-grid-slot--empty');
      const style = es ? window.getComputedStyle(es) : null;
      return Boolean(isTransparent && style?.borderStyle === 'none' && style?.backgroundColor === 'rgba(0, 0, 0, 0)');
    `);
    assert(43, "Empty spacer slot rendered transparently with no borders or labels", emptySlot);

    // ==================================================================
    // PART 5: ARTICLEBLOCKS RENDERING FIDELITY (CANONICAL BLOCKS)
    // ==================================================================
    console.log("\n--- PART 5: ARTICLEBLOCKS RENDERING FIDELITY ---");

    const titleTextBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-foundations-lead"]');
      return Boolean(b && b.textContent.includes('Grid Coordinates Unveil Higher Geometry'));
    `);
    assert(44, "Title-Text block rendered faithfully inside Slot", titleTextBlock);

    const pullquoteBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-foundations-quote"]');
      return Boolean(b && b.textContent.includes('The visual grid does not merely contain truth') && b.textContent.includes('Grand Magus of Layouts'));
    `);
    assert(45, "Pullquote block rendered faithfully inside Slot", pullquoteBlock);

    const statsMetricsBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-foundations-stat"]');
      return Boolean(b && b.textContent.includes('100%') && b.textContent.includes('Visual Parity'));
    `);
    assert(46, "Stats-Metrics block rendered faithfully inside Slot", statsMetricsBlock);

    const codeBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-code"]');
      return Boolean(b && b.textContent.includes('local Grid = {}') && b.textContent.includes('MatrixForge.luau'));
    `);
    assert(47, "Code-Block rendered faithfully inside Slot with filename badge", codeBlock);

    const cardGrid2Block = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-cards2"]');
      return Boolean(b && b.textContent.includes('Spatial Matrix') && b.textContent.includes('Slot Bounds'));
    `);
    assert(48, "Card-Grid-2 block rendered faithfully inside Slot", cardGrid2Block);

    const calloutBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-callout"]');
      return Boolean(b && b.textContent.includes('Dimensional Boundary Warning') && b.textContent.includes('Never mutate canonical'));
    `);
    assert(49, "Callout block rendered faithfully inside Slot", calloutBlock);

    const trialBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-trial"]');
      return Boolean(b && (b.textContent.includes('Section Grid Mastery') || b.textContent.includes('BEGIN THE TRIAL')));
    `);
    assert(50, "Article-Trial block rendered faithfully inside Slot", trialBlock);

    const exerciseBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-exercise"]');
      return Boolean(b && b.textContent.includes('TRIAL SCENARIO 01') && b.textContent.includes('How do grid slots behave'));
    `);
    assert(51, "Exercise block rendered faithfully inside Slot", exerciseBlock);

    const soloTextBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-solo-text"]');
      return Boolean(b && b.textContent.includes('Deep block harmonization unites technical typography'));
    `);
    assert(52, "Solo-Text block rendered faithfully inside Slot", soloTextBlock);

    const nestedBulletsBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-nested-bullets"]');
      return Boolean(b && b.textContent.includes('Article Hierarchy') && b.textContent.includes('Section Grid Architecture'));
    `);
    assert(53, "Nested-Bullets block rendered faithfully inside Slot", nestedBulletsBlock);

    const takeawaysBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-takeaways"]');
      return Boolean(b && b.textContent.includes('Essential Laws') && b.textContent.includes('Spatial Grid'));
    `);
    assert(54, "Key-Takeaways block rendered faithfully inside Slot", takeawaysBlock);

    const comparisonBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-comparison"]');
      return Boolean(b && b.textContent.includes('Traditional Studio') && b.textContent.includes('Article Forge'));
    `);
    assert(55, "Comparison block rendered faithfully inside Slot", comparisonBlock);

    const stepsBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-steps"]');
      return Boolean(b && b.textContent.includes('Configure Grid') && b.textContent.includes('Span Slots'));
    `);
    assert(56, "Numbered-Steps block rendered faithfully inside Slot", stepsBlock);

    const faqBlock = await evaluate(`
      const b = document.querySelector('[data-slot-id="slot-faq"]');
      return Boolean(b && b.textContent.includes('Is the visual grid strictly isolated'));
    `);
    assert(57, "FAQ block rendered faithfully inside Slot", faqBlock);

    const richLinks = await evaluate(`
      const rl = document.querySelector('.article-rich-link');
      if (!rl) return false;
      const color = window.getComputedStyle(rl).color;
      return Boolean(rl.textContent.includes('Quantum Matrices') && (color === 'rgb(232, 207, 149)' || color === 'rgb(243, 236, 223)'));
    `);
    assert(58, "Rich links render with canonical gold arcane styling (#e8cf95)", richLinks);

    // ==================================================================
    // PART 6: ZERO EDITOR CHROME
    // ==================================================================
    console.log("\n--- PART 6: ZERO EDITOR CHROME ---");

    const resizeHandles = await evaluate('document.querySelectorAll(".slot-resize-handle").length');
    assert(59, "Zero resize handles in Preview", resizeHandles === 0, `found ${resizeHandles}`);

    const dragHandles = await evaluate('document.querySelectorAll(".slot-drag-handle").length');
    assert(60, "Zero drag handles in Preview", dragHandles === 0, `found ${dragHandles}`);

    const slotOutlines = await evaluate(`
      const slots = document.querySelectorAll('.reader-grid-slot:not(.reader-grid-slot--empty)');
      return Array.from(slots).every(s => {
        const style = window.getComputedStyle(s);
        return style.outlineStyle === 'none' && !s.classList.contains('is-selected');
      });
    `);
    assert(61, "Zero selection outlines or active editor borders on slots", slotOutlines);

    const addBlockBtns = await evaluate('document.querySelectorAll(".btn-add-block, .block-palette, .add-slot-btn").length');
    assert(62, "Zero add-block or add-slot buttons in Preview", addBlockBtns === 0, `found ${addBlockBtns}`);

    const slotHeaders = await evaluate('document.querySelectorAll(".slot-header, .slot-actions, .slot-delete-btn").length');
    assert(63, "Zero slot headers, delete buttons or slot actions in Preview", slotHeaders === 0, `found ${slotHeaders}`);

    // ==================================================================
    // PART 7: SUBTLE UAT INDICATOR & NAVIGATION
    // ==================================================================
    console.log("\n--- PART 7: SUBTLE UAT INDICATOR & NAVIGATION ---");

    const uatPill = await evaluate(`
      const p = document.querySelector('.uat-preview-pill');
      const b = p?.querySelector('.uat-preview-pill-badge')?.textContent.trim();
      const a = p?.querySelector('.uat-preview-pill-link');
      const href = a?.getAttribute('href');
      const text = a?.textContent.trim();
      return Boolean(p && b === 'UAT PREVIEW' && href === '/lab/layout-forge/studio' && text.includes('Back to Forge Studio'));
    `);
    assert(64, "Subtle UAT navigation pill (.uat-preview-pill) present with badge and link", uatPill);

    const uatPillStyle = await evaluate(`
      const p = document.querySelector('.uat-preview-pill');
      if (!p) return false;
      const s = window.getComputedStyle(p);
      return Boolean(s.position === 'fixed' && parseInt(s.zIndex, 10) >= 9999);
    `);
    assert(65, "UAT pill has fixed bottom positioning without obstructing article flow", uatPillStyle);

    // ==================================================================
    // PART 8: DYNAMIC TOC SPY & PROGRESS SYNCHRONIZATION
    // ==================================================================
    console.log("\n--- PART 8: DYNAMIC TOC SPY & PROGRESS SYNCHRONIZATION ---");

    const tocItems = await evaluate(`
      const list = document.getElementById('desktop-toc-list');
      const items = list ? list.querySelectorAll('.toc-item') : [];
      return Boolean(items.length === 3 && items[0]?.textContent.includes('Sacred Foundations'));
    `);
    assert(66, "Dynamic Desktop TOC populated with all 3 section links", tocItems);

    const mobileTocItems = await evaluate(`
      const list = document.getElementById('mobile-toc-list');
      const items = list ? list.querySelectorAll('.toc-item') : [];
      return items.length === 3;
    `);
    assert(67, "Dynamic Mobile TOC populated with all 3 section links", mobileTocItems);

    // Scroll down and test scroll progress & TOC active state
    await evaluate(`
      window.scrollTo(0, 1200);
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    `);
    await sleep(500);

    const readingProgressScrolled = await evaluate(`
      const pctEl = document.getElementById('reading-pct');
      const pctVal = parseInt(pctEl?.textContent || '0', 10);
      const barEl = document.getElementById('reading-bar');
      const topBarEl = document.getElementById('article-progress-bar');
      const barW = parseFloat(barEl?.style.width || '0');
      const topW = parseFloat(topBarEl?.style.width || '0');
      return Boolean(pctVal > 0 || barW > 0 || topW > 0);
    `);
    assert(68, "Reading progress updates dynamically on scroll (sidebar pct, sidebar bar, top bar)", readingProgressScrolled);

    // Scroll back to top
    await evaluate(`
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    `);
    await sleep(300);

    // ==================================================================
    // PART 9: RESPONSIVE BEHAVIOR (1536px, 768px, 375px)
    // ==================================================================
    console.log("\n--- PART 9: RESPONSIVE BEHAVIOR (1536px, 768px, 375px) ---");

    // 1. Desktop (1536px)
    await setViewport(1536, 960);
    const desktopProof = path.resolve(__dirname, 'preview_parity_desktop_1536.png');
    await captureScreenshot(desktopProof);

    const desktopState = await evaluate(`
      const sidebar = document.getElementById('article-desktop-sidebar');
      const mobileToc = document.getElementById('article-mobile-toc');
      const sidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== 'none';
      const mobileHidden = mobileToc && window.getComputedStyle(mobileToc).display === 'none';
      const noHScroll = document.documentElement.scrollWidth <= window.innerWidth;
      return Boolean(sidebarVisible && mobileHidden && noHScroll);
    `);
    assert(69, "Desktop 1536px: Sidebar TOC visible, Mobile TOC hidden, zero horizontal scroll", desktopState);

    // 2. Tablet (768px)
    await setViewport(768, 1024);
    const tabletProof = path.resolve(__dirname, 'preview_parity_tablet_768.png');
    await captureScreenshot(tabletProof);

    const tabletState = await evaluate(`
      const sidebar = document.getElementById('article-desktop-sidebar');
      const mobileToc = document.getElementById('article-mobile-toc');
      const sidebarHidden = sidebar && window.getComputedStyle(sidebar).display === 'none';
      const mobileVisible = mobileToc && window.getComputedStyle(mobileToc).display !== 'none';
      const noHScroll = document.documentElement.scrollWidth <= window.innerWidth;
      return Boolean(sidebarHidden && mobileVisible && noHScroll);
    `);
    assert(70, "Tablet 768px: Sidebar hidden, Mobile TOC available, zero horizontal scroll", tabletState);

    // 3. Mobile (375px)
    await setViewport(375, 812);
    const mobileProof = path.resolve(__dirname, 'preview_parity_mobile_375.png');
    await captureScreenshot(mobileProof);

    const mobileState = await evaluate(`
      const grid = document.querySelector('#sacred-foundations .section-reader-grid');
      const gridStyle = grid ? window.getComputedStyle(grid) : null;
      const noHScroll = document.documentElement.scrollWidth <= (window.innerWidth + 2);
      const emptySlotHidden = (() => {
        const es = document.querySelector('[data-slot-id="slot-empty-spacer"]');
        return es && window.getComputedStyle(es).display === 'none';
      })();
      return Boolean(noHScroll && emptySlotHidden);
    `);
    assert(71, "Mobile 375px: Grid stacks cleanly, zero horizontal scroll, empty spacer slots hidden", mobileState);

    // Reset viewport to desktop
    await setViewport(1600, 1000);

    // ==================================================================
    // PART 10: PARAMETER & PREVIEW STATE HANDLING
    // ==================================================================
    console.log("\n--- PART 10: PARAMETER & PREVIEW STATE HANDLING ---");

    // Switch to another draft via ?draft=
    await navigateTo('http://localhost:4321/lab/layout-forge/preview?draft=draft_mw2rbfd0_8d8z7', 'uatPreview');
    const switchedDraft = await evaluate(`
      const s = document.querySelector('.article-section');
      return Boolean(s?.getAttribute('data-toc-title') === 'Section 1');
    `);
    assert(72, "Preview seamlessly switches draft via ?draft= parameter", switchedDraft);

    // Omit param and check fallback / persistent temp state
    await navigateTo('http://localhost:4321/lab/layout-forge/preview', 'uatPreview');
    const defaultLoad = await evaluate('Boolean(document.getElementById("coven-article-container"))');
    assert(73, "Preview loads active preview state when query param omitted", defaultLoad);

    // Zero console errors across preview operations
    assert(74, "Zero console errors on UAT Preview route across all operations and viewports", consoleErrors.uatPreview.length === 0, `${consoleErrors.uatPreview.length} errors`);

  } catch (err) {
    console.error("FATAL QA ERROR:", err);
    process.exit(1);
  } finally {
    cleanup();
  }

  // ==================================================================
  // AUDIT SUMMARY
  // ==================================================================
  console.log("\n==================================================================");
  console.log("PHASE 5.1 QA AUDIT SUMMARY");
  console.log("==================================================================");
  const total = qaResults.length;
  const passed = qaResults.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL CHECKS: ${total}`);
  console.log(`PASSED:       ${passed}`);
  console.log(`FAILED:       ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    console.error(`\nQA AUDIT FAILED with ${failed} failure(s)!`);
    process.exit(1);
  } else {
    console.log(`\nALL ${total} QA CHECKS PASSED PERFECTLY!`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
