/**
 * COVEN OF TECHNOLOGY — CANONICAL TECHNICAL TABLE STYLE REGISTRY
 *
 * Single source of truth for Table Style Presets, Table Presentation Options,
 * and Semantic Cell Background / Text Color / Alignment overrides.
 * Shared by both Article Studio and Article Reader so styling never diverges.
 */

export type TablePresetId =
  | 'coven-grid'
  | 'aether-header'
  | 'banded-rows'
  | 'banded-columns'
  | 'arcane-minimal'
  | 'grimoire'
  | 'moonlight'
  | 'void';

export type CellBackgroundToken =
  | 'default'
  | 'coven-gold'
  | 'coven-purple'
  | 'moonlight'
  | 'emerald'
  | 'rose'
  | 'muted-parchment'
  | 'void'
  | string; // Supports shared MY COLORS custom hex tokens ("#RRGGBB")

export type CellAlign = 'left' | 'center' | 'right';

export interface TableStyleConfig {
  preset: TablePresetId;
  headerRow: boolean;
  bandedRows: boolean;
  bandedColumns: boolean;
  emphasizeFirstColumn: boolean;
  emphasizeLastColumn: boolean;
}

export interface SemanticCellStyle {
  background?: CellBackgroundToken;
  textColor?: string; // 'default' | 'article-text-gold' | 'article-text-purple' | 'article-text-muted' | '#RRGGBB'
  align?: CellAlign;
}

export interface TablePresetDefinition {
  id: TablePresetId;
  name: string;
  description: string;
  defaultBandedRows?: boolean;
  defaultBandedColumns?: boolean;
  previewHeaderBg: string;
  previewCellBg: string;
  previewAltBg: string;
  previewBorder: string;
  previewAccent: string;
}

export const DEFAULT_TABLE_STYLE: TableStyleConfig = {
  preset: 'coven-grid',
  headerRow: true,
  bandedRows: false,
  bandedColumns: false,
  emphasizeFirstColumn: false,
  emphasizeLastColumn: false,
};

export const TABLE_STYLE_PRESETS: TablePresetDefinition[] = [
  {
    id: 'coven-grid',
    name: 'Coven Grid',
    description: 'Signature gold-bordered arcane matrix',
    previewHeaderBg: 'rgba(216, 181, 107, 0.18)',
    previewCellBg: '#13101c',
    previewAltBg: '#171323',
    previewBorder: 'rgba(216, 181, 107, 0.34)',
    previewAccent: '#e8cf95',
  },
  {
    id: 'aether-header',
    name: 'Aether Header',
    description: 'Luminous gold-violet header banner',
    previewHeaderBg: 'linear-gradient(135deg, rgba(168, 120, 232, 0.42), rgba(216, 181, 107, 0.28))',
    previewCellBg: '#120f1b',
    previewAltBg: '#171324',
    previewBorder: 'rgba(185, 143, 216, 0.35)',
    previewAccent: '#f3ecdf',
  },
  {
    id: 'banded-rows',
    name: 'Banded Rows',
    description: 'Alternating horizontal row tinting',
    defaultBandedRows: true,
    previewHeaderBg: 'rgba(216, 181, 107, 0.15)',
    previewCellBg: '#110e19',
    previewAltBg: 'rgba(185, 143, 216, 0.13)',
    previewBorder: 'rgba(216, 181, 107, 0.2)',
    previewAccent: '#e8cf95',
  },
  {
    id: 'banded-columns',
    name: 'Banded Columns',
    description: 'Alternating vertical column tinting',
    defaultBandedColumns: true,
    previewHeaderBg: 'rgba(185, 143, 216, 0.2)',
    previewCellBg: '#110e19',
    previewAltBg: 'rgba(216, 181, 107, 0.1)',
    previewBorder: 'rgba(185, 143, 216, 0.24)',
    previewAccent: '#d6b8f2',
  },
  {
    id: 'arcane-minimal',
    name: 'Arcane Minimal',
    description: 'Clean horizontal rules, open frame',
    previewHeaderBg: 'transparent',
    previewCellBg: '#100d18',
    previewAltBg: '#100d18',
    previewBorder: 'rgba(216, 181, 107, 0.18)',
    previewAccent: '#e8cf95',
  },
  {
    id: 'grimoire',
    name: 'Grimoire',
    description: 'Warm gilded parchment accents & double rule',
    previewHeaderBg: 'rgba(196, 154, 78, 0.22)',
    previewCellBg: '#17131c',
    previewAltBg: 'rgba(216, 181, 107, 0.08)',
    previewBorder: 'rgba(216, 181, 107, 0.42)',
    previewAccent: '#f3d89b',
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    description: 'Silver-lavender celestial border aura',
    previewHeaderBg: 'rgba(154, 178, 224, 0.2)',
    previewCellBg: '#111320',
    previewAltBg: 'rgba(154, 178, 224, 0.09)',
    previewBorder: 'rgba(166, 190, 236, 0.34)',
    previewAccent: '#d8e6ff',
  },
  {
    id: 'void',
    name: 'Void',
    description: 'Deep obsidian contrast with hairline rules',
    previewHeaderBg: '#09070e',
    previewCellBg: '#07050c',
    previewAltBg: '#0e0b16',
    previewBorder: 'rgba(145, 113, 199, 0.22)',
    previewAccent: '#b98fd8',
  },
];

