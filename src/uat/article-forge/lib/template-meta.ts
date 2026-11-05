// src/uat/article-forge/lib/template-meta.ts
// Cloned & isolated default template metadata for UAT Article Forge Preview
import type { ArticleDocumentMeta } from '../types/article-document';

export const defaultTemplateMeta: ArticleDocumentMeta = {
  title: 'Untitled Scroll',
  description: '',
  author: 'Oracle of Orgs',
  category: 'Salesforce',
  difficulty: 'Lv. 1 - Incantation',
  tags: [],
  rank: 'Mechanic',
  readingTime: '1 min',
  aetherReward: 120,
  publishedDate: '2026-10-05',
  meta: '1 min · ✦ 120 Aether',
  status: 'draft',
  featured: false,
  order: 2,
  wide: true,
  cover: '',
  coverImageSrc: '',
  coverImageAlt: '',
  coverCaption: '',
  thumbBg: 'repeating-linear-gradient(135deg,rgba(139,92,196,.12) 0 10px,rgba(139,92,196,.03) 10px 20px)',
  showCoverImageOnArticle: true,
};

export default defaultTemplateMeta;

