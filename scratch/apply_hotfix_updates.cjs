const fs = require('fs');

let code = fs.readFileSync('src/pages/lab/layout-forge/studio.astro', 'utf8');

// 1. Update resolvePointerToGridCell
const oldPointerMath = 'function resolvePointerToGridCell(clientX, clientY, canvasEl, minRowHeight, rowGap, columnGap) {\n        var rect = canvasEl.getBoundingClientRect();';
const newPointerMath = 'function resolvePointerToGridCell(clientX, clientY, canvasEl, minRowHeight, rowGap, columnGap, cachedRect) {\n        var rect = cachedRect || canvasEl.getBoundingClientRect();';
if (!code.includes(oldPointerMath)) throw new Error('oldPointerMath not found');
code = code.replace(oldPointerMath, newPointerMath);

// 2. Update startBlockMoveAction and startBlockResizeAction
const oldMoveResizeStart = '      // ── Spatial Move Handler (Drag Repositioning) ──\n      function startBlockMoveAction(sec, item, canvasEl, initialEvent) {';
const oldMoveResizeEnd = '      // ── Section Visual Grid Renderer (True 4-Column Composer) ──\n      function renderSectionVisualGridElement(sec) {';
const startIdx = code.indexOf(oldMoveResizeStart);
const endIdx = code.indexOf(oldMoveResizeEnd);
if (startIdx === -1 || endIdx === -1) throw new Error('MoveResize block not found');

