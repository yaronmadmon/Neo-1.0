# Server Rebuild Required

## Fix Applied
Added error handling to the `/apps/:id` GET endpoint to properly catch and log errors.

## To Apply the Fix

**Option 1: Use the start script (recommended)**
```powershell
cd "C:\Neo-1.0"
.\start-servers.ps1
```

**Option 2: Manual rebuild and restart**
```powershell
cd "C:\Neo-1.0"
npm run build
cd apps\server
npm run build
npm run dev
```

**Option 3: If TypeScript not found, use npm directly**
```powershell
cd "C:\Neo-1.0"
npm run build
```

The server needs to be rebuilt to pick up the error handling changes. Once rebuilt and restarted, the 500 errors will be properly handled and logged.
