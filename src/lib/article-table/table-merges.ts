/**
 * COVEN OF TECHNOLOGY — PURE TECHNICAL TABLE MERGE & STRUCTURAL HELPERS
 *
 * Non-destructive merge architecture:
 * - Underlying cell matrix remains 100% intact.
 * - Merge regions store only semantic geometry:
 *   { rowStart, columnStart, rowSpan, columnSpan, section? }
 * - Unmerging restores hidden covered cells with original content & styling.
 * - Row/Column insert and delete deterministically shift, expand, shrink, or
 *   safely unmerge intersecting regions so invalid merge metadata is impossible.
 */

export type TableSectionKind = 'header' | 'body';

export interface MergeRegion {
  section?: TableSectionKind; // Omitted or 'body' for tbody; 'header' for horizontal header merges
  rowStart: number;
  columnStart: number;
  rowSpan: number;
  columnSpan: number;
}

export interface MergeRectInput {
  section?: TableSectionKind;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}

export interface MergeValidationResult {
  valid: boolean;
  reason?: string;
  normalized?: MergeRegion;
}

function normSection(s?: TableSectionKind): TableSectionKind {
  return s === 'header' ? 'header' : 'body';
}

export function regionsOverlap(a: MergeRegion, b: MergeRegion): boolean {
  if (normSection(a.section) !== normSection(b.section)) return false;
  const aRowEnd = a.rowStart + a.rowSpan - 1;
  const aColEnd = a.columnStart + a.columnSpan - 1;
  const bRowEnd = b.rowStart + b.rowSpan - 1;
  const bColEnd = b.columnStart + b.columnSpan - 1;
  return !(aRowEnd < b.rowStart || bRowEnd < a.rowStart || aColEnd < b.columnStart || bColEnd < a.columnStart);
}

export function isRegionInside(inner: MergeRegion, outer: MergeRegion): boolean {
  if (normSection(inner.section) !== normSection(outer.section)) return false;
  return (
    inner.rowStart >= outer.rowStart &&
    inner.columnStart >= outer.columnStart &&
    inner.rowStart + inner.rowSpan <= outer.rowStart + outer.rowSpan &&
    inner.columnStart + inner.columnSpan <= outer.columnStart + outer.columnSpan
  );
}

/**
 * Validates a candidate merge region against table bounds and existing merges.
 * Existing merges fully contained inside the new rectangle may be absorbed cleanly;
 * partial overlaps with external merges are rejected.
 */
export function validateMergeRegion(
  region: MergeRegion,
  rowCount: number,
  colCount: number,
  existingMerges: MergeRegion[] = []
): MergeValidationResult {
  if (!region || typeof region !== 'object') {
    return { valid: false, reason: 'Invalid merge region object.' };
  }
  const sec = normSection(region.section);
  const maxRows = sec === 'header' ? 1 : rowCount;
  const rowStart = Math.floor(Number(region.rowStart));
  const columnStart = Math.floor(Number(region.columnStart));
  const rowSpan = Math.floor(Number(region.rowSpan));
  const columnSpan = Math.floor(Number(region.columnSpan));

  if (
    !Number.isFinite(rowStart) ||
    !Number.isFinite(columnStart) ||
    !Number.isFinite(rowSpan) ||
    !Number.isFinite(columnSpan)
  ) {
    return { valid: false, reason: 'Merge coordinates must be finite integers.' };
  }
  if (rowSpan < 1 || columnSpan < 1) {
    return { valid: false, reason: 'Merge span must be at least 1x1.' };
  }
  if (rowSpan === 1 && columnSpan === 1) {
    return { valid: false, reason: 'Select at least two adjacent cells to merge.' };
  }
  if (sec === 'header' && rowSpan > 1) {
    return { valid: false, reason: 'Header merges cannot span vertically into body rows.' };
  }
  if (rowStart < 0 || columnStart < 0 || rowStart + rowSpan > maxRows || columnStart + columnSpan > colCount) {
    return { valid: false, reason: 'Merge region exceeds table boundaries.' };
  }

  const normalized: MergeRegion =
    sec === 'header'
      ? { section: 'header', rowStart: 0, columnStart, rowSpan: 1, columnSpan }
      : { rowStart, columnStart, rowSpan, columnSpan };

  for (const existing of existingMerges) {
    if (regionsOverlap(normalized, existing) && !isRegionInside(existing, normalized)) {
      return { valid: false, reason: 'Selection partially overlaps an existing merged cell.' };
    }
  }

  return { valid: true, normalized };
}