const newMoveResizeCode = `      // ── Spatial Move Handler (Drag Repositioning) ──
      function startBlockMoveAction(sec, item, canvasEl, initialEvent) {
        var vg = sec.visualGrid;
        var canvasRect = canvasEl.getBoundingClientRect();
        var startX = initialEvent.clientX;
        var startY = initialEvent.clientY;
        var startCell = resolvePointerToGridCell(startX, startY, canvasEl, vg.minRowHeight, vg.rowGap, vg.columnGap, canvasRect);
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
        var moveRafId = null;
        var lastMoveTarget = null;

        var itemEl = canvasEl.querySelector('.grid-block-item[data-item-id="' + item.id + '"]');

        function onMove(e) {
          var clientX = e.clientX;
          var clientY = e.clientY;
          var dist = Math.hypot(clientX - startX, clientY - startY);
          if (!isDragging) {
            if (dist < 4) return;
            isDragging = true;
            document.body.classList.add('is-grid-dragging');
            canvasEl.classList.add('is-dragging-active');
            if (itemEl) itemEl.classList.add('is-moving');
            ghostEl = canvasEl.querySelector('.grid-placement-preview');
            if (!ghostEl) {
              ghostEl = document.createElement('div');
              ghostEl.className = 'grid-placement-preview is-valid';
              canvasEl.appendChild(ghostEl);
            }
          }

          if (moveRafId) return;
          moveRafId = requestAnimationFrame(function() {
            moveRafId = null;
            var curCell = resolvePointerToGridCell(clientX, clientY, canvasEl, vg.minRowHeight, vg.rowGap, vg.columnGap, canvasRect);
            var deltaCol = curCell.col - startCell.col;
            var deltaRow = curCell.row - startCell.row;

            var candColStart = clampVal(originRect.columnStart + deltaCol, 1, 4 - originRect.columnSpan + 1);
            var candRowStart = clampVal(originRect.rowStart + deltaRow, 1, MAX_GRID_ROWS);

            var res = resolvePlacementTarget(vg.layoutItems, candColStart, candRowStart, originRect.columnSpan, true, item.id);

            if (lastMoveTarget &&
                lastMoveTarget.colStart === res.columnStart &&
                lastMoveTarget.rowStart === res.rowStart &&
                lastMoveTarget.valid === res.valid) {
              return;
            }
            lastMoveTarget = { colStart: res.columnStart, rowStart: res.rowStart, valid: res.valid };

            if (ghostEl) {
              ghostEl.style.gridColumn = res.columnStart + ' / span ' + res.columnSpan;
              ghostEl.style.gridRow = res.rowStart + ' / span 1';
              if (res.valid) {
                ghostEl.className = 'grid-placement-preview is-valid';
                ghostEl.textContent = '✦ Move to (' + res.columnStart + ',' + res.rowStart + ') · ' + getSpanPercentageLabel(res.columnSpan);
              } else {
                ghostEl.className = 'grid-placement-preview is-invalid-drop';
                ghostEl.textContent = '⚠ ' + (res.reason || 'Space Occupied');
              }
            }

            secGridInteractions[sec.id] = {
              mode: 'moving',
              itemId: item.id,
              previewRect: { columnStart: res.columnStart, columnSpan: res.columnSpan, rowStart: res.rowStart, rowSpan: 1 },
              hasCollision: !res.valid
            };
          });
        }

        function onUp(e) {
          if (moveRafId) {
            cancelAnimationFrame(moveRafId);
            moveRafId = null;
          }
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);

          document.body.classList.remove('is-grid-dragging');
          canvasEl.classList.remove('is-dragging-active');
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
        var canvasRect = canvasEl.getBoundingClientRect();
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
        document.body.classList.add('is-grid-dragging');
        canvasEl.classList.add('is-dragging-active');

        var ghostEl = canvasEl.querySelector('.grid-placement-preview');
        if (!ghostEl) {
          ghostEl = document.createElement('div');
          ghostEl.className = 'grid-placement-preview is-valid';
          canvasEl.appendChild(ghostEl);
        }

        var tooltip = document.createElement('div');
        tooltip.className = 'grid-resize-tooltip';
        itemEl.appendChild(tooltip);

        var resizeRafId = null;
        var lastResizeTarget = null;

        function onMove(e) {
          var clientX = e.clientX;
          var clientY = e.clientY;
          if (resizeRafId) return;
          resizeRafId = requestAnimationFrame(function() {
            resizeRafId = null;
            var curCell = resolvePointerToGridCell(clientX, clientY, canvasEl, vg.minRowHeight, vg.rowGap, vg.columnGap, canvasRect);
            var newColStart = originRect.columnStart;
            var newColSpan = originRect.columnSpan;

            if (edge === 'e') {
              var endCol = Math.max(originRect.columnStart, curCell.col);
              newColSpan = clampVal(endCol - originRect.columnStart + 1, 1, 4 - originRect.columnStart + 1);
            } else if (edge === 'w') {
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

            if (lastResizeTarget &&
                lastResizeTarget.colStart === candRect.columnStart &&
                lastResizeTarget.colSpan === candRect.columnSpan &&
                lastResizeTarget.collision === collision) {
              return;
            }
            lastResizeTarget = { colStart: candRect.columnStart, colSpan: candRect.columnSpan, collision: collision };

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
          });
        }

        function onUp(e) {
          if (resizeRafId) {
            cancelAnimationFrame(resizeRafId);
            resizeRafId = null;
          }
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);

          document.body.classList.remove('is-grid-dragging');
          canvasEl.classList.remove('is-dragging-active');
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
      }\n\n`;

code = code.slice(0, startIdx) + newMoveResizeCode + code.slice(endIdx);

// 3. Update pBanner pill click in renderSectionVisualGridElement
const oldPillClick = `          pBanner.querySelectorAll('.mode-pill').forEach(function(pill) {
            pill.addEventListener('click', function(e) {
              e.stopPropagation();
              var w = parseInt(pill.getAttribute('data-w'), 10) || 4;
              activePlacement.widthSpan = w;
              renderSections();
            });
          });`;

const newPillClick = `          pBanner.querySelectorAll('.mode-pill').forEach(function(pill) {
            pill.addEventListener('click', function(e) {
              e.stopPropagation();
              var w = parseInt(pill.getAttribute('data-w'), 10) || 4;
              activePlacement.widthSpan = w;
              activePlacement.explicitWidth = true;
              renderSections();
            });
          });`;

if (!code.includes(oldPillClick)) throw new Error('oldPillClick not found');
code = code.replace(oldPillClick, newPillClick);

// 4. Update canvas events, dragover, drop, and cellSlots in renderSectionVisualGridElement
const oldCanvasStart = "        // Deselect item when clicking canvas background\n        canvas.addEventListener('click', function(e) {";
const oldCanvasEnd = "        // Render Placed LEGO Blocks (vg.layoutItems)\n        vg.layoutItems.forEach(function(item) {";
const canvasStartIdx = code.indexOf(oldCanvasStart);
const canvasEndIdx = code.indexOf(oldCanvasEnd);
if (canvasStartIdx === -1 || canvasEndIdx === -1) throw new Error('canvas interaction block not found');

