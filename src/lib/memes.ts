import fs from 'node:fs';
import path from 'node:path';
import { normalizeSlug, isValidSlug } from './article-taxonomy';

/**
 * ============================================================
 * CANONICAL MEME MODEL, TAXONOMY & FILESYSTEM REPOSITORY
 * Single source of truth for Coven Meme Studio, Meme Center,
 * and (in Phase 2) the public Grimoire of Memes (/memes).
 * ============================================================
 */

export type MemeStatus = 'draft' | 'published';

export interface MemeCategory {
  id: string;
  name: string;
  glyph?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_MEME_CATEGORIES: MemeCategory[] = [
  {
    id: 'admin-life',
    name: 'Admin life',
    glyph: '🧙',
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  },
  {
    id: 'apex-pain',
    name: 'Apex pain',
    glyph: '⚡',
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  },
  {
    id: 'deploy-disasters',
    name: 'Deploy disasters',
    glyph: '💥',
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  },
  {
    id: 'stakeholder-spells',
    name: 'Stakeholder spells',
    glyph: '🔮',
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  },
];

export const MEME_CATEGORIES = [
  'Admin life',
  'Apex pain',
  'Deploy disasters',
  'Stakeholder spells',
] as const;

export const MEME_CATEGORY_GLYPHS: Record<string, string> = {
  'Admin life': '🧙',
  'Apex pain': '⚡',
  'Deploy disasters': '💥',
  'Stakeholder spells': '🔮',
};

export interface MemeDocument {
  id: string;
  slug: string;

  status: MemeStatus;

  caption: string;
  description?: string;

  categoryId: string; // Canonical persistent category identity (e.g. 'admin-life')
  category?: string; // Resolved display name (runtime convenience & backward compat)

  imageSrc: string;
  imageAlt?: string;

  publishedAt?: string; // Canonical first-published ISO 8601 UTC timestamp
  publishDate?: string; // Legacy / display date (YYYY-MM-DD) derived from publishedAt

  featured?: boolean;

  createdAt: string;
  updatedAt: string;
}

export { normalizeSlug as normalizeMemeSlug, isValidSlug as isValidMemeSlug };

export function generateMemeId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `meme_${ts}_${rand}`;
}

export function getCategoriesConfigPath(): string {
  return path.resolve(process.cwd(), 'src', 'memes', '_config', 'categories.json');
}

/**
 * Reads all category objects from `src/memes/_config/categories.json`.
 * Automatically seeds the file if it doesn't exist yet.
 */
export function getAllMemeCategoryObjects(): MemeCategory[] {
  const configPath = getCategoriesConfigPath();
  if (typeof fs !== 'undefined' && typeof fs.existsSync === 'function') {
    if (fs.existsSync(configPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (Array.isArray(raw) && raw.length > 0) {
          return raw;
        }
      } catch (err) {
        console.warn('[Meme Categories Warning] Failed to parse categories.json:', err);
      }
    }
  }
  return [...DEFAULT_MEME_CATEGORIES];
}

/**
 * Saves all category objects to `src/memes/_config/categories.json`.
 */
export function saveMemeCategoryObjects(categories: MemeCategory[]): void {
  const configPath = getCategoriesConfigPath();
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(categories, null, 2), 'utf-8');
}

/**
 * Resolves a category by stable ID or display Name (case-insensitive).
 */
export function resolveMemeCategory(
  identifier: string,
  categories: MemeCategory[] = getAllMemeCategoryObjects()
): MemeCategory | undefined {
  if (!identifier || typeof identifier !== 'string') return undefined;
  const clean = identifier.trim().toLowerCase();
  return (
    categories.find((c) => c.id.toLowerCase() === clean) ||
    categories.find((c) => c.name.toLowerCase() === clean)
  );
}

/**
 * Returns list of category names from the single source of truth.
 */
export function getMemeCategories(): string[] {
  const cats = getAllMemeCategoryObjects();
  return cats.map((c) => c.name);
}

/**
 * Returns mapping of category names and IDs to their glyphs.
 */
export function getMemeCategoryGlyphs(): Record<string, string> {
  const map: Record<string, string> = { ...MEME_CATEGORY_GLYPHS };
  const cats = getAllMemeCategoryObjects();
  for (const c of cats) {
    const g = c.glyph || '✦';
    map[c.name] = g;
    map[c.id] = g;
  }
  return map;
}

/**
 * Resolves canonical display name for a category.
 */
export function normalizeMemeCategory(rawCategory: string): string {
  const match = resolveMemeCategory(rawCategory);
  return match ? match.name : (rawCategory || '').trim();
}

/**
 * Counts how many memes in src/memes/ are using the specified category ID or Name.
 */