export const TABLE_PRESET_IDS: TablePresetId[] = TABLE_STYLE_PRESETS.map((p) => p.id);

export interface CellBackgroundPreset {
  id: string;
  label: string;
  swatch: string;
  bgCss: string;
}

export const CELL_BACKGROUND_PRESETS: CellBackgroundPreset[] = [
  { id: 'default', label: 'Default', swatch: 'transparent', bgCss: '' },
  { id: 'coven-gold', label: 'Coven Gold Tint', swatch: 'rgba(216, 181, 107, 0.32)', bgCss: 'rgba(216, 181, 107, 0.16)' },
  { id: 'coven-purple', label: 'Coven Purple Tint', swatch: 'rgba(166, 118, 226, 0.34)', bgCss: 'rgba(155, 108, 218, 0.18)' },
  { id: 'moonlight', label: 'Moonlight', swatch: 'rgba(148, 178, 230, 0.3)', bgCss: 'rgba(138, 168, 224, 0.16)' },
  { id: 'emerald', label: 'Emerald', swatch: 'rgba(84, 184, 134, 0.3)', bgCss: 'rgba(72, 168, 120, 0.16)' },
  { id: 'rose', label: 'Rose', swatch: 'rgba(218, 112, 138, 0.3)', bgCss: 'rgba(208, 96, 126, 0.16)' },
  { id: 'muted-parchment', label: 'Muted Parchment', swatch: 'rgba(210, 196, 174, 0.24)', bgCss: 'rgba(202, 188, 166, 0.12)' },
  { id: 'void', label: 'Void', swatch: '#07050c', bgCss: 'rgba(6, 4, 11, 0.85)' },
];

const CELL_BG_MAP: Record<string, string> = CELL_BACKGROUND_PRESETS.reduce(
  (acc, p) => {
    acc[p.id] = p.bgCss;
    return acc;
  },
  {} as Record<string, string>
);

const SEMANTIC_TEXT_COLOR_MAP: Record<string, string> = {
  'article-text-gold': '#e8cf95',
  'article-text-purple': '#c9a4ea',
  'article-text-muted': '#9b9189',
};

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(val: unknown): val is string {
  return typeof val === 'string' && HEX_COLOR_RE.test(val.trim());
}

