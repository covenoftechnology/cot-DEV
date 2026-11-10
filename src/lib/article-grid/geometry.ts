/**
 * COVEN ARTICLE SYSTEM — CANONICAL 4-COLUMN GRID COMPOSER V2 GEOMETRY & NORMALIZATION
 * Single canonical utility layer for:
 * - Section capability detection (`hasVisualGrid`, `isGridSection`, `isLegacySection`)
 * - 4-column spatial mathematics, collision detection, and runaway row protection (`MAX_GRID_ROWS = 200`)
 * - Shared geometry validation (`validateSectionGridGeometry`, `validateDocumentGridGeometry`)
 * - Non-destructive canonical normalization (`normalizeCanonicalSection`, `normalizeCanonicalDocument`)
 * - Asset URL classification (`isManagedDraftUploadUrl` vs `isExternalResourceUrl`)
 */
import type {
  ArticleBlock,
  ArticleDocument,
  ArticleSection,
  GridLayoutItem,
  GridRect,
  GridVerticalAlign,
  VisualGrid,
} from '../../types/article-document';
import { isRegisteredBlockType } from '../article-block-registry';
import { validateEmbedBlockData } from './embed';
import type { GridGeometryValidationResult, PlacementResolution } from './types';

export const DEFAULT_GRID_COLUMNS = 4;
export const MIN_GRID_ROWS = 3;
export const MAX_GRID_ROWS = 200;
export const DEFAULT_COLUMN_GAP = 16;
export const DEFAULT_ROW_GAP = 16;
export const DEFAULT_MIN_ROW_HEIGHT = 80;
export const DEFAULT_VERTICAL_ALIGN: GridVerticalAlign = 'start';
export const MANAGED_DRAFT_UPLOAD_PREFIX = '/__article-studio/uploads/';

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Resolve vertical alignment to canonical `'start' | 'center' | 'end'`.
 * Absent or unrecognized values default to `'start'`.
 */
export function resolveGridVerticalAlign(align: unknown): GridVerticalAlign {
  if (align === 'center') return 'center';
  if (align === 'end') return 'end';
  return 'start';
}

/**
 * Compute the exclusive column end of a grid item or rect (columnStart + columnSpan).
 */
export function getItemColumnEnd(item: GridRect): number {
  const colStart = item.columnStart || 1;
  const colSpan = item.columnSpan || 1;
  return colStart + colSpan;
}

/**
 * Compute the exclusive row end of a grid item or rect (rowStart + rowSpan).
 */
export function getItemRowEnd(item: GridRect): number {
  const rowStart = item.rowStart || 1;
  const rowSpan = item.rowSpan || 1;
  return rowStart + rowSpan;
}

function isValidBlockObject(block: unknown): block is ArticleBlock {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    b.id.trim().length > 0 &&
    typeof b.type === 'string' &&
    b.type.trim().length > 0 &&
    Boolean(b.data && typeof b.data === 'object')
  );
}

/**
 * Canonical predicate for determining whether a section is Grid-backed.
 * Returns `true` when `section.visualGrid.layoutItems` is an array either:
 * - containing at least one valid placed `ArticleBlock`, or
 * - initialized as an empty Grid section (`layoutItems: []`) with no legacy `blocks[]` items.
 * Never classifies a legacy section with `blocks[]` as Grid merely because an empty object exists.
 */
export function hasVisualGrid(section: unknown): boolean {
  if (!section || typeof section !== 'object') return false;
  const sec = section as Record<string, unknown>;
  if (!sec.visualGrid || typeof sec.visualGrid !== 'object') return false;
  const vg = sec.visualGrid as Record<string, unknown>;
  if (!Array.isArray(vg.layoutItems)) return false;
  if (vg.layoutItems.length === 0) {
    const hasLegacyBlocks = Array.isArray(sec.blocks) && sec.blocks.length > 0;
    return !hasLegacyBlocks;
  }
  return vg.layoutItems.some(
    (item: unknown) =>
      Boolean(item && typeof item === 'object' && isValidBlockObject((item as Record<string, unknown>).block))
  );
}

export const isGridSection = hasVisualGrid;

/**
 * Returns `true` when a section is a canonical legacy block-list section
 * (not Grid-backed, with a `blocks` array).
 */
export function isLegacySection(section: unknown): boolean {
  if (!section || typeof section !== 'object') return false;
  if (hasVisualGrid(section)) return false;
  return Array.isArray((section as Record<string, unknown>).blocks);
}

/**
 * Returns `true` when a section contains BOTH non-empty legacy `blocks[]`
 * AND non-empty `visualGrid.layoutItems[]`.
 * Such dual-content sections are architecturally ambiguous and must be rejected on Publish.
 */
export function isAmbiguousSection(section: unknown): boolean {
  if (!section || typeof section !== 'object') return false;
  const sec = section as Record<string, unknown>;
  const hasLegacyBlocks = Array.isArray(sec.blocks) && sec.blocks.length > 0;
  if (!hasLegacyBlocks) return false;
  if (!sec.visualGrid || typeof sec.visualGrid !== 'object') return false;
  const vg = sec.visualGrid as Record<string, unknown>;
  return Array.isArray(vg.layoutItems) && vg.layoutItems.length > 0;
}

/**
 * Standard CSS Grid rectangle overlap test.
 * Two rectangles overlap if they intersect on both column and row axes.
 */
