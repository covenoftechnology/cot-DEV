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
      if (d.id === id) { ws.removeEventListener('message', h); r(d.result?.result?.value); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
  });

  const diagResult = await evalExpr(`(() => {
    window.createNewArticle();
    const sec = window.currentDoc.sections[0];
    window.commitBlockPlacement(sec, "solo-text", 1, 3, 1);
    
    const canvas = document.querySelector(".grid-composer-canvas");
    const availCell = document.querySelector('.grid-cell-slot.is-available[data-col="4"][data-row="1"]');
    const cRect = availCell.getBoundingClientRect();
    
    const midX = cRect.left + cRect.width / 2;
    const midY = cRect.top + cRect.height / 2;
    
    let logs = [];
    const origToast = window.showToast;
    window.showToast = function(msg, type) {
      logs.push({ toast: msg, type });
      return origToast.apply(this, arguments);
    };
    
    window.draggedBlockData = { source: "library", type: "single-image" };
    
    const dropEvt = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      clientX: midX,
      clientY: midY
    });
    
    try {
      canvas.dispatchEvent(dropEvt);
    } catch(err) {
      logs.push({ error: err.message });
    }
    
    window.showToast = origToast;
    
    return {
      logs,
      totalItems: sec.visualGrid.layoutItems.length,
      vgLayoutItems: sec.visualGrid.layoutItems.length,
      vgSlots: sec.visualGrid.slots.length
    };
  })()`);

  console.log('Trace:\n', JSON.stringify(diagResult, null, 2));
  chromeProc.kill();
  process.exit(0);
}
diag();