export function getMergeOrigin(
  merges: MergeRegion[] | undefined,
  rowIndex: number,
  colIndex: number,
  section: TableSectionKind = 'body'
): MergeRegion | null {
  if (!Array.isArray(merges) || merges.length === 0) return null;
  const sec = normSection(section);
  for (const m of merges) {
    if (normSection(m.section) === sec && m.rowStart === rowIndex && m.columnStart === colIndex) {
      return m;
    }
  }
  return null;
}

export function findMergeContainingCell(
  merges: MergeRegion[] | undefined,
  rowIndex: number,
  colIndex: number,
  section: TableSectionKind = 'body'
): MergeRegion | null {
  if (!Array.isArray(merges) || merges.length === 0) return null;
  const sec = normSection(section);
  for (const m of merges) {
    if (
      normSection(m.section) === sec &&
      rowIndex >= m.rowStart &&
      rowIndex < m.rowStart + m.rowSpan &&
      colIndex >= m.columnStart &&
      colIndex < m.columnStart + m.columnSpan
    ) {
      return m;
    }
  }
  return null;
}

export function isCellCovered(
  merges: MergeRegion[] | undefined,
  rowIndex: number,
  colIndex: number,
  section: TableSectionKind = 'body'
): boolean {
  const m = findMergeContainingCell(merges, rowIndex, colIndex, section);
  if (!m) return false;
  return !(m.rowStart === rowIndex && m.columnStart === colIndex);
}

/**
 * Non-destructively merges a contiguous rectangular selection.
 * Returns a new mergeRegions array (does not mutate underlying cell content).
 */
export function mergeCells(
  merges: MergeRegion[] | undefined,
  rect: MergeRectInput,
  rowCount: number,
  colCount: number
): { ok: boolean; mergeRegions: MergeRegion[]; reason?: string } {
  const current = Array.isArray(merges) ? merges.slice() : [];
  const sec = normSection(rect.section);
  const r0 = Math.min(rect.rowStart, rect.rowEnd);
  const r1 = Math.max(rect.rowStart, rect.rowEnd);
  const c0 = Math.min(rect.columnStart, rect.columnEnd);
  const c1 = Math.max(rect.columnStart, rect.columnEnd);

  const candidate: MergeRegion = {
    ...(sec === 'header' ? { section: 'header' as const } : {}),
    rowStart: r0,
    columnStart: c0,
    rowSpan: r1 - r0 + 1,
    columnSpan: c1 - c0 + 1,
  };

  const check = validateMergeRegion(candidate, rowCount, colCount, current);
  if (!check.valid || !check.normalized) {
    return { ok: false, mergeRegions: current, reason: check.reason };
  }

  // Absorb any smaller merges strictly contained inside the new merge rectangle
  const next = current.filter((m) => !isRegionInside(m, check.normalized!));
  next.push(check.normalized);
  return { ok: true, mergeRegions: next };
}

/**
 * Unmerges the region containing (rowIndex, colIndex).
 * Underlying hidden cells and their original content/styles immediately reappear.
 */
export function unmergeCells(
  merges: MergeRegion[] | undefined,
  rowIndex: number,
  colIndex: number,
  section: TableSectionKind = 'body'
): { ok: boolean; mergeRegions: MergeRegion[] } {
  const current = Array.isArray(merges) ? merges.slice() : [];
  const target = findMergeContainingCell(current, rowIndex, colIndex, section);
  if (!target) {
    return { ok: false, mergeRegions: current };
  }
  const next = current.filter((m) => m !== target);
  return { ok: true, mergeRegions: next };
}

/**
 * Deterministic merge adjustment when a body row is inserted or deleted.
 * - insert at `index`:
 *     - merges with rowStart >= index shift down by +1
 *     - merges strictly spanning across index expand rowSpan by +1
 * - delete at `index`:
 *     - merges with rowStart > index shift up by -1
 *     - merges intersecting index shrink rowSpan by -1; if reduced to 1x1, safely unmerge
 */
export function adjustMergesAfterRowMutation(
  merges: MergeRegion[] | undefined,
  action: 'insert' | 'delete',
  index: number
): MergeRegion[] {
  if (!Array.isArray(merges) || merges.length === 0) return [];
  const next: MergeRegion[] = [];

  for (const m of merges) {
    if (normSection(m.section) === 'header') {
      next.push({ ...m });
      continue;
    }

    if (action === 'insert') {
      if (m.rowStart >= index) {
        next.push({ ...m, rowStart: m.rowStart + 1 });
      } else if (m.rowStart < index && m.rowStart + m.rowSpan > index) {
        next.push({ ...m, rowSpan: m.rowSpan + 1 });
      } else {
        next.push({ ...m });
      }
    } else {
      // delete
      if (m.rowStart > index) {
        next.push({ ...m, rowStart: m.rowStart - 1 });
      } else if (m.rowStart <= index && m.rowStart + m.rowSpan > index) {
        const nextRowSpan = m.rowSpan - 1;
        if (nextRowSpan >= 1 && (nextRowSpan > 1 || m.columnSpan > 1)) {
          next.push({ ...m, rowSpan: nextRowSpan });
        }
        // Otherwise reduced to 1x1 or 0 rows -> safely unmerge (drop region)
      } else {
        next.push({ ...m });
      }
    }
  }
  return next;
}