export function countMemesUsingCategory(
  categoryIdOrName: string
): { count: number; slugs: string[] } {
  const allMemes = getAllMemes();
  const clean = (categoryIdOrName || '').trim().toLowerCase();
  const matchedSlugs: string[] = [];

  for (const meme of allMemes) {
    const memeCatId = (meme.categoryId || '').trim().toLowerCase();
    const memeCatName = (meme.category || '').trim().toLowerCase();
    if (memeCatId === clean || memeCatName === clean) {
      matchedSlugs.push(meme.slug);
      continue;
    }
    const resolved = resolveMemeCategory(meme.categoryId || meme.category || '');
    if (resolved && (resolved.id.toLowerCase() === clean || resolved.name.toLowerCase() === clean)) {
      matchedSlugs.push(meme.slug);
    }
  }

  return { count: matchedSlugs.length, slugs: matchedSlugs };
}

/**
 * Normalizes and validates a raw MemeDocument payload.
 */
export function validateMemeDocument(
  raw: any,
  options?: { requirePublishFields?: boolean; existingDoc?: MemeDocument | null }
): { valid: boolean; errors: string[]; document: MemeDocument } {
  const errors: string[] = [];
  const existing = options?.existingDoc || null;
  const nowIso = new Date().toISOString();
  const allCats = getAllMemeCategoryObjects();
  const defaultCat = allCats[0] || DEFAULT_MEME_CATEGORIES[0];

  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      errors: ['Invalid meme document payload.'],
      document: {
        id: generateMemeId(),
        slug: '',
        status: 'draft',
        caption: '',
        categoryId: defaultCat.id,
        category: defaultCat.name,
        imageSrc: '',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    };
  }

  const id =
    (existing && existing.id) ||
    (typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateMemeId());

  const caption = typeof raw.caption === 'string' ? raw.caption.trim() : '';
  if (!caption) {
    errors.push('Caption is required.');
  }

  const rawSlugInput =
    typeof raw.slug === 'string' && raw.slug.trim()
      ? raw.slug.trim()
      : caption;
  const slug = normalizeSlug(rawSlugInput);
  if (!slug || !isValidSlug(slug)) {
    errors.push('A valid URL slug is required (lowercase letters, numbers, and hyphens).');
  }

  const status: MemeStatus = raw.status === 'published' ? 'published' : 'draft';
  const requirePublish = Boolean(options?.requirePublishFields || status === 'published');

  // Canonical Category Identity Resolution:
  // Accept raw.categoryId, raw.category, existing.categoryId, or existing.category
  const inputCategoryIdentifier =
    (typeof raw.categoryId === 'string' && raw.categoryId.trim() ? raw.categoryId.trim() : '') ||
    (typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : '') ||
    (existing && existing.categoryId) ||
    (existing && existing.category) ||
    '';

  const rawCategoryName =
    (typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : '') ||
    (existing && existing.category ? existing.category : '');

  if (requirePublish && !inputCategoryIdentifier) {
    errors.push('Category is required before publishing.');
  }

  const matchedCat = resolveMemeCategory(inputCategoryIdentifier, allCats);
  let categoryId: string;
  let category: string;

  if (matchedCat) {
    categoryId = matchedCat.id;
    category = matchedCat.name;
  } else if (inputCategoryIdentifier) {
    // Preserve unknown/legacy category identity with zero data loss
    categoryId = normalizeSlug(inputCategoryIdentifier) || 'unknown-category';
    category = rawCategoryName || inputCategoryIdentifier;
  } else {
    categoryId = defaultCat.id;
    category = defaultCat.name;
  }

  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : '';

  const imageSrc = typeof raw.imageSrc === 'string' ? raw.imageSrc.trim() : '';
  if (imageSrc.startsWith('data:')) {
    errors.push('Base64 data URLs are not allowed inside meme.json. Upload an image file instead.');
  }
  if (imageSrc.toLowerCase().endsWith('.svg') || imageSrc.toLowerCase().includes('.svg?')) {
    errors.push('SVG images are not allowed for security reasons. Please use PNG, JPG, WEBP, or GIF.');
  }
  if (requirePublish && !imageSrc) {
    errors.push('A meme image is required before publishing. Please upload an image first.');
  }

  const imageAlt =
    typeof raw.imageAlt === 'string' && raw.imageAlt.trim()
      ? raw.imageAlt.trim()
      : '';

  // Canonical publishedAt & publishDate Lifecycle:
  // 1. If status is published:
  //    - If meme already has publishedAt (existing or raw), strictly PRESERVE it!
  //    - If meme only had legacy publishDate, convert to ISO timestamp preserving publication date.
  //    - If never published before (first publication), set publishedAt = nowIso.
  // 2. If status is draft:
  //    - If meme was previously published, strictly PRESERVE publishedAt so republishing doesn't reset chronology.
  //    - For brand new drafts, publishedAt remains undefined.
  const priorPublishedAt =
    (existing && existing.publishedAt) ||
    (typeof raw.publishedAt === 'string' && raw.publishedAt.trim() ? raw.publishedAt.trim() : '');

  const priorPublishDate =
    (existing && existing.publishDate) ||
    (typeof raw.publishDate === 'string' && raw.publishDate.trim() ? raw.publishDate.trim() : '');

  let publishedAt: string | undefined = undefined;
  let publishDate: string | undefined = undefined;

  if (status === 'published') {
    if (priorPublishedAt) {
      publishedAt = priorPublishedAt;
    } else if (priorPublishDate) {
      publishedAt = priorPublishDate.includes('T') ? priorPublishDate : `${priorPublishDate}T00:00:00.000Z`;
    } else {
      publishedAt = nowIso;
    }
    publishDate = publishedAt.split('T')[0];
  } else {
    if (priorPublishedAt) {
      publishedAt = priorPublishedAt;
      publishDate = publishedAt.split('T')[0];
    } else if (priorPublishDate) {
      publishDate = priorPublishDate;
    }
  }

  const featured = Boolean(raw.featured);

  const createdAt =
    (existing && existing.createdAt) ||
    (typeof raw.createdAt === 'string' && raw.createdAt.trim() ? raw.createdAt.trim() : nowIso);
  const updatedAt = nowIso;

  const doc: MemeDocument = {
    id,
    slug,
    status,
    caption,
    description,
    categoryId,
    category,
    imageSrc,
    imageAlt,
    ...(publishedAt ? { publishedAt } : {}),
    ...(publishDate ? { publishDate } : {}),
    featured,
    createdAt,
    updatedAt,
  };

  return {
    valid: errors.length === 0,
    errors,
    document: doc,
  };
}

