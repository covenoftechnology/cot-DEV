import type { ArticleMeta } from './article';
import type {
  VisualGrid,
  GridComposerV2,
  GridLayoutItem,
  GridRect,
  GridVerticalAlign,
  SingleCardBlockData,
  EmbedBlockData,
  EmbedMode,
  EmbedAspectRatio,
} from '../lib/article-grid/types';

export type {
  VisualGrid,
  GridComposerV2,
  GridLayoutItem,
  GridRect,
  GridVerticalAlign,
  SingleCardBlockData,
  EmbedBlockData,
  EmbedMode,
  EmbedAspectRatio,
};

export interface ArticleBlock {
  id: string;
  type: string;
  data: Record<string, any>;
}

/**
 * Dual-Mode Canonical ArticleSection Contract:
 * - Legacy sections store blocks in `section.blocks[]` and omit `visualGrid`.
 * - Grid sections store spatial layout items in `section.visualGrid.layoutItems[]` (with `blocks: []`).
 * - Mixed articles may contain both Legacy sections and Grid sections within the same `ArticleDocument`.
 */
export interface ArticleSection {
  id: string;
  title: string;
  kicker?: string;
  heading?: string;
  blocks: ArticleBlock[];
  visualGrid?: VisualGrid;
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
