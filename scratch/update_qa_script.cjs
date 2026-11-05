const fs = require('fs');
let code = fs.readFileSync('scratch/test_grid_composer_v2_qa.cjs', 'utf8');

code = code.replace(
  `      const doc = window.currentDoc;
      const sec = doc.sections[0];
      const vg = sec.visualGrid;
      return {
        hasCurrentDoc: Boolean(doc),
        sectionsCount: doc.sections.length,
        secId: sec.id,
        gridColumns: vg.columns,
        gridRows: vg.rows,
        layoutItemsCount: vg.layoutItems ? vg.layoutItems.length : -1,
        slotsAliasMatches: vg.slots === vg.layoutItems,
        is12ColsBadgePresent: Boolean(document.querySelector('.grid-badge-12col')),
        hasAddSlotBtn: Boolean(document.querySelector('[data-act="add-slot"]')),
        canvasGridColumns: getComputedStyle(document.querySelector('.grid-composer-canvas')).gridTemplateColumns.split(' ').length
      };`,
  `      const doc = window.currentDoc;
      const sec = doc.sections[0];
      const vg = sec.visualGrid;
      const canvasEl = document.querySelector('.grid-composer-canvas, .section-grid-canvas');
      return {
        hasCurrentDoc: Boolean(doc),
        sectionsCount: doc.sections.length,
        secId: sec.id,
        gridColumns: vg.columns,
        gridRows: vg.rows,
        layoutItemsCount: vg.layoutItems ? vg.layoutItems.length : -1,
        slotsAliasMatches: vg.slots === vg.layoutItems,
        is12ColsBadgePresent: Boolean(document.querySelector('.grid-badge-12col')),
        hasAddSlotBtn: Boolean(document.querySelector('[data-act="add-slot"]')),
        canvasGridColumns: canvasEl ? getComputedStyle(canvasEl).gridTemplateColumns.split(' ').length : 0
      };`
);

fs.writeFileSync('scratch/test_grid_composer_v2_qa.cjs', code, 'utf8');
console.log('Updated test_grid_composer_v2_qa.cjs');

