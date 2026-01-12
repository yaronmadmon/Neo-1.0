/**
 * Data Sanitization Utilities
 * Prevents sensitive data from being logged
 */

// Fields that should never be logged (will be masked)
const SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'apikey',
  'api-key',
  'openaiApiKey',
  'openai_api_key',
  'anthropicApiKey',
  'anthropic_api_key',
  'authorization',
  'authorization',
  'auth',
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionId',
  'session_id',
  'cookie',
  'cookies',
  'credentials',
  'privateKey',
  'private_key',
  'sshKey',
  'ssh_key',
] as const;

/**
 * Mask sensitive value
 */
function maskValue(value: unknown): string {
  if (typeof value === 'string') {
    if (value.length <= 4) {
      return '****';
    }
    return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
  }
  return '****';
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some((sensitive) => 
    lowerField.includes(sensitive.toLowerCase())
  );
}

/**
 * Sanitize an object by masking sensitive fields
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      sanitized[key] = maskValue(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize request body/query/params (remove sensitive data)
 */
export function sanitizeRequest(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => 
      typeof item === 'object' && item !== null 
        ? sanitizeObject(item as Record<string, unknown>)
        : item
    );
  }
  
  return sanitizeObject(data as Record<string, unknown>);
}

/**
 * Sanitize headers (remove authorization and sensitive headers)
 */
export function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (isSensitiveField(key)) {
      sanitized[key] = maskValue(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
