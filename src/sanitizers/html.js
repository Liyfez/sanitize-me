/**
 * Zero-dependency HTML & XSS Sanitizer.
 * Bulletproof XSS prevention and tag/attribute whitelist filtering for Node.js and browser environments.
 */

const DEFAULT_ALLOWED_TAGS = new Set([
  'a', 'b', 'i', 'strong', 'em', 'u', 's', 'strike', 'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'img', 'sub', 'sup', 'del', 'ins',
  'dl', 'dt', 'dd', 'abbr', 'details', 'summary', 'figure', 'figcaption', 'mark', 'small'
]);

const DEFAULT_ALLOWED_ATTRIBUTES = {
  '*': new Set(['class', 'id', 'title', 'dir', 'lang', 'aria-label', 'aria-hidden']),
  'a': new Set(['href', 'title', 'target', 'rel']),
  'img': new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  'th': new Set(['scope', 'colspan', 'rowspan']),
  'td': new Set(['colspan', 'rowspan'])
};

const DANGEROUS_BLOCK_TAGS = /<\s*(script|style|iframe|object|embed|applet|noscript|template)\b[\s\S]*?(?:<\s*\/\s*\1\s*>|$)/gi;
const DANGEROUS_EMPTY_TAGS = /<\s*(script|style|iframe|object|embed|applet|base|meta|link|frame|frameset)\b[^>]*>/gi;

function decodeHtmlEntities(str) {
  return str
    .replace(/&#(\d+);?/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  // Decode entities and remove control characters
  const decoded = decodeHtmlEntities(url).replace(/[\x00-\x20\x7f-\x9f]/g, '').toLowerCase();

  // Block dangerous pseudoprotocols
  if (
    decoded.startsWith('javascript:') ||
    decoded.startsWith('vbscript:') ||
    decoded.startsWith('data:text/html') ||
    decoded.startsWith('data:application/javascript')
  ) {
    return false;
  }

  // Allow relative URLs, fragments, or http/https/mailto/tel
  return (
    decoded.startsWith('/') ||
    decoded.startsWith('./') ||
    decoded.startsWith('../') ||
    decoded.startsWith('#') ||
    decoded.startsWith('http://') ||
    decoded.startsWith('https://') ||
    decoded.startsWith('mailto:') ||
    decoded.startsWith('tel:') ||
    decoded.startsWith('data:image/')
  );
}

/**
 * Sanitize HTML string against XSS and enforce allowed tag/attribute rules.
 * @param {string} html
 * @param {{
 *   allowedTags?: string[] | false,
 *   allowedAttributes?: Record<string, string[]>,
 *   textOnly?: boolean,
 *   stripIgnoreTag?: boolean
 * }} [options]
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html, options = {}) {
  if (typeof html !== 'string') {
    throw new TypeError('Input must be a string');
  }

  if (options.textOnly) {
    // Strip all HTML tags
    return html
      .replace(DANGEROUS_BLOCK_TAGS, '')
      .replace(DANGEROUS_EMPTY_TAGS, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  // 1. Strip outright dangerous tags and their content (loop to defeat nested tags)
  let clean = html;
  let prev;
  do {
    prev = clean;
    clean = clean.replace(DANGEROUS_BLOCK_TAGS, '');
    clean = clean.replace(DANGEROUS_EMPTY_TAGS, '');
  } while (clean !== prev);

  const allowedTags = options.allowedTags === false
    ? null
    : new Set(Array.isArray(options.allowedTags) ? options.allowedTags.map(t => t.toLowerCase()) : DEFAULT_ALLOWED_TAGS);

  const customAllowedAttrs = options.allowedAttributes || {};
  const globalAttrs = new Set([
    ...DEFAULT_ALLOWED_ATTRIBUTES['*'],
    ...(customAllowedAttrs['*'] || []).map(a => a.toLowerCase())
  ]);

  // Tag matcher: captures tag opening, tag name, attributes, self-closing slash
  const TAG_REGEX = /<\s*(\/)?\s*([a-zA-Z0-9_-]+)([^>]*)>/g;

  clean = clean.replace(TAG_REGEX, (match, isClosing, rawTagName, rawAttrs) => {
    const tagName = rawTagName.toLowerCase();

    // Check if tag is permitted
    if (allowedTags && !allowedTags.has(tagName)) {
      return options.stripIgnoreTag === false ? `&lt;${isClosing || ''}${tagName}&gt;` : '';
    }

    if (isClosing) {
      return `</${tagName}>`;
    }

    // Parse attributes
    const ATTR_REGEX = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    const allowedForTag = customAllowedAttrs[tagName]
      ? new Set(customAllowedAttrs[tagName].map(a => a.toLowerCase()))
      : (DEFAULT_ALLOWED_ATTRIBUTES[tagName] || new Set());

    const cleanAttrs = [];
    let attrMatch;

    while ((attrMatch = ATTR_REGEX.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Block any inline event handler (e.g., onload, onerror, onclick)
      if (attrName.startsWith('on')) {
        continue;
      }

      // Check if attribute is allowed on this tag or globally
      if (!globalAttrs.has(attrName) && !allowedForTag.has(attrName)) {
        continue;
      }

      // If URL attribute (href, src, formaction), validate protocol
      if (['href', 'src', 'formaction', 'background', 'data'].includes(attrName)) {
        if (!isSafeUrl(attrValue)) {
          continue;
        }
      }

      // Sanitize quote characters inside value
      const escapedValue = attrValue.replace(/"/g, '&quot;');
      cleanAttrs.push(`${attrName}="${escapedValue}"`);
    }

    // Auto-add rel="noopener noreferrer" for external target="_blank" links
    if (tagName === 'a' && cleanAttrs.some(a => a.includes('target="_blank"'))) {
      if (!cleanAttrs.some(a => a.startsWith('rel='))) {
        cleanAttrs.push('rel="noopener noreferrer"');
      }
    }

    const attrString = cleanAttrs.length > 0 ? ` ${cleanAttrs.join(' ')}` : '';
    return `<${tagName}${attrString}>`;
  });

  return clean;
}
