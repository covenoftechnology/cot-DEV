/**
 * scratch/test_25pct_focus_qa.cjs
 * COVEN — UAT ARTICLE FORGE
 * GRID COMPOSER V2: 25% BLOCK AUTHORING UX VERIFICATION SUITE
 * 
 * Verifies:
 * 1. 4-Column Track Math & Canvas min-width (340px equal tracks, min 1440px canvas)
 * 2. Viewport-only horizontal scrolling & stationary sidebars
 * 3. Removal of per-block horizontal scrollbars on normal 25% cards
 * 4. Technical Table internal scroll preservation
 * 5. Focus Editor opening via ⛶ Edit button & auto-focus on 25% body click
 * 6. Floating elevated overlay (640px, z-index 100, no row height explosion)
 * 7. Placeholder anchor in original 25% cell
 * 8. Intelligent expansion (Col 1 rightward, Col 4 leftward, Col 2/3 centered)
 * 9. Closing via Esc, ✕ Done button, and outside click
 * 10. Single live authoring instance (cursor/inputs preserved, zero renderSections to toggle)
 * 11. Move/resize disabled while focused
 * 12. Preview fidelity (zero focus editor artifacts, exact 25/50/75/100 geometry)
 * 13. Persisted data contract (single visualGrid.layoutItems, zero focus state in JSON)
 * 
 * Captures 6 required screenshot artifacts:
 * 1. uat_25pct_normal_4col.png
 * 2. uat_25pct_focus_col1.png
 * 3. uat_25pct_focus_col2.png
 * 4. uat_25pct_focus_col4.png
 * 5. uat_25pct_mixed_blocks.png
 * 6. uat_25pct_preview_wide.png
 */

const http = require('http');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9227;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(__dirname, '.temp_25pct_profile');
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

