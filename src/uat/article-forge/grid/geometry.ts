/**
 * COVEN UAT ARTICLE FORGE — GRID COMPOSER V2 GEOMETRY ENGINE
 * 4-Column Spatial Mathematics, Collision Detection, Stable Pointer Math & Runaway Protection
 */
import type { GridRect, GridLayoutItem, GridComposerV2 } from './types';

export const MAX_GRID_ROWS = 200;
export const MIN_GRID_ROWS = 3;
export const DEFAULT_GRID_COLUMNS = 4;

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Standard CSS Grid Rectangle overlap test.
 * Rectangles overlap if they intersect in both column and row dimensions.
 */
export function rectsOverlap(r1: GridRect, r2: GridRect): boolean {
  const r1ColStart = r1.columnStart || 1;
  const r1ColSpan = r1.columnSpan || Math.max(1, (r1.columnEnd || (r1ColStart + 1)) - r1ColStart);
  const r1ColEnd = r1.columnEnd || (r1ColStart + r1ColSpan);

  const r1RowStart = r1.rowStart || 1;
  const r1RowSpan = r1.rowSpan || Math.max(1, (r1.rowEnd || (r1RowStart + 1)) - r1RowStart);
  const r1RowEnd = r1.rowEnd || (r1RowStart + r1RowSpan);

  const r2ColStart = r2.columnStart || 1;
  const r2ColSpan = r2.columnSpan || Math.max(1, (r2.columnEnd || (r2ColStart + 1)) - r2ColStart);
  const r2ColEnd = r2.columnEnd || (r2ColStart + r2ColSpan);

  const r2RowStart = r2.rowStart || 1;
  const r2RowSpan = r2.rowSpan || Math.max(1, (r2.rowEnd || (r2RowStart + 1)) - r2RowStart);
  const r2RowEnd = r2.rowEnd || (r2.rowStart + r2.rowSpan);

  const colOverlap = Math.max(r1ColStart, r2ColStart) < Math.min(r1ColEnd, r2ColEnd);
  const rowOverlap = Math.max(r1RowStart, r2RowStart) < Math.min(r1RowEnd, r2RowEnd);
  return colOverlap && rowOverlap;
}

/**
 * Collision test against placed items in a section grid.
 */
export function checkCollision(
  items: GridLayoutItem[],
  excludeId: string | null,
  candidate: GridRect
): boolean {
  if (!Array.isArray(items)) return false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.id === excludeId) continue;
    if (rectsOverlap(item, candidate)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the first unoccupied space on the 4-column grid that fits candidate span.
 * If no existing rows have space without collision, appends only the minimum required rows!
 * Defensively clamped to MAX_GRID_ROWS.
 */
export function findFirstAvailablePlacement(
  items: GridLayoutItem[],
  currentRows: number,
  preferredColSpan = 4,
  preferredRowSpan = 1
): { columnStart: number; columnSpan: number; rowStart: number; rowSpan: number; requiredRows: number } {
  const span = clamp(preferredColSpan || 4, 1, 4);
  const rSpan = Math.max(1, preferredRowSpan || 1);
  const rows = clamp(currentRows || MIN_GRID_ROWS, MIN_GRID_ROWS, MAX_GRID_ROWS);

  // 1. Scan row by row, column by column in existing rows
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= 4 - span + 1; c++) {
      const candidate: GridRect = {
        columnStart: c,
        columnSpan: span,
        columnEnd: c + span,
        rowStart: r,
        rowSpan: rSpan,
        rowEnd: r + rSpan
      };
      if (!checkCollision(items, null, candidate)) {
        return {
          columnStart: c,
          columnSpan: span,
          rowStart: r,
          rowSpan: rSpan,
          requiredRows: Math.min(MAX_GRID_ROWS, Math.max(rows, r + rSpan - 1))
        };
      }
    }
  }

  // 2. Append exactly one target row at the end
  const newRow = Math.min(MAX_GRID_ROWS, rows + 1);
  return {
    columnStart: 1,
    columnSpan: span,
    rowStart: newRow,
    rowSpan: rSpan,
    requiredRows: Math.min(MAX_GRID_ROWS, newRow + rSpan - 1)
  };
}

/**
 * Authoritative 4-Column Placement Engine.
 * Calculates contiguous free columns starting at targetCol on targetRow.
 * If explicitWidth is false, auto-fits into available contiguous columns (e.g. 25%, 50%, 75%, 100%).
 * If explicitWidth is true, verifies available space and returns helpful constraint feedback if too narrow.
 */
