const http = require('http');
const { spawn } = require('child_process');
const WebSocket = globalThis.WebSocket;
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(__dirname, '.temp_diag_profile');

async function diag() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=9222`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--headless=new',
    'http://localhost:4321/lab/layout-forge/studio'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9222/json');
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const evalExpr = (expr) => new Promise(r => {
    const id = Math.floor(Math.random() * 100000);
    const h = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === id) { ws.removeEventListener('message', h); r(d.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  });

  const diagResult = await evalExpr(`(() => {
    try {
      window.createNewArticle();
      const sec = window.currentDoc.sections[0];
      sec.blocks = [
        { id: 'leg_1', type: 'solo-text', data: { text: 'Block 1 text' } }
      ];
      window.renderSections();
      
      window.enterPlacementMode('solo-text', null, { sec: sec, index: 0, block: sec.blocks[0] });
      
      const res = window.resolvePlacementTarget(sec.visualGrid.layoutItems, 1, 1, 4, false);
      
      const preSpliceBlocks = sec.blocks.length;
      const legSrc = window.activePlacement.legacySource;
      if (legSrc && legSrc.sec) {
        legSrc.sec.blocks.splice(legSrc.index, 1);
      }
      const postSpliceBlocks = sec.blocks.length;
      
      window.commitBlockPlacement(sec, 'solo-text', res.columnStart, res.columnSpan, res.rowStart, legSrc.block.data);
      window.exitPlacementMode();
      
      return {
        preSpliceBlocks,
        postSpliceBlocks,
        finalBlocksLength: sec.blocks.length,
        activePlacement: window.activePlacement,
        drawersInDOM: document.querySelectorAll('.legacy-blocks-drawer').length
      };
    } catch(err) {
      return { error: err.message, stack: err.stack };
    }
  })()`);

  console.log('Direct test result:\n', JSON.stringify(diagResult, null, 2));
  chromeProc.kill();
  process.exit(0);
}
diag();
