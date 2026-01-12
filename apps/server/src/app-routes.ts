/**
 * App Routes
 * API routes for app discovery and creation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppCategory, AppPrivacyLevel, type App, type UserPreferences } from '@neo/contracts';
import type { ProcessedIntent } from '@neo/blueprint-engine';
import { logger } from './utils/logger.js';
import { randomUUID } from 'node:crypto';

// These will be injected when routes are registered
let discoveryHandler: any;
let appGenerator: any;
let neoEngine: any;
let safetyOrchestrator: any;
let appStore: Map<string, App>;
let checkRateLimit: (key: string, max: number, windowMs: number) => boolean;
let config: any;
let determinePrivacyLevel: (input: string, preferences?: UserPreferences) => AppPrivacyLevel;
let materializedAppToSchema: (app: any) => App['schema'];
let materializedAppToTheme: (app: any) => App['theme'];

/**
 * Register app routes
 */
export async function registerAppRoutes(
  server: FastifyInstance,
  dependencies: {
    discoveryHandler: any;
    appGenerator: any;
    neoEngine: any;
    safetyOrchestrator: any;
    appStore: Map<string, App>;
    checkRateLimit: (key: string, max: number, windowMs: number) => boolean;
    config: any;
    determinePrivacyLevel: (input: string, preferences?: UserPreferences) => AppPrivacyLevel;
    materializedAppToSchema: (app: any) => App['schema'];
    materializedAppToTheme: (app: any) => App['theme'];
  }
): Promise<void> {
  // Inject dependencies
  discoveryHandler = dependencies.discoveryHandler;
  appGenerator = dependencies.appGenerator;
  neoEngine = dependencies.neoEngine;
  safetyOrchestrator = dependencies.safetyOrchestrator;
  appStore = dependencies.appStore;
  checkRateLimit = dependencies.checkRateLimit;
  config = dependencies.config;
  determinePrivacyLevel = dependencies.determinePrivacyLevel;
  materializedAppToSchema = dependencies.materializedAppToSchema;
  materializedAppToTheme = dependencies.materializedAppToTheme;

  /**
   * Discovery endpoint - analyze input and return questions if needed
   * POST /api/apps/discover
   */
  server.post<{ 
    Body: { 
      input: string; 
      conversationId?: string; 
      answers?: Record<string, unknown>; 
      discoveredInfo?: any;
    } 
  }>(
    '/api/apps/discover',
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
    async (request: FastifyRequest<{ 
      Body: { 
        input: string; 
        conversationId?: string; 
        answers?: Record<string, unknown>; 
        discoveredInfo?: any;
      } 
    }>, reply: FastifyReply) => {
      try {
        const { input, answers, discoveredInfo: existingInfo } = request.body;

        // Validate input
        if (!input || typeof input !== 'string' || input.trim().length === 0) {
          return reply.code(400).type('application/json').send({
            success: false,
            error: 'Invalid input',
            message: 'Input is required and must be a non-empty string',
          });
        }

        // Analyze input for discovery needs
        const discoveryResult = await discoveryHandler.analyzeInput(input, existingInfo);

        // If answers provided, process them
        let finalDiscoveredInfo = discoveryResult.discoveredInfo;
        if (answers && finalDiscoveredInfo) {
          finalDiscoveredInfo = discoveryHandler.processAnswers(finalDiscoveredInfo, answers);
          // Re-analyze with updated info to see if more questions are needed
          const reanalyzed = await discoveryHandler.analyzeInput(input, finalDiscoveredInfo);
          return reply.code(200).type('application/json').send({
            success: true,
            needsClarification: reanalyzed.needsClarification,
            questions: reanalyzed.questions,
            discoveredInfo: finalDiscoveredInfo,
            confidence: reanalyzed.confidence,
            suggestedFeatures: reanalyzed.suggestedFeatures,
          });
        }

        return reply.code(200).type('application/json').send({
          success: true,
          needsClarification: discoveryResult.needsClarification,
          questions: discoveryResult.questions,
          discoveredInfo: discoveryResult.discoveredInfo,
          confidence: discoveryResult.confidence,
          suggestedFeatures: discoveryResult.suggestedFeatures,
        });
      } catch (error: any) {
        console.error('Discovery endpoint error:', error);
        logger.error('Discovery failed', error, {
          inputLength: request.body?.input?.length,
        });
        
        return reply.code(500).type('application/json').send({
          success: false,
          error: 'Discovery failed',
          message: error.message || 'An error occurred during discovery',
        });
      }
    }
  );

  /**
   * Create app endpoint
   * POST /api/apps/create
   */
  server.post<{
    Body: {
      input: string;
      category?: AppCategory;
      preferences?: UserPreferences;
      discoveredInfo?: any;
    };
  }>(
    '/api/apps/create',
    {
      schema: {
        body: {
          type: 'object',
          required: ['input'],
          properties: {
            input: { type: 'string', minLength: 1, maxLength: 10000 },
            category: { type: 'string', enum: Object.values(AppCategory) },
            preferences: { type: 'object' },
            discoveredInfo: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ 
      Body: { 
        input: string; 
        category?: AppCategory; 
        preferences?: UserPreferences;
        discoveredInfo?: any;
      } 
    }>, reply: FastifyReply) => {
      try {
        // Rate limiting
        const clientId = request.ip || 'unknown';
        if (!checkRateLimit(`create:${clientId}`, config.rateLimit.createApp.max, config.rateLimit.createApp.windowMs)) {
          return reply.code(429).type('application/json').send({
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many app creation requests. Please try again later.',
          });
        }

        const { input, category, preferences, discoveredInfo } = request.body;
        
        // Validate input is not empty
        if (!input || typeof input !== 'string' || input.trim().length === 0) {
          return reply.code(400).type('application/json').send({
            success: false,
            error: 'Invalid input',
            message: 'Input is required and must be a non-empty string',
          });
        }
        
        // Generate app using neoEngine
        const processedIntent: ProcessedIntent = {
          rawInput: input,
          type: 'create_app',
          extractedDetails: category ? { category: String(category) } : undefined,
        };
        const generated = await neoEngine.generateApp(processedIntent);

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

        // Safety check
        const safetyCheck = await safetyOrchestrator.validateApp(app);
        if (!safetyCheck.safe) {
          return reply.code(403).type('application/json').send({
            success: false,
            error: 'Safety check failed',
            message: 'Generated app failed safety checks',
            safety: safetyCheck,
          });
        }

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

        // Store app
        appStore.set(app.id, app);
        logger.info('App created and stored', {
          appId: app.id,
          appName: app.name,
          category: app.category,
        });

        // Serialize app for JSON response
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

        const responsePayload = {
          success: true,
          app: serializedApp,
          previewUrl: `/preview/${app.id}`,
          safety: safetyCheck || {},
        };

        return reply.code(200).type('application/json').send(responsePayload);
      } catch (error: any) {
        console.error('Create endpoint error:', error);
        logger.error('App creation failed', error, {
          inputLength: request.body?.input?.length,
          category: request.body?.category,
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
        
        return reply.code(statusCode).type('application/json').send({
          success: false,
          error: 'App creation failed',
          message: errorMessage,
        });
      }
    }
  );
}
