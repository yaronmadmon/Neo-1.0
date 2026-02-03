// Load environment variables FIRST
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from the server directory (both src and dist resolve to apps/server)
const envPath = join(__dirname, '..', '.env');
console.log('📁 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env:', result.error.message);
} else {
  console.log('✅ Loaded env vars:', Object.keys(result.parsed || {}).join(', '));
}

import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyRequest, type FastifyReply, type FastifyInstance } from 'fastify';
import { AppCategory, AppPrivacyLevel, type App, type UserPreferences } from '@neo/contracts';
import { UnifiedAppGenerator } from '@neo/app-generator';
import { IntentProcessor, createAIProviderFromEnv, hasRealAIProvider } from '@neo/ai-engine';
import { TemplateLibrary } from '@neo/templates';
import { PromptSanitizer, ContentModerator, OutputValidator, SafetyOrchestrator } from '@neo/safety';
import { DiscoveryHandler, MandatoryDiscoveryHandler, SmartDiscoveryHandlerWrapper, AIDiscoveryHandlerWrapper } from '@neo/app-generator';
import { neoEngine, type MaterializedApp, type ProcessedIntent } from '../../../packages/core/blueprint-engine/dist/index.js';
import { config } from './config.js';
import { ensurePortAvailable, findAvailablePort } from './port-utils.js';
import { requestLogger } from './utils/request-logger.js';
import { logger, debugNamespaces, log } from './utils/logger.js';
import { registerDatabaseRoutes } from './database-routes.js';
import { registerAuthRoutes } from './auth-routes.js';
import { registerPermissionsRoutes } from './permissions-routes.js';
import { registerPublishingRoutes, setAppStore } from './publishing-routes.js';
import { registerIntegrationsRoutes } from './integrations-routes.js';
import { registerAppAnalysisRoutes } from './app-analysis-routes.js';
import { registerAppRoutes } from './app-routes.js';
import { registerDebugRoutes } from './debug-routes.js';
import { registerBillingRoutes } from './billing-routes.js';
import { addErrorToBuffer } from './utils/debug-helper.js';
import { initSentry, captureException, setRequestContext, addBreadcrumb } from './utils/sentry.js';
import { runMigrations, isDatabaseEnabled } from './services/database.js';
import { appRepository } from './repositories/app-repository.js';
import { getUserFromRequest } from './auth-routes.js';

// Initialize Sentry FIRST (before anything else)
initSentry();