export function rectsOverlap(r1: GridRect, r2: GridRect): boolean {
  const r1ColStart = r1.columnStart || 1;
  const r1ColSpan = r1.columnSpan || Math.max(1, (r1.columnEnd || r1ColStart + 1) - r1ColStart);
  const r1ColEnd = r1ColStart + r1ColSpan;

  const r1RowStart = r1.rowStart || 1;
  const r1RowSpan = r1.rowSpan || Math.max(1, (r1.rowEnd || r1RowStart + 1) - r1RowStart);
  const r1RowEnd = r1RowStart + r1RowSpan;

  const r2ColStart = r2.columnStart || 1;
  const r2ColSpan = r2.columnSpan || Math.max(1, (r2.columnEnd || r2ColStart + 1) - r2ColStart);
  const r2ColEnd = r2ColStart + r2ColSpan;

  const r2RowStart = r2.rowStart || 1;
  const r2RowSpan = r2.rowSpan || Math.max(1, (r2.rowEnd || r2RowStart + 1) - r2RowStart);
  const r2RowEnd = r2RowStart + r2RowSpan;

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
    if (excludeId && item.id === excludeId) continue;
    if (rectsOverlap(item, candidate)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the first unoccupied space on the 4-column grid that fits the requested span.
 * Defensively clamped to `MAX_GRID_ROWS`.
 */
export function findFirstAvailablePlacement(
  items: GridLayoutItem[],
  currentRows: number,
  preferredColSpan = 4,
  preferredRowSpan = 1
): { columnStart: number; columnSpan: number; rowStart: number; rowSpan: number; requiredRows: number } {
  const span = clamp(preferredColSpan || 4, 1, DEFAULT_GRID_COLUMNS);
  const rSpan = clamp(preferredRowSpan || 1, 1, MAX_GRID_ROWS);
  const rows = clamp(currentRows || MIN_GRID_ROWS, MIN_GRID_ROWS, MAX_GRID_ROWS);

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= DEFAULT_GRID_COLUMNS - span + 1; c++) {
      const candidate: GridRect = {
        columnStart: c,
        columnSpan: span,
        columnEnd: c + span,
        rowStart: r,
        rowSpan: rSpan,
        rowEnd: r + rSpan,
      };
      if (!checkCollision(items, null, candidate)) {
        return {
          columnStart: c,
          columnSpan: span,
          rowStart: r,
          rowSpan: rSpan,
          requiredRows: Math.min(MAX_GRID_ROWS, Math.max(rows, r + rSpan - 1)),
        };
      }
    }
  }

  const newRow = Math.min(MAX_GRID_ROWS, rows + 1);
  return {
    columnStart: 1,
    columnSpan: span,
    rowStart: newRow,
    rowSpan: rSpan,
    requiredRows: Math.min(MAX_GRID_ROWS, newRow + rSpan - 1),
  };
}

export function getSpanPercentageLabel(colSpan: number): string {
  const span = clamp(colSpan, 1, DEFAULT_GRID_COLUMNS);
  switch (span) {
    case 1:
      return '25%';
    case 2:
      return '50%';
    case 3:
      return '75%';
    case 4:
      return '100%';
    default:
      return `${span * 25}%`;
  }
}

export function resolvePlacementTarget(
  items: GridLayoutItem[],
  targetCol: number,
  targetRow: number,
  requestedSpan = 4,
  explicitWidth = false,
  excludeItemId: string | null = null
): PlacementResolution {
  const col = clamp(targetCol, 1, DEFAULT_GRID_COLUMNS);
  const row = clamp(targetRow, 1, MAX_GRID_ROWS);
  const reqSpan = clamp(requestedSpan || 4, 1, DEFAULT_GRID_COLUMNS);

  let contiguousFree = 0;
  for (let c = col; c <= DEFAULT_GRID_COLUMNS; c++) {
    const singleCell: GridRect = {
      columnStart: c,
      columnSpan: 1,
      columnEnd: c + 1,
      rowStart: row,
      rowSpan: 1,
      rowEnd: row + 1,
    };
    if (checkCollision(items, excludeItemId, singleCell)) {
      break;
    }
    contiguousFree++;
  }

  if (contiguousFree === 0) {
    return {
      valid: false,
      columnStart: col,
      columnSpan: reqSpan,
      rowStart: row,
      rowSpan: 1,
      contiguousFree: 0,
      autoFitApplied: false,
      reason: 'Space Occupied',
    };
  }

  if (explicitWidth) {
    if (contiguousFree >= reqSpan) {
      return {
        valid: true,
        columnStart: col,
        columnSpan: reqSpan,
        rowStart: row,
        rowSpan: 1,
        contiguousFree,
        autoFitApplied: false,
      };
    }
    return {
      valid: false,
      columnStart: col,
      columnSpan: reqSpan,
      rowStart: row,
      rowSpan: 1,
      contiguousFree,
      autoFitApplied: false,
      reason: `Needs ${getSpanPercentageLabel(reqSpan)} · only ${getSpanPercentageLabel(contiguousFree)} available`,
    };
  }

  if (contiguousFree >= reqSpan) {
    return {
      valid: true,
      columnStart: col,
      columnSpan: reqSpan,
      rowStart: row,
      rowSpan: 1,
      contiguousFree,
      autoFitApplied: false,
    };
  }

  return {
    valid: true,
    columnStart: col,
    columnSpan: contiguousFree,
    rowStart: row,
    rowSpan: 1,
    contiguousFree,
    autoFitApplied: true,
    reason: `${getSpanPercentageLabel(contiguousFree)} · Auto-fit`,
  };
}

