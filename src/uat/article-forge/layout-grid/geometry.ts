/**
 * COVEN UAT ARTICLE FORGE — SECTION VISUAL GRID GEOMETRY ENGINE
 * Mathematical bounds, collision detection, and coordinate resolution.
 */
import type { GridRect, GridSlot, VisualGrid } from './types';

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Standard CSS Grid Rectangle overlap test.
 * Two intervals [s1, e1) and [s2, e2) overlap iff max(s1, s2) < min(e1, e2).
 */
export function rectsOverlap(r1: GridRect, r2: GridRect): boolean {
  const colOverlap = Math.max(r1.columnStart, r2.columnStart) < Math.min(r1.columnEnd, r2.columnEnd);
  const rowOverlap = Math.max(r1.rowStart, r2.rowStart) < Math.min(r1.rowEnd, r2.rowEnd);
  return colOverlap && rowOverlap;
}

/**
 * Collision detection against all active slots in a section grid.
 */
export function checkCollision(slots: GridSlot[], excludeSlotId: string | null, candidateRect: GridRect): boolean {
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.id === excludeSlotId) continue;
    if (rectsOverlap(s, candidateRect)) {
      return true;
    }
  }
  return false;
}

/**
 * Mathematical grid coordinate resolver from pointer coordinates.
 */
export function getCellFromPointer(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  columns: number,
  rows: number,
  columnGap: number,
  rowGap: number,
  padding = 16
): { col: number; row: number } {
  const innerW = Math.max(1, canvasRect.width - (2 * padding));
  const innerH = Math.max(1, canvasRect.height - (2 * padding));

  const colWidth = (innerW - ((columns - 1) * columnGap)) / columns;
  const rowHeight = (innerH - ((rows - 1) * rowGap)) / rows;

  const relX = clientX - (canvasRect.left + padding);
  const relY = clientY - (canvasRect.top + padding);

  const col = Math.floor((relX + (columnGap / 2)) / (colWidth + columnGap)) + 1;
  const row = Math.floor((relY + (rowGap / 2)) / (rowHeight + rowGap)) + 1;

  return {
    col: clamp(col, 1, columns),
    row: clamp(row, 1, rows)
  };
}

/**
 * Find the first unoccupied 1x1 cell in the grid.
 */
export function findAvailableCell(slots: GridSlot[], columns: number, rows: number): { col: number; row: number } | null {
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= columns; c++) {
      const candidate: GridRect = { columnStart: c, columnEnd: c + 1, rowStart: r, rowEnd: r + 1 };
      if (!checkCollision(slots, null, candidate)) {
        return { col: c, row: r };
      }
    }
  }
  return null;
}

/**
 * Verify whether columns can be safely shrunk without colliding with or clipping placed slots.
 */
export function canShrinkColumns(slots: GridSlot[], newCols: number): boolean {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].columnEnd > newCols + 1) return false;
  }
  return true;
}

/**
 * Verify whether rows can be safely shrunk without colliding with or clipping placed slots.
 */
export function canShrinkRows(slots: GridSlot[], newRows: number): boolean {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].rowEnd > newRows + 1) return false;
  }
  return true;
}

/**
 * Clamps a slot's coordinates within valid grid dimensions.
 */
export function clampSlotBounds(slot: GridSlot, columns: number, rows: number): GridSlot {
  const spanCols = slot.columnEnd - slot.columnStart;
  const spanRows = slot.rowEnd - slot.rowStart;

  const colStart = clamp(slot.columnStart, 1, Math.max(1, columns - spanCols + 1));
  const colEnd = Math.min(colStart + spanCols, columns + 1);

  const rowStart = clamp(slot.rowStart, 1, Math.max(1, rows - spanRows + 1));
  const rowEnd = Math.min(rowStart + spanRows, rows + 1);

  return {
    ...slot,
    columnStart: colStart,
    columnEnd: colEnd,
    rowStart,
    rowEnd
  };
}

/**
 * Creates default section grid configuration.
 * Default: 3 columns, 3 rows, 16px gaps, 80px minRowHeight, empty slots.
 */
export function createDefaultVisualGrid(): VisualGrid {
  return {
    columns: 3,
    rows: 3,
    columnGap: 16,
    rowGap: 16,
    minRowHeight: 80,
    showCoordinates: false,
    slots: []
  };
}

