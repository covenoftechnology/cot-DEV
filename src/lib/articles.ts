import type { Article, ArticleMeta, ArticleNavigation } from '../types/article';

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

/**
 * Extracts the article slug from the file path.
 * Example: "/src/articles/apex-triggers-without-tears/meta.ts" -> "apex-triggers-without-tears"
 */
function extractSlug(path: string): string | null {
  const match = path.match(/(?:^|\/)articles\/([^/]+)\/(?:meta\.ts|index\.astro)$/);
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
 * Returns published articles marked as featured (featured === true).
 */
export function getFeaturedArticles(): Article[] {
  return getPublishedArticles().filter((article) => article.meta.featured === true);
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