const newCanvasInteractions = `        // Deselect item when clicking canvas background
        canvas.addEventListener('click', function(e) {
          if (e.target === canvas) {
            if (activePlacement) {
              var cell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, vg.minRowHeight, vg.rowGap, vg.columnGap);
              var span = activePlacement.widthSpan || 4;
              var isExplicit = Boolean(activePlacement.explicitWidth);
              var res = resolvePlacementTarget(vg.layoutItems, cell.col, cell.row, span, isExplicit);
              if (res.valid) {
                var preloaded = (activePlacement.legacySource && activePlacement.legacySource.block) ? activePlacement.legacySource.block.data : null;
                var legSrc = activePlacement.legacySource;
                commitBlockPlacement(sec, activePlacement.blockType, res.columnStart, res.columnSpan, res.rowStart, preloaded);
                if (legSrc && legSrc.sec && Array.isArray(legSrc.sec.blocks)) {
                  legSrc.sec.blocks.splice(legSrc.index, 1);
                }
                exitPlacementMode();
                return;
              }
            } else if (activeMove && activeMove.secId === sec.id) {
              var mCell = resolvePointerToGridCell(e.clientX, e.clientY, canvas, vg.minRowHeight, vg.rowGap, vg.columnGap);
              var movingIt = vg.layoutItems.find(function(it) { return it.id === activeMove.itemId; });
              if (movingIt) {
                var mRes = resolvePlacementTarget(vg.layoutItems, mCell.col, mCell.row, movingIt.columnSpan, true, movingIt.id);
                if (mRes.valid) {
                  if (commitBlockMove(sec, movingIt, mRes.columnStart, mRes.rowStart)) {
                    exitMoveMode();
                    return;
                  }
                }
              }
            }
            if (secActiveSlotIds[sec.id]) {
              secActiveSlotIds[sec.id] = null;
              renderSections();
            }
          }
        });

        // ── Drag & Drop from Library onto 4-Column Grid (High Performance rAF) ──
        var dragRafId = null;
        var lastDragTargetState = null;
        var cachedDragCanvasRect = null;

        function cleanupDragPreview() {
          if (dragRafId) {
            cancelAnimationFrame(dragRafId);
            dragRafId = null;
          }
          cachedDragCanvasRect = null;
          lastDragTargetState = null;
          canvas.classList.remove('is-dragging-active');
          document.body.classList.remove('is-grid-dragging');
          var ghost = canvas.querySelector('.grid-placement-preview');
          if (ghost) ghost.remove();
        }

        canvas.addEventListener('dragenter', function(e) {
          cachedDragCanvasRect = canvas.getBoundingClientRect();
          canvas.classList.add('is-dragging-active');
          document.body.classList.add('is-grid-dragging');
        });

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

          var clientX = e.clientX;
          var clientY = e.clientY;

          if (dragRafId) return; // Coalescing: only 1 resolution per browser render frame
          dragRafId = requestAnimationFrame(function() {
            dragRafId = null;
            if (!cachedDragCanvasRect) {
              cachedDragCanvasRect = canvas.getBoundingClientRect();
            }

            var cell = resolvePointerToGridCell(clientX, clientY, canvas, vg.minRowHeight, vg.rowGap, vg.columnGap, cachedDragCanvasRect);
            var reqSpan = (draggedBlockData && draggedBlockData.widthSpan) || 4;
            var isExplicit = Boolean(draggedBlockData && draggedBlockData.explicitWidth);

            var res = resolvePlacementTarget(vg.layoutItems, cell.col, cell.row, reqSpan, isExplicit);

            // Skip DOM write if target state hasn't changed
            if (lastDragTargetState &&
                lastDragTargetState.colStart === res.columnStart &&
                lastDragTargetState.colSpan === res.columnSpan &&
                lastDragTargetState.rowStart === res.rowStart &&
                lastDragTargetState.valid === res.valid &&
                lastDragTargetState.reason === res.reason) {
              return;
            }
            lastDragTargetState = {
              colStart: res.columnStart,
              colSpan: res.columnSpan,
              rowStart: res.rowStart,
              valid: res.valid,
              reason: res.reason
            };

            var ghost = canvas.querySelector('.grid-placement-preview');
            if (!ghost) {
              ghost = document.createElement('div');
              ghost.className = 'grid-placement-preview';
              canvas.appendChild(ghost);
            }

            ghost.style.gridColumn = res.columnStart + ' / span ' + res.columnSpan;
            ghost.style.gridRow = res.rowStart + ' / span 1';

            if (res.valid) {
              ghost.className = 'grid-placement-preview is-valid' + (res.autoFitApplied ? ' is-autofit' : '');
              ghost.textContent = '+ Place (' + getSpanPercentageLabel(res.columnSpan) + (res.autoFitApplied ? ' · Auto-fit' : '') + ')';
            } else {
              ghost.className = 'grid-placement-preview is-invalid-drop';
              ghost.textContent = '⚠ ' + (res.reason || 'Space Occupied');
            }
          });
        });

        canvas.addEventListener('dragleave', function(e) {
          if (e.relatedTarget && canvas.contains(e.relatedTarget)) return;
          cleanupDragPreview();
        });

        canvas.addEventListener('drop', function(e) {
          e.preventDefault();
          cleanupDragPreview();

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
          var reqSpan = payload.widthSpan || 4;
          var isExplicit = Boolean(payload.explicitWidth);

          var res = resolvePlacementTarget(vg.layoutItems, cell.col, cell.row, reqSpan, isExplicit);
          if (!res.valid) {
            showToast(res.reason || 'Space occupied — choose an open cell', 'warning');
            return;
          }

          commitBlockPlacement(sec, payload.type, res.columnStart, res.columnSpan, res.rowStart);
        });

        // ── Interactive Empty Grid Cells ──
        var highestOccupied = getRequiredRowsForItems(vg.layoutItems);
        var visibleRows = Math.max(MIN_GRID_ROWS, highestOccupied + 1);
        vg.rows = clampVal(visibleRows, MIN_GRID_ROWS, MAX_GRID_ROWS);

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
                    var reqSpan = activePlacement.widthSpan || 4;
                    var isExplicit = Boolean(activePlacement.explicitWidth);
                    var res = resolvePlacementTarget(vg.layoutItems, colIdx, rowIdx, reqSpan, isExplicit);

                    var ghost = canvas.querySelector('.grid-placement-preview');
                    if (!ghost) {
                      ghost = document.createElement('div');
                      ghost.className = 'grid-placement-preview';
                      canvas.appendChild(ghost);
                    }
                    ghost.style.gridColumn = res.columnStart + ' / span ' + res.columnSpan;
                    ghost.style.gridRow = res.rowStart + ' / span 1';
                    if (res.valid) {
                      ghost.className = 'grid-placement-preview is-valid' + (res.autoFitApplied ? ' is-autofit' : '');
                      ghost.textContent = '✦ Place ' + escapeHtml(activePlacement.label) + ' (' + getSpanPercentageLabel(res.columnSpan) + (res.autoFitApplied ? ' · Auto-fit' : '') + ') — Click to Confirm';
                    } else {
                      ghost.className = 'grid-placement-preview is-invalid-drop';
                      ghost.textContent = '⚠ ' + (res.reason || 'Space Occupied');
                    }
                  } else if (activeMove && activeMove.secId === sec.id) {
                    var mItem = vg.layoutItems.find(function(it) { return it.id === activeMove.itemId; }) || activeMove.item;
                    if (mItem) {
                      var mSpan = mItem.columnSpan || 4;
                      var mRes = resolvePlacementTarget(vg.layoutItems, colIdx, rowIdx, mSpan, true, mItem.id);

                      var mGhost = canvas.querySelector('.grid-placement-preview');
                      if (!mGhost) {
                        mGhost = document.createElement('div');
                        mGhost.className = 'grid-placement-preview';
                        canvas.appendChild(mGhost);
                      }
                      mGhost.style.gridColumn = mRes.columnStart + ' / span ' + mRes.columnSpan;
                      mGhost.style.gridRow = mRes.rowStart + ' / span 1';
                      if (mRes.valid) {
                        mGhost.className = 'grid-placement-preview is-valid';
                        mGhost.textContent = '✦ Move ' + escapeHtml(mItem.label) + ' (' + getSpanPercentageLabel(mRes.columnSpan) + ') — Click to Move';
                      } else {
                        mGhost.className = 'grid-placement-preview is-invalid-drop';
                        mGhost.textContent = '⚠ ' + (mRes.reason || 'Space Occupied');
                      }
                    }
                  }
                });

                // Click on empty cell
                cellSlot.addEventListener('click', function(e) {
                  e.stopPropagation();
                  if (activePlacement) {
                    var reqSpan = activePlacement.widthSpan || 4;
                    var isExplicit = Boolean(activePlacement.explicitWidth);
                    var res = resolvePlacementTarget(vg.layoutItems, colIdx, rowIdx, reqSpan, isExplicit);
                    if (!res.valid) {
                      showToast(res.reason || 'Space occupied — please choose an open cell', 'warning');
                      return;
                    }
                    var placedBlockData = (activePlacement.legacySource && activePlacement.legacySource.block) ? activePlacement.legacySource.block.data : null;
                    var legacySource = activePlacement.legacySource;
                    commitBlockPlacement(sec, activePlacement.blockType, res.columnStart, res.columnSpan, res.rowStart, placedBlockData);
                    if (legacySource && legacySource.sec && Array.isArray(legacySource.sec.blocks)) {
                      legacySource.sec.blocks.splice(legacySource.index, 1);
                    }
                    exitPlacementMode();
                  } else if (activeMove && activeMove.secId === sec.id) {
                    var movingIt = vg.layoutItems.find(function(it) { return it.id === activeMove.itemId; });
                    if (movingIt) {
                      var mRes = resolvePlacementTarget(vg.layoutItems, colIdx, rowIdx, movingIt.columnSpan, true, movingIt.id);
                      if (!mRes.valid) {
                        showToast(mRes.reason || 'Space occupied', 'warning');
                        return;
                      }
                      if (commitBlockMove(sec, movingIt, mRes.columnStart, mRes.rowStart)) {
                        exitMoveMode();
                      }
                    }
                  } else {
                    showToast('Click a block pattern in the Library on the left to enter Placement Mode', 'info');
                  }
                });

                canvas.appendChild(cellSlot);
              })(c, r);
            }
          }
        }\n\n`;

