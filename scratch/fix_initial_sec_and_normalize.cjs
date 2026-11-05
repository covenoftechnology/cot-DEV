const fs = require('fs');

const studioPath = 'src/pages/lab/layout-forge/studio.astro';
let content = fs.readFileSync(studioPath, 'utf8');

// Determine line endings
const isCRLF = content.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// 1. Update initialSec definition (around line 2965)
const targetInitialSec = [
  "      var initialSecId = uid('sec');",
  "      var initialSec = {",
  "        id: initialSecId,",
  "        title: 'Section 1',",
  "        kicker: '',",
  "        heading: '',",
  "        visualGrid: {",
  "          columns: 3,",
  "          rows: 3,",
  "          columnGap: 16,",
  "          rowGap: 16,",
  "          minRowHeight: 80,",
  "          showCoordinates: false,",
  "          slots: []",
  "        },",
  "        blocks: []",
  "      };"
].join(nl);

const replaceInitialSec = [
  "      var initialSecId = uid('sec');",
  "      var initialSec = {",
  "        id: initialSecId,",
  "        title: 'Section 1',",
  "        kicker: '',",
  "        heading: '',",
  "        visualGrid: {",
  "          columns: 12,",
  "          rows: 3,",
  "          columnGap: 16,",
  "          rowGap: 16,",
  "          minRowHeight: 80,",
  "          showCoordinates: false,",
  "          layoutItems: [],",
  "          slots: []",
  "        },",
  "        blocks: []",
  "      };"
].join(nl);

if (content.includes(targetInitialSec)) {
  content = content.replace(targetInitialSec, replaceInitialSec);
  console.log('✓ Replaced initialSec definition');
} else {
  console.log('initialSec exact match not found, looking for pattern...');
}

// 2. Update normalizeDocument section loop
const oldNormalizePattern = [
  "        // Phase 3 & 4: Ensure each section owns an independent VisualGrid with slots",
  "        doc.sections.forEach(function(sec) {",
  "          if (!sec.visualGrid && !sec.layout) {",
  "            sec.visualGrid = {",
  "              columns: 3,",
  "              rows: 3,",
  "              columnGap: 16,",
  "              rowGap: 16,",
  "              minRowHeight: 80,",
  "              showCoordinates: false,",
  "              slots: []",
  "            };",
  "          } else if (!sec.visualGrid && sec.layout) {",
  "            sec.visualGrid = sec.layout;",
  "          }",
  "          sec.layout = sec.visualGrid;",
  "          if (!Array.isArray(sec.visualGrid.slots)) sec.visualGrid.slots = [];",
  "          if (!Array.isArray(sec.blocks)) sec.blocks = [];",
  "",
  "          // Phase 4: Ensure every slot has block property defined",
  "          sec.visualGrid.slots.forEach(function(slot) {",
  "            if (slot.block === undefined) slot.block = null;",
  "          });",
  "        });"
].join(nl);

const newNormalizeCode = [
  "        // Phase C: Grid Composer V2 migration (12-column spatial LEGO builder)",
  "        doc.sections.forEach(function(sec) {",
  "          migrateSectionToGridComposerV2(sec);",
  "        });"
].join(nl);

if (content.includes(oldNormalizePattern)) {
  content = content.replace(oldNormalizePattern, newNormalizeCode);
  console.log('✓ Replaced old normalizeDocument section loop with migrateSectionToGridComposerV2');
} else {
  console.log('oldNormalizePattern exact match not found');
}

// 3. Update insertBlockDirectly to support canonical block aliases
content = content.replace(
  'function insertBlockDirectly(blockType, secId, preferredSpan, preferredRow) {',
  `function insertBlockDirectly(blockType, secId, preferredSpan, preferredRow) {
        var canonicalType = blockType;
        if (blockType === 'paragraph') canonicalType = 'solo-text';
        if (blockType === 'quote') canonicalType = 'pullquote';
        if (blockType === 'image' || blockType === 'media-image') canonicalType = 'single-image';
        blockType = canonicalType;`
);
console.log('✓ Added block type aliases to insertBlockDirectly');

fs.writeFileSync(studioPath, content, 'utf8');
console.log('Done!');