export function getCellFromPointer(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number; width: number },
  minRowHeight = DEFAULT_MIN_ROW_HEIGHT,
  rowGap = DEFAULT_ROW_GAP,
  columnGap = DEFAULT_COLUMN_GAP,
  padding = 16
): { col: number; row: number } {
  const innerW = Math.max(1, canvasRect.width - 2 * padding);
  const colTrackSize = (innerW - 3 * columnGap) / DEFAULT_GRID_COLUMNS + columnGap;
  const rowTrackSize = Math.max(40, minRowHeight + rowGap);

  const relX = clientX - (canvasRect.left + padding);
  const relY = clientY - (canvasRect.top + padding);

  const col = Math.floor(relX / colTrackSize) + 1;
  const row = Math.floor(relY / rowTrackSize) + 1;

  return {
    col: clamp(col, 1, DEFAULT_GRID_COLUMNS),
    row: clamp(row, 1, MAX_GRID_ROWS),
  };
}

/**
 * Shared canonical Grid geometry validator for a single section.
 * - Legacy sections (`!section.visualGrid`) are valid without any Grid properties.
 * - Grid sections must satisfy 4-column bounds (`1..4`), `1..MAX_GRID_ROWS` (`200`),
 *   valid `verticalAlign` (`start | center | end`), valid `block` payload, and zero item collisions.
 */
export function validateSectionGridGeometry(
  section: unknown,
  sectionIndex = 0
): GridGeometryValidationResult {
  if (!section || typeof section !== 'object') {
    return { valid: false, error: `Section ${sectionIndex + 1} is not a valid object.` };
  }
  const sec = section as Record<string, any>;
  const secLabel = sec.id || `Section ${sectionIndex + 1}`;

  if (isAmbiguousSection(sec)) {
    return {
      valid: false,
      sectionId: sec.id,
      error: `${secLabel}: Ambiguous section contains both legacy blocks[] and visualGrid.layoutItems[].`,
    };
  }

  if (!sec.visualGrid) {
    return { valid: true, sectionId: sec.id };
  }

  if (typeof sec.visualGrid !== 'object') {
    return { valid: false, sectionId: sec.id, error: `${secLabel}: visualGrid must be an object.` };
  }

  const vg = sec.visualGrid as Record<string, any>;

  if (vg.columns !== undefined && vg.columns !== DEFAULT_GRID_COLUMNS) {
    return {
      valid: false,
      sectionId: sec.id,
      error: `${secLabel}: visualGrid.columns must be ${DEFAULT_GRID_COLUMNS} (received ${vg.columns}).`,
    };
  }

  if (vg.rows !== undefined) {
    if (
      typeof vg.rows !== 'number' ||
      !Number.isInteger(vg.rows) ||
      vg.rows < 1 ||
      vg.rows > MAX_GRID_ROWS
    ) {
      return {
        valid: false,
        sectionId: sec.id,
        error: `${secLabel}: visualGrid.rows must be an integer between 1 and ${MAX_GRID_ROWS} (received ${vg.rows}).`,
      };
    }
  }

  if (!Array.isArray(vg.layoutItems)) {
    return {
      valid: false,
      sectionId: sec.id,
      error: `${secLabel}: visualGrid.layoutItems must be an array.`,
    };
  }

  const validatedRects: Array<GridRect & { id: string }> = [];
  const seenItemIds = new Set<string>();
  const seenBlockIds = new Set<string>();

  for (let i = 0; i < vg.layoutItems.length; i++) {
    const item = vg.layoutItems[i];
    if (!item || typeof item !== 'object') {
      return {
        valid: false,
        sectionId: sec.id,
        error: `${secLabel}: layoutItems[${i}] must be an object.`,
      };
    }

    if (typeof item.id !== 'string' || !item.id.trim()) {
      return {
        valid: false,
        sectionId: sec.id,
        error: `${secLabel}: layoutItems[${i}] is missing a required string id.`,
      };
    }

    const itemId = item.id.trim();
    if (seenItemIds.has(itemId)) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel}: Duplicate Grid item ID "${itemId}".`,
      };
    }
    seenItemIds.add(itemId);

    if (!isValidBlockObject(item.block)) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): Grid item is missing a valid ArticleBlock (id, type, data).`,
      };
    }

    if (!isRegisteredBlockType(item.block.type)) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): Unknown or unsupported Block type "${item.block.type}".`,
      };
    }

    if (seenBlockIds.has(item.block.id)) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): Duplicate Block ID "${item.block.id}" inside Grid section.`,
      };
    }
    seenBlockIds.add(item.block.id);

    const colStart = item.columnStart;
    const colSpan = item.columnSpan;
    const rowStart = item.rowStart;
    const rowSpan = item.rowSpan !== undefined ? item.rowSpan : 1;

    if (
      typeof colStart !== 'number' ||
      !Number.isInteger(colStart) ||
      colStart < 1 ||
      colStart > DEFAULT_GRID_COLUMNS
    ) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): columnStart must be an integer in 1..${DEFAULT_GRID_COLUMNS} (received ${colStart}).`,
      };
    }

    if (
      typeof colSpan !== 'number' ||
      !Number.isInteger(colSpan) ||
      colSpan < 1 ||
      colSpan > DEFAULT_GRID_COLUMNS
    ) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): columnSpan must be an integer in 1..${DEFAULT_GRID_COLUMNS} (received ${colSpan}).`,
      };
    }

    if (colStart + colSpan - 1 > DEFAULT_GRID_COLUMNS) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): columnStart (${colStart}) + columnSpan (${colSpan}) - 1 exceeds ${DEFAULT_GRID_COLUMNS} columns.`,
      };
    }

    if (
      typeof rowStart !== 'number' ||
      !Number.isInteger(rowStart) ||
      rowStart < 1 ||
      rowStart > MAX_GRID_ROWS
    ) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): rowStart must be an integer in 1..${MAX_GRID_ROWS} (received ${rowStart}).`,
      };
    }

    if (
      typeof rowSpan !== 'number' ||
      !Number.isInteger(rowSpan) ||
      rowSpan < 1 ||
      rowSpan > MAX_GRID_ROWS ||
      rowStart + rowSpan - 1 > MAX_GRID_ROWS
    ) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): rowSpan (${rowSpan}) at rowStart (${rowStart}) exceeds MAX_GRID_ROWS (${MAX_GRID_ROWS}).`,
      };
    }

    if (
      item.verticalAlign !== undefined &&
      item.verticalAlign !== 'start' &&
      item.verticalAlign !== 'center' &&
      item.verticalAlign !== 'end'
    ) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): verticalAlign must be 'start', 'center', or 'end' (received ${item.verticalAlign}).`,
      };
    }

    const rect: GridRect & { id: string } = {
      id: itemId,
      columnStart: colStart,
      columnSpan: colSpan,
      columnEnd: colStart + colSpan,
      rowStart,
      rowSpan,
      rowEnd: rowStart + rowSpan,
    };

    for (const prev of validatedRects) {
      if (rectsOverlap(prev, rect)) {
        return {
          valid: false,
          sectionId: sec.id,
          itemId,
          error: `${secLabel}: Grid item '${itemId}' overlaps with '${prev.id}'.`,
        };
      }
    }

    validatedRects.push(rect);
  }

  return { valid: true, sectionId: sec.id };
}

