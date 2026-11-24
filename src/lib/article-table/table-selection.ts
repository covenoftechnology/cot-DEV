/**
 * COVEN OF TECHNOLOGY — PURE TECHNICAL TABLE SELECTION MATH
 *
 * Ephemeral editor-only selection helpers. Selection state is NEVER persisted
 * into article JSON. Supports single cell, rectangular range (drag / Shift+click),
 * full row selection, and full column selection.
 */

import type { MergeRegion, TableSectionKind } from './table-merges';
import { findMergeContainingCell, regionsOverlap } from './table-merges';

export type TableSelectionKind = 'cell' | 'range' | 'row' | 'column';

export interface TableSelection {
  kind: TableSelectionKind;
  section: TableSectionKind | 'all'; // 'all' when full column is selected (header + body)
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

export function createSingleCellSelection(
  section: TableSectionKind,
  rowIndex: number,
  colIndex: number,
  merges: MergeRegion[] = []
): TableSelection {
  const containing = findMergeContainingCell(merges, rowIndex, colIndex, section);
  if (containing) {
    return {
      kind: 'cell',
      section,
      rowStart: containing.rowStart,
      rowEnd: containing.rowStart + containing.rowSpan - 1,
      colStart: containing.columnStart,
      colEnd: containing.columnStart + containing.columnSpan - 1,
    };
  }
  return {
    kind: 'cell',
    section,
    rowStart: rowIndex,
    rowEnd: rowIndex,
    colStart: colIndex,
    colEnd: colIndex,
  };
}

/**
 * Computes a contiguous rectangular selection between anchor and focus cells.
 * Automatically expands cleanly to include any intersecting merged regions
 * so the resulting selection is always a valid rectangle.
 */
export function createRectSelection(
  section: TableSectionKind,
  anchorRow: number,
  anchorCol: number,
  focusRow: number,
  focusCol: number,
  merges: MergeRegion[] = []
): TableSelection {
  let r0 = Math.min(anchorRow, focusRow);
  let r1 = Math.max(anchorRow, focusRow);
  let c0 = Math.min(anchorCol, focusCol);
  let c1 = Math.max(anchorCol, focusCol);

  if (section === 'header') {
    r0 = 0;
    r1 = 0;
  }

  // Iteratively expand bounds to swallow any partially overlapped merge cleanly
  if (Array.isArray(merges) && merges.length > 0) {
    let changed = true;
    let guard = 0;
    while (changed && guard < 16) {
      changed = false;
      guard++;
      const rectAsMerge: MergeRegion = {
        section,
        rowStart: r0,
        columnStart: c0,
        rowSpan: r1 - r0 + 1,
        columnSpan: c1 - c0 + 1,
      };
      for (const m of merges) {
        if (regionsOverlap(rectAsMerge, m)) {
          const mR0 = m.rowStart;
          const mR1 = m.rowStart + m.rowSpan - 1;
          const mC0 = m.columnStart;
          const mC1 = m.columnStart + m.columnSpan - 1;
          if (mR0 < r0) { r0 = mR0; changed = true; }
          if (mR1 > r1) { r1 = mR1; changed = true; }
          if (mC0 < c0) { c0 = mC0; changed = true; }
          if (mC1 > c1) { c1 = mC1; changed = true; }
        }
      }
    }
  }

  const isSingle = r0 === r1 && c0 === c1;
  const exactMerge = findMergeContainingCell(merges, r0, c0, section);
  const matchesExactMerge = Boolean(
    exactMerge &&
      exactMerge.rowStart === r0 &&
      exactMerge.rowStart + exactMerge.rowSpan - 1 === r1 &&
      exactMerge.columnStart === c0 &&
      exactMerge.columnStart + exactMerge.columnSpan - 1 === c1
  );

  return {
    kind: isSingle || matchesExactMerge ? 'cell' : 'range',
    section,
    rowStart: r0,
    rowEnd: r1,
    colStart: c0,
    colEnd: c1,
  };
}

export function createRowSelection(
  section: TableSectionKind,
  rowIndex: number,
  colCount: number
): TableSelection {
  return {
    kind: 'row',
    section,
    rowStart: section === 'header' ? 0 : rowIndex,
    rowEnd: section === 'header' ? 0 : rowIndex,
    colStart: 0,
    colEnd: Math.max(0, colCount - 1),
  };
}

export function createColumnSelection(colIndex: number, rowCount: number): TableSelection {
  return {
    kind: 'column',
    section: 'all',
    rowStart: 0,
    rowEnd: Math.max(0, rowCount - 1),
    colStart: colIndex,
    colEnd: colIndex,
  };
}

export function isCellInSelection(
  sel: TableSelection | null | undefined,
  section: TableSectionKind,
  rowIndex: number,
  colIndex: number,
  rowSpan: number = 1,
  colSpan: number = 1
): boolean {
  if (!sel) return false;
  if (sel.kind === 'column' || sel.section === 'all') {
    const cellColEnd = colIndex + colSpan - 1;
    return !(cellColEnd < sel.colStart || colIndex > sel.colEnd);
  }
  if (sel.section !== section) return false;
  const cellRowEnd = rowIndex + rowSpan - 1;
  const cellColEnd = colIndex + colSpan - 1;
  return !(
    cellRowEnd < sel.rowStart ||
    rowIndex > sel.rowEnd ||
    cellColEnd < sel.colStart ||
    colIndex > sel.colEnd
  );
}

export function getSelectionBoundaryClasses(
  sel: TableSelection | null | undefined,
  section: TableSectionKind,
  rowIndex: number,
  colIndex: number,
  rowSpan: number = 1,
  colSpan: number = 1,
  totalBodyRows: number = 1
): string[] {
  if (!sel || !isCellInSelection(sel, section, rowIndex, colIndex, rowSpan, colSpan)) {
    return [];
  }
  const classes = ['is-table-cell-selected'];
  const cellRowEnd = rowIndex + rowSpan - 1;
  const cellColEnd = colIndex + colSpan - 1;

  if (sel.kind === 'column' || sel.section === 'all') {
    if (section === 'header') classes.push('is-sel-top');
    if (section === 'body' && cellRowEnd >= totalBodyRows - 1) classes.push('is-sel-bottom');
    if (colIndex <= sel.colStart) classes.push('is-sel-left');
    if (cellColEnd >= sel.colEnd) classes.push('is-sel-right');
    return classes;
  }

  if (rowIndex <= sel.rowStart) classes.push('is-sel-top');
  if (cellRowEnd >= sel.rowEnd) classes.push('is-sel-bottom');
  if (colIndex <= sel.colStart) classes.push('is-sel-left');
  if (cellColEnd >= sel.colEnd) classes.push('is-sel-right');
  return classes;
}

export function canMergeSelection(
  sel: TableSelection | null | undefined,
  merges: MergeRegion[] = []
): boolean {
  if (!sel) return false;
  if (sel.section === 'all' || sel.kind === 'column') return false;
  const rSpan = sel.rowEnd - sel.rowStart + 1;
  const cSpan = sel.colEnd - sel.colStart + 1;
  if (rSpan === 1 && cSpan === 1) return false;
  if (sel.section === 'header' && rSpan > 1) return false;
  // If selection is ALREADY one single merged cell, user should see Unmerge instead of Merge
  const existing = findMergeContainingCell(merges, sel.rowStart, sel.colStart, sel.section);
  if (
    existing &&
    existing.rowStart === sel.rowStart &&
    existing.rowStart + existing.rowSpan - 1 === sel.rowEnd &&
    existing.columnStart === sel.colStart &&
    existing.columnStart + existing.columnSpan - 1 === sel.colEnd
  ) {
    return false;
  }
  return true;
}

export function canUnmergeSelection(
  sel: TableSelection | null | undefined,
  merges: MergeRegion[] = []
): MergeRegion | null {
  if (!sel || sel.section === 'all') return null;
  const m = findMergeContainingCell(merges, sel.rowStart, sel.colStart, sel.section);
  if (!m) return null;
  // Allow unmerge if selection is that merged cell (or encompasses it)
  return m;
}
