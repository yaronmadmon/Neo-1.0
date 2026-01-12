# Sentry Error Tracking Setup

Sentry has been integrated into your Neo server to automatically capture and track all errors.

## ✅ What's Been Done

1. **Sentry Package Installed** - `@sentry/node` added to dependencies
2. **Sentry Initialization** - Auto-initializes on server startup
3. **Error Capture** - All errors are automatically captured:
   - Global error handler errors
   - Try/catch block errors (in app-routes.ts)
   - Uncaught exceptions
   - Unhandled promise rejections
4. **Full Context** - Errors include:
   - Request details (method, URL, headers, body)
   - Stack traces
   - Custom context (endpoint, input length, etc.)
   - Breadcrumbs (what happened before the error)

## 🚀 Quick Setup (2 minutes)

### Step 1: Create Sentry Account
1. Go to https://sentry.io/signup/
2. Sign up (free account)
3. Create a new project:
   - Select **"Node.js"** as the platform
   - Name it "Neo-1.0" (or any name you like)
4. Copy the **DSN** (Data Source Name)
   - It looks like: `https://abc123@o123456.ingest.sentry.io/7890123`

### Step 2: Add DSN to Environment
Add to your `.env` file in `apps/server/`:

```env
SENTRY_DSN=https://your-dsn-here@o123456.ingest.sentry.io/7890123
```

### Step 3: Restart Server
```bash
cd apps/server
npm run dev
```

You should see:
```
✅ Sentry initialized successfully
```

## 📊 What You Get

### Automatic Error Tracking
- **All errors captured** - Even errors in try/catch blocks
- **Full stack traces** - See exactly where errors occur
- **Request context** - See what request caused the error
- **Breadcrumbs** - See what happened before the error

### Sentry Dashboard
- View all errors in one place
- See error frequency and trends
- Get email/Slack notifications
- Group similar errors together
- Full error details with context

### Free Tier Includes
- 5,000 errors/month
- 7 days of error history
- Unlimited projects
- Email notifications
- Full error details

## 🔧 Configuration Options

### Disable in Development
If you don't want Sentry to send errors during development:

```env
SENTRY_DISABLE_DEV=true
```

### Environment-Specific Settings
Sentry automatically detects your environment:
- `development` - 100% trace sampling, debug mode
- `production` - 10% trace sampling, optimized

## 📍 Where Errors Are Captured

1. **Global Error Handler** (`apps/server/src/index.ts`)
   - All unhandled Fastify errors
   - Includes full request context

2. **App Routes** (`apps/server/src/app-routes.ts`)
   - `/api/apps/discover` errors
   - `/api/apps/create` errors
   - Includes endpoint-specific context

3. **Uncaught Exceptions**
   - Process-level errors
   - Unhandled promise rejections

## 🐛 How to Use

### View Errors
1. Go to https://sentry.io
2. Select your project
3. Click "Issues" to see all errors
4. Click an error to see full details

### Share Errors with AI
When debugging with AI assistant:
1. Copy the Sentry issue URL
2. Share it: "Check Sentry issue #12345"
3. AI can see full error details

### Get Notifications
1. Go to Sentry Settings → Notifications
2. Configure email/Slack alerts
3. Get notified when errors occur

## 🔍 Example Error in Sentry

When an error occurs, Sentry captures:
```json
{
  "message": "Cannot read property 'id' of undefined",
  "stack": "at app-routes.ts:230:15\n  at async handler...",
  "request": {
    "method": "POST",
    "url": "/api/apps/create",
    "body": { "input": "..." },
    "headers": { ... }
  },
  "context": {
    "endpoint": "/api/apps/create",
    "inputLength": 150,
    "category": "business"
  },
  "breadcrumbs": [
    { "message": "Discovery endpoint called", "timestamp": "..." },
    { "message": "Create app endpoint called", "timestamp": "..." }
  ]
}
```

## 🎯 Next Steps

1. **Add your DSN** to `.env` file
2. **Restart server** to initialize Sentry
3. **Trigger an error** to test (or wait for real errors)
4. **Check Sentry dashboard** to see errors
5. **Set up notifications** for important errors

## 💡 Pro Tips

- **Test it**: Intentionally cause an error to see it in Sentry
- **Check regularly**: Review Sentry dashboard weekly
- **Set up alerts**: Get notified for critical errors
- **Use tags**: Add custom tags to filter errors
- **Share with team**: Give team access to Sentry project

## ❓ Troubleshooting

### Sentry not initializing?
- Check that `SENTRY_DSN` is in your `.env` file
- Make sure DSN is correct (starts with `https://`)
- Check server logs for initialization message

### Errors not appearing?
- Wait a few seconds (Sentry batches errors)
- Check Sentry dashboard (not just email)
- Verify DSN is correct
- Check network connectivity

### Too many errors in development?
- Set `SENTRY_DISABLE_DEV=true` in `.env`
- Or filter errors in Sentry dashboard

---

**That's it!** Your errors are now being tracked automatically. 🎉
