const fs = require('fs');

let code = fs.readFileSync('src/pages/lab/layout-forge/preview.astro', 'utf8');

// 1. Add import of migrateSectionToGridComposerV2
code = code.replace(
  "import type { ArticleDocument, ArticleSection, ArticleBlock } from '../../../uat/article-forge/types/article-document';",
  "import type { ArticleDocument, ArticleSection, ArticleBlock } from '../../../uat/article-forge/types/article-document';\nimport { migrateSectionToGridComposerV2 } from '../../../uat/article-forge/grid/geometry';"
);

// 2. Update default baseline doc visualGrid to 12-column
code = code.replace(
  `      visualGrid: {
        columns: 3,
        rows: 2,
        columnGap: 16,
        rowGap: 16,
        minRowHeight: 80,
        slots: [
          {
            id: 'slot-welcome',
            columnStart: 1,
            columnEnd: 4,
            rowStart: 1,
            rowEnd: 2,
            block: {
              id: 'welcome-block',
              type: 'title-text',
              data: {
                kicker: 'UAT PREVIEW READY',
                heading: 'Your Grid Layout will appear here',
                paragraphs: [
                  'Return to the UAT Article Forge editor, design your Visual Grid and Slots, and click "Preview" to view your article rendered here with exact Coven visual parity.'
                ]
              }
            }
          }
        ]
      },`,
  `      visualGrid: {
        columns: 12,
        rows: 2,
        columnGap: 16,
        rowGap: 16,
        minRowHeight: 80,
        layoutItems: [
          {
            id: 'item-welcome',
            columnStart: 1,
            columnSpan: 12,
            columnEnd: 13,
            rowStart: 1,
            rowSpan: 1,
            rowEnd: 2,
            block: {
              id: 'welcome-block',
              type: 'title-text',
              data: {
                kicker: 'UAT PREVIEW READY',
                heading: 'Your 12-Column Grid Layout will appear here',
                paragraphs: [
                  'Return to the UAT Article Forge editor, compose your section with the 12-column LEGO-style Grid Composer, and click "Preview" to view your article rendered here with exact Coven visual parity.'
                ]
              }
            }
          }
        ],
        slots: []
      },`
);

// 3. Migrate sections before rendering
const oldSectionMap = `    {doc.sections && doc.sections.map((section: any, sIndex: number) => {
      const sectionId = slugify(section.title) || \`section-\${sIndex + 1}\`;
      const sectionTitle = (typeof section.title === 'string' ? section.title.trim() : '') ||
                           (typeof section.heading === 'string' ? section.heading.trim() : '') ||
                           \`Section \${sIndex + 1}\`;
      const vg = section.visualGrid || { columns: 3, rows: 2, columnGap: 16, rowGap: 16, minRowHeight: 80, slots: [] };
      const cols = vg.columns || 3;
      const minRowHeight = vg.minRowHeight || 80;
      const colGap = vg.columnGap !== undefined ? vg.columnGap : 16;
      const rowGap = vg.rowGap !== undefined ? vg.rowGap : 16;
      const slots = Array.isArray(vg.slots) ? vg.slots : [];

      // Sort slots deterministically by reading order: rowStart ASC, columnStart ASC
      const sortedSlots = [...slots].sort((a, b) => {
        if (a.rowStart !== b.rowStart) return a.rowStart - b.rowStart;
        return a.columnStart - b.columnStart;
      });`;

