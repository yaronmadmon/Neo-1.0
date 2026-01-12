# Setup Instructions

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build all packages:**
   ```bash
   npm run build
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

   This will:
   - Build all TypeScript packages
   - Start the Fastify server on port 3000
   - Serve the API at `http://localhost:3000`

4. **Start web frontend (in a new terminal):**
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

   The web app will be available at `http://localhost:5173`

## Development Workflow

### Watch Mode
```bash
npm run dev:watch
```

This runs TypeScript compiler in watch mode and nodemon for auto-reloading the server.

### Individual Package Development

Each package can be built independently:

```bash
cd packages/contracts
npm run build

cd ../safety
npm run build

# etc.
```

## Project Structure

```
neo-1.0/
├── apps/
│   ├── server/          # Fastify API server
│   └── web/             # React frontend
├── packages/
│   ├── contracts/       # Type definitions & schemas
│   ├── safety/          # Security & validation
│   ├── core/
│   │   ├── ai-engine/   # AI intent processing
│   │   ├── templates/   # App templates
│   │   ├── app-generator/ # Unified generator
│   │   └── runtime/     # App runtime engine
│   └── premium/         # Premium features (future)
└── package.json
```

## Important Notes

- All packages use TypeScript with strict mode
- Packages are linked via npm workspaces
- Build order matters: contracts → safety → core packages → apps
- The AI engine uses a mock provider by default (replace with real AI in production)

## Environment Variables

Create a `.env` file in the root for production:

```env
# AI Provider (optional for development)
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here

# Server
PORT=3000
NODE_ENV=development
```

## Troubleshooting

### Workspace Package Not Found
If you get errors about `@neo/*` packages not being found:
1. Make sure you're running `npm install` from the root directory
2. Check that all package.json files have correct `name` and `version` fields
3. Try deleting `node_modules` and `package-lock.json`, then reinstall

### TypeScript Build Errors
1. Run `npm run build` to see all errors at once
2. Make sure all packages have correct `tsconfig.json` files
3. Check that all package references are correct in tsconfig files

### Port Already in Use
If port 3000 or 5173 is already in use:
- Change the port in `apps/server/src/index.ts`
- Change the port in `apps/web/vite.config.ts`
