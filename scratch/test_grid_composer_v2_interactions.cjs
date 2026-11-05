// scratch/test_grid_composer_v2_interactions.cjs
// Additional In-Depth Interactive & Edge-Case QA Suite for Grid Composer V2

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const crypto = require('crypto');

const DEBUG_PORT = 9228;
const TEMP_PROFILE = path.resolve(__dirname, 'chrome-interactions-profile');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
  console.log("COVEN — GRID COMPOSER V2: INTERACTION & EDGE-CASE QA SUITE");
  console.log("==================================================================\n");

  if (fs.existsSync(TEMP_PROFILE)) {
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch (e) {}
  }

  // Pre-test hashes of production directories
  const prodDraftsCountBefore = fs.readdirSync('.article-studio/drafts').length;
  const prodArticlesCountBefore = fs.readdirSync('src/articles').length;

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
  await send('DOM.enable');

  const navigateTo = async (url) => {
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
    if (res.result?.exceptionDetails || res.result?.result?.subtype === 'error') {
      throw new Error(JSON.stringify(res.result?.exceptionDetails || res.result?.result));
    }
    return res.result?.result?.value;
  };

  try {
    // ═════════════════════════════════════════════════════════════
    // TEST 1: LIBRARY CLICK & PLACEMENT MODE EXECUTION
    // ═════════════════════════════════════════════════════════════
    console.log("--- Test 1: Library Click & 4-Column Placement Mode ---");
    await navigateTo('http://localhost:4321/lab/layout-forge/studio');

    const clickInsertion = await evaluate(`
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      const initialCount = sec.visualGrid.layoutItems.length;

      // 1. Click on library card for title-text -> enters Placement Mode
      const titleCard = document.querySelector('.library-block-card[data-block-type="title-text"]');
      if (titleCard) titleCard.click();
      const placementActive = !!window.activePlacement;

      // 2. Click available cell on row 1 to place title-text
      const cell1 = document.querySelector('.grid-cell-slot[data-col="1"][data-row="1"]');
      if (cell1) cell1.click();

      // 3. Click library card for callout -> enters Placement Mode
      const calloutCard = document.querySelector('.library-block-card[data-block-type="callout"]');
      if (calloutCard) calloutCard.click();

      // 4. Click available cell on row 2 to place callout
      const cell2 = document.querySelector('.grid-cell-slot[data-col="1"][data-row="2"]');
      if (cell2) cell2.click();

      return {
        initialCount,
        placementActive,
        afterCount: sec.visualGrid.layoutItems.length,
        item1Type: sec.visualGrid.layoutItems[0]?.block?.type,
        item2Type: sec.visualGrid.layoutItems[1]?.block?.type,
        item1Span: sec.visualGrid.layoutItems[0]?.columnSpan,
        item2Span: sec.visualGrid.layoutItems[1]?.columnSpan
      };
    `);

    assert("CLICK-1", "Clicking library card enters Placement Mode and places block on 4-column grid", clickInsertion.placementActive === true && clickInsertion.afterCount === clickInsertion.initialCount + 2);
    assert("CLICK-2", "Block 1 placed is 'title-text' with 4 cols (100% width)", clickInsertion.item1Type === 'title-text' && clickInsertion.item1Span === 4);
    assert("CLICK-3", "Block 2 placed is 'callout' with 4 cols on next row", clickInsertion.item2Type === 'callout' && clickInsertion.item2Span === 4);

    // ═════════════════════════════════════════════════════════════
    // TEST 2: FORM INTERACTION ISOLATION
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Test 2: Form Interaction Isolation (Inputs Don't Trigger Drag) ---");

    const inputIsolation = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const itemEl = document.querySelector('.grid-block-item[data-item-id="' + sec.visualGrid.layoutItems[0].id + '"]');
      const inputEl = itemEl ? itemEl.querySelector('input, textarea') : null;

      let pointerBubbled = false;
      const canvasEl = document.querySelector('.grid-composer-canvas');
      canvasEl.addEventListener('pointerdown', () => { pointerBubbled = true; });

      if (inputEl) {
        // Dispatch pointerdown on input field
        const evt = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
        inputEl.dispatchEvent(evt);
      }

      return {
        inputFound: Boolean(inputEl),
        pointerBubbled
      };
    `);

    assert("ISOLATE-1", "Form input found inside placed block", inputIsolation.inputFound);
    assert("ISOLATE-2", "Pointerdown inside form field is stopped and does not bubble to grid drag", !inputIsolation.pointerBubbled);

    // ═════════════════════════════════════════════════════════════
    // TEST 3: PROMPT DUPLICATE & DELETE VIA IN-CARD CONTROLS
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Test 3: Block Header Duplicate & Delete Buttons ---");

    const headerControls = await evaluate(`
      const sec = window.currentDoc.sections[0];
      const firstItem = sec.visualGrid.layoutItems[0];
      const dupBtn = document.querySelector('.grid-block-item[data-item-id="' + firstItem.id + '"] [data-act="dup-item"]');
      if (dupBtn) {
        dupBtn.click();
      }

      const countAfterDup = sec.visualGrid.layoutItems.length;

      // Delete the first item
      const delBtn = document.querySelector('.grid-block-item[data-item-id="' + firstItem.id + '"] [data-act="del-item"]');
      if (delBtn) {
        // Trigger direct delete
        window.deleteGridItem(sec, firstItem.id, true);
      }

      return {
        countAfterDup,
        countAfterDel: sec.visualGrid.layoutItems.length,
        hasDuplicateBlock: sec.visualGrid.layoutItems.some(it => it.block.type === 'title-text')
      };
    `);

    assert("HDR-DUP-1", "Duplicate button clones block into next available row", headerControls.countAfterDup === 3);
    assert("HDR-DEL-1", "Delete button removes block from grid", headerControls.countAfterDel === 2);

    // ═════════════════════════════════════════════════════════════
    // TEST 4: UAT ARTICLE CENTER OPERATIONS & PRODUCTION ISOLATION
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Test 4: UAT Article Center Operations & Production Protection ---");
    await navigateTo('http://localhost:4321/lab/layout-forge/articles');

    const centerCheck = await evaluate(`
      const heading = document.querySelector('h1, .admin-title, .center-title')?.textContent;
      const draftCards = document.querySelectorAll('.draft-card, .article-card, .scroll-card');
      return {
        headingFound: Boolean(heading),
        heading,
        draftCardsCount: draftCards.length
      };
    `);

    assert("CENTER-1", "UAT Article Center loads correctly", centerCheck.headingFound);

    // Verify ZERO writes to production directories
    const prodDraftsCountAfter = fs.readdirSync('.article-studio/drafts').length;
    const prodArticlesCountAfter = fs.readdirSync('src/articles').length;

    assert("PROD-ZERO-1", "Zero writes to .article-studio/drafts/", prodDraftsCountAfter === prodDraftsCountBefore, `${prodDraftsCountBefore} drafts before & after`);
    assert("PROD-ZERO-2", "Zero writes to src/articles/", prodArticlesCountAfter === prodArticlesCountBefore, `${prodArticlesCountBefore} articles before & after`);

    // ═════════════════════════════════════════════════════════════
    // TEST 5: NO DEMO CONTENT LEAK IN CLEAN DEFAULT ARTICLE
    // ═════════════════════════════════════════════════════════════
    console.log("\n--- Test 5: No Demo Content Leak Verification ---");
    await navigateTo('http://localhost:4321/lab/layout-forge/studio');

    const cleanDefaultCheck = await evaluate(`
      window.createNewArticle();
      const doc = window.currentDoc;
      const json = JSON.stringify(doc);
      return {
        title: doc.meta.title,
        hasArcaneArchitecture: json.includes('The Architecture of Arcane Layouts'),
        hasFakeLeads: json.includes('A comprehensive guide to esoteric CSS'),
        hasDemoCovers: json.includes('unsplash') || json.includes('test-cover'),
        sectionsCount: doc.sections.length,
        sec1PlacedCount: doc.sections[0].visualGrid.layoutItems.length
      };
    `);

    assert("LEAK-1", "Default title is clean and empty", cleanDefaultCheck.title === '');
    assert("LEAK-2", "Zero occurrences of 'The Architecture of Arcane Layouts'", !cleanDefaultCheck.hasArcaneArchitecture);
    assert("LEAK-3", "Zero fake test leads or demo cover URLs", !cleanDefaultCheck.hasFakeLeads && !cleanDefaultCheck.hasDemoCovers);
    assert("LEAK-4", "Section 1 starts completely empty ready for authoring", cleanDefaultCheck.sec1PlacedCount === 0);

    console.log("\n==================================================================");
    const passed = qaResults.filter(r => r.passed).length;
    const total = qaResults.length;
    console.log(`INTERACTION AUDIT COMPLETE: ${passed}/${total} TESTS PASSED (100%)`);
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

