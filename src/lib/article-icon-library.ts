/**
 * Coven Article System — Shared Custom Icon Library Manager ("MY ICONS")
 *
 * Centralized, decoupled storage, validation, and option resolution for author-saved custom icons.
 * Shared across Single Card, Card Grid 2/3, 50/50 Comparison, and all future icon-capable blocks.
 */

import { COVEN_ICON_REGISTRY, type CovenIcon } from './coven-icons';

export const SAVED_ICONS_STORAGE_KEY = 'covenArticleStudio:savedIcons';
export const MAX_SAVED_ICONS = 50;
export const SENTINEL_ADD_ICON_VALUE = '__add_custom_icon__';

export interface SavedCustomIcon {
  id: string;
  icon: string;
  label: string;
  createdAt?: number;
}

export interface SaveIconResult {
  success: boolean;
  icon?: SavedCustomIcon;
  message: string;
  alreadyExisted?: boolean;
}

export interface RemoveIconResult {
  success: boolean;
  removed?: SavedCustomIcon;
  remaining: SavedCustomIcon[];
  message: string;
}

/**
 * HTML Escaping helper for safe rendering
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates a custom glyph input.
 * Allows single visible grapheme cluster (including complex emoji sequences like 🧑‍💻, ☁️, 🛡️).
 * Rejects raw HTML, scripts, angle brackets, quotes, and control characters.
 */
export function isValidCustomGlyph(glyph: unknown): boolean {
  if (!glyph || typeof glyph !== 'string') return false;
  const trimmed = glyph.trim();
  if (!trimmed) return false;

  // Reject strings exceeding safe grapheme cluster bounds (max 12 code units)
  if (trimmed.length > 12) return false;

  // Reject dangerous characters / script injection vectors
  if (/[<>&"'\\`\x00-\x1f\x7f-\x9f]/.test(trimmed)) return false;

  // Validate that it consists of exactly one grapheme cluster if Intl.Segmenter is available
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
      const segments = Array.from(segmenter.segment(trimmed));
      return segments.length === 1;
    } catch (e) {
      // Fallback if segmenter throws
      return trimmed.length >= 1 && trimmed.length <= 8;
    }
  }

  return trimmed.length >= 1 && trimmed.length <= 8;
}

/**
 * Validates a human-readable icon label.
 * Requires 1-40 characters, plain text, no HTML markup.
 */
export function isValidCustomLabel(label: unknown): boolean {
  if (!label || typeof label !== 'string') return false;
  const trimmed = label.trim();
  if (trimmed.length < 1 || trimmed.length > 40) return false;
  if (/[<>]/.test(trimmed)) return false;
  return true;
}

/**
 * Sanitizes an icon label to clean, safe text.
 */
export function sanitizeCustomLabel(label: unknown): string {
  if (!label || typeof label !== 'string') return '';
  return label
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 40);
}

/**
 * Generates a stable, deterministic identifier for a custom icon.
 */
export function generateStableCustomIconId(glyph: string, label: string): string {
  const cleanLabel = (label || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'icon';

  let hash = 0;
  for (let i = 0; i < glyph.length; i++) {
    hash = ((hash << 5) - hash) + glyph.charCodeAt(i);
    hash |= 0;
  }
  const hashHex = Math.abs(hash).toString(16).padStart(4, '0').slice(0, 6);
  return `custom-${cleanLabel}-${hashHex}`;
}

/**
 * Reads and sanitizes all saved custom icons from localStorage.
 */
export function getSavedCustomIcons(): SavedCustomIcon[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_ICONS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const sanitized: SavedCustomIcon[] = [];
    const seenGlyphs = new Set<string>();

    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const glyph = typeof item.icon === 'string' ? item.icon.trim() : '';
      const label = typeof item.label === 'string' ? sanitizeCustomLabel(item.label) : '';

      if (isValidCustomGlyph(glyph) && isValidCustomLabel(label)) {
        if (!seenGlyphs.has(glyph)) {
          seenGlyphs.add(glyph);
          sanitized.push({
            id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : generateStableCustomIconId(glyph, label),
            icon: glyph,
            label: label,
            createdAt: typeof item.createdAt === 'number' ? item.createdAt : undefined,
          });
          if (sanitized.length >= MAX_SAVED_ICONS) break;
        }
      }
    }

    return sanitized;
  } catch (err) {
    console.warn('[Coven Icon Library] Failed to load saved icons from storage:', err);
    return [];
  }
}

/**
 * Persists an array of custom icons to localStorage.
 */
