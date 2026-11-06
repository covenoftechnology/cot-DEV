/**
 * Coven Central Icon & Glyph Registry (UAT Article Forge)
 * Single source of truth for curated monochrome / arcane gold glyphs.
 */

export interface CovenIcon {
  id: string;
  glyph: string;
  label: string;
  category?: string;
}

export const COVEN_ICON_REGISTRY: CovenIcon[] = [
  { id: 'spark', glyph: '✧', label: 'Sparkle' },
  { id: 'star', glyph: '✦', label: 'Star / Aether' },
  { id: 'sigil', glyph: '✶', label: 'Sigil / Brand' },
  { id: 'diamond', glyph: '◈', label: 'Diamond Node' },
  { id: 'gear', glyph: '⚙', label: 'Mechanism' },
  { id: 'scale', glyph: '⚖', label: 'Balance / Scale' },
  { id: 'moon', glyph: '☽', label: 'Crescent Moon' },
  { id: 'sun', glyph: '☼', label: 'Solar Radiance' },
  { id: 'envelope', glyph: '✉', label: 'Envelope' },
  { id: 'code', glyph: '</>', label: 'Code Inscription' },
  { id: 'terminal', glyph: '>_', label: 'Terminal / CLI' },
  { id: 'grid', glyph: '⊞', label: 'Grid Matrix' },
  { id: 'info', glyph: 'ℹ', label: 'Information' },
  { id: 'warning', glyph: '▲', label: 'Advisory Warning' },
  { id: 'check', glyph: '✓', label: 'Verified Mark' },
  { id: 'arrow', glyph: '↗', label: 'External Arrow' },
  { id: 'scroll', glyph: '📜', label: 'Arcane Scroll' },
  { id: 'alchemy', glyph: '⚗', label: 'Alchemy Flask' },
  { id: 'link', glyph: '🔗', label: 'Hyperlink' },
  { id: 'video', glyph: '▶', label: 'Video Player' },
  { id: 'form', glyph: '📋', label: 'Form / Document' },
  { id: 'quote', glyph: '❝', label: 'Pullquote' },
  { id: 'metric', glyph: '%', label: 'Metric Percentage' },
  { id: 'image', glyph: '📷', label: 'Visual Diagram' },
];

/**
 * Find icon definition by stable ID or by raw glyph.
 */
export function getCovenIconById(idOrGlyph: string): CovenIcon | undefined {
  if (!idOrGlyph || typeof idOrGlyph !== 'string') return undefined;
  const clean = idOrGlyph.trim();
  return COVEN_ICON_REGISTRY.find(i => i.id === clean || i.glyph === clean);
}

/**
 * Resolve display glyph from ID, glyph, or fallback string.
 * Provides 100% backward compatibility for documents storing raw glyph strings.
 */
export function resolveCovenGlyph(idOrGlyph: string | undefined | null, fallback: string = '✧'): string {
  if (!idOrGlyph || typeof idOrGlyph !== 'string') return fallback;
  const clean = idOrGlyph.trim();
  const found = COVEN_ICON_REGISTRY.find(i => i.id === clean || i.glyph === clean);
  return found ? found.glyph : clean;
}

