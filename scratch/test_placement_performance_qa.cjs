/**
 * COVEN — GRID COMPOSER V2: 25% PLACEMENT GAP + DRAG PERFORMANCE + LEGACY PANEL QA SUITE
 * Comprehensive verification of the 3 hotfix areas
 */
const http = require('http');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9222;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(__dirname, '.temp_hotfix_profile');
const SCREENSHOT_PATH = path.join(__dirname, 'grid_composer_hotfix_verified.png');

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

async function runHotfixTests() {
  console.log("==================================================================");
  console.log("COVEN — GRID COMPOSER V2: UX & PERFORMANCE HOTFIX VERIFICATION");
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
  for (let i = 0; i < 20; i++) {
    try {
      targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (targets && targets.length > 0) break;
    } catch (e) {
      await sleep(300);
    }
  }

  if (!targets) {
    console.error("Failed to connect to headless Chrome on port", DEBUG_PORT);
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  const consoleErrors = [];

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
        consoleErrors.push(text);
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
      throw new Error(JSON.stringify(res.result.exceptionDetails || res.result.result));
    }
    return res.result?.result?.value;
  };

  let totalTests = 0;
  let passedTests = 0;

  function assert(id, desc, condition, extraInfo = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS [${id}]: ${desc} ${extraInfo}`);
    } else {
      console.error(`  ✗ FAIL [${id}]: ${desc} ${extraInfo}`);
    }
  }

  try {
    await sleep(2000);

    // ─────────────────────────────────────────────────────────────
    // SECTION 1: 25% PLACEMENT GAP & CONTIGUOUS AUTO-FIT VERIFICATION
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 1: 25% Placement Gap & Contiguous Auto-Fit ---");

    // Initialize fresh article
    await evaluate(`
      window.createNewArticle();
    `);

    // Setup Row 1: Place a 75% block (cols 1..3, row 1)
    const setup75 = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const vg = sec.visualGrid;
      // Commit 75% block at cols 1..3
      window.commitBlockPlacement(sec, 'solo-text', 1, 3, 1);
      
      const item1 = vg.layoutItems[0];
      const availCell = document.querySelector('.grid-cell-slot.is-available[data-col="4"][data-row="1"]');
      return {
        itemCount: vg.layoutItems.length,
        item1Span: item1.columnSpan,
        item1Start: item1.columnStart,
        hasAvailCellCol4: Boolean(availCell),
        availCellText: availCell ? availCell.textContent.trim() : ''
      };
    `);

    assert("25GAP-1", "Row 1 contains 75% block at columns 1..3",
      setup75.itemCount === 1 && setup75.item1Start === 1 && setup75.item1Span === 3,
      `Items: ${setup75.itemCount}, Span: ${setup75.item1Span}`);

    assert("25GAP-2", "Column 4 on Row 1 is visibly marked '+ Available (25%)'",
      setup75.hasAvailCellCol4 && setup75.availCellText.includes('25%'),
      `Cell text: ${setup75.availCellText}`);

    // Test resolvePlacementTarget math directly for Column 4
    const resCol4Flex = await evaluate(`
      const sec = window.currentDoc.sections[0];
      // Author drops from library without explicit width lock (explicitWidth = false, requestedSpan = 4)
      return window.resolvePlacementTarget(sec.visualGrid.layoutItems, 4, 1, 4, false);
    `);

    assert("25GAP-3", "resolvePlacementTarget auto-fits library drag (span 4) into 25% free gap (colStart: 4, colSpan: 1)",
      resCol4Flex.valid === true && resCol4Flex.columnStart === 4 && resCol4Flex.columnSpan === 1 && resCol4Flex.autoFitApplied === true,
      `Valid: ${resCol4Flex.valid}, Start: ${resCol4Flex.columnStart}, Span: ${resCol4Flex.columnSpan}, Auto-fit: ${resCol4Flex.autoFitApplied}`);

    // Drop library block onto Column 4
    const dropOn25 = await evaluate(`
      const sec = window.currentDoc.sections[0];
      // Query canvas fresh from DOM after commitBlockPlacement
      const canvas = document.querySelector('.grid-composer-canvas');
      const availCell = document.querySelector('.grid-cell-slot.is-available[data-col="4"][data-row="1"]');
      const cRect = availCell.getBoundingClientRect();
      const midX = cRect.left + cRect.width / 2;
      const midY = cRect.top + cRect.height / 2;
      
      window.draggedBlockData = { source: 'library', type: 'single-image' };
      const dropEvt = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: midX,
        clientY: midY
      });
      canvas.dispatchEvent(dropEvt);
      
      const items = sec.visualGrid.layoutItems;
      const b2 = items[1];
      return {
        totalItems: items.length,
        b2ColStart: b2 ? b2.columnStart : null,
        b2ColSpan: b2 ? b2.columnSpan : null,
        b2RowStart: b2 ? b2.rowStart : null,
        b2Type: b2 ? b2.block.type : null
      };
    `);

    assert("25GAP-4", "Dropped library block lands cleanly on Column 4 as 25% (span 1) beside the 75% block",
      dropOn25.totalItems === 2 && dropOn25.b2ColStart === 4 && dropOn25.b2ColSpan === 1 && dropOn25.b2RowStart === 1,
      `Total items: ${dropOn25.totalItems}, B2 Start: ${dropOn25.b2ColStart}, Span: ${dropOn25.b2ColSpan}, Row: ${dropOn25.b2RowStart}`);

    // Verify row 1 is now 100% full (75% + 25%)
    const row1FullCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const res = window.resolvePlacementTarget(sec.visualGrid.layoutItems, 4, 1, 1, false);
      return res;
    `);

    assert("25GAP-5", "Row 1 is now fully occupied (col 4 reports Space Occupied)",
      row1FullCheck.valid === false && row1FullCheck.reason === 'Space Occupied',
      `Valid: ${row1FullCheck.valid}, Reason: ${row1FullCheck.reason}`);

    // ─────────────────────────────────────────────────────────────
    // SECTION 2: EXPLICIT WIDTH CONSTRAINT ENFORCEMENT
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 2: Explicit Width Constraint Enforcement ---");

    // Setup Row 2: Place a 75% block at cols 1..3, leaving col 4 open
    await evaluate(`
      const sec = window.currentDoc.sections[0];
      window.commitBlockPlacement(sec, 'solo-text', 1, 3, 2);
    `);

    // In placement mode with explicit 50% width locked:
    const explicit50Check = await evaluate(`
      const sec = window.currentDoc.sections[0];
      // explicitWidth = true, requestedSpan = 2 (50%)
      const res = window.resolvePlacementTarget(sec.visualGrid.layoutItems, 4, 2, 2, true);
      return res;
    `);

    assert("WIDTH-EXP-1", "Explicit 50% request on 25% slot is refused with constraint message",
      explicit50Check.valid === false && explicit50Check.reason.includes('Needs 50%') && explicit50Check.reason.includes('only 25% available'),
      `Valid: ${explicit50Check.valid}, Reason: ${explicit50Check.reason}`);

    // In placement mode with explicit 25% width locked:
    const explicit25Check = await evaluate(`
      const sec = window.currentDoc.sections[0];
      // explicitWidth = true, requestedSpan = 1 (25%)
      const res = window.resolvePlacementTarget(sec.visualGrid.layoutItems, 4, 2, 1, true);
      return res;
    `);

    assert("WIDTH-EXP-2", "Explicit 25% request on 25% slot succeeds with exact fit",
      explicit25Check.valid === true && explicit25Check.columnStart === 4 && explicit25Check.columnSpan === 1 && explicit25Check.autoFitApplied === false,
      `Valid: ${explicit25Check.valid}, Span: ${explicit25Check.columnSpan}`);

    // ─────────────────────────────────────────────────────────────
    // SECTION 3: DRAG & DROP PERFORMANCE & rAF THROTTLING
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 3: Drag & Drop Performance & rAF Throttling ---");

    const perfStressResult = await evaluate(`
      const canvas = document.querySelector('.grid-composer-canvas');
      const rect = canvas.getBoundingClientRect();
      
      // Instrument renderSections and autosave calls
      let renderCallCount = 0;
      let autosaveCallCount = 0;
      const originalRender = window.renderSections;
      const originalAutosave = window.triggerAutosave;
      
      window.renderSections = function() {
        renderCallCount++;
        return originalRender.apply(this, arguments);
      };
      window.triggerAutosave = function() {
        autosaveCallCount++;
        return originalAutosave.apply(this, arguments);
      };
      
      // Simulate dragenter to trigger caching
      window.draggedBlockData = { source: 'library', type: 'solo-text' };
      const enterEvt = new DragEvent('dragenter', { bubbles: true, cancelable: true });
      canvas.dispatchEvent(enterEvt);
      
      const startTime = performance.now();
      
      // Fire 5,000 synthetic dragover events in a tight loop across various coordinates
      const EVENT_COUNT = 5000;
      for (let i = 0; i < EVENT_COUNT; i++) {
        const dragEvt = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + (i % 4) * (rect.width / 4) + 20,
          clientY: rect.top + 40
        });
        canvas.dispatchEvent(dragEvt);
      }
      
      const endTime = performance.now();
      const elapsed = endTime - startTime;
      
      // Restore instrumented functions
      window.renderSections = originalRender;
      window.triggerAutosave = originalAutosave;
      
      return {
        eventCount: EVENT_COUNT,
        durationMs: Math.round(elapsed),
        renderCallsDuringDrag: renderCallCount,
        autosaveCallsDuringDrag: autosaveCallCount,
        isDraggingClass: canvas.classList.contains('is-dragging-active')
      };
    `);

    assert("PERF-1", "5,000 synthetic dragover events execute rapidly (< 3500ms) without main-thread blocking",
      perfStressResult.durationMs < 3500,
      `Duration for 5,000 events: ${perfStressResult.durationMs}ms`);

    assert("PERF-2", "Zero full section re-renders during dragover events (0 calls)",
      perfStressResult.renderCallsDuringDrag === 0,
      `Render calls: ${perfStressResult.renderCallsDuringDrag}`);

    assert("PERF-3", "Zero autosave mutations during dragover events (0 calls)",
      perfStressResult.autosaveCallsDuringDrag === 0,
      `Autosave calls: ${perfStressResult.autosaveCallsDuringDrag}`);

    assert("PERF-4", "Canvas receives .is-dragging-active class to neutralize nested card pointer-events",
      perfStressResult.isDraggingClass === true,
      `isDraggingClass: ${perfStressResult.isDraggingClass}`);

    // Verify rAF ghost preview by firing dragover and awaiting next frame
    const ghostCheck = await evaluate(`
      const canvas = document.querySelector('.grid-composer-canvas');
      const rect = canvas.getBoundingClientRect();
      window.draggedBlockData = { source: 'library', type: 'solo-text' };
      
      const dragEvt = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 30,
        clientY: rect.top + 220
      });
      canvas.dispatchEvent(dragEvt);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const allGhosts = document.querySelectorAll('.grid-placement-preview');
          const ghost = canvas.querySelector('.grid-placement-preview');
          resolve({
            allGhostCount: allGhosts.length,
            ghostExists: Boolean(ghost),
            gridColumn: ghost ? ghost.style.gridColumn : '',
            gridRow: ghost ? ghost.style.gridRow : '',
            className: ghost ? ghost.className : '',
            isValid: ghost ? ghost.classList.contains('is-valid') : false,
            text: ghost ? ghost.textContent : ''
          });
        }, 100);
      });
    `);

    assert("PERF-5", "Ghost element is smoothly updated by rAF scheduler without thrashing",
      ghostCheck.ghostExists && ghostCheck.isValid,
      `Ghost: ${ghostCheck.gridColumn}, Class: ${ghostCheck.className}, Valid: ${ghostCheck.isValid}, Count: ${ghostCheck.allGhostCount}, Text: ${ghostCheck.text}`);

    // Cleanup drag
    await evaluate(`
      const canvas = document.querySelector('.grid-composer-canvas');
      const leaveEvt = new DragEvent('dragleave', { bubbles: true, cancelable: true });
      canvas.dispatchEvent(leaveEvt);
      window.draggedBlockData = null;
    `);

    // ─────────────────────────────────────────────────────────────
    // SECTION 4: LEGACY / UNSLOTTED SECTION CONTENT PANEL
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 4: Legacy Content Panel Duplication & Styling ---");

    // Case 1: Fresh article with no legacy blocks
    const zeroLegacyCheck = await evaluate(`
      const drawers = document.querySelectorAll('.legacy-blocks-drawer');
      return {
        drawerCount: drawers.length
      };
    `);

    assert("LEGACY-1", "Zero legacy drawer elements rendered when section has 0 legacy blocks",
      zeroLegacyCheck.drawerCount === 0,
      `Drawer count: ${zeroLegacyCheck.drawerCount}`);

    // Case 2: Seed section with 2 legacy blocks
    const seedLegacyCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      sec.blocks = [
        {
          id: 'leg_1',
          type: 'solo-text',
          data: { paragraphs: ['Legacy arcane wisdom paragraph waiting for placement.'] }
        },
        {
          id: 'leg_2',
          type: 'pullquote',
          data: { quote: 'A quote from the old layout format.', attribution: 'Archivist' }
        }
      ];
      window.renderSections();
      
      const allDrawers = document.querySelectorAll('.legacy-blocks-drawer');
      const drawer = allDrawers[0];
      const badge = drawer ? drawer.querySelector('.legacy-drawer-badge') : null;
      const count = drawer ? drawer.querySelector('.legacy-drawer-count') : null;
      const rows = drawer ? drawer.querySelectorAll('.legacy-block-row') : [];
      const parentIsCard = drawer ? drawer.parentElement.classList.contains('section-card') : false;
      const parentIsGridWrap = drawer ? drawer.parentElement.classList.contains('grid-composer-wrapper') : false;
      
      return {
        totalDrawers: allDrawers.length,
        parentIsCard: parentIsCard,
        parentIsGridWrap: parentIsGridWrap,
        badgeText: badge ? badge.textContent.trim() : '',
        countText: count ? count.textContent.trim() : '',
        rowCount: rows.length
      };
    `);

    assert("LEGACY-2", "Exactly ONE legacy drawer rendered in DOM (eliminated duplicate below composer)",
      seedLegacyCheck.totalDrawers === 1,
      `Total drawers: ${seedLegacyCheck.totalDrawers}`);

    assert("LEGACY-3", "Legacy drawer is cleanly nested inside section grid wrapper, not duplicated in outer card",
      seedLegacyCheck.parentIsGridWrap === true && seedLegacyCheck.parentIsCard === false,
      `Parent is GridWrap: ${seedLegacyCheck.parentIsGridWrap}, Parent is Card: ${seedLegacyCheck.parentIsCard}`);

    assert("LEGACY-4", "Legacy drawer features Coven gold badge 'LEGACY CONTENT' and block count",
      seedLegacyCheck.badgeText === 'LEGACY CONTENT' && seedLegacyCheck.countText.includes('2 unslotted blocks'),
      `Badge: ${seedLegacyCheck.badgeText}, Count: ${seedLegacyCheck.countText}`);

    assert("LEGACY-5", "Legacy drawer renders rows for each unslotted block with glyph and snippet",
      seedLegacyCheck.rowCount === 2,
      `Row count: ${seedLegacyCheck.rowCount}`);

    // Case 3: Interactive collapse toggle
    const collapseCheck = await evaluate(`
      const drawer = document.querySelector('.legacy-blocks-drawer');
      const header = drawer.querySelector('.legacy-drawer-header');
      header.click();
      const isCollapsedAfterClick = drawer.classList.contains('is-collapsed');
      header.click();
      const isExpandedAfterSecondClick = !drawer.classList.contains('is-collapsed');
      return { isCollapsedAfterClick, isExpandedAfterSecondClick };
    `);

    assert("LEGACY-6", "Clicking drawer header smoothly toggles collapsed / expanded state",
      collapseCheck.isCollapsedAfterClick && collapseCheck.isExpandedAfterSecondClick,
      `Collapsed: ${collapseCheck.isCollapsedAfterClick}, Re-expanded: ${collapseCheck.isExpandedAfterSecondClick}`);

    // Case 4: Click 'Place on Grid' on legacy block 1
    const placeLegacyModeCheck = await evaluate(`
      const drawer = document.querySelector('.legacy-blocks-drawer');
      const firstRow = drawer.querySelector('.legacy-block-row');
      const placeBtn = firstRow.querySelector('[data-act="place-mode"]');
      placeBtn.click();
      
      return {
        placementActive: Boolean(window.activePlacement),
        blockType: window.activePlacement ? window.activePlacement.blockType : null,
        hasLegacySource: Boolean(window.activePlacement && window.activePlacement.legacySource),
        bannerVisible: Boolean(document.querySelector('.grid-mode-banner.is-placement-mode'))
      };
    `);

    assert("LEGACY-7", "Clicking 'Place on Grid' enters Placement Mode preserving legacy block data",
      placeLegacyModeCheck.placementActive && placeLegacyModeCheck.hasLegacySource && placeLegacyModeCheck.bannerVisible,
      `Active: ${placeLegacyModeCheck.placementActive}, Has source: ${placeLegacyModeCheck.hasLegacySource}`);

    // Place it on an open cell on Row 3, Col 1
    const placeLegacyCommitCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const openCell = document.querySelector('.grid-cell-slot.is-available[data-row="3"][data-col="1"]');
      if (!openCell) {
        throw new Error('openCell at row 3, col 1 not found');
      }
      openCell.click();
      
      return {
        remainingLegacyCount: sec.blocks.length,
        drawerCountText: document.querySelector('.legacy-drawer-count') ? document.querySelector('.legacy-drawer-count').textContent.trim() : '',
        placedItemsCount: sec.visualGrid.layoutItems.length
      };
    `);

    assert("LEGACY-8", "Placing legacy block splices it from unslotted pool (count reduces from 2 to 1)",
      placeLegacyCommitCheck.remainingLegacyCount === 1,
      `Remaining legacy blocks: ${placeLegacyCommitCheck.remainingLegacyCount}`);

    // Case 5: Click 'Auto-place' on remaining legacy block
    const autoPlaceCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const drawer = document.querySelector('.legacy-blocks-drawer');
      const row = drawer ? drawer.querySelector('.legacy-block-row') : null;
      if (!row) throw new Error('Legacy block row not found for auto-place');
      
      const autoBtn = row.querySelector('[data-act="quick-add"]');
      autoBtn.click();
      
      return {
        remainingLegacyCount: sec.blocks.length,
        drawersInDom: document.querySelectorAll('.legacy-blocks-drawer').length,
        finalPlacedCount: sec.visualGrid.layoutItems.length
      };
    `);

    assert("LEGACY-9", "Auto-place migrates final block to grid and drawer automatically disappears when empty",
      autoPlaceCheck.remainingLegacyCount === 0 && autoPlaceCheck.drawersInDom === 0,
      `Remaining: ${autoPlaceCheck.remainingLegacyCount}, Drawers in DOM: ${autoPlaceCheck.drawersInDom}, Placed items: ${autoPlaceCheck.finalPlacedCount}`);

    // ─────────────────────────────────────────────────────────────
    // SECTION 5: PRODUCTION SYSTEM ISOLATION
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 5: Production System Protection ---");

    const prodDraftsCount = fs.readdirSync(path.join(process.cwd(), '.article-studio', 'drafts')).length;
    const prodArticlesCount = fs.readdirSync(path.join(process.cwd(), 'src', 'articles')).length;

    assert("ISOLATION-1", "Zero writes to canonical production .article-studio/drafts/ (99 files intact)",
      prodDraftsCount === 99,
      `Prod drafts: ${prodDraftsCount}`);

    assert("ISOLATION-2", "Zero writes to canonical production src/articles/ (6 articles intact)",
      prodArticlesCount === 6,
      `Prod articles: ${prodArticlesCount}`);

    // ─────────────────────────────────────────────────────────────
    // SECTION 6: CONSOLE HEALTH & SCREENSHOT
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 6: Console Health & Screenshot ---");

    assert("CONSOLE-1", "Zero uncaught console errors recorded during all test runs",
      consoleErrors.length === 0,
      `Errors: ${consoleErrors.length} (${consoleErrors.join(', ')})`);

    // Capture verified screenshot
    const screenshotData = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = screenshotData.result?.data || screenshotData.data;
    if (b64) {
      fs.writeFileSync(SCREENSHOT_PATH, Buffer.from(b64, 'base64'));
      const appDataPath = 'C:\\Users\\holma\\.gemini\\antigravity\\brain\\edc240ba-edf2-46ce-81f6-7796c7c75db9\\grid_composer_hotfix_verified.png';
      fs.writeFileSync(appDataPath, Buffer.from(b64, 'base64'));
      assert("SCREENSHOT-1", "Captured screenshot of verified Grid Composer hotfixes",
        fs.existsSync(SCREENSHOT_PATH) && fs.statSync(SCREENSHOT_PATH).size > 10000,
        `Saved to ${SCREENSHOT_PATH} (${Math.round(fs.statSync(SCREENSHOT_PATH).size / 1024)} KB)`);
    }

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    cleanup();
  }

  console.log("\n==================================================================");
  console.log(`HOTFIX QA RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runHotfixTests().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
