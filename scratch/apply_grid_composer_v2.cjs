const fs = require('fs');

let code = fs.readFileSync('src/pages/lab/layout-forge/studio.astro', 'utf8');

// 1. Add import of composer.css at top
if (!code.includes("import '../../../uat/article-forge/grid/composer.css';")) {
  code = code.replace(
    "import '../../../uat/article-forge/layout-grid/styles.css';",
    "import '../../../uat/article-forge/layout-grid/styles.css';\nimport '../../../uat/article-forge/grid/composer.css';"
  );
}

// 2. Update initialSec defaults to 12 columns
code = code.replace(
  `      var initialSecId = uid('sec');
      var initialSec = {
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
      };`,
  `      var initialSecId = uid('sec');
      var initialSec = {
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
      };`
);

code = code.replace(
  `        var initialSec = {
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
        };`,
  `        var initialSec = {
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
        };`
);

// 3. Update normalizeDocument to use migrateSectionToGridComposerV2 logic
const oldNormalizeSections = `        // Phase 3 & 4: Ensure each section owns an independent VisualGrid with slots
        doc.sections.forEach(function(sec) {
          if (!sec.visualGrid && !sec.layout) {
            sec.visualGrid = {
              columns: 3,
              rows: 3,
              columnGap: 16,
              rowGap: 16,
              minRowHeight: 80,
              showCoordinates: false,
              slots: []
            };
          } else if (!sec.visualGrid && sec.layout) {
            sec.visualGrid = sec.layout;
          }
          sec.layout = sec.visualGrid;
          if (!Array.isArray(sec.visualGrid.slots)) sec.visualGrid.slots = [];
          if (!Array.isArray(sec.blocks)) sec.blocks = [];

          // Phase 4: Ensure every slot has block property defined
          sec.visualGrid.slots.forEach(function(slot) {
            if (slot.block === undefined) slot.block = null;
          });
        });`;

const newNormalizeSections = `        // Phase C: Grid Composer V2 migration (12-column spatial LEGO builder)
        doc.sections.forEach(function(sec) {
          migrateSectionToGridComposerV2(sec);
        });`;

code = code.replace(oldNormalizeSections, newNormalizeSections);

// 4. Replace addBlockToActiveSection with insertBlockDirectly
const oldAddBlockToActiveSection = `      // ── Blocks Management ───────────────────────────────
      function addBlockToActiveSection(type, secId) {
        if (!isAllowedInGridSlot(type)) {
          if (type === 'flex-layout') {
            showToast('Flexible Layout cannot be placed inside a Grid Slot. The Section Grid is your layout canvas.', 'warning');
          } else {
            showToast('Block type is non-insertable: ' + type, 'warning');
          }
          return;
        }

        var targetSecId = secId || activeSectionId || (currentDoc.sections[0] ? currentDoc.sections[0].id : null);
        var sec = currentDoc.sections.find(function(s) { return s.id === targetSecId; }) || currentDoc.sections[0];
        if (!sec || !sec.visualGrid) return;

        var activeSlotId = secActiveSlotIds[sec.id];
        var targetSlot = null;
        if (activeSlotId && Array.isArray(sec.visualGrid.slots)) {
          targetSlot = sec.visualGrid.slots.find(function(s) { return s.id === activeSlotId; });
        }

        if (!targetSlot) {
          showToast('Select an empty Grid Slot first.', 'warning');
          return;
        }

        if (targetSlot.block) {
          confirmReplaceBlockInSlot(sec, targetSlot, type);
        } else {
          insertBlockIntoSlot(sec, targetSlot, type);
        }
      }`;

const newAddBlockToActiveSection = `      // ── Blocks Management (Grid Composer V2 LEGO Builder) ───────────────────
      function addBlockToActiveSection(type, secId) {
        insertBlockDirectly(type, secId);
      }`;

code = code.replace(oldAddBlockToActiveSection, newAddBlockToActiveSection);

fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf8');
console.log('Step 1 replacements done.');

