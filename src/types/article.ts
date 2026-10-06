export type ArticleStatus = 'draft' | 'published' | 'hidden';

export interface ArticleMeta {
  title: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  rank?: string;
  meta?: string;
  status: ArticleStatus;
  featured?: boolean;
  order?: number;
  thumbBg?: string;
  cover?: string;
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
}
