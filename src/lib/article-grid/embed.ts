/**
 * COVEN ARTICLE SYSTEM — CANONICAL EMBED URL PARSING & SANITIZATION
 * Universal URL validation, privacy-enhanced video embed src resolution,
 * iframe sandbox security policy, and external link sanitization for canonical Article Reader.
 *
 * Core Rule:
 * An author can paste ANY syntactically valid HTTPS URL and Coven will attempt to embed it.
 * No provider allowlist is required for iframe embedding.
 * Known providers receive specialized optimizations, but unknown valid HTTPS URLs remain fully supported.
 */

export interface ParsedVideoUrl {
  type: 'youtube' | 'vimeo' | 'loom' | 'direct' | 'unknown';
  embedSrc?: string;
}

export interface IframePolicy {
  sandbox: string;
  isTrusted: boolean;
  provider: string;
  isSameOrigin: boolean;
  allow?: string;
}

export const ALLOWED_EMBED_TYPES = ['image', 'video', 'link', 'iframe'] as const;
export type AllowedEmbedType = (typeof ALLOWED_EMBED_TYPES)[number];

/**
 * Checks whether a URL string is a safe Coven-managed draft upload or published article image path.
 * Rejects path traversal ('..'), double slashes ('//'), query strings, or unsafe characters.
 */
export function isSafeManagedAssetEmbedPath(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes('..') || trimmed.includes('//') || trimmed.includes('\\')) return false;
  return (
    /^\/__article-studio\/uploads\/[a-zA-Z0-9._-]+$/.test(trimmed) ||
    /^\/articles\/[a-z0-9-]+\/images\/[a-zA-Z0-9._-]+$/.test(trimmed)
  );
}

/**
 * Checks whether a URL is same-origin to Coven parent application.
 * Matches relative paths (/...), local development origins, and production Coven domains.
 */
export function isSameOriginUrl(url: string, baseOrigin?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Root-relative paths (starting with / but not //) are same-origin
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    // Known Coven production and development hosts
    if (
      host === 'covenoftechnology.cloud' ||
      host.endsWith('.covenoftechnology.cloud') ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.local')
    ) {
      return true;
    }

    if (baseOrigin) {
      const baseParsed = new URL(baseOrigin);
      if (parsed.origin.toLowerCase() === baseParsed.origin.toLowerCase()) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Strictly allow only http: and https: protocols (plus safe Coven-managed image paths and relative paths)
 * to prevent javascript:, data:, vbscript:, or file: injection.
 */
export function sanitizeEmbedUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (isSafeManagedAssetEmbedPath(trimmed)) {
    return trimmed;
  }

  // Reject dangerous schemes explicitly
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return '';
  }

  // Allow relative URLs starting with / (excluding //) for same-origin preview
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return trimmed;
    }
    if (parsed.protocol === 'http:') {
      // Allow localhost / 127.0.0.1 or dev servers, and pass through other http URLs
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * Validates an Embed block's data payload for canonical Publish & Studio validation.
 * Enforces allowed embedType, non-empty safe URL, and rejects raw HTML/script or forbidden schemes.
 * ACCEPTS ANY VALID HTTPS OR HTTP URL — NO HOSTNAME OR PROVIDER RESTRICTION.
 */
export function validateEmbedBlockData(
  data: unknown,
  contextLabel = 'Embed block'
): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: `${contextLabel}: Invalid embed block data.` };
  }
  const d = data as Record<string, unknown>;

  // Reject raw HTML / script injection fields
  for (const forbiddenKey of ['html', 'rawHtml', 'script', 'embedCode']) {
    if (typeof d[forbiddenKey] === 'string' && String(d[forbiddenKey]).trim().length > 0) {
      return {
        valid: false,
        error: `${contextLabel}: Raw HTML or script fields ("${forbiddenKey}") are forbidden in Embed blocks.`,
      };
    }
  }

  const embedType = String(d.embedType || '').trim();
  if (!ALLOWED_EMBED_TYPES.includes(embedType as AllowedEmbedType)) {
    return {
      valid: false,
      error: `${contextLabel}: Invalid embedType "${embedType}". Allowed modes: image, video, link, iframe.`,
    };
  }

  const rawUrl = typeof d.url === 'string' ? d.url.trim() : '';
  if (!rawUrl) {
    return {
      valid: false,
      error: `${contextLabel}: Embed URL is required.`,
    };
  }

  if (/<script|<iframe|<object|<embed|onerror\s*=|onload\s*=/i.test(rawUrl)) {
    return {
      valid: false,
      error: `${contextLabel}: Raw HTML or script content is forbidden in Embed URL.`,
    };
  }

  if (/^(javascript|data|vbscript|file):/i.test(rawUrl)) {
    return {
      valid: false,
      error: `${contextLabel}: Unsafe URL scheme in "${rawUrl}". Only http(s) URLs (and managed uploads for image embeds) are allowed.`,
    };
  }

  if (embedType === 'image' && isSafeManagedAssetEmbedPath(rawUrl)) {
    return { valid: true };
  }

  // Same-origin relative URLs allowed
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
    return { valid: true };
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    return {
      valid: false,
      error: `${contextLabel}: Embed mode "${embedType}" requires a valid http:// or https:// URL.`,
    };
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `${contextLabel}: Unsupported URL protocol "${parsed.protocol}".`,
      };
    }
  } catch {
    return {
      valid: false,
      error: `${contextLabel}: Malformed URL "${rawUrl}".`,
    };
  }

  return { valid: true };
}

