const fs = require('fs');
let code = fs.readFileSync('src/pages/lab/layout-forge/studio.astro', 'utf-8');
const target = '<a href="/lab/layout-forge" class="studio-btn studio-btn--ghost" id="btn-grid-forge" title="Back to Layout Forge Grid">Grid Forge ↗</a>';
const replacement = '<a href="/lab/layout-forge/articles" class="studio-btn studio-btn--ghost" id="btn-article-center" title="Open UAT Article Center">Article Center</a>\n      ' + target;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf-8');
  console.log('Successfully added Article Center button to studio.astro');
} else {
  console.error('Target not found in studio.astro');
}