/**
 * Deterministic merge adjustment when a column is inserted or deleted.
 * Applies symmetrically to both header and body merge regions.
 */
export function adjustMergesAfterColumnMutation(
  merges: MergeRegion[] | undefined,
  action: 'insert' | 'delete',
  index: number
): MergeRegion[] {
  if (!Array.isArray(merges) || merges.length === 0) return [];
  const next: MergeRegion[] = [];

  for (const m of merges) {
    if (action === 'insert') {
      if (m.columnStart >= index) {
        next.push({ ...m, columnStart: m.columnStart + 1 });
      } else if (m.columnStart < index && m.columnStart + m.columnSpan > index) {
        next.push({ ...m, columnSpan: m.columnSpan + 1 });
      } else {
        next.push({ ...m });
      }
    } else {
      // delete
      if (m.columnStart > index) {
        next.push({ ...m, columnStart: m.columnStart - 1 });
      } else if (m.columnStart <= index && m.columnStart + m.columnSpan > index) {
        const nextColSpan = m.columnSpan - 1;
        if (nextColSpan >= 1 && (m.rowSpan > 1 || nextColSpan > 1)) {
          next.push({ ...m, columnSpan: nextColSpan });
        }
        // Otherwise reduced to 1x1 or 0 cols -> safely unmerge (drop region)
      } else {
        next.push({ ...m });
      }
    }
  }
  return next;
}

/**
 * Pure structural helper: inserts a new body row at `index` and updates merges cleanly.
 */
export function insertRow(
  tableData: Record<string, any>,
  index: number,
  createRowId: () => string
): Record<string, any> {
  const columns = Array.isArray(tableData.columns) ? tableData.columns : [];
  const rows = Array.isArray(tableData.rows) ? tableData.rows.slice() : [];
  const clamped = Math.max(0, Math.min(index, rows.length));
  const cells: Record<string, { text: string; align: 'left' }> = {};
  for (const col of columns) {
    cells[col.id] = { text: '', align: 'left' };
  }
  rows.splice(clamped, 0, { id: createRowId(), cells });
  tableData.rows = rows;
  if (Array.isArray(tableData.mergeRegions) && tableData.mergeRegions.length > 0) {
    tableData.mergeRegions = adjustMergesAfterRowMutation(tableData.mergeRegions, 'insert', clamped);
  }
  return tableData;
}

/**
 * Pure structural helper: deletes body row at `index` (enforces min 1 row),
 * prunes orphan rowStyles/cellStyles for that rowId, and safely updates merges.
 */
export function deleteRow(tableData: Record<string, any>, index: number): boolean {
  const rows = Array.isArray(tableData.rows) ? tableData.rows : [];
  if (rows.length <= 1 || index < 0 || index >= rows.length) return false;
  const removed = rows[index];
  const removedId = removed && removed.id ? String(removed.id) : null;

  // Before removing row, if a merge originated on this row and shrinks downward into index+1,
  // preserve origin cell content if index+1 was empty so user doesn't unexpectedly lose origin text.
  if (Array.isArray(tableData.mergeRegions) && rows[index + 1]) {
    const columns = Array.isArray(tableData.columns) ? tableData.columns : [];
    for (const m of tableData.mergeRegions) {
      if (normSection(m.section) === 'body' && m.rowStart === index && m.rowSpan > 1) {
        const col = columns[m.columnStart];
        if (col && removed?.cells?.[col.id] && rows[index + 1]?.cells) {
          const nextCell = rows[index + 1].cells[col.id];
          const nextText = typeof nextCell === 'string' ? nextCell.trim() : (nextCell?.text || '').trim();
          if (!nextText) {
            rows[index + 1].cells[col.id] = JSON.parse(JSON.stringify(removed.cells[col.id]));
          }
        }
      }
    }
  }

  rows.splice(index, 1);
  tableData.rows = rows;

  if (Array.isArray(tableData.mergeRegions) && tableData.mergeRegions.length > 0) {
    const nextMerges = adjustMergesAfterRowMutation(tableData.mergeRegions, 'delete', index);
    if (nextMerges.length > 0) tableData.mergeRegions = nextMerges;
    else delete tableData.mergeRegions;
  }

  if (removedId) {
    if (tableData.rowStyles && typeof tableData.rowStyles === 'object') {
      delete tableData.rowStyles[removedId];
      if (Object.keys(tableData.rowStyles).length === 0) delete tableData.rowStyles;
    }
    if (tableData.cellStyles && typeof tableData.cellStyles === 'object') {
      const prefix = `${removedId}:`;
      for (const k of Object.keys(tableData.cellStyles)) {
        if (k.startsWith(prefix)) delete tableData.cellStyles[k];
      }
      if (Object.keys(tableData.cellStyles).length === 0) delete tableData.cellStyles;
    }
  }
  return true;
}

