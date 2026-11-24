/**
 * Coven Article System — Canonical Shared Marker Engine
 *
 * Provides shared marker resolution, numbering conversions (decimal, alpha, roman),
 * style normalization, and plain-text sanitization for:
 * 1. Nested Bullet Lists (`nested-bullets`)
 * 2. Numbered Steps (`numbered-steps`)
 */

export type ListMarkerStyle =
  | 'auto'
  | 'decimal'
  | 'upper-alpha'
  | 'lower-alpha'
  | 'upper-roman'
  | 'lower-roman'
  | 'coven'
  | 'hyphen'
  | 'bullet'
  | 'custom';

export interface ResolveMarkerOptions {
  customValue?: unknown;
  itemStyle?: unknown;
  parentStyle?: unknown;
  blockDefaultStyle?: unknown;
  index: number;
  depth?: number;
  isSteps?: boolean;
  legacyBadge?: string;
}

const ROMAN_NUMERALS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/**
 * Converts 0-based index to decimal number string (1, 2, 3...)
 */
export function toDecimal(index: number): string {
  const n = Math.max(0, Math.floor(index)) + 1;
  return String(n);
}

/**
 * Converts 0-based index to uppercase alphabetical sequence (A, B... Z, AA, AB...)
 */
export function toUpperAlpha(index: number): string {
  let num = Math.max(0, Math.floor(index)) + 1;
  let str = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    num = Math.floor((num - 1) / 26);
  }
  return str;
}

/**
 * Converts 0-based index to lowercase alphabetical sequence (a, b... z, aa, ab...)
 */
export function toLowerAlpha(index: number): string {
  return toUpperAlpha(index).toLowerCase();
}

/**
 * Converts 0-based index to uppercase Roman numeral (I, II, III, IV, V...)
 */
export function toUpperRoman(index: number): string {
  let num = Math.max(0, Math.floor(index)) + 1;
  if (num > 3999) return String(num);
  let res = '';
  for (const [val, sym] of ROMAN_NUMERALS) {
    while (num >= val) {
      res += sym;
      num -= val;
    }
  }
  return res || 'I';
}

/**
 * Converts 0-based index to lowercase Roman numeral (i, ii, iii, iv, v...)
 */
export function toLowerRoman(index: number): string {
  return toUpperRoman(index).toLowerCase();
}

/**
 * Converts depth to Coven Spark marker (✦ at root, ◦ for sub-bullets)
 */
export function toCoven(depth: number = 1): string {
  return depth <= 1 ? '✦' : '◦';
}

/**
 * Converts depth to Hyphen marker (— em dash at root, – en dash for sub-bullets)
 */
export function toHyphen(depth: number = 1): string {
  return depth <= 1 ? '—' : '–';
}

/**
 * Returns standard bullet symbol (•)
 */
export function toBullet(): string {
  return '•';
}

/**
 * Sanitizes manual custom marker values:
 * - Plain text only
 * - Strips all HTML/script tags
 * - Allows Unicode symbols (e.g. →, ✦, •, ◆, ☆, ✓, ★, etc.) and alphanumeric strings (1.1, Step 01, etc.)
 * - Trims whitespace and caps reasonable length
 */
export function sanitizeMarkerValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (!str) return '';
  // Strip <script>...</script> and <style>...</style> completely
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Strip any remaining HTML tags (<...>)
  str = str.replace(/<[^>]*>/g, '').trim();
  // Reasonable length boundary (24 characters max)
  if (str.length > 24) str = str.slice(0, 24).trim();
  return str;
}

/**
 * Normalizes marker style strings and aliases (alpha -> lower-alpha, roman -> upper-roman, numbers -> decimal)
 */
export function normalizeMarkerStyle(style: unknown, fallback: string = 'decimal'): string {
  if (typeof style !== 'string') return fallback;
  const s = style.trim().toLowerCase();
  switch (s) {
    case 'auto':
    case 'inherit':
      return 'auto';
    case 'decimal':
    case 'numbers':
    case 'number':
    case 'numeric':
      return 'decimal';
    case 'upper-alpha':
    case 'upperalpha':
    case 'uppercase-letter':
    case 'uppercase-letters':
      return 'upper-alpha';
    case 'lower-alpha':
    case 'loweralpha':
    case 'alpha':
    case 'lowercase-letter':
    case 'lowercase-letters':
      return 'lower-alpha';
    case 'upper-roman':
    case 'upperroman':
    case 'roman':
    case 'uppercase-roman':
      return 'upper-roman';
    case 'lower-roman':
    case 'lowerroman':
    case 'lowercase-roman':
      return 'lower-roman';
    case 'coven':
    case 'spark':
      return 'coven';
    case 'hyphen':
    case 'dash':
      return 'hyphen';
    case 'bullet':
    case 'disc':
      return 'bullet';
    case 'custom':
      return 'custom';
    default:
      return fallback;
  }
}