code = code.slice(0, canvasStartIdx) + newCanvasInteractions + code.slice(canvasEndIdx);

// 5. Update renderLegacyBlocksDrawer
const oldLegacyDrawerStart = '      function renderLegacyBlocksDrawer(sec) {';
const oldLegacyDrawerEnd = '      function migrateLegacyBlockToSlot(sec, blockIndex) {';
const drawerStartIdx = code.indexOf(oldLegacyDrawerStart);
const drawerEndIdx = code.indexOf(oldLegacyDrawerEnd);
if (drawerStartIdx === -1 || drawerEndIdx === -1) throw new Error('Legacy drawer function not found');

const newLegacyDrawerCode = `      function renderLegacyBlocksDrawer(sec) {
        if (!sec || !sec.blocks || sec.blocks.length === 0) return null;

        var drawer = document.createElement('div');
        drawer.className = 'legacy-blocks-drawer section-legacy-drawer';
        drawer.innerHTML =
          '<div class="legacy-drawer-header" title="Click to collapse / expand">' +
            '<div class="legacy-drawer-title-group">' +
              '<span class="legacy-drawer-toggle-icon">▼</span>' +
              '<span class="legacy-drawer-badge">LEGACY CONTENT</span>' +
              '<span class="legacy-drawer-title">Unslotted Section Blocks</span>' +
              '<span class="legacy-drawer-count">(' + sec.blocks.length + ' unslotted block' + (sec.blocks.length === 1 ? '' : 's') + ' waiting for placement)</span>' +
            '</div>' +
            '<div class="legacy-drawer-header-actions">' +
              '<button type="button" class="grid-btn" data-act="migrate-all-blocks" title="Migrate all legacy blocks to 4-column grid">Migrate All to 4-Column Grid</button>' +
            '</div>' +
          '</div>' +
          '<div class="legacy-drawer-body"></div>';

        drawer.querySelector('.legacy-drawer-header').addEventListener('click', function(e) {
          if (e.target.closest('[data-act="migrate-all-blocks"]')) return;
          drawer.classList.toggle('is-collapsed');
        });

        var body = drawer.querySelector('.legacy-drawer-body');
        sec.blocks.forEach(function(blk, idx) {
          var blkDef = window.STUDIO_REGISTRY[blk.type] || { label: blk.type };
          var glyph = BLOCK_GLYPHS[blk.type] || '✦';

          var snippet = '';
          if (blk.data) {
            snippet = blk.data.text || blk.data.title || blk.data.quote || blk.data.caption || blk.data.content || '';
            if (typeof snippet === 'string') {
              snippet = snippet.replace(/<[^>]+>/g, '').trim();
            } else {
              snippet = '';
            }
          }

          var row = document.createElement('div');
          row.className = 'legacy-block-row';
          row.innerHTML =
            '<div class="legacy-block-left">' +
              '<span class="legacy-block-glyph">' + glyph + '</span>' +
              '<span class="legacy-block-type">' + escapeHtml(blkDef.label || blk.type) + '</span>' +
              (snippet ? '<span class="legacy-block-snippet" title="' + escapeHtml(snippet) + '">' + escapeHtml(snippet) + '</span>' : '') +
            '</div>' +
            '<div class="legacy-block-actions">' +
              '<button type="button" class="grid-btn" data-act="place-mode" title="Pick width and place on grid">Place on Grid</button>' +
              '<button type="button" class="grid-btn" data-act="quick-add" title="Place into next available space">Auto-place</button>' +
              '<button type="button" class="grid-btn grid-btn--danger" data-act="del-legacy" title="Remove unslotted block">✕</button>' +
            '</div>';

          row.querySelector('[data-act="place-mode"]').addEventListener('click', function(e) {
            e.stopPropagation();
            enterPlacementMode(blk.type, 4, { sec: sec, index: idx, block: blk });
            showToast('Click an open grid cell to place this ' + (blkDef.label || blk.type), 'info');
          });

          row.querySelector('[data-act="quick-add"]').addEventListener('click', function(e) {
            e.stopPropagation();
            migrateLegacyBlockToSlot(sec, idx);
          });

          row.querySelector('[data-act="del-legacy"]').addEventListener('click', function(e) {
            e.stopPropagation();
            showInlineDelete(
              e.currentTarget,
              'Remove this unslotted block?',
              null,
              function() {
                sec.blocks.splice(idx, 1);
                renderSections();
                triggerAutosave();
                showToast('Removed unslotted block', 'info');
              }
            );
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
      }\n\n`;

