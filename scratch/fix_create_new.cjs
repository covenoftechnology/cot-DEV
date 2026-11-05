const fs = require('fs');
let code = fs.readFileSync('src/pages/lab/layout-forge/studio.astro', 'utf8');

const targetStr = `        var initialSec = {
          id: initialSecId,
          title: 'Section 1',
          kicker: '',
          heading: '',
          visualGrid: {
            columns: 3,
            rows: 3,
            columnGap: 16,
            rowGap: 16,
            minRowHeight: 80,
            showCoordinates: false,
            slots: []
          },
          blocks: []
        };`;

const replaceStr = `        var initialSec = {
          id: initialSecId,
          title: 'Section 1',
          kicker: '',
          heading: '',
          visualGrid: {
            columns: 12,
            rows: 3,
            columnGap: 16,
            rowGap: 16,
            minRowHeight: 80,
            showCoordinates: false,
            layoutItems: [],
            slots: []
          },
          blocks: []
        };`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf8');
  console.log('Successfully updated createNewArticle in studio.astro!');
} else {
  console.log('Target string not found directly, checking with CRLF...');
  const targetCRLF = targetStr.replace(/\n/g, '\r\n');
  const replaceCRLF = replaceStr.replace(/\n/g, '\r\n');
  if (code.includes(targetCRLF)) {
    code = code.replace(targetCRLF, replaceCRLF);
    fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf8');
    console.log('Successfully updated createNewArticle with CRLF in studio.astro!');
  } else {
    console.error('Could not find initialSec in createNewArticle!');
  }
}

