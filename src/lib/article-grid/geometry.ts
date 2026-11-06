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
 * Returns `true` ONLY when `section.visualGrid.layoutItems` is a non-empty array
 * containing at least one valid placed `ArticleBlock`.
 * Never classifies a legacy section as Grid merely because an empty object exists.
 */
export function hasVisualGrid(section: unknown): boolean {
  if (!section || typeof section !== 'object') return false;
  const sec = section as Record<string, unknown>;
  if (!sec.visualGrid || typeof sec.visualGrid !== 'object') return false;
  const vg = sec.visualGrid as Record<string, unknown>;
  if (!Array.isArray(vg.layoutItems) || vg.layoutItems.length === 0) return false;
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

  for (let i = 0; i < vg.layoutItems.length; i++) {
    const item = vg.layoutItems[i];
    if (!item || typeof item !== 'object') {
      return {
        valid: false,
        sectionId: sec.id,
        error: `${secLabel}: layoutItems[${i}] must be an object.`,
      };
    }

    const itemId = typeof item.id === 'string' && item.id.trim() ? item.id : `item_${i + 1}`;

    if (!isValidBlockObject(item.block)) {
      return {
        valid: false,
        sectionId: sec.id,
        itemId,
        error: `${secLabel} (${itemId}): Grid item is missing a valid ArticleBlock (id, type, data).`,
      };
    }

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

  const rawVg = raw.visualGrid as Record<string, any>;
  const normalizedItems: GridLayoutItem[] = [];

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

    const cleanBlock: ArticleBlock = {
      id: it.block.id,
      type: it.block.type,
      data: JSON.parse(JSON.stringify(it.block.data)),
    };

    const cleanItem: GridLayoutItem = {
      id: typeof it.id === 'string' && it.id.trim() ? it.id : `grid_item_${i + 1}`,
      columnStart: colStart,
      columnSpan: colSpan,
      columnEnd: colStart + colSpan,
      rowStart,
      rowSpan,
      rowEnd: rowStart + rowSpan,
      verticalAlign: resolveGridVerticalAlign(it.verticalAlign),
      block: cleanBlock,
      ...(typeof it.label === 'string' && it.label.trim() ? { label: it.label } : {}),
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
  const minRowHeight =
    typeof rawVg.minRowHeight === 'number' && Number.isFinite(rawVg.minRowHeight) && rawVg.minRowHeight >= 40
      ? rawVg.minRowHeight
      : DEFAULT_MIN_ROW_HEIGHT;

  normalized.visualGrid = {
    columns: DEFAULT_GRID_COLUMNS,
    rows: safeRows,
    columnGap: colGap,
    rowGap,
    minRowHeight,
    ...(typeof rawVg.showCoordinates === 'boolean' ? { showCoordinates: rawVg.showCoordinates } : {}),
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
 * Returns all `ArticleBlock` instances in a section across both
 * legacy `section.blocks[]` and Grid `section.visualGrid.layoutItems[].block`.
 * Used by future Publish validation, asset migration, and ID duplication walkers.
 */
export function getSectionBlocksForTraversal(section: unknown): ArticleBlock[] {
  if (!section || typeof section !== 'object') return [];
  const sec = section as Record<string, any>;
  const result: ArticleBlock[] = [];

  if (Array.isArray(sec.blocks)) {
    for (const blk of sec.blocks) {
      if (isValidBlockObject(blk)) result.push(blk);
    }
  }

  if (sec.visualGrid && Array.isArray(sec.visualGrid.layoutItems)) {
    for (const item of sec.visualGrid.layoutItems) {
      if (item && typeof item === 'object' && isValidBlockObject(item.block)) {
        result.push(item.block);
      }
    }
  }

  return result;
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

