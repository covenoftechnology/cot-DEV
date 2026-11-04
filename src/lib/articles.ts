import type { Article, ArticleMeta, ArticleNavigation } from '../types/article';
import type { ArticleDocument, ArticleBlock } from '../types/article-document';

// Automatically discover all article metadata files using Vite's import.meta.glob
const metaModules = import.meta.glob<{ default?: ArticleMeta; meta?: ArticleMeta }>(
  '/src/articles/*/meta.ts',
  { eager: true }
);

// Automatically discover all article components (index.astro)
const componentModules = import.meta.glob<{ default: any }>(
  '/src/articles/*/index.astro',
  { eager: true }
);

// Automatically discover all article Studio structured content files (content.json)
const contentModules = import.meta.glob<{ default?: any }>(
  '/src/articles/*/content.json',
  { eager: true }
);

/**
 * Extracts the article slug from the file path.
 * Example: "/src/articles/apex-triggers-without-tears/meta.ts" -> "apex-triggers-without-tears"
 */
function extractSlug(path: string): string | null {
  const match = path.match(/(?:^|\/)articles\/([^/]+)\/(?:meta\.ts|index\.astro|content\.json)$/);
  return match ? match[1] : null;
}

/**
 * Validates metadata structure defensively to catch editorial issues early.
 */
function validateMeta(slug: string, meta: any): ArticleMeta {
  if (!meta || typeof meta !== 'object') {
    throw new Error(`[Article Architecture Error] Article "${slug}" does not export a valid metadata object.`);
  }

  const warnings: string[] = [];
  if (!meta.title || typeof meta.title !== 'string') warnings.push('missing "title"');
  if (!meta.description || typeof meta.description !== 'string') warnings.push('missing "description"');
  if (!meta.author || typeof meta.author !== 'string') warnings.push('missing "author"');
  if (!meta.category || typeof meta.category !== 'string') warnings.push('missing "category"');
  if (!Array.isArray(meta.tags)) warnings.push('missing "tags" array');
  if (!meta.status || !['published', 'draft', 'hidden'].includes(meta.status)) {
    warnings.push(`invalid status "${meta.status}" (expected: published | draft | hidden)`);
  }

  if (warnings.length > 0) {
    console.warn(`[Article Meta Warning] "${slug}" has issues: ${warnings.join(', ')}`);
  }

  // Canonicalize cover image metadata for backwards compatibility
  if (!meta.coverImageSrc && meta.cover) {
    meta.coverImageSrc = meta.cover;
  }
  if (!meta.coverImageAlt && meta.coverCaption) {
    meta.coverImageAlt = meta.coverCaption;
  }
  if (meta.showCoverImageOnArticle === undefined) {
    meta.showCoverImageOnArticle = true;
  }

  return meta as ArticleMeta;
}

/**
 * Index metadata modules by slug (ignoring templates or directories starting with '_')
 */
const metaBySlug: Record<string, ArticleMeta> = {};
for (const [path, moduleExports] of Object.entries(metaModules)) {
  const slug = extractSlug(path);
  if (!slug || slug.startsWith('_')) continue;
  const rawMeta = moduleExports.default || moduleExports.meta || (moduleExports as unknown as ArticleMeta);
  metaBySlug[slug] = validateMeta(slug, rawMeta);
}

// Detect duplicate order values and emit a non-fatal warning
const ordersSeen: Record<number, string[]> = {};
for (const [slug, meta] of Object.entries(metaBySlug)) {
  if (typeof meta.order === 'number') {
    if (!ordersSeen[meta.order]) {
      ordersSeen[meta.order] = [];
    }
    ordersSeen[meta.order].push(slug);
  }
}
for (const [orderVal, slugs] of Object.entries(ordersSeen)) {
  if (slugs.length > 1) {
    console.warn(`[Articles] Duplicate order "${orderVal}" detected:\n${slugs.map((s) => `- ${s}`).join('\n')}`);
  }
}

/**
 * Index component modules by slug
 */
