/**
 * Zero-dependency NoSQL & Query Object Sanitizer.
 * Recursively strips and neutralizes malicious MongoDB/NoSQL operators ($gt, $ne, $where)
 * and prototype path injection keys from JSON objects and queries.
 */

/**
 * Check if a key is a prohibited NoSQL operator or path traversal key.
 * @param {string} key
 * @param {boolean} sanitizeDots
 * @returns {boolean}
 */
function isDangerousKey(key, sanitizeDots = true) {
  if (typeof key !== 'string') return false;
  // MongoDB operators starting with '$' or prototype keys '__proto__', 'constructor', 'prototype'
  if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return true;
  }
  // Dot notation injection in MongoDB queries
  if (sanitizeDots && key.includes('.')) {
    return true;
  }
  return false;
}

/**
 * Deeply sanitize an object, array, or JSON string against NoSQL operator injection.
 * @template T
 * @param {T} input
 * @param {{
 *   replaceWith?: string | null,
 *   sanitizeDots?: boolean,
 *   maxDepth?: number
 * }} [options]
 * @returns {T} Sanitized copy
 */
export function sanitizeQuery(input, options = {}) {
  const replaceWith = typeof options.replaceWith === 'string' ? options.replaceWith : null;
  const sanitizeDots = options.sanitizeDots !== false;
  const maxDepth = typeof options.maxDepth === 'number' ? options.maxDepth : 20;

  // Handle JSON string input
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        const cleaned = sanitizeQuery(parsed, options);
        return JSON.stringify(cleaned);
      } catch {
        return input;
      }
    }
    return input;
  }

  function clean(val, depth = 0) {
    if (depth > maxDepth) return val;
    if (val === null || typeof val !== 'object') return val;

    if (Array.isArray(val)) {
      return val.map(item => clean(item, depth + 1));
    }

    const result = {};
    for (const [key, value] of Object.entries(val)) {
      if (isDangerousKey(key, sanitizeDots)) {
        if (replaceWith !== null) {
          // Replace prohibited characters
          let safeKey = key.replace(/^\$+/, replaceWith);
          if (sanitizeDots) safeKey = safeKey.replace(/\./g, replaceWith);
          result[safeKey] = clean(value, depth + 1);
        }
        // If replaceWith is null/omitted, the key is completely dropped
      } else {
        result[key] = clean(value, depth + 1);
      }
    }
    return result;
  }

  return clean(input);
}
