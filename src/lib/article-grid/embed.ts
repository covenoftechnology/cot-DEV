/**
 * COVEN ARTICLE SYSTEM — CANONICAL EMBED URL PARSING & SANITIZATION
 * Safe URL validation, privacy-enhanced video embed src resolution,
 * iframe sandbox security policy, and external link sanitization for canonical Article Reader.
 */

export interface ParsedVideoUrl {
  type: 'youtube' | 'vimeo' | 'direct' | 'unknown';
  embedSrc?: string;
}

export interface IframePolicy {
  sandbox: string;
  isTrusted: boolean;
  provider?: string;
}

/**
 * Strictly allow only http: and https: protocols to prevent javascript: or data: injection.
 * Validates that the URL can be parsed successfully by the standard URL constructor.
 */
export function sanitizeEmbedUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
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
 * Preferred security model:
 * 1. Untrusted generic URLs receive minimal sandbox: `allow-scripts allow-forms`.
 *    - `allow-same-origin` is NEVER granted by default, ensuring the framed content
 *      operates in an opaque ("null") origin and cannot read parent DOM, cookies, or storage.
 *    - `allow-popups` is NOT granted by default.
 *    - Combining `allow-scripts` and `allow-same-origin` is strictly forbidden for all embeds,
 *      preventing sandboxed frames from removing their own sandbox attribute.
 * 2. Trusted form/interactive providers (e.g., Google Forms, Typeform, Airtable, Tally, JotForm)
 *    may receive `allow-popups` for external sign-in flows (e.g., Google Auth),
 *    but NEVER receive `allow-same-origin`.
 * 3. Same-origin or local Coven URLs (e.g. covenoftechnology.cloud, localhost)
 *    receive strictly restricted capabilities without `allow-same-origin`,
 *    preventing accidental parent privilege escalation or storage access.
 */
export function getIframePolicy(url: string): IframePolicy {
  const safe = sanitizeEmbedUrl(url);
  if (!safe) {
    return { sandbox: '', isTrusted: false };
  }

  try {
    const parsed = new URL(safe);
    const host = parsed.hostname.toLowerCase();

    // Check for trusted form and interactive providers
    if (host === 'docs.google.com' || host.endsWith('.google.com')) {
      return {
        sandbox: 'allow-scripts allow-forms allow-popups',
        isTrusted: true,
        provider: 'google-forms',
      };
    }

    if (host === 'typeform.com' || host.endsWith('.typeform.com')) {
      return {
        sandbox: 'allow-scripts allow-forms allow-popups',
        isTrusted: true,
        provider: 'typeform',
      };
    }

    if (host === 'airtable.com' || host.endsWith('.airtable.com')) {
      return {
        sandbox: 'allow-scripts allow-forms allow-popups',
        isTrusted: true,
        provider: 'airtable',
      };
    }

    if (host === 'tally.so' || host.endsWith('.tally.so')) {
      return {
        sandbox: 'allow-scripts allow-forms allow-popups',
        isTrusted: true,
        provider: 'tally',
      };
    }

    if (host === 'jotform.com' || host.endsWith('.jotform.com')) {
      return {
        sandbox: 'allow-scripts allow-forms allow-popups',
        isTrusted: true,
        provider: 'jotform',
      };
    }
  } catch {
    // Fall back to generic restricted sandbox
  }

  // Generic untrusted external embed or same-origin URL:
  // Strictly minimal: `allow-scripts allow-forms`
  // OMIT allow-same-origin: prevents host DOM/cookie/storage access
  // OMIT allow-popups: prevents spawning new windows
  // OMIT allow-top-navigation: prevents parent navigation
  return {
    sandbox: 'allow-scripts allow-forms',
    isTrusted: false,
    provider: 'generic',
  };
}
