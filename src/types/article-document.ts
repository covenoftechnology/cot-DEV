import type { ArticleMeta } from './article';

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
  blocks: ArticleBlock[];
}

export interface ArticleDocument {
  version: 1;
  studioId: string;
  slug: string;
  meta: ArticleMeta;
  sections: ArticleSection[];
}
