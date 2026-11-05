const fs = require('fs');

const studioPath = 'src/pages/lab/layout-forge/studio.astro';
let content = fs.readFileSync(studioPath, 'utf8');

const isCRLF = content.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

const targetIdx = content.indexOf('window.__uatLayoutForge = {');
if (targetIdx === -1) {
  console.error('Cannot find window.__uatLayoutForge!');
  process.exit(1);
}

const declarations = [
  "      function removeBlockFromSlot(sec, id) { if (sec && id) deleteGridItem(sec, id, true); }",
  "      function moveBlockBetweenSlots() {}",
  "      function migrateLegacyBlockToSlot() {}",
  "      function confirmReplaceBlockInSlot() {}",
  "      function addSlotToSec(sec) { return insertBlockDirectly('solo-text', sec ? sec.id : null); }",
  "      var duplicateSlotInSec = function(sec, id) { return duplicateGridItem(sec, id); };",
  "      var deleteSlotFromSec = function(sec, id, force) { return deleteGridItem(sec, id, force); };",
  ""
].join(nl);

content = content.slice(0, targetIdx) + declarations + content.slice(targetIdx);
fs.writeFileSync(studioPath, content, 'utf8');
console.log('✓ Added declarations before window.__uatLayoutForge');

