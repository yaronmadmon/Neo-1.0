# Security Notes for Debugging & Logging

## ✅ Security Safeguards Implemented

### 1. Data Sanitization (`apps/server/src/utils/sanitize.ts`)
- **Automatic masking** of sensitive fields in logs
- Fields automatically masked: `apiKey`, `password`, `token`, `secret`, etc.
- Recursive sanitization for nested objects
- Prevents accidental exposure of API keys and credentials

### 2. Request Logging Security
- **Request logger does NOT log:**
  - Request bodies
  - Request headers (only User-Agent)
  - Query parameters
  - Sensitive data
  
- **Request logger ONLY logs:**
  - HTTP method
  - URL path
  - IP address
  - Status code
  - Response time
  - User-Agent header (non-sensitive)

### 3. Config Security
- API keys stored in **environment variables** (not in code)
- Config object keys are **never logged directly**
- Only provider name is logged (not the actual keys)

### 4. Logger Sanitization
- All log context is **automatically sanitized** before logging
- Sensitive fields are masked (e.g., `apiKey: "sk-1234****5678"`)
- Prevents accidental exposure in debug logs

## 🔒 Safe Practices

### ✅ DO:
- Store API keys in environment variables
- Use the structured logger (it auto-sanitizes)
- Log only non-sensitive data in context
- Use debug namespaces to control what's logged

### ❌ DON'T:
- Don't log request bodies directly
- Don't log the config object directly
- Don't log API keys, tokens, or passwords
- Don't log full user objects with credentials

## 🛡️ What Gets Masked Automatically

The sanitization function automatically masks these field patterns:
- `apiKey`, `api_key`, `apikey`
- `openaiApiKey`, `anthropicApiKey`
- `password`, `passwd`, `pwd`
- `token`, `accessToken`, `refreshToken`
- `secret`, `privateKey`
- `authorization`, `auth`
- `cookie`, `sessionId`
- And any field containing these patterns

Example:
```typescript
// Before sanitization:
{ apiKey: "sk-1234567890abcdef", userId: "123" }

// After sanitization:
{ apiKey: "sk-1****cdef", userId: "123" }
```

## 🚨 Important Notes

1. **Debug Package** - Only logs when `DEBUG` environment variable is set
   - Safe for production (disabled by default)
   - Only enable in development or debugging

2. **Request Logging** - Only logs metadata, never bodies
   - Safe for production use
   - No sensitive data in request logs

3. **Structured Logger** - Auto-sanitizes all context
   - Always use the structured logger for safety
   - Manual console.log should be avoided

4. **VS Code Debugger** - Local development only
   - Variables visible in debugger are local to your machine
   - No network exposure
   - Safe for development

## 📝 Phase 2 Migration

When migrating console.log in Phase 2:
- ✅ Use structured logger (auto-sanitizes)
- ✅ Avoid logging full objects with credentials
- ✅ Log only necessary context
- ❌ Don't log request bodies directly
- ❌ Don't log config objects directly

## 🔐 Environment Variables

Keep these secure:
- `OPENAI_API_KEY` - Never logged
- `ANTHROPIC_API_KEY` - Never logged
- `DEBUG` - Controls debug output (safe for development)

## ✅ Current Status: SECURE

All logging utilities include sanitization:
- ✅ Request logger - No sensitive data logged
- ✅ Structured logger - Auto-sanitizes context
- ✅ Config - Never logged directly
- ✅ Debug package - Development only

You can proceed with Phase 2 safely! 🎉
