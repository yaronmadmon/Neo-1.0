# Quick Fix: Server Access Issue

## Problem
Browser shows `ERR_ADDRESS_INVALID` when trying to access `http://0.0.0.0:3000/`

## Root Cause
- `0.0.0.0` is a server binding address (means "listen on all network interfaces")
- Browsers cannot access `0.0.0.0` directly - you must use `localhost` or `127.0.0.1`
- The backend server should be accessed through the frontend's Vite proxy, not directly

## Solution

### 1. Access the Frontend (NOT the Backend directly)
**Correct URL:** `http://localhost:5173`
**Wrong URL:** `http://0.0.0.0:3000` ❌

### 2. Start Both Servers

**Terminal 1 - Backend:**
```bash
cd apps/server
npm run build
npm run dev
```
Should show: `🚀 Neo server running on http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```
Should show: `Local: http://localhost:5173/`

### 3. Open in Browser
Open: `http://localhost:5173`

The frontend will automatically proxy API calls to the backend at `localhost:3000`.

### 4. How It Works
- Frontend runs on `localhost:5173`
- Backend runs on `localhost:3000` (or `0.0.0.0:3000` internally)
- Vite proxy forwards `/api/*` requests from frontend to backend
- User only needs to access `localhost:5173`

## Important Notes
- ✅ Access frontend at: `http://localhost:5173`
- ✅ Backend accessible via proxy from frontend
- ❌ Don't try to access `http://0.0.0.0:3000` directly in browser
- ❌ Don't try to access `http://localhost:3000` directly (use frontend instead)
