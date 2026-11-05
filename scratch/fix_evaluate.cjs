const fs = require('fs');
let code = fs.readFileSync('scratch/test_grid_composer_v2_qa.cjs', 'utf8');

code = code.replace(
  'return res.result?.value;',
  'return res.result?.result?.value;'
);

code = code.replace(
  'if (res.result?.exceptionDetails) {',
  'if (res.result?.exceptionDetails || res.result?.result?.subtype === "error") {'
);

fs.writeFileSync('scratch/test_grid_composer_v2_qa.cjs', code, 'utf8');
console.log('Fixed evaluate in test_grid_composer_v2_qa.cjs');