/**
 * Resolve video URL into privacy-enhanced iframe src or HTML5 direct video source.
 */
export function parseVideoUrl(url: string): ParsedVideoUrl {
  if (!url || typeof url !== 'string') return { type: 'unknown' };
  const u = url.trim();

  // YouTube match: watch?v=ID, youtu.be/ID, embed/ID
  const ytMatch = u.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedSrc: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`,
    };
  }

  // Vimeo match: vimeo.com/ID or player.vimeo.com/video/ID
  const vimeoMatch = u.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedSrc: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Loom match: loom.com/share/ID or loom.com/embed/ID
  const loomMatch = u.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      type: 'loom',
      embedSrc: `https://www.loom.com/embed/${loomMatch[1]}`,
    };
  }

  // Direct video file (.mp4, .webm, .ogg)
  if (/\.(mp4|webm|ogg)($|\?)/i.test(u)) {
    return {
      type: 'direct',
      embedSrc: u,
    };
  }

  return { type: 'unknown', embedSrc: u };
}

/**
 * Evaluates the required iframe sandbox policy based on the target URL.
 *
 * Security Architecture:
 * 1. SAME-ORIGIN SAFETY:
 *    If an iframe URL matches the Coven parent origin (covenoftechnology.cloud, localhost, or relative path),
 *    we DO NOT combine `allow-scripts` + `allow-same-origin`.
 *    Combining both on same-origin frames allows framed documents to reach `window.parent`, access parent cookies/storage,
 *    and strip the sandbox attribute.
 *    Therefore, same-origin frames receive: `sandbox="allow-scripts allow-forms allow-presentation"`.
 *
 * 2. UNIVERSAL CROSS-ORIGIN POLICY:
 *    For cross-origin external URLs, browser Same-Origin Policy (SOP) ALREADY prevents the framed document
 *    from accessing parent Coven DOM, cookies, or storage.
 *    To maximize compatibility with interactive widgets, forms, code sandboxes, and authentication popups,
 *    external cross-origin frames receive:
 *    `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"`
 *    - `allow-same-origin`: allows the widget to access its own origin's localStorage and APIs (preventing null-origin crashes).
 *    - `allow-popups`: allows interactive sign-in and modal dialogs.
 *    - Strictly OMITTED: `allow-top-navigation`, `allow-popups-to-escape-sandbox`, `allow-downloads`.
 *
 * 3. NO PROVIDER GATEKEEPING:
 *    Known provider recognition (Google Forms, Typeform, Airtable, CodePen, etc.) is used solely for
 *    metadata classification and specialized features.
 *    ANY valid HTTPS URL is granted the universal cross-origin policy.
 */
export function getIframePolicy(url: string, baseOrigin?: string): IframePolicy {
  const safe = sanitizeEmbedUrl(url);
  if (!safe) {
    return { sandbox: '', isTrusted: false, provider: 'none', isSameOrigin: false };
  }

  // 1. Same-Origin Coven Safety Check
  const sameOrigin = isSameOriginUrl(safe, baseOrigin);
  if (sameOrigin) {
    return {
      sandbox: 'allow-scripts allow-forms allow-presentation',
      isTrusted: true,
      provider: 'coven-same-origin',
      isSameOrigin: true,
      allow: 'accelerometer; autoplay; encrypted-media; picture-in-picture',
    };
  }

  // 2. Cross-Origin External URLs — Provider Recognition (Non-exclusive)
  let provider = 'generic';
  let isTrusted = false;

  try {
    const parsed = new URL(safe);
    const host = parsed.hostname.toLowerCase();

    if (host === 'docs.google.com' || host.endsWith('.google.com') || host === 'forms.gle') {
      provider = host.includes('forms') || parsed.pathname.includes('/forms/') ? 'google-forms' : 'google-docs';
      isTrusted = true;
    } else if (host === 'typeform.com' || host.endsWith('.typeform.com')) {
      provider = 'typeform';
      isTrusted = true;
    } else if (host === 'airtable.com' || host.endsWith('.airtable.com')) {
      provider = 'airtable';
      isTrusted = true;
    } else if (host === 'tally.so' || host.endsWith('.tally.so')) {
      provider = 'tally';
      isTrusted = true;
    } else if (host === 'jotform.com' || host.endsWith('.jotform.com')) {
      provider = 'jotform';
      isTrusted = true;
    } else if (host === 'codepen.io' || host.endsWith('.codepen.io')) {
      provider = 'codepen';
      isTrusted = true;
    } else if (host === 'figma.com' || host.endsWith('.figma.com')) {
      provider = 'figma';
      isTrusted = true;
    } else if (host === 'spotify.com' || host.endsWith('.spotify.com')) {
      provider = 'spotify';
      isTrusted = true;
    } else if (host === 'soundcloud.com' || host.endsWith('.soundcloud.com')) {
      provider = 'soundcloud';
      isTrusted = true;
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
      provider = 'youtube';
      isTrusted = true;
    } else if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      provider = 'vimeo';
      isTrusted = true;
    } else if (host === 'loom.com' || host.endsWith('.loom.com')) {
      provider = 'loom';
      isTrusted = true;
    }
  } catch {
    // If URL parsing fails, provider remains 'generic'
  }

  // Universal Cross-Origin External Sandbox Policy
  return {
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups',
    isTrusted,
    provider,
    isSameOrigin: false,
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
  };
}
