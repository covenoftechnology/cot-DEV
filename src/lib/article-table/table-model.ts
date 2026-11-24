/**
 * COVEN OF TECHNOLOGY — CANONICAL TECHNICAL TABLE MODEL & STYLE RESOLUTION
 *
 * Shared by Article Studio and Article Reader so cell extraction, legacy table
 * compatibility, merge sanitization, and style precedence are 100% unified.
 */

import type { MergeRegion, TableSectionKind } from './table-merges';
import { sanitizeMergeRegions } from './table-merges';
import type { SemanticCellStyle, TableStyleConfig } from './table-styles';
import { resolveTableStyle, sanitizeSemanticCellStyle } from './table-styles';

export interface TableRichText {
  text: string;
  align: 'left' | 'center' | 'right';
}

export interface TableColumn {
  id: string;
  label: TableRichText;
}

export interface TableRow {
  id: string;
  cells: Record<string, TableRichText>;
}

export interface CanonicalTableData {
  columns: TableColumn[];
  rows: TableRow[];
  tableStyle?: TableStyleConfig;
  mergeRegions?: MergeRegion[];
  rowStyles?: Record<string, SemanticCellStyle>;
  colStyles?: Record<string, SemanticCellStyle>;
  cellStyles?: Record<string, SemanticCellStyle>;
}

export function unwrapTableRichText(val: unknown): TableRichText {
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const rawText =
      typeof obj.text === 'string'
        ? obj.text
        : typeof obj.content === 'string'
          ? obj.content
          : '';
    const align = obj.align === 'center' || obj.align === 'right' ? obj.align : 'left';
    return { text: rawText, align };
  }
  return {
    text: typeof val === 'string' ? val : '',
    align: 'left',
  };
}

/**
 * Resolves canonical cell style with strict deterministic precedence:
 * 1. Table Preset + Table Options (applied via CSS classes on <table>)
 * 2. Column Override (`colStyles[colId]`)
 * 3. Row Override (`rowStyles[rowKey]`, where header uses 'header')
 * 4. Cell Override (`cellStyles[`${rowKey}:${colId}`]` or fallback `${rowIndex}:${colIndex}`)
 */
export function resolveEffectiveCellStyle(
  tableData: Record<string, any> | null | undefined,
  section: TableSectionKind,
  rowIndex: number,
  colIndex: number,
  rowId: string,
  colId: string
): SemanticCellStyle {
  const out: SemanticCellStyle = {};
  if (!tableData || typeof tableData !== 'object') return out;

  const rowKey = section === 'header' ? 'header' : rowId;

  const colOverride =
    tableData.colStyles && typeof tableData.colStyles === 'object'
      ? sanitizeSemanticCellStyle(tableData.colStyles[colId])
      : null;

  const rowOverride =
    tableData.rowStyles && typeof tableData.rowStyles === 'object'
      ? sanitizeSemanticCellStyle(tableData.rowStyles[rowKey])
      : null;

  const cellStylesMap =
    tableData.cellStyles && typeof tableData.cellStyles === 'object'
      ? (tableData.cellStyles as Record<string, unknown>)
      : null;

  const cellOverride = cellStylesMap
    ? sanitizeSemanticCellStyle(
        cellStylesMap[`${rowKey}:${colId}`] ??
          (section === 'body' ? cellStylesMap[`${rowIndex}:${colIndex}`] : undefined)
      )
    : null;

  // Apply in exact precedence order: col -> row -> cell
  for (const layer of [colOverride, rowOverride, cellOverride]) {
    if (!layer) continue;
    if (layer.background) out.background = layer.background;
    if (layer.textColor) out.textColor = layer.textColor;
    if (layer.align) out.align = layer.align;
  }

  return out;
}

/**
 * Normalizes a Technical Table block's `data` object in place while keeping
 * full backward compatibility with legacy `{ headers, rows }` tables and
 * pruning empty/invalid optional presentation metadata.
 */