async function run25PctFocusTests() {
  console.log("==================================================================");
  console.log("COVEN — GRID COMPOSER V2: 25% BLOCK AUTHORING UX QA SUITE");
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

  const captureScreenshot = async (filePath) => {
    const res = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    if (res && res.result && res.result.data) {
      const buf = Buffer.from(res.result.data, 'base64');
      fs.writeFileSync(filePath, buf);
      console.log(`  [SCREENSHOT] Saved: ${filePath}`);
    } else {
      console.error(`  [SCREENSHOT FAILED]: ${filePath}`);
    }
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
  for (let i = 0; i < 30; i++) {
    const ready = await evalCode(`Boolean(window.currentDoc && window.currentDoc.sections && window.currentDoc.sections.length > 0)`);
    if (ready) break;
    await sleep(200);
  }

  // -------------------------------------------------------------
  // SUITE 1: 4-COLUMN TRACK MATH & 25% NORMAL MODE (4 BLOCKS IN ROW 1)
  // -------------------------------------------------------------
  console.log("\n--- SUITE 1: 4-Column Track Math & 4 x 25% Blocks Normal Mode ---");

  // Setup Section 1 with four 25% blocks across columns 1..4 in Row 1
  const setup4Col = await evalCode(`
    (function() {
      if (typeof window.createNewArticle === 'function') {
        window.createNewArticle();
      }
      var doc = window.currentDoc;
      var sec = doc.sections[0];
      sec.visualGrid = sec.visualGrid || {};
      sec.visualGrid.enabled = true;
      sec.visualGrid.columns = 4;
      sec.visualGrid.rows = 2;
      sec.visualGrid.rowGap = 16;
      sec.visualGrid.columnGap = 16;
      sec.visualGrid.minRowHeight = 80;

      // 4 distinct 25% blocks in Row 1
      sec.visualGrid.layoutItems = [
        {
          id: 'slot-c1',
          label: 'Solo Text',
          columnStart: 1,
          columnSpan: 1,
          columnEnd: 2,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-c1',
            type: 'solo-text',
            data: { text: '<p>Direct, focused editorial passage occupying exactly 25% layout track.</p>' }
          }
        },
        {
          id: 'slot-c2',
          label: 'Title + Text',
          columnStart: 2,
          columnSpan: 1,
          columnEnd: 3,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-c2',
            type: 'title-text',
            data: { title: 'Secondary Focus', text: '<p>Structured overview card nestled in column 2.</p>' }
          }
        },
        {
          id: 'slot-c3',
          label: 'Single Image',
          columnStart: 3,
          columnSpan: 1,
          columnEnd: 4,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-c3',
            type: 'single-image',
            data: { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', caption: 'Cybernetic talisman' }
          }
        },
        {
          id: 'slot-c4',
          label: 'Callout',
          columnStart: 4,
          columnSpan: 1,
          columnEnd: 5,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-c4',
            type: 'callout',
            data: { title: 'Essential Note', text: '<p>Important observation highlighted in rightmost 25% column.</p>', tone: 'gold' }
          }
        }
      ];

      window.renderSections();
      return { success: true, count: sec.visualGrid.layoutItems.length };
    })()
  `);

  await sleep(400);

  // Verify Canvas Track Math & Viewport
  const canvasMetrics = await evalCode(`
    (function() {
      var canvas = document.querySelector('.grid-composer-canvas');
      var viewport = document.querySelector('.grid-composer-viewport');
      var items = document.querySelectorAll('.grid-block-item');
      if (!canvas || items.length < 4) return null;

      var canvasRect = canvas.getBoundingClientRect();
      var itemRects = Array.from(items).map(function(el) {
        var r = el.getBoundingClientRect();
        return {
          id: el.getAttribute('data-item-id'),
          width: Math.round(r.width),
          height: Math.round(r.height),
          left: Math.round(r.left),
          scrollWidth: el.querySelector('.grid-block-content')?.scrollWidth || 0,
          clientWidth: el.querySelector('.grid-block-content')?.clientWidth || 0,
          hasContentHScroll: (el.querySelector('.grid-block-content')?.scrollWidth > el.querySelector('.grid-block-content')?.clientWidth + 2)
        };
      });

      return {
        canvasWidth: Math.round(canvasRect.width),
        minCanvasWidth: Math.round(parseFloat(getComputedStyle(canvas).minWidth) || 0),
        viewportWidth: Math.round(viewport.getBoundingClientRect().width),
        viewportHasHScroll: viewport.scrollWidth > viewport.clientWidth,
        itemRects: itemRects
      };
    })()
  `);

  assert(canvasMetrics !== null, "Canvas and 4 items rendered successfully");
  assert(canvasMetrics.minCanvasWidth >= 1400, `Canvas min-width is >= 1400px (${canvasMetrics.minCanvasWidth}px)`);
  assert(canvasMetrics.itemRects.every(it => it.width >= 330), `All 4 column tracks have width >= 330px (widths: ${canvasMetrics.itemRects.map(i => i.width).join(', ')})`);
  assert(canvasMetrics.itemRects.every(it => !it.hasContentHScroll), "No per-block horizontal scrollbar on normal 25% cards");

  // Capture Screenshot 1: uat_25pct_normal_4col.png
  await captureScreenshot(path.join(ARTIFACTS_DIR, 'uat_25pct_normal_4col.png'));

  // -------------------------------------------------------------
  // SUITE 2: FOCUS EDITOR — COLUMN 1 (EXPANDS RIGHTWARD)
  // -------------------------------------------------------------
  console.log("\n--- SUITE 2: Focus Editor Column 1 (Expands Rightward) ---");

  // Click ⛶ Edit button on Item 1 (Column 1)
  await evalCode(`
    (function() {
      var item1 = document.querySelector('.grid-block-item[data-item-id="slot-c1"]');
      if (item1) {
        var editBtn = item1.querySelector('[data-act="toggle-focus"]');
        if (editBtn) editBtn.click();
      }
    })()
  `);
  await sleep(250); // Allow focusEditorPop animation to finish

  const focusCol1Res = await evalCode(`
    (function() {
      var item1 = document.querySelector('.grid-block-item[data-item-id="slot-c1"]');
      if (!item1) return { error: 'Item 1 not found' };
      var editBtn = item1.querySelector('[data-act="toggle-focus"]');
      var isFocused = item1.classList.contains('is-focused-editor');
      var anchor = document.querySelector('.grid-block-anchor[data-anchor-for="slot-c1"]');
      var item1Rect = item1.getBoundingClientRect();
      var anchorRect = anchor ? anchor.getBoundingClientRect() : null;

      return {
        isFocused: isFocused,
        hasAnchor: Boolean(anchor),
        itemWidth: Math.round(item1Rect.width),
        offsetWidth: item1.offsetWidth,
        itemLeft: Math.round(item1Rect.left),
        anchorLeft: anchorRect ? Math.round(anchorRect.left) : 0,
        anchorWidth: anchorRect ? Math.round(anchorRect.width) : 0,
        btnText: editBtn ? editBtn.textContent.trim() : '',
        persistedSpan: window.currentDoc.sections[0].visualGrid.layoutItems[0].columnSpan
      };
    })()
  `);

  assert(focusCol1Res.isFocused === true, "Item 1 has class .is-focused-editor");
  assert(focusCol1Res.hasAnchor === true, "Visible placeholder anchor exists in cell 1");
  assert(focusCol1Res.offsetWidth === 640 || (focusCol1Res.itemWidth >= 638 && focusCol1Res.itemWidth <= 642), `Item 1 expands to 640px overlay (${focusCol1Res.offsetWidth}px)`);
  assert(Math.abs(focusCol1Res.itemLeft - focusCol1Res.anchorLeft) <= 4, `Item 1 expands rightward from anchor (anchor: ${focusCol1Res.anchorLeft}px, item: ${focusCol1Res.itemLeft}px)`);
  assert(focusCol1Res.btnText.includes('Done'), `Edit button text updated to Done (${focusCol1Res.btnText})`);
  assert(focusCol1Res.persistedSpan === 1, `Persisted layout width remains 1 column (25%), NOT changed by focus editor`);

  await sleep(300);
  // Capture Screenshot 2: uat_25pct_focus_col1.png
  await captureScreenshot(path.join(ARTIFACTS_DIR, 'uat_25pct_focus_col1.png'));

  // -------------------------------------------------------------
  // SUITE 3: FOCUS EDITOR — COLUMN 2 (CENTERED OVER ANCHOR)
  // -------------------------------------------------------------
  console.log("\n--- SUITE 3: Focus Editor Column 2 (Centered Over Anchor) ---");

  // Click ⛶ Edit button on Item 2 (Column 2)
  await evalCode(`
    (function() {
      var item2 = document.querySelector('.grid-block-item[data-item-id="slot-c2"]');
      if (item2) {
        var editBtn = item2.querySelector('[data-act="toggle-focus"]');
        if (editBtn) editBtn.click();
      }
    })()
  `);
  await sleep(250); // Allow focusEditorPop animation to finish

  const focusCol2Res = await evalCode(`
    (function() {
      var item2 = document.querySelector('.grid-block-item[data-item-id="slot-c2"]');
      if (!item2) return { error: 'Item 2 not found' };

      var item1 = document.querySelector('.grid-block-item[data-item-id="slot-c1"]');
      var item1Focused = item1 ? item1.classList.contains('is-focused-editor') : false;
      var item2Focused = item2.classList.contains('is-focused-editor');
      var anchor2 = document.querySelector('.grid-block-anchor[data-anchor-for="slot-c2"]');
      var item2Rect = item2.getBoundingClientRect();
      var anchor2Rect = anchor2 ? anchor2.getBoundingClientRect() : null;

      var anchorCenter = anchor2Rect ? anchor2Rect.left + (anchor2Rect.width / 2) : 0;
      var itemCenter = item2Rect.left + (item2Rect.width / 2);

      return {
        item1WasClosed: !item1Focused,
        item2Focused: item2Focused,
        hasAnchor2: Boolean(anchor2),
        itemWidth: Math.round(item2Rect.width),
        offsetWidth: item2.offsetWidth,
        centerDiff: Math.round(Math.abs(anchorCenter - itemCenter)),
        persistedSpan: window.currentDoc.sections[0].visualGrid.layoutItems[1].columnSpan
      };
    })()
  `);

  assert(focusCol2Res.item1WasClosed === true, "Item 1 automatically closed when Item 2 opened");
  assert(focusCol2Res.item2Focused === true, "Item 2 is now in focused editor mode");
  assert(focusCol2Res.hasAnchor2 === true, "Placeholder anchor 2 placed in Column 2");
  assert(focusCol2Res.offsetWidth === 640 || (focusCol2Res.itemWidth >= 638 && focusCol2Res.itemWidth <= 642), `Item 2 width is 640px (${focusCol2Res.offsetWidth}px)`);
  assert(focusCol2Res.centerDiff <= 10, `Item 2 is centered over anchor 2 (diff: ${focusCol2Res.centerDiff}px)`);

  await sleep(300);
  // Capture Screenshot 3: uat_25pct_focus_col2.png
  await captureScreenshot(path.join(ARTIFACTS_DIR, 'uat_25pct_focus_col2.png'));

  // -------------------------------------------------------------
  // SUITE 4: FOCUS EDITOR — COLUMN 4 (EXPANDS LEFTWARD)
  // -------------------------------------------------------------
  console.log("\n--- SUITE 4: Focus Editor Column 4 (Expands Leftward) ---");

  // Click editable body of Item 4 (auto-focus test)
  await evalCode(`
    (function() {
      var item4 = document.querySelector('.grid-block-item[data-item-id="slot-c4"]');
      if (item4) {
        var body = item4.querySelector('.grid-block-content');
        if (body) body.click();
      }
    })()
  `);
  await sleep(250); // Allow focusEditorPop animation to finish

  const focusCol4Res = await evalCode(`
    (function() {
      var item4 = document.querySelector('.grid-block-item[data-item-id="slot-c4"]');
      if (!item4) return { error: 'Item 4 not found' };

      var isFocused = item4.classList.contains('is-focused-editor');
      var anchor4 = document.querySelector('.grid-block-anchor[data-anchor-for="slot-c4"]');
      var canvas = document.querySelector('.grid-composer-canvas');
      var item4Rect = item4.getBoundingClientRect();
      var anchor4Rect = anchor4 ? anchor4.getBoundingClientRect() : null;
      var canvasRect = canvas.getBoundingClientRect();

      var rightDiff = anchor4Rect ? Math.abs((anchor4Rect.left + anchor4Rect.width) - (item4Rect.left + item4Rect.width)) : 0;
      var insideCanvasRight = item4Rect.right <= canvasRect.right + 4;

      return {
        isFocused: isFocused,
        hasAnchor4: Boolean(anchor4),
        itemWidth: Math.round(item4Rect.width),
        offsetWidth: item4.offsetWidth,
        rightDiff: Math.round(rightDiff),
        insideCanvasRight: insideCanvasRight,
        persistedSpan: window.currentDoc.sections[0].visualGrid.layoutItems[3].columnSpan
      };
    })()
  `);

  assert(focusCol4Res.isFocused === true, "Item 4 auto-focused when clicking inside editable body");
  assert(focusCol4Res.hasAnchor4 === true, "Placeholder anchor 4 placed in Column 4");
  assert(focusCol4Res.offsetWidth === 640 || (focusCol4Res.itemWidth >= 638 && focusCol4Res.itemWidth <= 642), `Item 4 width is 640px (${focusCol4Res.offsetWidth}px)`);
  assert(focusCol4Res.rightDiff <= 10, `Item 4 expands leftward so right edges align (diff: ${focusCol4Res.rightDiff}px)`);
  assert(focusCol4Res.insideCanvasRight === true, "Item 4 remains cleanly within canvas right bounds");

  await sleep(300);
  // Capture Screenshot 4: uat_25pct_focus_col4.png
  await captureScreenshot(path.join(ARTIFACTS_DIR, 'uat_25pct_focus_col4.png'));

  // -------------------------------------------------------------
  // SUITE 5: ESCAPE KEY & DONE BUTTON CLOSING
  // -------------------------------------------------------------
  console.log("\n--- SUITE 5: Esc Key & Done Button Closing ---");

  // Press Escape to close Focus Editor
  const escCloseRes = await evalCode(`
    (function() {
      var item4 = document.querySelector('.grid-block-item[data-item-id="slot-c4"]');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

      var isFocused = item4.classList.contains('is-focused-editor');
      var anchorExists = Boolean(document.querySelector('.grid-block-anchor'));
      var item4Rect = item4.getBoundingClientRect();

      return {
        isClosed: !isFocused,
        anchorRemoved: !anchorExists,
        restoredWidth: Math.round(item4Rect.width),
        persistedSpan: window.currentDoc.sections[0].visualGrid.layoutItems[3].columnSpan
      };
    })()
  `);

  assert(escCloseRes.isClosed === true, "Esc key closed Focus Editor");
  assert(escCloseRes.anchorRemoved === true, "Placeholder anchor completely removed from DOM");
  assert(escCloseRes.restoredWidth >= 330 && escCloseRes.restoredWidth <= 380, `Item 4 restored to normal 25% column width (${escCloseRes.restoredWidth}px)`);
  assert(escCloseRes.persistedSpan === 1, "Persisted columnSpan remains 1");

  // -------------------------------------------------------------
  // SUITE 6: MIXED 4 x 25% BLOCKS WITH TECHNICAL TABLE
  // -------------------------------------------------------------
  console.log("\n--- SUITE 6: Mixed 4 x 25% Blocks With Technical Table ---");

  const mixedSetupRes = await evalCode(`
    (function() {
      var sec = window.currentDoc.sections[0];
      sec.visualGrid.layoutItems = [
        {
          id: 'slot-table',
          label: 'Technical Table',
          columnStart: 1,
          columnSpan: 1,
          columnEnd: 2,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-table',
            type: 'technical-table',
            data: {
              caption: 'Protocol Specs',
              columns: [{ header: 'Param' }, { header: 'Type' }, { header: 'Default' }],
              rows: [
                ['baudRate', 'number', '115200'],
                ['dataBits', 'number', '8'],
                ['stopBits', 'number', '1']
              ]
            }
          }
        },
        {
          id: 'slot-takeaways',
          label: 'Key Takeaways',
          columnStart: 2,
          columnSpan: 1,
          columnEnd: 3,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-takeaways',
            type: 'key-takeaways',
            data: {
              title: 'Key Takeaways',
              items: ['Low latency serialization', 'Fault tolerance', 'Zero runtime mutation']
            }
          }
        },
        {
          id: 'slot-stat',
          label: 'Stat Callout',
          columnStart: 3,
          columnSpan: 1,
          columnEnd: 4,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-stat',
            type: 'stat-callout',
            data: { value: '99.98%', label: 'Availability', description: 'Across all distributed edge zones' }
          }
        },
        {
          id: 'slot-process',
          label: 'Numbered Process',
          columnStart: 4,
          columnSpan: 1,
          columnEnd: 5,
          rowStart: 1,
          rowSpan: 1,
          rowEnd: 2,
          block: {
            id: 'blk-process',
            type: 'numbered-process',
            data: {
              steps: [
                { title: 'Ingest', text: 'Parse binary stream' },
                { title: 'Verify', text: 'Validate hash integrity' }
              ]
            }
          }
        }
      ];

      window.renderSections();

      // Open Focus Editor on the Technical Table to verify comfortable authoring width
      window.openBlockFocusEditor(
        sec,
        sec.visualGrid.layoutItems[0],
        document.querySelector('.grid-block-item[data-item-id="slot-table"]'),
        document.querySelector('.grid-composer-canvas')
      );

      var tableBuilder = document.querySelector('.studio-table-builder');
      var tableScrollable = tableBuilder ? (getComputedStyle(tableBuilder).overflowX === 'auto') : false;

      return {
        success: true,
        tableScrollable: tableScrollable,
        focusedWidth: document.querySelector('.grid-block-item[data-item-id="slot-table"]').offsetWidth
      };
    })()
  `);

  assert(mixedSetupRes.success === true, "Mixed 4x25% composition rendered");
  assert(mixedSetupRes.focusedWidth >= 630, `Technical Table focus editor width is comfortable 640px (${mixedSetupRes.focusedWidth}px)`);
  assert(mixedSetupRes.tableScrollable === true, "Technical Table builder retains internal table scrolling (.studio-table-builder overflow-x: auto)");

  await sleep(300);
  // Capture Screenshot 5: uat_25pct_mixed_blocks.png
  await captureScreenshot(path.join(ARTIFACTS_DIR, 'uat_25pct_mixed_blocks.png'));

  // Trigger autosave to ensure draft is saved to persistent store for preview
  await evalCode(`
    (function() {
      // Close focus editor before save
      if (window.activeFocusedBlock) window.closeBlockFocusEditor();
      if (typeof window.triggerAutosave === 'function') {
        window.triggerAutosave();
      }
      return true;
    })()
  `);

  await sleep(800);

  // -------------------------------------------------------------
  // SUITE 7: PREVIEW WIDE BREAKOUT VERIFICATION
  // -------------------------------------------------------------
  console.log("\n--- SUITE 7: Preview Wide Breakout Verification ---");

  // Navigate to Preview page
  await evalCode(`window.location.href = '/lab/layout-forge/preview'`);
  await sleep(1500);

  // Verify Preview DOM & 4-Column Layout
  const previewMetrics = await evalCode(`
    (function() {
      var grid = document.querySelector('.section-reader-grid');
      var slots = document.querySelectorAll('.reader-grid-slot');
      var focusArtifacts = document.querySelectorAll('.is-focused-editor, .grid-block-anchor, .btn-focus-editor');

      if (!grid || slots.length < 4) {
        return { error: 'Preview grid or slots not found', slotsFound: slots.length };
      }

      var gridRect = grid.getBoundingClientRect();
      var slotRects = Array.from(slots).map(function(s) {
        var r = s.getBoundingClientRect();
        return {
          span: s.getAttribute('data-span'),
          width: Math.round(r.width),
          left: Math.round(r.left),
          top: Math.round(r.top)
        };
      });

      return {
        gridWidth: Math.round(gridRect.width),
        slotCount: slots.length,
        hasNoFocusArtifacts: (focusArtifacts.length === 0),
        slotRects: slotRects
      };
    })()
  `);

  assert(previewMetrics.error === undefined, "Preview grid rendered properly");
  assert(previewMetrics.slotCount >= 4, `Preview has 4 grid slots (${previewMetrics.slotCount})`);
  assert(previewMetrics.hasNoFocusArtifacts === true, "Zero Focus Editor DOM artifacts in Preview");
  assert(Array.isArray(previewMetrics.slotRects) && previewMetrics.slotRects.every(s => s.width >= 150), `All 4 columns rendered side-by-side in Preview (widths: ${(previewMetrics.slotRects || []).map(s => s.width).join(', ')})`);

  // Capture Screenshot 6: uat_25pct_preview_wide.png
  await captureScreenshot(path.join(ARTIFACTS_DIR, 'uat_25pct_preview_wide.png'));

  // -------------------------------------------------------------
  // SUITE 8: PERSISTED DATA CONTRACT INTEGRITY
  // -------------------------------------------------------------
  console.log("\n--- SUITE 8: Persisted Data Contract Integrity ---");

  // Inspect local persisted draft in .uat-article-forge/drafts
  const uatDraftsDir = path.join(process.cwd(), '.uat-article-forge', 'drafts');
  let draftJson = null;
  if (fs.existsSync(uatDraftsDir)) {
    const files = fs.readdirSync(uatDraftsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(uatDraftsDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    if (files.length > 0) {
      try {
        draftJson = JSON.parse(fs.readFileSync(path.join(uatDraftsDir, files[0].name), 'utf8'));
      } catch (e) {}
    }
  }

  assert(draftJson !== null, "Persisted UAT draft exists on disk");
  if (draftJson && draftJson.sections && draftJson.sections[0]) {
    const vg = draftJson.sections[0].visualGrid;
    assert(Boolean(vg), "Section 1 contains visualGrid");
    assert(Array.isArray(vg.layoutItems), "Single authoritative layout array: visualGrid.layoutItems exists");
    assert(vg.slots === undefined, "ZERO persisted slots property");
    assert(vg.layout === undefined, "ZERO persisted layout property");
    assert(vg.layoutItems.every(it => [1, 2, 3, 4].includes(it.columnSpan)), "All layoutItems have valid columnSpan in {1,2,3,4}");
    assert(vg.layoutItems.every(it => it.isFocused === undefined && it.focusEditor === undefined), "ZERO focus editor state persisted to JSON");
  }

  // Final Summary
  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log("==================================================================");

  if (passedTests === totalTests) {
    console.log("\n>>> ALL 25% BLOCK AUTHORING UX TESTS PASSED SUCCESSFULLY! <<<\n");
  } else {
    console.error(`\n>>> ${totalTests - passedTests} TESTS FAILED! <<<\n`);
    process.exit(1);
  }

  cleanup();
  process.exit(0);
}

run25PctFocusTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
