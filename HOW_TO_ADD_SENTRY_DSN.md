# How to Add Your Sentry DSN - Step by Step

## Step 1: Get Your DSN from Sentry

### Option A: If you already have a Sentry account
1. Go to https://sentry.io
2. Log in
3. Click on your project (or create a new one)
4. Go to **Settings** → **Projects** → Select your project
5. Click **Client Keys (DSN)**
6. Copy the DSN (it looks like: `https://abc123def456@o123456.ingest.sentry.io/7890123`)

### Option B: If you don't have a Sentry account yet
1. Go to https://sentry.io/signup/
2. Sign up (it's free)
3. After signing up, you'll be asked to create a project
4. Select **"Node.js"** as the platform
5. Name it "Neo-1.0" (or any name you like)
6. Click **"Create Project"**
7. **The DSN will be shown immediately** - copy it!

## Step 2: Add DSN to Your .env File

### Find your .env file
Your `.env` file should be in: `apps/server/.env`

### If the file doesn't exist:
1. Create a new file called `.env` in the `apps/server/` folder
2. Add this line:
   ```env
   SENTRY_DSN=your_dsn_here
   ```

### If the file already exists:
1. Open `apps/server/.env` in a text editor
2. Add this line (or update if it already exists):
   ```env
   SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7890123
   ```
   (Replace with your actual DSN from Step 1)

## Step 3: Example .env File

Your `.env` file should look something like this:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Logging
LOG_LEVEL=debug

# AI Configuration (if you have these)
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here

# Sentry Error Tracking
SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7890123
```

## Step 4: Verify It Works

1. Save the `.env` file
2. Restart your server:
   ```bash
   cd apps/server
   npm run dev
   ```
3. Look for this message in the console:
   ```
   ✅ Sentry initialized successfully
   ```

If you see that message, you're all set! 🎉

## Quick Visual Guide

```
1. Go to sentry.io → Sign up/Login
2. Create project → Select "Node.js"
3. Copy DSN (looks like: https://xxx@xxx.ingest.sentry.io/xxx)
4. Open apps/server/.env
5. Add: SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
6. Save file
7. Restart server
8. See "✅ Sentry initialized successfully"
```

## Troubleshooting

### "File .env not found"
- Create it in `apps/server/.env`
- Make sure it's in the right folder

### "Sentry DSN not provided"
- Check that `SENTRY_DSN=` line is in your `.env` file
- Make sure there are no spaces around the `=`
- Make sure the DSN starts with `https://`

### "Failed to initialize Sentry"
- Check that your DSN is correct (copy it again from Sentry)
- Make sure you have internet connection
- Check Sentry dashboard to see if project is active

## Step 5: Debugging Errors with Sentry

When you get an error in your terminal, Sentry automatically captures it! Here's how to use it:

### View Errors in Sentry

1. **Go to your Sentry dashboard**
   - Visit https://sentry.io
   - Log in and select your project

2. **Check the "Issues" page**
   - Click on **"Issues"** in the left sidebar
   - You'll see all errors that occurred
   - Errors are grouped by type (similar errors are grouped together)

3. **Click on an error to see details**
   - **Message**: The error message
   - **Stack Trace**: Exact line where the error occurred
   - **Request Context**: 
     - HTTP method (GET, POST, etc.)
     - URL that caused the error
     - Request headers
     - Request body (what data was sent)
   - **Custom Context**: Additional info like endpoint, input length, etc.
   - **Breadcrumbs**: What happened before the error

### What Errors Are Captured?

Sentry automatically captures:
- ✅ **API endpoint errors** (e.g., `/api/apps/create`)
- ✅ **Global error handler errors** (unhandled errors in routes)
- ✅ **Uncaught exceptions** (crashes)
- ✅ **Unhandled promise rejections** (async errors)

### Finding a Specific Error

1. **Look at the error in your terminal**
   - Note the error message
   - Note the timestamp

2. **Go to Sentry Issues**
   - Errors are sorted by most recent first
   - Use the search box to search for keywords from the error

3. **Match the error**
   - Check the timestamp matches
   - Check the error message matches
   - Check the URL/endpoint matches what you were testing

### Example: Debugging a Terminal Error

**Terminal shows:**
```
Error: Cannot read property 'id' of undefined
    at app-routes.ts:230:15
```

**In Sentry, you'll see:**
- The same error message
- Full stack trace showing `app-routes.ts:230:15`
- Request details showing which API endpoint was called
- The request body that caused the error
- Any additional context (like `endpoint: "/api/apps/create"`)

### Tips for Debugging

1. **Check Sentry immediately after an error**
   - Errors appear within a few seconds
   - Refresh the Issues page if needed

2. **Look at the request context**
   - See exactly what data was sent
   - Check the URL and HTTP method
   - Review headers if relevant

3. **Use the stack trace**
   - Click on file names to see the exact code
   - See the call stack (what called what)

4. **Check breadcrumbs**
   - See what happened before the error
   - Helps understand the sequence of events

5. **Filter errors**
   - Use Sentry's filters to find specific errors
   - Filter by environment (development/production)
   - Filter by URL or error type

## Need Help?

If you're stuck:
1. Make sure you copied the **entire DSN** (it's long, starts with `https://`)
2. Make sure there are **no quotes** around the DSN in `.env`
3. Make sure the `.env` file is in `apps/server/` folder
4. Restart the server after adding the DSN
5. Check Sentry dashboard - errors appear within seconds

### Errors not showing in Sentry?

- Wait a few seconds (Sentry batches errors)
- Check that `SENTRY_DSN` is set in your `.env` file
- Verify you see "✅ Sentry initialized successfully" when server starts
- Check your internet connection
- Make sure you're looking at the correct Sentry project

---

That's it! Once you add the DSN, all errors will be automatically tracked in Sentry. When you see an error in the terminal, check your Sentry dashboard for full debugging details! 🚀