export function resolvePlacementTarget(
  items: GridLayoutItem[],
  targetCol: number,
  targetRow: number,
  requestedSpan = 4,
  explicitWidth = false,
  excludeItemId: string | null = null
): {
  valid: boolean;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
  contiguousFree: number;
  autoFitApplied: boolean;
  reason?: string;
} {
  const col = clamp(targetCol, 1, 4);
  const row = clamp(targetRow, 1, MAX_GRID_ROWS);
  const reqSpan = clamp(requestedSpan || 4, 1, 4);

  // 1. Calculate contiguous free columns starting at `col` on `row`
  let contiguousFree = 0;
  for (let c = col; c <= 4; c++) {
    const singleCell: GridRect = {
      columnStart: c,
      columnSpan: 1,
      columnEnd: c + 1,
      rowStart: row,
      rowSpan: 1,
      rowEnd: row + 1
    };
    if (checkCollision(items, excludeItemId, singleCell)) {
      break;
    }
    contiguousFree++;
  }

  // 2. Case: Target cell itself is occupied
  if (contiguousFree === 0) {
    return {
      valid: false,
      columnStart: col,
      columnSpan: reqSpan,
      rowStart: row,
      rowSpan: 1,
      contiguousFree: 0,
      autoFitApplied: false,
      reason: 'Space Occupied'
    };
  }

  // 3. Case: Explicit width requested (e.g. author explicitly locked a width pill or button)
  if (explicitWidth) {
    if (contiguousFree >= reqSpan) {
      return {
        valid: true,
        columnStart: col,
        columnSpan: reqSpan,
        rowStart: row,
        rowSpan: 1,
        contiguousFree,
        autoFitApplied: false
      };
    } else {
      return {
        valid: false,
        columnStart: col,
        columnSpan: reqSpan,
        rowStart: row,
        rowSpan: 1,
        contiguousFree,
        autoFitApplied: false,
        reason: `Needs ${getSpanPercentageLabel(reqSpan)} · only ${getSpanPercentageLabel(contiguousFree)} available`
      };
    }
  }

  // 4. Case: Flexible width / Auto-fit (e.g. library drag/drop or default placement)
  if (contiguousFree >= reqSpan) {
    return {
      valid: true,
      columnStart: col,
      columnSpan: reqSpan,
      rowStart: row,
      rowSpan: 1,
      contiguousFree,
      autoFitApplied: false
    };
  } else {
    // Auto-fit to the available contiguous space!
    return {
      valid: true,
      columnStart: col,
      columnSpan: contiguousFree,
      rowStart: row,
      rowSpan: 1,
      contiguousFree,
      autoFitApplied: true,
      reason: `${getSpanPercentageLabel(contiguousFree)} · Auto-fit`
    };
  }
}

/**
 * Get human-readable width percentage string for a 4-column span.
 */
export function getSpanPercentageLabel(colSpan: number): string {
  const span = clamp(colSpan, 1, 4);
  switch (span) {
    case 1: return '25%';
    case 2: return '50%';
    case 3: return '75%';
    case 4: return '100%';
    default: return `${span * 25}%`;
  }
}

/**
 * Stable mathematical 4-column grid coordinate resolver from pointer coordinates.
 * Calculates row from invariant nominal track size (minRowHeight + rowGap).
 * IMMUNE to positive feedback loops: never divides by dynamic canvas height or row count!
 */
export function getCellFromPointer(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  minRowHeight = 80,
  rowGap = 16,
  columnGap = 16,
  padding = 16
): { col: number; row: number } {
  const innerW = Math.max(1, canvasRect.width - (2 * padding));
  const colTrackSize = ((innerW - (3 * columnGap)) / 4) + columnGap;
  const rowTrackSize = Math.max(40, minRowHeight + rowGap);

  const relX = clientX - (canvasRect.left + padding);
  const relY = clientY - (canvasRect.top + padding);

  const col = Math.floor(relX / colTrackSize) + 1;
  const row = Math.floor(relY / rowTrackSize) + 1;

  return {
    col: clamp(col, 1, 4),
    row: clamp(row, 1, MAX_GRID_ROWS)
  };
}

/**
 * Normalizes section rows to fit placed items cleanly without accumulating trailing empty rows.
 * Maintains occupied rows + 1 empty working row underneath, respecting MIN_GRID_ROWS.
 */
export function normalizeSectionRows(sec: any): void {
  if (!sec || !sec.visualGrid) return;
  const vg = sec.visualGrid;
  const items = Array.isArray(vg.layoutItems) ? vg.layoutItems : (Array.isArray(vg.slots) ? vg.slots : []);
  const highestRow = items.reduce((max: number, it: any) => {
    const rStart = it.rowStart || 1;
    const rSpan = it.rowSpan || Math.max(1, (it.rowEnd || (rStart + 1)) - rStart);
    return Math.max(max, rStart + rSpan - 1);
  }, 0);

  // Keep occupied rows + 1 empty working row for placement
  const targetRows = Math.max(MIN_GRID_ROWS, highestRow + 1);
  vg.rows = clamp(targetRows, MIN_GRID_ROWS, MAX_GRID_ROWS);
}

