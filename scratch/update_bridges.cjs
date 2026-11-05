const fs = require('fs');

const studioPath = 'src/pages/lab/layout-forge/studio.astro';
let content = fs.readFileSync(studioPath, 'utf8');

const oldBridges = `      window.__uatLayoutForge = {
        isAllowedInGridSlot: isAllowedInGridSlot,
        insertBlockIntoSlot: insertBlockIntoSlot,
        confirmReplaceBlockInSlot: confirmReplaceBlockInSlot,
        removeBlockFromSlot: removeBlockFromSlot,
        moveBlockBetweenSlots: moveBlockBetweenSlots,
        duplicateSlotInSec: duplicateSlotInSec,
        migrateLegacyBlockToSlot: migrateLegacyBlockToSlot,
        deleteSlotFromSec: deleteSlotFromSec,
        getSecHistory: getSecHistory,
        undoSectionVisualGrid: undoSectionVisualGrid,
        redoSectionVisualGrid: redoSectionVisualGrid,
        renderSections: renderSections,
        uid: uid,
        checkSlotCollisionState: checkSlotCollisionState
      };`;

const newBridges = `      // Compatibility & Grid Composer V2 methods
      function addSlotToSec(sec) {
        return insertBlockDirectly('paragraph', sec ? sec.id : null);
      }
      var duplicateSlotInSec = duplicateGridItem;
      var deleteSlotFromSec = deleteGridItem;
      function confirmReplaceBlockInSlot() {}
      function removeBlockFromSlot(sec, id) { deleteGridItem(sec, id, true); }
      function moveBlockBetweenSlots() {}
      function migrateLegacyBlockToSlot() {}

      window.__uatLayoutForge = {
        isAllowedInGridSlot: isAllowedInGridSlot,
        insertBlockDirectly: insertBlockDirectly,
        insertBlockIntoSlot: insertBlockIntoSlot,
        duplicateGridItem: duplicateGridItem,
        deleteGridItem: deleteGridItem,
        duplicateSlotInSec: duplicateSlotInSec,
        deleteSlotFromSec: deleteSlotFromSec,
        addSlotToSec: addSlotToSec,
        findFirstAvailablePlacement: findFirstAvailablePlacement,
        migrateSectionToGridComposerV2: migrateSectionToGridComposerV2,
        getSpanPercentageLabel: getSpanPercentageLabel,
        getSecHistory: getSecHistory,
        undoSectionVisualGrid: undoSectionVisualGrid,
        redoSectionVisualGrid: redoSectionVisualGrid,
        renderSections: renderSections,
        uid: uid,
        checkSlotCollisionState: checkSlotCollisionState
      };`;

content = content.replace(oldBridges, newBridges);

content = content.replace(
  'window.addSlotToSec = addSlotToSec;',
  `window.addSlotToSec = addSlotToSec;
      window.duplicateGridItem = duplicateGridItem;
      window.deleteGridItem = deleteGridItem;
      window.duplicateSlotInSec = duplicateSlotInSec;
      window.deleteSlotFromSec = deleteSlotFromSec;
      window.findFirstAvailablePlacement = findFirstAvailablePlacement;
      window.migrateSectionToGridComposerV2 = migrateSectionToGridComposerV2;
      window.getSpanPercentageLabel = getSpanPercentageLabel;`
);

fs.writeFileSync(studioPath, content, 'utf8');
console.log('Successfully updated bridges in studio.astro!');

