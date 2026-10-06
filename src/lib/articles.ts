import type { Article, ArticleMeta } from '../types/article';

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
 * Index metadata modules by slug (ignoring templates or directories starting with '_')
 */
const metaBySlug: Record<string, ArticleMeta> = {};
for (const [path, moduleExports] of Object.entries(metaModules)) {
  const slug = extractSlug(path);
  if (!slug || slug.startsWith('_')) continue;
  const meta = moduleExports.default || moduleExports.meta || (moduleExports as unknown as ArticleMeta);
  if (meta && typeof meta === 'object') {
    metaBySlug[slug] = meta;
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
 * Returns all registered articles, sorted by order ascending.
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
    }
  }

  return articles.sort((a, b) => (a.meta.order ?? 999) - (b.meta.order ?? 999));
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