/**
 * Shared canonical Grid geometry validator for an entire `ArticleDocument`.
 */
export function validateDocumentGridGeometry(doc: unknown): GridGeometryValidationResult {
  if (!doc || typeof doc !== 'object') {
    return { valid: false, error: 'Document is not a valid object.' };
  }
  const d = doc as Record<string, any>;
  if (!Array.isArray(d.sections)) {
    return { valid: false, error: 'Document sections must be an array.' };
  }
  for (let i = 0; i < d.sections.length; i++) {
    const res = validateSectionGridGeometry(d.sections[i], i);
    if (!res.valid) return res;
  }
  return { valid: true };
}

/**
 * Normalizes section rows in-place on a `VisualGrid` object to fit placed items
 * without accumulating trailing empty rows, clamped to `MIN_GRID_ROWS..MAX_GRID_ROWS`.
 */
export function normalizeSectionRows(section: { visualGrid?: VisualGrid } | null | undefined): void {
  if (!section || !section.visualGrid || !Array.isArray(section.visualGrid.layoutItems)) return;
  const vg = section.visualGrid;
  const highestRow = vg.layoutItems.reduce((max: number, it: GridLayoutItem) => {
    const rStart = clamp(Number(it.rowStart) || 1, 1, MAX_GRID_ROWS);
    const rSpan = clamp(Number(it.rowSpan) || 1, 1, MAX_GRID_ROWS - rStart + 1);
    return Math.max(max, rStart + rSpan - 1);
  }, 0);
  const targetRows = Math.max(MIN_GRID_ROWS, highestRow + 1);
  vg.rows = clamp(targetRows, MIN_GRID_ROWS, MAX_GRID_ROWS);
}

/**
 * Non-destructive canonical section normalization:
 * - Legacy sections (`!hasVisualGrid(section)`):
 *   Preserves `id`, `title`, `kicker`, `heading`, and `blocks` untouched.
 *   Never adds `visualGrid`, and never migrates `section.blocks` into `visualGrid.layoutItems`.
 * - Grid sections (`hasVisualGrid(section)`):
 *   Preserves block IDs, block data, and item IDs; resolves absent `verticalAlign` to `'start'`;
 *   clamps geometry and runaway row counts to `MAX_GRID_ROWS` (`200`);
 *   strips transient Studio state (`slots`, `layout`, `isFocused`, `previewRect`, etc.).
 */
