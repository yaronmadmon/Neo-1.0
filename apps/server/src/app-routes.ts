/**
 * App Routes
 * API routes for app discovery and creation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppCategory, AppPrivacyLevel, type App, type UserPreferences } from '@neo/contracts';
import type { ProcessedIntent } from '@neo/blueprint-engine';
import { logger } from './utils/logger.js';
import { captureException, setRequestContext, addBreadcrumb } from './utils/sentry.js';
import { randomUUID } from 'node:crypto';
import { appRepository } from './repositories/app-repository.js';
import { isDatabaseEnabled } from './services/database.js';

// These will be injected when routes are registered
let discoveryHandler: any;
let mandatoryDiscoveryHandler: any;
let smartDiscoveryHandler: any;
let aiDiscoveryHandler: any; // AI-powered discovery with dynamic questions
let aiProviderForDiscovery: any; // AI provider for conversational discovery
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
    mandatoryDiscoveryHandler: any;
    smartDiscoveryHandler?: any;
    aiDiscoveryHandler?: any; // AI-powered discovery
    aiProviderForDiscovery?: any; // AI provider for conversational discovery
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
  mandatoryDiscoveryHandler = dependencies.mandatoryDiscoveryHandler;
  smartDiscoveryHandler = dependencies.smartDiscoveryHandler;
  aiDiscoveryHandler = dependencies.aiDiscoveryHandler;
  aiProviderForDiscovery = dependencies.aiProviderForDiscovery;
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
   * Discovery endpoint - MANDATORY discovery flow that always runs
   * POST /api/apps/discover
   */
  server.post<{ 
    Body: { 
      input: string; 
      state?: { currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> };
      answers?: Record<string, unknown>;
    } 
  }>(
    '/api/apps/discover',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            state: { type: 'object' },
            answers: { type: 'object' },
          },
          required: ['input'],
        },
      },
    },
    async (request: FastifyRequest<{ 
      Body: { 
        input: string; 
        state?: { currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> };
        answers?: Record<string, unknown>;
      } 
    }>, reply: FastifyReply) => {
      // Wrap entire handler in try/catch to guarantee a response
      try {
        // Add DEFAULTS at the top - DO NOT destructure without defaults
        const body = request.body ?? {};
        const input = body.input ?? "";
        const state = body.state ?? { currentStep: 0, answers: {} };
        const answers = body.answers ?? {};
        
        // Log input at the start
        console.log('DISCOVER INPUT:', JSON.stringify({ input, state, answers }, null, 2));
        
        // Set request context for Sentry - wrap in try/catch to prevent crashes
        try {
          setRequestContext({
            method: request.method,
            url: request.url,
            headers: request.headers as Record<string, string>,
            body: request.body,
          });
          
          addBreadcrumb('Mandatory discovery endpoint called', 'http', {
            method: request.method,
            url: request.url,
          });
        } catch (sentryError) {
          console.error('Sentry context failed:', sentryError);
          // Continue - don't fail the request
        }

        // Defensive guard: If input is missing or empty, return safe fallback
        if (!input || typeof input !== 'string' || input.trim().length === 0) {
          console.log('Input missing or empty, returning safe fallback');
          return reply.code(200).type('application/json').send({
            needsClarification: true,
            questions: [],
            state: {
              currentStep: 0,
              answers: {}
            }
          });
        }

        // If state and answers provided, continue discovery
        // Use the defaults we set above - state and answers are never null/undefined
        if (state && Object.keys(state).length > 0 && answers && Object.keys(answers).length > 0) {
          console.log('Continuing AI-powered discovery with state:', JSON.stringify(state, null, 2));
          console.log('Answers:', JSON.stringify(answers, null, 2));
          
          // Priority: AI discovery > smart discovery > mandatory
          const useAI = !!aiDiscoveryHandler;
          const handler = aiDiscoveryHandler || smartDiscoveryHandler || mandatoryDiscoveryHandler;
          console.log('Using handler:', useAI ? 'AI-POWERED' : (smartDiscoveryHandler ? 'SMART' : 'MANDATORY'));
          
          // Ensure handler exists before calling
          if (!handler) {
            console.error('No discovery handler is initialized!');
            return reply.code(200).type('application/json').send({
              needsClarification: true,
              questions: [],
              state: {
                currentStep: 0,
                answers: {}
              }
            });
          }
          
          let result;
          try {
            // AI handler is async, others are sync
            result = useAI 
              ? await handler.continueDiscovery(state, answers)
              : handler.continueDiscovery(state, answers);
            console.log('Continue discovery result:', {
              needsClarification: result?.needsClarification,
              hasAppConfig: !!result?.appConfig,
              questionCount: result?.questions?.length,
            });
          } catch (handlerError: any) {
            console.error('Error calling continueDiscovery:', handlerError);
            console.error('Handler error stack:', handlerError?.stack);
            throw handlerError; // Re-throw to be caught by outer catch
          }
          
          if (!result) {
            console.error('Continue discovery result is null/undefined');
            return reply.code(200).type('application/json').send({
              needsClarification: true,
              questions: [],
              state: {
                currentStep: 0,
                answers: {}
              }
            });
          }
          
          // Ensure state is serializable (include smart discovery fields)
          const safeState = result.state || { currentStep: 0, answers: {} };
          const serializableState: Record<string, unknown> = {
            currentStep: Number(safeState.currentStep) || 0,
            answers: typeof safeState.answers === 'object' && safeState.answers !== null 
              ? { ...safeState.answers } 
              : {},
            // Include smart discovery state fields
            confidence: safeState.confidence,
            detectedIndustry: safeState.detectedIndustry,
            detectedIntent: safeState.detectedIntent,
            originalInput: safeState.originalInput,
            questionsAsked: safeState.questionsAsked,
          };
          
          // Only include context if it exists and is valid
          if (safeState.context === 'business' || safeState.context === 'home') {
            serializableState.context = safeState.context;
          }
          
          // If Home placeholder, return special response
          if (result.isHomePlaceholder) {
            return reply.code(200).type('application/json').send({
              needsClarification: true,
              isHomePlaceholder: true,
              questions: [],
              state: serializableState,
              message: 'Home discovery coming next',
            });
          }
          
          // If complete, return AppConfig
          if (!result.needsClarification && result.appConfig) {
            return reply.code(200).type('application/json').send({
              needsClarification: false,
              appConfig: result.appConfig,
              state: serializableState,
            });
          }
          
          // More questions needed
          const safeQuestions = Array.isArray(result.questions) ? result.questions : [];
          return reply.code(200).type('application/json').send({
            needsClarification: true,
            questions: safeQuestions,
            state: serializableState,
          });
        }

        // Start discovery - use AI-powered discovery for dynamic questions
        console.log('Starting AI-powered discovery with input:', input?.substring(0, 50));
        
        // Priority: AI discovery > smart discovery > mandatory
        const useAI = !!aiDiscoveryHandler;
        const handler = aiDiscoveryHandler || smartDiscoveryHandler || mandatoryDiscoveryHandler;
        console.log('Using handler:', useAI ? 'AI-POWERED' : (smartDiscoveryHandler ? 'SMART' : 'MANDATORY'));
        
        if (!handler) {
          console.error('No discovery handler is initialized!');
          return reply.code(200).type('application/json').send({
            needsClarification: true,
            questions: [],
            state: {
              currentStep: 0,
              answers: {}
            }
          });
        }
        
        let result;
        try {
          // AI handler is async, others are sync
          result = useAI 
            ? await handler.startDiscovery(input)
            : handler.startDiscovery(input);
          console.log('Discovery result:', {
            needsClarification: result?.needsClarification,
            action: result?.action,
            hasQuestions: !!result?.questions?.length,
            hasAppConfig: !!result?.appConfig,
            confidence: result?.state?.confidence,
            aiInterpretation: result?.state?.aiInterpretation,
          });
        } catch (handlerError: any) {
          console.error('Error calling startDiscovery:', handlerError);
          console.error('Handler error stack:', handlerError?.stack);
          throw handlerError;
        }
        
        // Validate result structure
        if (!result) {
          console.error('Discovery result is null/undefined');
          return reply.code(200).type('application/json').send({
            needsClarification: true,
            questions: [],
            state: {
              currentStep: 0,
              answers: {}
            }
          });
        }
        
        // Handle auto_build action (high confidence) - proceed directly to app creation
        if (result.action === 'auto_build' && result.appConfig) {
          console.log('HIGH CONFIDENCE - Auto-building app');
          return reply.code(200).type('application/json').send({
            needsClarification: false,
            appConfig: result.appConfig,
            state: result.state,
            action: 'auto_build',
          });
        }
        
        // Handle confirm action (medium-high confidence) - show confirmation
        if (result.action === 'confirm' && result.appConfig) {
          console.log('MEDIUM-HIGH CONFIDENCE - Requesting confirmation');
          // Still return as needsClarification so UI can show confirmation
        }
        
        // Ensure state and questions are properly structured
        const safeState = result.state || { currentStep: 0, answers: {} };
        const safeQuestions = Array.isArray(result.questions) ? result.questions : [];
        
        // Ensure state is serializable
        const serializableState: Record<string, unknown> = {
          currentStep: Number(safeState.currentStep) || 0,
          answers: typeof safeState.answers === 'object' && safeState.answers !== null 
            ? { ...safeState.answers } 
            : {},
          // Include smart discovery state fields
          confidence: safeState.confidence,
          detectedIndustry: safeState.detectedIndustry,
          detectedIntent: safeState.detectedIntent,
          originalInput: safeState.originalInput,
          questionsAsked: safeState.questionsAsked,
        };
        
        // Only include context if it exists and is valid
        if (safeState.context === 'business' || safeState.context === 'home') {
          serializableState.context = safeState.context;
        }
        
        console.log('Sending discovery response:', {
          needsClarification: result.needsClarification,
          questionCount: safeQuestions.length,
          action: result.action,
        });
        
        // Return with action type for UI handling
        return reply.code(200).type('application/json').send({
          needsClarification: result.needsClarification !== false,
          questions: safeQuestions,
          state: serializableState,
          action: result.action,
          appConfig: result.appConfig,
        });
      } catch (error: any) {
        // On error, NEVER crash. Instead return 200 with error flag
        console.error("DISCOVERY ERROR:", error);
        console.error('Error stack:', error?.stack);
        console.error('Error name:', error?.name);
        console.error('Error message:', error?.message);
        
        // Capture error in Sentry with full context (wrap in try/catch)
        try {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          captureException(errorObj, {
            endpoint: '/api/apps/discover',
            inputLength: request.body?.input?.length,
            hasAnswers: !!request.body?.answers,
            hasState: !!request.body?.state,
          });
          
          logger.error('Discovery failed', error, {
            inputLength: request.body?.input?.length,
          });
        } catch (logError) {
          console.error('Failed to log error to Sentry:', logError);
        }
        
        // ALWAYS return a valid JSON response - never crash or send empty response
        if (!reply.sent) {
          try {
            // Create safe response object
            const errorResponse = {
              needsClarification: true,
              error: "discovery_failed",
              message: error?.message || 'An error occurred during discovery',
              state: {
                currentStep: 0,
                answers: {}
              }
            };
            
            // Return 200 with error flag (NOT 500)
            return reply.code(200).type('application/json').send(errorResponse);
          } catch (sendError: any) {
            console.error('Failed to send error response:', sendError);
            console.error('Send error stack:', sendError?.stack);
            
            // Last resort: write directly to response
            if (!reply.sent) {
              try {
                const fallbackResponse = JSON.stringify({
                  needsClarification: true,
                  error: "discovery_failed",
                  state: {
                    currentStep: 0,
                    answers: {}
                  }
                });
                reply.raw.writeHead(200, { 'Content-Type': 'application/json' });
                reply.raw.end(fallbackResponse);
                return; // Important: return after sending
              } catch (finalError: any) {
                console.error('CRITICAL: Failed to send any response:', finalError);
                console.error('Final error stack:', finalError?.stack);
                // At this point, we've exhausted all options
                // The global error handler will catch this
              }
            }
          }
        } else {
          console.warn('Response already sent when error occurred');
        }
      }
    }
  );

  /**
   * Chat-based Discovery endpoint - Friendly conversational flow
   * POST /api/apps/discover/chat
   */
  server.post<{
    Body: {
      input: string;
      action: 'start' | 'continue';
      state?: {
        step: number;
        collectedInfo: Record<string, unknown>;
        originalInput: string;
      };
      originalInput?: string;
    };
  }>(
    '/api/apps/discover/chat',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            action: { type: 'string', enum: ['start', 'continue'] },
            state: { type: 'object' },
            originalInput: { type: 'string' },
          },
          required: ['input', 'action'],
        },
      },
    },
    async (request, reply) => {
      try {
        const { input, action, state, originalInput } = request.body;

        console.log('Chat discovery:', action, input?.substring(0, 50));

        // Import the conversational handler dynamically
        const { ConversationalDiscoveryHandler } = await import('@neo/discovery');
        
        // IMPORTANT: Pass the AI provider so we get real AI-powered analysis
        // Without this, the handler falls back to keyword-only matching which
        // doesn't understand natural language properly
        const chatHandler = new ConversationalDiscoveryHandler(aiProviderForDiscovery);

        if (action === 'start') {
          const result = await chatHandler.startConversation(input);
          return reply.code(200).type('application/json').send(result);
        }

        if (action === 'continue' && state) {
          const conversationState = {
            step: state.step || 1,
            collectedInfo: state.collectedInfo || {},
            originalInput: originalInput || state.originalInput || '',
            questionsAsked: (state as any).questionsAsked || [],
            confidence: (state as any).confidence || 0.3,
            // Pass through state fields for smart discovery flow
            userConfirmed: (state as any).userConfirmed || false,
            pendingConfirmation: (state as any).pendingConfirmation || false,
            questionCount: (state as any).questionCount || 0,
            enabledFeatures: (state as any).enabledFeatures || [],
            answers: (state as any).answers || {},
            detectedIndustry: (state as any).detectedIndustry || state.collectedInfo?.industry,
          };

          // DEBUG: Log what state we're receiving
          console.log('📥 Smart Discovery - incoming state:', {
            step: conversationState.step,
            questionCount: conversationState.questionCount,
            pendingConfirmation: conversationState.pendingConfirmation,
            enabledFeatures: conversationState.enabledFeatures,
          });

          const result = await chatHandler.continueConversation(input, conversationState);
          
          // DEBUG: Log what we're sending back
          console.log('📤 Smart Discovery - outgoing state:', {
            step: result.step,
            questionCount: (result as any).questionCount,
            pendingConfirmation: (result as any).pendingConfirmation,
            enabledFeatures: (result as any).enabledFeatures,
            complete: result.complete,
          });
          
          return reply.code(200).type('application/json').send(result);
        }

        return reply.code(400).type('application/json').send({
          error: 'Invalid action or missing state',
        });
      } catch (error: any) {
        console.error('Chat discovery error:', error);
        return reply.code(200).type('application/json').send({
          message: "I had a small issue. Let me try again - can you tell me about your business?",
          complete: false,
          step: 1,
          collectedInfo: {},
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
      appConfig?: any;
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
            appConfig: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ 
      Body: { 
        input: string; 
        category?: AppCategory; 
        preferences?: UserPreferences;
        appConfig?: any;
      } 
    }>, reply: FastifyReply) => {
      try {
        // Set request context for Sentry
        setRequestContext({
          method: request.method,
          url: request.url,
          headers: request.headers as Record<string, string>,
          body: { ...request.body, input: request.body.input?.substring(0, 100) + '...' }, // Truncate input for privacy
        });
        
        addBreadcrumb('Create app endpoint called', 'http', {
          method: request.method,
          url: request.url,
          category: request.body?.category,
        });
        
        // Rate limiting
        const clientId = request.ip || 'unknown';
        if (!checkRateLimit(`create:${clientId}`, config.rateLimit.createApp.max, config.rateLimit.createApp.windowMs)) {
          return reply.code(429).type('application/json').send({
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many app creation requests. Please try again later.',
          });
        }

        const { input, category, preferences, appConfig } = request.body;
        
        // Validate input is not empty
        if (!input || typeof input !== 'string' || input.trim().length === 0) {
          return reply.code(400).type('application/json').send({
            success: false,
            error: 'Invalid input',
            message: 'Input is required and must be a non-empty string',
          });
        }
        
        // Generate app using neoEngine
        // Map appConfig from discovery to discoveredInfo for the AI pipeline
        // IMPORTANT: Include features from collected info for richer app generation
        
        // Extract features from appConfig - can come from multiple sources
        const extractedFeatures: string[] = [];
        if (appConfig) {
          // Direct features array
          if (Array.isArray(appConfig.features)) {
            extractedFeatures.push(...appConfig.features);
          }
          // Features from services (emergency repair -> scheduling, invoicing)
          if (Array.isArray(appConfig.services)) {
            for (const service of appConfig.services) {
              const svc = String(service).toLowerCase();
              if (/emergency|urgent|repair/i.test(svc)) {
                extractedFeatures.push('scheduling', 'notifications', 'job_tracking');
              }
              if (/install|installation/i.test(svc)) {
                extractedFeatures.push('job_tracking', 'quotes', 'invoicing');
              }
            }
          }
          // Features from pain points
          if (Array.isArray(appConfig.painPoints)) {
            for (const pain of appConfig.painPoints) {
              const p = String(pain).toLowerCase();
              if (/payment|collect|billing/i.test(p)) {
                extractedFeatures.push('invoicing', 'payments');
              }
              if (/sales|closing/i.test(p)) {
                extractedFeatures.push('quotes', 'pipelines');
              }
              if (/schedule|booking/i.test(p)) {
                extractedFeatures.push('scheduling', 'calendar');
              }
            }
          }
          // Direct feature keywords
          if (appConfig.mainFeature) {
            extractedFeatures.push(appConfig.mainFeature);
          }
          // Scanner feature
          if (appConfig.scanner || /scanner/i.test(String(appConfig.originalDescription || ''))) {
            extractedFeatures.push('file_upload', 'documents');
          }
        }
        
        // Dedupe features
        const uniqueFeatures = [...new Set(extractedFeatures)];
        
        console.log('🎯 Features extracted for app generation:', uniqueFeatures);
        
        const processedIntent: ProcessedIntent = {
          rawInput: input,
          type: 'create_app',
          discoveredInfo: appConfig ? {
            industry: appConfig.industryText,
            primaryIntent: appConfig.primaryIntent,
            context: appConfig.context,
            teamSize: appConfig.teamSize,
            offerType: appConfig.offerType,
            onlineAcceptance: appConfig.onlineAcceptance,
            // NOW INCLUDES FEATURES for richer app generation!
            features: uniqueFeatures.length > 0 ? uniqueFeatures : undefined,
            // Pass through additional context
            services: appConfig.services,
            painPoints: appConfig.painPoints,
            // Theme/vibe preset from discovery (maps to theme-builder presets)
            themePreset: appConfig.themePreset,
            // Business name for app branding
            businessName: appConfig.businessName,
            // DUAL-SURFACE: Customer-facing flags for generating customer portal
            customerFacing: appConfig.customerFacing,
            customerFeatures: appConfig.customerFeatures,
          } : undefined,
          extractedDetails: category ? { category: String(category) } : undefined,
        };
        const generated = await neoEngine.generateApp(processedIntent);

        const now = new Date();
        const resolvedCategory = category || AppCategory.PERSONAL;
        const schemaWithBranding = {
          ...materializedAppToSchema(generated.materializedApp),
          branding: generated.blueprint.branding,
          // DUAL-SURFACE: Include surfaces config and customer navigation from blueprint
          surfaces: generated.blueprint.surfaces,
          customerNavigation: generated.blueprint.customerNavigation,
        };
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
          schema: schemaWithBranding,
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
        
        // Capture error in Sentry with full context
        const errorObj = error instanceof Error ? error : new Error(String(error));
        captureException(errorObj, {
          endpoint: '/api/apps/create',
          inputLength: request.body?.input?.length,
          category: request.body?.category,
          hasAppConfig: !!request.body?.appConfig,
          errorName: error?.name,
          errorType: error?.constructor?.name,
        });
        
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

  /**
   * Get app by ID endpoint
   * GET /api/apps/:appId
   */
  server.get<{ 
    Params: { appId: string } 
  }>(
    '/api/apps/:appId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            appId: { type: 'string' },
          },
          required: ['appId'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { appId: string } }>, reply: FastifyReply) => {
      try {
        const { appId } = request.params;
        
        console.log('Fetching app:', appId);
        logger.debug('GET /api/apps/:appId requested', { appId });
        
        // Log all stored app IDs for debugging
        const storedIds = Array.from(appStore.keys());
        console.log('Stored app IDs:', storedIds);
        logger.debug('Available app IDs in store', { storedIds, count: storedIds.length });
        
        // First check memory store
        let app = appStore.get(appId);
        
        // If not in memory, check persistent storage (database or file)
        if (!app) {
          console.log('App not in memory, checking persistent storage...');
          logger.debug('Checking persistent storage for app', { appId });
          
          try {
            const storedApp = await appRepository.findById(appId);
            if (storedApp) {
              console.log('App found in persistent storage, caching in memory');
              // Convert to App type and cache in memory for future requests
              app = {
                id: storedApp.id,
                name: storedApp.name,
                description: storedApp.description,
                category: (storedApp.category as any) || 'personal',
                privacyLevel: 'private' as any,
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
              appStore.set(appId, app);
              logger.info('App loaded from persistent storage and cached', { appId });
            }
          } catch (storageError: any) {
            logger.warn('Persistent storage lookup failed', { appId, error: storageError?.message });
          }
        }
        
        if (!app) {
          console.log('App not found in store or persistent storage. Requested ID:', appId, 'Available IDs:', storedIds);
          logger.warn('App not found', { appId, availableIds: storedIds });
          return reply.code(404).type('application/json').send({
            success: false,
            error: 'App not found',
            message: `App with id ${appId} does not exist`,
          });
        }
        
        console.log('App found:', appId, 'Name:', app.name);
        
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
        
        logger.info('App retrieved successfully', { appId });
        
        return reply.code(200).type('application/json').send({
          success: true,
          app: serializedApp,
        });
      } catch (error: any) {
        console.error('Error retrieving app:', error);
        logger.error('Error retrieving app', error, {
          appId: request.params.appId,
        });
        
        return reply.code(500).type('application/json').send({
          success: false,
          error: 'Internal server error',
          message: error?.message || 'An error occurred while retrieving the app',
        });
      }
    }
  );

  /**
   * Development endpoint - Import pre-built app schema directly
   * POST /api/apps/import
   * 
   * This endpoint allows importing pre-built app schemas without going through
   * the discovery/AI flow. Useful for testing and development.
   */
  server.post<{
    Body: {
      schema: Record<string, unknown>;
    };
  }>(
    '/api/apps/import',
    {
      schema: {
        body: {
          type: 'object',
          required: ['schema'],
          properties: {
            schema: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { schema: Record<string, unknown> } }>, reply: FastifyReply) => {
      try {
        const { schema } = request.body;
        
        console.log('📥 Importing pre-built app schema...');
        logger.info('App import requested', { 
          appId: schema.id,
          appName: schema.name,
        });
        
        // Validate required fields
        if (!schema.id || !schema.name) {
          return reply.code(400).type('application/json').send({
            success: false,
            error: 'Invalid schema',
            message: 'Schema must have id and name fields',
          });
        }
        
        // Create the app object - use type assertion for flexibility with pre-built schemas
        const app = {
          id: schema.id as string,
          name: schema.name as string,
          description: (schema.description as string) || '',
          category: (schema.category || 'personal') as AppCategory,
          privacyLevel: AppPrivacyLevel.PRIVATE,
          version: (schema.version as number) || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'import',
          schema: schema as any, // Pre-built schemas may have extended properties
          theme: (schema.theme || { colors: { primary: '#8b5cf6' } }) as any,
          data: (schema.data || {}) as Record<string, unknown[]>,
          settings: (schema.settings || {}) as Record<string, unknown>,
        } as App;
        
        // Store in memory
        appStore.set(app.id, app);
        
        // Persist to storage
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
            userId: 'import',
            isPublic: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          logger.info('App persisted to storage', { appId: app.id });
        } catch (storageError: any) {
          logger.warn('Failed to persist app to storage', { 
            appId: app.id, 
            error: storageError?.message 
          });
        }
        
        console.log('✅ App imported successfully:', app.id);
        
        return reply.code(200).type('application/json').send({
          success: true,
          app: {
            id: app.id,
            name: app.name,
            description: app.description,
            previewUrl: `/preview/${app.id}`,
          },
        });
        
      } catch (error: any) {
        console.error('Import endpoint error:', error);
        logger.error('App import failed', error);
        
        return reply.code(500).type('application/json').send({
          success: false,
          error: 'Internal server error',
          message: error?.message || 'An error occurred while importing the app',
        });
      }
    }
  );
}
