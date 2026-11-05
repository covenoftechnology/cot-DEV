const fs = require('fs');

const studioPath = 'src/pages/lab/layout-forge/studio.astro';
let content = fs.readFileSync(studioPath, 'utf8');

const isCRLF = content.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// 0. Update library card click handlers to enter placement mode
const targetLibClick = `            card.querySelector('.studio-btn--insert').addEventListener('click', function(e) {
              e.stopPropagation();
              addBlockToActiveSection(blk.type);
            });

            card.addEventListener('click', function() {
              addBlockToActiveSection(blk.type);
            });`;

const replLibClick = `            card.querySelector('.studio-btn--insert').addEventListener('click', function(e) {
              e.stopPropagation();
              if (window.enterPlacementMode) {
                window.enterPlacementMode(blk.type);
              } else {
                addBlockToActiveSection(blk.type);
              }
            });

            card.addEventListener('click', function() {
              if (window.enterPlacementMode) {
                window.enterPlacementMode(blk.type);
              } else {
                addBlockToActiveSection(blk.type);
              }
            });`;

if (content.includes('addBlockToActiveSection(blk.type);')) {
  content = content.replace(targetLibClick, replLibClick);
}
const startMarker = "SECTION GRID COMPOSER V2 ENGINE";
const endMarker = "// ── Phase 5 Modals & Recovery UI ──";

const startPos = content.indexOf(startMarker);
const endPos = content.indexOf(endMarker);

if (startPos === -1 || endPos === -1) {
  console.error("Markers not found! startPos:", startPos, "endPos:", endPos);
  process.exit(1);
}

const prevBlockComment = content.lastIndexOf('// ═════════════════════════════════════════════════════════════', startPos);
const actualStart = prevBlockComment !== -1 ? prevBlockComment : startPos;