export function normalizeCanonicalSection(section: unknown, fallbackIndex = 0): ArticleSection {
  const raw = (section && typeof section === 'object' ? section : {}) as Record<string, any>;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `section_${fallbackIndex + 1}`;
  const title = typeof raw.title === 'string' ? raw.title : '';
  const clonedBlocks: ArticleBlock[] = Array.isArray(raw.blocks)
    ? JSON.parse(JSON.stringify(raw.blocks))
    : [];

  const normalized: ArticleSection = {
    id,
    title,
    ...(raw.kicker !== undefined ? { kicker: raw.kicker } : {}),
    ...(raw.heading !== undefined ? { heading: raw.heading } : {}),
    blocks: clonedBlocks,
  };

  if (!hasVisualGrid(raw)) {
    return normalized;
  }

  // Grid section owns composition: never duplicate placed blocks into section.blocks[]
  normalized.blocks = [];

  const rawVg = raw.visualGrid as Record<string, any>;
  const normalizedItems: GridLayoutItem[] = [];
  const usedItemIds = new Set<string>();
  const usedBlockIds = new Set<string>();

  for (let i = 0; i < rawVg.layoutItems.length; i++) {
    const it = rawVg.layoutItems[i];
    if (!it || typeof it !== 'object' || !isValidBlockObject(it.block)) continue;

    const colSpan = clamp(Math.round(Number(it.columnSpan) || 4), 1, DEFAULT_GRID_COLUMNS);
    const colStart = clamp(
      Math.round(Number(it.columnStart) || 1),
      1,
      DEFAULT_GRID_COLUMNS - colSpan + 1
    );
    const rowStart = clamp(Math.round(Number(it.rowStart) || 1), 1, MAX_GRID_ROWS);
    const rowSpan = clamp(
      Math.round(Number(it.rowSpan) || 1),
      1,
      MAX_GRID_ROWS - rowStart + 1
    );

    let blockId = it.block.id.trim();
    if (!blockId || usedBlockIds.has(blockId)) {
      blockId = `${blockId || 'blk'}_${i + 1}`;
    }
    usedBlockIds.add(blockId);

    const cleanBlock: ArticleBlock = {
      id: blockId,
      type: it.block.type,
      data: JSON.parse(JSON.stringify(it.block.data)),
    };

    let itemId = typeof it.id === 'string' && it.id.trim() ? it.id.trim() : `grid_item_${i + 1}`;
    if (usedItemIds.has(itemId)) {
      itemId = `${itemId}_${i + 1}`;
    }
    usedItemIds.add(itemId);

    const cleanItem: GridLayoutItem = {
      id: itemId,
      columnStart: colStart,
      columnSpan: colSpan,
      rowStart,
      rowSpan,
      verticalAlign: resolveGridVerticalAlign(it.verticalAlign),
      block: cleanBlock,
    };

    normalizedItems.push(cleanItem);
  }

  const highestRow = normalizedItems.reduce(
    (max, it) => Math.max(max, it.rowStart + it.rowSpan - 1),
    0
  );
  const rawRows = typeof rawVg.rows === 'number' && Number.isFinite(rawVg.rows) ? Math.round(rawVg.rows) : MIN_GRID_ROWS;
  const safeRows =
    rawRows > 50 && highestRow < 30
      ? Math.max(MIN_GRID_ROWS, highestRow + 1)
      : clamp(Math.max(MIN_GRID_ROWS, highestRow + 1, rawRows), MIN_GRID_ROWS, MAX_GRID_ROWS);

  const colGap =
    typeof rawVg.columnGap === 'number' && Number.isFinite(rawVg.columnGap) && rawVg.columnGap >= 0
      ? rawVg.columnGap
      : DEFAULT_COLUMN_GAP;
  const rowGap =
    typeof rawVg.rowGap === 'number' && Number.isFinite(rawVg.rowGap) && rawVg.rowGap >= 0
      ? rawVg.rowGap
      : DEFAULT_ROW_GAP;
  normalized.visualGrid = {
    columns: DEFAULT_GRID_COLUMNS,
    rows: safeRows,
    columnGap: colGap,
    rowGap,
    layoutItems: normalizedItems,
  };

  return normalized;
}

/**
 * Non-destructive canonical document normalization.
 * Preserves legacy sections untouched and normalizes Grid sections without cross-converting.
 */
export function normalizeCanonicalDocument(doc: unknown): ArticleDocument {
  if (!doc || typeof doc !== 'object') {
    throw new Error('[normalizeCanonicalDocument] Invalid document provided.');
  }
  const raw = doc as Record<string, any>;
  const clonedMeta = raw.meta && typeof raw.meta === 'object' ? JSON.parse(JSON.stringify(raw.meta)) : {};
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];

  return {
    version: 1,
    studioId: typeof raw.studioId === 'string' ? raw.studioId : '',
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    meta: clonedMeta,
    sections: rawSections.map((sec, idx) => normalizeCanonicalSection(sec, idx)),
    ...(typeof raw.sourceArticleSlug === 'string' ? { sourceArticleSlug: raw.sourceArticleSlug } : {}),
  };
}

/**
 * ONE PER-SECTION ACTIVE CONTENT RULE:
 * - If `hasVisualGrid(section)` is `true` -> active content is `section.visualGrid.layoutItems[].block`
 * - Else -> active content is `section.blocks[]`
 * Never concatenates both arrays and never double-processes blocks.
 */
export function getActiveSectionBlocks(section: unknown): ArticleBlock[] {
  if (!section || typeof section !== 'object') return [];
  const sec = section as Record<string, any>;

  if (hasVisualGrid(sec)) {
    const items = sec.visualGrid && Array.isArray(sec.visualGrid.layoutItems) ? sec.visualGrid.layoutItems : [];
    const result: ArticleBlock[] = [];
    for (const item of items) {
      if (item && typeof item === 'object' && isValidBlockObject(item.block)) {
        result.push(item.block);
      }
    }
    return result;
  }

  if (Array.isArray(sec.blocks)) {
    return sec.blocks.filter((blk: unknown): blk is ArticleBlock => isValidBlockObject(blk));
  }

  return [];
}

/**
 * Recursively traverses all active blocks in a section (including nested blocks
 * inside `callout.data.blocks` and `flex-layout.data.columns[].blocks`),
 * strictly obeying the one per-section active content rule (`hasVisualGrid(section)`).
 */
