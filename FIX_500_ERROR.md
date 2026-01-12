# Fix for HTTP 500 Errors

## Problem

The server is returning HTTP 500 errors with empty response bodies. This is happening because:

1. We just added `@neo/migrations` package import to the server
2. The migrations package hasn't been built yet (no `dist/` folder)
3. When Node.js tries to import from `@neo/migrations`, it fails because the package doesn't exist
4. This causes the entire server module to fail to load, resulting in 500 errors

## Solution

The migrations import is only used in the `/apps/:id/modify` endpoint, not in `/apps/discover` or `/apps/create`. However, the import happens at the top level, so it fails when the module loads.

**Quick Fix Options:**

### Option 1: Build the migrations package (Recommended)

```powershell
# Build all packages
cd C:\Neo-1.0
npm run build

# Or just build migrations
cd packages\core\migrations
npm run build
```

**Note:** This requires TypeScript to be in your PATH. If `tsc` isn't recognized, you may need to:
- Use `npx tsc` instead
- Or install TypeScript globally: `npm install -g typescript`
- Or run from the workspace root

### Option 2: Temporarily comment out migrations import (Quick fix)

If you can't build right now, temporarily comment out the migrations import and the modify endpoint code that uses it:

1. Comment out line 12: `// import { MigrationPlanner, MigrationApplier } from '@neo/migrations';`
2. Comment out the migration code in the `/apps/:id/modify` endpoint
3. Rebuild the server
4. Restart the server

### Option 3: Make migrations import lazy (Better fix)

Change the import to be lazy (only import when needed):

Instead of:
```typescript
import { MigrationPlanner, MigrationApplier } from '@neo/migrations';
```

Use:
```typescript
// Lazy import - only load when modify endpoint is called
async function getMigrationPlanner() {
  const { MigrationPlanner } = await import('@neo/migrations');
  return new MigrationPlanner();
}

async function getMigrationApplier() {
  const { MigrationApplier } = await import('@neo/migrations');
  return new MigrationApplier();
}
```

Then in the modify endpoint:
```typescript
const migrationPlanner = await getMigrationPlanner();
const plan = await migrationPlanner.planMigration(input, app);
```

## Current Status

- Server processes are running (node processes exist)
- But server is returning 500 errors with empty bodies
- Migrations package exists in source but not in dist/
- Server needs to be rebuilt after migrations package is built

## Next Steps

1. **Build migrations package**: `npm run build` (from root or migrations package)
2. **Rebuild server**: `cd apps/server && npm run build`
3. **Restart server**: Stop and restart the server process
4. **Test**: Try the `/apps/create` endpoint again

## Error Details

From the screenshot:
- HTTP 500 errors on `/api/apps/discover` and `/api/apps/create`
- Empty response body (Response text length: 0)
- Frontend getting "SyntaxError: Unexpected end of JSON input"
- Server catch blocks should send JSON but they're not (because the error happens before catch)

This confirms the module is failing to load at the top level due to the missing migrations package.
