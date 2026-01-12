# Debugging Setup Guide

## Phase 1: Foundation Complete ✅

### What's Installed

1. **VS Code Debugger Configuration** (`.vscode/launch.json`)
   - Debug Server - Launch and debug the backend server
   - Attach to Server - Attach to running server process
   - Debug Frontend - Launch Chrome and debug frontend
   - Debug Frontend (Attach) - Attach to running Chrome
   - Debug Both - Debug server and frontend simultaneously

2. **Debug Package** (`debug`)
   - Namespace-based conditional logging
   - Turn on/off via environment variable
   - No performance overhead when disabled

3. **Structured Logger** (`apps/server/src/utils/logger.ts`)
   - Log levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
   - Context support (key-value pairs)
   - Environment-based log levels
   - Request ID support for tracing

4. **Request Logging Middleware** (`apps/server/src/utils/request-logger.ts`)
   - Logs all HTTP requests/responses
   - Request IDs for tracing
   - Timing information
   - Status codes

## How to Use

### VS Code Debugger

1. **Debug Server:**
   - Open VS Code
   - Go to Run and Debug (F5)
   - Select "Debug Server"
   - Set breakpoints in your code
   - Click Start Debugging (F5)

2. **Debug Frontend:**
   - Start frontend dev server first (`npm run dev:web`)
   - Select "Debug Frontend"
   - Set breakpoints in React components
   - Click Start Debugging

3. **Debug Both:**
   - Select "Debug Both (Server + Frontend)"
   - Set breakpoints in both
   - Click Start Debugging

### Debug Package (Namespace-based Logging)

Enable debug logging via environment variable:

```bash
# Enable all Neo debugging
DEBUG=neo:* npm run dev

# Enable only server logs
DEBUG=neo:server npm run dev

# Enable multiple namespaces
DEBUG=neo:server,neo:api,neo:generator npm run dev

# Enable everything
DEBUG=* npm run dev
```

Available namespaces:
- `neo:server` - Server-level logs
- `neo:api` - API endpoint logs
- `neo:generator` - App generator logs
- `neo:ai` - AI provider logs
- `neo:safety` - Safety/validation logs
- `neo:discovery` - Discovery service logs
- `neo:error` - Error logs
- `neo:request` - HTTP request logs

### Structured Logger

Use the logger utility in your code:

```typescript
import { logger } from './utils/logger.js';

// Simple log
logger.info('Server started');

// With context
logger.info('User created', { userId: '123', email: 'user@example.com' });

// Error logging
logger.error('Failed to create app', error, { appId: '456' });

// Different levels
logger.debug('Debug message', { data: someData });
logger.warn('Warning message', { reason: 'low memory' });
logger.trace('Detailed trace', { step: 'validation' });
```

### Log Levels

Set log level via environment variable:

```bash
# Development (shows all logs)
LOG_LEVEL=debug npm run dev

# Production (only info and above)
LOG_LEVEL=info npm run dev

# Minimal logging
LOG_LEVEL=warn npm run dev
```

### Request Logging

Request logging is automatically enabled. It logs:
- Request method and URL
- Request ID (for tracing)
- Response status code
- Duration

Example output:
```
neo:request → GET /apps/123 req-1234567890-abc
neo:request ← GET /apps/123 200 45ms
```

## Environment Variables

Add to `.env` file (create if doesn't exist):

```env
# Logging
LOG_LEVEL=debug
DEBUG=neo:*

# Or for production
LOG_LEVEL=info
DEBUG=
```

## Next Steps (Phase 2)

Phase 2 will:
- Replace console.log with structured logger
- Add more debug points throughout the codebase
- Enhance request logging with more context
- Add performance monitoring

## Troubleshooting

**Debugger not working:**
- Make sure TypeScript is compiled (`npm run build` in apps/server)
- Check that ports 3000 (server) and 5173 (frontend) are available
- Verify source maps are enabled (already configured)

**Debug package not showing logs:**
- Set DEBUG environment variable (e.g., `DEBUG=neo:*`)
- Check namespace matches (case-sensitive)
- Verify debug package is installed

**Request logging not showing:**
- Check DEBUG includes `neo:request` namespace
- Verify middleware is registered (should be automatic)
- Check server logs for errors
