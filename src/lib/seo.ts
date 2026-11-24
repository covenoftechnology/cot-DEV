/**
 * Canonical SEO and Social Sharing Constants & Helpers for Coven of Technology
 * 
 * Single source of truth for site origin is `astro.config.mjs` via `Astro.site`.
 * No hardcoded domain declarations exist here.
 */

export const SITE_NAME = 'Coven of Technology';

export const DEFAULT_SITE_DESCRIPTION =
  'Read the scrolls, pass the trials, and rise from Novice to Archmage — a gamified grimoire of Salesforce mastery, mentorship, and business analysis.';

export const GENERIC_ARTICLE_FALLBACK_DESCRIPTION =
  'Study the scrolls of Coven of Technology and uncover practical knowledge from the grimoire.';

export const DEFAULT_SOCIAL_IMAGE = '/social/coven-share-default.png';
export const DEFAULT_SOCIAL_IMAGE_ALT = 'Coven of Technology crystal ball';
export const FALLBACK_IMAGE_WIDTH = 1200;
export const FALLBACK_IMAGE_HEIGHT = 630;

/**
 * Normalizes an origin input (URL object from Astro.site, string, or undefined).
 */
export function resolveOrigin(origin?: string | URL | null): string {
  if (!origin) return '';
  if (typeof origin === 'string') {
    return origin.trim().replace(/\/+$/, '');
  }
  if (typeof origin === 'object' && origin !== null && 'origin' in origin) {
    return origin.origin || origin.toString().replace(/\/+$/, '');
  }
  return String(origin).replace(/\/+$/, '');
}

/**
 * Converts a relative or absolute path into an absolute production URL using the configured site origin.
 */
export function toAbsoluteUrl(pathOrUrl?: string, origin?: string | URL | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  // Already an absolute URL with scheme
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = resolveOrigin(origin);
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Normalizes article canonical URLs ensuring a consistent trailing slash.
 */
export function getArticleCanonicalUrl(slug: string, origin?: string | URL | null): string {
  const cleanSlug = slug.trim().replace(/^\/+|\/+$/g, '');
  const base = resolveOrigin(origin);
  const path = `/article/${cleanSlug}/`;
  return base ? `${base}${path}` : path;
}

/**
 * Validates whether an article cover image source is safe and valid for public social sharing.
 * Rejects insecure HTTP, protocol-relative URLs, favicons, private authoring/upload paths,
 * loopback/localhost references, and unsafe schemes.
 * Only HTTPS external URLs (https://...) and canonical site-relative paths are accepted.
 */
export function isValidSocialCoverUrl(cover?: string | null): boolean {
  if (!cover || typeof cover !== 'string') return false;
  const trimmed = cover.trim();
  if (!trimmed) return false;

  // Reject protocol-relative URLs
  if (trimmed.startsWith('//')) {
    return false;
  }

  // Reject favicon placeholders
  if (
    trimmed === '/favicon.svg' ||
    trimmed === '/favicon.ico' ||
    trimmed.endsWith('/favicon.svg') ||
    trimmed.endsWith('/favicon.ico')
  ) {
    return false;
  }

  // Reject private draft/authoring directories
  if (
    trimmed.includes('.article-studio') ||
    trimmed.includes('.user_uploaded') ||
    trimmed.includes('/tmp/') ||
    trimmed.includes('temp_')
  ) {
    return false;
  }

  // Reject localhost or loopback addresses in published metadata
  if (/(?:^https?:\/\/|^)(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/i.test(trimmed)) {
    return false;
  }

  // Reject insecure HTTP remote URLs (Section 1 & 2)
  if (/^http:\/\//i.test(trimmed)) {
    return false;
  }

  // Reject unsafe schemes (javascript:, data:, file:, blob:, vbscript:, etc.)
  if (/^(javascript|data|file|blob|vbscript):/i.test(trimmed)) {
    return false;
  }

  // If any scheme is present, ONLY https:// is permitted for social images
  if (/^[a-z0-9+.-]+:/i.test(trimmed) && !/^https:\/\//i.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Resolves the canonical public author profile URL for Open Graph article:author.
 * Open Graph specifies that article:author must be a profile URL, not plain text.
 * Only authors with a real, existing public profile route receive an article:author tag.
 */
export function getAuthorProfileUrl(author?: string | null, origin?: string | URL | null): string | undefined {
  if (!author || typeof author !== 'string') return undefined;
  const trimmed = author.trim().toLowerCase();
  if (trimmed === 'mich alvarez' || trimmed === 'mich') {
    return toAbsoluteUrl('/about/', origin);
  }
  // Other authors (e.g. Oracle of Orgs, Jane Doe) have no public profile URL; return undefined
  return undefined;
}

/**
 * Strips HTML tags, decodes common entities, and collapses whitespace.
 */
export function stripHtmlToPlainText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncates text cleanly at word boundaries within target length (140-200 chars).
 */
export function truncateToExcerpt(text: string, maxLen = 180): string {
  if (text.length <= maxLen) return text;
  const sub = text.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  const clean = (lastSpace > 60 ? sub.slice(0, lastSpace) : sub).trim();
  return clean.replace(/[.,;:!?—\s]+$/, '') + '…';
}
