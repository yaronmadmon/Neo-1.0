# App Routes Fix Summary

## Problem
The frontend was calling:
- `POST /api/apps/discover`
- `POST /api/apps/create`

But these endpoints were either:
1. Not registered at all, OR
2. Registered without the `/api` prefix (as `/apps/discover` and `/apps/create`)

This caused 500 errors with empty responses.

## Solution

### Created New Routes File
**File:** `apps/server/src/app-routes.ts`

This file follows the same pattern as other route files (`integrations-routes.ts`, `database-routes.ts`, etc.) and registers:
- `POST /api/apps/discover` - App discovery endpoint
- `POST /api/apps/create` - App creation endpoint

### Route Implementation

#### POST /api/apps/discover
- **Purpose:** Analyze user input and return discovery questions if needed
- **Request Body:**
  ```json
  {
    "input": "string (required)",
    "conversationId": "string (optional)",
    "answers": "object (optional)",
    "discoveredInfo": "object (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "needsClarification": boolean,
    "questions": array,
    "discoveredInfo": object,
    "confidence": number,
    "suggestedFeatures": array
  }
  ```
- **Error Response:**
  ```json
  {
    "success": false,
    "error": "Discovery failed",
    "message": "error message"
  }
  ```

#### POST /api/apps/create
- **Purpose:** Create a new app from user input
- **Request Body:**
  ```json
  {
    "input": "string (required)",
    "category": "string (optional)",
    "preferences": "object (optional)",
    "discoveredInfo": "object (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "app": {
      "id": "string",
      "name": "string",
      "category": "string",
      "schema": object,
      "theme": object,
      "data": object,
      ...
    },
    "previewUrl": "string",
    "safety": object
  }
  ```
- **Error Response:**
  ```json
  {
    "success": false,
    "error": "App creation failed",
    "message": "error message"
  }
  ```

### Features
✅ **Proper Error Handling**
- All routes wrapped in try/catch
- Errors logged to console
- Always returns JSON (never empty responses)
- Specific error messages for different error types

✅ **Input Validation**
- Validates required fields
- Checks input length and type
- Returns 400 for invalid input

✅ **Rate Limiting**
- Integrated with existing rate limiting system
- Returns 429 when limit exceeded

✅ **Safety Checks**
- Validates generated apps
- Returns 403 if safety check fails

✅ **Proper JSON Serialization**
- Ensures all responses are valid JSON
- Handles Date objects properly
- No undefined values in responses

### Integration
**File Modified:** `apps/server/src/index.ts`

Added route registration in the `start()` function:
```typescript
await registerAppRoutes(server, {
  discoveryHandler,
  appGenerator,
  neoEngine,
  safetyOrchestrator,
  appStore,
  checkRateLimit,
  config,
  determinePrivacyLevel,
  materializedAppToSchema,
  materializedAppToTheme,
});
```

### Dependencies Injected
The routes file receives all necessary dependencies:
- `discoveryHandler` - For discovery logic
- `neoEngine` - For app generation
- `safetyOrchestrator` - For safety validation
- `appStore` - For storing created apps
- Helper functions for conversion and rate limiting

## Testing

### Test Discovery Endpoint
```bash
curl -X POST http://localhost:3000/api/apps/discover \
  -H "Content-Type: application/json" \
  -d '{"input": "I want to create a job management app"}'
```

**Expected Response:**
```json
{
  "success": true,
  "needsClarification": false,
  "questions": [],
  "discoveredInfo": {...},
  "confidence": 0.9,
  "suggestedFeatures": [...]
}
```

### Test Create Endpoint
```bash
curl -X POST http://localhost:3000/api/apps/create \
  -H "Content-Type: application/json" \
  -d '{"input": "Create a job management app for plumbers"}'
```

**Expected Response:**
```json
{
  "success": true,
  "app": {
    "id": "...",
    "name": "...",
    "schema": {...},
    ...
  },
  "previewUrl": "/preview/...",
  "safety": {...}
}
```

## Files Changed

### Created
- `apps/server/src/app-routes.ts` - New routes file

### Modified
- `apps/server/src/index.ts` - Added route registration

## Acceptance Criteria ✅

- ✅ POST /api/apps/discover returns JSON
- ✅ POST /api/apps/create returns JSON
- ✅ No more empty responses
- ✅ No more silent 500 errors
- ✅ All errors are logged
- ✅ All responses are valid JSON
- ✅ Routes follow existing architecture patterns

## Notes

- The routes are registered **after** other routes but **before** server starts listening
- Both routes use the existing business logic (no refactoring)
- Error handling ensures JSON responses even on failures
- Rate limiting is integrated
- Safety checks are performed before returning apps