/**
 * Canonical marker resolver.
 * Evaluates in priority order:
 * 1. Manual custom marker override (if non-empty)
 * 2. Item-level style override
 * 3. Parent-level style override (if nested)
 * 4. Block-level default style
 * 5. Fallback sequence
 */
export function resolveListMarker(options: ResolveMarkerOptions): string {
  const {
    customValue,
    itemStyle,
    parentStyle,
    blockDefaultStyle,
    index,
    depth = 1,
    isSteps = false,
    legacyBadge,
  } = options;

  // 1. Explicit manual custom marker override
  const cleanCustom = sanitizeMarkerValue(customValue);
  if (cleanCustom.length > 0) {
    return cleanCustom;
  }

  // 1b. Legacy badge preservation for unedited existing steps
  const hasItemStyle = typeof itemStyle === 'string' && itemStyle.trim() !== '' && itemStyle.trim() !== 'auto';
  const hasBlockStyle = typeof blockDefaultStyle === 'string' && blockDefaultStyle.trim() !== '' && blockDefaultStyle.trim() !== 'auto';
  if (isSteps && !hasItemStyle && !hasBlockStyle && legacyBadge && typeof legacyBadge === 'string' && legacyBadge.trim() !== '') {
    return legacyBadge.trim();
  }

  // 2. Resolve effective style
  const defaultFallback = isSteps ? 'decimal' : 'coven';
  let effectiveStyle = defaultFallback;

  if (hasItemStyle) {
    effectiveStyle = normalizeMarkerStyle(itemStyle, defaultFallback);
  } else if (typeof parentStyle === 'string' && parentStyle.trim() !== '' && parentStyle.trim() !== 'auto') {
    effectiveStyle = normalizeMarkerStyle(parentStyle, defaultFallback);
  } else if (hasBlockStyle) {
    effectiveStyle = normalizeMarkerStyle(blockDefaultStyle, defaultFallback);
  }

  // 3. Compute derived sequence
  switch (effectiveStyle) {
    case 'decimal':
      return toDecimal(index);
    case 'upper-alpha':
      return toUpperAlpha(index);
    case 'lower-alpha':
      return toLowerAlpha(index);
    case 'upper-roman':
      return toUpperRoman(index);
    case 'lower-roman':
      return toLowerRoman(index);
    case 'coven':
      return toCoven(depth);
    case 'hyphen':
      return toHyphen(depth);
    case 'bullet':
      return toBullet();
    case 'custom':
      // Author selected custom but left custom input empty -> derive automatic default
      return isSteps ? toDecimal(index) : toCoven(depth);
    default:
      return isSteps ? toDecimal(index) : toCoven(depth);
  }
}

/**
 * Returns user-facing marker style options for dropdowns.
 */
export function getMarkerStyleOptions(includeAuto: boolean = true): Array<{ value: string; label: string }> {
  const list: Array<{ value: string; label: string }> = [];
  if (includeAuto) {
    list.push({ value: 'auto', label: 'Inherit / Auto' });
  }
  list.push(
    { value: 'decimal', label: 'Numbers (1, 2, 3)' },
    { value: 'upper-alpha', label: 'Uppercase Letters (A, B, C)' },
    { value: 'lower-alpha', label: 'Lowercase Letters (a, b, c)' },
    { value: 'upper-roman', label: 'Uppercase Roman (I, II, III)' },
    { value: 'lower-roman', label: 'Lowercase Roman (i, ii, iii)' },
    { value: 'coven', label: 'Coven Spark (✦ / ◦)' },
    { value: 'hyphen', label: 'Hyphen (— / –)' },
    { value: 'bullet', label: 'Bullet (•)' },
    { value: 'custom', label: 'Custom Override' }
  );
  return list;
}
