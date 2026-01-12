# Debug: Preview "Undefined" Issue

## Problem
When creating an app, the preview link shows `/api/preview/undefined` and returns a 404 error.

## Fixes Applied

1. **Frontend Validation**: Added strict validation to ensure `app.id` exists before setting state
2. **Server Validation**: Added validation to ensure app has ID before storing
3. **Preview Route**: Added handling for undefined/invalid IDs with proper HTML error pages
4. **Type Safety**: Ensured all IDs are converted to strings explicitly

## To Test

1. Restart both servers:
   ```bash
   # Terminal 1 - Backend
   cd apps/server
   npm run build
   npm run dev

   # Terminal 2 - Frontend  
   cd apps/web
   npm run dev
   ```

2. Open browser console (F12) and check for:
   - "App creation response:" log
   - "Setting app state with ID:" log
   - Any error messages

3. Create an app and check:
   - Does the app display with name, category, description?
   - Does the preview link show a valid ID (not "undefined")?
   - Click the preview link - does it work?

## If Issue Persists

Check browser console for:
- What does "App creation response:" show?
- What is the value of `data.app.id`?
- Is there any error in the console?