export function normalizeHexColor(val: string): string {
  const trimmed = val.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return (
      '#' +
      trimmed[1] +
      trimmed[1] +
      trimmed[2] +
      trimmed[2] +
      trimmed[3] +
      trimmed[3]
    ).toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function hexToRgbaTint(hex: string, alpha: number = 0.22): string {
  const full = normalizeHexColor(hex);
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '';
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveTableStyle(raw: unknown): TableStyleConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TABLE_STYLE };
  }
  const obj = raw as Record<string, unknown>;
  const presetCandidate = typeof obj.preset === 'string' ? obj.preset.trim() : '';
  const preset: TablePresetId = (TABLE_PRESET_IDS as string[]).includes(presetCandidate)
    ? (presetCandidate as TablePresetId)
    : DEFAULT_TABLE_STYLE.preset;

  return {
    preset,
    headerRow: obj.headerRow !== undefined ? Boolean(obj.headerRow) : true,
    bandedRows: obj.bandedRows !== undefined ? Boolean(obj.bandedRows) : preset === 'banded-rows',
    bandedColumns: obj.bandedColumns !== undefined ? Boolean(obj.bandedColumns) : preset === 'banded-columns',
    emphasizeFirstColumn: Boolean(obj.emphasizeFirstColumn),
    emphasizeLastColumn: Boolean(obj.emphasizeLastColumn),
  };
}

export function getTableClassList(style: TableStyleConfig, baseClass: string = 'coven-table'): string {
  const classes = [baseClass, `coven-table--preset-${style.preset}`];
  if (!style.headerRow) classes.push('coven-table--no-header');
  if (style.bandedRows) classes.push('coven-table--banded-rows');
  if (style.bandedColumns) classes.push('coven-table--banded-cols');
  if (style.emphasizeFirstColumn) classes.push('coven-table--emph-first-col');
  if (style.emphasizeLastColumn) classes.push('coven-table--emph-last-col');
  return classes.join(' ');
}

export function sanitizeSemanticCellStyle(raw: unknown): SemanticCellStyle | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const out: SemanticCellStyle = {};

  if (typeof obj.background === 'string') {
    const bg = obj.background.trim();
    if (bg && bg !== 'default') {
      if (bg in CELL_BG_MAP) {
        out.background = bg;
      } else if (isValidHexColor(bg)) {
        out.background = normalizeHexColor(bg);
      }
    }
  }

  if (typeof obj.textColor === 'string') {
    const tc = obj.textColor.trim();
    if (tc && tc !== 'default') {
      if (tc in SEMANTIC_TEXT_COLOR_MAP) {
        out.textColor = tc;
      } else if (isValidHexColor(tc)) {
        out.textColor = normalizeHexColor(tc);
      }
    }
  }

  if (obj.align === 'left' || obj.align === 'center' || obj.align === 'right') {
    out.align = obj.align;
  }

  return Object.keys(out).length > 0 ? out : null;
}

export function resolveCellBackgroundCss(token?: string): string {
  if (!token || token === 'default') return '';
  if (token in CELL_BG_MAP) return CELL_BG_MAP[token];
  if (isValidHexColor(token)) return hexToRgbaTint(token, 0.22);
  return '';
}

export function resolveCellTextColorCss(token?: string): string {
  if (!token || token === 'default') return '';
  if (token in SEMANTIC_TEXT_COLOR_MAP) return SEMANTIC_TEXT_COLOR_MAP[token];
  if (isValidHexColor(token)) return normalizeHexColor(token);
  return '';
}

export function buildCellInlineStyle(style: SemanticCellStyle | null | undefined): string {
  if (!style) return '';
  const parts: string[] = [];
  const bg = resolveCellBackgroundCss(style.background);
  if (bg) parts.push(`background-color: ${bg}`);
  const tc = resolveCellTextColorCss(style.textColor);
  if (tc) parts.push(`color: ${tc}`);
  if (style.align === 'left' || style.align === 'center' || style.align === 'right') {
    parts.push(`text-align: ${style.align}`);
  }
  return parts.join('; ');
}
