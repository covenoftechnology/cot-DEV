/**
 * COVEN UAT ARTICLE FORGE — SECTION VISUAL GRID TYPES
 * Phase 3: Spatial Structure & Slots Foundation
 */
import type { ArticleBlock } from '../types/article-document';

export interface GridRect {
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
}

export interface GridSlot extends GridRect {
  id: string;
  label: string;
  block?: ArticleBlock | null;
  blocks?: ArticleBlock[]; // Compatibility alias
}

export interface VisualGrid {
  columns: number;
  rows: number;
  columnGap: number;
  rowGap: number;
  minRowHeight: number;
  showCoordinates?: boolean;
  slots: GridSlot[];
}

export interface GridInteraction {
  mode: 'idle' | 'moving' | 'resizing' | 'creating';
  slotId?: string;
  originRect?: GridRect;
  previewRect?: GridRect;
  startCell?: { col: number; row: number };
  createStart?: { col: number; row: number };
  createCurrent?: { col: number; row: number };
  resizeHandle?: string;
  hasCollision?: boolean;
}

export interface GridHistorySnapshot {
  columns: number;
  rows: number;
  columnGap: number;
  rowGap: number;
  minRowHeight: number;
  showCoordinates?: boolean;
  slots: GridSlot[];
}

export interface SectionGridHistory {
  past: GridHistorySnapshot[];
  future: GridHistorySnapshot[];
}