function resolveMemesDir(): string {
  return path.resolve(process.cwd(), 'src', 'memes');
}

/**
 * Canonical deterministic sorting for memes:
 * 1. publishedAt / publishDate descending
 * 2. updatedAt descending
 * 3. slug alphabetical
 */
export function compareMemes(a: MemeDocument, b: MemeDocument): number {
  const getPubTime = (doc: MemeDocument) => {
    if (doc.publishedAt) {
      const t = new Date(doc.publishedAt).getTime();
      if (!Number.isNaN(t)) return t;
    }
    if (doc.publishDate) {
      const t = new Date(doc.publishDate.includes('T') ? doc.publishDate : `${doc.publishDate}T00:00:00.000Z`).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return 0;
  };

  const pubA = getPubTime(a);
  const pubB = getPubTime(b);
  if (pubA !== pubB) {
    return pubB - pubA;
  }

  const updA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const updB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  if (updA !== updB) {
    return updB - updA;
  }

  return a.slug.localeCompare(b.slug);
}

/**
 * Standalone migration utility for legacy meme.json files in src/memes/.
 * Ensures `categoryId` and `publishedAt` are cleanly persisted if called explicitly.
 * NOTE: Retained as a manual utility only; NEVER called during read queries or build!
 */
export function migrateLegacyMemes(): { migrated: string[] } {
  const memesDir = resolveMemesDir();
  const migrated: string[] = [];
  if (typeof fs === 'undefined' || typeof fs.existsSync !== 'function' || !fs.existsSync(memesDir)) {
    return { migrated };
  }

  try {
    const entries = fs.readdirSync(memesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const slug = entry.name;
      const jsonPath = path.join(memesDir, slug, 'meme.json');
      if (!fs.existsSync(jsonPath)) continue;

      try {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const needsCategoryMigration = !raw.categoryId && Boolean(raw.category);
        const needsPublishedAtMigration = raw.status === 'published' && !raw.publishedAt;

        if (needsCategoryMigration || needsPublishedAtMigration) {
          const normalized = normalizeReadMeme(slug, raw);
          const persistedDoc = {
            id: normalized.id,
            slug: normalized.slug,
            status: normalized.status,
            caption: normalized.caption,
            description: normalized.description || '',
            categoryId: normalized.categoryId,
            imageSrc: normalized.imageSrc,
            imageAlt: normalized.imageAlt || '',
            ...(normalized.publishedAt ? { publishedAt: normalized.publishedAt } : {}),
            ...(normalized.publishDate ? { publishDate: normalized.publishDate } : {}),
            featured: Boolean(normalized.featured),
            createdAt: normalized.createdAt,
            updatedAt: normalized.updatedAt,
          };
          fs.writeFileSync(jsonPath, JSON.stringify(persistedDoc, null, 2), 'utf-8');
          migrated.push(slug);
        }
      } catch (_) {}
    }
  } catch (_) {}

  return { migrated };
}

/**
 * Reads all MemeDocuments from `src/memes/<slug>/meme.json`.
 */
export function getAllMemes(): MemeDocument[] {
  const memesBySlug: Record<string, MemeDocument> = {};
  const memesDir = resolveMemesDir();

  if (typeof fs !== 'undefined' && typeof fs.existsSync === 'function' && fs.existsSync(memesDir)) {
    try {
      const entries = fs.readdirSync(memesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) {
          continue;
        }
        const dirSlug = entry.name;
        const jsonPath = path.join(memesDir, dirSlug, 'meme.json');
        if (!fs.existsSync(jsonPath)) continue;
        try {
          const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          if (raw && typeof raw === 'object') {
            const normalized = normalizeReadMeme(dirSlug, raw);
            memesBySlug[normalized.slug] = normalized;
          }
        } catch (err) {
          console.warn(`[Meme Warning] Failed to parse meme.json in "${dirSlug}":`, err);
        }
      }
      return Object.values(memesBySlug).sort(compareMemes);
    } catch (err) {
      console.warn('[Meme Warning] Failed reading src/memes directory:', err);
    }
  }

  return Object.values(memesBySlug).sort(compareMemes);
}

