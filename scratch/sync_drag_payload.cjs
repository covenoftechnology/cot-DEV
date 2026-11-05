const fs = require('fs');
let code = fs.readFileSync('src/pages/lab/layout-forge/studio.astro', 'utf8');

// Sync draggedBlockData with window.draggedBlockData
code = code.replace(
  'var bType = (draggedBlockData && draggedBlockData.source === \'library\') ? draggedBlockData.type : null;',
  'var curPayload = draggedBlockData || window.draggedBlockData;\n          var bType = (curPayload && curPayload.source === \'library\') ? curPayload.type : null;'
);

code = code.replace(
  'if (!bType && !draggedBlockData) return;',
  'if (!bType && !curPayload) return;'
);

code = code.replace(
  'var reqSpan = (draggedBlockData && draggedBlockData.widthSpan) || 4;\n            var isExplicit = Boolean(draggedBlockData && draggedBlockData.explicitWidth);',
  'var reqSpan = (curPayload && curPayload.widthSpan) || 4;\n            var isExplicit = Boolean(curPayload && curPayload.explicitWidth);'
);

code = code.replace(
  'var payload = draggedBlockData;',
  'var payload = draggedBlockData || window.draggedBlockData;'
);

code = code.replace(
  'var draggedBlockData = null;',
  'var draggedBlockData = null;\n      window.draggedBlockData = draggedBlockData;'
);

code = code.replace(
  'draggedBlockData = { source: \'library\', type: blk.type };',
  'draggedBlockData = { source: \'library\', type: blk.type };\n        window.draggedBlockData = draggedBlockData;'
);

fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf8');
console.log('Successfully synchronized draggedBlockData with window.draggedBlockData!');

