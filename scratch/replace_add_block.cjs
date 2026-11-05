const fs = require('fs');

const studioPath = 'src/pages/lab/layout-forge/studio.astro';
let content = fs.readFileSync(studioPath, 'utf8');

const isCRLF = content.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// Replace the old addBlockToActiveSection implementation
const oldAddBlockLines = [
  "      // ── Blocks Management ───────────────────────────────",
  "      function addBlockToActiveSection(type, secId) {",
  "        if (!isAllowedInGridSlot(type)) {",
  "          if (type === 'flex-layout') {",
  "            showToast('Flexible Layout cannot be placed inside a Grid Slot. The Section Grid is your layout canvas.', 'warning');",
  "          } else {",
  "            showToast('Block type is non-insertable: ' + type, 'warning');",
  "          }",
  "          return;",
  "        }",
  "",
  "        var targetSecId = secId || activeSectionId || (currentDoc.sections[0] ? currentDoc.sections[0].id : null);",
  "        var sec = currentDoc.sections.find(function(s) { return s.id === targetSecId; }) || currentDoc.sections[0];",
  "        if (!sec || !sec.visualGrid) return;",
  "",
  "        var activeSlotId = secActiveSlotIds[sec.id];",
  "        var targetSlot = null;",
  "        if (activeSlotId && Array.isArray(sec.visualGrid.slots)) {",
  "          targetSlot = sec.visualGrid.slots.find(function(s) { return s.id === activeSlotId; });",
  "        }",
  "",
  "        if (!targetSlot) {",
  "          showToast('Select an empty Grid Slot first.', 'warning');",
  "          return;",
  "        }",
  "",
  "        if (targetSlot.block) {",
  "          confirmReplaceBlockInSlot(sec, targetSlot, type);",
  "        } else {",
  "          insertBlockIntoSlot(sec, targetSlot, type);",
  "        }",
  "      }"
].join(nl);

const newAddBlockLines = [
  "      // ── Blocks Management (Grid Composer V2 LEGO Builder) ───────────────────",
  "      function addBlockToActiveSection(type, secId) {",
  "        return insertBlockDirectly(type, secId);",
  "      }",
  "      function confirmReplaceBlockInSlot() {}"
].join(nl);

if (content.includes(oldAddBlockLines)) {
  content = content.replace(oldAddBlockLines, newAddBlockLines);
  console.log('✓ Successfully replaced addBlockToActiveSection with insertBlockDirectly');
} else {
  console.log('Exact match not found for oldAddBlockLines, attempting line search...');
  const idx = content.indexOf('function addBlockToActiveSection(type, secId)');
  if (idx !== -1) {
    const endIdx = content.indexOf('function regenerateBlockNestedIds(block)', idx);
    if (endIdx !== -1) {
      content = content.slice(0, idx) +
        "function addBlockToActiveSection(type, secId) {" + nl +
        "        return insertBlockDirectly(type, secId);" + nl +
        "      }" + nl +
        "      function confirmReplaceBlockInSlot() {}" + nl + nl + "      " +
        content.slice(endIdx);
      console.log('✓ Replaced addBlockToActiveSection via slice');
    }
  }
}

fs.writeFileSync(studioPath, content, 'utf8');
console.log('Done!');

