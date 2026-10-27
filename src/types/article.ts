import type { ArticleDifficulty } from '../lib/article-taxonomy';

export type { ArticleDifficulty };
export type ArticleStatus = 'draft' | 'published' | 'hidden';

export interface ArticleMeta {
  title: string;
  description: string;
  author: string;
  category: string;
  difficulty?: ArticleDifficulty;
  tags: string[];
  rank?: string;
  meta?: string;
  status: ArticleStatus;
  featured?: boolean;
  order?: number;
  thumbBg?: string;
  cover?: string;
  coverCaption?: string;
  publishedDate?: Date | string;
  updatedDate?: Date | string;
  readingTime?: string;
  aetherReward?: number;
  hideTrial?: boolean;
  wide?: boolean;
}

export interface Article {
  slug: string;
  meta: ArticleMeta;
  component: any;
  isStudioArticle?: boolean;
}

export interface ArticleNavigation {
  previous: Article | null;
  next: Article | null;
}