function normalizeReadMeme(dirSlug: string, raw: any): MemeDocument {
  const nowIso = new Date().toISOString();
  const allCats = getAllMemeCategoryObjects();
  const defaultCat = allCats[0] || DEFAULT_MEME_CATEGORIES[0];

  // Resolve stable categoryId with zero data loss for unknown legacy categories
  const rawCatId = typeof raw.categoryId === 'string' && raw.categoryId.trim() ? raw.categoryId.trim() : '';
  const rawCatName = typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : '';

  let categoryId: string;
  let category: string;

  const matchedCat = resolveMemeCategory(rawCatId || rawCatName, allCats);
  if (matchedCat) {
    categoryId = matchedCat.id;
    category = matchedCat.name;
  } else if (rawCatId || rawCatName) {
    // Preserve unknown legacy category with zero data loss!
    const fallbackName = rawCatName || rawCatId;
    const fallbackId = rawCatId || normalizeSlug(rawCatName) || 'unknown-category';
    categoryId = fallbackId;
    category = fallbackName;
  } else {
    categoryId = defaultCat.id;
    category = defaultCat.name;
  }

  // Resolve publishedAt & publishDate
  let publishedAt: string | undefined = undefined;
  if (typeof raw.publishedAt === 'string' && raw.publishedAt.trim()) {
    publishedAt = raw.publishedAt.trim();
  } else if (raw.status === 'published') {
    if (typeof raw.publishDate === 'string' && raw.publishDate.trim()) {
      publishedAt = raw.publishDate.includes('T') ? raw.publishDate : `${raw.publishDate}T00:00:00.000Z`;
    } else {
      publishedAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso;
    }
  }

  const publishDate =
    typeof raw.publishDate === 'string' && raw.publishDate.trim()
      ? raw.publishDate.trim()
      : (publishedAt ? publishedAt.split('T')[0] : '');

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `meme_${dirSlug}`,
    slug: dirSlug,
    status: raw.status === 'published' ? 'published' : 'draft',
    caption: typeof raw.caption === 'string' ? raw.caption : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    categoryId,
    category,
    imageSrc: typeof raw.imageSrc === 'string' ? raw.imageSrc : '',
    imageAlt: typeof raw.imageAlt === 'string' ? raw.imageAlt : '',
    ...(publishedAt ? { publishedAt } : {}),
    ...(publishDate ? { publishDate } : {}),
    featured: Boolean(raw.featured),
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : nowIso,
  };
}

/**
 * Returns only published memes (status === 'published').
 */
export function getPublishedMemes(): MemeDocument[] {
  return getAllMemes().filter((meme) => meme.status === 'published');
}

/**
 * Returns only draft memes (status === 'draft').
 */
export function getDraftMemes(): MemeDocument[] {
  return getAllMemes().filter((meme) => meme.status === 'draft');
}

/**
 * Finds a single meme by its slug.
 */
export function getMemeBySlug(slug: string): MemeDocument | undefined {
  if (!slug || typeof slug !== 'string') return undefined;
  const clean = slug.trim();
  return getAllMemes().find((meme) => meme.slug === clean);
}

/**
 * Finds a single meme by its stable ID.
 */
export function getMemeById(id: string): MemeDocument | undefined {
  if (!id || typeof id !== 'string') return undefined;
  const clean = id.trim();
  return getAllMemes().find((meme) => meme.id === clean);
}