export function traverseActiveSectionBlocks(
  section: unknown,
  visitor: (
    block: ArticleBlock,
    ctx: { isGrid: boolean; itemId?: string; parentBlockId?: string }
  ) => void
): void {
  if (!section || typeof section !== 'object') return;
  const sec = section as Record<string, any>;
  const isGrid = hasVisualGrid(sec);

  function visitBlockRecursive(blk: ArticleBlock, itemId?: string, parentBlockId?: string) {
    visitor(blk, { isGrid, itemId, parentBlockId });
    const d = blk.data as Record<string, any>;
    if (!d || typeof d !== 'object') return;
    if (Array.isArray(d.blocks)) {
      for (const child of d.blocks) {
        if (isValidBlockObject(child)) {
          visitBlockRecursive(child, itemId, blk.id);
        }
      }
    }
    if (Array.isArray(d.columns)) {
      for (const col of d.columns) {
        if (col && typeof col === 'object' && Array.isArray(col.blocks)) {
          for (const child of col.blocks) {
            if (isValidBlockObject(child)) {
              visitBlockRecursive(child, itemId, blk.id);
            }
          }
        }
      }
    }
  }

  if (isGrid) {
    const items = sec.visualGrid && Array.isArray(sec.visualGrid.layoutItems) ? sec.visualGrid.layoutItems : [];
    for (const item of items) {
      if (item && typeof item === 'object' && isValidBlockObject(item.block)) {
        visitBlockRecursive(item.block, typeof item.id === 'string' ? item.id : undefined);
      }
    }
  } else if (Array.isArray(sec.blocks)) {
    for (const blk of sec.blocks) {
      if (isValidBlockObject(blk)) {
        visitBlockRecursive(blk);
      }
    }
  }
}

/**
 * Generic stored-block helper retained for backward compatibility with Phase 6.1 callers.
 * For all Publish, asset discovery, and active content operations, use `getActiveSectionBlocks`.
 */
export function getSectionBlocksForTraversal(section: unknown): ArticleBlock[] {
  return getActiveSectionBlocks(section);
}

export interface PublishValidationResult {
  valid: boolean;
  error?: string;
  sectionId?: string;
  itemId?: string;
  blockId?: string;
}

/**
 * Shared canonical Publish validator for both client preflight and server `POST /__article-studio/publish`.
 * Validates:
 * - Document shape & required metadata (`status`, `title`, `category`, `difficulty`, URL-safe `slug`, cover image alt)
 * - Non-empty `sections[]`
 * - Rejects ambiguous dual-content sections (`isAmbiguousSection`)
 * - Validates Grid geometry (`validateSectionGridGeometry`, `1..4` columns, `MAX_GRID_ROWS = 200`, zero collisions)
 * - Validates every active Block (legacy `section.blocks[]` or Grid `visualGrid.layoutItems[].block`):
 *   - Valid block structure (`id`, registered `type`, `data` object)
 *   - Unique IDs across sections, Grid items, and Blocks
 *   - Required image alt text (`src`/`imageSrc`, `image-grid` images, `carousel` cards)
 *   - `technical-table` minimum column requirement (`columns.length >= 1`)
 *   - `embed` mode & URL safety (`validateEmbedBlockData`)
 */