const newSectionMap = `    {doc.sections && doc.sections.map((section: any, sIndex: number) => {
      const sectionId = slugify(section.title) || \`section-\${sIndex + 1}\`;
      const sectionTitle = (typeof section.title === 'string' ? section.title.trim() : '') ||
                           (typeof section.heading === 'string' ? section.heading.trim() : '') ||
                           \`Section \${sIndex + 1}\`;
      const vg = migrateSectionToGridComposerV2(section);
      const cols = vg.columns || 12;
      const minRowHeight = vg.minRowHeight || 80;
      const colGap = vg.columnGap !== undefined ? vg.columnGap : 16;
      const rowGap = vg.rowGap !== undefined ? vg.rowGap : 16;
      const rawItems = Array.isArray(vg.layoutItems) && vg.layoutItems.length > 0 ? vg.layoutItems : (Array.isArray(vg.slots) ? vg.slots : []);

      // Sort placed blocks deterministically by reading order: rowStart ASC, columnStart ASC
      const sortedSlots = [...rawItems].filter(it => Boolean(it.block)).sort((a, b) => {
        if (a.rowStart !== b.rowStart) return a.rowStart - b.rowStart;
        return a.columnStart - b.columnStart;
      });`;

code = code.replace(oldSectionMap, newSectionMap);

// 4. In slot render:
const oldSlotRender = `              {sortedSlots.map((slot: any, slIndex: number) => {
                const hasBlock = Boolean(slot.block);
                const slotStyle = \`
                  grid-column: \${slot.columnStart} / \${slot.columnEnd};
                  grid-row: \${slot.rowStart} / \${slot.rowEnd};
                \`;
                return (
                  <div
                    class={\`reader-grid-slot \${!hasBlock ? 'reader-grid-slot--empty' : ''}\`}
                    style={slotStyle}
                    data-slot-id={slot.id}
                    data-col-start={slot.columnStart}
                    data-col-end={slot.columnEnd}
                    data-row-start={slot.rowStart}
                    data-row-end={slot.rowEnd}
                  >
                    {hasBlock ? (
                      <ArticleBlockRenderer block={slot.block} sIndex={sIndex} bIndex={slIndex} doc={doc} />
                    ) : null}
                  </div>
                );
              })}`;

const newSlotRender = `              {sortedSlots.map((slot: any, slIndex: number) => {
                const hasBlock = Boolean(slot.block);
                if (!hasBlock) return null;
                const colStart = slot.columnStart || 1;
                const colSpan = slot.columnSpan || Math.max(1, (slot.columnEnd || (colStart + 1)) - colStart);
                const rowStart = slot.rowStart || 1;
                const rowSpan = slot.rowSpan || Math.max(1, (slot.rowEnd || (rowStart + 1)) - rowStart);
                const slotStyle = \`
                  grid-column: \${colStart} / span \${colSpan};
                  grid-row: \${rowStart} / span \${rowSpan};
                \`;
                return (
                  <div
                    class="reader-grid-item reader-grid-slot"
                    style={slotStyle}
                    data-item-id={slot.id}
                    data-slot-id={slot.id}
                    data-col-start={colStart}
                    data-col-span={colSpan}
                    data-row-start={rowStart}
                    data-row-span={rowSpan}
                  >
                    <ArticleBlockRenderer block={slot.block} sIndex={sIndex} bIndex={slIndex} doc={doc} />
                  </div>
                );
              })}`;

code = code.replace(oldSlotRender, newSlotRender);

// 5. Update style for item classes
code = code.replace(
  `  .reader-grid-slot {
    box-sizing: border-box;
    min-width: 0;
    position: relative;
    display: flex;
    flex-direction: column;
  }`,
  `  .reader-grid-item,
  .reader-grid-slot {
    box-sizing: border-box;
    min-width: 0;
    position: relative;
    display: flex;
    flex-direction: column;
  }`
);

code = code.replace(
  `    .reader-grid-slot {
      grid-column: 1 / -1 !important;
      grid-row: auto !important;
      width: 100% !important;
    }`,
  `    .reader-grid-item,
    .reader-grid-slot {
      grid-column: 1 / -1 !important;
      grid-row: auto !important;
      width: 100% !important;
    }`
);

fs.writeFileSync('src/pages/lab/layout-forge/preview.astro', code, 'utf8');
console.log('Successfully updated preview.astro!');

