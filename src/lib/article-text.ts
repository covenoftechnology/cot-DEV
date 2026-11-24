/**
 * Canonical text helpers for Coven Article System
 * Standardizes multiline text, manual line breaks, and whitespace normalization.
 */

/**
 * Normalizes multiline text according to the canonical newline rules:
 * - normalizes CRLF (\r\n) to LF (\n)
 * - normalizes lone CR (\r) to LF (\n)
 * - caps 3+ consecutive newlines to a maximum of 2 (\n\n)
 * - caps 3+ consecutive <br> tags to a maximum of 2 (<br><br>)
 * - preserves all other text and characters (does not convert plain text to HTML)
 */
export function normalizeMultilineText(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);

  // Normalize CRLF and lone CR to \n
  let normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Normalize adjacent <br> and newlines: <br>\n or \n<br> -> <br>
  normalized = normalized.replace(/<br\s*\/?>\s*\n/gi, '<br>').replace(/\n\s*<br\s*\/?>/gi, '<br>');

  // Cap 3 or more consecutive <br> tags to exactly 2 (<br><br>)
  normalized = normalized.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>');

  // Cap 3 or more consecutive newlines to exactly 2 newlines (\n\n)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  return normalized;
}

/**
 * Checks if a string contains meaningful non-whitespace text.
 * Whitespace, tabs, newlines, <br> tags, and empty HTML wrappers alone do NOT count as meaningful content.
 */
export function hasMeaningfulText(value: unknown): boolean {
  if (!value) return false;
  const str = typeof value === 'string'
    ? value
    : (typeof value === 'object' && value !== null && 'text' in (value as any)
      ? String((value as any).text)
      : String(value));

  // Strip HTML tags, &nbsp; entities, and whitespace
  const stripped = str.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  return stripped.length > 0;
}

