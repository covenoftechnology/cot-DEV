// scratch/reproduce_runaway_rows.cjs
// Exact reproduction of the runaway row auto-grow bug in Grid Composer V2

const { spawn } = require('child_process');
const http = require('http');

const DEBUG_PORT = 9229;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log("=== REPRODUCING RUNAWAY ROW DEFECT ===");

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1600,1000',
    'http://localhost:4321/lab/layout-forge/studio'
  ], { stdio: 'ignore' });

  process.on('exit', () => { try { chromeProc.kill(); } catch (e) {} });

  await new Promise(r => setTimeout(r, 2000));

  http.get(`http://127.0.0.1:${DEBUG_PORT}/json`, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const targets = JSON.parse(data);
      const pageTarget = targets.find(t => t.type === 'page');
      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

      let msgId = 1;
      const pending = new Map();

      ws.onmessage = (event) => {
        const d = JSON.parse(event.data);
        if (d.id && pending.has(d.id)) {
          const resolver = pending.get(d.id);
          pending.delete(d.id);
          resolver(d);
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

      const evaluate = async (expr) => {
        const res = await send('Runtime.evaluate', {
          expression: `(() => {\n${expr}\n})()`,
          returnByValue: true,
          awaitPromise: true,
        });
        if (res.result?.exceptionDetails || res.result?.result?.subtype === "error") {
          throw new Error(JSON.stringify(res.result.exceptionDetails || res.result.result));
        }
        return res.result?.result?.value;
      };

      try {
        console.log("1. Initialize clean article...");
        const initial = await evaluate(`
          window.createNewArticle();
          const sec = window.currentDoc.sections[0];
          return {
            initialRows: sec.visualGrid.rows,
            initialItems: sec.visualGrid.layoutItems.length
          };
        `);
        console.log("Initial state:", initial);

        console.log("2. Place first ArticleBlock (solo-text, 6 cols)...");
        const b1 = await evaluate(`
          const sec = window.currentDoc.sections[0];
          const it1 = window.insertBlockDirectly('solo-text', sec.id, 6);
          return {
            rows: sec.visualGrid.rows,
            it1Row: it1.rowStart,
            it1Span: it1.columnSpan
          };
        `);
        console.log("After Block 1 placed:", b1);

        console.log("3. Simulate user moving Block 1 downward with multiple pointermove events...");
        const moveSim = await evaluate(`
          const sec = window.currentDoc.sections[0];
          const it1 = sec.visualGrid.layoutItems[0];
          const canvasEl = document.querySelector('.grid-composer-canvas, .section-grid-canvas');
          const handle = document.querySelector('.grid-block-move-handle');

          const rowsLog = [];
          rowsLog.push('Before move: rows = ' + sec.visualGrid.rows);

          // Dispatch pointerdown on move handle
          const pdEvt = new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            clientX: 200,
            clientY: 200,
            button: 0
          });
          handle.dispatchEvent(pdEvt);

          // Now dispatch multiple pointermove events as pointer drifts downward
          for (let step = 1; step <= 25; step++) {
            const pmEvt = new PointerEvent('pointermove', {
              bubbles: true,
              cancelable: true,
              clientX: 200,
              clientY: 200 + (step * 25)
            });
            window.dispatchEvent(pmEvt);
            rowsLog.push('Step ' + step + ' (Y=' + (200 + step * 25) + '): rows = ' + sec.visualGrid.rows);
            if (sec.visualGrid.rows > 100) {
              rowsLog.push('RUNAWAY DETECTED! rows jumped to ' + sec.visualGrid.rows);
              break;
            }
          }

          // Release pointer
          const puEvt = new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            clientX: 200,
            clientY: 400
          });
          window.dispatchEvent(puEvt);
          rowsLog.push('After pointerup: rows = ' + sec.visualGrid.rows);

          return rowsLog;
        `);

        console.log("Move simulation log:\n", moveSim.join('\n'));

      } catch (err) {
        console.error("Reproduction script error:", err);
      } finally {
        chromeProc.kill();
        process.exit(0);
      }
    });
  });
}

main();
