/**
 * COVEN ARTICLE SYSTEM — CANONICAL 4-COLUMN GRID COMPOSER V2 TYPES
 * Single authoritative type contract for Grid composition, vertical alignment,
 * and new Grid-native block payloads (Single Card & Generic Embed).
 */
import type { ArticleBlock, ArticleRichText } from '../../types/article-document';

export type GridVerticalAlign = 'start' | 'center' | 'end';

export interface GridRect {
  columnStart: number; // 1..4
  columnSpan: number;  // 1..4 (1 = 25%, 2 = 50%, 3 = 75%, 4 = 100%)
  rowStart: number;    // 1..MAX_GRID_ROWS
  rowSpan: number;     // 1..MAX_GRID_ROWS (1 for content-driven logical rows)
  columnEnd?: number;  // Optional convenience bound: columnStart + columnSpan
  rowEnd?: number;     // Optional convenience bound: rowStart + rowSpan
}

/**
 * Single authoritative persisted Grid item inside `visualGrid.layoutItems[]`.
 * Grid owns composition (columnStart, columnSpan, rowStart, rowSpan, verticalAlign);
 * Block owns content (`block`).
 */
export interface GridLayoutItem extends GridRect {
  id: string;
  block: ArticleBlock;
  verticalAlign?: GridVerticalAlign; // Defaults to 'start' when absent
  label?: string;
}

/**
 * Authoritative 4-Column Grid Composer V2 persistence structure on `ArticleSection.visualGrid`.
 * Only `layoutItems` is persisted as the collection of placed blocks.
 */
export interface VisualGrid {
  columns: number;       // Canonical 4
  rows: number;          // Dynamic logical rows (clamped MIN_GRID_ROWS..MAX_GRID_ROWS)
  columnGap: number;     // Default 16px (cycle: 8, 16, 24, 32)
  rowGap: number;        // Default 16px (cycle: 8, 16, 24, 32)
  minRowHeight: number;  // Default 80px
  showCoordinates?: boolean;
  layoutItems: GridLayoutItem[];
}

export type GridComposerV2 = VisualGrid;

export interface PlacementResolution {
  valid: boolean;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
  contiguousFree: number;
  autoFitApplied: boolean;
  reason?: string;
}

export interface GridGeometryValidationResult {
  valid: boolean;
  error?: string;
  sectionId?: string;
  itemId?: string;
}

/**
 * Canonical Single Card (`single-card`) block payload contract.
 */
export interface SingleCardBlockData {
  icon: string;
  title: string | ArticleRichText;
  desc: string | ArticleRichText;
}

/**
 * Canonical Generic Embed (`embed`) block payload contract.
 * Note: An external `url` (e.g. https://example.com/image.jpg) is a remote resource,
 * NOT a Coven-managed local draft upload (`/__article-studio/uploads/...`).
 */
export type EmbedMode = 'image' | 'video' | 'link' | 'iframe';
export type EmbedAspectRatio = '16-9' | '4-3' | '1-1';

export interface EmbedBlockData {
  embedType: EmbedMode;
  url: string;
  title?: string | ArticleRichText;
  caption?: string | ArticleRichText;
  alt?: string;
  aspectRatio?: EmbedAspectRatio;
}

