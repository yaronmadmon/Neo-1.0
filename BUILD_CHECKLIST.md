# Build Checklist ✅

## Pre-Build Checks

- [x] All package.json files have correct dependencies
- [x] All tsconfig.json files have correct references
- [x] All TypeScript files compile without errors
- [x] All imports resolve correctly
- [x] Environment variable configuration ready
- [x] Documentation complete

## Build Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build TypeScript**
   ```bash
   npm run build
   ```

3. **Verify Build Output**
   - Check `dist/` folders in all packages
   - Verify no compilation errors

4. **Run Server**
   ```bash
   npm run dev
   ```

## Package Dependencies

### Root Package
- zod
- TypeScript
- Vitest
- Concurrently
- Nodemon

### @neo/contracts
- zod

### @neo/safety
- @neo/contracts
- zod

### @neo/ai-engine
- @neo/contracts
- @neo/safety
- openai
- @anthropic-ai/sdk

### @neo/templates
- @neo/contracts

### @neo/app-generator
- @neo/contracts
- @neo/templates
- @neo/ai-engine
- @neo/safety

### @neo/runtime
- @neo/contracts

### @neo/server
- @neo/contracts
- @neo/premium
- @neo/app-generator
- @neo/ai-engine
- @neo/templates
- @neo/safety
- @neo/runtime
- fastify
- pino-pretty

### @neo/web
- react
- react-dom
- vite
- tailwindcss

## Build Order

Due to TypeScript project references, build order matters:

1. contracts (no dependencies)
2. safety (depends on contracts)
3. templates (depends on contracts)
4. ai-engine (depends on contracts, safety)
5. app-generator (depends on contracts, templates, ai-engine, safety)
6. runtime (depends on contracts)
7. premium (depends on contracts)
8. server (depends on all)
9. web (independent)

## Common Build Issues

### Issue: Cannot find module '@neo/contracts'
**Solution**: Run `npm install` from root, then `npm run build`

### Issue: TypeScript project references error
**Solution**: Ensure all tsconfig.json files have correct references and use `composite: true`

### Issue: Build fails on first package
**Solution**: Build in dependency order manually:
```bash
cd packages/contracts && npm run build
cd ../safety && npm run build
# etc.
```

### Issue: Workspace packages not found
**Solution**: Delete node_modules and package-lock.json, then reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Post-Build Verification

- [ ] Server starts without errors
- [ ] Health check endpoint responds
- [ ] API endpoints are accessible
- [ ] Frontend can connect to backend
- [ ] AI provider initializes correctly
- [ ] No runtime errors in console

## Testing

```bash
# Run tests
npm test

# Test API endpoints
curl http://localhost:3000/health
curl -X POST http://localhost:3000/apps/create \
  -H "Content-Type: application/json" \
  -d '{"input": "A simple todo app"}'
```