// 2. Build the True 4-Column UX Grid Engine
const newEngine = `// ═════════════════════════════════════════════════════════════
      // SECTION GRID COMPOSER V2 ENGINE (TRUE 4-COLUMN VISUAL BUILDER)
      // 4-Column Spatial LEGO Builder with Content-Driven Height & Interactive Cells
      // ═════════════════════════════════════════════════════════════

      var DEFAULT_GRID_COLUMNS = 4;
      var MAX_GRID_ROWS = 200;
      var MIN_GRID_ROWS = 3;
      window.DEFAULT_GRID_COLUMNS = DEFAULT_GRID_COLUMNS;
      window.MAX_GRID_ROWS = MAX_GRID_ROWS;
      window.MIN_GRID_ROWS = MIN_GRID_ROWS;

      var secGridHistories = {}; // secId -> { past: [], future: [] }
      var secActiveSlotIds = {}; // secId -> itemId | null
      var secGridInteractions = {}; // secId -> interaction state
      var activePlacement = null; // { blockType: string, widthSpan: number, label: string }
      var activeMove = null; // { secId: string, itemId: string, item: object }
      window.activePlacement = activePlacement;
      window.activeMove = activeMove;

      function clampVal(val, min, max) {
        return Math.min(Math.max(val, min), max);
      }

      function rectsOverlapCoords(r1, r2) {
        var r1ColStart = r1.columnStart || 1;
        var r1ColSpan = r1.columnSpan || Math.max(1, (r1.columnEnd || (r1ColStart + 1)) - r1ColStart);
        var r1ColEnd = r1.columnEnd || (r1ColStart + r1ColSpan);

        var r1RowStart = r1.rowStart || 1;
        var r1RowSpan = r1.rowSpan || Math.max(1, (r1.rowEnd || (r1RowStart + 1)) - r1RowStart);
        var r1RowEnd = r1.rowEnd || (r1RowStart + r1RowSpan);

        var r2ColStart = r2.columnStart || 1;
        var r2ColSpan = r2.columnSpan || Math.max(1, (r2.columnEnd || (r2ColStart + 1)) - r2ColStart);
        var r2ColEnd = r2.columnEnd || (r2ColStart + r2ColSpan);

        var r2RowStart = r2.rowStart || 1;
        var r2RowSpan = r2.rowSpan || Math.max(1, (r2.rowEnd || (r2RowStart + 1)) - r2RowStart);
        var r2RowEnd = r2.rowEnd || (r2.rowStart + r2.rowSpan);

        var colOverlap = Math.max(r1ColStart, r2ColStart) < Math.min(r1ColEnd, r2ColEnd);
        var rowOverlap = Math.max(r1RowStart, r2RowStart) < Math.min(r1RowEnd, r2RowEnd);
        return colOverlap && rowOverlap;
      }

      function checkSlotCollisionState(items, excludeId, rect) {
        if (!Array.isArray(items)) return false;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (it.id === excludeId) continue;
          if (rectsOverlapCoords(it, rect)) return true;
        }
        return false;
      }
      window.checkSlotCollisionState = checkSlotCollisionState;

      function getSpanPercentageLabel(colSpan) {
        var s = clampVal(colSpan, 1, 4);
        switch (s) {
          case 1: return '25%';
          case 2: return '50%';
          case 3: return '75%';
          case 4: return '100%';
          default: return (s * 25) + '%';
        }
      }
      window.getSpanPercentageLabel = getSpanPercentageLabel;

      function getRequiredRowsForItems(items) {
        var maxRow = 1;
        if (Array.isArray(items)) {
          items.forEach(function(it) {
            var end = (it.rowStart || 1) + (it.rowSpan || 1) - 1;
            if (end > maxRow) maxRow = end;
          });
        }
        return maxRow;
      }

      function normalizeSectionRows(sec) {
        if (!sec || !sec.visualGrid) return;
        var vg = sec.visualGrid;
        var items = Array.isArray(vg.layoutItems) ? vg.layoutItems : (Array.isArray(vg.slots) ? vg.slots : []);
        var highest = getRequiredRowsForItems(items);
        // Preserve occupied rows + 1 empty working row underneath
        vg.rows = clampVal(Math.max(MIN_GRID_ROWS, highest + 1), MIN_GRID_ROWS, MAX_GRID_ROWS);
      }
      window.normalizeSectionRows = normalizeSectionRows;

      function findFirstAvailablePlacement(items, currentRows, preferredColSpan, preferredRowSpan) {
        var span = clampVal(preferredColSpan || 4, 1, 4);
        var rSpan = 1; // Content-driven: blocks occupy 1 logical row
        var rows = clampVal(currentRows || MIN_GRID_ROWS, MIN_GRID_ROWS, MAX_GRID_ROWS);

        // 1. Scan row by row, column by column
        for (var r = 1; r <= rows; r++) {
          for (var c = 1; c <= 4 - span + 1; c++) {
            var cand = { columnStart: c, columnSpan: span, columnEnd: c + span, rowStart: r, rowSpan: rSpan, rowEnd: r + rSpan };
            if (!checkSlotCollisionState(items, null, cand)) {
              return {
                columnStart: c,
                columnSpan: span,
                rowStart: r,
                rowSpan: rSpan,
                requiredRows: Math.min(MAX_GRID_ROWS, Math.max(rows, r + 1))
              };
            }
          }
        }

        // 2. Append new row at the bottom
        var newRow = Math.min(MAX_GRID_ROWS, rows + 1);
        return {
          columnStart: 1,
          columnSpan: span,
          rowStart: newRow,
          rowSpan: rSpan,
          requiredRows: Math.min(MAX_GRID_ROWS, newRow + 1)
        };
      }
      window.findFirstAvailablePlacement = findFirstAvailablePlacement;

      function migrateSectionToGridComposerV2(sec) {
        if (!sec) return;
        if (!sec.visualGrid && !sec.layout) {
          sec.visualGrid = {
            columns: 4,
            rows: MIN_GRID_ROWS,
            columnGap: 16,
            rowGap: 16,
            minRowHeight: 80,
            showCoordinates: false,
            layoutItems: [],
            slots: []
          };
          sec.layout = sec.visualGrid;
          return sec.visualGrid;
        }

        var vg = sec.visualGrid || sec.layout;
        sec.visualGrid = vg;
        sec.layout = vg;

        var oldCols = vg.columns || 12;
        var rawItems = Array.isArray(vg.layoutItems) ? vg.layoutItems : (Array.isArray(vg.slots) ? vg.slots : []);
        var newItems = [];

        rawItems.forEach(function(it) {
          var block = it.block || (Array.isArray(it.blocks) && it.blocks[0] ? it.blocks[0] : null);
          if (!block) return;

          var oldColStart = it.columnStart || 1;
          var oldColEnd = it.columnEnd || (oldColStart + 1);
          var oldSpan = it.columnSpan || Math.max(1, oldColEnd - oldColStart);

          var colStart = 1;
          var colSpan = 4;

          if (oldCols === 4) {
            colStart = clampVal(oldColStart, 1, 4);
            colSpan = clampVal(oldSpan, 1, 4 - colStart + 1);
          } else if (oldCols === 12) {
            colStart = clampVal(Math.round((oldColStart - 1) / 3) + 1, 1, 4);
            colSpan = clampVal(Math.round(oldSpan / 3), 1, 4 - colStart + 1);
          } else if (oldCols === 3) {
            colStart = clampVal(oldColStart, 1, 4);
            colSpan = clampVal(oldSpan, 1, 4 - colStart + 1);
          } else {
            colStart = clampVal(oldColStart, 1, 4);
            colSpan = clampVal(oldSpan, 1, 4 - colStart + 1);
          }

          var rStart = clampVal(it.rowStart || 1, 1, MAX_GRID_ROWS);

          newItems.push({
            id: it.id || uid('grid_item'),
            columnStart: colStart,
            columnSpan: colSpan,
            columnEnd: colStart + colSpan,
            rowStart: rStart,
            rowSpan: 1, // Content-driven logical row
            rowEnd: rStart + 1,
            block: block,
            label: it.label || (window.STUDIO_REGISTRY[block.type] ? window.STUDIO_REGISTRY[block.type].label : block.type)
          });
        });

        // Fallback for legacy sec.blocks
        if (newItems.length === 0 && Array.isArray(sec.blocks) && sec.blocks.length > 0) {
          sec.blocks.forEach(function(blk, idx) {
            var r = clampVal(idx + 1, 1, MAX_GRID_ROWS);
            newItems.push({
              id: 'migrated_' + (blk.id || idx),
              columnStart: 1,
              columnSpan: 4,
              columnEnd: 5,
              rowStart: r,
              rowSpan: 1,
              rowEnd: r + 1,
              block: blk,
              label: window.STUDIO_REGISTRY[blk.type] ? window.STUDIO_REGISTRY[blk.type].label : blk.type
            });
          });
        }

        vg.columns = 4;
        var highestRow = newItems.reduce(function(m, it) { return Math.max(m, it.rowStart); }, 0);

        // Defensive normalization for corrupted huge-row drafts
        if (vg.rows > 50 && highestRow < 30) {
          console.warn('[UAT Grid Composer] Normalizing runaway rows (' + vg.rows + ' -> ' + Math.max(MIN_GRID_ROWS, highestRow + 1) + ')');
          vg.rows = Math.max(MIN_GRID_ROWS, highestRow + 1);
        } else {
          vg.rows = clampVal(Math.max(MIN_GRID_ROWS, highestRow + 1, vg.rows || MIN_GRID_ROWS), MIN_GRID_ROWS, MAX_GRID_ROWS);
        }

        vg.layoutItems = newItems;
        vg.slots = newItems;
        return vg;
      }
      window.migrateSectionToGridComposerV2 = migrateSectionToGridComposerV2;

      function getSecHistory(secId) {
        if (!secGridHistories[secId]) {
          secGridHistories[secId] = { past: [], future: [] };
        }
        return secGridHistories[secId];
      }

      function pushSectionHistory(sec) {
        if (!sec || !sec.visualGrid) return;
        var h = getSecHistory(sec.id);
        var snap = JSON.parse(JSON.stringify(sec.visualGrid));
        h.past.push(snap);
        if (h.past.length > 50) h.past.shift();
        h.future = [];
      }

      function undoSectionVisualGrid(sec) {
        var h = getSecHistory(sec.id);
        if (h.past.length === 0) return;
        var cur = JSON.parse(JSON.stringify(sec.visualGrid));
        h.future.push(cur);
        var prev = h.past.pop();
        sec.visualGrid = prev;
        sec.layout = prev;
        renderSections();
        triggerAutosave();
        showToast('Undo layout: ' + sec.title);
      }

      function redoSectionVisualGrid(sec) {
        var h = getSecHistory(sec.id);
        if (h.future.length === 0) return;
        var cur = JSON.parse(JSON.stringify(sec.visualGrid));
        h.past.push(cur);
        var next = h.future.pop();
        sec.visualGrid = next;
        sec.layout = next;
        renderSections();
        triggerAutosave();
        showToast('Redo layout: ' + sec.title);
      }

      function isAllowedInGridSlot(type) {
        if (!type || type === 'flex-layout') return false;
        if (!window.STUDIO_REGISTRY || !window.STUDIO_REGISTRY[type]) return false;
        return isInsertablePaletteBlock(type);
      }

      // ── PLACEMENT MODE & CLICK-TO-MOVE CONTROLS ──
      function enterPlacementMode(blockType, defaultWidth) {
        var canonicalType = blockType;
        if (blockType === 'paragraph') canonicalType = 'solo-text';
        if (blockType === 'quote') canonicalType = 'pullquote';
        if (blockType === 'image' || blockType === 'media-image') canonicalType = 'single-image';

        if (!isAllowedInGridSlot(canonicalType)) {
          showToast('Block type is non-insertable: ' + blockType, 'warning');
          return;
        }

        var def = window.STUDIO_REGISTRY[canonicalType];
        if (!def) {
          showToast('Unknown block type: ' + canonicalType, 'error');
          return;
        }

        var span = defaultWidth || 4; // Default 100%
        activePlacement = {
          blockType: canonicalType,
          widthSpan: span,
          label: def.label || canonicalType
        };
        window.activePlacement = activePlacement;
        activeMove = null;
        window.activeMove = null;

        document.body.classList.add('is-grid-placement-mode');
        document.body.classList.remove('is-grid-move-mode');
        renderSections();
        showToast('Placement Mode: Click an available cell to place ' + (def.label || canonicalType) + ' (Esc to cancel)', 'info');
      }
      window.enterPlacementMode = enterPlacementMode;

      function exitPlacementMode() {
        activePlacement = null;
        window.activePlacement = null;
        document.body.classList.remove('is-grid-placement-mode');
        renderSections();
      }
      window.exitPlacementMode = exitPlacementMode;

      function enterMoveMode(sec, item) {
        activeMove = {
          secId: sec.id,
          itemId: item.id,
          item: item
        };
        window.activeMove = activeMove;
        activePlacement = null;
        window.activePlacement = null;

        document.body.classList.add('is-grid-move-mode');
        document.body.classList.remove('is-grid-placement-mode');
        renderSections();
        showToast('Move Mode: Click an available cell to move ' + (item.label || 'Block') + ' (Esc to cancel)', 'info');
      }
      window.enterMoveMode = enterMoveMode;

      function exitMoveMode() {
        activeMove = null;
        window.activeMove = null;
        document.body.classList.remove('is-grid-move-mode');
        renderSections();
      }
      window.exitMoveMode = exitMoveMode;

      // Escape key cancels active placement or move
      window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
          if (activePlacement) {
            exitPlacementMode();
            showToast('Placement cancelled', 'info');
          } else if (activeMove) {
            exitMoveMode();
            showToast('Move cancelled', 'info');
          }
        }
      });

      // Commit Block Placement (Click or Drop)
      function commitBlockPlacement(sec, blockType, colStart, colSpan, rowStart) {
        var def = window.STUDIO_REGISTRY[blockType];
        if (!def) return null;

        var newBlock = {
          id: uid('blk'),
          type: blockType,
          data: JSON.parse(JSON.stringify(def.defaultData || {}))
        };
        regenerateBlockNestedIds(newBlock);

        var span = clampVal(colSpan || 4, 1, 4);
        var start = clampVal(colStart || 1, 1, 4 - span + 1);
        var rStart = clampVal(rowStart || 1, 1, MAX_GRID_ROWS);

        var newItem = {
          id: uid('grid_item'),
          columnStart: start,
          columnSpan: span,
          columnEnd: start + span,
          rowStart: rStart,
          rowSpan: 1, // Content-driven single logical row
          rowEnd: rStart + 1,
          block: newBlock,
          label: def.label || blockType
        };

        pushSectionHistory(sec);
        sec.visualGrid.layoutItems.push(newItem);
        sec.visualGrid.slots = sec.visualGrid.layoutItems;
        secActiveSlotIds[sec.id] = newItem.id;

        normalizeSectionRows(sec);
        renderSections();
        triggerAutosave();
        showToast('Placed ' + (def.label || blockType) + ' (' + getSpanPercentageLabel(span) + ') on Grid', 'success');
        return newItem;
      }
      window.commitBlockPlacement = commitBlockPlacement;

      // Commit Block Move
      function commitBlockMove(sec, item, targetCol, targetRow) {
        var span = item.columnSpan || 4;
        var candColStart = clampVal(targetCol, 1, 4 - span + 1);
        var candRowStart = clampVal(targetRow, 1, MAX_GRID_ROWS);

        var cand = {
          columnStart: candColStart,
          columnSpan: span,
          columnEnd: candColStart + span,
          rowStart: candRowStart,
          rowSpan: 1,
          rowEnd: candRowStart + 1
        };

        if (checkSlotCollisionState(sec.visualGrid.layoutItems, item.id, cand)) {
          showToast('Space occupied — cannot move here', 'warning');
          renderSections();
          return false;
        }

        pushSectionHistory(sec);
        item.columnStart = cand.columnStart;
        item.columnEnd = cand.columnEnd;
        item.rowStart = cand.rowStart;
        item.rowSpan = 1;
        item.rowEnd = cand.rowEnd;

        normalizeSectionRows(sec);
        renderSections();
        triggerAutosave();
        showToast('Moved ' + (item.label || 'block') + ' to row ' + item.rowStart, 'success');
        return true;
      }
      window.commitBlockMove = commitBlockMove;

      // Quick Width Switcher
      function setBlockItemWidth(sec, item, newSpan) {
        var span = clampVal(newSpan, 1, 4);
        if (span === item.columnSpan) return;

        var targetStart = item.columnStart;
        if (targetStart + span - 1 > 4) {
          targetStart = 4 - span + 1;
        }

        var cand = {
          columnStart: targetStart,
          columnSpan: span,
          columnEnd: targetStart + span,
          rowStart: item.rowStart,
          rowSpan: 1,
          rowEnd: item.rowStart + 1
        };

        if (checkSlotCollisionState(sec.visualGrid.layoutItems, item.id, cand)) {
          showToast('Space occupied — cannot expand to ' + getSpanPercentageLabel(span), 'warning');
          renderSections();
          return;
        }

        pushSectionHistory(sec);
        item.columnStart = cand.columnStart;
        item.columnSpan = cand.columnSpan;
        item.columnEnd = cand.columnEnd;
        item.rowSpan = 1;
        item.rowEnd = item.rowStart + 1;

        normalizeSectionRows(sec);
        renderSections();
        triggerAutosave();
        showToast('Resized ' + (item.label || 'block') + ' to ' + getSpanPercentageLabel(span), 'success');
      }
      window.setBlockItemWidth = setBlockItemWidth;

      // Programmatic Direct Insertion (Maintains Full API Parity)
      function insertBlockDirectly(blockType, secId, preferredSpan, preferredRow) {
        var canonicalType = blockType;
        if (blockType === 'paragraph') canonicalType = 'solo-text';
        if (blockType === 'quote') canonicalType = 'pullquote';
        if (blockType === 'image' || blockType === 'media-image') canonicalType = 'single-image';
        blockType = canonicalType;

        if (!isAllowedInGridSlot(blockType)) {
          showToast('Block type is non-insertable: ' + blockType, 'warning');
          return null;
        }

        var def = window.STUDIO_REGISTRY[blockType];
        if (!def) {
          showToast('Unknown block type: ' + blockType, 'error');
          return null;
        }

        var targetSecId = secId || activeSectionId || (currentDoc.sections[0] ? currentDoc.sections[0].id : null);
        var sec = currentDoc.sections.find(function(s) { return s.id === targetSecId; }) || currentDoc.sections[0];
        if (!sec) return null;

        migrateSectionToGridComposerV2(sec);
        var vg = sec.visualGrid;

        var span = clampVal(preferredSpan || 4, 1, 4);
        var placement = findFirstAvailablePlacement(vg.layoutItems, vg.rows, span, 1);
        if (preferredRow) {
          placement.rowStart = preferredRow;
          placement.rowEnd = preferredRow + 1;
        }

        return commitBlockPlacement(sec, blockType, placement.columnStart, span, placement.rowStart);
      }
      window.insertBlockDirectly = insertBlockDirectly;

      function insertBlockIntoSlot(sec, slotOrItem, blockType) {
        if (!slotOrItem) return;
        var def = window.STUDIO_REGISTRY[blockType];
        if (!def) return;
        pushSectionHistory(sec);
        var newBlock = {
          id: uid('blk'),
          type: blockType,
          data: JSON.parse(JSON.stringify(def.defaultData || {}))
        };
        regenerateBlockNestedIds(newBlock);
        slotOrItem.block = newBlock;
        slotOrItem.label = def.label || blockType;
        renderSections();
        triggerAutosave();
        showToast('Placed ' + (def.label || blockType), 'success');
      }
      window.insertBlockIntoSlot = insertBlockIntoSlot;

      function duplicateGridItem(sec, itemId) {
        var vg = sec.visualGrid;
        var item = vg.layoutItems.find(function(it) { return it.id === itemId; });
        if (!item || !item.block) return;

        var copyBlock = JSON.parse(JSON.stringify(item.block));
        copyBlock.id = uid('blk');
        regenerateBlockNestedIds(copyBlock);

        var span = item.columnSpan || 4;
        var placement = findFirstAvailablePlacement(vg.layoutItems, vg.rows, span, 1);

        var dupItem = {
          id: uid('grid_item'),
          columnStart: placement.columnStart,
          columnSpan: placement.columnSpan,
          columnEnd: placement.columnStart + placement.columnSpan,
          rowStart: placement.rowStart,
          rowSpan: 1,
          rowEnd: placement.rowStart + 1,
          block: copyBlock,
          label: item.label || 'Duplicate Block'
        };

        pushSectionHistory(sec);
        vg.layoutItems.push(dupItem);
        vg.slots = vg.layoutItems;
        secActiveSlotIds[sec.id] = dupItem.id;

        normalizeSectionRows(sec);
        renderSections();
        triggerAutosave();
        showToast('Duplicated ' + dupItem.label, 'success');
      }

      function deleteGridItem(sec, itemId, force) {
        var vg = sec.visualGrid;
        var item = vg.layoutItems.find(function(it) { return it.id === itemId; });
        if (!item) return;

        if (!force) {
          var triggerEl = document.querySelector('.grid-block-item[data-item-id="' + itemId + '"] [data-act="del-item"]') || document.body;
          showInlineDelete(
            triggerEl,
            'Delete ' + (item.label || 'this block') + ' from grid?',
            null,
            function() {
              deleteGridItem(sec, itemId, true);
            }
          );
          return;
        }

        pushSectionHistory(sec);
        vg.layoutItems = vg.layoutItems.filter(function(it) { return it.id !== itemId; });
        vg.slots = vg.layoutItems;
        if (secActiveSlotIds[sec.id] === itemId) {
          secActiveSlotIds[sec.id] = null;
        }

        normalizeSectionRows(sec);
        renderSections();
        triggerAutosave();
        showToast('Deleted ' + (item.label || 'block'), 'info');
      }

      // Stable 4-Column Pointer Math (Tracks 1..4)
      function resolvePointerToGridCell(clientX, clientY, canvasEl, minRowHeight, rowGap, columnGap) {
        var rect = canvasEl.getBoundingClientRect();
        var padding = 16;
        var innerW = Math.max(1, rect.width - (2 * padding));
        var colGap = columnGap || 16;
        var rGap = rowGap || 16;
        var minH = minRowHeight || 80;

        var colTrackSize = ((innerW - (3 * colGap)) / 4) + colGap;
        var rowTrackSize = Math.max(40, minH + rGap);

        var relX = clientX - (rect.left + padding);
        var relY = clientY - (rect.top + padding);

        var col = Math.floor(relX / colTrackSize) + 1;
        var row = Math.floor(relY / rowTrackSize) + 1;

        return {
          col: clampVal(col, 1, 4),
          row: clampVal(row, 1, MAX_GRID_ROWS)
        };
      }
      window.resolvePointerToGridCell = resolvePointerToGridCell;

      // ── Spatial Move Handler (Drag Repositioning) ──
      function startBlockMoveAction(sec, item, canvasEl, initialEvent) {
        var vg = sec.visualGrid;
        var startX = initialEvent.clientX;
        var startY = initialEvent.clientY;
        var startCell = resolvePointerToGridCell(startX, startY, canvasEl, vg.minRowHeight, vg.rowGap, vg.columnGap);
        var originRect = {
          columnStart: item.columnStart,
          columnSpan: item.columnSpan,
          columnEnd: item.columnStart + item.columnSpan,
          rowStart: item.rowStart,
          rowSpan: 1,
          rowEnd: item.rowStart + 1
        };
        var isDragging = false;
        var ghostEl = null;

        var itemEl = canvasEl.querySelector('.grid-block-item[data-item-id="' + item.id + '"]');

        function onMove(e) {
          var dist = Math.hypot(e.clientX - startX, e.clientY - startY);
          if (!isDragging) {
            if (dist < 4) return;
            isDragging = true;
            if (itemEl) itemEl.classList.add('is-moving');
            ghostEl = canvasEl.querySelector('.grid-placement-preview');
            if (!ghostEl) {
              ghostEl = document.createElement('div');
              ghostEl.className = 'grid-placement-preview is-valid';
              canvasEl.appendChild(ghostEl);
            }
          }

          var curCell = resolvePointerToGridCell(e.clientX, e.clientY, canvasEl, vg.minRowHeight, vg.rowGap, vg.columnGap);
          var deltaCol = curCell.col - startCell.col;
          var deltaRow = curCell.row - startCell.row;

          var candColStart = clampVal(originRect.columnStart + deltaCol, 1, 4 - originRect.columnSpan + 1);
          var candRowStart = clampVal(originRect.rowStart + deltaRow, 1, MAX_GRID_ROWS);

          var candRect = {
            columnStart: candColStart,
            columnSpan: originRect.columnSpan,
            columnEnd: candColStart + originRect.columnSpan,
            rowStart: candRowStart,
            rowSpan: 1,
            rowEnd: candRowStart + 1
          };

          var collision = checkSlotCollisionState(vg.layoutItems, item.id, candRect);

          if (ghostEl) {
            ghostEl.style.gridColumn = candRect.columnStart + ' / span ' + candRect.columnSpan;
            ghostEl.style.gridRow = candRect.rowStart + ' / span 1';
            if (collision) {
              ghostEl.className = 'grid-placement-preview is-invalid-drop';
              ghostEl.textContent = '⚠ Space Occupied';
            } else {
              ghostEl.className = 'grid-placement-preview is-valid';
              ghostEl.textContent = '✦ Move to (' + candRect.columnStart + ',' + candRect.rowStart + ') · ' + getSpanPercentageLabel(candRect.columnSpan);
            }
          }

          secGridInteractions[sec.id] = {
            mode: 'moving',
            itemId: item.id,
            previewRect: candRect,
            hasCollision: collision
          };
        }

        function onUp(e) {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);

          if (ghostEl) ghostEl.remove();
          if (itemEl) itemEl.classList.remove('is-moving');

          var act = secGridInteractions[sec.id];
          secGridInteractions[sec.id] = { mode: 'idle' };

          if (e && e.type === 'pointercancel') {
            renderSections();
            return;
          }

          if (isDragging && act && act.mode === 'moving') {
            if (act.hasCollision) {
              showToast('Space occupied — position reverted', 'warning');
              renderSections();
            } else if (act.previewRect && (act.previewRect.columnStart !== originRect.columnStart || act.previewRect.rowStart !== originRect.rowStart)) {
              commitBlockMove(sec, item, act.previewRect.columnStart, act.previewRect.rowStart);
            } else {
              renderSections();
            }
          }
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      }

      // ── Spatial Resize Handler (Snapping to 1, 2, 3, 4 Columns) ──
      function startBlockResizeAction(sec, item, edge, canvasEl, initialEvent) {
        var vg = sec.visualGrid;
        var originRect = {
          columnStart: item.columnStart,
          columnSpan: item.columnSpan,
          columnEnd: item.columnStart + item.columnSpan,
          rowStart: item.rowStart,
          rowSpan: 1,
          rowEnd: item.rowStart + 1
        };

        var itemEl = canvasEl.querySelector('.grid-block-item[data-item-id="' + item.id + '"]');
        if (itemEl) itemEl.classList.add('is-resizing');

        var ghostEl = canvasEl.querySelector('.grid-placement-preview');
        if (!ghostEl) {
          ghostEl = document.createElement('div');
          ghostEl.className = 'grid-placement-preview is-valid';
          canvasEl.appendChild(ghostEl);
        }

        var tooltip = document.createElement('div');
        tooltip.className = 'grid-resize-tooltip';
        itemEl.appendChild(tooltip);

        function onMove(e) {
          var curCell = resolvePointerToGridCell(e.clientX, e.clientY, canvasEl, vg.minRowHeight, vg.rowGap, vg.columnGap);
          var newColStart = originRect.columnStart;
          var newColSpan = originRect.columnSpan;

          if (edge === 'e') {
            // Right edge resize
            var endCol = Math.max(originRect.columnStart, curCell.col);
            newColSpan = clampVal(endCol - originRect.columnStart + 1, 1, 4 - originRect.columnStart + 1);
          } else if (edge === 'w') {
            // Left edge resize
            var startCol = Math.min(originRect.columnEnd - 1, curCell.col);
            startCol = clampVal(startCol, 1, originRect.columnEnd - 1);
            newColSpan = originRect.columnEnd - startCol;
            newColStart = startCol;
          }

          var candRect = {
            columnStart: newColStart,
            columnSpan: newColSpan,
            columnEnd: newColStart + newColSpan,
            rowStart: originRect.rowStart,
            rowSpan: 1,
            rowEnd: originRect.rowStart + 1
          };

          var collision = checkSlotCollisionState(vg.layoutItems, item.id, candRect);

          if (ghostEl) {
            ghostEl.style.gridColumn = candRect.columnStart + ' / span ' + candRect.columnSpan;
            ghostEl.style.gridRow = candRect.rowStart + ' / span 1';
            if (collision) {
              ghostEl.className = 'grid-placement-preview is-invalid-drop';
              ghostEl.textContent = '⚠ Space Occupied';
            } else {
              ghostEl.className = 'grid-placement-preview is-valid';
              ghostEl.textContent = '✦ ' + getSpanPercentageLabel(candRect.columnSpan) + ' (' + candRect.columnSpan + ' of 4 cols)';
            }
          }

          tooltip.textContent = getSpanPercentageLabel(newColSpan) + ' · ' + newColSpan + ' of 4 columns';

          secGridInteractions[sec.id] = {
            mode: 'resizing',
            itemId: item.id,
            previewRect: candRect,
            hasCollision: collision
          };
        }

        function onUp(e) {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);

          if (ghostEl) ghostEl.remove();
          tooltip.remove();
          if (itemEl) itemEl.classList.remove('is-resizing');

          var act = secGridInteractions[sec.id];
          secGridInteractions[sec.id] = { mode: 'idle' };

          if (e && e.type === 'pointercancel') {
            renderSections();
            return;
          }

          if (act && act.mode === 'resizing') {
            if (act.hasCollision) {
              showToast('Space occupied — resize reverted', 'warning');
              renderSections();
            } else if (act.previewRect && (act.previewRect.columnSpan !== originRect.columnSpan || act.previewRect.columnStart !== originRect.columnStart)) {
              pushSectionHistory(sec);
              item.columnStart = act.previewRect.columnStart;
              item.columnSpan = act.previewRect.columnSpan;
              item.columnEnd = act.previewRect.columnEnd;
              item.rowSpan = 1;
              item.rowEnd = item.rowStart + 1;

              normalizeSectionRows(sec);
              renderSections();
              triggerAutosave();
              showToast('Resized ' + item.label + ' to ' + getSpanPercentageLabel(item.columnSpan));
            } else {
              renderSections();
            }
          }
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      }

      // ── Section Visual Grid Renderer (True 4-Column Composer) ──
      function renderSectionVisualGridElement(sec) {
        migrateSectionToGridComposerV2(sec);
        var vg = sec.visualGrid;
        var h = getSecHistory(sec.id);
        var activeItemId = secActiveSlotIds[sec.id];
        var inter = secGridInteractions[sec.id] || { mode: 'idle' };

        var wrap = document.createElement('div');
        wrap.className = 'grid-composer-wrapper section-grid-wrapper';
        wrap.setAttribute('data-sec-grid-id', sec.id);

        // 1. Placement Mode Banner or Move Mode Banner
        if (activePlacement) {
          var pBanner = document.createElement('div');
          pBanner.className = 'grid-mode-banner is-placement-mode';
          pBanner.innerHTML =
            '<div class="mode-banner-left">' +
              '<span class="mode-banner-badge">PLACEMENT MODE</span>' +
              '<span class="mode-banner-block-title">✦ <strong>' + escapeHtml(activePlacement.label) + '</strong></span>' +
            '</div>' +
            '<div class="mode-banner-center">' +
              '<span class="mode-banner-label">Width:</span>' +
              '<div class="mode-banner-pills">' +
                '<button type="button" class="mode-pill' + (activePlacement.widthSpan === 1 ? ' is-active' : '') + '" data-w="1">25% (1 col)</button>' +
                '<button type="button" class="mode-pill' + (activePlacement.widthSpan === 2 ? ' is-active' : '') + '" data-w="2">50% (2 cols)</button>' +
                '<button type="button" class="mode-pill' + (activePlacement.widthSpan === 3 ? ' is-active' : '') + '" data-w="3">75% (3 cols)</button>' +
                '<button type="button" class="mode-pill' + (activePlacement.widthSpan === 4 ? ' is-active' : '') + '" data-w="4">100% (4 cols)</button>' +
              '</div>' +
            '</div>' +
            '<div class="mode-banner-right">' +
              '<span class="mode-banner-help">Click an available cell · Press <strong>Esc</strong> to cancel</span>' +
              '<button type="button" class="mode-banner-cancel" data-act="cancel-place">✕ Cancel</button>' +
            '</div>';

          pBanner.querySelectorAll('.mode-pill').forEach(function(pill) {
            pill.addEventListener('click', function(e) {
              e.stopPropagation();
              var w = parseInt(pill.getAttribute('data-w'), 10) || 4;
              activePlacement.widthSpan = w;
              renderSections();
            });
          });

          pBanner.querySelector('[data-act="cancel-place"]').addEventListener('click', function(e) {
            e.stopPropagation();
            exitPlacementMode();
          });

          wrap.appendChild(pBanner);
        } else if (activeMove && activeMove.secId === sec.id) {
          var mBanner = document.createElement('div');
          mBanner.className = 'grid-mode-banner is-move-mode';
          var movingItem = vg.layoutItems.find(function(it) { return it.id === activeMove.itemId; }) || activeMove.item;
          mBanner.innerHTML =
            '<div class="mode-banner-left">' +
              '<span class="mode-banner-badge mode-banner-badge--move">MOVE MODE</span>' +
              '<span class="mode-banner-block-title">⠿ Moving: <strong>' + escapeHtml(movingItem ? movingItem.label : 'Block') + ' (' + getSpanPercentageLabel(movingItem ? movingItem.columnSpan : 4) + ')</strong></span>' +
            '</div>' +
            '<div class="mode-banner-right">' +
              '<span class="mode-banner-help">Click an available cell to move here · Press <strong>Esc</strong> to cancel</span>' +
              '<button type="button" class="mode-banner-cancel" data-act="cancel-move">✕ Cancel</button>' +
            '</div>';

          mBanner.querySelector('[data-act="cancel-move"]').addEventListener('click', function(e) {
            e.stopPropagation();
            exitMoveMode();
          });

          wrap.appendChild(mBanner);
        }

        // 2. Grid Toolbar (True 4-Column Layout)
        var tb = document.createElement('div');
        tb.className = 'grid-composer-toolbar section-grid-toolbar';
        tb.innerHTML =
          '<div class="grid-composer-toolbar-left section-grid-toolbar-left">' +
            '<span class="grid-badge-4col">4 COLS</span>' +
            '<div class="grid-control-group">' +
              '<span class="grid-control-label">Rows:</span>' +
              '<span class="grid-stepper-val" id="stat-rows-' + sec.id + '">' + vg.rows + ' rows</span>' +
            '</div>' +
            '<div class="grid-control-group">' +
              '<button type="button" class="grid-btn" data-act="cycle-gap" title="Cycle column & row gap">Gap: ' + vg.columnGap + 'px</button>' +
            '</div>' +
          '</div>' +
          '<div class="grid-composer-toolbar-right section-grid-toolbar-right">' +
            '<button type="button" class="grid-btn' + (vg.showCoordinates ? ' is-active' : '') + '" data-act="toggle-coords" title="Toggle coordinates"># Coords</button>' +
            '<button type="button" class="grid-btn" data-act="undo-grid" ' + (h.past.length === 0 ? 'disabled style="opacity:0.4"' : '') + ' title="Undo layout">⟲</button>' +
            '<button type="button" class="grid-btn" data-act="redo-grid" ' + (h.future.length === 0 ? 'disabled style="opacity:0.4"' : '') + ' title="Redo layout">⟳</button>' +
            '<button type="button" class="grid-btn" data-act="reset-grid" title="Reset grid to empty 4-column">Reset</button>' +
          '</div>';

        tb.querySelector('[data-act="cycle-gap"]').addEventListener('click', function(e) {
          e.stopPropagation();
          pushSectionHistory(sec);
          var gaps = [8, 16, 24, 32];
          var idx = gaps.indexOf(vg.columnGap);
          var nextGap = gaps[(idx + 1) % gaps.length];
          vg.columnGap = nextGap;
          vg.rowGap = nextGap;
          renderSections();
          triggerAutosave();
        });

        tb.querySelector('[data-act="toggle-coords"]').addEventListener('click', function(e) {
          e.stopPropagation();
          vg.showCoordinates = !vg.showCoordinates;
          renderSections();
          triggerAutosave();
        });

        tb.querySelector('[data-act="undo-grid"]').addEventListener('click', function(e) {
          e.stopPropagation();
          undoSectionVisualGrid(sec);
        });

        tb.querySelector('[data-act="redo-grid"]').addEventListener('click', function(e) {
          e.stopPropagation();
          redoSectionVisualGrid(sec);
        });

        tb.querySelector('[data-act="reset-grid"]').addEventListener('click', function(e) {
          e.stopPropagation();
          showInlineDelete(
            e.currentTarget,
            'Reset grid? All blocks in this section will be removed.',
            null,
            function() {
              pushSectionHistory(sec);
              vg.rows = MIN_GRID_ROWS;
              vg.layoutItems = [];
              vg.slots = [];
              secActiveSlotIds[sec.id] = null;
              renderSections();
              triggerAutosave();
              showToast('Grid reset to 4-column empty');
            }
          );
        });

        wrap.appendChild(tb);

        // 3. 4-Column Canvas
        var canvasWrap = document.createElement('div');
        canvasWrap.className = 'grid-composer-canvas-wrap section-grid-canvas-wrap';

        var canvas = document.createElement('div');
        canvas.className = 'grid-composer-canvas section-grid-canvas';
        canvas.style.display = 'grid';
        canvas.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
        canvas.style.gridAutoRows = 'auto'; // Content-driven vertical height
        canvas.style.gap = vg.rowGap + 'px ' + vg.columnGap + 'px';
        canvas.setAttribute('data-sec-id', sec.id);

        // Deselect item when clicking canvas background
        canvas.addEventListener('click', function(e) {
          if (e.target === canvas) {
            if (activePlacement) {
              // Clicked empty outer canvas in placement mode: check if click resolves to a cell
              var cell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, vg.minRowHeight, vg.rowGap, vg.columnGap);
              var span = activePlacement.widthSpan || 4;
              var candStart = clampVal(cell.col, 1, 4 - span + 1);
              var cand = { columnStart: candStart, columnSpan: span, columnEnd: candStart + span, rowStart: cell.row, rowSpan: 1, rowEnd: cell.row + 1 };
              if (!checkSlotCollisionState(vg.layoutItems, null, cand)) {
                commitBlockPlacement(sec, activePlacement.blockType, cand.columnStart, span, cand.rowStart);
                exitPlacementMode();
                return;
              }
            } else if (activeMove && activeMove.secId === sec.id) {
              var mCell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, vg.minRowHeight, vg.rowGap, vg.columnGap);
              var movingIt = vg.layoutItems.find(function(it) { return it.id === activeMove.itemId; });
              if (movingIt) {
                if (commitBlockMove(sec, movingIt, mCell.col, mCell.row)) {
                  exitMoveMode();
                  return;
                }
              }
            }
            if (secActiveSlotIds[sec.id]) {
              secActiveSlotIds[sec.id] = null;
              renderSections();
            }
          }
        });

        // ── Drag & Drop from Library onto 4-Column Grid ──
        canvas.addEventListener('dragover', function(e) {
          var bType = (draggedBlockData && draggedBlockData.source === 'library') ? draggedBlockData.type : null;
          if (!bType && e.dataTransfer) {
            try { bType = e.dataTransfer.getData('text/coven-block-type'); } catch(err) {}
            if (!bType && e.dataTransfer.types && e.dataTransfer.types.includes('text/plain')) {
              bType = 'pending';
            }
          }
          if (!bType && !draggedBlockData) return;

          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';

          var cell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, vg.minRowHeight, vg.rowGap, vg.columnGap);
          var checkType = (draggedBlockData && draggedBlockData.type) || 'solo-text';
          var span = (draggedBlockData && draggedBlockData.widthSpan) || 4;
          if (cell.col > 4 - span + 1) {
            cell.col = 4 - span + 1;
          }

          var cand = { columnStart: cell.col, columnSpan: span, columnEnd: cell.col + span, rowStart: cell.row, rowSpan: 1, rowEnd: cell.row + 1 };
          var collision = checkSlotCollisionState(vg.layoutItems, null, cand);

          var ghost = canvas.querySelector('.grid-placement-preview');
          if (!ghost) {
            ghost = document.createElement('div');
            ghost.className = 'grid-placement-preview';
            canvas.appendChild(ghost);
          }
          ghost.style.gridColumn = cand.columnStart + ' / span ' + cand.columnSpan;
          ghost.style.gridRow = cand.rowStart + ' / span 1';
          if (collision) {
            ghost.className = 'grid-placement-preview is-invalid-drop';
            ghost.textContent = '⚠ Space Occupied';
          } else {
            ghost.className = 'grid-placement-preview is-valid';
            ghost.textContent = '+ Place (' + getSpanPercentageLabel(cand.columnSpan) + ')';
          }
        });

        canvas.addEventListener('dragleave', function(e) {
          if (e.relatedTarget && canvas.contains(e.relatedTarget)) return;
          var ghost = canvas.querySelector('.grid-placement-preview');
          if (ghost) ghost.remove();
        });

        canvas.addEventListener('drop', function(e) {
          e.preventDefault();
          var ghost = canvas.querySelector('.grid-placement-preview');
          if (ghost) ghost.remove();

          var payload = draggedBlockData;
          if (!payload && e.dataTransfer) {
            try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(err) {}
            if (!payload) {
              var testType = e.dataTransfer.getData('text/coven-block-type');
              if (testType) payload = { source: 'library', type: testType };
            }
          }
          if (!payload || payload.source !== 'library') return;

          var cell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, vg.minRowHeight, vg.rowGap, vg.columnGap);
          var span = payload.widthSpan || 4;
          var candStart = clampVal(cell.col, 1, 4 - span + 1);

          var cand = { columnStart: candStart, columnSpan: span, columnEnd: candStart + span, rowStart: cell.row, rowSpan: 1, rowEnd: cell.row + 1 };
          if (checkSlotCollisionState(vg.layoutItems, null, cand)) {
            showToast('Space occupied — choose an open cell', 'warning');
            return;
          }

          commitBlockPlacement(sec, payload.type, cand.columnStart, span, cand.rowStart);
        });

        // ── Interactive Empty Grid Cells ──
        // Render 4 clear columns for each visible row
        var highestOccupied = getRequiredRowsForItems(vg.layoutItems);
        var visibleRows = Math.max(MIN_GRID_ROWS, highestOccupied + 1);
        vg.rows = clampVal(visibleRows, MIN_GRID_ROWS, MAX_GRID_ROWS);

        // Helper to check if a specific (col, row) is covered by any placed block
        function isCellOccupied(c, r) {
          for (var i = 0; i < vg.layoutItems.length; i++) {
            var it = vg.layoutItems[i];
            var colS = it.columnStart || 1;
            var colE = it.columnEnd || (colS + (it.columnSpan || 1));
            var rowS = it.rowStart || 1;
            var rowE = it.rowEnd || (rowS + (it.rowSpan || 1));
            if (c >= colS && c < colE && r >= rowS && r < rowE) {
              return true;
            }
          }
          return false;
        }

        // Render interactive empty cell slots
        for (var r = 1; r <= visibleRows; r++) {
          for (var c = 1; c <= 4; c++) {
            if (!isCellOccupied(c, r)) {
              (function(colIdx, rowIdx) {
                var cellSlot = document.createElement('div');
                cellSlot.className = 'grid-cell-slot is-available';
                cellSlot.style.gridColumn = colIdx + ' / span 1';
                cellSlot.style.gridRow = rowIdx + ' / span 1';
                cellSlot.setAttribute('data-col', colIdx);
                cellSlot.setAttribute('data-row', rowIdx);
                cellSlot.innerHTML =
                  '<div class="grid-cell-slot-inner">' +
                    (vg.showCoordinates ? '<span class="grid-cell-slot-coord">' + colIdx + ',' + rowIdx + '</span>' : '') +
                    '<span class="grid-cell-slot-label">+ Available (25%)</span>' +
                  '</div>';

                // Pointer hover: update placement ghost
                cellSlot.addEventListener('pointerenter', function() {
                  if (activePlacement) {
                    var span = activePlacement.widthSpan || 4;
                    var candStart = clampVal(colIdx, 1, 4 - span + 1);
                    var cand = { columnStart: candStart, columnSpan: span, columnEnd: candStart + span, rowStart: rowIdx, rowSpan: 1, rowEnd: rowIdx + 1 };
                    var collision = checkSlotCollisionState(vg.layoutItems, null, cand);

                    var ghost = canvas.querySelector('.grid-placement-preview');
                    if (!ghost) {
                      ghost = document.createElement('div');
                      ghost.className = 'grid-placement-preview';
                      canvas.appendChild(ghost);
                    }
                    ghost.style.gridColumn = cand.columnStart + ' / span ' + cand.columnSpan;
                    ghost.style.gridRow = cand.rowStart + ' / span 1';
                    if (collision) {
                      ghost.className = 'grid-placement-preview is-invalid-drop';
                      ghost.textContent = '⚠ Space Occupied';
                    } else {
                      ghost.className = 'grid-placement-preview is-valid';
                      ghost.textContent = '✦ Place ' + escapeHtml(activePlacement.label) + ' (' + getSpanPercentageLabel(cand.columnSpan) + ') — Click to Confirm';
                    }
                  } else if (activeMove && activeMove.secId === sec.id) {
                    var mItem = vg.layoutItems.find(function(it) { return it.id === activeMove.itemId; }) || activeMove.item;
                    if (mItem) {
                      var mSpan = mItem.columnSpan || 4;
                      var mStart = clampVal(colIdx, 1, 4 - mSpan + 1);
                      var mCand = { columnStart: mStart, columnSpan: mSpan, columnEnd: mStart + mSpan, rowStart: rowIdx, rowSpan: 1, rowEnd: rowIdx + 1 };
                      var mColl = checkSlotCollisionState(vg.layoutItems, mItem.id, mCand);

                      var mGhost = canvas.querySelector('.grid-placement-preview');
                      if (!mGhost) {
                        mGhost = document.createElement('div');
                        mGhost.className = 'grid-placement-preview';
                        canvas.appendChild(mGhost);
                      }
                      mGhost.style.gridColumn = mCand.columnStart + ' / span ' + mCand.columnSpan;
                      mGhost.style.gridRow = mCand.rowStart + ' / span 1';
                      if (mColl) {
                        mGhost.className = 'grid-placement-preview is-invalid-drop';
                        mGhost.textContent = '⚠ Space Occupied';
                      } else {
                        mGhost.className = 'grid-placement-preview is-valid';
                        mGhost.textContent = '✦ Move ' + escapeHtml(mItem.label) + ' (' + getSpanPercentageLabel(mCand.columnSpan) + ') — Click to Move';
                      }
                    }
                  }
                });

                // Click on empty cell
                cellSlot.addEventListener('click', function(e) {
                  e.stopPropagation();
                  if (activePlacement) {
                    var span = activePlacement.widthSpan || 4;
                    var candStart = clampVal(colIdx, 1, 4 - span + 1);
                    var cand = { columnStart: candStart, columnSpan: span, columnEnd: candStart + span, rowStart: rowIdx, rowSpan: 1, rowEnd: rowIdx + 1 };
                    if (checkSlotCollisionState(vg.layoutItems, null, cand)) {
                      showToast('Space occupied — please choose an open cell', 'warning');
                      return;
                    }
                    commitBlockPlacement(sec, activePlacement.blockType, cand.columnStart, span, cand.rowStart);
                    exitPlacementMode();
                  } else if (activeMove && activeMove.secId === sec.id) {
                    var movingIt = vg.layoutItems.find(function(it) { return it.id === activeMove.itemId; });
                    if (movingIt) {
                      if (commitBlockMove(sec, movingIt, colIdx, rowIdx)) {
                        exitMoveMode();
                      }
                    }
                  } else {
                    // Normal mode: select block type to place
                    showToast('Click a block pattern in the Library on the left to enter Placement Mode', 'info');
                  }
                });

                canvas.appendChild(cellSlot);
              })(c, r);
            }
          }
        }

        // Render Placed LEGO Blocks (vg.layoutItems)
        vg.layoutItems.forEach(function(item) {
          var isSel = item.id === activeItemId;
          var isMov = inter.mode === 'moving' && inter.itemId === item.id;
          var isRes = inter.mode === 'resizing' && inter.itemId === item.id;
          var isBeingMoved = activeMove && activeMove.itemId === item.id;
          var blk = item.block;
          var blkDef = blk ? (window.STUDIO_REGISTRY[blk.type] || { label: blk.type }) : { label: 'Block' };
          var glyph = blk ? (BLOCK_GLYPHS[blk.type] || '✦') : '✧';
          var spanCols = clampVal(item.columnSpan || 4, 1, 4);

          var itemEl = document.createElement('div');
          itemEl.className = 'grid-block-item section-grid-slot is-occupied' +
            (isSel ? ' is-selected' : '') +
            (isMov ? ' is-moving' : '') +
            (isBeingMoved ? ' is-being-moved' : '') +
            (isRes ? ' is-resizing' : '');
          itemEl.setAttribute('data-item-id', item.id);
          itemEl.setAttribute('data-slot-id', item.id);
          itemEl.style.gridColumn = item.columnStart + ' / span ' + spanCols;
          itemEl.style.gridRow = item.rowStart + ' / span 1'; // Content-driven height

          // Block Header
          var itemHeader = document.createElement('div');
          itemHeader.className = 'grid-block-header slot-header';
          itemHeader.innerHTML =
            '<div class="grid-block-header-left slot-header-left">' +
              '<div class="grid-block-move-handle slot-drag-handle" title="Drag to reposition on 4-column grid">⠿ Move</div>' +
              '<button type="button" class="grid-block-btn grid-block-btn--move" data-act="click-move" title="Click-to-Move">Move</button>' +
              '<div class="grid-block-title slot-title">' +
                '<span class="grid-block-glyph slot-glyph">' + glyph + '</span>' +
                '<span class="slot-label-text">' + escapeHtml(item.label || blkDef.label) + '</span>' +
                '<span class="grid-block-span-badge">' + getSpanPercentageLabel(spanCols) + '</span>' +
              '</div>' +
              // Quick Width Switcher Buttons: [25%] [50%] [75%] [100%]
              '<div class="grid-width-buttons" title="Change block width">' +
                '<span class="grid-width-label">Width:</span>' +
                '<button type="button" class="grid-width-btn' + (spanCols === 1 ? ' is-active' : '') + '" data-w="1" title="25% (1 column)">25%</button>' +
                '<button type="button" class="grid-width-btn' + (spanCols === 2 ? ' is-active' : '') + '" data-w="2" title="50% (2 columns)">50%</button>' +
                '<button type="button" class="grid-width-btn' + (spanCols === 3 ? ' is-active' : '') + '" data-w="3" title="75% (3 columns)">75%</button>' +
                '<button type="button" class="grid-width-btn' + (spanCols === 4 ? ' is-active' : '') + '" data-w="4" title="100% (4 columns)">100%</button>' +
              '</div>' +
            '</div>' +
            '<div class="grid-block-header-actions slot-actions">' +
              '<button type="button" class="grid-block-btn btn-slot-dup" data-act="dup-item" title="Duplicate block">⧉</button>' +
              '<button type="button" class="grid-block-btn grid-block-btn--danger btn-slot-del" data-act="del-item" title="Delete block">×</button>' +
            '</div>';

          // Selection
          itemHeader.addEventListener('click', function(e) {
            if (e.target.closest('[data-act="dup-item"], [data-act="del-item"], [data-act="click-move"], .grid-width-btn')) return;
            secActiveSlotIds[sec.id] = item.id;
            renderSections();
          });

          // Click-to-Move Button
          itemHeader.querySelector('[data-act="click-move"]').addEventListener('click', function(e) {
            e.stopPropagation();
            enterMoveMode(sec, item);
          });

          // Quick Width Buttons
          itemHeader.querySelectorAll('.grid-width-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();
              var targetW = parseInt(btn.getAttribute('data-w'), 10) || 4;
              setBlockItemWidth(sec, item, targetW);
            });
          });

          // Duplicate Action
          itemHeader.querySelector('[data-act="dup-item"]').addEventListener('click', function(e) {
            e.stopPropagation();
            duplicateGridItem(sec, item.id);
          });

          // Delete Action
          itemHeader.querySelector('[data-act="del-item"]').addEventListener('click', function(e) {
            e.stopPropagation();
            deleteGridItem(sec, item.id, false);
          });

          // Dedicated Move Handle: Drag Repositioning
          var moveHandle = itemHeader.querySelector('.grid-block-move-handle');
          if (moveHandle) {
            moveHandle.addEventListener('pointerdown', function(e) {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              secActiveSlotIds[sec.id] = item.id;
              startBlockMoveAction(sec, item, canvas, e);
            });
          }

          itemEl.appendChild(itemHeader);

          // Content Body: Real ArticleBlock Form
          var itemBody = document.createElement('div');
          itemBody.className = 'grid-block-content slot-body';

          // Stop bubbling so editing text/inputs never triggers grid drag/move
          itemBody.addEventListener('pointerdown', function(e) {
            e.stopPropagation();
          });

          if (blk) {
            var bCard = createBlockCardElement(sec, blk, 0, 1, {
              isSlotChild: true,
              slotId: item.id
            });
            itemBody.appendChild(bCard);
          }
          itemEl.appendChild(itemBody);

          // Generous Resize Handles: Left Edge (West) & Right Edge (East)
          var westHandle = document.createElement('div');
          westHandle.className = 'grid-resize-handle grid-resize-handle--w';
          westHandle.title = 'Drag left edge to resize (snaps to 25%, 50%, 75%, 100%)';
          westHandle.addEventListener('pointerdown', function(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            secActiveSlotIds[sec.id] = item.id;
            startBlockResizeAction(sec, item, 'w', canvas, e);
          });
          itemEl.appendChild(westHandle);

          var eastHandle = document.createElement('div');
          eastHandle.className = 'grid-resize-handle grid-resize-handle--e';
          eastHandle.title = 'Drag right edge to resize (snaps to 25%, 50%, 75%, 100%)';
          eastHandle.addEventListener('pointerdown', function(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            secActiveSlotIds[sec.id] = item.id;
            startBlockResizeAction(sec, item, 'e', canvas, e);
          });
          itemEl.appendChild(eastHandle);

          canvas.appendChild(itemEl);
        });

        // Ghost Preview
        if (inter.mode !== 'idle' && inter.previewRect) {
          var pr = inter.previewRect;
          var ghost = document.createElement('div');
          ghost.className = 'grid-placement-preview ' + (inter.hasCollision ? 'is-invalid-drop' : 'is-valid');
          ghost.style.gridColumn = pr.columnStart + ' / span ' + (pr.columnSpan || 1);
          ghost.style.gridRow = pr.rowStart + ' / span 1';
          ghost.textContent = inter.hasCollision ? '⚠ Space Occupied' : '✦ Place Here (' + getSpanPercentageLabel(pr.columnSpan) + ')';
          canvas.appendChild(ghost);
        }

        canvasWrap.appendChild(canvas);
        wrap.appendChild(canvasWrap);

        // Render Properties Bar below canvas for active item
        var activeItem = vg.layoutItems.find(function(it) { return it.id === activeItemId; });
        if (activeItem && inter.mode === 'idle') {
          var propBar = renderItemPropertiesBar(sec, activeItem);
          wrap.appendChild(propBar);
        }

        // Preserved Legacy Content Blocks Drawer
        if (sec.blocks && sec.blocks.length > 0) {
          var legacyDrawer = renderLegacyBlocksDrawer(sec);
          wrap.appendChild(legacyDrawer);
        }

        return wrap;
      }

      function renderItemPropertiesBar(sec, item) {
        var vg = sec.visualGrid;
        var bar = document.createElement('div');
        bar.className = 'slot-properties-bar section-slot-properties-bar';

        var spanCols = item.columnSpan || 4;
        var blk = item.block;
        var blkDef = blk ? (window.STUDIO_REGISTRY[blk.type] || { label: blk.type }) : null;

        bar.innerHTML =
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Label:</span>' +
            '<input type="text" class="slot-prop-input slot-prop-input--text" value="' + escapeHtml(item.label || (blkDef ? blkDef.label : 'Block')) + '" data-prop="label" placeholder="Block label" />' +
          '</div>' +
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Col:</span>' +
            '<input type="number" class="slot-prop-input" value="' + item.columnStart + '" min="1" max="4" data-prop="colStart" />' +
          '</div>' +
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Width:</span>' +
            '<div class="grid-width-buttons" style="margin-left:0">' +
              '<button type="button" class="grid-width-btn' + (spanCols === 1 ? ' is-active' : '') + '" data-prop-w="1">25%</button>' +
              '<button type="button" class="grid-width-btn' + (spanCols === 2 ? ' is-active' : '') + '" data-prop-w="2">50%</button>' +
              '<button type="button" class="grid-width-btn' + (spanCols === 3 ? ' is-active' : '') + '" data-prop-w="3">75%</button>' +
              '<button type="button" class="grid-width-btn' + (spanCols === 4 ? ' is-active' : '') + '" data-prop-w="4">100%</button>' +
            '</div>' +
          '</div>' +
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Row:</span>' +
            '<input type="number" class="slot-prop-input" value="' + item.rowStart + '" min="1" max="' + vg.rows + '" data-prop="rowStart" />' +
          '</div>' +
          '<div class="slot-prop-field" style="margin-left:auto;display:flex;gap:6px">' +
            '<button type="button" class="grid-btn" data-act="dup-bar-item" title="Duplicate block">Duplicate</button>' +
            '<button type="button" class="grid-btn grid-btn--danger" data-act="del-bar-item" title="Delete block">Delete</button>' +
            '<button type="button" class="grid-btn" data-act="close-bar-props" title="Close properties">✕</button>' +
          '</div>';

        var labelInput = bar.querySelector('[data-prop="label"]');
        labelInput.addEventListener('input', function(e) {
          item.label = e.target.value;
          var itemEl = document.querySelector('.grid-block-item[data-item-id="' + item.id + '"]');
          if (itemEl) {
            var labelSpan = itemEl.querySelector('.slot-label-text');
            if (labelSpan) labelSpan.textContent = item.label;
          }
          triggerAutosave();
        });

        bar.querySelectorAll('[data-prop-w]').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var targetW = parseInt(btn.getAttribute('data-prop-w'), 10) || 4;
            setBlockItemWidth(sec, item, targetW);
          });
        });

        var colStartInput = bar.querySelector('[data-prop="colStart"]');
        var rowStartInput = bar.querySelector('[data-prop="rowStart"]');

        function applyGeometryChange() {
          var cs = parseInt(colStartInput.value, 10) || item.columnStart;
          var rs = parseInt(rowStartInput.value, 10) || item.rowStart;
          cs = clampVal(cs, 1, 4 - item.columnSpan + 1);
          rs = clampVal(rs, 1, MAX_GRID_ROWS);

          var cand = {
            columnStart: cs,
            columnSpan: item.columnSpan,
            columnEnd: cs + item.columnSpan,
            rowStart: rs,
            rowSpan: 1,
            rowEnd: rs + 1
          };

          if (checkSlotCollisionState(vg.layoutItems, item.id, cand)) {
            showToast('Position collides with an existing block', 'warning');
            colStartInput.value = item.columnStart;
            rowStartInput.value = item.rowStart;
            return;
          }

          item.columnStart = cand.columnStart;
          item.columnEnd = cand.columnEnd;
          item.rowStart = cand.rowStart;
          item.rowSpan = 1;
          item.rowEnd = cand.rowEnd;

          normalizeSectionRows(sec);
          pushSectionHistory(sec);
          renderSections();
          triggerAutosave();
        }

        colStartInput.addEventListener('change', applyGeometryChange);
        rowStartInput.addEventListener('change', applyGeometryChange);

        bar.querySelector('[data-act="dup-bar-item"]').addEventListener('click', function(e) {
          e.stopPropagation();
          duplicateGridItem(sec, item.id);
        });

        bar.querySelector('[data-act="del-bar-item"]').addEventListener('click', function(e) {
          e.stopPropagation();
          deleteGridItem(sec, item.id, false);
        });

        bar.querySelector('[data-act="close-bar-props"]').addEventListener('click', function(e) {
          e.stopPropagation();
          secActiveSlotIds[sec.id] = null;
          renderSections();
        });

        return bar;
      }

      function renderLegacyBlocksDrawer(sec) {
        var drawer = document.createElement('div');
        drawer.className = 'legacy-blocks-drawer section-legacy-drawer';
        drawer.innerHTML =
          '<div class="legacy-drawer-header">' +
            '<span class="legacy-drawer-title">Unslotted Section Content (' + sec.blocks.length + ' legacy blocks)</span>' +
            '<button type="button" class="grid-btn" data-act="migrate-all-blocks">Migrate All to 4-Column Grid</button>' +
          '</div>' +
          '<div class="legacy-drawer-body"></div>';

        var body = drawer.querySelector('.legacy-drawer-body');
        sec.blocks.forEach(function(blk, idx) {
          var row = document.createElement('div');
          row.className = 'legacy-block-row';
          row.innerHTML =
            '<span class="legacy-block-label">' + escapeHtml(blk.type) + '</span>' +
            '<button type="button" class="grid-btn" data-act="migrate-one">Place on Grid</button>';

          row.querySelector('[data-act="migrate-one"]').addEventListener('click', function(e) {
            e.stopPropagation();
            migrateLegacyBlockToSlot(sec, idx);
          });
          body.appendChild(row);
        });

        drawer.querySelector('[data-act="migrate-all-blocks"]').addEventListener('click', function(e) {
          e.stopPropagation();
          while (sec.blocks.length > 0) {
            migrateLegacyBlockToSlot(sec, 0);
          }
        });

        return drawer;
      }

      function migrateLegacyBlockToSlot(sec, blockIndex) {
        if (!sec || !sec.blocks || !sec.blocks[blockIndex]) return;
        var blk = sec.blocks.splice(blockIndex, 1)[0];
        migrateSectionToGridComposerV2(sec);
        var vg = sec.visualGrid;

        var placement = findFirstAvailablePlacement(vg.layoutItems, vg.rows, 4, 1);

        var newItem = {
          id: uid('grid_item'),
          columnStart: placement.columnStart,
          columnSpan: 4,
          columnEnd: placement.columnStart + 4,
          rowStart: placement.rowStart,
          rowSpan: 1,
          rowEnd: placement.rowStart + 1,
          block: blk,
          label: window.STUDIO_REGISTRY[blk.type] ? window.STUDIO_REGISTRY[blk.type].label : blk.type
        };

        pushSectionHistory(sec);
        vg.layoutItems.push(newItem);
        vg.slots = vg.layoutItems;
        secActiveSlotIds[sec.id] = newItem.id;

        normalizeSectionRows(sec);
        renderSections();
        triggerAutosave();
        showToast('Migrated ' + newItem.label + ' to 4-Column Grid', 'success');
      }

      function moveBlockBetweenSlots(sec, fromSlotId, toSlotId) {
        var vg = sec.visualGrid;
        var itemA = vg.layoutItems.find(function(it) { return it.id === fromSlotId; });
        var itemB = vg.layoutItems.find(function(it) { return it.id === toSlotId; });
        if (!itemA || !itemB) return;

        pushSectionHistory(sec);
        var tempBlk = itemA.block;
        var tempLbl = itemA.label;
        itemA.block = itemB.block;
        itemA.label = itemB.label;
        itemB.block = tempBlk;
        itemB.label = tempLbl;

        renderSections();
        triggerAutosave();
        showToast('Swapped blocks between grid items');
      }

      function addSlotToSec(sec) { return insertBlockDirectly('solo-text', sec ? sec.id : null, 4); }
      var duplicateSlotInSec = function(sec, id) { return duplicateGridItem(sec, id); };
      var deleteSlotFromSec = function(sec, id, force) { return deleteGridItem(sec, id, force); };

      window.__uatLayoutForge = {
        isAllowedInGridSlot: isAllowedInGridSlot,
        insertBlockIntoSlot: insertBlockIntoSlot,
        confirmReplaceBlockInSlot: function() {},
        removeBlockFromSlot: function() {},
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
      };

      window.__uatArticleForge = {
        activePlacement: function() { return activePlacement; },
        enterPlacementMode: enterPlacementMode,
        exitPlacementMode: exitPlacementMode,
        activeMove: function() { return activeMove; },
        enterMoveMode: enterMoveMode,
        exitMoveMode: exitMoveMode,
        setBlockItemWidth: setBlockItemWidth
      };
      
`;

const updatedContent = content.slice(0, actualStart) + newEngine + nl + content.slice(endPos);
fs.writeFileSync(studioPath, updatedContent, 'utf8');
console.log("✓ Successfully applied True 4-Column UX Grid Engine to studio.astro!");
