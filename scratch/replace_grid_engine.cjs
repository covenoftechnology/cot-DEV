const fs = require('fs');

const studioPath = 'src/pages/lab/layout-forge/studio.astro';
let content = fs.readFileSync(studioPath, 'utf8');

// Single line search markers that are immune to CRLF differences
const startMarker = "SECTION VISUAL GRID ENGINE (PHASE 4: REAL ARTICLEBLOCKS)";
const endMarker = "// ── Phase 5 Modals & Recovery UI ──";

const startPos = content.indexOf(startMarker);
const endPos = content.indexOf(endMarker);

if (startPos === -1 || endPos === -1) {
  console.error('Markers not found! startPos:', startPos, 'endPos:', endPos);
  process.exit(1);
}

// Rewind to the preceding comment block
const prevBlockComment = content.lastIndexOf('// ═════════════════════════════════════════════════════════════', startPos);
const actualStart = prevBlockComment !== -1 ? prevBlockComment : startPos;

console.log('Found markers. Replacing grid engine from actualStart:', actualStart, 'to endPos:', endPos);

// Read the new grid engine text
const newGridEngine = `// ═════════════════════════════════════════════════════════════
      // SECTION GRID COMPOSER V2 ENGINE (LEGO-STYLE ARCHITECTURE)
      // Section Body = 12-Column Spatial Grid
      // Drag & Drop / Click Insertion / 12-Col Resizing / Auto-Growing Rows
      // ═════════════════════════════════════════════════════════════

      var secGridHistories = {}; // secId -> { past: [], future: [] }
      var secActiveSlotIds = {}; // secId -> itemId | null (alias activeItemId)
      var secGridInteractions = {}; // secId -> interaction state

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
        var r2RowEnd = r2.rowEnd || (r2RowStart + r2RowSpan);

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
        var s = clampVal(colSpan, 1, 12);
        switch (s) {
          case 1: return '8.3%';
          case 2: return '16.7%';
          case 3: return '25% (1/4)';
          case 4: return '33.3% (1/3)';
          case 5: return '41.7%';
          case 6: return '50% (1/2)';
          case 7: return '58.3%';
          case 8: return '66.7% (2/3)';
          case 9: return '75% (3/4)';
          case 10: return '83.3%';
          case 11: return '91.7%';
          case 12: return '100% (Full)';
          default: return Math.round((s / 12) * 100) + '%';
        }
      }
      window.getSpanPercentageLabel = getSpanPercentageLabel;

      function findFirstAvailablePlacement(items, currentRows, preferredColSpan, preferredRowSpan) {
        var span = clampVal(preferredColSpan || 12, 1, 12);
        var rSpan = Math.max(1, preferredRowSpan || 1);
        var rows = Math.max(currentRows || 3, 1);

        for (var r = 1; r <= rows; r++) {
          for (var c = 1; c <= 12 - span + 1; c++) {
            var cand = { columnStart: c, columnSpan: span, columnEnd: c + span, rowStart: r, rowSpan: rSpan, rowEnd: r + rSpan };
            if (!checkSlotCollisionState(items, null, cand)) {
              return {
                columnStart: c,
                columnSpan: span,
                rowStart: r,
                rowSpan: rSpan,
                requiredRows: Math.max(rows, r + rSpan - 1)
              };
            }
          }
        }

        // Auto-grow rows when no space in existing rows
        var newRow = rows + 1;
        return {
          columnStart: 1,
          columnSpan: span,
          rowStart: newRow,
          rowSpan: rSpan,
          requiredRows: newRow + rSpan - 1
        };
      }
      window.findFirstAvailablePlacement = findFirstAvailablePlacement;

      function migrateSectionToGridComposerV2(sec) {
        if (!sec) return;
        if (!sec.visualGrid && !sec.layout) {
          sec.visualGrid = {
            columns: 12,
            rows: 3,
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

        // Ensure 12 columns
        var oldCols = vg.columns || 3;
        var rawItems = Array.isArray(vg.layoutItems) ? vg.layoutItems : (Array.isArray(vg.slots) ? vg.slots : []);
        var newItems = [];

        rawItems.forEach(function(it) {
          var block = it.block || (Array.isArray(it.blocks) && it.blocks[0] ? it.blocks[0] : null);
          if (!block) return; // Discard empty placeholder slots

          var oldColStart = it.columnStart || 1;
          var oldColEnd = it.columnEnd || (oldColStart + 1);
          var oldSpan = it.columnSpan || Math.max(1, oldColEnd - oldColStart);

          var colStart = 1;
          var colSpan = 12;

          if (oldCols === 12) {
            colStart = clampVal(oldColStart, 1, 12);
            colSpan = clampVal(oldSpan, 1, 12 - colStart + 1);
          } else if (oldCols === 3) {
            colStart = clampVal((oldColStart - 1) * 4 + 1, 1, 12);
            colSpan = clampVal(oldSpan * 4, 1, 12 - colStart + 1);
          } else if (oldCols === 4) {
            colStart = clampVal((oldColStart - 1) * 3 + 1, 1, 12);
            colSpan = clampVal(oldSpan * 3, 1, 12 - colStart + 1);
          } else {
            var factor = 12 / oldCols;
            colStart = clampVal(Math.round((oldColStart - 1) * factor) + 1, 1, 12);
            colSpan = clampVal(Math.round(oldSpan * factor), 1, 12 - colStart + 1);
          }

          var rStart = it.rowStart || 1;
          var rSpan = it.rowSpan || Math.max(1, (it.rowEnd || (rStart + 1)) - rStart);

          newItems.push({
            id: it.id || uid('grid_item'),
            columnStart: colStart,
            columnSpan: colSpan,
            columnEnd: colStart + colSpan,
            rowStart: rStart,
            rowSpan: rSpan,
            rowEnd: rStart + rSpan,
            block: block,
            label: it.label || (window.STUDIO_REGISTRY[block.type] ? window.STUDIO_REGISTRY[block.type].label : block.type)
          });
        });

        // Fallback for legacy sec.blocks if no layout items exist
        if (newItems.length === 0 && Array.isArray(sec.blocks) && sec.blocks.length > 0) {
          sec.blocks.forEach(function(blk, idx) {
            var r = idx + 1;
            newItems.push({
              id: 'migrated_' + (blk.id || idx),
              columnStart: 1,
              columnSpan: 12,
              columnEnd: 13,
              rowStart: r,
              rowSpan: 1,
              rowEnd: r + 1,
              block: blk,
              label: window.STUDIO_REGISTRY[blk.type] ? window.STUDIO_REGISTRY[blk.type].label : blk.type
            });
          });
        }

        vg.columns = 12;
        var maxRow = newItems.reduce(function(m, it) { return Math.max(m, it.rowStart + it.rowSpan - 1); }, vg.rows || 3);
        vg.rows = Math.max(3, maxRow);
        vg.layoutItems = newItems;
        vg.slots = newItems; // Backward compatibility
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

      function insertBlockDirectly(blockType, secId, preferredSpan, preferredRow) {
        if (!isAllowedInGridSlot(blockType)) {
          if (blockType === 'flex-layout') {
            showToast('Flexible Layout cannot be placed inside a Grid. The Section Grid is your layout canvas.', 'warning');
          } else {
            showToast('Block type is non-insertable: ' + blockType, 'warning');
          }
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

        // Default span: 6 for media/cards, 12 for text/callout
        var span = preferredSpan || 12;
        if (!preferredSpan && ['card-grid-2', 'comparison', 'image-grid', 'stats-metrics'].indexOf(blockType) !== -1) {
          span = 6;
        }

        var placement = findFirstAvailablePlacement(vg.layoutItems, vg.rows, span, 1);
        if (placement.requiredRows > vg.rows) {
          vg.rows = placement.requiredRows;
        }

        pushSectionHistory(sec);

        var newBlock = {
          id: uid('blk'),
          type: blockType,
          data: JSON.parse(JSON.stringify(def.defaultData || {}))
        };
        regenerateBlockNestedIds(newBlock);

        var newItem = {
          id: uid('grid_item'),
          columnStart: placement.columnStart,
          columnSpan: placement.columnSpan,
          columnEnd: placement.columnStart + placement.columnSpan,
          rowStart: placement.rowStart,
          rowSpan: placement.rowSpan,
          rowEnd: placement.rowStart + placement.rowSpan,
          block: newBlock,
          label: def.label || blockType
        };

        vg.layoutItems.push(newItem);
        vg.slots = vg.layoutItems;
        secActiveSlotIds[sec.id] = newItem.id;

        renderSections();
        triggerAutosave();
        showToast('Placed ' + (def.label || blockType) + ' (' + getSpanPercentageLabel(placement.columnSpan) + ') on Grid', 'success');
        return newItem;
      }
      window.insertBlockDirectly = insertBlockDirectly;

      // Compatibility alias
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

        var span = item.columnSpan || 12;
        var rSpan = item.rowSpan || 1;
        var placement = findFirstAvailablePlacement(vg.layoutItems, vg.rows, span, rSpan);
        if (placement.requiredRows > vg.rows) {
          vg.rows = placement.requiredRows;
        }

        pushSectionHistory(sec);

        var dupItem = {
          id: uid('grid_item'),
          columnStart: placement.columnStart,
          columnSpan: placement.columnSpan,
          columnEnd: placement.columnStart + placement.columnSpan,
          rowStart: placement.rowStart,
          rowSpan: placement.rowSpan,
          rowEnd: placement.rowStart + placement.rowSpan,
          block: copyBlock,
          label: item.label || 'Duplicate Block'
        };

        vg.layoutItems.push(dupItem);
        vg.slots = vg.layoutItems;
        secActiveSlotIds[sec.id] = dupItem.id;

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

        renderSections();
        triggerAutosave();
        showToast('Deleted ' + (item.label || 'block'), 'info');
      }

      function resolvePointerToGridCell(clientX, clientY, canvasEl, cols, rows, colGap, rowGap) {
        var rect = canvasEl.getBoundingClientRect();
        var padding = 16;
        var innerW = Math.max(1, rect.width - (2 * padding));
        var innerH = Math.max(1, rect.height - (2 * padding));

        var colWidth = (innerW - ((cols - 1) * colGap)) / cols;
        var rowHeight = (innerH - ((rows - 1) * rowGap)) / rows;

        var relX = clientX - (rect.left + padding);
        var relY = clientY - (rect.top + padding);

        var col = Math.floor((relX + (colGap / 2)) / (colWidth + colGap)) + 1;
        var row = Math.floor((relY + (rowGap / 2)) / (rowHeight + rowGap)) + 1;

        return {
          col: clampVal(col, 1, cols),
          row: Math.max(1, row)
        };
      }

      // ── Spatial Move Handler ──
      function startBlockMoveAction(sec, item, canvasEl, initialEvent) {
        var vg = sec.visualGrid;
        var startX = initialEvent.clientX;
        var startY = initialEvent.clientY;
        var startCell = resolvePointerToGridCell(startX, startY, canvasEl, vg.columns, vg.rows, vg.columnGap, vg.rowGap);
        var originRect = {
          columnStart: item.columnStart,
          columnSpan: item.columnSpan,
          columnEnd: item.columnStart + item.columnSpan,
          rowStart: item.rowStart,
          rowSpan: item.rowSpan,
          rowEnd: item.rowStart + item.rowSpan
        };
        var isDragging = false;

        function onMove(e) {
          var dist = Math.hypot(e.clientX - startX, e.clientY - startY);
          if (!isDragging) {
            if (dist < 4) return;
            isDragging = true;
            secGridInteractions[sec.id] = {
              mode: 'moving',
              itemId: item.id,
              originRect: originRect,
              previewRect: Object.assign({}, originRect),
              hasCollision: false
            };
          }

          var curCell = resolvePointerToGridCell(e.clientX, e.clientY, canvasEl, vg.columns, vg.rows, vg.columnGap, vg.rowGap);
          var deltaCol = curCell.col - startCell.col;
          var deltaRow = curCell.row - startCell.row;

          var candColStart = clampVal(originRect.columnStart + deltaCol, 1, 12 - originRect.columnSpan + 1);
          var candRowStart = Math.max(1, originRect.rowStart + deltaRow);

          var candRect = {
            columnStart: candColStart,
            columnSpan: originRect.columnSpan,
            columnEnd: candColStart + originRect.columnSpan,
            rowStart: candRowStart,
            rowSpan: originRect.rowSpan,
            rowEnd: candRowStart + originRect.rowSpan
          };

          var collision = checkSlotCollisionState(vg.layoutItems, item.id, candRect);

          secGridInteractions[sec.id].previewRect = candRect;
          secGridInteractions[sec.id].hasCollision = collision;

          // Auto-grow rows in preview if dragged below bottom
          if (candRect.rowEnd - 1 > vg.rows) {
            vg.rows = candRect.rowEnd - 1;
          }

          renderSections();
        }

        function onUp(e) {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);

          var act = secGridInteractions[sec.id];
          secGridInteractions[sec.id] = { mode: 'idle' };

          if (isDragging && act && act.mode === 'moving') {
            if (act.hasCollision) {
              showToast('Space occupied — position reverted', 'warning');
            } else if (act.previewRect && (act.previewRect.columnStart !== originRect.columnStart || act.previewRect.rowStart !== originRect.rowStart)) {
              pushSectionHistory(sec);
              item.columnStart = act.previewRect.columnStart;
              item.columnSpan = originRect.columnSpan;
              item.columnEnd = item.columnStart + item.columnSpan;
              item.rowStart = act.previewRect.rowStart;
              item.rowSpan = originRect.rowSpan;
              item.rowEnd = item.rowStart + item.rowSpan;

              if (item.rowEnd - 1 > vg.rows) {
                vg.rows = item.rowEnd - 1;
              }

              triggerAutosave();
              showToast('Moved ' + item.label);
            }
          }
          renderSections();
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      }

      // ── Spatial Resize Handler ──
      function startBlockResizeAction(sec, item, edge, canvasEl, initialEvent) {
        var vg = sec.visualGrid;
        var originRect = {
          columnStart: item.columnStart,
          columnSpan: item.columnSpan,
          columnEnd: item.columnStart + item.columnSpan,
          rowStart: item.rowStart,
          rowSpan: item.rowSpan,
          rowEnd: item.rowStart + item.rowSpan
        };

        secGridInteractions[sec.id] = {
          mode: 'resizing',
          itemId: item.id,
          resizeEdge: edge,
          originRect: originRect,
          previewRect: Object.assign({}, originRect),
          hasCollision: false
        };

        renderSections();

        function onMove(e) {
          if (!secGridInteractions[sec.id] || secGridInteractions[sec.id].mode !== 'resizing') return;
          var curCell = resolvePointerToGridCell(e.clientX, e.clientY, canvasEl, vg.columns, vg.rows, vg.columnGap, vg.rowGap);

          var candColSpan = originRect.columnSpan;
          var candRowSpan = originRect.rowSpan;

          if (edge === 'e' || edge === 'se') {
            var rawSpan = curCell.col - originRect.columnStart + 1;
            candColSpan = clampVal(rawSpan, 1, 12 - originRect.columnStart + 1);
          }

          if (edge === 's' || edge === 'se') {
            var rawRowSpan = curCell.row - originRect.rowStart + 1;
            candRowSpan = Math.max(1, rawRowSpan);
          }

          var candRect = {
            columnStart: originRect.columnStart,
            columnSpan: candColSpan,
            columnEnd: originRect.columnStart + candColSpan,
            rowStart: originRect.rowStart,
            rowSpan: candRowSpan,
            rowEnd: originRect.rowStart + candRowSpan
          };

          // Limit span if collision occurs with block to the right/below
          if (checkSlotCollisionState(vg.layoutItems, item.id, candRect)) {
            secGridInteractions[sec.id].hasCollision = true;
          } else {
            secGridInteractions[sec.id].hasCollision = false;
          }

          // Auto-grow rows if resizing downwards
          if (candRect.rowEnd - 1 > vg.rows) {
            vg.rows = candRect.rowEnd - 1;
          }

          secGridInteractions[sec.id].previewRect = candRect;
          renderSections();
        }

        function onUp(e) {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);

          var act = secGridInteractions[sec.id];
          secGridInteractions[sec.id] = { mode: 'idle' };

          if (act && act.mode === 'resizing') {
            if (act.hasCollision) {
              showToast('Space occupied — resize reverted', 'warning');
            } else if (act.previewRect && (
              act.previewRect.columnSpan !== originRect.columnSpan ||
              act.previewRect.rowSpan !== originRect.rowSpan
            )) {
              pushSectionHistory(sec);
              item.columnSpan = act.previewRect.columnSpan;
              item.columnEnd = item.columnStart + item.columnSpan;
              item.rowSpan = act.previewRect.rowSpan;
              item.rowEnd = item.rowStart + item.rowSpan;

              if (item.rowEnd - 1 > vg.rows) {
                vg.rows = item.rowEnd - 1;
              }

              triggerAutosave();
              showToast('Resized ' + item.label + ' (' + getSpanPercentageLabel(item.columnSpan) + ')');
            }
          }
          renderSections();
        }

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      }

      // ── Section Visual Grid Renderer (12-Column Composer) ──
      function renderSectionVisualGridElement(sec) {
        migrateSectionToGridComposerV2(sec);
        var vg = sec.visualGrid;
        var h = getSecHistory(sec.id);
        var activeItemId = secActiveSlotIds[sec.id];
        var inter = secGridInteractions[sec.id] || { mode: 'idle' };

        var wrap = document.createElement('div');
        wrap.className = 'grid-composer-wrapper section-grid-wrapper';
        wrap.setAttribute('data-sec-grid-id', sec.id);

        // 1. Grid Toolbar
        var tb = document.createElement('div');
        tb.className = 'grid-composer-toolbar section-grid-toolbar';
        tb.innerHTML =
          '<div class="grid-composer-toolbar-left section-grid-toolbar-left">' +
            '<span class="grid-badge-12col">12 COLS</span>' +
            // Rows Control
            '<div class="grid-control-group">' +
              '<span class="grid-control-label">Rows:</span>' +
              '<div class="grid-stepper">' +
                '<button type="button" class="grid-stepper-btn" data-act="dec-rows" ' + (vg.rows <= 1 ? 'disabled' : '') + '>−</button>' +
                '<span class="grid-stepper-val" id="stat-rows-' + sec.id + '">' + vg.rows + ' rows</span>' +
                '<button type="button" class="grid-stepper-btn" data-act="inc-rows" ' + (vg.rows >= 48 ? 'disabled' : '') + '>+</button>' +
              '</div>' +
            '</div>' +
            // Gap Selector
            '<div class="grid-control-group">' +
              '<button type="button" class="grid-btn" data-act="cycle-gap" title="Cycle column & row gap">Gap: ' + vg.columnGap + 'px</button>' +
            '</div>' +
            // Row Height
            '<div class="grid-control-group">' +
              '<button type="button" class="grid-btn" data-act="cycle-height" title="Cycle row min-height">Row: ' + vg.minRowHeight + 'px</button>' +
            '</div>' +
          '</div>' +
          '<div class="grid-composer-toolbar-right section-grid-toolbar-right">' +
            '<button type="button" class="grid-btn' + (vg.showCoordinates ? ' is-active' : '') + '" data-act="toggle-coords" title="Toggle coordinates"># Coords</button>' +
            '<button type="button" class="grid-btn" data-act="undo-grid" ' + (h.past.length === 0 ? 'disabled style="opacity:0.4"' : '') + ' title="Undo layout">⟲</button>' +
            '<button type="button" class="grid-btn" data-act="redo-grid" ' + (h.future.length === 0 ? 'disabled style="opacity:0.4"' : '') + ' title="Redo layout">⟳</button>' +
            '<button type="button" class="grid-btn" data-act="reset-grid" title="Reset grid to empty 12-column">Reset</button>' +
          '</div>';

        // Stepper Events
        tb.querySelector('[data-act="dec-rows"]').addEventListener('click', function(e) {
          e.stopPropagation();
          if (vg.rows <= 1) return;
          var newRows = vg.rows - 1;
          for (var i = 0; i < vg.layoutItems.length; i++) {
            if ((vg.layoutItems[i].rowStart + vg.layoutItems[i].rowSpan - 1) > newRows) {
              showToast('Cannot shrink rows: blocks exist in row ' + (newRows + 1), 'warning');
              return;
            }
          }
          pushSectionHistory(sec);
          vg.rows = newRows;
          renderSections();
          triggerAutosave();
        });

        tb.querySelector('[data-act="inc-rows"]').addEventListener('click', function(e) {
          e.stopPropagation();
          if (vg.rows >= 48) return;
          pushSectionHistory(sec);
          vg.rows = vg.rows + 1;
          renderSections();
          triggerAutosave();
        });

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

        tb.querySelector('[data-act="cycle-height"]').addEventListener('click', function(e) {
          e.stopPropagation();
          pushSectionHistory(sec);
          var heights = [60, 80, 100, 120];
          var idx = heights.indexOf(vg.minRowHeight);
          var nextH = heights[(idx + 1) % heights.length];
          vg.minRowHeight = nextH;
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
              vg.rows = 3;
              vg.layoutItems = [];
              vg.slots = [];
              secActiveSlotIds[sec.id] = null;
              renderSections();
              triggerAutosave();
              showToast('Grid reset to 12-column empty');
            }
          );
        });

        wrap.appendChild(tb);

        // 2. 12-Column Canvas
        var canvasWrap = document.createElement('div');
        canvasWrap.className = 'grid-composer-canvas-wrap section-grid-canvas-wrap';

        var canvas = document.createElement('div');
        canvas.className = 'grid-composer-canvas section-grid-canvas';
        canvas.style.display = 'grid';
        canvas.style.gridTemplateColumns = 'repeat(12, minmax(0, 1fr))';
        canvas.style.gridAutoRows = 'minmax(' + vg.minRowHeight + 'px, auto)';
        canvas.style.gap = vg.rowGap + 'px ' + vg.columnGap + 'px';
        canvas.setAttribute('data-sec-id', sec.id);

        // Deselect item when clicking canvas background
        canvas.addEventListener('click', function(e) {
          if (e.target === canvas || e.target.classList.contains('grid-cell-guide') || e.target.classList.contains('section-grid-cell')) {
            if (secActiveSlotIds[sec.id]) {
              secActiveSlotIds[sec.id] = null;
              renderSections();
            }
          }
        });

        // Drag & Drop Target for Block Library
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

          var cell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, 12, vg.rows, vg.columnGap, vg.rowGap);
          var checkType = (draggedBlockData && draggedBlockData.type) || 'text';
          var span = 12;
          if (['card-grid-2', 'comparison', 'image-grid', 'stats-metrics'].indexOf(checkType) !== -1 || cell.col > 6) {
            span = Math.min(6, 12 - cell.col + 1);
          } else {
            span = Math.min(12, 12 - cell.col + 1);
          }
          if (span < 1) span = 1;

          var cand = { columnStart: cell.col, columnSpan: span, columnEnd: cell.col + span, rowStart: cell.row, rowSpan: 1, rowEnd: cell.row + 1 };
          var collision = checkSlotCollisionState(vg.layoutItems, null, cand);

          // Update or create drag preview ghost
          var ghost = canvas.querySelector('.grid-placement-preview');
          if (!ghost) {
            ghost = document.createElement('div');
            ghost.className = 'grid-placement-preview';
            canvas.appendChild(ghost);
          }
          ghost.style.gridColumn = cand.columnStart + ' / span ' + cand.columnSpan;
          ghost.style.gridRow = cand.rowStart + ' / span 1';
          if (collision) {
            ghost.classList.add('is-invalid-drop');
            ghost.textContent = 'Space Occupied';
          } else {
            ghost.classList.remove('is-invalid-drop');
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

          var cell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, 12, vg.rows, vg.columnGap, vg.rowGap);
          var span = 12;
          if (['card-grid-2', 'comparison', 'image-grid', 'stats-metrics'].indexOf(payload.type) !== -1 || cell.col > 6) {
            span = Math.min(6, 12 - cell.col + 1);
          } else {
            span = Math.min(12, 12 - cell.col + 1);
          }
          if (span < 1) span = 1;

          var cand = { columnStart: cell.col, columnSpan: span, columnEnd: cell.col + span, rowStart: cell.row, rowSpan: 1, rowEnd: cell.row + 1 };
          if (checkSlotCollisionState(vg.layoutItems, null, cand)) {
            showToast('Space occupied — choose an open area', 'warning');
            return;
          }

          if (cand.rowEnd - 1 > vg.rows) {
            vg.rows = cand.rowEnd - 1;
          }

          var def = window.STUDIO_REGISTRY[payload.type];
          var newBlock = {
            id: uid('blk'),
            type: payload.type,
            data: JSON.parse(JSON.stringify(def.defaultData || {}))
          };
          regenerateBlockNestedIds(newBlock);

          var newItem = {
            id: uid('grid_item'),
            columnStart: cand.columnStart,
            columnSpan: cand.columnSpan,
            columnEnd: cand.columnEnd,
            rowStart: cand.rowStart,
            rowSpan: 1,
            rowEnd: cand.rowStart + 1,
            block: newBlock,
            label: def.label || payload.type
          };

          pushSectionHistory(sec);
          vg.layoutItems.push(newItem);
          vg.slots = vg.layoutItems;
          secActiveSlotIds[sec.id] = newItem.id;

          renderSections();
          triggerAutosave();
          showToast('Placed ' + (def.label || payload.type) + ' (' + getSpanPercentageLabel(cand.columnSpan) + ') on Grid', 'success');
        });

        // Render Background Grid Cell Guides (12 columns x rows)
        for (var r = 1; r <= vg.rows; r++) {
          for (var c = 1; c <= 12; c++) {
            var cell = document.createElement('div');
            cell.className = 'grid-cell-guide section-grid-cell';
            cell.setAttribute('data-col', c);
            cell.setAttribute('data-row', r);
            if (vg.showCoordinates) {
              cell.innerHTML = '<span class="grid-cell-coord cell-coord-badge">' + c + ',' + r + '</span>';
            }
            canvas.appendChild(cell);
          }
        }

        // Render Placed LEGO Blocks (vg.layoutItems)
        vg.layoutItems.forEach(function(item) {
          var isSel = item.id === activeItemId;
          var isMov = inter.mode === 'moving' && inter.itemId === item.id;
          var isRes = inter.mode === 'resizing' && inter.itemId === item.id;
          var blk = item.block;
          var blkDef = blk ? (window.STUDIO_REGISTRY[blk.type] || { label: blk.type }) : { label: 'Block' };
          var glyph = blk ? (BLOCK_GLYPHS[blk.type] || '✦') : '✧';
          var spanCols = item.columnSpan || 12;
          var spanRows = item.rowSpan || 1;

          var itemEl = document.createElement('div');
          itemEl.className = 'grid-block-item section-grid-slot is-occupied' +
            (isSel ? ' is-selected' : '') +
            (isMov ? ' is-moving' : '') +
            (isRes ? ' is-resizing' : '');
          itemEl.setAttribute('data-item-id', item.id);
          itemEl.setAttribute('data-slot-id', item.id);
          itemEl.style.gridColumn = item.columnStart + ' / span ' + spanCols;
          itemEl.style.gridRow = item.rowStart + ' / span ' + spanRows;

          // Block Header with Dedicated Move Handle: ⋮⋮
          var itemHeader = document.createElement('div');
          itemHeader.className = 'grid-block-header slot-header';
          itemHeader.innerHTML =
            '<div class="grid-block-header-left slot-header-left">' +
              '<div class="grid-block-move-handle slot-drag-handle" title="Drag to reposition on 12-column grid">⋮⋮</div>' +
              '<div class="grid-block-title slot-title">' +
                '<span class="grid-block-glyph slot-glyph">' + glyph + '</span>' +
                '<span class="slot-label-text">' + escapeHtml(item.label || blkDef.label) + '</span>' +
                '<span class="grid-block-span-badge">' + spanCols + ' cols (' + getSpanPercentageLabel(spanCols) + ')</span>' +
              '</div>' +
            '</div>' +
            '<div class="grid-block-header-actions slot-actions">' +
              '<button type="button" class="grid-block-btn btn-slot-dup" data-act="dup-item" title="Duplicate block">⧉</button>' +
              '<button type="button" class="grid-block-btn grid-block-btn--danger btn-slot-del" data-act="del-item" title="Delete block">×</button>' +
            '</div>';

          // Selection on header click
          itemHeader.addEventListener('click', function(e) {
            if (e.target.closest('[data-act="dup-item"], [data-act="del-item"]')) return;
            secActiveSlotIds[sec.id] = item.id;
            renderSections();
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

          // Dedicated Move Handle: initiates drag repositioning
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

          // Resize Handles: East (width), South (height), South-East (both)
          var eastHandle = document.createElement('div');
          eastHandle.className = 'grid-resize-handle grid-resize-handle--e';
          eastHandle.title = 'Drag to resize column span (1-12)';
          eastHandle.addEventListener('pointerdown', function(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            secActiveSlotIds[sec.id] = item.id;
            startBlockResizeAction(sec, item, 'e', canvas, e);
          });
          itemEl.appendChild(eastHandle);

          var southHandle = document.createElement('div');
          southHandle.className = 'grid-resize-handle grid-resize-handle--s';
          southHandle.title = 'Drag to resize row height';
          southHandle.addEventListener('pointerdown', function(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            secActiveSlotIds[sec.id] = item.id;
            startBlockResizeAction(sec, item, 's', canvas, e);
          });
          itemEl.appendChild(southHandle);

          var seHandle = document.createElement('div');
          seHandle.className = 'grid-resize-handle grid-resize-handle--se slot-resize-grip';
          seHandle.title = 'Drag to resize width and height';
          seHandle.addEventListener('pointerdown', function(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            secActiveSlotIds[sec.id] = item.id;
            startBlockResizeAction(sec, item, 'se', canvas, e);
          });
          itemEl.appendChild(seHandle);

          canvas.appendChild(itemEl);
        });

        // Render Live Drag/Move Ghost Preview
        if (inter.mode !== 'idle' && inter.previewRect) {
          var pr = inter.previewRect;
          var ghost = document.createElement('div');
          ghost.className = 'grid-placement-preview section-grid-preview ' + (inter.hasCollision ? 'is-invalid-drop is-collision' : 'is-valid');
          ghost.style.gridColumn = pr.columnStart + ' / span ' + (pr.columnSpan || (pr.columnEnd - pr.columnStart));
          ghost.style.gridRow = pr.rowStart + ' / span ' + (pr.rowSpan || (pr.rowEnd - pr.rowStart));
          ghost.textContent = inter.hasCollision ? '⚠ Space Occupied' : '✦ Place Here';
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

        var spanCols = item.columnSpan || 12;
        var spanRows = item.rowSpan || 1;
        var blk = item.block;
        var blkDef = blk ? (window.STUDIO_REGISTRY[blk.type] || { label: blk.type }) : null;

        bar.innerHTML =
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Label:</span>' +
            '<input type="text" class="slot-prop-input slot-prop-input--text" value="' + escapeHtml(item.label || (blkDef ? blkDef.label : 'Block')) + '" data-prop="label" placeholder="Block label" />' +
          '</div>' +
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Col:</span>' +
            '<input type="number" class="slot-prop-input" value="' + item.columnStart + '" min="1" max="12" data-prop="colStart" />' +
          '</div>' +
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Span:</span>' +
            '<input type="number" class="slot-prop-input" value="' + spanCols + '" min="1" max="' + (12 - item.columnStart + 1) + '" data-prop="colSpan" />' +
            '<span style="font-family:var(--font-mono);font-size:10px;color:var(--studio-gold);margin-left:4px">(' + getSpanPercentageLabel(spanCols) + ')</span>' +
          '</div>' +
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">Row:</span>' +
            '<input type="number" class="slot-prop-input" value="' + item.rowStart + '" min="1" max="' + vg.rows + '" data-prop="rowStart" />' +
          '</div>' +
          '<div class="slot-prop-field">' +
            '<span class="slot-prop-label">RowSpan:</span>' +
            '<input type="number" class="slot-prop-input" value="' + spanRows + '" min="1" max="' + vg.rows + '" data-prop="rowSpan" />' +
          '</div>' +
          '<div class="slot-prop-field" style="margin-left:auto;display:flex;gap:6px">' +
            '<button type="button" class="grid-btn" data-act="dup-bar-item" title="Duplicate block">Duplicate</button>' +
            '<button type="button" class="grid-btn grid-btn--danger" data-act="del-bar-item" title="Delete block">Delete</button>' +
            '<button type="button" class="grid-btn" data-act="close-bar-props" title="Close properties">✕</button>' +
          '</div>';

        // Attach listeners
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

        var colStartInput = bar.querySelector('[data-prop="colStart"]');
        var colSpanInput = bar.querySelector('[data-prop="colSpan"]');
        var rowStartInput = bar.querySelector('[data-prop="rowStart"]');
        var rowSpanInput = bar.querySelector('[data-prop="rowSpan"]');

        function applyGeometryChange() {
          var cs = parseInt(colStartInput.value, 10) || item.columnStart;
          var cSpan = parseInt(colSpanInput.value, 10) || item.columnSpan;
          var rs = parseInt(rowStartInput.value, 10) || item.rowStart;
          var rSpan = parseInt(rowSpanInput.value, 10) || item.rowSpan;

          cs = clampVal(cs, 1, 12);
          cSpan = clampVal(cSpan, 1, 12 - cs + 1);
          rs = Math.max(1, rs);
          rSpan = Math.max(1, rSpan);

          var cand = {
            columnStart: cs,
            columnSpan: cSpan,
            columnEnd: cs + cSpan,
            rowStart: rs,
            rowSpan: rSpan,
            rowEnd: rs + rSpan
          };

          if (checkSlotCollisionState(vg.layoutItems, item.id, cand)) {
            showToast('Position/span collides with an existing block', 'warning');
            colStartInput.value = item.columnStart;
            colSpanInput.value = item.columnSpan;
            rowStartInput.value = item.rowStart;
            rowSpanInput.value = item.rowSpan;
            return;
          }

          if (cand.rowEnd - 1 > vg.rows) {
            vg.rows = cand.rowEnd - 1;
          }

          pushSectionHistory(sec);
          item.columnStart = cand.columnStart;
          item.columnSpan = cand.columnSpan;
          item.columnEnd = cand.columnEnd;
          item.rowStart = cand.rowStart;
          item.rowSpan = cand.rowSpan;
          item.rowEnd = cand.rowEnd;

          renderSections();
          triggerAutosave();
        }

        colStartInput.addEventListener('change', applyGeometryChange);
        colSpanInput.addEventListener('change', applyGeometryChange);
        rowStartInput.addEventListener('change', applyGeometryChange);
        rowSpanInput.addEventListener('change', applyGeometryChange);

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
        var details = document.createElement('details');
        details.className = 'section-legacy-blocks-drawer';
        details.innerHTML = '<summary><span>📦 Legacy Content Blocks (' + sec.blocks.length + ')</span></summary>';
        var body = document.createElement('div');
        body.className = 'section-legacy-blocks-body';
        sec.blocks.forEach(function(b, bIndex) {
          var bCard = createBlockCardElement(sec, b, bIndex, sec.blocks.length, null);

          var headerActions = bCard.querySelector('.block-header-actions');
          if (headerActions) {
            var migrateBtn = document.createElement('button');
            migrateBtn.type = 'button';
            migrateBtn.className = 'btn-legacy-migrate-slot';
            migrateBtn.innerHTML = '⚡ Place on Grid';
            migrateBtn.title = 'Migrate this legacy block into the 12-column grid';
            migrateBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              var vg = sec.visualGrid;
              var placement = findFirstAvailablePlacement(vg.layoutItems, vg.rows, 12, 1);
              if (placement.requiredRows > vg.rows) vg.rows = placement.requiredRows;

              pushSectionHistory(sec);
              var newItem = {
                id: uid('grid_item'),
                columnStart: placement.columnStart,
                columnSpan: placement.columnSpan,
                columnEnd: placement.columnStart + placement.columnSpan,
                rowStart: placement.rowStart,
                rowSpan: placement.rowSpan,
                rowEnd: placement.rowStart + placement.rowSpan,
                block: b,
                label: window.STUDIO_REGISTRY[b.type] ? window.STUDIO_REGISTRY[b.type].label : b.type
              };
              vg.layoutItems.push(newItem);
              vg.slots = vg.layoutItems;
              sec.blocks = sec.blocks.filter(function(x) { return x.id !== b.id; });
              secActiveSlotIds[sec.id] = newItem.id;
              renderSections();
              triggerAutosave();
              showToast('Migrated ' + newItem.label + ' to 12-column grid');
            });
            headerActions.insertBefore(migrateBtn, headerActions.firstChild);
          }

          body.appendChild(bCard);
        });
        details.appendChild(body);
        return details;
      }

      // Keyboard listener for Section Grid actions (Undo/Redo/Delete/Escape)
      window.addEventListener('keydown', function(e) {
        var targetEl = e.target;
        var activeEl = document.activeElement;
        var isTyping = (targetEl && (
          targetEl.tagName === 'INPUT' ||
          targetEl.tagName === 'TEXTAREA' ||
          targetEl.tagName === 'SELECT' ||
          targetEl.isContentEditable ||
          targetEl.getAttribute('contenteditable') === 'true' ||
          targetEl.closest('.rich-text-popover') ||
          targetEl.closest('.studio-url-popover') ||
          targetEl.closest('.rich-surface') ||
          targetEl.closest('.block-editor-card')
        )) || (activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable ||
          activeEl.getAttribute('contenteditable') === 'true' ||
          activeEl.closest('.rich-text-popover') ||
          activeEl.closest('.studio-url-popover') ||
          activeEl.closest('.rich-surface') ||
          activeEl.closest('.block-editor-card')
        ));

        var sec = currentDoc.sections.find(function(s) { return s.id === activeSectionId; });
        if (!sec || !sec.visualGrid) return;
        var itemId = secActiveSlotIds[sec.id];

        if (e.key === 'Escape') {
          if (secGridInteractions[sec.id] && secGridInteractions[sec.id].mode !== 'idle') {
            secGridInteractions[sec.id] = { mode: 'idle' };
            renderSections();
            return;
          }
          if (itemId) {
            secActiveSlotIds[sec.id] = null;
            renderSections();
            return;
          }
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          if (!isTyping) {
            e.preventDefault();
            undoSectionVisualGrid(sec);
            return;
          }
        }

        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
          if (!isTyping) {
            e.preventDefault();
            redoSectionVisualGrid(sec);
            return;
          }
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && itemId) {
          if (!isTyping) {
            e.preventDefault();
            deleteGridItem(sec, itemId, false);
            return;
          }
        }
      });\n\n      `;

content = content.slice(0, actualStart) + newGridEngine + content.slice(endPos);
fs.writeFileSync(studioPath, content, 'utf8');
console.log('Successfully replaced grid engine in studio.astro!');
