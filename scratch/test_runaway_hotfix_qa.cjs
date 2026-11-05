const http = require('http');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9222;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(__dirname, '.temp_hotfix_profile');

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

async function runHotfixTests() {
  console.log("==================================================================");
  console.log("COVEN — GRID COMPOSER V2: RUNAWAY ROW HOTFIX VERIFICATION SUITE");
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
    await sleep(1500);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 1: STABLE INVARIANT TRACK MATH
    // ─────────────────────────────────────────────────────────────
    console.log("--- Section 1: Invariant Track Math & Geometry Safety ---");
    const mathCheck = await evaluate(`
      const canvas = document.createElement('div');
      canvas.style.width = '1200px';
      canvas.style.height = '300px';
      document.body.appendChild(canvas);
      
      const c1 = window.resolvePointerToGridCell(200, 200, canvas, 12, 3, 16, 16);
      
      // Detached element test: width/height = 0
      const detached = document.createElement('div');
      const c2 = window.resolvePointerToGridCell(200, 200, detached, 12, 3, 16, 16);
      
      canvas.remove();
      return { c1, c2, maxRows: window.MAX_GRID_ROWS, minRows: window.MIN_GRID_ROWS };
    `);

    assert("HOTFIX-MATH-1", "resolvePointerToGridCell handles attached canvas with positive coordinates",
      mathCheck.c1.col >= 1 && mathCheck.c1.col <= 12 && mathCheck.c1.row >= 1,
      `Calculated: col=${mathCheck.c1.col}, row=${mathCheck.c1.row}`);
    
    assert("HOTFIX-MATH-2", "resolvePointerToGridCell handles detached element without dividing by zero or producing negative/NaN rows",
      Number.isInteger(mathCheck.c2.row) && mathCheck.c2.row >= 1 && mathCheck.c2.row <= 200,
      `Calculated row=${mathCheck.c2.row}`);

    assert("HOTFIX-MATH-3", "MAX_GRID_ROWS constant is enforced at 200 and MIN_GRID_ROWS at 3",
      mathCheck.maxRows === 200 && mathCheck.minRows === 3,
      `MAX=${mathCheck.maxRows}, MIN=${mathCheck.minRows}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 2: PREVIEW-VS-COMMIT SEPARATION (NO MUTATION ON POINTERMOVE)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 2: Preview-vs-Commit Separation ---");

    const previewCommitCheck = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      const it = window.insertBlockDirectly('solo-text', sec.id, 6);
      
      let initialRows = sec.visualGrid.rows;
      let initialRenderCount = window.__renderCount || 0;
      let initialAutosaveCount = window.__autosaveCount || 0;
      
      // Grab move handle
      const handle = document.querySelector('.grid-block-move-handle');
      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 200, button: 0 }));
      
      // Dispatch 5 pointermove events
      for (let i = 1; i <= 5; i++) {
        window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 + (i * 30) }));
      }
      
      let rowsDuringDrag = sec.visualGrid.rows;
      let ghostVisible = !!document.querySelector('.grid-placement-preview');
      
      // Release
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: 200, clientY: 350 }));
      let rowsAfterCommit = sec.visualGrid.rows;
      
      return {
        initialRows,
        rowsDuringDrag,
        ghostVisible,
        rowsAfterCommit
      };
    `);

    assert("HOTFIX-SEPARATE-1", "visualGrid.rows is NEVER mutated during pointermove drag",
      previewCommitCheck.rowsDuringDrag === previewCommitCheck.initialRows,
      `Initial=${previewCommitCheck.initialRows}, During Drag=${previewCommitCheck.rowsDuringDrag}`);

    assert("HOTFIX-SEPARATE-2", "Ghost preview element exists during drag to show transient position",
      previewCommitCheck.ghostVisible === true,
      `Ghost visible=${previewCommitCheck.ghostVisible}`);

    assert("HOTFIX-SEPARATE-3", "visualGrid.rows is committed ONLY on pointerup",
      previewCommitCheck.rowsAfterCommit >= previewCommitCheck.initialRows,
      `Committed rows=${previewCommitCheck.rowsAfterCommit}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 3: 1,000-POINTERMOVE RAPID STRESS TEST
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 3: 1,000-Pointermove Stress Test (No Runaway Rows) ---");

    const stressCheck = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      window.insertBlockDirectly('solo-text', sec.id, 6);
      
      const handle = document.querySelector('.grid-block-move-handle');
      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 200, button: 0 }));
      
      const startTime = performance.now();
      let maxRowsObservedDuringMove = sec.visualGrid.rows;
      
      for (let i = 0; i < 1000; i++) {
        // Vary clientY wildly between 50 and 3500px
        const testY = 100 + (i % 50) * 35;
        window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: 200, clientY: testY }));
        if (sec.visualGrid.rows > maxRowsObservedDuringMove) {
          maxRowsObservedDuringMove = sec.visualGrid.rows;
        }
      }
      const durationMs = performance.now() - startTime;
      
      // Cancel pointer without committing to check state
      window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
      
      return {
        eventsDispatched: 1000,
        durationMs: Math.round(durationMs),
        maxRowsObservedDuringMove,
        finalRows: sec.visualGrid.rows
      };
    `);

    assert("HOTFIX-STRESS-1", "1,000 pointermove events processed cleanly in < 1500ms",
      stressCheck.durationMs < 1500,
      `Dispatched 1000 events in ${stressCheck.durationMs}ms`);

    assert("HOTFIX-STRESS-2", "visualGrid.rows NEVER grew during all 1,000 pointermove events (Stayed strictly invariant)",
      stressCheck.maxRowsObservedDuringMove === 3,
      `Max rows observed during 1000 events: ${stressCheck.maxRowsObservedDuringMove}`);

    assert("HOTFIX-STRESS-3", "Canceling pointer interaction leaves document at original rows count",
      stressCheck.finalRows === 3,
      `Final rows after cancel: ${stressCheck.finalRows}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 4: MAX_GRID_ROWS = 200 HARD CEILING
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 4: Hard Safety Ceiling (MAX_GRID_ROWS = 200) ---");

    const ceilingCheck = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      const it = window.insertBlockDirectly('solo-text', sec.id, 6);
      
      // Drag way down to simulate astronomical pointer position
      const handle = document.querySelector('.grid-block-move-handle');
      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 200, button: 0 }));
      
      // Giant move: Y = 30000px
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: 200, clientY: 30000 }));
      
      // Drop
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: 200, clientY: 30000 }));
      
      return {
        rows: sec.visualGrid.rows,
        itemRow: it.rowStart
      };
    `);

    assert("HOTFIX-CEIL-1", "Extreme vertical drop is capped by MAX_GRID_ROWS (<= 200)",
      ceilingCheck.rows <= 200,
      `Rows clamped to: ${ceilingCheck.rows}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 5: HIGH-PERFORMANCE GUIDE RENDERING (ZERO DOM CELL BLOAT)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 5: High-Performance Guide System ---");

    const guideCheck = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      window.insertBlockDirectly('solo-text', sec.id, 6);
      
      const canvas = document.querySelector('.grid-composer-canvas, .section-grid-canvas');
      const guideCells = canvas.querySelectorAll('.grid-composer-guide-cell');
      const totalCanvasChildren = canvas.children.length;
      
      // Toggle coordinates on
      sec.visualGrid.showCoordinates = true;
      window.renderSections();
      
      const canvasWithCoords = document.querySelector('.grid-composer-canvas, .section-grid-canvas');
      const badgesCount = canvasWithCoords.querySelectorAll('.grid-coord-col, .grid-coord-row').length;
      
      // Toggle back off
      sec.visualGrid.showCoordinates = false;
      window.renderSections();
      
      return {
        guideCellsCount: guideCells.length,
        totalCanvasChildren,
        badgesCount
      };
    `);

    assert("HOTFIX-GUIDE-1", "Zero empty cell guide DOM elements are created (Grid uses pure CSS repeating background)",
      guideCheck.guideCellsCount === 0,
      `Guide cell elements: ${guideCheck.guideCellsCount}`);

    assert("HOTFIX-GUIDE-2", "Canvas DOM child count is minimal and matches placed blocks + controls",
      guideCheck.totalCanvasChildren <= 5,
      `Total canvas children: ${guideCheck.totalCanvasChildren}`);

    assert("HOTFIX-GUIDE-3", "Coordinate badges when toggled on are bounded to tracks only",
      guideCheck.badgesCount <= 30,
      `Badge count when toggled: ${guideCheck.badgesCount}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 6: CORRUPTED HUGE-ROW DRAFT NORMALIZATION
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 6: Corrupted Draft Recovery & Normalization ---");

    const corruptedDraftCheck = await evaluate(`
      const textDef = window.STUDIO_REGISTRY['solo-text'];
      const imgDef = window.STUDIO_REGISTRY['single-image'];

      // Simulate loading a corrupted draft that previously had 61,104 rows
      const corruptedSection = {
        id: 'corrupted-sec',
        title: 'Corrupted Draft Section',
        kicker: '',
        layoutMode: 'flexible',
        visualGrid: {
          columns: 12,
          rows: 61104, // Explosive row count from old bug
          columnGap: 16,
          rowGap: 16,
          minRowHeight: 80,
          layoutItems: [
            { id: 'item-1', columnStart: 1, columnSpan: 6, rowStart: 1, rowSpan: 2, block: { id: 'b1', type: 'solo-text', data: JSON.parse(JSON.stringify(textDef.defaultData)) } },
            { id: 'item-2', columnStart: 7, columnSpan: 6, rowStart: 1, rowSpan: 2, block: { id: 'b2', type: 'solo-text', data: JSON.parse(JSON.stringify(textDef.defaultData)) } },
            { id: 'item-3', columnStart: 1, columnSpan: 12, rowStart: 3, rowSpan: 2, block: { id: 'b3', type: 'single-image', data: JSON.parse(JSON.stringify(imgDef.defaultData)) } }
          ]
        }
      };
      
      // Run migration/normalization
      window.migrateSectionToGridComposerV2(corruptedSection);
      
      // Mount it into current doc and render
      window.currentDoc.sections = [corruptedSection];
      window.renderSections();
      
      const renderedCanvas = document.querySelector('.grid-composer-canvas, .section-grid-canvas');
      const renderedItems = renderedCanvas.querySelectorAll('.grid-block-item').length;
      
      return {
        normalizedRows: corruptedSection.visualGrid.rows,
        renderedItems,
        isCorruptedFlagCleaned: corruptedSection.visualGrid.rows <= 10
      };
    `);

    assert("HOTFIX-RECOVER-1", "Corrupted draft with 61,104 rows is automatically normalized on load",
      corruptedDraftCheck.normalizedRows <= 6,
      `Normalized from 61,104 rows down to ${corruptedDraftCheck.normalizedRows} rows`);

    assert("HOTFIX-RECOVER-2", "All placed blocks in normalized corrupted draft render intact",
      corruptedDraftCheck.renderedItems === 3,
      `Rendered blocks: ${corruptedDraftCheck.renderedItems}/3`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 7: TRAILING ROW PRUNING ON DELETE & RESIZE
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 7: Trailing Unused Row Pruning ---");

    const pruneCheck = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      
      // Place blocks occupying rows 1 through 6
      const it1 = window.insertBlockDirectly('solo-text', sec.id, 12);
      const it2 = window.insertBlockDirectly('single-image', sec.id, 12);
      const it3 = window.insertBlockDirectly('pullquote', sec.id, 12);
      const it4 = window.insertBlockDirectly('solo-text', sec.id, 12);
      const it5 = window.insertBlockDirectly('solo-text', sec.id, 12);
      const it6 = window.insertBlockDirectly('solo-text', sec.id, 12);
      
      const rowsWith6Blocks = sec.visualGrid.rows;
      
      // Delete it5 and it6 (the bottom blocks)
      sec.visualGrid.layoutItems = sec.visualGrid.layoutItems.filter(i => i.id !== it5.id && i.id !== it6.id);
      window.normalizeSectionRows(sec);
      window.renderSections();
      
      const rowsAfterDeleteBottom = sec.visualGrid.rows;
      
      return {
        rowsWith6Blocks,
        rowsAfterDeleteBottom
      };
    `);

    assert("HOTFIX-PRUNE-1", "Deleting bottom-most blocks dynamically prunes unused trailing rows",
      pruneCheck.rowsAfterDeleteBottom < pruneCheck.rowsWith6Blocks && pruneCheck.rowsAfterDeleteBottom >= 3,
      `Rows went from ${pruneCheck.rowsWith6Blocks} down to ${pruneCheck.rowsAfterDeleteBottom}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 8: CONSOLE HEALTH CHECK
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Section 8: Console Errors ---");
    assert("HOTFIX-CONSOLE-1", "Zero uncaught console errors recorded during all interactions",
      consoleErrors.length === 0,
      `Console error count: ${consoleErrors.length} (${consoleErrors.join(', ')})`);

    console.log("\n==================================================================");
    console.log(`HOTFIX QA RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log("==================================================================");

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    cleanup();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runHotfixTests();
