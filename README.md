# Neo-1.0 - AI-First App Creation Platform

> Create fully functional apps in seconds with natural language. Built for business, personal, and home use.

## 🌟 Features

- **Instant App Creation** - Describe what you want, get a working app in seconds
- **Safety-First** - Built-in security, validation, and content moderation
- **Smart Templates** - Pre-built templates for business, personal, and home use
- **Category-Aware** - Automatically detects and optimizes for your app type
- **Real-time Preview** - See your app come to life instantly
- **Privacy-Focused** - Your data, your control

## 🏗️ Architecture

### Packages

- **`@neo/contracts`** - Core type definitions and Zod schemas
- **`@neo/safety`** - Security, validation, and moderation layer
- **`@neo/ai-engine`** - Intent processing and AI orchestration
- **`@neo/templates`** - Template library for fast app generation
- **`@neo/app-generator`** - Unified app generation engine
- **`@neo/server`** - Fastify-based API server
- **`@neo/web`** - React + Vite frontend

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm or yarn
- (Recommended) AI API key for real AI-powered generation:
  - **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
  - **Anthropic**: Get API key from [console.anthropic.com](https://console.anthropic.com/)
  - Without API key, the system will use mock provider (limited functionality)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Edit .env and add your AI API key:
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_key_here

# Build all packages
npm run build

# Start development server
npm run dev
```

The server will start on `http://localhost:3000` and the web app on `http://localhost:5173`.

**Note**: Without an AI API key, the system will use the mock provider which provides basic functionality but limited intelligence.

### Development

```bash
# Watch mode (rebuilds on changes)
npm run dev:watch

# Run tests
npm test

# Build for production
npm run build
```

## 📖 Usage

### Creating an App

1. Open the web interface at `http://localhost:5173`
2. Describe your app in natural language, for example:
   - "A habit tracker app to track my daily routines"
   - "A CRM system for managing customer relationships"
   - "A family hub for coordinating chores and schedules"
3. Click "Create App"
4. Your app will be generated with:
   - Complete schema (pages, components, data models)
   - Realistic mock data
   - Appropriate theme for the category
   - Preview URL

### API Endpoints

#### Create App
```bash
POST /apps/create
Content-Type: application/json

{
  "input": "A habit tracker app",
  "category": "personal", // optional
  "preferences": { // optional
    "userId": "user-123",
    "enableAnalytics": true
  }
}
```

#### Get App
```bash
GET /apps/:id
```

#### Modify App
```bash
POST /apps/:id/modify
Content-Type: application/json

{
  "input": "Add a dark mode toggle"
}
```

#### List Apps
```bash
GET /apps
```

## 🤖 AI Integration

Neo supports multiple AI providers:

### OpenAI (Recommended)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o for better quality
```

### Anthropic Claude
```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Mock Provider (Development)
If no API key is provided, the system uses a mock provider with keyword-based classification.

### Cost Tracking
The system includes built-in cost tracking:
- Automatic token usage tracking
- Daily budget limits
- Cost estimation per request
- Spending summaries

## 🔒 Safety Features

- **Input Sanitization** - All user inputs are sanitized to prevent injection attacks
- **Content Moderation** - Harmful content is detected and blocked
- **Output Validation** - All AI outputs are validated against schemas
- **Rate Limiting** - Prevents abuse and controls costs
- **Resource Limits** - Prevents resource exhaustion
- **XSS Protection** - Cross-site scripting vectors are detected and removed

## 🎯 App Categories

- **Business** - CRM, project management, analytics
- **Personal** - Habit tracking, finance, health
- **Home** - Family hub, inventory, meal planning
- **Creative** - Portfolios, galleries, art collections
- **Health** - Fitness tracking, wellness, medical records
- **Education** - Learning, courses, study tools

## 🛠️ Development

### Project Structure

```
neo-1.0/
├── apps/
│   ├── server/       # Backend API
│   └── web/          # Frontend
├── packages/
│   ├── contracts/    # Shared types
│   ├── safety/       # Security layer
│   ├── core/         # Core logic
│   │   ├── ai-engine/
│   │   ├── templates/
│   │   └── app-generator/
│   └── premium/      # Premium features
└── package.json
```

### Adding a New Template

1. Add template definition to `packages/core/templates/src/template-library.ts`
2. Include relevant keywords for matching
3. Define schema structure
4. Test with various input variations

### Adding a Safety Check

1. Add validation logic to `packages/safety/src/`
2. Integrate into `SafetyOrchestrator`
3. Add appropriate error handling
4. Test with edge cases

## 🚧 Roadmap

- [ ] Real AI integration (OpenAI/Anthropic)
- [ ] Runtime engine for app execution
- [ ] Advanced integrations (payments, analytics, etc.)
- [ ] Multi-platform export (iOS, Android, PWA)
- [ ] Real-time collaboration
- [ ] Advanced analytics and insights
- [ ] Localization (i18n)
- [ ] Mobile app

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please ensure all safety checks pass and code follows the established patterns.

---

Built with ❤️ using TypeScript, Fastify, React, and AI