const componentBySlug: Record<string, any> = {};
for (const [path, moduleExports] of Object.entries(componentModules)) {
  const slug = extractSlug(path);
  if (!slug || slug.startsWith('_')) continue;
  componentBySlug[slug] = moduleExports.default;
}

/**
 * Track slugs and structured documents from Studio content.json files.
 */
const studioSlugs = new Set<string>();
const contentBySlug: Record<string, ArticleDocument> = {};
for (const [path, moduleExports] of Object.entries(contentModules)) {
  const slug = extractSlug(path);
  if (slug && !slug.startsWith('_')) {
    studioSlugs.add(slug);
    const rawDoc = (moduleExports as any)?.default || moduleExports;
    if (rawDoc && typeof rawDoc === 'object') {
      contentBySlug[slug] = rawDoc as ArticleDocument;
    }
  }
}

/**
 * Canonical sorting algorithm for articles.
 * Priority:
 * 1. `order` ascending (defaults to Infinity for unassigned)
 * 2. `publishedDate` chronological
 * 3. `slug` alphabetical
 */
export function compareArticles(a: Article, b: Article): number {
  const orderA = typeof a.meta.order === 'number' ? a.meta.order : Infinity;
  const orderB = typeof b.meta.order === 'number' ? b.meta.order : Infinity;
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  const dateA = a.meta.publishedDate ? new Date(a.meta.publishedDate).getTime() : 0;
  const dateB = b.meta.publishedDate ? new Date(b.meta.publishedDate).getTime() : 0;
  if (dateA !== dateB) {
    return dateA - dateB;
  }

  return a.slug.localeCompare(b.slug);
}

/**
 * Returns all registered articles, sorted in canonical order.
 */
export function getAllArticles(): Article[] {
  const articles: Article[] = [];

  for (const slug of Object.keys(metaBySlug)) {
    const meta = metaBySlug[slug];
    const component = componentBySlug[slug];

    if (meta && component) {
      articles.push({
        slug,
        meta,
        component,
        isStudioArticle: studioSlugs.has(slug),
      });
    } else {
      console.warn(`[Article Warning] "${slug}" has mismatched meta or index.astro component.`);
    }
  }

  return articles.sort(compareArticles);
}

/**
 * Returns only published articles (status === 'published').
 */
export function getPublishedArticles(): Article[] {
  return getAllArticles().filter((article) => article.meta.status === 'published');
}

/**
 * Returns all registered articles created via Article Studio (contains content.json).
 */
export function getStudioArticles(): Article[] {
  return getAllArticles().filter((article) => article.isStudioArticle === true);
}

/**
 * Returns only published articles created via Article Studio.
 */
export function getPublishedStudioArticles(): Article[] {
  return getPublishedArticles().filter((article) => article.isStudioArticle === true);
}

export const FEATURED_TOME_TAG = 'Featured Tome';

/**
 * Returns up to `limit` featured Studio articles for Home.
 * Priority:
 * 1. Published Studio articles tagged "Featured Tome" (in canonical order)
 * 2. Fallback: first `limit` published Studio articles in canonical order
 */
export function getFeaturedStudioArticles(limit = 3): Article[] {
  const publishedStudio = getPublishedStudioArticles();
  const targetTag = FEATURED_TOME_TAG.toLowerCase();
  const featuredTomes = publishedStudio.filter((article) =>
    Array.isArray(article.meta.tags) &&
    article.meta.tags.some((tag) => typeof tag === 'string' && tag.trim().toLowerCase() === targetTag)
  );
  const source = featuredTomes.length > 0 ? featuredTomes : publishedStudio;
  return source.slice(0, Math.max(0, limit));
}

/**
 * Returns featured published Studio articles (alias of getFeaturedStudioArticles).
 */
export function getFeaturedArticles(limit = 3): Article[] {
  return getFeaturedStudioArticles(limit);
}

/**
 * Finds a single article by its slug.
 */
export function getArticleBySlug(slug: string): Article | undefined {
  return getAllArticles().find((article) => article.slug === slug);
}

/**
 * Calculates Previous and Next articles dynamically based on canonical order.
 * - First article: previous = null
 * - Last article: next = null
 */
