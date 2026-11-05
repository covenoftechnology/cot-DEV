const fs = require('fs');
let code = fs.readFileSync('src/pages/lab/layout-forge/studio.astro', 'utf8');

// 1. Move splice before commitBlockPlacement in cellSlot click
const oldSplice = `                    var placedBlockData = (activePlacement.legacySource && activePlacement.legacySource.block) ? activePlacement.legacySource.block.data : null;
                    var legacySource = activePlacement.legacySource;
                    commitBlockPlacement(sec, activePlacement.blockType, res.columnStart, res.columnSpan, res.rowStart, placedBlockData);
                    if (legacySource && legacySource.sec && Array.isArray(legacySource.sec.blocks)) {
                      legacySource.sec.blocks.splice(legacySource.index, 1);
                    }`;

const newSplice = `                    var legacySource = activePlacement.legacySource;
                    var placedBlockData = (legacySource && legacySource.block) ? legacySource.block.data : null;
                    if (legacySource && legacySource.sec && Array.isArray(legacySource.sec.blocks)) {
                      legacySource.sec.blocks.splice(legacySource.index, 1);
                    }
                    commitBlockPlacement(sec, activePlacement.blockType, res.columnStart, res.columnSpan, res.rowStart, placedBlockData);`;

if (!code.includes(oldSplice)) {
  console.error('oldSplice not found!');
  process.exit(1);
}

code = code.replace(oldSplice, newSplice);

// 2. Also update canvas click background handler to do the same
const oldCanvasClick = `              if (res.valid) {
                var preloaded = (activePlacement.legacySource && activePlacement.legacySource.block) ? activePlacement.legacySource.block.data : null;
                var legSrc = activePlacement.legacySource;
                commitBlockPlacement(sec, activePlacement.blockType, res.columnStart, res.columnSpan, res.rowStart, preloaded);
                if (legSrc && legSrc.sec && Array.isArray(legSrc.sec.blocks)) {
                  legSrc.sec.blocks.splice(legSrc.index, 1);
                }
                exitPlacementMode();
                return;
              }`;

const newCanvasClick = `              if (res.valid) {
                var legSrc = activePlacement.legacySource;
                var preloaded = (legSrc && legSrc.block) ? legSrc.block.data : null;
                if (legSrc && legSrc.sec && Array.isArray(legSrc.sec.blocks)) {
                  legSrc.sec.blocks.splice(legSrc.index, 1);
                }
                commitBlockPlacement(sec, activePlacement.blockType, res.columnStart, res.columnSpan, res.rowStart, preloaded);
                exitPlacementMode();
                return;
              }`;

if (code.includes(oldCanvasClick)) {
  code = code.replace(oldCanvasClick, newCanvasClick);
}

// 3. Make resolvePointerToGridCell robust against NaN / undefined clientX / clientY
const oldResolveMath = `        var relX = clientX - (rect.left + padding);
        var relY = clientY - (rect.top + padding);`;

const newResolveMath = `        var x = (typeof clientX === 'number' && !isNaN(clientX)) ? clientX : (rect.left + padding);
        var y = (typeof clientY === 'number' && !isNaN(clientY)) ? clientY : (rect.top + padding);
        var relX = x - (rect.left + padding);
        var relY = y - (rect.top + padding);`;

if (code.includes(oldResolveMath)) {
  code = code.replace(oldResolveMath, newResolveMath);
}

fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf8');
console.log('Successfully updated splice order and pointer safety in studio.astro!');

