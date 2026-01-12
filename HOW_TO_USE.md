# How to Use Neo - Quick Guide

## ✅ Current Status
- Backend server: ✅ Running on http://localhost:3000
- Frontend server: ✅ Running on http://localhost:5173

## 🚀 Access Your App

**Open in your browser:** http://localhost:5173

## 📝 Steps to Create an App

1. **Open the frontend:** Go to `http://localhost:5173` in your browser
   - This is the web interface where you'll create apps
   - Do NOT access `http://localhost:3000` directly (that's the backend API)

2. **Create an app:**
   - Type your app description in the text area
   - Example: "A habit tracker app to track my daily routines"
   - Click "Create App" button

3. **View your app:**
   - After creation, you'll see the app details
   - Click "View App Preview" to see the preview
   - The preview will open in a new tab

## 🔍 Troubleshooting

### If you see "Preview Undefined" error:
- Check the browser console (F12) for error messages
- Make sure both servers are running
- Try creating a new app

### If the frontend doesn't load:
- Make sure the frontend server is running: `cd apps/web && npm run dev`
- Check that port 5173 is not blocked

### If app creation fails:
- Check backend server logs in the terminal
- Look for error messages in the browser console
- Make sure the backend is running on port 3000

## 🛑 Stopping Servers

Press `Ctrl+C` in the terminal where the servers are running.

## 🔄 Restarting Servers

**Backend:**
```bash
cd apps/server
npm run build
npm run dev
```

**Frontend:**
```bash
cd apps/web
npm run dev
```

## 📊 Server URLs

- **Frontend (what you use):** http://localhost:5173
- **Backend API:** http://localhost:3000 (accessed automatically by frontend)
- **Health Check:** http://localhost:3000/health

---

**Note:** Always access the app through the frontend at `localhost:5173`. The backend at `localhost:3000` is an API endpoint and should not be accessed directly in the browser (except for testing).