// Lazy import for migrations - only load when modify endpoint is called
// This allows server to start even if migrations package isn't built yet
const fetch =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : ((..._args: any[]) => Promise.resolve({} as any));
const ingestUrl = 'http://127.0.0.1:7242/ingest/68f493d6-bcff-4e1c-be37-1bcd9b225526';
const safeIngest = (payload: Record<string, unknown>) => {
  fetch(ingestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Initialize services
const promptSanitizer = new PromptSanitizer();
const contentModerator = new ContentModerator();
const outputValidator = new OutputValidator();
const safetyOrchestrator = new SafetyOrchestrator(
  promptSanitizer,
  outputValidator,
  contentModerator
);

// Create AI provider from environment variables
const aiProvider = createAIProviderFromEnv();
logger.info('AI provider initialized', {
  provider: config.aiProvider,
  isMock: config.aiProvider === 'mock',
});

const intentProcessor = new IntentProcessor(
  promptSanitizer,
  contentModerator,
  outputValidator,
  aiProvider
);
const templates = new TemplateLibrary();
const appGenerator = new UnifiedAppGenerator(intentProcessor, templates, safetyOrchestrator, aiProvider);
const discoveryHandler = new DiscoveryHandler();
const mandatoryDiscoveryHandler = new MandatoryDiscoveryHandler();
const smartDiscoveryHandler = new SmartDiscoveryHandlerWrapper();

// AI-powered discovery handler
// Uses the same AI provider that's configured for app generation
const aiProviderForDiscovery = {
  complete: async (options: { prompt: string; systemPrompt?: string; maxTokens?: number; temperature?: number; timeout?: number }) => {
    const response = await aiProvider.complete({
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.3,
      timeout: options.timeout || 15000,
    });
    return typeof response === 'string' ? response : JSON.stringify(response);
  }
};
const aiDiscoveryHandler = new AIDiscoveryHandlerWrapper(aiProviderForDiscovery);

// In-memory app store (replace with database in production)
const appStore = new Map<string, App>();
setAppStore(appStore); // Share with publishing routes
const DEFAULT_SCHEMA_VERSION = 'blueprint-v1';

function determinePrivacyLevel(input: string, preferences?: UserPreferences): AppPrivacyLevel {
  if (preferences?.privacyFirst) {
    return AppPrivacyLevel.PRIVATE;
  }
  const lower = input.toLowerCase();
  if (lower.includes('family') || lower.includes('home')) {
    return AppPrivacyLevel.FAMILY;
  }
  return AppPrivacyLevel.PRIVATE;
}

function materializedAppToSchema(app: MaterializedApp): App['schema'] {
  // Build base schema
  const schema: App['schema'] = {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    pages: app.pages.map((page: MaterializedApp['pages'][number]) => ({
      id: page.id,
      name: page.name,
      route: page.route,
      layout: page.layout,
      components: page.components,
    })),
    components: [],
    dataModels: app.dataModels.map((model: MaterializedApp['dataModels'][number]) => ({
      id: model.id,
      name: model.name,
      fields: model.fields.map((field: MaterializedApp['dataModels'][number]['fields'][number]) => ({
        id: field.id,
        name: field.name,
        type: field.type as any,
        required: field.required,
      })),
    })),
    flows: app.flows.map((flow: MaterializedApp['flows'][number]) => ({
      id: flow.id,
      name: flow.name,
      description: undefined,
      enabled: flow.enabled,
      trigger: {
        type: flow.trigger.type as any,
        componentId: flow.trigger.componentId,
      },
      actions: flow.actions.map((action: MaterializedApp['flows'][number]['actions'][number]) => {
        const config = action.config || {};
        const data = (config as any).data as Record<string, unknown> | undefined;
        const targetPageId = (config as any).pageId as string | undefined;
        const message = (config as any).message as string | undefined;
        const recordId = (config as any).recordId as string | undefined;

        return {
          type: action.type as any,
          blocking: true,
          modelId: action.modelId || action.model,
          recordId,
          data,
          targetPageId,
          message,
        };
      }),
    })),
  };
  
  // Add industry-specific metadata for frontend customization
  // These are added as extended properties that the frontend can use
  const extendedSchema = schema as App['schema'] & {
    industry?: { id: string; name: string; dashboardType: string };
    terminology?: Record<string, { primary: string; plural: string }>;
    complexity?: string;
    setupSummary?: string[];
    welcomeMessage?: string;
  };
  
  if (app.industry) {
    extendedSchema.industry = app.industry;
    
    // Generate setup summary based on industry
    const summaryItems: string[] = [];
    summaryItems.push(`Set up as a ${app.industry.name || app.industry.id} business`);
    
    // Add complexity info if available
    if (app.complexity === 'simple') {
      summaryItems.push('Configured for solo use (streamlined interface)');
    } else if (app.complexity === 'advanced') {
      summaryItems.push('Configured for team use with full features');
    } else {
      summaryItems.push('Standard configuration for growing businesses');
    }
    
    // Dashboard type info
    const dashboardDescriptions: Record<string, string> = {
      operations: 'Focus on day-to-day operations',
      service: 'Focus on client service delivery',
      sales: 'Focus on sales and revenue',
      health: 'Focus on patient/member wellness',
    };
    if (app.industry.dashboardType && dashboardDescriptions[app.industry.dashboardType]) {
      summaryItems.push(dashboardDescriptions[app.industry.dashboardType]);
    }
    
    extendedSchema.setupSummary = summaryItems;
  }
  
  if (app.terminology) {
    extendedSchema.terminology = app.terminology;
  }
  
  if (app.complexity) {
    extendedSchema.complexity = app.complexity;
  }
  
  if (app.setupSummary) {
    extendedSchema.setupSummary = app.setupSummary;
  }
  
  if (app.welcomeMessage) {
    extendedSchema.welcomeMessage = app.welcomeMessage;
  }
  
  return extendedSchema;
}

function materializedAppToTheme(app: MaterializedApp): App['theme'] {
  return {
    colors: app.theme.colors,
    typography: app.theme.typography,
    spacing: app.theme.spacing,
    borderRadius: { base: app.theme.borderRadius },
  };
}

// Global error handler to ensure all errors return valid JSON
server.setErrorHandler((error, request, reply) => {
  const errorResponse = {
    success: false,
    error: 'Internal server error',
    message: error?.message || 'An unexpected error occurred',
  };

  try {
    // #region agent log
    safeIngest({location:'index.ts:59',message:'Global error handler ENTRY',data:{method:request.method,url:request.url,errorMessage:error?.message,errorStack:error?.stack?.substring(0,200),replySent:reply.sent,replyStatusCode:reply.statusCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'});
    // #endregion

    // Set request context for Sentry
    setRequestContext({
      method: request.method,
      url: request.url,
      headers: request.headers as Record<string, string>,
      body: request.body,
      query: request.query,
      params: request.params,
    });

    // Capture error in Sentry
    if (error instanceof Error) {
      captureException(error, {
        method: request.method,
        url: request.url,
        replySent: reply.sent,
        replyStatusCode: reply.statusCode,
      });
    } else {
      captureException(new Error(String(error)), {
        method: request.method,
        url: request.url,
        replySent: reply.sent,
        replyStatusCode: reply.statusCode,
        originalError: error,
      });
    }

    // Add error to debug buffer for AI assistant analysis
    addErrorToBuffer(error, {
      method: request.method,
      url: request.url,
      replySent: reply.sent,
      replyStatusCode: reply.statusCode,
    });

    logger.error('Unhandled server error', error, {
      method: request.method,
      url: request.url,
    });
  } catch (handlerError: any) {
    logger.error('Error handler failed while logging', handlerError);
  }

  // Check if response already sent
  if (reply.sent) {
    // #region agent log
    safeIngest({location:'index.ts:69',message:'Global error handler - reply already sent',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'});
    // #endregion
    return;
  }

  try {
    // #region agent log
    safeIngest({location:'index.ts:76',message:'Global error handler BEFORE reply.send',data:{responseBody:JSON.stringify(errorResponse),replySent:reply.sent},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
    // #endregion
    return reply.code(500).type('application/json').send(errorResponse);
  } catch (sendError: any) {
    // #region agent log
    safeIngest({location:'index.ts:85',message:'Global error handler reply.send FAILED',data:{sendError:sendError?.message,sendErrorStack:sendError?.stack?.substring(0,200),replySent:reply.sent},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
    // #endregion
    logger.error('Failed to send error response', sendError);
    // Try to send a basic response using raw if available
    if (!reply.sent) {
      try {
        // #region agent log
        safeIngest({location:'index.ts:91',message:'Global error handler trying raw.writeHead',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
        // #endregion
        reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
        reply.raw.end(JSON.stringify({ success: false, error: 'Internal server error', message: 'Failed to send error response' }));
        // #region agent log
        safeIngest({location:'index.ts:94',message:'Global error handler raw.writeHead SUCCESS',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
        // #endregion
      } catch (rawError: any) {
        // #region agent log
        safeIngest({location:'index.ts:97',message:'Global error handler raw.writeHead FAILED',data:{rawError:rawError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
        // #endregion
        logger.error('Failed to send raw error response', rawError);
      }
    }
  }
});

// Rate limiting (simple in-memory implementation)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (limit.count >= max) {
    return false;
  }

  limit.count++;
  return true;
}

// Register request logging middleware
server.addHook('onRequest', async (request, reply) => {
  // #region agent log
  safeIngest({location:'index.ts:onRequest-hook',message:'onRequest hook ENTRY',data:{method:request.method,url:request.url,replySent:reply.sent},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'});
  // #endregion
  try {
    await requestLogger(request, reply);
    // #region agent log
    safeIngest({location:'index.ts:onRequest-hook',message:'onRequest hook EXIT',data:{method:request.method,url:request.url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'});
    // #endregion
  } catch (error: any) {
    // #region agent log
    safeIngest({location:'index.ts:onRequest-hook',message:'onRequest hook ERROR',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'});
    // #endregion
    throw error;
  }
});

// Register response logging hook
server.addHook('onSend', async (request, reply, payload) => {
  const isEmptyPayload =
    payload === undefined ||
    payload === null ||
    (typeof payload === 'string' && payload.length === 0) ||
    (Buffer.isBuffer(payload) && payload.length === 0);

  if (reply.statusCode >= 400 && isEmptyPayload) {
    reply.header('content-type', 'application/json');
    return JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while processing the request',
      statusCode: reply.statusCode,
    });
  }

  if (reply.statusCode >= 400 && !reply.getHeader('content-type')) {
    reply.header('content-type', 'application/json');
  }
  const startTime = (request as any).startTime;
  const requestId = (request as any).id;
  if (startTime && requestId) {
    const duration = Date.now() - startTime;
    const statusCode = reply.statusCode;
    log.request(`← ${request.method} ${request.url} ${statusCode}`, {
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      duration: `${duration}ms`,
    });
  }
  return payload;
});

// Health check
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Discovery endpoint - analyze input and return questions if needed
server.post<{ Body: { input: string; conversationId?: string; answers?: Record<string, unknown>; discoveredInfo?: any } }>(
  '/apps/discover',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          input: { type: 'string' },
          conversationId: { type: 'string' },
          answers: { type: 'object' },
          discoveredInfo: { type: 'object' },
        },
        required: ['input'],
      },
    },
  },
  async (request: FastifyRequest<{ Body: { input: string; conversationId?: string; answers?: Record<string, unknown>; discoveredInfo?: any } }>, reply: FastifyReply) => {
    try {
      // #region agent log
      safeIngest({location:'index.ts:120',message:'Discovery endpoint called',data:{inputLength:request.body?.input?.length,hasAnswers:!!request.body?.answers},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
      // #endregion
      const { input, answers, discoveredInfo: existingInfo } = request.body;
      // #region agent log
      safeIngest({location:'index.ts:124',message:'Before discoveryHandler.analyzeInput',data:{inputLength:input?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
      // #endregion
      // Analyze input for discovery needs
      const discoveryResult = await discoveryHandler.analyzeInput(input, existingInfo);
      // #region agent log
      safeIngest({location:'index.ts:127',message:'After discoveryHandler.analyzeInput',data:{hasResult:!!discoveryResult,needsClarification:discoveryResult?.needsClarification},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
      // #endregion

      // If answers provided, process them
      let finalDiscoveredInfo = discoveryResult.discoveredInfo;
      if (answers && finalDiscoveredInfo) {
        finalDiscoveredInfo = discoveryHandler.processAnswers(finalDiscoveredInfo, answers);
        // Re-analyze with updated info to see if more questions are needed
        const reanalyzed = await discoveryHandler.analyzeInput(input, finalDiscoveredInfo);
        return reply.send({
          success: true,
          needsClarification: reanalyzed.needsClarification,
          questions: reanalyzed.questions,
          discoveredInfo: finalDiscoveredInfo,
          confidence: reanalyzed.confidence,
          suggestedFeatures: reanalyzed.suggestedFeatures,
        });
      }

      return reply.send({
        success: true,
        needsClarification: discoveryResult.needsClarification,
        questions: discoveryResult.questions,
        discoveredInfo: discoveryResult.discoveredInfo,
        confidence: discoveryResult.confidence,
        suggestedFeatures: discoveryResult.suggestedFeatures,
      });
    } catch (error: any) {
      console.error('Discovery endpoint error:', error);
      // #region agent log
      safeIngest({location:'index.ts:151',message:'Discovery endpoint catch block',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200),errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
      // #endregion
      logger.error('Discovery failed', error, {
        inputLength: request.body.input?.length,
      });
      try {
        const errorResponse = {
          success: false,
          error: 'Discovery failed',
          message: error.message || 'An error occurred during discovery',
        };
        // #region agent log
        safeIngest({location:'index.ts:160',message:'Discovery endpoint sending error response',data:{responseBody:JSON.stringify(errorResponse)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'});
        // #endregion
        return reply.code(500).type('application/json').send(errorResponse);
      } catch (sendError: any) {
        // #region agent log
        safeIngest({location:'index.ts:166',message:'Discovery endpoint failed to send error response',data:{sendError:sendError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
        // #endregion
        logger.error('Failed to send discovery error response', sendError);
        if (!reply.sent) {
          reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
          reply.raw.end(JSON.stringify({ success: false, error: 'Discovery failed', message: error.message || 'An error occurred during discovery' }));
        }
        return;
      }
    }
  }
);

// Create app endpoint
server.post<{
  Body: {
    input: string;
    category?: AppCategory;
    preferences?: UserPreferences;
  };
}>(
  '/apps/create',
  {
    schema: {
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'string', minLength: 1, maxLength: 10000 },
          category: { type: 'string', enum: Object.values(AppCategory) },
          preferences: { type: 'object' },
        },
      },
      // No response schema - let Fastify serialize naturally without schema validation
    },
  },
  async (request: FastifyRequest<{ Body: { input: string; category?: AppCategory; preferences?: UserPreferences } }>, reply: FastifyReply) => {
    try {
      // #region agent log
      safeIngest({location:'index.ts:235',message:'Create endpoint ENTRY',data:{method:request.method,url:request.url,hasBody:!!request.body,replySent:reply.sent,replyStatusCode:reply.statusCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'});
      // #endregion
      // Rate limiting
      const clientId = request.ip || 'unknown';
      if (!checkRateLimit(`create:${clientId}`, config.rateLimit.createApp.max, config.rateLimit.createApp.windowMs)) {
        return reply.code(429).type('application/json').send({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many app creation requests. Please try again later.',
        });
      }

      const { input, category, preferences } = request.body;
      
      // Validate input is not empty
      if (!input || typeof input !== 'string' || input.trim().length === 0) {
        return reply.code(400).type('application/json').send({
          success: false,
          error: 'Invalid input',
          message: 'Input is required and must be a non-empty string',
        });
      }
      
      // #region agent log
      safeIngest({location:'index.ts:200',message:'Before neoEngine.generateApp',data:{inputLength:input?.length,category},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
      // #endregion
      const processedIntent: ProcessedIntent = {
        rawInput: input,
        type: 'create_app',
        extractedDetails: category ? { category: String(category) } : undefined,
      };
      const generated = await neoEngine.generateApp(processedIntent);
      // #region agent log
      safeIngest({location:'index.ts:270',message:'AFTER neoEngine.generateApp',data:{hasBlueprint:!!generated?.blueprint,blueprintId:generated?.blueprint?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
      // #endregion

      const now = new Date();
      const resolvedCategory = category || AppCategory.PERSONAL;
      const app: App = {
        id: generated.blueprint.id,
        name: generated.blueprint.name,
        description: generated.blueprint.description,
        category: resolvedCategory,
        privacyLevel: determinePrivacyLevel(input, preferences),
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: preferences?.userId || randomUUID(),
        schema: materializedAppToSchema(generated.materializedApp),
        theme: materializedAppToTheme(generated.materializedApp),
        data: generated.sampleData,
        settings: {
          offline: resolvedCategory === AppCategory.PERSONAL || resolvedCategory === AppCategory.HOME,
          notifications: true,
          analytics: preferences?.enableAnalytics ?? true,
        },
      };

      const safetyCheck = await safetyOrchestrator.validateApp(app);
      if (!safetyCheck.safe) {
        return reply.code(403).type('application/json').send({
          success: false,
          error: 'Safety check failed',
          message: 'Generated app failed safety checks',
          safety: safetyCheck,
        });
      }

      // Debug: Log generated app structure
      logger.debug('App generated successfully', {
        appId: app?.id,
        appName: app?.name,
        category: app?.category,
        hasSchema: !!app?.schema,
        schemaPages: app?.schema?.pages?.length,
        schemaComponents: app?.schema?.pages?.[0]?.components?.length,
      });

      // Validate app has an ID before storing
      if (!app.id) {
        logger.error('Generated app is missing ID', undefined, {
          appName: app.name,
          category: app.category,
        });
        return reply.code(500).type('application/json').send({
          success: false,
          error: 'App generation failed',
          message: 'Generated app is missing ID. This is a server error.',
        });
      }

      // Store app in memory (for immediate access)
      appStore.set(app.id, app);
      
      // Persist to storage (database or file-based)
      try {
        await appRepository.save({
          id: app.id,
          name: app.name,
          description: app.description,
          category: app.category,
          schema: app.schema as Record<string, unknown>,
          theme: app.theme as Record<string, unknown>,
          data: app.data as Record<string, unknown>,
          settings: app.settings as Record<string, unknown>,
        }, preferences?.userId);
        logger.info('App persisted to storage', { appId: app.id, useDatabase: isDatabaseEnabled() });
      } catch (persistError: any) {
        // Log but don't fail - app is still in memory
        logger.warn('Failed to persist app to storage (will be in memory only)', {
          appId: app.id,
          error: persistError?.message,
        });
      }
      
      logger.info('App created and stored', {
        appId: app.id,
        appName: app.name,
        category: app.category,
      });

      // Serialize app for JSON response - use plain object literal with all required fields
      // Convert to plain JSON-serializable object, ensuring no undefined values that might get stripped
      const serializedApp: Record<string, unknown> = {
        id: String(app.id),
        name: String(app.name || 'Untitled App'),
        category: String(app.category || 'personal'),
        privacyLevel: String(app.privacyLevel || 'private'),
        version: Number(app.version || 1),
        createdAt: (app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt || Date.now())).toISOString(),
        updatedAt: (app.updatedAt instanceof Date ? app.updatedAt : new Date(app.updatedAt || Date.now())).toISOString(),
        createdBy: String(app.createdBy || ''),
        schema: app.schema ? JSON.parse(JSON.stringify(app.schema)) : {},
        theme: app.theme ? JSON.parse(JSON.stringify(app.theme)) : {},
        data: app.data ? JSON.parse(JSON.stringify(app.data)) : {},
        settings: app.settings ? JSON.parse(JSON.stringify(app.settings)) : {},
      };
      
      // Add optional fields only if they exist
      if (app.description) {
        serializedApp.description = String(app.description);
      }

      // Debug: Log serialized app
      logger.debug('App serialized for response', {
        appId: serializedApp.id,
        appName: serializedApp.name,
        category: serializedApp.category,
        hasSchema: !!serializedApp.schema,
        schemaPages: (serializedApp.schema as any)?.pages?.length,
      });

      const responsePayload = {
        success: true,
        app: serializedApp,
        previewUrl: `/preview/${app.id}`,
        safety: safetyCheck || {},
      };

      // Debug: Log response payload
      logger.debug('Sending app creation response', {
        appId: responsePayload.app?.id,
        success: responsePayload.success,
        hasSafety: !!responsePayload.safety,
      });

      // Force serialization by stringifying and parsing to ensure it's a plain object
      // This bypasses any Fastify serialization quirks
      const jsonString = JSON.stringify(responsePayload);
      logger.trace('JSON serialization complete', {
        jsonLength: jsonString.length,
        appId: responsePayload.app?.id,
      });
      const finalPayload = JSON.parse(jsonString);
      
      // Validate JSON before sending
      if (!jsonString || jsonString.length === 0) {
        throw new Error('Generated empty JSON response');
      }
      
      return reply.code(200).type('application/json').send(finalPayload);
    } catch (error: any) {
      console.error('Create endpoint error:', error);
      // #region agent log
      safeIngest({location:'index.ts:354',message:'Create endpoint catch block ENTRY',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200),errorName:error?.name,replySent:reply.sent,replyStatusCode:reply.statusCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'});
      // #endregion
      logger.error('App creation failed', error, {
        inputLength: request.body.input?.length,
        category: request.body.category,
      });
      
      // Handle specific error types
      let errorMessage = 'An error occurred while creating the app';
      let statusCode = 500;
      
      if (error?.name === 'ValidationError' || error?.message?.includes('schema') || error?.message?.includes('Zod')) {
        errorMessage = 'AI generated invalid app structure. Please try rephrasing your request.';
        statusCode = 422; // Unprocessable Entity
      } else if (error?.name === 'SafetyError' || error?.message?.includes('safety')) {
        errorMessage = error.message || 'Request blocked by safety checks';
        statusCode = 403; // Forbidden
      } else if (error?.message?.includes('API key') || error?.message?.includes('authentication')) {
        errorMessage = 'AI service authentication failed. Please check API keys.';
        statusCode = 503; // Service Unavailable
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'AI request timed out. Please try again.';
        statusCode = 504; // Gateway Timeout
      } else {
        errorMessage = error?.message || errorMessage;
      }
      
      try {
        // Ensure error response is valid JSON
        const errorResponse = {
          success: false,
          error: 'App creation failed',
          message: errorMessage,
        };
        // #region agent log
        safeIngest({location:'index.ts:380',message:'Create endpoint BEFORE reply.send',data:{statusCode,replySent:reply.sent,errorResponseBody:JSON.stringify(errorResponse)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
        // #endregion
        return reply.code(statusCode).type('application/json').send(errorResponse);
      } catch (sendError: any) {
        // #region agent log
        safeIngest({location:'index.ts:388',message:'Create endpoint reply.send FAILED',data:{sendError:sendError?.message,sendErrorStack:sendError?.stack?.substring(0,200),replySent:reply.sent},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
        // #endregion
        logger.error('Failed to send create error response', sendError);
        // Try raw response as fallback
        if (!reply.sent) {
          try {
            // #region agent log
            safeIngest({location:'index.ts:393',message:'Create endpoint trying raw.writeHead',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
            // #endregion
            reply.raw.writeHead(statusCode, { 'Content-Type': 'application/json' });
            reply.raw.end(JSON.stringify({ success: false, error: 'App creation failed', message: errorMessage }));
            // #region agent log
            safeIngest({location:'index.ts:396',message:'Create endpoint raw.writeHead SUCCESS',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
            // #endregion
          } catch (rawError: any) {
            // #region agent log
            safeIngest({location:'index.ts:399',message:'Create endpoint raw.writeHead FAILED',data:{rawError:rawError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'});
            // #endregion
            logger.error('Failed to send raw error response', rawError);
          }
        }
      }
    }
  }
);

// Get app endpoint
server.get<{ Params: { id: string } }>('/apps/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
      const { id } = request.params;
      
      logger.debug('GET /apps/:id requested', { appId: id });
      
      // First check memory store
      let app = appStore.get(id);
      
      // If not in memory, check persistent storage (database or file)
      if (!app) {
        logger.debug('Checking persistent storage for app', { appId: id });
        
        try {
          const storedApp = await appRepository.findById(id);
          if (storedApp) {
            // Convert to App type and cache in memory for future requests
            app = {
              id: storedApp.id,
              name: storedApp.name,
              description: storedApp.description,
              category: (storedApp.category as any) || AppCategory.PERSONAL,
              privacyLevel: AppPrivacyLevel.PRIVATE,
              version: 1,
              createdAt: storedApp.createdAt ? new Date(storedApp.createdAt) : new Date(),
              updatedAt: storedApp.updatedAt ? new Date(storedApp.updatedAt) : new Date(),
              createdBy: storedApp.userId || randomUUID(),
              schema: storedApp.schema as any,
              theme: storedApp.theme as any,
              data: storedApp.data as any,
              settings: storedApp.settings as any,
            };
            // Cache in memory store for faster subsequent access
            appStore.set(id, app);
            logger.info('App loaded from persistent storage and cached', { appId: id });
          }
        } catch (storageError: any) {
          logger.warn('Persistent storage lookup failed', { appId: id, error: storageError?.message });
        }
      }

      if (!app) {
        logger.warn('App not found', { appId: id });
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'App not found',
          message: `App with id ${id} does not exist`,
        });
      }

    // Serialize app consistently with create endpoint
    const serializedApp: Record<string, unknown> = {
      id: String(app.id),
      name: String(app.name || 'Untitled App'),
      category: String(app.category || 'personal'),
      privacyLevel: String(app.privacyLevel || 'private'),
      version: Number(app.version || 1),
      createdAt: (app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt || Date.now())).toISOString(),
      updatedAt: (app.updatedAt instanceof Date ? app.updatedAt : new Date(app.updatedAt || Date.now())).toISOString(),
      createdBy: String(app.createdBy || ''),
      schema: app.schema ? JSON.parse(JSON.stringify(app.schema)) : {},
      theme: app.theme ? JSON.parse(JSON.stringify(app.theme)) : {},
      data: app.data ? JSON.parse(JSON.stringify(app.data)) : {},
      settings: app.settings ? JSON.parse(JSON.stringify(app.settings)) : {},
    };
    
    if (app.description) {
      serializedApp.description = String(app.description);
    }

    logger.info('App retrieved successfully', { appId: id });
    
    // Ensure we always send valid JSON
    const response = { success: true, app: serializedApp };
    const jsonString = JSON.stringify(response);
    
    // Validate JSON can be parsed (sanity check)
    JSON.parse(jsonString);
    
    return reply.code(200).type('application/json').send(response);
  } catch (error: any) {
    logger.error('Error retrieving app', error, {
      appId: request.params.id,
    });
    
    // Ensure error response is also valid JSON
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      message: error.message || 'An error occurred while retrieving the app',
    };
    
    return reply.code(500).type('application/json').send(errorResponse);
  }
});

// Modify app endpoint
server.post<{
  Params: { id: string };
  Body: { input: string };
}>(
  '/apps/:id/modify',
  {
    schema: {
      body: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'string', minLength: 1, maxLength: 10000 },
        },
      },
    },
  },
  async (request: FastifyRequest<{ Params: { id: string }; Body: { input: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { input } = request.body;

    // Rate limiting
    const clientId = request.ip || 'unknown';
    if (!checkRateLimit(`modify:${clientId}`, config.rateLimit.modifyApp.max, config.rateLimit.modifyApp.windowMs)) {
      return reply.code(429).type('application/json').send({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many modification requests. Please try again later.',
      });
    }

    const app = appStore.get(id);
    if (!app) {
      return reply.code(404).type('application/json').send({
        success: false,
        error: 'App not found',
        message: `App with id ${id} does not exist`,
      });
    }

    try {
      // Process modification intent
      const intentResult = await intentProcessor.processIntent(input, { app });

      if (!intentResult.intent || !intentResult.safety.safe) {
        return reply.code(400).type('application/json').send({
          success: false,
          error: 'Invalid modification request',
          safety: intentResult.safety,
        });
      }

      // Lazy import migrations package (only load when needed)
      let MigrationPlanner, MigrationApplier;
      try {
        const migrationsModule = await import('@neo/migrations');
        MigrationPlanner = migrationsModule.MigrationPlanner;
        MigrationApplier = migrationsModule.MigrationApplier;
      } catch (importError: any) {
        logger.error('Failed to load migrations package', importError, {
          appId: id,
          hint: 'Migrations package may not be built. Run: npm run build',
        });
        return reply.code(503).type('application/json').send({
          success: false,
          error: 'Migration system unavailable',
          message: 'Migrations package is not available. Please build the package first.',
          hint: 'Run: npm run build',
        });
      }
      
      // Generate migration plan
      const migrationPlanner = new MigrationPlanner();
      const plan = await migrationPlanner.planMigration(input, app);
      
      // Validate plan
      const failedChecks = plan.validationChecks.filter((check: { passed: boolean }) => !check.passed);
      if (failedChecks.length > 0) {
        return reply.code(400).type('application/json').send({
          success: false,
          error: 'Migration validation failed',
          validationChecks: failedChecks,
        });
      }
      
      // Apply migrations
      const migrationApplier = new MigrationApplier();
      const result = await migrationApplier.applyMigrationPlan(app, plan);
      
      if (!result.success) {
        return reply.code(400).type('application/json').send({
          success: false,
          error: 'Migration failed',
          message: result.error,
        });
      }
      
      // Update app
      const modifiedApp = result.app;
      modifiedApp.updatedAt = new Date();
      modifiedApp.version += 1;
      appStore.set(id, modifiedApp);
      
      logger.info('App modified successfully', {
        appId: id,
        migrationsApplied: result.appliedMigrations.length,
      });

      return reply.send({
        success: true,
        app: modifiedApp,
        migrationsApplied: result.appliedMigrations.length,
        migrationPlan: plan.id,
      });
    } catch (error: any) {
      logger.error('App modification failed', error, {
        appId: id,
        inputLength: input?.length,
      });
      return reply.code(400).type('application/json').send({
        success: false,
        error: 'App modification failed',
        message: error.message || 'Unknown error',
      });
    }
  }
);

// List apps endpoint (simple implementation)
server.get('/apps', async (request: FastifyRequest, reply: FastifyReply) => {
  const apps = Array.from(appStore.values());
  return reply.send({
    success: true,
    apps: apps.map((app) => ({
      id: app.id,
      name: app.name,
      category: app.category,
      createdAt: app.createdAt,
    })),
    count: apps.length,
  });
});

// List user's apps (authenticated users get their database apps)
server.get('/api/apps', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = await getUserFromRequest(request);
    
    if (user) {
      // Authenticated user - fetch from database
      const apps = await appRepository.findByUserId(user.id);
      return reply.send({
        success: true,
        apps: apps.map((app) => ({
          id: app.id,
          name: app.name,
          description: app.description,
          category: app.category,
          createdAt: app.createdAt,
        })),
        count: apps.length,
      });
    }
    
    // Guest user - return all apps from file storage
    const allApps = await appRepository.findAll(50);
    return reply.send({
      success: true,
      apps: allApps.map((app) => ({
        id: app.id,
        name: app.name,
        description: app.description,
        category: app.category,
        createdAt: app.createdAt,
      })),
      count: allApps.length,
    });
  } catch (error: any) {
    logger.error('Failed to list apps', error);
    return reply.code(500).send({
      success: false,
      error: 'Failed to list apps',
      message: error.message,
    });
  }
});

// Sync app from client (for logged-in users syncing localStorage apps)
server.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
  '/api/apps/:id/sync',
  async (request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>, reply: FastifyReply) => {
    try {
      const user = await getUserFromRequest(request);
      
      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Authentication required',
        });
      }
      
      const { id } = request.params;
      const appData = request.body;
      
      // Check if app exists in memory store (was created this session)
      const existingApp = appStore.get(id);
      
      if (existingApp) {
        // Sync existing app to database
        await appRepository.save({
          id: existingApp.id,
          name: existingApp.name,
          description: existingApp.description,
          category: existingApp.category,
          schema: existingApp.schema as Record<string, unknown>,
          theme: existingApp.theme as Record<string, unknown>,
          data: existingApp.data as Record<string, unknown>,
          settings: existingApp.settings as Record<string, unknown>,
        }, user.id);
      } else if (appData && appData.name) {
        // Sync app from client data
        await appRepository.save({
          id,
          name: String(appData.name),
          description: appData.description ? String(appData.description) : undefined,
          category: appData.category ? String(appData.category) : undefined,
          schema: (appData.schema as Record<string, unknown>) || { pages: [], dataModels: [], flows: [] },
          theme: appData.theme as Record<string, unknown>,
          data: (appData.data as Record<string, unknown>) || {},
          settings: (appData.settings as Record<string, unknown>) || {},
        }, user.id);
      }
      
      return reply.send({
        success: true,
        message: 'App synced successfully',
      });
    } catch (error: any) {
      logger.error('Failed to sync app', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to sync app',
        message: error.message,
      });
    }
  }
);

// CRUD endpoints for app data
// Create record in a data model
server.post<{ Params: { id: string; modelId: string }; Body: Record<string, unknown> }>(
  '/apps/:id/data/:modelId/create',
  async (request: FastifyRequest<{ Params: { id: string; modelId: string }; Body: Record<string, unknown> }>, reply: FastifyReply) => {
    try {
      const { id, modelId } = request.params;
      const data = request.body;

      const app = appStore.get(id);
      if (!app) {
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'App not found',
          message: `App with id ${id} does not exist`,
        });
      }

      // Initialize data object if it doesn't exist
      if (!app.data) {
        app.data = {};
      }

      // Initialize model array if it doesn't exist
      if (!app.data[modelId]) {
        app.data[modelId] = [];
      }

      // Generate ID for the new record
      const recordId = `${modelId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const record = {
        id: recordId,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add record to the model array
      (app.data[modelId] as unknown[]).push(record);

      // Update app timestamp
      app.updatedAt = new Date();

      logger.info('Record created', { appId: id, modelId, recordId });

      return reply.code(200).type('application/json').send({
        success: true,
        record,
      });
    } catch (error: any) {
      logger.error('Error creating record', error);
      return reply.code(500).type('application/json').send({
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to create record',
      });
    }
  }
);

// Update record in a data model
server.put<{ Params: { id: string; modelId: string; recordId: string }; Body: Record<string, unknown> }>(
  '/apps/:id/data/:modelId/:recordId',
  async (request: FastifyRequest<{ Params: { id: string; modelId: string; recordId: string }; Body: Record<string, unknown> }>, reply: FastifyReply) => {
    try {
      const { id, modelId, recordId } = request.params;
      const updateData = request.body;

      const app = appStore.get(id);
      if (!app) {
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'App not found',
          message: `App with id ${id} does not exist`,
        });
      }

      if (!app.data || !app.data[modelId]) {
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'Model not found',
          message: `Model ${modelId} does not exist in app ${id}`,
        });
      }

      const records = app.data[modelId] as unknown[];
      const recordIndex = records.findIndex((r: any) => r.id === recordId);

      if (recordIndex === -1) {
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'Record not found',
          message: `Record ${recordId} does not exist in model ${modelId}`,
        });
      }

      // Update record
      const existingRecord = records[recordIndex] as Record<string, unknown>;
      records[recordIndex] = {
        ...existingRecord,
        ...updateData,
        id: recordId, // Preserve ID
        updatedAt: new Date().toISOString(),
      };

      // Update app timestamp
      app.updatedAt = new Date();

      logger.info('Record updated', { appId: id, modelId, recordId });

      return reply.code(200).type('application/json').send({
        success: true,
        record: records[recordIndex],
      });
    } catch (error: any) {
      logger.error('Error updating record', error);
      return reply.code(500).type('application/json').send({
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to update record',
      });
    }
  }
);

// Delete record from a data model
server.delete<{ Params: { id: string; modelId: string; recordId: string } }>(
  '/apps/:id/data/:modelId/:recordId',
  async (request: FastifyRequest<{ Params: { id: string; modelId: string; recordId: string } }>, reply: FastifyReply) => {
    try {
      const { id, modelId, recordId } = request.params;

      const app = appStore.get(id);
      if (!app) {
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'App not found',
          message: `App with id ${id} does not exist`,
        });
      }

      if (!app.data || !app.data[modelId]) {
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'Model not found',
          message: `Model ${modelId} does not exist in app ${id}`,
        });
      }

      const records = app.data[modelId] as unknown[];
      const recordIndex = records.findIndex((r: any) => r.id === recordId);

      if (recordIndex === -1) {
        return reply.code(404).type('application/json').send({
          success: false,
          error: 'Record not found',
          message: `Record ${recordId} does not exist in model ${modelId}`,
        });
      }

      // Remove record
      records.splice(recordIndex, 1);

      // Update app timestamp
      app.updatedAt = new Date();

      logger.info('Record deleted', { appId: id, modelId, recordId });

      return reply.code(200).type('application/json').send({
        success: true,
        message: 'Record deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting record', error);
      return reply.code(500).type('application/json').send({
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to delete record',
      });
    }
  }
);

// Preview route - redirects to frontend React preview (backend route kept for backward compatibility)
server.get<{ Params: { id: string } }>('/preview/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = request.params;

  // Handle undefined or invalid id
  if (!id || id === 'undefined' || id === 'null') {
    logger.warn('Invalid preview ID requested', { previewId: id });
    // Redirect to frontend with error
    return reply.redirect(302, `http://localhost:5173/preview/${id}?error=invalid`);
  }

  const app = appStore.get(id);

  if (!app) {
    logger.warn('App not found for preview', { previewId: id });
    // Redirect to frontend with error
    return reply.redirect(302, `http://localhost:5173/preview/${id}?error=notfound`);
  }

  // Redirect to frontend React preview page (which will fetch app data via API)
  return reply.redirect(302, `http://localhost:5173/preview/${id}`);
});

// Helper function to escape HTML to prevent XSS
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// Helper function to clean app name (remove "User Input:" prefix if present)
function cleanAppName(name: string): string {
  if (!name) return 'Untitled App';
  // Remove common AI response prefixes
  const cleaned = name
    .replace(/^User Input:\s*/i, '')
    .replace(/^Analyze the intent and return.*?$/i, '')
    .trim();
  
  // If cleaned is empty or just whitespace, generate a better name
  if (!cleaned || cleaned.length < 2) {
    return 'My New App';
  }
  
  // Limit length
  return cleaned.length > 100 ? cleaned.substring(0, 97) + '...' : cleaned;
}

// Helper function to clean description (remove system prompts)
function cleanDescription(description: string | undefined): string {
  if (!description) return '';
  
  // Remove common system prompt patterns - more aggressive cleaning
  let cleaned = String(description)
    .replace(/User Input:.*?/gi, '')
    .replace(/Context:\s*\{[^}]*\}/gi, '')
    .replace(/Analyze the intent and return.*$/i, '')
    .replace(/Return the JSON response.*$/i, '')
    .replace(/as specified in the system prompt.*$/i, '')
    .replace(/Build me app.*$/i, '')
    .replace(/Create.*app.*$/i, '')
    .trim();
  
  // If it looks like a system prompt or is mostly empty, return empty
  const lower = cleaned.toLowerCase();
  if (lower.includes('return the json response') || 
      lower.includes('system prompt') ||
      lower.includes('analyze the intent') ||
      lower.length < 10 ||
      /^[\s\W]*$/.test(cleaned)) {
    return '';
  }
  
  return cleaned.length > 500 ? cleaned.substring(0, 497) + '...' : cleaned;
}

// Helper function to generate basic preview HTML
function generatePreviewHTML(app: App): string {
  const safeName = escapeHtml(cleanAppName(app.name));
  const safeCategory = escapeHtml(String(app.category || 'personal'));
  const safeDescription = cleanDescription(app.description);
  const safeId = escapeHtml(app.id);
  const createdAtDate = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
  const createdAtStr = createdAtDate.toLocaleString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} - Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(to bottom right, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { color: #1a202c; margin-bottom: 10px; font-size: 2rem; }
    .category { 
      color: #718096; 
      text-transform: capitalize; 
      font-size: 1.1rem;
      margin-bottom: 20px;
    }
    .description { 
      color: #4a5568; 
      margin: 20px 0; 
      line-height: 1.6;
      font-size: 1rem;
    }
    .info { 
      background: #f7fafc; 
      padding: 20px; 
      border-radius: 8px; 
      margin-top: 20px; 
    }
    .info-item { 
      margin: 10px 0; 
      font-size: 0.95rem;
    }
    .info-label { 
      font-weight: 600; 
      color: #2d3748;
      margin-right: 8px;
    }
    .back-link {
      display: inline-block;
      margin-top: 30px;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${safeName}</h1>
    <div class="category">${safeCategory}</div>
    ${safeDescription ? `<div class="description">${escapeHtml(safeDescription)}</div>` : ''}
    <div class="info">
      <div class="info-item">
        <span class="info-label">App ID:</span> ${safeId}
      </div>
      <div class="info-item">
        <span class="info-label">Version:</span> ${app.version || 1}
      </div>
      <div class="info-item">
        <span class="info-label">Created:</span> ${escapeHtml(createdAtStr)}
      </div>
      <div class="info-item">
        <span class="info-label">Pages:</span> ${app.schema?.pages?.length || 0}
      </div>
      <div class="info-item">
        <span class="info-label">Data Models:</span> ${app.schema?.dataModels?.length || 0}
      </div>
    </div>
    <p style="margin-top: 30px; color: #718096; font-style: italic;">
      This is a preview placeholder. Full interactive preview coming soon!
    </p>
    <a href="http://localhost:5173" class="back-link">← Back to Neo</a>
  </div>
</body>
</html>`;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  // #region agent log
  safeIngest({location:'index.ts:unhandledRejection',message:'UNHANDLED PROMISE REJECTION',data:{reason:reason?.message || String(reason),reasonStack:reason?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
  // #endregion
  logger.error('Unhandled promise rejection', reason);
});

// Export buildServer function for testing
export function buildServer(): FastifyInstance {
  return server;
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  // #region agent log
  safeIngest({location:'index.ts:uncaughtException',message:'UNCAUGHT EXCEPTION',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'});
  // #endregion
  
  // Capture in Sentry before exiting
  captureException(error, { type: 'uncaughtException' });
  
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  
  // Capture in Sentry
  captureException(error, { 
    type: 'unhandledRejection',
    promise: String(promise),
  });
  
  logger.error('Unhandled promise rejection', error);
});

// Start server
const start = async () => {
  try {
    // Run database migrations if database is configured
    if (isDatabaseEnabled()) {
      try {
        await runMigrations();
        logger.info('Database migrations complete');
      } catch (err) {
        logger.error('Database migration failed', err);
        // Continue anyway - app can work without database
      }
    }
    
    // Register routes
    await registerDatabaseRoutes(server);
    await registerAuthRoutes(server);
    await registerPermissionsRoutes(server);
    await registerIntegrationsRoutes(server);
    await registerAppAnalysisRoutes(server);
    await registerPublishingRoutes(server);
    await registerBillingRoutes(server);
    
    // Register debug routes (for AI assistant debugging)
    await registerDebugRoutes(server, {
      appStore,
      config,
    });
    
    // Register app routes (discover and create)
    await registerAppRoutes(server, {
      discoveryHandler,
      mandatoryDiscoveryHandler,
      smartDiscoveryHandler,
      aiDiscoveryHandler, // AI-powered discovery with dynamic questions
      appGenerator,
      neoEngine,
      safetyOrchestrator,
      appStore,
      checkRateLimit,
      config,
      determinePrivacyLevel,
      materializedAppToSchema,
      materializedAppToTheme,
    });
    
    // Check and handle port conflicts
    const requestedPort = config.port;
    let actualPort = requestedPort;

    server.log.info(`🔍 Checking port ${requestedPort}...`);
    
    if (!(await ensurePortAvailable(requestedPort, true))) {
      server.log.warn(`⚠️  Port ${requestedPort} is still in use after cleanup attempt`);
      server.log.info(`🔍 Searching for alternative port...`);
      
      const alternativePort = await findAvailablePort(requestedPort + 1, 5);
      if (alternativePort) {
        actualPort = alternativePort;
        // Update config for consistency (this is safe since config is a mutable object)
        (config as { port: number }).port = actualPort;
        server.log.warn(`⚠️  Using alternative port ${actualPort} (original ${requestedPort} unavailable)`);
        server.log.warn(`⚠️  NOTE: Frontend proxy is configured for port 3000. Update vite.config.ts if needed.`);
      } else {
        server.log.error(`❌ No available ports found. Please free port ${requestedPort} manually.`);
        server.log.error(`💡 Tip: Use "netstat -ano | findstr :${requestedPort}" to find the process`);
        process.exit(1);
      }
    } else {
      server.log.info(`✅ Port ${requestedPort} is available`);
    }

    // Start listening with retry logic for port conflicts
    let listenSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!listenSuccess && retryCount < maxRetries) {
      try {
        await server.listen({ port: actualPort, host: config.host });
        listenSuccess = true;
      } catch (listenError: any) {
        if (listenError.code === 'EADDRINUSE') {
          retryCount++;
          server.log.warn(`⚠️  Port ${actualPort} was taken during startup (attempt ${retryCount}/${maxRetries})`);
          
          // Try to kill the process using the port
          const portUtils = await import('./port-utils.js');
          const killed = portUtils.killProcessOnPort(actualPort);
          
          if (killed) {
            // Wait a moment for port to be released
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Try again on the same port
            continue;
          } else {
            // Port couldn't be freed, find alternative
            const alternativePort = await portUtils.findAvailablePort(actualPort + 1, 5);
            if (alternativePort) {
              server.log.warn(`⚠️  Using alternative port ${alternativePort} (original ${actualPort} unavailable)`);
              actualPort = alternativePort;
              (config as { port: number }).port = actualPort;
              continue;
            } else {
              throw new Error(`No available ports found after ${retryCount} attempts`);
            }
          }
        } else {
          // Different error, rethrow
          throw listenError;
        }
      }
    }
    
    if (!listenSuccess) {
      throw new Error(`Failed to start server after ${maxRetries} attempts`);
    }
    
    // Display startup information
    const accessibleUrl = config.host === '0.0.0.0' ? 'localhost' : config.host;
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Neo Backend Server Started Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Binding: ${config.host}:${actualPort}`);
    console.log(`🌐 Access URL: http://localhost:${actualPort}`);
    console.log(`📝 Environment: ${config.nodeEnv}`);
    console.log(`🤖 AI Provider: ${config.aiProvider}${config.aiProvider === 'mock' ? ' (no API key - using mock)' : ''}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Also log via Fastify logger
    server.log.info(`🚀 Neo Backend Server`);
    server.log.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    server.log.info(`📍 Binding: ${config.host}:${actualPort}`);
    server.log.info(`🌐 Access: http://localhost:${actualPort}`);
    server.log.info(`📝 Environment: ${config.nodeEnv}`);
    server.log.info(`🤖 AI Provider: ${config.aiProvider}${config.aiProvider === 'mock' ? ' (no API key - using mock)' : ''}`);
    server.log.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
  } catch (err: any) {
    if (err.code === 'EADDRINUSE' || err.message?.includes('already in use')) {
      server.log.error(`❌ Port ${config.port} is already in use and couldn't be freed`);
      server.log.error(`💡 Try: netstat -ano | findstr :${config.port}`);
      server.log.error(`💡 Or: taskkill /PID <process_id> /F`);
    } else {
      server.log.error(`❌ Server startup failed:`, err.message);
    }
    process.exit(1);
  }
};

start();