code = code.slice(0, drawerStartIdx) + newLegacyDrawerCode + code.slice(drawerEndIdx);

// 6. Update wrap.appendChild(legacyDrawer) in renderSectionVisualGridElement
const oldWrapLegacy = `        // Preserved Legacy Content Blocks Drawer
        if (sec.blocks && sec.blocks.length > 0) {
          var legacyDrawer = renderLegacyBlocksDrawer(sec);
          wrap.appendChild(legacyDrawer);
        }`;

const newWrapLegacy = `        // Preserved Legacy Content Blocks Drawer
        if (sec.blocks && sec.blocks.length > 0) {
          var legacyDrawer = renderLegacyBlocksDrawer(sec);
          if (legacyDrawer) wrap.appendChild(legacyDrawer);
        }`;

if (!code.includes(oldWrapLegacy)) throw new Error('oldWrapLegacy not found');
code = code.replace(oldWrapLegacy, newWrapLegacy);

// 7. Remove DUPLICATE legacyDrawer append in renderSections
const oldCardLegacy = `          // ── Preserved Legacy Content Blocks Drawer (Phase 4 manual migration) ──
          if (sec.blocks && sec.blocks.length > 0) {
            var legacyDrawer = renderLegacyBlocksDrawer(sec);
            card.appendChild(legacyDrawer);
          }`;

if (!code.includes(oldCardLegacy)) throw new Error('oldCardLegacy not found');
code = code.replace(oldCardLegacy, '');

fs.writeFileSync('src/pages/lab/layout-forge/studio.astro', code, 'utf8');
console.log('Successfully applied all hotfixes to studio.astro!');

