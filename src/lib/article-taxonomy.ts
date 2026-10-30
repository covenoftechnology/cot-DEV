/**
 * ============================================================
 * CANONICAL ARTICLE TAXONOMY & SLUG NORMALIZATION
 * Single source of truth for Coven Article Studio and metadata.
 * ============================================================
 */

export const ARTICLE_CATEGORIES = [
  'Business Analysis',
  'Management',
  'Mentoring',
  'Salesforce',
] as const;

export type CanonicalCategory = typeof ARTICLE_CATEGORIES[number];
export type ArticleCategory = CanonicalCategory | (string & {});

export const ARTICLE_DIFFICULTIES = [
  'Lv. 1 - Incantation',
  'Lv. 2 - Scroll',
  'Lv. 3 - Ritual',
] as const;

export type CanonicalDifficulty = typeof ARTICLE_DIFFICULTIES[number];
export type ArticleDifficulty = CanonicalDifficulty;

export const DIFFICULTY_GLYPHS: Record<ArticleDifficulty, string> = {
  'Lv. 1 - Incantation': '✦',
  'Lv. 2 - Scroll': '◆',
  'Lv. 3 - Ritual': '✧',
};

export const ARTICLE_TAGS = [
  'Administration',
  'Artificial Intelligence',
  'Associate',
  'Automations',
  'Business Analysis',
  'Email',
  'Featured Tome',
  'Guidelines',
  'Incantation',
  'Management',
  'Mentoring',
  'Microsoft',
  'Salesforce',
  'Scroll',
  'Setup',
  'SFDC',
  'SFMC',
  'Teams',
  'Ritual',
] as const;

export type CanonicalTag = typeof ARTICLE_TAGS[number];
export type ArticleTag = CanonicalTag | (string & {});

/**
 * Merges published article categories with the canonical category baseline.
 * Rule:
 * 1. Exact initial canonical categories first in canonical order.
 * 2. Additional published categories sorted alphabetically.
 * 3. Case-insensitive deduplication, canonical casing wins.
 */
export function mergeCategories(publishedCategories: string[] = []): string[] {
  const result: string[] = [...ARTICLE_CATEGORIES];
  const seenLower = new Set<string>(ARTICLE_CATEGORIES.map((c) => c.toLowerCase()));

  const additional: string[] = [];
  for (const raw of publishedCategories) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      additional.push(trimmed);
    }
  }

  // Sort custom / published categories alphabetically
  additional.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return [...result, ...additional];
}

/**
 * Merges published article tags with canonical tags baseline.
 * Rule:
 * 1. Canonical tags in exact initial canonical order first.
 * 2. Additional published custom tags sorted alphabetically.
 * 3. Case-insensitive deduplication, canonical casing wins.
 */
export function mergeTags(publishedTags: string[] = []): string[] {
  const result: string[] = [...ARTICLE_TAGS];
  const seenLower = new Set<string>(ARTICLE_TAGS.map((t) => t.toLowerCase()));

  const additional: string[] = [];
  for (const raw of publishedTags) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      additional.push(trimmed);
    }
  }

  // Sort custom / published tags alphabetically
  additional.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return [...result, ...additional];
}

/**
 * Normalizes input string into a live safe URL slug.
 *
 * Rules:
 * - lowercase
 * - spaces and non-alphanumeric special characters become "-"
 * - multiple spaces/hyphens become ONE "-"
 * - remove leading hyphen
 * - remove trailing hyphen (unless allowTrailingHyphen is true for live typing)
 * - accents / special characters normalized (diacritics removal)
 * - path manipulation characters (../, /, ?, #, &, =, %, etc.) eliminated
 * - allowed characters: a-z, 0-9, -
 */
export function normalizeSlug(input: string, options?: { allowTrailingHyphen?: boolean }): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Remove diacritics / accents (e.g. 'Artículo' -> 'Articulo', 'Niño' -> 'Nino')
  let normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 2. Lowercase
  normalized = normalized.toLowerCase();

  // 3. Replace any non-alphanumeric characters (spaces, slashes, ?, #, &, =, %, ., etc.) with '-'
  normalized = normalized.replace(/[^a-z0-9]+/g, '-');

  // 4. Repeated hyphens become ONE '-'
  normalized = normalized.replace(/-+/g, '-');

  // 5. Remove leading hyphen
  normalized = normalized.replace(/^-+/g, '');

  // 6. Remove trailing hyphen if not allowed
  if (!options?.allowTrailingHyphen) {
    normalized = normalized.replace(/-+$/g, '');
  }

  return normalized;
}

/**
 * Validates whether a slug is compliant with the canonical regex:
 * ^[a-z0-9]+(?:-[a-z0-9]+)*$
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
