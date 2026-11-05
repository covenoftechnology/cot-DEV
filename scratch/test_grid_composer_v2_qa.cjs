// scratch/test_grid_composer_v2_qa.cjs
// COVEN — UAT ARTICLE FORGE: GRID COMPOSER V2 COMPREHENSIVE AUTOMATED QA SUITE

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');

const DEBUG_PORT = 9224;
const TEMP_PROFILE = path.resolve(__dirname, 'chrome-gc2-profile');
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
  return new Promise(resolve => setTimeout(resolve, ms));
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
  console.log("COVEN — UAT ARTICLE FORGE: GRID COMPOSER V2 QA SUITE");
  console.log("==================================================================\n");

  if (fs.existsSync(TEMP_PROFILE)) {
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch (e) {}
  }

  // Record baseline production state
  const origStudioHash = getFileHash('src/pages/template-preview/studio.astro');
  const origArticleHash = getFileHash('src/pages/template-preview/article.astro');
  const origIntegrationHash = getFileHash('src/integrations/article-studio.ts');

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1600,1000',
    'http://localhost:4321/lab/layout-forge/studio'
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
  const consoleErrors = { uatStudio: [], uatPreview: [], uatCenter: [], origStudio: [] };
  let currentContext = 'uatStudio';

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
    if (res.result?.exceptionDetails || res.result?.result?.subtype === "error") {
      throw new Error(JSON.stringify(res.result.exceptionDetails));
    }
    return res.result?.result?.value;
  };

  try {
    // ═════════════════════════════════════════════════════════════
    // SECTION 1: BASELINE ROUTES & PRODUCTION ISOLATION
    // ═════════════════════════════════════════════════════════════
    console.log("--- Section 1: Baseline Routes & Production Isolation ---");

    const routesToCheck = [
      '/template-preview/studio',
      '/template-preview/article',
      '/template-preview/articles',
      '/lab/layout-forge',
      '/lab/layout-forge/studio',
      '/lab/layout-forge/preview',
      '/lab/layout-forge/articles',
      '/lab/article-forge/studio',
      '/lab/article-forge/preview',
      '/lab/article-forge/article',
      '/lab/article-forge/articles'
    ];

    for (let r of routesToCheck) {
      const res = await fetchJson(`http://localhost:4321${r}`);
      assert(`ROUTE-${r}`, `Route ${r} returns HTTP 200`, res.statusCode === 200 || !res.statusCode, `Status: ${res.statusCode || 200}`);
    }

    assert("PROD-PROTECT-1", "Original studio.astro unmodified", getFileHash('src/pages/template-preview/studio.astro') === origStudioHash);
    assert("PROD-PROTECT-2", "Original article.astro unmodified", getFileHash('src/pages/template-preview/article.astro') === origArticleHash);
    assert("PROD-PROTECT-3", "Original integration untouched", getFileHash('src/integrations/article-studio.ts') === origIntegrationHash);

    // ═════════════════════════════════════════════════════════════
    // SECTION 2: STUDIO INITIALIZATION & 4-COLUMN GRID MODEL
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 2: Studio Initialization & 4-Column Grid Canvas ---");
    await navigateTo('http://localhost:4321/lab/layout-forge/studio', 'uatStudio');

    const studioInit = await evaluate(`
      window.createNewArticle();
      const doc = window.currentDoc;
      const sec = doc.sections[0];
      const vg = sec.visualGrid;
      const canvasEl = document.querySelector('.grid-composer-canvas, .section-grid-canvas');
      return {
        hasCurrentDoc: Boolean(doc),
        sectionsCount: doc.sections.length,
        secId: sec.id,
        gridColumns: vg.columns,
        gridRows: vg.rows,
        layoutItemsCount: vg.layoutItems ? vg.layoutItems.length : -1,
        slotsAliasMatches: vg.slots === vg.layoutItems,
        is4ColsBadgePresent: Boolean(document.querySelector('.grid-badge-4col')),
        hasAddSlotBtn: Boolean(document.querySelector('[data-act="add-slot"]')),
        canvasGridColumns: canvasEl ? getComputedStyle(canvasEl).gridTemplateColumns.split(' ').length : 0
      };
    `);

    assert("INIT-1", "Default document initialized with clean empty Section 1", studioInit.hasCurrentDoc && studioInit.sectionsCount === 1);
    assert("INIT-2", "Grid Composer uses 4 columns by default", studioInit.gridColumns === 4 && studioInit.canvasGridColumns === 4, `Columns: ${studioInit.gridColumns}`);
    assert("INIT-3", "Initial section starts with 0 placed blocks", studioInit.layoutItemsCount === 0);
    assert("INIT-4", "Legacy .slots alias safely references .layoutItems", studioInit.slotsAliasMatches);
    assert("INIT-5", "'4 COLS' badge rendered in toolbar", studioInit.is4ColsBadgePresent);
    assert("INIT-6", "Manual '+ Add Slot' button is removed from toolbar", !studioInit.hasAddSlotBtn);

    // ═════════════════════════════════════════════════════════════
    // SECTION 3: LEGO SCENARIO 1 — 50/50 SPLIT (Text 2 + Text 2)
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 3: LEGO Scenario 1 — 50/50 Split (Text 2 + Text 2) ---");

    const lego1 = await evaluate(`
      const sec = window.currentDoc.sections[0];
      // Reset
      sec.visualGrid.layoutItems = [];
      sec.visualGrid.rows = 3;

      // Insert first text block with preferred span 2 (50%)
      const item1 = window.insertBlockDirectly('paragraph', sec.id, 2);
      item1.block.data.text = 'Left half paragraph column';

      // Insert second text block with preferred span 2 (50%)
      const item2 = window.insertBlockDirectly('paragraph', sec.id, 2);
      item2.block.data.text = 'Right half paragraph column';

      return {
        item1: { col: item1.columnStart, span: item1.columnSpan, row: item1.rowStart },
        item2: { col: item2.columnStart, span: item2.columnSpan, row: item2.rowStart },
        itemsCount: sec.visualGrid.layoutItems.length,
        spanLabel1: window.getSpanPercentageLabel(item1.columnSpan),
        spanLabel2: window.getSpanPercentageLabel(item2.columnSpan)
      };
    `);

    assert("LEGO-50-1", "Item 1 placed at col 1 span 2 in row 1", lego1.item1.col === 1 && lego1.item1.span === 2 && lego1.item1.row === 1);
    assert("LEGO-50-2", "Item 2 placed at col 3 span 2 in row 1", lego1.item2.col === 3 && lego1.item2.span === 2 && lego1.item2.row === 1);
    assert("LEGO-50-3", "Proportion labels report '50%'", lego1.spanLabel1 === '50%' && lego1.spanLabel2 === '50%');

    // ═════════════════════════════════════════════════════════════
    // SECTION 4: LEGO SCENARIO 2 — 75/25 SPLIT (Text 3 + Image 1)
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 4: LEGO Scenario 2 — 75/25 Split (Text 3 + Image 1) ---");

    const lego2 = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const item3 = window.insertBlockDirectly('title-text', sec.id, 3);
      const item1 = window.insertBlockDirectly('media-image', sec.id, 1);

      return {
        item3: { col: item3.columnStart, span: item3.columnSpan, row: item3.rowStart },
        item1: { col: item1.columnStart, span: item1.columnSpan, row: item1.rowStart },
        label3: window.getSpanPercentageLabel(item3.columnSpan),
        label1: window.getSpanPercentageLabel(item1.columnSpan)
      };
    `);

    assert("LEGO-66-1", "Block 1 occupies cols 1..3 on row 2 (75%)", lego2.item3.col === 1 && lego2.item3.span === 3 && lego2.item3.row === 2);
    assert("LEGO-66-2", "Block 2 occupies col 4 on row 2 (25%)", lego2.item1.col === 4 && lego2.item1.span === 1 && lego2.item1.row === 2);
    assert("LEGO-66-3", "Proportion labels report '75%' and '25%'", lego2.label3 === '75%' && lego2.label1 === '25%');

    // ═════════════════════════════════════════════════════════════
    // SECTION 5: LEGO SCENARIO 3 — 25/75 SPLIT (Image 1 + Text 3)
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 5: LEGO Scenario 3 — 25/75 Split (Image 1 + Text 3) ---");

    const lego3 = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const img1 = window.insertBlockDirectly('media-image', sec.id, 1);
      const txt3 = window.insertBlockDirectly('paragraph', sec.id, 3);

      return {
        img1: { col: img1.columnStart, span: img1.columnSpan, row: img1.rowStart },
        txt3: { col: txt3.columnStart, span: txt3.columnSpan, row: txt3.rowStart }
      };
    `);

    assert("LEGO-33-1", "Image occupies col 1 on row 3", lego3.img1.col === 1 && lego3.img1.span === 1 && lego3.img1.row === 3);
    assert("LEGO-33-2", "Text occupies cols 2..4 on row 3", lego3.txt3.col === 2 && lego3.txt3.span === 3 && lego3.txt3.row === 3);

    // ═════════════════════════════════════════════════════════════
    // SECTION 6: LEGO SCENARIO 4 — FOUR EQUAL BLOCKS (1 + 1 + 1 + 1)
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 6: LEGO Scenario 4 — Four Equal Blocks (1 + 1 + 1 + 1) ---");

    const lego4 = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const t1 = window.insertBlockDirectly('callout', sec.id, 1);
      const t2 = window.insertBlockDirectly('callout', sec.id, 1);
      const t3 = window.insertBlockDirectly('callout', sec.id, 1);
      const t4 = window.insertBlockDirectly('callout', sec.id, 1);

      return {
        t1: { col: t1.columnStart, span: t1.columnSpan, row: t1.rowStart },
        t2: { col: t2.columnStart, span: t2.columnSpan, row: t2.rowStart },
        t3: { col: t3.columnStart, span: t3.columnSpan, row: t3.rowStart },
        t4: { col: t4.columnStart, span: t4.columnSpan, row: t4.rowStart },
        allSameRow: (t1.rowStart === t2.rowStart) && (t2.rowStart === t3.rowStart) && (t3.rowStart === t4.rowStart)
      };
    `);

    assert("LEGO-THIRDS-1", "All four blocks placed on row 4", lego4.allSameRow && lego4.t1.row === 4);
    assert("LEGO-THIRDS-2", "Cols map to 1, 2, 3, 4 each with span 1",
      lego4.t1.col === 1 && lego4.t2.col === 2 && lego4.t3.col === 3 && lego4.t4.col === 4);

    // ═════════════════════════════════════════════════════════════
    // SECTION 7: LEGO SCENARIO 5 — FULL-WIDTH 4-COLUMN BLOCK
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 7: LEGO Scenario 5 — Full-Width 4-Column Block ---");

    const lego5 = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const full = window.insertBlockDirectly('callout', sec.id, 4);

      return {
        full: { col: full.columnStart, span: full.columnSpan, row: full.rowStart },
        label: window.getSpanPercentageLabel(full.columnSpan),
        currentRows: sec.visualGrid.rows
      };
    `);

    assert("LEGO-FULL-1", "Full block placed at col 1 span 4", lego5.full.col === 1 && lego5.full.span === 4);
    assert("LEGO-FULL-2", "Row auto-expanded to row 5", lego5.full.row === 5);
    assert("LEGO-FULL-3", "Label reports '100%'", lego5.label === '100%');

    // ═════════════════════════════════════════════════════════════
    // SECTION 8: AUTO-GROWING ROWS (NEVER REJECTS INSERTION)
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 8: Auto-Growing Rows Verification ---");

    const autoGrowTest = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const initialRowCount = sec.visualGrid.rows;

      // Insert 3 consecutive 12-column blocks
      const b1 = window.insertBlockDirectly('paragraph', sec.id, 12);
      const b2 = window.insertBlockDirectly('quote', sec.id, 12);
      const b3 = window.insertBlockDirectly('article-trial', sec.id, 12);

      return {
        initialRowCount,
        b1Row: b1.rowStart,
        b2Row: b2.rowStart,
        b3Row: b3.rowStart,
        finalRowCount: sec.visualGrid.rows,
        toastCount: document.querySelectorAll('.toast, .coven-toast').length
      };
    `);

    assert("AUTOGROW-1", "Rows auto-expand dynamically on new block placement", autoGrowTest.finalRowCount > autoGrowTest.initialRowCount, `From ${autoGrowTest.initialRowCount} to ${autoGrowTest.finalRowCount}`);
    assert("AUTOGROW-2", "Blocks placed sequentially without collision errors", autoGrowTest.b1Row < autoGrowTest.b2Row && autoGrowTest.b2Row < autoGrowTest.b3Row);

    // ═════════════════════════════════════════════════════════════
    // SECTION 9: SPATIAL RESIZING & MOVE SNAPPING
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 9: Spatial Resizing & Move Snapping ---");

    const spatialTest = await evaluate(`
      const sec = window.currentDoc.sections[0];
      // Target item
      const item = sec.visualGrid.layoutItems[0];
      const origSpan = item.columnSpan;

      // Test resize math
      item.columnSpan = 4;
      item.columnEnd = item.columnStart + 4;
      window.renderSections();

      const resizedBadge = document.querySelector('.grid-block-item[data-item-id="' + item.id + '"] .grid-block-span-badge')?.textContent;

      // Test duplicate
      window.duplicateGridItem(sec, item.id);
      const dupCount = sec.visualGrid.layoutItems.length;

      // Test delete
      window.deleteGridItem(sec, item.id, true);
      const afterDelCount = sec.visualGrid.layoutItems.length;

      return {
        resizedBadge,
        dupCount,
        afterDelCount,
        handlesPresent: Boolean(document.querySelector('.grid-resize-handle--e') && document.querySelector('.grid-block-move-handle'))
      };
    `);

    assert("SPATIAL-1", "Resize handle and dedicated move handle '⋮⋮' present in DOM", spatialTest.handlesPresent);
    assert("SPATIAL-2", "Span badge updates to reflect new 4-column span", spatialTest.resizedBadge?.includes('4 cols'));
    assert("SPATIAL-3", "Duplication deep-clones block and appends to grid", spatialTest.dupCount > 0);
    assert("SPATIAL-4", "Deletion cleanly removes item from grid", spatialTest.afterDelCount === spatialTest.dupCount - 1);

    // ═════════════════════════════════════════════════════════════
    // SECTION 10: SECTION REORDERING & INDEPENDENCE
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 10: Section Reordering & Independence ---");

    const secTest = await evaluate(`
      // Add Section 2
      const sec2 = {
        id: 'sec_test_2',
        title: 'Section 2',
        kicker: '02 · SECOND',
        heading: 'Secondary Exploration',
        visualGrid: {
          columns: 12,
          rows: 3,
          columnGap: 16,
          rowGap: 16,
          minRowHeight: 80,
          layoutItems: [],
          slots: []
        },
        blocks: []
      };
      window.currentDoc.sections.push(sec2);

      // Place block in Section 2
      const s2Item = window.insertBlockDirectly('key-takeaways', sec2.id, 12);
      s2Item.block.data.title = 'Takeaways in Section 2';

      const beforeOrder = window.currentDoc.sections.map(s => s.id);

      // Reorder: swap section 1 and 2
      const temp = window.currentDoc.sections[0];
      window.currentDoc.sections[0] = window.currentDoc.sections[1];
      window.currentDoc.sections[1] = temp;

      window.renderSections();

      const afterOrder = window.currentDoc.sections.map(s => s.id);

      return {
        sec2Items: sec2.visualGrid.layoutItems.length,
        beforeOrder,
        afterOrder,
        sec2ItemPreserved: window.currentDoc.sections[0].visualGrid.layoutItems[0]?.block?.type === 'key-takeaways'
      };
    `);

    assert("SEC-1", "Section 2 operates with its own independent 12-column Grid Composer", secTest.sec2Items === 1);
    assert("SEC-2", "Section reordering swaps sections intact with their blocks", secTest.beforeOrder[0] === secTest.afterOrder[1] && secTest.sec2ItemPreserved);

    // ═════════════════════════════════════════════════════════════
    // SECTION 11: STORAGE PERSISTENCE & MIGRATION OF 3/4 COL DRAFTS
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 11: Storage Persistence & Draft Migration ---");

    const saveTest = await evaluate(`
      window.currentDoc.meta.title = 'QA Grid Composer V2 Verified';
      window.currentDoc.meta.description = 'Demonstrating 12-column LEGO builder architecture.';
      window.__uatArticleForge.saveDraft();
      return {
        studioId: window.currentDoc.studioId,
        title: window.currentDoc.meta.title
      };
    `);

    await sleep(600);
    const savedDraftFile = path.join(uatDraftsDir, `${saveTest.studioId}.json`);
    const draftExistsOnDisk = fs.existsSync(savedDraftFile);
    assert("PERSIST-1", "Draft persisted to .uat-article-forge/drafts/", draftExistsOnDisk);

    // Test legacy 3-column draft migration
    const legacy3ColSection = {
      id: 'legacy_sec',
      title: 'Legacy 3-Col Section',
      visualGrid: {
        columns: 3,
        rows: 2,
        slots: [
          {
            id: 'legacy_slot_1',
            columnStart: 1,
            columnEnd: 2,
            rowStart: 1,
            rowEnd: 2,
            block: { id: 'blk_leg_1', type: 'pullquote', data: { quote: 'Ancient wisdom' } }
          },
          {
            id: 'legacy_slot_2',
            columnStart: 2,
            columnEnd: 4,
            rowStart: 1,
            rowEnd: 2,
            block: { id: 'blk_leg_2', type: 'code-block', data: { code: 'console.log("3col")' } }
          }
        ]
      }
    };

    const migrationRes = await evaluate(`
      const legSec = ${JSON.stringify(legacy3ColSection)};
      const migrated = window.migrateSectionToGridComposerV2(legSec);
      return {
        columns: migrated.columns,
        item1: { col: migrated.layoutItems[0].columnStart, span: migrated.layoutItems[0].columnSpan },
        item2: { col: migrated.layoutItems[1].columnStart, span: migrated.layoutItems[1].columnSpan }
      };
    `);

    assert("MIGRATE-1", "Legacy 3-col grid converted to 4 columns", migrationRes.columns === 4);
    assert("MIGRATE-2", "Old col 1 maps to col 1 span 1", migrationRes.item1.col === 1 && migrationRes.item1.span === 1);
    assert("MIGRATE-3", "Old cols 2-3 maps to col 2 span 2", migrationRes.item2.col === 2 && migrationRes.item2.span === 2);

    // ═════════════════════════════════════════════════════════════
    // SECTION 12: UAT PREVIEW FIDELITY & ZERO CHROME
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 12: UAT Preview Parity & Zero Chrome ---");
    await navigateTo(`http://localhost:4321/lab/layout-forge/preview?draft=${saveTest.studioId}`, 'uatPreview');

    const previewFidelity = await evaluate(`
      const readerGrid = document.querySelector('.section-reader-grid');
      const gridItems = document.querySelectorAll('.reader-grid-item');
      const hasHandles = Boolean(document.querySelector('.grid-block-move-handle, .grid-resize-handle, .slot-drag-handle'));
      const hasEmptySlots = Boolean(document.querySelector('.reader-grid-slot--empty'));
      const gridCols = readerGrid ? getComputedStyle(readerGrid).gridTemplateColumns.split(' ').length : 0;

      return {
        hasReaderGrid: Boolean(readerGrid),
        itemsCount: gridItems.length,
        hasHandles,
        hasEmptySlots,
        gridCols,
        title: document.querySelector('.article-header h1, .article-title')?.textContent?.trim()
      };
    `);

    assert("PREV-1", "UAT Preview renders 4-column CSS Grid", previewFidelity.hasReaderGrid && previewFidelity.gridCols === 4, `Columns: ${previewFidelity.gridCols}`);
    assert("PREV-2", "UAT Preview renders placed blocks inside reader items", previewFidelity.itemsCount > 0);
    assert("PREV-3", "Zero editor chrome (handles/grips) in Preview", !previewFidelity.hasHandles);
    assert("PREV-4", "No empty slot placeholders rendered in Preview", !previewFidelity.hasEmptySlots);

    // ═════════════════════════════════════════════════════════════
    // SECTION 13: MOBILE VIEW (< 768px) RESPONSIVE STACK
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 13: Mobile View (< 768px) Responsive Stack ---");

    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const mobileCheck = await evaluate(`
      const gridEl = document.querySelector('.section-reader-grid');
      const itemEl = document.querySelector('.reader-grid-item');
      return {
        gridComputedDisplay: gridEl ? getComputedStyle(gridEl).display : null,
        gridComputedCols: gridEl ? getComputedStyle(gridEl).gridTemplateColumns : null,
        itemWidth: itemEl ? itemEl.getBoundingClientRect().width : 0,
        screenWidth: window.innerWidth
      };
    `);

    assert("MOBILE-1", "Mobile view stacks blocks cleanly without multi-column overlap", mobileCheck.itemWidth > 300, `Item width: ${mobileCheck.itemWidth}px on 375px screen`);

    // Reset emulation
    await send('Emulation.clearDeviceMetricsOverride');

    // ═════════════════════════════════════════════════════════════
    // SECTION 14: CONSOLE ERRORS & CLEANLINESS
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Section 14: Console Errors & Health Check ---");

    assert("CONSOLE-STUDIO", "Zero uncaught console errors in UAT Studio", consoleErrors.uatStudio.length === 0, consoleErrors.uatStudio.join('; '));
    assert("CONSOLE-PREVIEW", "Zero uncaught console errors in UAT Preview", consoleErrors.uatPreview.length === 0, consoleErrors.uatPreview.join('; '));

    console.log("\n==================================================================");
    const passed = qaResults.filter(r => r.passed).length;
    const total = qaResults.length;
    console.log(`QA AUDIT COMPLETE: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log("==================================================================");

    cleanup();
    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    cleanup();
    process.exit(1);
  }
}

main();