/**
 * Pure structural helper: inserts a new column at `index` and updates merges cleanly.
 */
export function insertColumn(
  tableData: Record<string, any>,
  index: number,
  createColId: () => string,
  labelText?: string
): Record<string, any> {
  const columns = Array.isArray(tableData.columns) ? tableData.columns.slice() : [];
  const rows = Array.isArray(tableData.rows) ? tableData.rows : [];
  const clamped = Math.max(0, Math.min(index, columns.length));
  const newColId = createColId();
  const label = labelText || `Column ${columns.length + 1}`;
  columns.splice(clamped, 0, { id: newColId, label: { text: label, align: 'left' } });
  tableData.columns = columns;

  for (const r of rows) {
    r.cells = r.cells || {};
    r.cells[newColId] = { text: '', align: 'left' };
  }

  if (Array.isArray(tableData.mergeRegions) && tableData.mergeRegions.length > 0) {
    tableData.mergeRegions = adjustMergesAfterColumnMutation(tableData.mergeRegions, 'insert', clamped);
  }
  return tableData;
}

/**
 * Pure structural helper: deletes column at `index` (enforces min 1 column),
 * prunes orphan colStyles/cellStyles for that colId, and safely updates merges.
 */
export function deleteColumn(tableData: Record<string, any>, index: number): boolean {
  const columns = Array.isArray(tableData.columns) ? tableData.columns : [];
  if (columns.length <= 1 || index < 0 || index >= columns.length) return false;
  const removed = columns[index];
  const removedId = removed && removed.id ? String(removed.id) : null;
  const nextCol = columns[index + 1];
  const rows = Array.isArray(tableData.rows) ? tableData.rows : [];

  // Preserve origin content if a horizontal merge starts on this deleted column and shrinks rightward
  if (Array.isArray(tableData.mergeRegions) && removedId && nextCol) {
    for (const m of tableData.mergeRegions) {
      if (m.columnStart === index && m.columnSpan > 1) {
        if (normSection(m.section) === 'body' && rows[m.rowStart]?.cells) {
          const rowCells = rows[m.rowStart].cells;
          const nextCell = rowCells[nextCol.id];
          const nextText = typeof nextCell === 'string' ? nextCell.trim() : (nextCell?.text || '').trim();
          if (!nextText && rowCells[removedId]) {
            rowCells[nextCol.id] = JSON.parse(JSON.stringify(rowCells[removedId]));
          }
        }
      }
    }
  }

  columns.splice(index, 1);
  tableData.columns = columns;

  if (removedId) {
    for (const r of rows) {
      if (r.cells) delete r.cells[removedId];
    }
    if (tableData.colStyles && typeof tableData.colStyles === 'object') {
      delete tableData.colStyles[removedId];
      if (Object.keys(tableData.colStyles).length === 0) delete tableData.colStyles;
    }
    if (tableData.cellStyles && typeof tableData.cellStyles === 'object') {
      const suffix = `:${removedId}`;
      for (const k of Object.keys(tableData.cellStyles)) {
        if (k.endsWith(suffix)) delete tableData.cellStyles[k];
      }
      if (Object.keys(tableData.cellStyles).length === 0) delete tableData.cellStyles;
    }
  }

  if (Array.isArray(tableData.mergeRegions) && tableData.mergeRegions.length > 0) {
    const nextMerges = adjustMergesAfterColumnMutation(tableData.mergeRegions, 'delete', index);
    if (nextMerges.length > 0) tableData.mergeRegions = nextMerges;
    else delete tableData.mergeRegions;
  }
  return true;
}

/**
 * Sanitizes mergeRegions against current (rowCount, colCount), dropping any
 * invalid, out-of-bounds, or overlapping regions without throwing.
 */
export function sanitizeMergeRegions(
  rawMerges: unknown,
  rowCount: number,
  colCount: number
): MergeRegion[] {
  if (!Array.isArray(rawMerges) || rawMerges.length === 0) return [];
  const valid: MergeRegion[] = [];
  for (const raw of rawMerges) {
    const res = validateMergeRegion(raw as MergeRegion, rowCount, colCount, valid);
    if (res.valid && res.normalized) {
      valid.push(res.normalized);
    }
  }
  return valid;
}