export function validateDocumentForPublish(
  doc: unknown,
  options: { requirePublishedStatus?: boolean } = {}
): PublishValidationResult {
  const requirePublishedStatus = options.requirePublishedStatus !== false;

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { valid: false, error: 'Document is not a valid object.' };
  }
  const d = doc as Record<string, any>;
  if (!d.meta || typeof d.meta !== 'object') {
    return { valid: false, error: 'Document metadata (meta) is required.' };
  }

  if (requirePublishedStatus && d.meta.status !== 'published') {
    return { valid: false, error: 'Document status must be set to "published" before publishing.' };
  }
  if (!d.meta.title || typeof d.meta.title !== 'string' || !d.meta.title.trim()) {
    return { valid: false, error: 'Title is required to publish.' };
  }
  if (!d.meta.category || typeof d.meta.category !== 'string' || !d.meta.category.trim()) {
    return { valid: false, error: 'Category is required to publish.' };
  }
  if (!d.meta.difficulty || typeof d.meta.difficulty !== 'string' || !d.meta.difficulty.trim()) {
    return { valid: false, error: 'Difficulty level is required to publish.' };
  }

  const slug = typeof d.slug === 'string' ? d.slug.trim() : '';
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || slug.startsWith('-') || slug.endsWith('-') || slug.includes('--')) {
    return {
      valid: false,
      error: 'Invalid URL slug. Must be lowercase alphanumeric characters with single hyphens.',
    };
  }

  if (d.meta.coverImageSrc && String(d.meta.coverImageSrc).trim()) {
    if (!d.meta.coverImageAlt || !String(d.meta.coverImageAlt).trim()) {
      return {
        valid: false,
        error: 'Cover image requires alt text for accessibility.',
      };
    }
  }

  if (!Array.isArray(d.sections) || d.sections.length === 0) {
    return { valid: false, error: 'Article must contain at least one section.' };
  }

  const seenSectionIds = new Set<string>();
  const seenGridItemIds = new Set<string>();
  const seenBlockIds = new Set<string>();

  for (let sIdx = 0; sIdx < d.sections.length; sIdx++) {
    const sec = d.sections[sIdx];
    const secNum = sIdx + 1;
    if (!sec || typeof sec !== 'object' || Array.isArray(sec)) {
      return { valid: false, error: `Section ${secNum}: Invalid section object.` };
    }
    const secId = typeof sec.id === 'string' && sec.id.trim() ? sec.id.trim() : '';
    const secTitle = typeof sec.title === 'string' && sec.title.trim() ? sec.title.trim() : `Section ${secNum}`;
    const secLabel = `Section ${secNum} ("${secTitle}")`;

    if (!secId) {
      return { valid: false, error: `${secLabel}: Section is missing a required id.` };
    }
    if (seenSectionIds.has(secId)) {
      return { valid: false, sectionId: secId, error: `${secLabel}: Duplicate section ID "${secId}".` };
    }
    seenSectionIds.add(secId);

    // 1. Ambiguous dual-content section check
    if (isAmbiguousSection(sec)) {
      return {
        valid: false,
        sectionId: secId,
        error: `${secLabel}: Ambiguous section contains both legacy blocks[] and visualGrid.layoutItems[]. A section cannot use both composition modes simultaneously.`,
      };
    }

    // 2. Grid geometry & raw Grid item check
    if (sec.visualGrid !== undefined) {
      const geoRes = validateSectionGridGeometry(sec, sIdx);
      if (!geoRes.valid) {
        return {
          valid: false,
          sectionId: secId,
          itemId: geoRes.itemId,
          error: geoRes.error || `${secLabel}: Invalid Grid geometry.`,
        };
      }
      for (const item of sec.visualGrid.layoutItems) {
        if (seenGridItemIds.has(item.id)) {
          return {
            valid: false,
            sectionId: secId,
            itemId: item.id,
            error: `${secLabel}: Duplicate Grid item ID "${item.id}" across document.`,
          };
        }
        seenGridItemIds.add(item.id);
      }
    } else {
      // Legacy section check: verify all raw elements in sec.blocks are valid block objects
      if (!Array.isArray(sec.blocks)) {
        return {
          valid: false,
          sectionId: secId,
          error: `${secLabel}: Legacy section blocks must be an array.`,
        };
      }
      for (let bIdx = 0; bIdx < sec.blocks.length; bIdx++) {
        const rawBlk = sec.blocks[bIdx];
        if (!isValidBlockObject(rawBlk)) {
          return {
            valid: false,
            sectionId: secId,
            error: `${secLabel}: Block #${bIdx + 1} is malformed (missing id, type, or data object).`,
          };
        }
        if (!isRegisteredBlockType(rawBlk.type)) {
          return {
            valid: false,
            sectionId: secId,
            blockId: rawBlk.id,
            error: `${secLabel}: Block "${rawBlk.id}" has unknown type "${rawBlk.type}".`,
          };
        }
      }
    }

    // 3. Active block content validation (strictly one active branch per section)
    let blockFailure: PublishValidationResult | null = null;
    traverseActiveSectionBlocks(sec, (blk, ctx) => {
      if (blockFailure) return;
      const blkContext = `${secLabel} — Block "${blk.id}" (${blk.type})`;

      if (!isRegisteredBlockType(blk.type)) {
        blockFailure = {
          valid: false,
          sectionId: secId,
          itemId: ctx.itemId,
          blockId: blk.id,
          error: `${blkContext}: Unknown or unsupported Block type "${blk.type}".`,
        };
        return;
      }

      if (seenBlockIds.has(blk.id)) {
        blockFailure = {
          valid: false,
          sectionId: secId,
          itemId: ctx.itemId,
          blockId: blk.id,
          error: `${blkContext}: Duplicate Block ID "${blk.id}".`,
        };
        return;
      }
      seenBlockIds.add(blk.id);

      const bData = blk.data as Record<string, any>;

      // Validate nested blocks in callout / flex-layout for malformed children
      if (Array.isArray(bData.blocks)) {
        for (let cIdx = 0; cIdx < bData.blocks.length; cIdx++) {
          if (!isValidBlockObject(bData.blocks[cIdx])) {
            blockFailure = {
              valid: false,
              sectionId: secId,
              itemId: ctx.itemId,
              blockId: blk.id,
              error: `${blkContext}: Nested block #${cIdx + 1} is malformed.`,
            };
            return;
          }
        }
      }
      if (Array.isArray(bData.columns) && blk.type === 'flex-layout') {
        for (const col of bData.columns) {
          if (col && Array.isArray(col.blocks)) {
            for (let cIdx = 0; cIdx < col.blocks.length; cIdx++) {
              if (!isValidBlockObject(col.blocks[cIdx])) {
                blockFailure = {
                  valid: false,
                  sectionId: secId,
                  itemId: ctx.itemId,
                  blockId: blk.id,
                  error: `${blkContext}: Nested column block #${cIdx + 1} is malformed.`,
                };
                return;
              }
            }
          }
        }
      }

      // Image alt text validation (applies equally to legacy and Grid blocks)
      const hasPrimaryImage =
        (typeof bData.src === 'string' && bData.src.trim().length > 0) ||
        (typeof bData.imageSrc === 'string' && bData.imageSrc.trim().length > 0);
      if (hasPrimaryImage && (!bData.alt || !String(bData.alt).trim())) {
        blockFailure = {
          valid: false,
          sectionId: secId,
          itemId: ctx.itemId,
          blockId: blk.id,
          error: `${blkContext}: Alt text is required for image.`,
        };
        return;
      }

      // Technical table minimum column requirement
      if (blk.type === 'technical-table') {
        if (!Array.isArray(bData.columns) || bData.columns.length === 0) {
          blockFailure = {
            valid: false,
            sectionId: secId,
            itemId: ctx.itemId,
            blockId: blk.id,
            error: `${blkContext}: At least 1 column is required in technical-table.`,
          };
          return;
        }
      }

      // Embed block validation
      if (blk.type === 'embed') {
        const embedCheck = validateEmbedBlockData(bData, blkContext);
        if (!embedCheck.valid) {
          blockFailure = {
            valid: false,
            sectionId: secId,
            itemId: ctx.itemId,
            blockId: blk.id,
            error: embedCheck.error,
          };
          return;
        }
      }
    });

    if (blockFailure) {
      return blockFailure;
    }
  }

  return { valid: true };
}

