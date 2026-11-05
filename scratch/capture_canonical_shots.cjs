// scratch/capture_canonical_shots.cjs
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const DEBUG_PORT = 9224;
const TEMP_PROFILE = path.resolve(__dirname, 'chrome-canon-profile');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
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
    'http://localhost:4321/template-preview/article'
  ], { stdio: 'ignore' });

  const cleanup = () => {
    try { chromeProc.kill(); } catch (e) {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch (e) {}
  };

  process.on('exit', cleanup);

  let targets = null;
  for (let i = 0; i < 25; i++) {
    await sleep(500);
    try {
      targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (targets && targets.some(t => t.type === 'page')) break;
    } catch (e) {}
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1536, height: 960, deviceScaleFactor: 1, mobile: false });
  await sleep(1500);

  const res1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.resolve(__dirname, 'canonical_desktop_1536.png'), Buffer.from(res1.result.data, 'base64'));

  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
  await sleep(500);
  const res2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.resolve(__dirname, 'canonical_tablet_768.png'), Buffer.from(res2.result.data, 'base64'));

  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await sleep(500);
  const res3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.resolve(__dirname, 'canonical_mobile_375.png'), Buffer.from(res3.result.data, 'base64'));

  cleanup();
  console.log('Successfully captured canonical baseline screenshots at 1536px, 768px, and 375px.');
}

main().catch(err => { console.error(err); process.exit(1); });

