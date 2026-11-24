/**
 * Coven Article System — Canonical Saved Color Palette Manager
 *
 * Centralized, decoupled storage and validation service for author-saved custom colors.
 * Shared across Callout, Pullquote, Rich Text (color & highlight), and future blocks.
 */

import { isValidHexColor, sanitizeHexColor } from './article-accents.ts';

export const PRIMARY_SAVED_COLORS_KEY = 'covenArticleStudio:savedColors';
export const LEGACY_SAVED_COLORS_KEY = 'coven.articleStudio.savedColors.v1';
export const DEFAULT_SAVED_COLORS = ['#C45AFF', '#52E8A5'];
export const MAX_PALETTE_SIZE = 24;

export interface PaletteOperationResult {
  success: boolean;
  color: string | null;
  palette: string[];
  message: string;
  alreadyExisted?: boolean;
}

/**
 * Loads and sanitizes the shared saved color palette from localStorage.
 * Performs transparent migration from legacy key if found.
 * Deterministic ordering: oldest -> newest.
 */
export function getSavedPalette(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SAVED_COLORS.slice();
  }

  try {
    let raw = window.localStorage.getItem(PRIMARY_SAVED_COLORS_KEY);
    if (!raw) {
      // Check legacy key
      const legacyRaw = window.localStorage.getItem(LEGACY_SAVED_COLORS_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
        // Migrate to primary key
        try {
          window.localStorage.setItem(PRIMARY_SAVED_COLORS_KEY, legacyRaw);
        } catch (e) {}
      }
    }

    if (!raw) {
      try {
        window.localStorage.setItem(PRIMARY_SAVED_COLORS_KEY, JSON.stringify(DEFAULT_SAVED_COLORS));
        window.localStorage.setItem(LEGACY_SAVED_COLORS_KEY, JSON.stringify(DEFAULT_SAVED_COLORS));
      } catch (e) {}
      return DEFAULT_SAVED_COLORS.slice();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_SAVED_COLORS.slice();
    }

    // Sanitize and deduplicate case-insensitively
    const sanitized: string[] = [];
    const seen = new Set<string>();

    for (const item of parsed) {
      const clean = sanitizeHexColor(item);
      if (clean && !seen.has(clean.toUpperCase())) {
        seen.add(clean.toUpperCase());
        sanitized.push(clean);
        if (sanitized.length >= MAX_PALETTE_SIZE) break;
      }
    }

    return sanitized.length > 0 ? sanitized : DEFAULT_SAVED_COLORS.slice();
  } catch (err) {
    console.warn('[Coven Palette] Failed to load saved colors from storage:', err);
    return DEFAULT_SAVED_COLORS.slice();
  }
}

/**
 * Persists a list of validated hex strings to localStorage.
 * Writes to both primary and legacy keys for 100% backward compatibility.
 */
export function persistSavedPalette(colors: string[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload = JSON.stringify(colors);
    window.localStorage.setItem(PRIMARY_SAVED_COLORS_KEY, payload);
    window.localStorage.setItem(LEGACY_SAVED_COLORS_KEY, payload);
  } catch (err) {
    console.warn('[Coven Palette] Failed to persist saved colors to storage:', err);
  }
}

/**
 * Adds a color to the shared palette.
 * Returns operation result including whether it already existed.
 */
export function addColorToPalette(rawHex: unknown): PaletteOperationResult {
  const clean = sanitizeHexColor(rawHex);
  if (!clean) {
    return {
      success: false,
      color: null,
      palette: getSavedPalette(),
      message: 'Invalid HEX color format. Expected #RGB or #RRGGBB.',
    };
  }

  const current = getSavedPalette();
  const exists = current.some((c) => c.toUpperCase() === clean.toUpperCase());

  if (exists) {
    return {
      success: true,
      color: clean,
      palette: current,
      alreadyExisted: true,
      message: `${clean} is already in My Colors`,
    };
  }

  if (current.length >= MAX_PALETTE_SIZE) {
    return {
      success: false,
      color: clean,
      palette: current,
      message: `Palette limit reached (maximum ${MAX_PALETTE_SIZE} colors). Remove an older color first.`,
    };
  }

  // Add to palette (newest appended, deterministic ordering: oldest -> newest)
  const updated = [...current, clean];
  persistSavedPalette(updated);

  return {
    success: true,
    color: clean,
    palette: updated,
    alreadyExisted: false,
    message: `Saved ${clean} to My Colors`,
  };
}

/**
 * Removes a color from the shared palette.
 * Does not mutate any article blocks or drafts.
 */
export function removeColorFromPalette(rawHex: unknown): PaletteOperationResult {
  const clean = sanitizeHexColor(rawHex);
  if (!clean) {
    return {
      success: false,
      color: null,
      palette: getSavedPalette(),
      message: 'Invalid HEX color.',
    };
  }

  const current = getSavedPalette();
  const filtered = current.filter((c) => c.toUpperCase() !== clean.toUpperCase());

  persistSavedPalette(filtered);

  return {
    success: true,
    color: clean,
    palette: filtered,
    message: `Removed ${clean} from My Colors`,
  };
}