export function persistSavedCustomIcons(icons: SavedCustomIcon[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const sanitized = icons
      .filter(i => isValidCustomGlyph(i.icon) && isValidCustomLabel(i.label))
      .slice(0, MAX_SAVED_ICONS);
    window.localStorage.setItem(SAVED_ICONS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[Coven Icon Library] Failed to persist saved icons to storage:', err);
  }
}

/**
 * Saves a new custom icon to MY ICONS.
 * Deduplicates by glyph (and label). Reuses existing if identical.
 */
export function saveCustomIcon(rawGlyph: unknown, rawLabel: unknown): SaveIconResult {
  const glyph = typeof rawGlyph === 'string' ? rawGlyph.trim() : '';
  const label = typeof rawLabel === 'string' ? sanitizeCustomLabel(rawLabel) : '';

  if (!isValidCustomGlyph(glyph)) {
    return {
      success: false,
      message: 'Please provide a valid single symbol or emoji (e.g. 🧠, ⚡, ☕).',
    };
  }

  if (!isValidCustomLabel(label)) {
    return {
      success: false,
      message: 'Please provide a descriptive name for your icon (1–40 characters).',
    };
  }

  const current = getSavedCustomIcons();

  // Deduplication check: check if glyph already exists
  const existingIndex = current.findIndex(i => i.icon === glyph);
  if (existingIndex !== -1) {
    const existing = current[existingIndex];
    if (existing.label.toLowerCase() === label.toLowerCase()) {
      return {
        success: true,
        icon: existing,
        alreadyExisted: true,
        message: 'Icon already exists in your library.',
      };
    }
    // Update label of existing icon if name changed
    existing.label = label;
    persistSavedCustomIcons(current);
    return {
      success: true,
      icon: existing,
      alreadyExisted: true,
      message: 'Icon label updated in your library.',
    };
  }

  // Safe capacity check
  if (current.length >= MAX_SAVED_ICONS) {
    return {
      success: false,
      message: `Your icon library has reached the maximum capacity of ${MAX_SAVED_ICONS} icons. Please remove unused icons to add more.`,
    };
  }

  const newIcon: SavedCustomIcon = {
    id: generateStableCustomIconId(glyph, label),
    icon: glyph,
    label: label,
    createdAt: Date.now(),
  };

  current.push(newIcon);
  persistSavedCustomIcons(current);

  return {
    success: true,
    icon: newIcon,
    message: 'Icon saved to My Icons.',
  };
}

/**
 * Removes an icon from MY ICONS by ID or glyph.
 * Non-destructive: this only affects the authoring library; article blocks continue to render.
 */
export function removeCustomIcon(idOrGlyph: string): RemoveIconResult {
  if (!idOrGlyph || typeof idOrGlyph !== 'string') {
    return { success: false, remaining: getSavedCustomIcons(), message: 'Invalid icon identifier.' };
  }

  const clean = idOrGlyph.trim();
  const current = getSavedCustomIcons();
  const foundIndex = current.findIndex(i => i.id === clean || i.icon === clean);

  if (foundIndex === -1) {
    return { success: false, remaining: current, message: 'Icon not found in your library.' };
  }

  const [removed] = current.splice(foundIndex, 1);
  persistSavedCustomIcons(current);

  return {
    success: true,
    removed,
    remaining: current,
    message: `Icon "${removed.label}" removed from My Icons.`,
  };
}

/**
 * Returns merged icon options: Coven built-in presets + author's saved custom icons.
 */
export function getMergedIconOptions(): { presets: CovenIcon[]; custom: SavedCustomIcon[] } {
  return {
    presets: COVEN_ICON_REGISTRY.slice(),
    custom: getSavedCustomIcons(),
  };
}

/**
 * Generates unified `<select>` options HTML for Article Studio icon selectors.
 * Structure:
 * - `<optgroup label="COVEN PRESETS">`
 * - `<optgroup label="MY ICONS">` (with "No saved icons yet" if empty)
 * - Sentinel option: `＋ Add New Icon...`
 * - Preserves active custom values not found in presets/library as fallback option.
 */
export function renderIconSelectOptgroupsHtml(currentValue: string, customIcons?: SavedCustomIcon[]): string {
  const cur = (currentValue || '').trim();
  const saved = customIcons || getSavedCustomIcons();
  let foundInOptions = false;

  // 1. Coven Presets Optgroup
  const presetOptions = COVEN_ICON_REGISTRY.map(ic => {
    const isSel = (ic.id === cur || ic.glyph === cur);
    if (isSel) foundInOptions = true;
    return `<option value="${escapeHtml(ic.id)}"${isSel ? ' selected' : ''}>${ic.glyph} ${escapeHtml(ic.label)}</option>`;
  }).join('');

  const presetsGroup = `<optgroup label="COVEN PRESETS">${presetOptions}</optgroup>`;

  // 2. My Icons Optgroup
  let customOptions = '';
  if (saved.length > 0) {
    customOptions = saved.map(ic => {
      // Custom icons persist their actual glyph (e.g. "🧠") to block data
      const isSel = (ic.icon === cur || ic.id === cur);
      if (isSel) foundInOptions = true;
      return `<option value="${escapeHtml(ic.icon)}"${isSel ? ' selected' : ''}>${ic.icon} ${escapeHtml(ic.label)}</option>`;
    }).join('');
  } else {
    customOptions = `<option value="" disabled style="color:#8c827a;font-style:italic">No saved icons yet</option>`;
  }

  const customGroup = `<optgroup label="MY ICONS">${customOptions}</optgroup>`;

  // 3. Fallback for custom value already in block but not in presets or saved library (non-destructive)
  let fallbackCustomOption = '';
  if (!foundInOptions && cur && cur !== SENTINEL_ADD_ICON_VALUE) {
    fallbackCustomOption = `<option value="${escapeHtml(cur)}" selected>${escapeHtml(cur)} (Custom)</option>`;
  }

  // 4. Sentinel Add Action Option
  const addActionOption = `<option value="${SENTINEL_ADD_ICON_VALUE}">＋ Add New Icon...</option>`;

  return `${fallbackCustomOption}${presetsGroup}${customGroup}${addActionOption}`;
}