function generateFreshId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

function regenerateBlockAndNestedIds(block: ArticleBlock): void {
  block.id = generateFreshId('blk');
  const d = block.data as Record<string, any>;
  if (!d || typeof d !== 'object') return;

  if (block.type === 'nested-bullets' && Array.isArray(d.items)) {
    const regenNodes = (nodes: any[], depth = 1) => {
      for (const n of nodes) {
        if (!n || typeof n !== 'object') continue;
        n.id = generateFreshId(depth === 1 ? 'main' : `sub_l${depth}`);
        if (Array.isArray(n.children)) regenNodes(n.children, depth + 1);
      }
    };
    regenNodes(d.items, 1);
  } else if (block.type === 'numbered-steps' && Array.isArray(d.steps)) {
    d.steps.forEach((s: any) => {
      if (s && typeof s === 'object') s.id = generateFreshId('step');
    });
  } else if (block.type === 'bullet-list' && Array.isArray(d.items)) {
    d.items.forEach((it: any) => {
      if (it && typeof it === 'object') it.id = generateFreshId('item');
    });
  } else if (block.type === 'gallery-scroll' && Array.isArray(d.cards)) {
    d.cards.forEach((c: any) => {
      if (c && typeof c === 'object') c.id = generateFreshId('gcard');
    });
  } else if (block.type === 'faq' && Array.isArray(d.items)) {
    d.items.forEach((it: any) => {
      if (it && typeof it === 'object') it.id = generateFreshId('faq');
    });
  } else if (block.type === 'technical-table' && Array.isArray(d.rows)) {
    d.rows.forEach((r: any) => {
      if (r && typeof r === 'object') r.id = generateFreshId('row');
    });
  } else if (block.type === 'comparison') {
    if (Array.isArray(d.columns)) {
      d.columns.forEach((col: any) => {
        if (col && typeof col === 'object') col.id = generateFreshId('ccol');
      });
    }
    if (Array.isArray(d.rows)) {
      d.rows.forEach((r: any) => {
        if (r && typeof r === 'object') r.id = generateFreshId('crow');
      });
    }
  } else if (block.type === 'related-docs' && Array.isArray(d.items)) {
    d.items.forEach((rd: any) => {
      if (rd && typeof rd === 'object') rd.id = generateFreshId('rd');
    });
  } else if (block.type === 'key-takeaways' && Array.isArray(d.items)) {
    d.items.forEach((it: any) => {
      if (it && typeof it === 'object') it.id = generateFreshId('kt');
    });
  } else if (block.type === 'callout' && Array.isArray(d.blocks)) {
    d.blocks.forEach((cb: any) => {
      if (isValidBlockObject(cb)) regenerateBlockAndNestedIds(cb);
    });
  } else if (block.type === 'flex-layout' && Array.isArray(d.columns)) {
    d.columns.forEach((col: any) => {
      if (col && typeof col === 'object') {
        col.id = generateFreshId('fcol');
        if (Array.isArray(col.blocks)) {
          col.blocks.forEach((cb: any) => {
            if (isValidBlockObject(cb)) regenerateBlockAndNestedIds(cb);
          });
        }
      }
    });
  }
}

/**
 * Deep-clones a canonical `ArticleDocument` and regenerates structural IDs
 * (`studioId`, `section.id`, `layoutItem.id`, `block.id`, and nested block/item IDs)
 * across both Legacy (`section.blocks[]`) and Grid (`section.visualGrid.layoutItems[]`) sections,
 * while preserving exact Grid geometry (`columnStart`, `columnSpan`, `rowStart`, `rowSpan`, `verticalAlign`).
 */
export function deepCloneAndRegenerateIds(
  doc: ArticleDocument,
  newStudioId?: string
): ArticleDocument {
  const cloned = normalizeCanonicalDocument(doc);
  cloned.studioId = newStudioId || generateFreshId('draft');

  for (const sec of cloned.sections) {
    sec.id = generateFreshId('sec');
    if (hasVisualGrid(sec) && sec.visualGrid) {
      sec.blocks = [];
      for (const item of sec.visualGrid.layoutItems) {
        item.id = generateFreshId('grid_item');
        if (item.block) {
          regenerateBlockAndNestedIds(item.block);
        }
      }
    } else if (Array.isArray(sec.blocks)) {
      for (const blk of sec.blocks) {
        regenerateBlockAndNestedIds(blk);
      }
    }
  }

  return cloned;
}

/**
 * Returns `true` ONLY when `url` is a Coven-managed local draft upload asset
 * (`/__article-studio/uploads/<filename>`).
 */
export function isManagedDraftUploadUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  return url.trim().startsWith(MANAGED_DRAFT_UPLOAD_PREFIX);
}

/**
 * Returns `true` when `url` is an external HTTP(S) resource URL
 * (such as `https://example.com/image.jpg` inside an Embed block).
 */
export function isExternalResourceUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Returns `true` ONLY when `url` should be copied into `src/articles/<slug>/images/`
 * during Publish. External Embed URLs (`https://...`) are NEVER publish-copy candidates.
 */
export function isPublishCopyCandidateUrl(url: unknown): boolean {
  return isManagedDraftUploadUrl(url) && !isExternalResourceUrl(url);
}

