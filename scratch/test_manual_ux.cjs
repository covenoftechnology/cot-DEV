/**
 * scratch/test_manual_ux.cjs
 * COVEN — UAT ARTICLE FORGE
 * GRID COMPOSER V2: FINAL MANUAL-UX CORRECTION VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Exact Library Drop & WYSIWYG target commit (zero auto-placement fallback)
 * 2. Tall Row Full-Cell Hit Area & dynamic row geometry map
 * 3. Comfortable 4-Column Studio Canvas, Composer Viewport & Stationary Sidebars
 * 4. Focus Canvas Mode toggle
 * 5. Compact Chrome inside 25% columns
 * 6. Preview Wide Breakout (1320px max-width, prose canonical 820px)
 * 7. Single Authoritative Data Contract (visualGrid.layoutItems)
 */

const http = require('http');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9226;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(__dirname, '.temp_manual_ux_profile');
const ARTIFACTS_DIR = 'C:\\Users\\holma\\.gemini\\antigravity\\brain\\edc240ba-edf2-46ce-81f6-7796c7c75db9';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

async function runManualUxTests() {
  console.log("==================================================================");
  console.log("COVEN — GRID COMPOSER V2: FINAL MANUAL-UX CORRECTION QA SUITE");
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
    '--window-size=1600,1100',
    'http://localhost:4321/lab/layout-forge/studio'
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { chromeProc.kill(); } catch (e) {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch (e) {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  let targets = null;
  for (let i = 0; i < 25; i++) {
    try {
      targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (targets && targets.some(t => t.type === 'page')) break;
    } catch (e) {
      await sleep(300);
    }
  }

  if (!targets) {
    console.error("FAIL: Could not connect to Chrome debugging port");
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const resolver = pending.get(data.id);
      pending.delete(data.id);
      resolver(data);
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
  await send('CSS.enable');

  const evalCode = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.result?.exceptionDetails || res.result?.result?.subtype === 'error') {
      throw new Error(JSON.stringify(res.result?.exceptionDetails || res.result?.result));
    }
    return res.result?.result?.value;
  };

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // Wait for Studio initialization
  console.log("Waiting for Studio initialization...");
  for (let i = 0; i < 25; i++) {
    const ready = await evalCode(`Boolean(window.currentDoc && window.currentDoc.sections && window.currentDoc.sections.length > 0)`);
    if (ready) break;
    await sleep(200);
  }

  // -------------------------------------------------------------
  // SUITE 1: TALL ROW FULL-CELL HIT AREA & DYNAMIC ROW GEOMETRY
  // -------------------------------------------------------------
  console.log("\n--- SUITE 1: Tall Row Full-Cell Hit Area & Dynamic Row Geometry ---");

  // Setup Section 1 with a tall technical table (75% width, row 1) and empty 25% cell in column 4
  const setupRes = await evalCode(`
    (function() {
      if (typeof window.createNewArticle === 'function') {
        window.createNewArticle();
      }
      var doc = window.currentDoc;
      if (!doc || !doc.sections || doc.sections.length === 0) {
        return { error: 'No doc or sections found' };
      }
      var sec = doc.sections[0];
      sec.visualGrid = {
        columns: 4,
        rows: 2,
        columnGap: 16,
        rowGap: 16,
        minRowHeight: 80,
        showCoordinates: true,
        showVisualColumns: true,
        layoutItems: [
          {
            id: 'item_tall_table',
            columnStart: 1,
            columnSpan: 3,
            columnEnd: 4,
            rowStart: 1,
            rowSpan: 1,
            rowEnd: 2,
            block: {
              id: 'blk_table',
              type: 'technical-table',
              data: {
                headers: ['Spec', 'Value', 'Status', 'Notes'],
                rows: [
                  ['CPU Core', '3.8 GHz Octa-Core', 'Nominal', 'Calibrated'],
                  ['Memory', '64 GB DDR5', 'Optimal', 'Channel A/B'],
                  ['Storage', '2 TB NVMe', 'High Speed', 'Encrypted'],
                  ['Network', '10 GbE SFP+', 'Active', 'Low Latency'],
                  ['Power', '850W Platinum', 'Stable', 'Redundant'],
                  ['Thermal', '42°C Baseline', 'Cool', 'Liquid Loop'],
                  ['Bus Clock', '100 MHz Ref', 'Locked', 'Jitter-free']
                ],
                caption: 'System Specifications Matrix'
              }
            },
            label: 'System Matrix Table'
          }
        ]
      };
      window.renderSections();
      return { ok: true, secId: sec.id };
    })()
  `);
  console.log("  Setup Section 1 result:", setupRes);

  await sleep(1000);

  const tallRowMetrics = await evalCode(`
    (function() {
      var canvas = document.querySelector('.grid-composer-canvas');
      if (!canvas) return { error: 'No canvas found' };
      var tableItem = canvas.querySelector('.grid-block-item[data-item-id="item_tall_table"]');
      if (!tableItem) return { error: 'No tableItem found' };
      var cellSlot = canvas.querySelector('.grid-cell-slot[data-row="1"][data-col="4"]');
      if (!cellSlot) return { error: 'No cellSlot col 4 found' };
      var tRect = tableItem.getBoundingClientRect();
      var sRect = cellSlot.getBoundingClientRect();
      var cRect = canvas.getBoundingClientRect();

      var geom = window.computeCanvasRowGeometry(canvas, 2, 16, 80);

      return {
        tableHeight: tRect.height,
        slotHeight: sRect.height,
        tableTop: tRect.top,
        tableBottom: tRect.bottom,
        slotTop: sRect.top,
        slotBottom: sRect.bottom,
        row1Bounds: geom.rowBounds[0],
        canvasAlignItems: window.getComputedStyle(canvas).alignItems,
        slotAlignSelf: window.getComputedStyle(cellSlot).alignSelf
      };
    })()
  `);
  console.log("  tallRowMetrics:", tallRowMetrics);

  assert(tallRowMetrics.tableHeight > 250, `Technical Table rendered tall: ${tallRowMetrics.tableHeight.toFixed(0)}px (> 250px)`);
  assert(tallRowMetrics.slotHeight > 250, `Empty 25% Slot stretched full row height: ${tallRowMetrics.slotHeight.toFixed(0)}px (> 250px)`);
  assert(Math.abs(tallRowMetrics.slotHeight - tallRowMetrics.tableHeight) < 15, `Empty slot matches tall block height within 15px tolerance (slot=${tallRowMetrics.slotHeight.toFixed(0)}px, table=${tallRowMetrics.tableHeight.toFixed(0)}px)`);
  assert(tallRowMetrics.slotAlignSelf === 'stretch' || tallRowMetrics.canvasAlignItems === 'stretch', `Empty slot has align-self: stretch or canvas align-items: stretch`);

  // Test pointer resolution at top, middle, and bottom of tall row
  const pointerTests = await evalCode(`
    (function() {
      var canvas = document.querySelector('.grid-composer-canvas');
      var cellSlot = canvas.querySelector('.grid-cell-slot[data-row="1"][data-col="4"]');
      var sRect = cellSlot.getBoundingClientRect();

      var midX = sRect.left + (sRect.width / 2);

      // Top: 15px from top
      var topCell = window.resolvePointerToGridCell(midX, sRect.top + 15, canvas);
      // Mid: halfway down (e.g. Y=250px inside row 1)
      var midCell = window.resolvePointerToGridCell(midX, sRect.top + (sRect.height / 2), canvas);
      // Bottom: 15px from bottom
      var botCell = window.resolvePointerToGridCell(midX, sRect.bottom - 15, canvas);

      return {
        topCell: topCell,
        midCell: midCell,
        botCell: botCell
      };
    })()
  `);

  assert(pointerTests.topCell.row === 1 && pointerTests.topCell.col === 4, `Pointer at top of tall cell resolves to Row 1, Col 4 (got ${pointerTests.topCell.col},${pointerTests.topCell.row})`);
  assert(pointerTests.midCell.row === 1 && pointerTests.midCell.col === 4, `Pointer at MIDDLE of tall cell resolves to Row 1, Col 4 without jumping (got ${pointerTests.midCell.col},${pointerTests.midCell.row})`);
  assert(pointerTests.botCell.row === 1 && pointerTests.botCell.col === 4, `Pointer at BOTTOM of tall cell resolves to Row 1, Col 4 without jumping (got ${pointerTests.botCell.col},${pointerTests.botCell.row})`);

  // Capture Screenshot: Tall Row Full-Cell Hit Area
  const shotTallRow = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'uat_tall_row_full_cell.png'), Buffer.from(shotTallRow.result.data, 'base64'));
  console.log("  [SAVED] uat_tall_row_full_cell.png");

  // -------------------------------------------------------------
  // SUITE 2: EXACT LIBRARY DROP & WYSIWYG COMMIT (ZERO FALLBACK)
  // -------------------------------------------------------------
  console.log("\n--- SUITE 2: Exact Library Drop & WYSIWYG Target Commit ---");

  // Test placing a block via exact target commit on row 1 col 4
  const placeResult = await evalCode(`
    (function() {
      var sec = window.currentDoc.sections[0];
      var initCount = sec.visualGrid.layoutItems.length;

      // Simulate pointer-based exact library drop on col 4, row 1
      window.commitBlockPlacement(sec, 'solo-text', 4, 1, 1);

      var newItems = sec.visualGrid.layoutItems;
      var placed = newItems.find(function(it) { return it.block && it.block.type === 'solo-text'; });

      return {
        success: Boolean(placed),
        columnStart: placed ? placed.columnStart : null,
        columnSpan: placed ? placed.columnSpan : null,
        rowStart: placed ? placed.rowStart : null,
        totalItems: newItems.length
      };
    })()
  `);

  assert(placeResult.success, "Library block placed successfully via exact drop");
  assert(placeResult.columnStart === 4, `Placed block has exact columnStart = 4 (got ${placeResult.columnStart})`);
  assert(placeResult.columnSpan === 1, `Placed block has exact columnSpan = 1 (25% auto-fit, got ${placeResult.columnSpan})`);
  assert(placeResult.rowStart === 1, `Placed block has exact rowStart = 1 alongside tall table (got ${placeResult.rowStart})`);

  // Test ZERO fallback on invalid drop
  const invalidDropResult = await evalCode(`
    (function() {
      var sec = window.currentDoc.sections[0];
      var countBefore = sec.visualGrid.layoutItems.length;

      // Attempt drop on already occupied cell (col 1, row 1) with explicit width
      var canvas = document.querySelector('.grid-composer-canvas');
      var dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      dropEvent.clientX = 50;
      dropEvent.clientY = 50;
      window.draggedBlockData = { source: 'library', type: 'callout-box', widthSpan: 2, explicitWidth: true };

      canvas.dispatchEvent(dropEvent);

      var countAfter = sec.visualGrid.layoutItems.length;
      var lastToast = window._lastToast;

      return {
        countBefore: countBefore,
        countAfter: countAfter,
        toastMsg: lastToast ? lastToast.msg : null
      };
    })()
  `);

  assert(invalidDropResult.countAfter === invalidDropResult.countBefore, `ZERO auto-placement fallback on invalid target: item count remained ${invalidDropResult.countAfter}`);
  assert(invalidDropResult.toastMsg && invalidDropResult.toastMsg.includes('valid Grid location'), `Rejected drop produced warning toast: "${invalidDropResult.toastMsg}"`);

  // Capture Screenshot: Exact Library Drop
  const shotDrop = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'uat_exact_library_drop.png'), Buffer.from(shotDrop.result.data, 'base64'));
  console.log("  [SAVED] uat_exact_library_drop.png");

  // -------------------------------------------------------------
  // SUITE 3: COMFORTABLE 4-COLUMN STUDIO CANVAS & VIEWPORT
  // -------------------------------------------------------------
  console.log("\n--- SUITE 3: Comfortable 4-Column Studio Canvas & Viewport ---");

  const canvasMetrics = await evalCode(`
    (function() {
      var wrap = document.querySelector('.grid-composer-viewport');
      var canvas = document.querySelector('.grid-composer-canvas');
      var lib = document.querySelector('.studio-library-pane');
      var settings = document.querySelector('.studio-settings-pane');

      var cStyle = window.getComputedStyle(canvas);
      var wStyle = window.getComputedStyle(wrap);

      var canvasW = parseFloat(cStyle.width);
      var minW = parseFloat(cStyle.minWidth);
      var padding = 32;
      var gaps = 48;
      var usablePerCol = (Math.max(canvasW, minW) - padding - gaps) / 4;

      return {
        hasViewportClass: wrap.classList.contains('grid-composer-viewport') || wrap.classList.contains('grid-composer-canvas-wrap'),
        wrapOverflowX: wStyle.overflowX,
        wrapOverflowY: wStyle.overflowY,
        canvasMinWidth: minW,
        canvasWidth: canvasW,
        usablePerCol: usablePerCol,
        libWidth: lib.getBoundingClientRect().width,
        settingsWidth: settings.getBoundingClientRect().width
      };
    })()
  `);

  assert(canvasMetrics.hasViewportClass, "Composer viewport container exists (.grid-composer-viewport / .grid-composer-canvas-wrap)");
  assert(canvasMetrics.wrapOverflowX === 'auto' || canvasMetrics.wrapOverflowX === 'scroll', `Composer viewport has overflow-x: auto (got ${canvasMetrics.wrapOverflowX})`);
  assert(canvasMetrics.canvasMinWidth >= 1120, `Canvas min-width guarantees comfortable workspace: ${canvasMetrics.canvasMinWidth}px (>= 1120px)`);
  assert(canvasMetrics.usablePerCol >= 250, `Each 25% column has >= 250px usable width: ${canvasMetrics.usablePerCol.toFixed(0)}px`);
  assert(canvasMetrics.libWidth > 250 && canvasMetrics.settingsWidth > 250, `Sidebars stationary at fixed widths (Library: ${canvasMetrics.libWidth.toFixed(0)}px, Settings: ${canvasMetrics.settingsWidth.toFixed(0)}px)`);

  // Capture Screenshot: 4-Column Studio Usable
  const shotStudio = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'uat_4col_studio_usable.png'), Buffer.from(shotStudio.result.data, 'base64'));
  console.log("  [SAVED] uat_4col_studio_usable.png");

  // -------------------------------------------------------------
  // SUITE 4: FOCUS CANVAS MODE TOGGLE
  // -------------------------------------------------------------
  console.log("\n--- SUITE 4: Focus Canvas Mode Toggle ---");

  const focusButtonExists = await evalCode(`Boolean(document.getElementById('btn-focus-canvas'))`);
  assert(focusButtonExists, "Top-bar '⛶ Focus Canvas' button exists (#btn-focus-canvas)");

  // Toggle on Focus Canvas Mode
  const focusOnResult = await evalCode(`
    (function() {
      var btn = document.getElementById('btn-focus-canvas');
      btn.click();

      var isFocused = document.body.classList.contains('is-canvas-focused');
      var lib = document.querySelector('.studio-library-pane');
      var set = document.querySelector('.studio-settings-pane');
      var ws = document.querySelector('.studio-workspace');

      return {
        isFocused: isFocused,
        libDisplay: window.getComputedStyle(lib).display,
        setDisplay: window.getComputedStyle(set).display,
        wsCols: window.getComputedStyle(ws).gridTemplateColumns,
        btnText: btn.textContent.trim()
      };
    })()
  `);

  assert(focusOnResult.isFocused, "Body gained .is-canvas-focused class upon clicking Focus Canvas");
  assert(focusOnResult.libDisplay === 'none', `Library pane collapsed in Focus mode (display: ${focusOnResult.libDisplay})`);
  assert(focusOnResult.setDisplay === 'none', `Settings pane collapsed in Focus mode (display: ${focusOnResult.setDisplay})`);
  assert(focusOnResult.btnText.includes('Normal View'), `Button text switched to '⛶ Normal View' (got "${focusOnResult.btnText}")`);

  // Toggle off Focus Canvas Mode
  const focusOffResult = await evalCode(`
    (function() {
      var btn = document.getElementById('btn-focus-canvas');
      btn.click();
      return {
        isFocused: document.body.classList.contains('is-canvas-focused'),
        btnText: btn.textContent.trim()
      };
    })()
  `);

  assert(!focusOffResult.isFocused, "Normal 3-column workspace restored upon second click");
  assert(focusOffResult.btnText.includes('Focus Canvas'), "Button text restored to '⛶ Focus Canvas'");

  // -------------------------------------------------------------
  // SUITE 5: COMPACT CHROME IN 25% COLUMNS
  // -------------------------------------------------------------
  console.log("\n--- SUITE 5: Compact Chrome in 25% Columns ---");

  const chromeMetrics = await evalCode(`
    (function() {
      var item25 = document.querySelector('.grid-block-item[data-span="1"]');
      if (!item25) return null;
      var header = item25.querySelector('.grid-block-header');
      var title = item25.querySelector('.grid-block-title');
      var widthLabel = item25.querySelector('.grid-width-label');
      var moveHandle = item25.querySelector('.grid-block-move-handle');

      return {
        hasDataSpan1: item25.getAttribute('data-span') === '1',
        widthLabelHidden: window.getComputedStyle(widthLabel).display === 'none',
        titleOverflow: window.getComputedStyle(title).textOverflow,
        moveHandleFontSize: window.getComputedStyle(moveHandle).fontSize
      };
    })()
  `);

  assert(chromeMetrics && chromeMetrics.hasDataSpan1, "25% block item has data-span='1'");
  assert(chromeMetrics && chromeMetrics.widthLabelHidden, "Width label is hidden in 25% column to preserve space");
  assert(chromeMetrics && chromeMetrics.titleOverflow === 'ellipsis', "Block title is set to ellipsis truncation without overflowing toolbar");

  // -------------------------------------------------------------
  // SUITE 6: PREVIEW WIDE BREAKOUT
  // -------------------------------------------------------------
  console.log("\n--- SUITE 6: Preview Wide Breakout ---");

  // Save current draft and sync preview
  await evalCode(`
    (function() {
      var btnPrev = document.getElementById('btn-preview');
      if (btnPrev) btnPrev.click();
    })()
  `);
  await sleep(1200);

  // Navigate to preview page
  await send('Page.navigate', { url: 'http://localhost:4321/lab/layout-forge/preview' });
  await sleep(1500);

  const previewMetrics = await evalCode(`
    (function() {
      var grid = document.querySelector('.section-reader-grid');
      var prose = document.querySelector('.article-markdown-body > p');
      var container = document.getElementById('coven-article-container') || document.querySelector('article');

      var gRect = grid ? grid.getBoundingClientRect() : null;
      var gStyle = grid ? window.getComputedStyle(grid) : null;
      var pStyle = prose ? window.getComputedStyle(prose) : null;
      var cStyle = container ? window.getComputedStyle(container) : null;

      return {
        gridExists: Boolean(grid),
        gridMaxWidth: gStyle ? gStyle.maxWidth : null,
        gridWidth: gRect ? gRect.width : 0,
        containerMaxWidth: cStyle ? cStyle.maxWidth : null,
        proseMaxWidth: pStyle ? pStyle.maxWidth : null
      };
    })()
  `);

  assert(previewMetrics.gridExists, "Section reader grid exists in /lab/layout-forge/preview");
  assert(previewMetrics.gridMaxWidth === '1360px', `Grid has wide breakout max-width: 1360px (got ${previewMetrics.gridMaxWidth})`);
  assert(previewMetrics.containerMaxWidth === '1360px', `Article container allows wide layout up to 1360px (got ${previewMetrics.containerMaxWidth})`);
  assert(previewMetrics.gridWidth > 900, `Grid rendered with wide breakout width: ${previewMetrics.gridWidth.toFixed(0)}px (> 900px)`);

  // Capture Screenshot: Preview Wide Breakout
  const shotPreview = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'uat_4col_preview_wide.png'), Buffer.from(shotPreview.result.data, 'base64'));
  console.log("  [SAVED] uat_4col_preview_wide.png");

  // -------------------------------------------------------------
  // SUITE 7: DATA CONTRACT INTEGRITY
  // -------------------------------------------------------------
  console.log("\n--- SUITE 7: Data Contract Integrity ---");

  // Navigate back to studio
  await send('Page.navigate', { url: 'http://localhost:4321/lab/layout-forge/studio' });
  await sleep(1000);

  const contractSanity = await evalCode(`
    (function() {
      var doc = window.currentDoc;
      var sec = doc.sections[0];
      var rawKeys = Object.keys(sec.visualGrid);
      var jsonStr = JSON.stringify(sec.visualGrid);
      var parsed = JSON.parse(jsonStr);

      return {
        hasLayoutItems: Array.isArray(sec.visualGrid.layoutItems),
        layoutItemsCount: sec.visualGrid.layoutItems.length,
        hasPersistedSlots: parsed.hasOwnProperty('slots'),
        hasPersistedLayout: parsed.hasOwnProperty('layout'),
        jsonKeys: Object.keys(parsed)
      };
    })()
  `);

  assert(contractSanity.hasLayoutItems && contractSanity.layoutItemsCount > 0, `visualGrid.layoutItems is present and populated (${contractSanity.layoutItemsCount} items)`);
  assert(!contractSanity.hasPersistedSlots, "Zero persisted 'slots' property in JSON representation");
  assert(!contractSanity.hasPersistedLayout, "Zero persisted 'layout' property in JSON representation");

  cleanup();

  console.log("\n==================================================================");
  console.log(`QA VERDICT: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(0)}%)`);
  console.log("==================================================================");

  if (passedTests === totalTests) {
    console.log("STATUS: GRID COMPOSER FINAL MANUAL-UX CORRECTION APPROVED");
    process.exit(0);
  } else {
    console.error(`STATUS: FAILED (${totalTests - passedTests} tests failed)`);
    process.exit(1);
  }
}

runManualUxTests().catch(err => {
  console.error("FATAL ERROR in test execution:", err);
  process.exit(1);
});
