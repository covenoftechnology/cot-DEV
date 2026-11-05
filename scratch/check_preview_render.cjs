const http = require('http');

http.get('http://localhost:4321/lab/layout-forge/preview?draft=draft_mw32i2yi_05i3o', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const idx = body.indexOf('<h1');
    if (idx !== -1) {
      console.log('H1:', body.slice(idx, idx + 100));
    }
    const idxDoc = body.indexOf('data-studio-id=');
    if (idxDoc !== -1) {
      console.log('Studio ID attr:', body.slice(idxDoc, idxDoc + 50));
    }
  });
});