/**
 * Attaches non-enumerable backward-compatibility getters to section and visualGrid.
 * Ensures in-memory access to .slots or .layout works seamlessly with 0% chance of divergence,
 * while preventing duplicate properties from persisting during JSON.stringify serialization.
 */
export function attachNonEnumerableAliases(section: any, visualGrid: any): void {
  if (visualGrid) {
    delete visualGrid.slots;
    Object.defineProperty(visualGrid, 'slots', {
      get() { return this.layoutItems; },
      set(v) { this.layoutItems = v; },
      enumerable: false,
      configurable: true
    });
  }
  if (section) {
    delete section.layout;
    Object.defineProperty(section, 'layout', {
      get() { return this.visualGrid; },
      set(v) { this.visualGrid = v; },
      enumerable: false,
      configurable: true
    });
  }
}

/**
 * Creates a default, clean 4-column Grid Composer V2 state.
 */
export function createDefaultGridComposerV2(): GridComposerV2 {
  const composer: GridComposerV2 = {
    columns: 4,
    rows: MIN_GRID_ROWS,
    columnGap: 16,
    rowGap: 16,
    minRowHeight: 80,
    showCoordinates: false,
    layoutItems: []
  };
  attachNonEnumerableAliases(null, composer);
  return composer;
}

/**
 * Migrates any legacy or previous phase section layout into canonical 4-Column Grid Composer V2.
 * Includes defensive runaway row detection & normalization for corrupted drafts!
 */
