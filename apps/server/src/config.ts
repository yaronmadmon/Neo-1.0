/**
 * Server configuration
 * Uses getters for env vars that may be loaded after module initialization (via dotenv)
 */
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0', // 0.0.0.0 binds to all interfaces (correct for server)
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  debugNamespaces: process.env.DEBUG || (process.env.NODE_ENV === 'production' ? '' : 'neo:*'),
  
  // AI Configuration - use getters to read env vars at access time (after dotenv loads)
  get aiProvider() {
    return process.env.AI_PROVIDER || 'mock';
  },
  get openaiApiKey() {
    return process.env.OPENAI_API_KEY;
  },
  get openaiModel() {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  },
  get anthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY;
  },
  get anthropicModel() {
    return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  },
  
  // Database Configuration
  get databaseUrl() {
    return process.env.DATABASE_URL || process.env.NEO_DB_URL;
  },
  get databaseEnabled() {
    return !!this.databaseUrl;
  },
  
  // OAuth Configuration
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID;
  },
  get googleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET;
  },
  get githubClientId() {
    return process.env.GITHUB_CLIENT_ID;
  },
  get githubClientSecret() {
    return process.env.GITHUB_CLIENT_SECRET;
  },
  
  // JWT Configuration
  get jwtSecret() {
    return process.env.JWT_SECRET || 'neo-dev-secret-change-in-production';
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '7d';
  },
  
  // Stripe Configuration
  get stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY;
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET;
  },
  get stripeProMonthlyPriceId() {
    return process.env.STRIPE_PRICE_PRO_MONTHLY;
  },
  get stripeProYearlyPriceId() {
    return process.env.STRIPE_PRICE_PRO_YEARLY;
  },
  get stripeEntMonthlyPriceId() {
    return process.env.STRIPE_PRICE_ENT_MONTHLY;
  },
  get stripeEntYearlyPriceId() {
    return process.env.STRIPE_PRICE_ENT_YEARLY;
  },
  
  // App URL for OAuth callbacks
  get appUrl() {
    return process.env.APP_URL || `http://localhost:${this.port}`;
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  },
  
  // Rate Limiting
  rateLimit: {
    createApp: {
      max: 10,
      windowMs: 3600000, // 1 hour
    },
    modifyApp: {
      max: 100,
      windowMs: 3600000, // 1 hour
    },
  },
  
  // Sentry Configuration
  get sentryDsn() {
    return process.env.SENTRY_DSN;
  },
};
