const http = require('http');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;
const fs = require('fs');
const path = require('path');

const DEBUG_PORT = 9228;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(__dirname, '.temp_diag_profile');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function run() {
  if (fs.existsSync(TEMP_PROFILE)) fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1600,1100',
    'http://localhost:4321/lab/layout-forge/studio'
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { chromeProc.kill(); } catch (e) {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch (e) {}
  };
  process.on('exit', cleanup);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (targets && targets.some(t => t.type === 'page')) break;
    } catch (e) { await sleep(200); }
  }

  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) pending.get(d.id)(d);
  };
  const send = (m, p = {}) => new Promise(r => {
    const curId = id++;
    pending.set(curId, r);
    ws.send(JSON.stringify({ id: curId, method: m, params: p }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  const evalCode = async exp => {
    const res = await send('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: true });
    return res.result?.result?.value;
  };

  await sleep(1500);

  const diag = await evalCode(`
    (function() {
      window.createNewArticle();
      var sec = window.currentDoc.sections[0];
      sec.visualGrid.enabled = true;
      sec.visualGrid.columns = 4;
      sec.visualGrid.layoutItems = [
        { id: 's1', columnStart: 1, columnSpan: 1, rowStart: 1, block: { type: 'solo-text', data: { text: 'A' } } },
        { id: 's2', columnStart: 2, columnSpan: 1, rowStart: 1, block: { type: 'solo-text', data: { text: 'B' } } },
        { id: 's3', columnStart: 3, columnSpan: 1, rowStart: 1, block: { type: 'solo-text', data: { text: 'C' } } },
        { id: 's4', columnStart: 4, columnSpan: 1, rowStart: 1, block: { type: 'solo-text', data: { text: 'D' } } }
      ];
      window.renderSections();

      var canvas = document.querySelector('.grid-composer-canvas');
      var item4 = document.querySelector('.grid-block-item[data-item-id="s4"]');

      // Test with grid-column: auto !important; grid-row: auto !important;
      window.openBlockFocusEditor(sec, sec.visualGrid.layoutItems[3], item4, canvas);

      // Now set grid-column: auto
      item4.style.gridColumn = 'auto';
      item4.style.gridRow = 'auto';

      var a4 = document.querySelector('.grid-block-anchor[data-anchor-for="s4"]');
      var a4Rect = a4.getBoundingClientRect();
      var f4Rect = item4.getBoundingClientRect();

      return {
        anchor4: { left: a4Rect.left, right: a4Rect.right, width: a4Rect.width },
        item4: { left: f4Rect.left, right: f4Rect.right, width: f4Rect.width, offsetLeft: item4.offsetLeft, styleLeft: item4.style.left },
        rightDiff: Math.abs(a4Rect.right - f4Rect.right)
      };
    })()
  `);

  console.log("DIAGNOSTIC WITH grid-column: auto:\n", JSON.stringify(diag, null, 2));
  cleanup();
  process.exit(0);
}

run();
