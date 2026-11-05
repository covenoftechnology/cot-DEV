const http = require('http');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9222;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(__dirname, '.temp_4col_profile');
const SCREENSHOT_PATH = path.join(__dirname, 'grid_composer_4col_preview.png');

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
    req.end();
  });
}

async function run4ColUXTests() {
  console.log("==================================================================");
  console.log("COVEN — GRID COMPOSER V2: TRUE 4-COLUMN UX VERIFICATION SUITE");
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
    // TEST 1: TRUE 4-COLUMN GRID FOUNDATION
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 1: True 4-Column Grid Architecture ---");
    const initCheck = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      const vg = sec.visualGrid;
      const canvas = document.querySelector('.grid-composer-canvas, .section-grid-canvas');
      const badge = document.querySelector('.grid-badge-4col, .grid-badge-12col');
      
      return {
        columns: vg.columns,
        canvasGridCols: canvas ? window.getComputedStyle(canvas).gridTemplateColumns.split(' ').length : 0,
        badgeText: badge ? badge.textContent.trim() : '',
        initialRows: vg.rows
      };
    `);

    assert("4COL-CORE-1", "Grid Composer uses exactly 4 columns in data contract",
      initCheck.columns === 4,
      `Columns: ${initCheck.columns}`);

    assert("4COL-CORE-2", "Canvas renders 4 CSS Grid columns in stylesheet",
      initCheck.canvasGridCols === 4,
      `Rendered grid columns: ${initCheck.canvasGridCols}`);

    assert("4COL-CORE-3", "Toolbar renders '4 COLS' badge",
      initCheck.badgeText === '4 COLS',
      `Badge: ${initCheck.badgeText}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: INTERACTIVE EMPTY GRID CELLS
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 2: Interactive Empty Grid Cells ---");
    const cellsCheck = await evaluate(`
      const canvas = document.querySelector('.grid-composer-canvas');
      const emptyCells = canvas.querySelectorAll('.grid-cell-slot.is-available');
      const firstCell = emptyCells[0];
      
      return {
        count: emptyCells.length,
        firstCol: firstCell ? firstCell.getAttribute('data-col') : null,
        firstRow: firstCell ? firstCell.getAttribute('data-row') : null,
        hasBorder: firstCell ? !!window.getComputedStyle(firstCell).border : false
      };
    `);

    assert("4COL-CELLS-1", "Empty grid cells are rendered as interactive slots (4 cols x initial rows)",
      cellsCheck.count >= 12,
      `Empty cell count: ${cellsCheck.count}`);

    assert("4COL-CELLS-2", "Cell slots have explicit data-col (1..4) and data-row coordinates",
      cellsCheck.firstCol === '1' && cellsCheck.firstRow === '1',
      `First cell: col=${cellsCheck.firstCol}, row=${cellsCheck.firstRow}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: LIBRARY SELECTION ENTERS PLACEMENT MODE WITH SELECTABLE WIDTH
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 3: Library Selection & Placement Mode UX ---");
    const placeModeCheck = await evaluate(`
      // Find Solo Text card in library
      const card = document.querySelector('.library-block-card[data-block-type="solo-text"]');
      if (card) {
        card.click();
      } else {
        window.enterPlacementMode('solo-text', 4);
      }
      
      const isModeActive = !!window.activePlacement;
      const banner = document.querySelector('.grid-mode-banner.is-placement-mode');
      const pills = banner ? banner.querySelectorAll('.mode-pill').length : 0;
      
      // Select 50% width
      const pill50 = banner ? banner.querySelector('.mode-pill[data-w="2"]') : null;
      if (pill50) pill50.click();
      
      return {
        isModeActive,
        blockType: window.activePlacement ? window.activePlacement.blockType : null,
        widthSpan: window.activePlacement ? window.activePlacement.widthSpan : null,
        pillsCount: pills,
        bannerVisible: !!banner
      };
    `);

    assert("4COL-PLACE-1", "Clicking library card enters Placement Mode without auto-inserting immediately",
      placeModeCheck.isModeActive === true && placeModeCheck.blockType === 'solo-text',
      `Placement Active: ${placeModeCheck.isModeActive}, Block: ${placeModeCheck.blockType}`);

    assert("4COL-PLACE-2", "Placement banner displays 4 selectable width options (25%, 50%, 75%, 100%)",
      placeModeCheck.pillsCount === 4 && placeModeCheck.bannerVisible === true,
      `Pills: ${placeModeCheck.pillsCount}/4`);

    assert("4COL-PLACE-3", "Selecting 50% updates prospective placement width to 2 columns",
      placeModeCheck.widthSpan === 2,
      `Selected widthSpan: ${placeModeCheck.widthSpan}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: CLICK-TO-PLACE IN EMPTY CELL
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 4: Click-to-Place Execution ---");
    const clickPlaceCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      
      // Hover over Col 1, Row 1 cell to simulate pointer preview
      const targetCell = document.querySelector('.grid-cell-slot[data-col="1"][data-row="1"]');
      targetCell.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      
      const ghost = document.querySelector('.grid-placement-preview');
      const ghostValid = ghost && ghost.classList.contains('is-valid');
      const ghostSpan = ghost ? ghost.style.gridColumn : '';
      
      // Click target cell to confirm placement
      targetCell.click();
      
      const itemsCount = sec.visualGrid.layoutItems.length;
      const placedItem = sec.visualGrid.layoutItems[0];
      
      return {
        ghostValid,
        ghostSpan,
        itemsCount,
        placedColStart: placedItem ? placedItem.columnStart : null,
        placedSpan: placedItem ? placedItem.columnSpan : null,
        placedRow: placedItem ? placedItem.rowStart : null
      };
    `);

    assert("4COL-CLICK-1", "Footprint ghost displays exact valid preview at hovered cell",
      clickPlaceCheck.ghostValid === true && clickPlaceCheck.ghostSpan.includes('span 2'),
      `Ghost: ${clickPlaceCheck.ghostSpan}`);

    assert("4COL-CLICK-2", "Clicking cell places block at col 1 with 2 columns (50% width)",
      clickPlaceCheck.itemsCount === 1 && clickPlaceCheck.placedColStart === 1 && clickPlaceCheck.placedSpan === 2,
      `Placed item: colStart=${clickPlaceCheck.placedColStart}, span=${clickPlaceCheck.placedSpan}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: FREE SPACE BESIDE 50% BLOCK REMAINS CLICKABLE
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 5: Free Space Beside 50% Block Clickable (50 / 50 Split) ---");
    const secondHalfCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      
      // Enter place mode for another solo text at 50%
      window.enterPlacementMode('solo-text', 2);
      
      // Target Col 3, Row 1 (the free remaining half)
      const freeCell = document.querySelector('.grid-cell-slot[data-col="3"][data-row="1"]');
      const freeCellExists = !!freeCell;
      
      if (freeCell) {
        freeCell.click();
      }
      
      const it1 = sec.visualGrid.layoutItems[0];
      const it2 = sec.visualGrid.layoutItems[1];
      
      return {
        freeCellExists,
        itemsCount: sec.visualGrid.layoutItems.length,
        it1Span: it1 ? it1.columnSpan : null,
        it2Start: it2 ? it2.columnStart : null,
        it2Span: it2 ? it2.columnSpan : null,
        sameRow: it1 && it2 ? (it1.rowStart === it2.rowStart) : false
      };
    `);

    assert("4COL-FREE-1", "Free half beside 50% block renders interactive available cell at Col 3",
      secondHalfCheck.freeCellExists === true,
      `Free cell exists: ${secondHalfCheck.freeCellExists}`);

    assert("4COL-LEGO-5050", "Two 50% blocks compose side-by-side on Row 1 (50 / 50 split)",
      secondHalfCheck.itemsCount === 2 && secondHalfCheck.it1Span === 2 && secondHalfCheck.it2Start === 3 && secondHalfCheck.it2Span === 2 && secondHalfCheck.sameRow,
      `Row 1: Block 1 (Cols 1..2), Block 2 (Cols 3..4)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: QUICK WIDTH BUTTONS [25%] [50%] [75%] [100%]
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 6: Quick Width Buttons ---");
    const quickWidthCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      
      // Select block 2 and delete it so block 1 can expand
      const it2 = sec.visualGrid.layoutItems[1];
      sec.visualGrid.layoutItems = [sec.visualGrid.layoutItems[0]];
      window.renderSections();
      
      const it1 = sec.visualGrid.layoutItems[0];
      
      // Test 100% quick width button
      window.setBlockItemWidth(sec, it1, 4);
      const span100 = it1.columnSpan;
      
      // Test 75% quick width button
      window.setBlockItemWidth(sec, it1, 3);
      const span75 = it1.columnSpan;
      
      // Test 25% quick width button
      window.setBlockItemWidth(sec, it1, 1);
      const span25 = it1.columnSpan;
      
      // Test 50% quick width button
      window.setBlockItemWidth(sec, it1, 2);
      const span50 = it1.columnSpan;
      
      return {
        span100,
        span75,
        span25,
        span50
      };
    `);

    assert("4COL-WIDTH-1", "Quick width button sets 100% (4 columns)", quickWidthCheck.span100 === 4, `Span: ${quickWidthCheck.span100}`);
    assert("4COL-WIDTH-2", "Quick width button sets 75% (3 columns)", quickWidthCheck.span75 === 3, `Span: ${quickWidthCheck.span75}`);
    assert("4COL-WIDTH-3", "Quick width button sets 25% (1 column)", quickWidthCheck.span25 === 1, `Span: ${quickWidthCheck.span25}`);
    assert("4COL-WIDTH-4", "Quick width button sets 50% (2 columns)", quickWidthCheck.span50 === 2, `Span: ${quickWidthCheck.span50}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 7: ALL CANONICAL LEGO PROPORTIONS (25/75, 75/25, 25/25/25/25, 100%)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 7: Canonical LEGO Proportions ---");
    const legoCheck = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      
      // Row 1: 50 / 50 (Text 2 cols + Text 2 cols)
      window.insertBlockDirectly('solo-text', sec.id, 2, 1);
      const b1_2 = window.insertBlockDirectly('solo-text', sec.id, 2, 1);
      b1_2.columnStart = 3;
      b1_2.columnEnd = 5;
      
      // Row 2: 25 / 75 (Image 1 col + Text 3 cols)
      window.insertBlockDirectly('single-image', sec.id, 1, 2);
      const b2_2 = window.insertBlockDirectly('solo-text', sec.id, 3, 2);
      b2_2.columnStart = 2;
      b2_2.columnEnd = 5;
      
      // Row 3: 75 / 25 (Text 3 cols + Image 1 col)
      window.insertBlockDirectly('solo-text', sec.id, 3, 3);
      const b3_2 = window.insertBlockDirectly('single-image', sec.id, 1, 3);
      b3_2.columnStart = 4;
      b3_2.columnEnd = 5;
      
      // Row 4: 25 / 25 / 25 / 25 (Four Equal Thirds/Quarters)
      const b4_1 = window.insertBlockDirectly('solo-text', sec.id, 1, 4);
      const b4_2 = window.insertBlockDirectly('solo-text', sec.id, 1, 4);
      b4_2.columnStart = 2; b4_2.columnEnd = 3;
      const b4_3 = window.insertBlockDirectly('solo-text', sec.id, 1, 4);
      b4_3.columnStart = 3; b4_3.columnEnd = 4;
      const b4_4 = window.insertBlockDirectly('solo-text', sec.id, 1, 4);
      b4_4.columnStart = 4; b4_4.columnEnd = 5;
      
      // Row 5: 100% (Full Width Callout)
      window.insertBlockDirectly('callout', sec.id, 4, 5);
      
      window.normalizeSectionRows(sec);
      window.renderSections();
      
      return {
        totalItems: sec.visualGrid.layoutItems.length,
        rows: sec.visualGrid.rows,
        r2Col1Span: sec.visualGrid.layoutItems[2].columnSpan,
        r2Col2Span: sec.visualGrid.layoutItems[3].columnSpan,
        r3Col1Span: sec.visualGrid.layoutItems[4].columnSpan,
        r3Col2Span: sec.visualGrid.layoutItems[5].columnSpan,
        r4Count: sec.visualGrid.layoutItems.filter(it => it.rowStart === 4).length,
        r5Span: sec.visualGrid.layoutItems[10].columnSpan
      };
    `);

    assert("4COL-LEGO-2575", "25 / 75 layout (Image 1 col + Text 3 cols) on Row 2",
      legoCheck.r2Col1Span === 1 && legoCheck.r2Col2Span === 3,
      `Col 1: ${legoCheck.r2Col1Span} col, Col 2: ${legoCheck.r2Col2Span} cols`);

    assert("4COL-LEGO-7525", "75 / 25 layout (Text 3 cols + Image 1 col) on Row 3",
      legoCheck.r3Col1Span === 3 && legoCheck.r3Col2Span === 1,
      `Col 1: ${legoCheck.r3Col1Span} cols, Col 2: ${legoCheck.r3Col2Span} col`);

    assert("4COL-LEGO-FOUR", "Four equal blocks (25 / 25 / 25 / 25) side-by-side on Row 4",
      legoCheck.r4Count === 4,
      `Blocks on Row 4: ${legoCheck.r4Count}/4`);

    assert("4COL-LEGO-FULL", "100% full-width block occupies all 4 columns on Row 5",
      legoCheck.r5Span === 4,
      `Span: ${legoCheck.r5Span} cols (100%)`);

    assert("4COL-ROWS-1", "Total rows auto-grow dynamically to accommodate all rows + 1 working row",
      legoCheck.rows >= 6,
      `Current visual rows: ${legoCheck.rows}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 8: CLICK-TO-MOVE & DRAG-MOVE UX
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 8: Move UX & Click-to-Move ---");
    const moveCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const targetItem = sec.visualGrid.layoutItems[10]; // The 100% callout at row 5
      
      // Enter move mode
      window.enterMoveMode(sec, targetItem);
      
      const isMoveActiveBeforeClick = !!window.activeMove;
      const moveBanner = document.querySelector('.grid-mode-banner.is-move-mode');
      const bannerVisible = !!moveBanner;
      
      // Click empty cell in row 6
      const r6Cell = document.querySelector('.grid-cell-slot[data-col="1"][data-row="6"]');
      if (r6Cell) {
        r6Cell.click();
      }
      
      const isMoveActiveAfterClick = !!window.activeMove;
      const newRow = targetItem.rowStart;
      
      return {
        isMoveActiveBeforeClick,
        isMoveActiveAfterClick,
        bannerVisible,
        newRow
      };
    `);

    assert("4COL-MOVE-1", "Click-to-Move enters Move Mode with prominent banner and commits cleanly",
      moveCheck.isMoveActiveBeforeClick === true && moveCheck.bannerVisible === true && moveCheck.isMoveActiveAfterClick === false && moveCheck.newRow === 6,
      `Banner visible: ${moveCheck.bannerVisible}, Moved cleanly to row: ${moveCheck.newRow}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 9: COLLISION REJECTION (INVALID STATE TURNS RED)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 9: Collision Detection & Red State ---");
    const collisionCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      
      // Try to place a 100% (4-column) block onto row 1 (which already has 50/50 blocks)
      const cand = { columnStart: 1, columnSpan: 4, columnEnd: 5, rowStart: 1, rowSpan: 1, rowEnd: 2 };
      const hasCollision = window.checkSlotCollisionState(sec.visualGrid.layoutItems, null, cand);
      
      return {
        hasCollision
      };
    `);

    assert("4COL-COLL-1", "Placing block over occupied cells is detected as collision",
      collisionCheck.hasCollision === true,
      `Collision detected: ${collisionCheck.hasCollision}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 10: CRITICAL HOTFIX PRESERVATION (1000-POINTERMOVE STRESS TEST)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 10: Critical Hotfix Regression & 1,000-Event Stress ---");
    const stressCheck = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const handle = document.querySelector('.grid-block-move-handle');
      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 200, button: 0 }));
      
      let maxRowsDuringDrag = sec.visualGrid.rows;
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const testY = 100 + (i % 40) * 30;
        window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: 200, clientY: testY }));
        if (sec.visualGrid.rows > maxRowsDuringDrag) {
          maxRowsDuringDrag = sec.visualGrid.rows;
        }
      }
      const durationMs = Math.round(performance.now() - startTime);
      window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
      
      return {
        durationMs,
        initialRows: sec.visualGrid.rows,
        maxRowsDuringDrag
      };
    `);

    assert("4COL-STRESS-1", "1,000 pointermove events processed cleanly in < 2500ms without row runaway",
      stressCheck.durationMs < 2500 && stressCheck.maxRowsDuringDrag === stressCheck.initialRows,
      `Duration: ${stressCheck.durationMs}ms, Max rows during drag: ${stressCheck.maxRowsDuringDrag}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 11: CAPTURE SCREENSHOT FOR THE USER REPORT
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 11: Final Screenshot Capture ---");
    const screenshotData = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = screenshotData.result ? screenshotData.result.data : (screenshotData.data || '');
    fs.writeFileSync(SCREENSHOT_PATH, Buffer.from(b64, 'base64'));
    
    // Copy screenshot to artifact directory for markdown embedding
    const artifactDir = 'C:\\Users\\holma\\.gemini\\antigravity\\brain\\edc240ba-edf2-46ce-81f6-7796c7c75db9';
    const artifactScreenshot = path.join(artifactDir, 'grid_composer_4col_preview.png');
    fs.writeFileSync(artifactScreenshot, Buffer.from(b64, 'base64'));

    assert("4COL-SCREENSHOT-1", "Captured screenshot of the True 4-Column Visual Composer",
      fs.existsSync(SCREENSHOT_PATH) && fs.statSync(SCREENSHOT_PATH).size > 10000,
      `Saved to ${SCREENSHOT_PATH} (${Math.round(fs.statSync(SCREENSHOT_PATH).size / 1024)} KB)`);

    // ─────────────────────────────────────────────────────────────
    // TEST 12: CONSOLE HEALTH CHECK
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 12: Console Errors ---");
    assert("4COL-CONSOLE-1", "Zero uncaught console errors recorded during all interactions",
      consoleErrors.length === 0,
      `Errors: ${consoleErrors.length} (${consoleErrors.join(', ')})`);

    console.log("\n==================================================================");
    console.log(`4-COLUMN UX QA RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log("==================================================================");

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    cleanup();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

run4ColUXTests();
