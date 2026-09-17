/**
 * URL Sanitizer and Tracker Stripper.
 * Unwraps redirection gateways and strips marketing, tracking, and affiliate query params.
 */

// Tracking parameters to strip
const TRACKING_PARAM_PREFIXES = [
  'utm_',
  'aff_',
  'affiliate_',
  'partner_',
  'trk_',
  'tracking_'
];

const TRACKING_PARAMS = new Set([
  // Google / Ads
  'gclid',
  'gclsrc',
  'dclid',
  'gad_source',
  'gbraid',
  'wbraid',
  '_ga',
  '_gl',
  // Facebook / Meta
  'fbclid',
  'fbadid',
  // Microsoft / Bing
  'msclkid',
  'cvid',
  // Twitter / X
  'twclid',
  'ref_src',
  'ref_url',
  // TikTok
  'ttclid',
  // Snapchat
  'sc_clid',
  // YouTube
  'si',
  'feature',
  'pp',
  // Instagram
  'igshid',
  'mid',
  // Reddit
  'rdt_cid',
  // Mail & CRM
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'hsCtaTracking',
  'vero_id',
  'vero_conv',
  'wickedid',
  'yclid',
  // Amazon & E-Commerce
  'tag',
  'ref',
  'ref_',
  'camp',
  'creative',
  'creativeASIN',
  'linkCode',
  'linkId',
  'ascsubtag',
  // Ali / Taobao
  'spm',
  'scm'
]);

/**
 * Unwrap known redirection URLs (e.g., google.com/url?q=...)
 * @param {URL} urlObj
 * @returns {URL}
 */
function unwrapRedirect(urlObj) {
  const host = urlObj.hostname.toLowerCase();

  // Google redirection: /url?q=... or /url?url=...
  if (host.includes('google.') && urlObj.pathname === '/url') {
    const target = urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
    if (target) {
      try {
        return new URL(target);
      } catch {}
    }
  }

  // Facebook redirection: l.facebook.com/l.php?u=...
  if (host.includes('facebook.com') && urlObj.pathname.includes('l.php')) {
    const target = urlObj.searchParams.get('u');
    if (target) {
      try {
        return new URL(target);
      } catch {}
    }
  }

  // Generic redirection wrapper with target/url param
  if (urlObj.searchParams.has('redirect_url') || urlObj.searchParams.has('target_url')) {
    const target = urlObj.searchParams.get('redirect_url') || urlObj.searchParams.get('target_url');
    if (target) {
      try {
        return new URL(target);
      } catch {}
    }
  }

  return urlObj;
}

/**
 * Clean a single URL string
 * @param {string} urlString
 * @returns {{ cleanUrl: string, removedParams: string[], originalUrl: string }}
 */
export function sanitizeUrl(urlString) {
  const trimmed = urlString.trim();
  let urlObj;

  try {
    urlObj = new URL(trimmed);
  } catch {
    // If lacks protocol, test with https://
    if (!trimmed.includes('://')) {
      try {
        urlObj = new URL(`https://${trimmed}`);
      } catch {
        throw new Error(`Invalid URL: "${urlString}"`);
      }
    } else {
      throw new Error(`Invalid URL: "${urlString}"`);
    }
  }

  urlObj = unwrapRedirect(urlObj);

  const removedParams = [];
  const paramsToKeep = [];

  for (const [key, value] of urlObj.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    const isPrefixed = TRACKING_PARAM_PREFIXES.some(prefix => lowerKey.startsWith(prefix));
    const isExact = TRACKING_PARAMS.has(lowerKey);

    if (isPrefixed || isExact) {
      removedParams.push(key);
    } else {
      paramsToKeep.push([key, value]);
    }
  }

  // Rebuild search parameters cleanly
  urlObj.search = '';
  for (const [k, v] of paramsToKeep) {
    urlObj.searchParams.append(k, v);
  }

  return {
    cleanUrl: urlObj.toString(),
    removedParams,
    originalUrl: trimmed
  };
}

/**
 * Check if a string looks like a single URL
 * @param {string} str
 * @returns {boolean}
 */
export function isLikelyUrl(str) {
  const trimmed = str.trim();
  if (trimmed.includes('\n') || trimmed.includes(' ') || trimmed.length < 4) return false;
  return /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed);
}
