const http = require('http');

http.get('http://localhost:4321/lab/layout-forge/preview?draft=qa_preview_parity_draft', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Preview HTML length:', d.length);
  });
});