export function migrateSectionToGridComposerV2(section: any): GridComposerV2 {
  const defaultComposer = createDefaultGridComposerV2();
  if (!section) return defaultComposer;

  // Case 1: Already has layoutItems in 4-column format
  if (section.visualGrid && Array.isArray(section.visualGrid.layoutItems) && section.visualGrid.columns === 4) {
    const vg = section.visualGrid;
    attachNonEnumerableAliases(section, vg);
    // Check for runaway row corruption in existing draft
    const highestRow = vg.layoutItems.reduce((max: number, it: any) => {
      const rStart = it.rowStart || 1;
      const rSpan = it.rowSpan || 1;
      return Math.max(max, rStart + rSpan - 1);
    }, 0);

    if (vg.rows > 50 && highestRow < 30) {
      console.warn(`[UAT Grid Composer] Normalizing runaway rows (${vg.rows} -> ${Math.max(MIN_GRID_ROWS, highestRow + 1)})`);
      vg.rows = Math.max(MIN_GRID_ROWS, highestRow + 1);
    } else {
      vg.rows = clamp(Math.max(MIN_GRID_ROWS, highestRow + 1, vg.rows || MIN_GRID_ROWS), MIN_GRID_ROWS, MAX_GRID_ROWS);
    }
    return vg;
  }

  // Case 2: Section has layoutItems from previous 12-column or 3-column format
  if (section.visualGrid && Array.isArray(section.visualGrid.layoutItems) && section.visualGrid.layoutItems.length > 0) {
    const vg = section.visualGrid;
    const oldCols = vg.columns || 12;
    const items: GridLayoutItem[] = [];

    vg.layoutItems.forEach((it: any) => {
      const block = it.block || (Array.isArray(it.blocks) && it.blocks[0] ? it.blocks[0] : null);
      if (!block) return;

      const oldColStart = it.columnStart || 1;
      const oldColEnd = it.columnEnd || (oldColStart + 1);
      const oldSpan = it.columnSpan || Math.max(1, oldColEnd - oldColStart);

      let colStart = 1;
      let colSpan = 4;

      if (oldCols === 12) {
        colStart = clamp(Math.round((oldColStart - 1) / 3) + 1, 1, 4);
        colSpan = clamp(Math.round(oldSpan / 3), 1, 4 - colStart + 1);
      } else if (oldCols === 3) {
        colStart = clamp(oldColStart, 1, 4);
        colSpan = clamp(oldSpan, 1, 4 - colStart + 1);
      } else {
        colStart = clamp(oldColStart, 1, 4);
        colSpan = clamp(oldSpan, 1, 4 - colStart + 1);
      }

      const rStart = clamp(it.rowStart || 1, 1, MAX_GRID_ROWS);

      items.push({
        id: it.id || `item_${Math.random().toString(36).slice(2, 9)}`,
        columnStart: colStart,
        columnSpan: colSpan,
        columnEnd: colStart + colSpan,
        rowStart: rStart,
        rowSpan: 1, // Content-driven height
        rowEnd: rStart + 1,
        block: block,
        label: it.label || undefined
      });
    });

    const highestRow = items.reduce((max, it) => Math.max(max, it.rowStart), 0);
    const targetRows = Math.max(MIN_GRID_ROWS, highestRow + 1);

    const composer: GridComposerV2 = {
      columns: 4,
      rows: clamp(targetRows, MIN_GRID_ROWS, MAX_GRID_ROWS),
      columnGap: vg.columnGap || 16,
      rowGap: vg.rowGap || 16,
      minRowHeight: vg.minRowHeight || 80,
      showCoordinates: Boolean(vg.showCoordinates),
      layoutItems: items
    };

    section.visualGrid = composer;
    attachNonEnumerableAliases(section, composer);
    return composer;
  }

  // Case 3: Section has visualGrid with slots (from Phase 3, 4, or 5)
  if (section.visualGrid && Array.isArray(section.visualGrid.slots) && section.visualGrid.slots.length > 0) {
    const vg = section.visualGrid;
    const oldCols = vg.columns || 3;
    const items: GridLayoutItem[] = [];

    vg.slots.forEach((s: any) => {
      const block = s.block || (Array.isArray(s.blocks) && s.blocks[0] ? s.blocks[0] : null);
      if (!block) return; // Discard empty slots

      const oldColStart = s.columnStart || 1;
      const oldColEnd = s.columnEnd || (oldColStart + 1);
      const oldSpan = Math.max(1, oldColEnd - oldColStart);

      let colStart = 1;
      let colSpan = 4;

      if (oldCols === 12) {
        colStart = clamp(Math.round((oldColStart - 1) / 3) + 1, 1, 4);
        colSpan = clamp(Math.round(oldSpan / 3), 1, 4 - colStart + 1);
      } else if (oldCols === 3) {
        colStart = clamp(oldColStart, 1, 4);
        colSpan = clamp(oldSpan, 1, 4 - colStart + 1);
      } else {
        colStart = clamp(oldColStart, 1, 4);
        colSpan = clamp(oldSpan, 1, 4 - colStart + 1);
      }

      const rStart = clamp(s.rowStart || 1, 1, MAX_GRID_ROWS);

      const item: GridLayoutItem = {
        id: s.id || `item_${Math.random().toString(36).slice(2, 9)}`,
        columnStart: colStart,
        columnSpan: colSpan,
        columnEnd: colStart + colSpan,
        rowStart: rStart,
        rowSpan: 1, // Content-driven height
        rowEnd: rStart + 1,
        block: block,
        label: s.label || undefined
      };
      items.push(item);
    });

    const highestRow = items.reduce((max, it) => Math.max(max, it.rowStart), 0);
    const saneRows = (vg.rows > 50 && highestRow < 30) ? Math.max(MIN_GRID_ROWS, highestRow + 1) : Math.max(MIN_GRID_ROWS, highestRow + 1, vg.rows || MIN_GRID_ROWS);

    const composer: GridComposerV2 = {
      columns: 4,
      rows: clamp(saneRows, MIN_GRID_ROWS, MAX_GRID_ROWS),
      columnGap: vg.columnGap || 16,
      rowGap: vg.rowGap || 16,
      minRowHeight: vg.minRowHeight || 80,
      showCoordinates: Boolean(vg.showCoordinates),
      layoutItems: items
    };

    section.visualGrid = composer;
    attachNonEnumerableAliases(section, composer);
    return composer;
  }

  // Case 4: Legacy section.blocks[] unslotted content
  if (Array.isArray(section.blocks) && section.blocks.length > 0) {
    const items: GridLayoutItem[] = section.blocks.map((blk: any, idx: number) => {
      const row = clamp(idx + 1, 1, MAX_GRID_ROWS);
      return {
        id: `migrated_${blk.id || idx}`,
        columnStart: 1,
        columnSpan: 4,
        columnEnd: 5,
        rowStart: row,
        rowSpan: 1,
        rowEnd: row + 1,
        block: blk
      };
    });

    const composer: GridComposerV2 = {
      columns: 4,
      rows: clamp(Math.max(MIN_GRID_ROWS, items.length + 1), MIN_GRID_ROWS, MAX_GRID_ROWS),
      columnGap: 16,
      rowGap: 16,
      minRowHeight: 80,
      showCoordinates: false,
      layoutItems: items
    };

    section.visualGrid = composer;
    attachNonEnumerableAliases(section, composer);
    return composer;
  }

  // Case 5: Default empty 4-column grid
  section.visualGrid = defaultComposer;
  attachNonEnumerableAliases(section, defaultComposer);
  return defaultComposer;
}
