const http = require('http');

http.get('http://localhost:4321/lab/layout-forge/preview?draft=qa_preview_parity_draft', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const idx = d.indexOf('data-slot-id="slot-foundations-quote"');
    console.log('Index:', idx);
    if (idx !== -1) {
      console.log('Snippet:', d.substring(idx - 50, idx + 400));
    } else {
      console.log('All slot IDs found in HTML:');
      const matches = d.match(/data-slot-id="[^"]+"/g);
      console.log(matches);
    }
  });
});

