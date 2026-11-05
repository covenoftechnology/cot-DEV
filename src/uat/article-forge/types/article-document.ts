import type { ArticleMeta } from './article';
import type { VisualGrid, GridSlot } from '../layout-grid/types';

export type { VisualGrid, GridSlot };

export interface ArticleBlock {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface ArticleSection {
  id: string;
  title: string;
  kicker?: string;
  heading?: string;
  // Authoritative 4-Column Grid Composer layout
  visualGrid?: VisualGrid;
  // Backwards-compatibility runtime getter only (non-enumerable; not persisted to disk)
  layout?: VisualGrid;
  blocks?: ArticleBlock[]; // Preserved during Phase 3 transition
}

export interface ArticleRichText {
  text: string;
  align?: 'left' | 'center' | 'right';
}

export interface ArticleDocument {
  version: 1;
  studioId: string;
  slug: string;
  meta: ArticleMeta;
  sections: ArticleSection[];
  sourceArticleSlug?: string;
}
