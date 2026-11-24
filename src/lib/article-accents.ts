/**
 * Coven Article System — Canonical Accent Colors & Callout Styles Registry
 *
 * Centralized definition for:
 * 1. The 10 Canonical Callout Styles (Grimoire, Oracle, Insight, Warning, Archive,
 *    Celestial, Alchemist, Forbidden, Moonlit, Verdict).
 * 2. The Shared Canonical Accent Color Palette (Default, Gold, Purple, Emerald, Rose, Moonlight, Crimson).
 * 3. Color normalization and CSS variable resolvers.
 */

export interface AccentDefinition {
  key: string;
  label: string;
  hex: string;
  rgb: string;
  softRgba: string;
  borderRgba: string;
  glowRgba: string;
}

export function hexToRgbTriplet(hex: string): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  if (isNaN(num)) return '216, 181, 107';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgbTriplet(hex)}, ${alpha})`;
}

export const CANONICAL_ACCENTS: Record<string, AccentDefinition> = {
  gold: {
    key: 'gold',
    label: 'Gold',
    hex: '#d8b56b',
    rgb: '216, 181, 107',
    softRgba: 'rgba(216, 181, 107, 0.08)',
    borderRgba: 'rgba(216, 181, 107, 0.35)',
    glowRgba: 'rgba(216, 181, 107, 0.25)',
  },
  purple: {
    key: 'purple',
    label: 'Purple',
    hex: '#b98fd8',
    rgb: '185, 143, 216',
    softRgba: 'rgba(185, 143, 216, 0.08)',
    borderRgba: 'rgba(185, 143, 216, 0.35)',
    glowRgba: 'rgba(185, 143, 216, 0.25)',
  },
  emerald: {
    key: 'emerald',
    label: 'Emerald',
    hex: '#52e8a5',
    rgb: '82, 232, 165',
    softRgba: 'rgba(82, 232, 165, 0.08)',
    borderRgba: 'rgba(82, 232, 165, 0.35)',
    glowRgba: 'rgba(82, 232, 165, 0.25)',
  },
  rose: {
    key: 'rose',
    label: 'Rose',
    hex: '#e06b9f',
    rgb: '224, 107, 159',
    softRgba: 'rgba(224, 107, 159, 0.08)',
    borderRgba: 'rgba(224, 107, 159, 0.35)',
    glowRgba: 'rgba(224, 107, 159, 0.25)',
  },
  moonlight: {
    key: 'moonlight',
    label: 'Moonlight',
    hex: '#7eb2ff',
    rgb: '126, 178, 255',
    softRgba: 'rgba(126, 178, 255, 0.08)',
    borderRgba: 'rgba(126, 178, 255, 0.35)',
    glowRgba: 'rgba(126, 178, 255, 0.25)',
  },
  crimson: {
    key: 'crimson',
    label: 'Crimson',
    hex: '#e05656',
    rgb: '224, 86, 86',
    softRgba: 'rgba(224, 86, 86, 0.09)',
    borderRgba: 'rgba(224, 86, 86, 0.4)',
    glowRgba: 'rgba(224, 86, 86, 0.25)',
  },
};

export const CANONICAL_ACCENT_KEYS = [
  'gold',
  'purple',
  'emerald',
  'rose',
  'moonlight',
  'crimson',
] as const;

/**
 * Validates whether an author-supplied value is a strict HEX color string.
 * Strictly accepts '#RGB' or '#RRGGBB'.
 * Rejects CSS injection, names, var(), url(), script, calc, etc.
 */
export function isValidHexColor(hex: unknown): boolean {
  if (!hex || typeof hex !== 'string') return false;
  const trimmed = hex.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
}

/**
 * Sanitizes and normalizes a valid hex string to canonical uppercase '#RRGGBB'.
 * Returns null for any invalid input.
 */
export function sanitizeHexColor(hex: unknown): string | null {
  if (!isValidHexColor(hex)) return null;
  const trimmed = (hex as string).trim();
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

/**
 * Creates a complete AccentDefinition from an arbitrary valid hex color.
 */
export function createCustomAccentDefinition(hex: string): AccentDefinition {
  const cleanHex = sanitizeHexColor(hex) || '#C45AFF';
  return {
    key: 'custom',
    label: cleanHex,
    hex: cleanHex,
    rgb: hexToRgbTriplet(cleanHex),
    softRgba: hexToRgba(cleanHex, 0.08),
    borderRgba: hexToRgba(cleanHex, 0.35),
    glowRgba: hexToRgba(cleanHex, 0.25),
  };
}

export interface ResolveAccentParams {
  style?: string | null;
  accentColor?: string | null;
  accentCustomColor?: string | null;
}

/**
 * Shared Accent Color Resolver for Callout and Pullquote blocks.
 *
 * Resolution order:
 * 1. Valid Custom color (author's explicit custom hex override)
 * 2. Preset accent (author's semantic token override: gold, purple, emerald, rose, moonlight, crimson)
 * 3. Style canonical Default (Callout style's default accent; Pullquote defaults to null for legacy styling).
 */
export function resolveAccentColor(
  params?: ResolveAccentParams | string | null,
  legacyCustomHex?: string | null
): AccentDefinition | null {
  let style: string | null | undefined = null;
  let accentColor: string | null | undefined = null;
  let accentCustomColor: string | null | undefined = null;

  if (params && typeof params === 'object') {
    style = params.style;
    accentColor = params.accentColor;
    accentCustomColor = params.accentCustomColor;
  } else if (typeof params === 'string') {
    accentColor = params;
    accentCustomColor = legacyCustomHex;
  }

  // 1. Valid Custom color
  // Case A: Explicit accentColor === 'custom' with valid accentCustomColor
  if (accentColor === 'custom' && accentCustomColor && isValidHexColor(accentCustomColor)) {
    return createCustomAccentDefinition(accentCustomColor);
  }

  // Case B: accentCustomColor provided and valid
  if (accentCustomColor && isValidHexColor(accentCustomColor)) {
    return createCustomAccentDefinition(accentCustomColor);
  }

  // Case C: Legacy data where accentColor itself was stored as direct hex (e.g. "#52E8A5" or "#C45AFF")
  if (accentColor && isValidHexColor(accentColor)) {
    const cleanHex = sanitizeHexColor(accentColor)!;
    // If it strictly equals a canonical preset hex, return that preset
    const lowerHex = cleanHex.toLowerCase();
    for (const key of Object.keys(CANONICAL_ACCENTS)) {
      if (CANONICAL_ACCENTS[key].hex.toLowerCase() === lowerHex) {
        return CANONICAL_ACCENTS[key];
      }
    }
    return createCustomAccentDefinition(cleanHex);
  }

  // 2. Preset accent
  if (accentColor && typeof accentColor === 'string') {
    const lower = accentColor.trim().toLowerCase();
    if (CANONICAL_ACCENTS[lower]) {
      return CANONICAL_ACCENTS[lower];
    }
  }

  // 3. Style canonical Default (if style is provided)
  if (style) {
    const normStyle = normalizeCalloutStyle(style);
    const styleDef = CALLOUT_STYLES[normStyle] || CALLOUT_STYLES.grimoire;
    return CANONICAL_ACCENTS[styleDef.defaultAccent] || CANONICAL_ACCENTS.gold;
  }

  return null;
}

/**
 * Normalizes an author-specified accent color.
 * Supports:
 * - Semantic tokens: 'gold', 'purple', 'emerald', 'rose', 'moonlight', 'crimson'
 * - Custom valid hex colors (#RRGGBB or #RGB) -> synthesized AccentDefinition
 * - Empty / 'default' / null / undefined -> null (indicating style default)
 */
export function normalizeAccentColor(accent?: string | null, customHex?: string | null): AccentDefinition | null {
  return resolveAccentColor({ accentColor: accent, accentCustomColor: customHex });
}

export interface CalloutStyleDefinition {
  id: string;
  name: string;
  sigil: string;
  defaultTitle: string;
  defaultAccent: string;
  description: string;
}

export const CALLOUT_STYLES: Record<string, CalloutStyleDefinition> = {
  grimoire: {
    id: 'grimoire',
    name: 'Grimoire',
    sigil: '☽',
    defaultTitle: 'Grimoire Note',
    defaultAccent: 'gold',
    description: 'Contextual notes and important principles',
  },
  oracle: {
    id: 'oracle',
    name: 'Oracle',
    sigil: '“',
    defaultTitle: 'Oracle Whisper',
    defaultAccent: 'purple',
    description: 'Quotes, reflections, and deep guidance',
  },
  insight: {
    id: 'insight',
    name: 'Insight',
    sigil: '✦',
    defaultTitle: 'Arcane Insight',
    defaultAccent: 'purple',
    description: 'Tips, discoveries, and reusable patterns',
  },
  warning: {
    id: 'warning',
    name: 'Warning',
    sigil: '⚠',
    defaultTitle: 'Ritual Warning',
    defaultAccent: 'crimson',
    description: 'Cautionary notes and dangerous configurations',
  },
  archive: {
    id: 'archive',
    name: 'Archive',
    sigil: '⌜',
    defaultTitle: 'Runic Archive',
    defaultAccent: 'gold',
    description: 'Technical references, schemas, and endpoints',
  },
  celestial: {
    id: 'celestial',
    name: 'Celestial',
    sigil: '✦',
    defaultTitle: 'Celestial Revelation',
    defaultAccent: 'purple',
    description: 'Featured discoveries and core architecture',
  },
  alchemist: {
    id: 'alchemist',
    name: 'Alchemist',
    sigil: '⚗',
    defaultTitle: 'Alchemist Formula',
    defaultAccent: 'emerald',
    description: 'Recipes, formulas, and process steps',
  },
  forbidden: {
    id: 'forbidden',
    name: 'Forbidden',
    sigil: '☿',
    defaultTitle: 'Forbidden Knowledge',
    defaultAccent: 'rose',
    description: 'Antipatterns and hazardous pitfalls',
  },
  moonlit: {
    id: 'moonlit',
    name: 'Moonlit',
    sigil: '☾',
    defaultTitle: 'Moonlit Guidance',
    defaultAccent: 'moonlight',
    description: 'Best practices and recommended paths',
  },
  verdict: {
    id: 'verdict',
    name: 'Verdict',
    sigil: '◆',
    defaultTitle: 'Sealed Verdict',
    defaultAccent: 'gold',
    description: 'Conclusions, outcomes, and final verdicts',
  },
};

export const CALLOUT_STYLE_KEYS = [
  'grimoire',
  'oracle',
  'insight',
  'warning',
  'archive',
  'celestial',
  'alchemist',
  'forbidden',
  'moonlit',
  'verdict',
] as const;

/**
 * Normalizes callout style variant.
 * Maps legacy variants:
 * - 'note' -> 'grimoire'
 * - 'info' -> 'insight'
 * - 'tip' -> 'moonlit'
 * - 'warning' -> 'warning'
 */
export function normalizeCalloutStyle(rawType?: string | null): string {
  if (!rawType || typeof rawType !== 'string') return 'grimoire';
  const t = rawType.toLowerCase().trim();

  // Legacy mappings
  if (t === 'note') return 'grimoire';
  if (t === 'info') return 'insight';
  if (t === 'tip') return 'moonlit';
  if (t === 'warning') return 'warning';

  if (CALLOUT_STYLES[t]) return t;
  return 'grimoire';
}

/* ── Composable Callout Visual Modifiers (Surface, Fade Direction, Border) ── */

export type CalloutSurfaceStyle = 'solid' | 'faded' | 'transparent';
export type CalloutFadeDirection = 'ltr' | 'rtl' | 'ttb' | 'btt';
export type CalloutBorderStyle =
  | 'none'
  | 'frame'
  | 'left-line'
  | 'right-line'
  | 'top-bottom'
  | 'corners';

export interface CalloutSurfaceOption {
  id: CalloutSurfaceStyle;
  label: string;
}

export interface CalloutFadeDirectionOption {
  id: CalloutFadeDirection;
  label: string;
  arrow: string;
}

export interface CalloutBorderOption {
  id: CalloutBorderStyle;
  label: string;
  shortLabel: string;
  runtimeClass: string;
}

export const CALLOUT_SURFACE_STYLES: ReadonlyArray<CalloutSurfaceOption> = [
  { id: 'solid', label: 'Solid' },
  { id: 'faded', label: 'Faded' },
  { id: 'transparent', label: 'Transparent' },
];

export const CALLOUT_FADE_DIRECTIONS: ReadonlyArray<CalloutFadeDirectionOption> = [
  { id: 'ltr', label: 'Left → Right', arrow: '→' },
  { id: 'rtl', label: 'Right → Left', arrow: '←' },
  { id: 'ttb', label: 'Top → Bottom', arrow: '↓' },
  { id: 'btt', label: 'Bottom → Top', arrow: '↑' },
];

export const CALLOUT_BORDER_STYLES: ReadonlyArray<CalloutBorderOption> = [
  { id: 'none', label: 'None', shortLabel: 'None', runtimeClass: 'callout-border-none' },
  { id: 'frame', label: 'Full Frame', shortLabel: 'Frame', runtimeClass: 'callout-border-frame' },
  { id: 'left-line', label: 'Left Line', shortLabel: 'Left', runtimeClass: 'callout-border-left' },
  { id: 'right-line', label: 'Right Line', shortLabel: 'Right', runtimeClass: 'callout-border-right' },
  { id: 'top-bottom', label: 'Top + Bottom', shortLabel: 'Top/Bottom', runtimeClass: 'callout-border-top-bottom' },
  { id: 'corners', label: 'Corners', shortLabel: 'Corners', runtimeClass: 'callout-border-corners' },
];

const SURFACE_SET = new Set<string>(CALLOUT_SURFACE_STYLES.map((s) => s.id));
const FADE_DIR_SET = new Set<string>(CALLOUT_FADE_DIRECTIONS.map((d) => d.id));
const BORDER_CLASS_MAP: Record<string, string> = CALLOUT_BORDER_STYLES.reduce(
  (acc, item) => {
    acc[item.id] = item.runtimeClass;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Resolves Callout surface style with strict backward-compatible default ('solid').
 */
export function normalizeCalloutSurfaceStyle(raw?: unknown): CalloutSurfaceStyle {
  if (typeof raw !== 'string') return 'solid';
  const v = raw.trim().toLowerCase();
  return SURFACE_SET.has(v) ? (v as CalloutSurfaceStyle) : 'solid';
}

/**
 * Resolves Callout fade direction (only used when surfaceStyle === 'faded'). Default: 'ltr'.
 */
export function normalizeCalloutFadeDirection(raw?: unknown): CalloutFadeDirection {
  if (typeof raw !== 'string') return 'ltr';
  const v = raw.trim().toLowerCase();
  return FADE_DIR_SET.has(v) ? (v as CalloutFadeDirection) : 'ltr';
}

/**
 * Resolves explicit author-selected Callout border style.
 * Returns null when omitted/invalid so legacy/existing Callout variants preserve their canonical border untouched.
 */
export function normalizeCalloutBorderStyle(raw?: unknown): CalloutBorderStyle | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return v in BORDER_CLASS_MAP ? (v as CalloutBorderStyle) : null;
}

/**
 * Maps a normalized border style ID to its canonical runtime CSS modifier class (or '' when legacy/variant-default).
 */
export function getCalloutBorderRuntimeClass(borderStyle: CalloutBorderStyle | null): string {
  if (!borderStyle) return '';
  return BORDER_CLASS_MAP[borderStyle] || '';
}

