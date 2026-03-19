const crypto = require('crypto');

/**
 * Sensitive data patterns with replacement labels
 */
const MASK_PATTERNS = [
  // Passwords in various formats
  { pattern: /password\s*[:=]\s*["']?([^\s"',;}{]+)["']?/gi, replacement: 'password: [MASKED_PASSWORD]' },
  { pattern: /passwd\s*[:=]\s*["']?([^\s"',;}{]+)["']?/gi, replacement: 'passwd: [MASKED_PASSWORD]' },
  { pattern: /pwd\s*[:=]\s*["']?([^\s"',;}{]+)["']?/gi, replacement: 'pwd: [MASKED_PASSWORD]' },
  { pattern: /"password"\s*:\s*"([^"]+)"/gi, replacement: '"password": "[MASKED_PASSWORD]"' },

  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[MASKED_EMAIL]' },

  // URLs with credentials
  { pattern: /https?:\/\/[^\s:@]+:[^\s@]+@[^\s]+/g, replacement: '[MASKED_URL_WITH_CREDENTIALS]' },

  // Generic URLs
  { pattern: /https?:\/\/(?!masked)[^\s"'<>]+/g, replacement: '[MASKED_URL]' },

  // IPv4 addresses
  { pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, replacement: '[MASKED_IP]' },

  // IPv6 addresses
  { pattern: /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g, replacement: '[MASKED_IPV6]' },

  // MAC addresses
  { pattern: /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g, replacement: '[MASKED_MAC]' },

  // JWT tokens
  { pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, replacement: '[MASKED_JWT_TOKEN]' },

  // Bearer tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'Bearer [MASKED_TOKEN]' },

  // API keys (common patterns)
  { pattern: /api[_-]?key\s*[:=]\s*["']?([A-Za-z0-9\-_]{16,})["']?/gi, replacement: 'api_key: [MASKED_API_KEY]' },
  { pattern: /apikey\s*[:=]\s*["']?([A-Za-z0-9\-_]{16,})["']?/gi, replacement: 'apikey: [MASKED_API_KEY]' },
  { pattern: /"api_key"\s*:\s*"([^"]+)"/gi, replacement: '"api_key": "[MASKED_API_KEY]"' },

  // OpenAI-style keys
  { pattern: /sk-[A-Za-z0-9]{32,}/g, replacement: '[MASKED_OPENAI_KEY]' },

  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[MASKED_AWS_ACCESS_KEY]' },
  { pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*["']?([^\s"',]+)["']?/gi, replacement: 'aws_secret_access_key: [MASKED_AWS_SECRET]' },

  // Database connection strings
  { pattern: /mongodb(\+srv)?:\/\/[^\s"']+/gi, replacement: '[MASKED_DB_CONNECTION_STRING]' },
  { pattern: /postgres(ql)?:\/\/[^\s"']+/gi, replacement: '[MASKED_DB_CONNECTION_STRING]' },
  { pattern: /mysql:\/\/[^\s"']+/gi, replacement: '[MASKED_DB_CONNECTION_STRING]' },

  // Credit card numbers (basic pattern)
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[MASKED_CARD_NUMBER]' },

  // Social Security Numbers
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[MASKED_SSN]' },

  // Authorization headers
  { pattern: /authorization\s*:\s*["']?([^\s"',\n]+)["']?/gi, replacement: 'authorization: [MASKED_AUTH_HEADER]' },

  // Secret keys
  { pattern: /secret\s*[:=]\s*["']?([^\s"',;}{]+)["']?/gi, replacement: 'secret: [MASKED_SECRET]' },
  { pattern: /"secret"\s*:\s*"([^"]+)"/gi, replacement: '"secret": "[MASKED_SECRET]"' },

  // Private keys
  { pattern: /-----BEGIN[A-Z\s]+PRIVATE KEY-----[\s\S]*?-----END[A-Z\s]+PRIVATE KEY-----/g, replacement: '[MASKED_PRIVATE_KEY]' },

  // Phone numbers
  { pattern: /\b(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}\b/g, replacement: '[MASKED_PHONE]' },
];

/**
 * Mask sensitive data in log content
 * @param {string} content - Raw log content
 * @returns {object} - { maskedContent, maskingSummary, originalHash }
 */
const maskSensitiveData = (content) => {
  if (!content || typeof content !== 'string') {
    return { maskedContent: content, maskingSummary: {}, originalHash: null };
  }

  const originalHash = crypto.createHash('sha256').update(content).digest('hex');
  let maskedContent = content;
  const maskingSummary = {};

  for (const { pattern, replacement } of MASK_PATTERNS) {
    const matches = maskedContent.match(pattern) || [];
    if (matches.length > 0) {
      const type = replacement.match(/\[([A-Z_]+)\]/)?.[1] || 'UNKNOWN';
      maskingSummary[type] = (maskingSummary[type] || 0) + matches.length;
      maskedContent = maskedContent.replace(pattern, replacement);
    }
  }

  const totalMasked = Object.values(maskingSummary).reduce((a, b) => a + b, 0);

  return {
    maskedContent,
    maskingSummary,
    totalMasked,
    originalHash,
    maskedHash: crypto.createHash('sha256').update(maskedContent).digest('hex')
  };
};

/**
 * Extract error lines from log content
 */
const extractErrors = (content) => {
  if (!content) return [];

  const lines = content.split('\n');
  const errorPatterns = [
    /\b(error|err)\b/i,
    /\b(exception|except)\b/i,
    /\b(fatal|critical)\b/i,
    /\b(fail(ed|ure)?)\b/i,
    /\b(warn(ing)?)\b/i,
    /\b(panic|crash)\b/i,
    /\bstacktrace\b/i,
    /\bnullpointer\b/i,
    /\bsegfault\b/i,
    /\b(timeout|timed\s*out)\b/i,
    /\b(denied|forbidden|unauthorized)\b/i,
    /\b(not\s+found|404)\b/i,
    /\b(500|503|502)\b/,
  ];

  const errors = [];
  lines.forEach((line, index) => {
    if (errorPatterns.some((p) => p.test(line))) {
      const severity = getSeverity(line);
      errors.push({
        lineNumber: index + 1,
        content: line.trim(),
        severity,
        category: categorizeError(line)
      });
    }
  });

  return errors;
};

/**
 * Determine error severity
 */
const getSeverity = (line) => {
  if (/\b(fatal|critical|panic|crash|segfault)\b/i.test(line)) return 'CRITICAL';
  if (/\b(error|err|exception|fail(ed|ure)?|500|503)\b/i.test(line)) return 'ERROR';
  if (/\b(warn(ing)?|deprecated)\b/i.test(line)) return 'WARNING';
  return 'INFO';
};

/**
 * Categorize error type
 */
const categorizeError = (line) => {
  if (/\b(auth|login|permission|forbidden|unauthorized|denied)\b/i.test(line)) return 'Authentication';
  if (/\b(db|database|mongo|sql|query|connection\s+refused)\b/i.test(line)) return 'Database';
  if (/\b(network|connection|timeout|http|socket|dns)\b/i.test(line)) return 'Network';
  if (/\b(null|undefined|typeerror|referenceerror|valueerror)\b/i.test(line)) return 'Runtime';
  if (/\b(memory|heap|stack\s+overflow|oom|out\s+of\s+memory)\b/i.test(line)) return 'Memory';
  if (/\b(file|directory|path|permission|enoent|eacces)\b/i.test(line)) return 'FileSystem';
  if (/\b(config|environment|env|missing\s+key)\b/i.test(line)) return 'Configuration';
  if (/\b(syntax|parse|json|xml|format)\b/i.test(line)) return 'Parsing';
  return 'General';
};

/**
 * Identify repeated vs non-repeated errors
 */
const categorizeRepeatedErrors = (errors) => {
  const errorCounts = {};
  const normalized = errors.map((e) => {
    // Normalize line by removing timestamps, numbers, specific IDs
    const key = e.content
      .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\w]*/g, '[TIMESTAMP]')
      .replace(/\b0x[0-9a-fA-F]+\b/g, '[HEX]')
      .replace(/\b\d+\b/g, '[NUM]')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
      .toLowerCase()
      .trim();
    return { ...e, normalizedKey: key };
  });

  normalized.forEach((e) => {
    errorCounts[e.normalizedKey] = (errorCounts[e.normalizedKey] || 0) + 1;
  });

  const repeated = normalized.filter((e) => errorCounts[e.normalizedKey] > 1).map((e) => ({
    ...e, count: errorCounts[e.normalizedKey]
  }));
  const nonRepeated = normalized.filter((e) => errorCounts[e.normalizedKey] === 1);

  // Deduplicate repeated errors
  const repeatedUnique = [];
  const seen = new Set();
  repeated.forEach((e) => {
    if (!seen.has(e.normalizedKey)) {
      seen.add(e.normalizedKey);
      repeatedUnique.push(e);
    }
  });

  return { repeated: repeatedUnique, nonRepeated, errorCounts };
};

/**
 * Generate SHA-256 hash for cache key
 */
const generateCacheKey = (content, provider) => {
  const hash = crypto.createHash('sha256').update(`${content}::${provider}`).digest('hex');
  return `log_analysis:${hash}`;
};

module.exports = {
  maskSensitiveData,
  extractErrors,
  categorizeRepeatedErrors,
  generateCacheKey,
  getSeverity,
  categorizeError
};