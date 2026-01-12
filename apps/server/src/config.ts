/**
 * Server configuration
 */
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0', // 0.0.0.0 binds to all interfaces (correct for server)
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  debugNamespaces: process.env.DEBUG || (process.env.NODE_ENV === 'production' ? '' : 'neo:*'),
  
  // AI Configuration
  aiProvider: process.env.AI_PROVIDER || 'mock',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  
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
};
