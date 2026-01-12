# Quick Start Guide

Get Neo up and running in 5 minutes!

## Prerequisites

- Node.js 20+ installed
- npm or yarn installed

## Installation

```bash
# 1. Install all dependencies
npm install

# 2. Build the project
npm run build
```

## Configuration (Optional)

For real AI-powered generation:

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key:
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-your-key-here
```

**Note**: Without an API key, the system uses a mock provider (limited but functional).

## Running

### Start the Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

### Start the Web UI (new terminal)

```bash
cd apps/web
npm install
npm run dev
```

Web UI starts on `http://localhost:5173`

## Test It Out

1. Open `http://localhost:5173` in your browser
2. Enter: "A habit tracker app to track my daily routines"
3. Click "Create App"
4. Watch the magic happen! ✨

## API Examples

### Create an App
```bash
curl -X POST http://localhost:3000/apps/create \
  -H "Content-Type: application/json" \
  -d '{"input": "A simple todo list app"}'
```

### Get an App
```bash
curl http://localhost:3000/apps/{app-id}
```

### List All Apps
```bash
curl http://localhost:3000/apps
```

## What You Get

- ✅ Fully functional app schema
- ✅ Realistic mock data
- ✅ Appropriate theme for category
- ✅ Safety-validated structure
- ✅ Ready to use!

## Next Steps

- Add your AI API key for better generation
- Customize templates in `packages/core/templates`
- Modify themes in `packages/core/app-generator`
- Add new features!

---

**That's it! You're ready to create apps with AI! 🚀**