export function getArticleNavigation(slug: string): ArticleNavigation {
  const published = getPublishedArticles();
  const index = published.findIndex((article) => article.slug === slug);
  if (index === -1) {
    return { previous: null, next: null };
  }
  return {
    previous: index > 0 ? published[index - 1] : null,
    next: index < published.length - 1 ? published[index + 1] : null,
  };
}

/**
 * Calculates related articles deterministically based on category and shared tags.
 * Excludes current article and non-published articles.
 * Falls back deterministically to other published articles in canonical order.
 */
export function getRelatedArticles(slug: string, limit = 3): Article[] {
  const published = getPublishedArticles();
  const current = published.find((article) => article.slug === slug);
  const candidates = published.filter((article) => article.slug !== slug);

  if (!current) {
    return candidates.slice(0, limit);
  }

  const currentCategory = (current.meta.category || '').trim().toLowerCase();
  const currentTags = new Set((current.meta.tags || []).map((t) => t.trim().toLowerCase()));

  const scored = candidates.map((candidate) => {
    let score = 0;
    const candCat = (candidate.meta.category || '').trim().toLowerCase();
    if (candCat && candCat === currentCategory) {
      score += 10;
    }
    for (const tag of candidate.meta.tags || []) {
      if (currentTags.has(tag.trim().toLowerCase())) {
        score += 3;
      }
    }
    return { article: candidate, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return compareArticles(a.article, b.article);
  });

  return scored.slice(0, limit).map((s) => s.article);
}

/**
 * Returns all unique categories present in published articles.
 */
export function getArticleCategories(): string[] {
  const categories = new Set(getPublishedArticles().map((a) => a.meta.category).filter(Boolean));
  return Array.from(categories).sort();
}

/**
 * Returns all unique tags present in published articles.
 */
export function getArticleTags(): string[] {
  const tags = new Set<string>();
  for (const article of getPublishedArticles()) {
    for (const tag of article.meta.tags || []) {
      if (tag) tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}

/**
 * Recursively traverses all ArticleBlocks within a list of blocks,
 * including approved nested containers (flex-layout columns, callout blocks).
 */
export function traverseArticleBlocks(
  blocks: ArticleBlock[] | undefined,
  visitor: (block: ArticleBlock) => void
): void {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    visitor(block);
    if (block.type === 'flex-layout' && Array.isArray(block.data?.columns)) {
      for (const col of block.data.columns) {
        if (Array.isArray(col?.blocks)) {
          traverseArticleBlocks(col.blocks, visitor);
        }
      }
    }
    if (Array.isArray(block.data?.blocks)) {
      traverseArticleBlocks(block.data.blocks, visitor);
    }
  }
}

/**
 * Counts `article-trial` blocks inside a single ArticleDocument.
 */
export function countDocumentTrials(doc: ArticleDocument | undefined | null): number {
  if (!doc || !Array.isArray(doc.sections)) return 0;
  let count = 0;
  for (const section of doc.sections) {
    traverseArticleBlocks(section?.blocks, (block) => {
      if (block.type === 'article-trial') {
        count += 1;
      }
    });
  }
  return count;
}

/**
 * Counts actual `article-trial` blocks across all currently published Studio articles.
 */
export function getPublishedStudioTrialsCount(): number {
  const publishedStudio = getPublishedStudioArticles();
  let total = 0;
  for (const article of publishedStudio) {
    total += countDocumentTrials(contentBySlug[article.slug]);
  }
  return total;
}

export interface HomeStatItem {
  value: string;
  label: string;
}

/**
 * Computes real Home hero statistics from centralized published Studio sources.
 * Note: No persisted member/user source exists yet, so INITIATES is omitted rather than fabricated.
 */
export function getHomeStats(): HomeStatItem[] {
  const publishedScrollsCount = getPublishedStudioArticles().length;
  const publishedTrialsCount = getPublishedStudioTrialsCount();
  return [
    { value: String(publishedScrollsCount), label: 'Scrolls' },
    { value: String(publishedTrialsCount), label: 'Trials' },
  ];
}
