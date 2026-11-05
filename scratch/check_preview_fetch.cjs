const http = require('http');

const draftId = process.argv[2] || 'qa_preview_parity_draft';
const url = `http://localhost:4321/lab/layout-forge/preview?draft=${draftId}`;

http.get(url, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('URL:', url, '-> Status:', res.statusCode);
    const m1 = d.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    console.log('H1:', m1 ? m1[1].trim() : 'NONE');
    const m2 = d.match(/data-toc-title="([^"]+)"/g);
    console.log('TOC titles:', m2);
  });
}).on('error', e => console.error(e.message));
