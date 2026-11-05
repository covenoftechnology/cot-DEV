const fs = require('fs');
let code = fs.readFileSync('src/pages/lab/layout-forge/studio.astro', 'utf8');

// 1. Defend renderBlockFields against undefined arrays
code = code.replace(
  "(d.paragraphs.length <= 1 ? 'disabled' : '')",
  "(((d.paragraphs ? d.paragraphs.length : 1) <= 1) ? 'disabled' : '')"
);
// Replace second occurrence (solo-text)
code = code.replace(
  "(d.paragraphs.length <= 1 ? 'disabled' : '')",
  "(((d.paragraphs ? d.paragraphs.length : 1) <= 1) ? 'disabled' : '')"
);

// Bullet list items
code = code.replace(
  "(d.items.length <= 1 ? 'disabled' : '')",
  "(((d.items ? d.items.length : 1) <= 1) ? 'disabled' : '')"
);

// 2. In commitBlockPlacement, merge def.defaultData with preloadedData and normalize paragraphs
const oldCommit = `      function commitBlockPlacement(sec, blockType, colStart, colSpan, rowStart, preloadedData) {
        var def = window.STUDIO_REGISTRY[blockType];
        if (!def) return null;

        var newBlock = {
          id: uid('blk'),
          type: blockType,
          data: preloadedData ? JSON.parse(JSON.stringify(preloadedData)) : JSON.parse(JSON.stringify(def.defaultData || {}))
        };
        regenerateBlockNestedIds(newBlock);`;

const newCommit = `      function commitBlockPlacement(sec, blockType, colStart, colSpan, rowStart, preloadedData) {
        var def = window.STUDIO_REGISTRY[blockType];
        if (!def) return null;

        var mergedData = JSON.parse(JSON.stringify(def.defaultData || {}));
        if (preloadedData && typeof preloadedData === 'object') {
          Object.assign(mergedData, JSON.parse(JSON.stringify(preloadedData)));
        }
        if ((blockType === 'solo-text' || blockType === 'title-text') && (!Array.isArray(mergedData.paragraphs) || mergedData.paragraphs.length === 0)) {
          mergedData.paragraphs = [mergedData.text || ''];
        }

        var newBlock = {
          id: uid('blk'),
          type: blockType,
          data: mergedData
        };
        regenerateBlockNestedIds(newBlock);`;

if (!code.includes(oldCommit)) {
  console.error('oldCommit not found!');
  process.exit(1);
}

code = code.replace(oldCommit, newCommit);

fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf8');
console.log('Successfully defended renderBlockFields and commitBlockPlacement!');