export function normalizeTableBlockData(
  d: Record<string, any>,
  createId: (prefix: string) => string
): Record<string, any> {
  if (!d || typeof d !== 'object') return d;

  if (!Array.isArray(d.columns) || d.columns.length === 0) {
    if (Array.isArray(d.headers) && d.headers.length > 0) {
      d.columns = d.headers.map((h: unknown, idx: number) => ({
        id: `col_${idx}`,
        label: unwrapTableRichText(h),
      }));
      if (Array.isArray(d.rows)) {
        d.rows = d.rows.map((r: any) => {
          const cells: Record<string, TableRichText> = {};
          d.columns.forEach((c: TableColumn, cIdx: number) => {
            const rawCell =
              r && r.cells && r.cells[c.id] !== undefined
                ? r.cells[c.id]
                : r && r[`col${cIdx + 1}`] !== undefined
                  ? r[`col${cIdx + 1}`]
                  : Array.isArray(r)
                    ? r[cIdx]
                    : '';
            cells[c.id] = unwrapTableRichText(rawCell);
          });
          return { id: (r && r.id) || createId('row'), cells };
        });
      } else {
        d.rows = [];
      }
    } else {
      d.columns = [
        { id: 'col_1', label: unwrapTableRichText('Column 1') },
        { id: 'col_2', label: unwrapTableRichText('Column 2') },
        { id: 'col_3', label: unwrapTableRichText('Column 3') },
      ];
      d.rows = [
        {
          id: createId('row'),
          cells: {
            col_1: unwrapTableRichText(''),
            col_2: unwrapTableRichText(''),
            col_3: unwrapTableRichText(''),
          },
        },
        {
          id: createId('row'),
          cells: {
            col_1: unwrapTableRichText(''),
            col_2: unwrapTableRichText(''),
            col_3: unwrapTableRichText(''),
          },
        },
      ];
    }
  } else {
    d.columns = d.columns.map((c: any, idx: number) => ({
      id: (c && c.id) || `col_${idx + 1}`,
      label: unwrapTableRichText(c ? c.label : ''),
    }));
    if (!Array.isArray(d.rows) || d.rows.length === 0) {
      const cells: Record<string, TableRichText> = {};
      d.columns.forEach((c: TableColumn) => {
        cells[c.id] = unwrapTableRichText('');
      });
      d.rows = [{ id: createId('row'), cells }];
    } else {
      d.rows = d.rows.map((r: any) => {
        const existingCells = (r && r.cells && typeof r.cells === 'object') ? r.cells : {};
        const cells: Record<string, TableRichText> = {};
        d.columns.forEach((c: TableColumn, cIdx: number) => {
          const rawCell =
            existingCells[c.id] !== undefined
              ? existingCells[c.id]
              : r && r[`col${cIdx + 1}`] !== undefined
                ? r[`col${cIdx + 1}`]
                : Array.isArray(r)
                  ? r[cIdx]
                  : '';
          cells[c.id] = unwrapTableRichText(rawCell);
        });
        return { id: (r && r.id) || createId('row'), cells };
      });
    }
  }

  // Normalize optional mergeRegions without injecting if absent/empty
  if (Array.isArray(d.mergeRegions)) {
    const cleanMerges = sanitizeMergeRegions(d.mergeRegions, d.rows.length, d.columns.length);
    if (cleanMerges.length > 0) d.mergeRegions = cleanMerges;
    else delete d.mergeRegions;
  }

  // Normalize optional tableStyle without injecting if absent
  if (d.tableStyle && typeof d.tableStyle === 'object') {
    d.tableStyle = resolveTableStyle(d.tableStyle);
  }

  // Clean optional rowStyles / colStyles / cellStyles
  for (const mapKey of ['rowStyles', 'colStyles', 'cellStyles'] as const) {
    if (d[mapKey] && typeof d[mapKey] === 'object') {
      const cleaned: Record<string, SemanticCellStyle> = {};
      for (const [k, v] of Object.entries(d[mapKey])) {
        const sv = sanitizeSemanticCellStyle(v);
        if (sv) cleaned[k] = sv;
      }
      if (Object.keys(cleaned).length > 0) d[mapKey] = cleaned;
      else delete d[mapKey];
    }
  }

  return d;
}

/**
 * Helper to extract canonical columns, rows, resolved tableStyle, and sanitized merges
 * for Reader rendering (works identically for legacy and V2 tables).
 */
export function resolveTableForReader(d: Record<string, any>): {
  columns: TableColumn[];
  rows: TableRow[];
  tableStyle: TableStyleConfig;
  mergeRegions: MergeRegion[];
} {
  const hasStructuredCols = Array.isArray(d.columns) && d.columns.length > 0;
  const columns: TableColumn[] = hasStructuredCols
    ? d.columns.map((c: any, i: number) => ({
        id: (c && c.id) || `col_${i}`,
        label: unwrapTableRichText(c ? c.label : ''),
      }))
    : Array.isArray(d.headers)
      ? d.headers.map((h: any, i: number) => ({
          id: `col_${i}`,
          label: unwrapTableRichText(h),
        }))
      : [];

  const rawRows = Array.isArray(d.rows) ? d.rows : [];
  const rows: TableRow[] = rawRows.map((row: any, rIdx: number) => {
    const cells: Record<string, TableRichText> = {};
    columns.forEach((col, cIdx) => {
      let cellVal: unknown = '';
      if (row && row.cells && row.cells[col.id] !== undefined) {
        cellVal = row.cells[col.id];
      } else if (row && row[`col${cIdx + 1}`] !== undefined) {
        cellVal = row[`col${cIdx + 1}`];
      } else if (Array.isArray(row)) {
        cellVal = row[cIdx] || '';
      }
      cells[col.id] = unwrapTableRichText(cellVal);
    });
    return {
      id: (row && row.id) || `row_${rIdx}`,
      cells,
    };
  });

  const tableStyle = resolveTableStyle(d.tableStyle);
  const mergeRegions = sanitizeMergeRegions(d.mergeRegions, rows.length, columns.length);

  return { columns, rows, tableStyle, mergeRegions };
}
