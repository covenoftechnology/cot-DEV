const fs = require('fs');
let code = fs.readFileSync('src/uat/article-forge/integration.ts', 'utf-8');

// 1. Fix deepCloneAndRegenerateIds
const oldCloneSnippet = /if \(sec\.visualGrid\) \{\s+const items = Array\.isArray\(sec\.visualGrid\.layoutItems\)[\s\S]*?if \(false\) \{\s+sec\.visualGrid\.slots\.forEach[\s\S]*?\}\s+\}/;

const newCloneSnippet = `if (sec.visualGrid) {
        const items = Array.isArray(sec.visualGrid.layoutItems) ? sec.visualGrid.layoutItems : (Array.isArray(sec.visualGrid.slots) ? sec.visualGrid.slots : []);
        sec.visualGrid.layoutItems = items.map((slot: any) => {
          const newSlot = { ...slot, id: uid('item') };
          if (newSlot.block) {
            newSlot.block = { ...newSlot.block, id: uid('blk') };
            // Regenerate nested blocks if composite (like callout)
            if (newSlot.block.data && Array.isArray(newSlot.block.data.blocks)) {
              newSlot.block.data.blocks = newSlot.block.data.blocks.map((child: any) => ({
                ...child,
                id: uid('blk')
              }));
            }
          }
          return newSlot;
        });
        delete sec.visualGrid.slots;
      }
      delete sec.layout;`;

code = code.replace(oldCloneSnippet, newCloneSnippet);

// 2. Fix draft listing counts
const oldListSnippet = /if \(sec\.visualGrid\) \{\s+const items = Array\.isArray\(sec\.visualGrid\.layoutItems\)[\s\S]*?if \(false\) \{\s+slotCount \+= sec\.visualGrid\.slots\.length;[\s\S]*?\}\s+\}/;

const newListSnippet = `if (sec.visualGrid) {
                                  const items = Array.isArray(sec.visualGrid.layoutItems) ? sec.visualGrid.layoutItems : (Array.isArray(sec.visualGrid.slots) ? sec.visualGrid.slots : []);
                                  slotCount += items.length;
                                  for (const s of items) {
                                    if (s.block) blockCount++;
                                  }
                                }`;

code = code.replace(oldListSnippet, newListSnippet);

// 3. Normalize doc in POST /__uat-article-forge/draft
const postTarget = `// Atomic write via temp file`;
const postRepl = `// Enforce single authoritative layout contract on disk: visualGrid.layoutItems
                        if (Array.isArray(doc.sections)) {
                          for (const sec of doc.sections) {
                            if (sec.visualGrid) {
                              if (!Array.isArray(sec.visualGrid.layoutItems) && Array.isArray(sec.visualGrid.slots)) {
                                sec.visualGrid.layoutItems = sec.visualGrid.slots;
                              }
                              if (!Array.isArray(sec.visualGrid.layoutItems)) {
                                sec.visualGrid.layoutItems = [];
                              }
                              delete sec.visualGrid.slots;
                            }
                            delete sec.layout;
                          }
                        }

                        // Atomic write via temp file`;

if (!code.includes('Enforce single authoritative layout contract on disk')) {
  code = code.replace(postTarget, postRepl);
}

fs.writeFileSync('src/uat/article-forge/integration.ts', code, 'utf-8');
console.log('Successfully updated integration.ts');

