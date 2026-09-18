/**
 * Zero-dependency Filename Sanitizer.
 * Strips invalid filesystem characters, control codes, and reserved device names across Windows, macOS, and Linux.
 */

const ILLEGAL_RE = /[/?<>\\:*|"]/g;
const CONTROL_RE = /[\x00-\x1f\x80-\x9f]/g;
const RESERVED_RE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const WINDOWS_TRAILING_RE = /[. ]+$/;

/**
 * Sanitize a filename for cross-platform filesystem safety.
 * @param {string} input
 * @param {{ replacement?: string, maxLength?: number }} [options]
 * @returns {string} Safe filename
 */
export function sanitizeFilename(input, options = {}) {
  if (typeof input !== 'string') {
    throw new TypeError('Filename must be a string');
  }

  const replacement = typeof options.replacement === 'string' ? options.replacement : '';
  const maxLength = typeof options.maxLength === 'number' && options.maxLength > 0 ? options.maxLength : 255;

  let sanitized = input
    .replace(/(?:\.\.[/\\]+)+/g, '')
    .replace(ILLEGAL_RE, replacement)
    .replace(CONTROL_RE, replacement)
    .replace(/^\.+/, '')
    .replace(WINDOWS_TRAILING_RE, '')
    .trim();

  // Handle Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  if (RESERVED_RE.test(sanitized)) {
    sanitized = replacement ? `${replacement}${sanitized}` : `_${sanitized}`;
  }

  // Prevent relative path navigation
  if (sanitized === '.' || sanitized === '..') {
    sanitized = '';
  }

  // Truncate to maxLength (byte-safe for UTF-8)
  if (Buffer.byteLength(sanitized, 'utf8') > maxLength) {
    let buf = Buffer.from(sanitized, 'utf8').subarray(0, maxLength);
    // Strip trailing incomplete multi-byte UTF-8 sequence
    while (buf.length > 0 && (buf[buf.length - 1] & 0xc0) === 0x80) {
      buf = buf.subarray(0, buf.length - 1);
    }
    if (buf.length > 0 && (buf[buf.length - 1] & 0x80) !== 0) {
      buf = buf.subarray(0, buf.length - 1);
    }
    sanitized = buf.toString('utf8').replace(WINDOWS_TRAILING_RE, '').trim();
  }

  return sanitized;
}
