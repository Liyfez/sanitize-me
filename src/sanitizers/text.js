/**
 * Text, Log, and Clipboard Sanitizer.
 * Scans for and redacts PII, secret keys, tokens, auth headers, and IP addresses.
 */

// Luhn algorithm check for credit cards
function isValidLuhn(str) {
  const cleanStr = str.replace(/\D/g, '');
  if (cleanStr.length < 13 || cleanStr.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = cleanStr.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanStr.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Sanitize text string and redact sensitive information
 * @param {string} text
 * @returns {{ text: string, stats: Record<string, number>, totalRedactions: number }}
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Input must be a string');
  }

  let sanitized = text;
  const stats = {};

  const recordRedaction = (type, count = 1) => {
    stats[type] = (stats[type] || 0) + count;
  };

  // 1. Private Keys
  sanitized = sanitized.replace(
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    () => {
      recordRedaction('privateKey');
      return '<PRIVATE_KEY_REDACTED>';
    }
  );

  // 2. Auth Headers (Authorization, Cookie, Set-Cookie)
  sanitized = sanitized.replace(/(Authorization:\s*(?:Bearer|Basic)?\s*)([^\r\n]+)/gi, (match, p1) => {
    recordRedaction('authHeader');
    return `${p1}<AUTH_REDACTED>`;
  });
  sanitized = sanitized.replace(/(Set-Cookie:\s*)([^\r\n]+)/gi, (match, p1) => {
    recordRedaction('cookieHeader');
    return `${p1}<COOKIE_REDACTED>`;
  });
  sanitized = sanitized.replace(/(Cookie:\s*)([^\r\n]+)/gi, (match, p1) => {
    recordRedaction('cookieHeader');
    return `${p1}<COOKIE_REDACTED>`;
  });

  // 3. JWT Tokens (Three base64url segments separated by dots)
  sanitized = sanitized.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, () => {
    recordRedaction('jwt');
    return '<JWT_REDACTED>';
  });

  // 4. Dedicated Provider API Keys & Tokens
  // OpenAI / Anthropic
  sanitized = sanitized.replace(/\b(?:sk-(?:proj-|svcacct-|live-|ant-api03-)?[A-Za-z0-9_\-]{20,})\b/g, () => {
    recordRedaction('apiKey');
    return '<API_KEY_REDACTED>';
  });

  // GitHub tokens (classic, fine-grained, oauth)
  sanitized = sanitized.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{82})\b/g, () => {
    recordRedaction('githubToken');
    return '<GITHUB_TOKEN_REDACTED>';
  });

  // AWS Access Key ID
  sanitized = sanitized.replace(/\b(AKIA[0-9A-Z]{16})\b/g, () => {
    recordRedaction('awsKey');
    return '<AWS_KEY_REDACTED>';
  });

  // Google API Key
  sanitized = sanitized.replace(/\b(AIza[0-9A-Za-z\-_]{35})\b/g, () => {
    recordRedaction('googleApiKey');
    return '<GOOGLE_KEY_REDACTED>';
  });

  // Slack tokens
  sanitized = sanitized.replace(/\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*)\b/g, () => {
    recordRedaction('slackToken');
    return '<SLACK_TOKEN_REDACTED>';
  });

  // Stripe secret / publishable keys
  sanitized = sanitized.replace(/\b(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/g, () => {
    recordRedaction('stripeKey');
    return '<STRIPE_KEY_REDACTED>';
  });

  // 5. Generic Key-Value Secret assignments (e.g. apikey="xyz", password: xyz)
  sanitized = sanitized.replace(
    /((?:api[_-]?key|access[_-]?token|client[_-]?secret|db[_-]?password|auth[_-]?token|password|secret)[\s]*[:=][\s]*["']?)([^"'\s\r\n]{8,})(["']?)/gi,
    (match, prefix, val, quote) => {
      // Don't double-replace already redacted tags
      if (val.startsWith('<') && val.endsWith('>')) return match;
      recordRedaction('genericSecret');
      return `${prefix}<SECRET_REDACTED>${quote}`;
    }
  );

  // 6. Credit Card Numbers (Validated with Luhn check)
  sanitized = sanitized.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b|\b(?:\d{4}[ -]?\d{6}[ -]?\d{4,5})\b/g, (match) => {
    if (isValidLuhn(match)) {
      recordRedaction('creditCard');
      return '<CREDIT_CARD_REDACTED>';
    }
    return match;
  });

  // 7. Email Addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (match) => {
    recordRedaction('email');
    return '<EMAIL_REDACTED>';
  });

  // 8. IPv4 Addresses (filter private 127.0.0.1 or keep standard redaction)
  sanitized = sanitized.replace(
    /\b(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\b/g,
    (match) => {
      // Don't redact common version numbers like 1.0.0 or 0.0.0.0 if not IP context, but standard IP format:
      recordRedaction('ipv4');
      return '<IP_REDACTED>';
    }
  );

  // 9. IPv6 Addresses
  sanitized = sanitized.replace(
    /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:(?::[0-9a-fA-F]{1,4}){1,7}\b/g,
    () => {
      recordRedaction('ipv6');
      return '<IPV6_REDACTED>';
    }
  );

  // 10. Local user directory paths (e.g. /home/alice, C:\Users\alice)
  sanitized = sanitized.replace(/(C:\\Users\\)[a-zA-Z0-9_. -]+/gi, '$1<USER>');
  sanitized = sanitized.replace(/(\/(?:home|Users)\/)[a-zA-Z0-9_. -]+/g, '$1<USER>');

  const totalRedactions = Object.values(stats).reduce((a, b) => a + b, 0);

  return {
    text: sanitized,
    stats,
    totalRedactions
  };
}
