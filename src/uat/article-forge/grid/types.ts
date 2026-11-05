/**
 * COVEN UAT ARTICLE FORGE — GRID COMPOSER V2 TYPES
 * 4-Column Spatial Block Composer (LEGO-Style Architecture)
 */
import type { ArticleBlock } from '../types/article-document';

export interface GridRect {
  columnStart: number; // 1..4
  columnSpan: number;  // 1..4 (1 = 25%, 2 = 50%, 3 = 75%, 4 = 100%)
  rowStart: number;    // 1..rows
  rowSpan: number;     // 1..rows (normally 1 for content-driven height)
  // Backwards-compatibility bounds
  columnEnd?: number;
  rowEnd?: number;
}

export interface GridLayoutItem extends GridRect {
  id: string;
  block: ArticleBlock;
  label?: string;
  // Compatibility aliases
  blocks?: ArticleBlock[];
}

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

export interface GridComposerV2 {
  columns: number;       // Canonical 4
  rows: number;          // Dynamic auto-growing rows
  columnGap: number;     // e.g. 16px (cycle: 8, 16, 24, 32)
  rowGap: number;        // e.g. 16px (cycle: 8, 16, 24, 32)
  minRowHeight: number;  // e.g. 80px (cycle: 60, 80, 100, 120)
  showCoordinates?: boolean;
  layoutItems: GridLayoutItem[];
  // Backwards-compatibility runtime getter only (non-enumerable; not persisted to disk)
  slots?: GridLayoutItem[];
}

export interface GridInteractionState {
  mode: 'idle' | 'moving' | 'resizing' | 'dragging_from_library' | 'placement_mode' | 'move_mode';
  itemId?: string;
  blockType?: string;
  widthSpan?: number; // 1..4
  originRect?: GridRect;
  previewRect?: GridRect;
  dragStartPointer?: { x: number; y: number };
  resizeEdge?: 'w' | 'e' | 's' | 'se';
  hasCollision?: boolean;
}

export interface GridHistorySnapshot {
  columns: number;
  rows: number;
  columnGap: number;
  rowGap: number;
  minRowHeight: number;
  showCoordinates?: boolean;
  layoutItems: GridLayoutItem[];
}

export interface SectionGridHistory {
  past: GridHistorySnapshot[];
  future: GridHistorySnapshot[];
}

