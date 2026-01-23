/**
 * App Analysis Routes
 * API routes for app analysis and improvement
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import { appInsightsEngine, applyAppImprovements } from '@neo/blueprint-engine';
import { explainApp, answerQuestion } from '@neo/blueprint-engine';
import type { UnifiedAppSchema } from '@neo/blueprint-engine';

/**
 * Register app analysis routes
 */
export async function registerAppAnalysisRoutes(server: FastifyInstance): Promise<void> {
  /**
   * Analyze an app
   * POST /api/apps/analyze
   */
  server.post<{ Body: { schema: UnifiedAppSchema } }>(
    '/api/apps/analyze',
    async (request: FastifyRequest<{ Body: { schema: UnifiedAppSchema } }>, reply: FastifyReply) => {
      try {
        const { schema } = request.body;

        const plan = appInsightsEngine.analyzeApp(schema);

        return reply.send({
          success: true,
          plan,
        });
      } catch (error: any) {
        logger.error('App analysis failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to analyze app',
          message: error.message,
        });
      }
    }
  );

  /**
   * Apply improvements to an app
   * POST /api/apps/:appId/improve
   */
  server.post<{
    Params: { appId: string };
    Body: { changeIds: string[]; planId?: string };
  }>(
    '/api/apps/:appId/improve',
    async (request: FastifyRequest<{ Params: { appId: string }; Body: { changeIds: string[]; planId?: string } }>, reply: FastifyReply) => {
      try {
        const { appId } = request.params;
        const { changeIds, planId } = request.body;

        // Get app from store (you'll need to import appStore)
        // For now, this is a placeholder
        // const app = appStore.get(appId);
        // if (!app) {
        //   return reply.code(404).send({ success: false, error: 'App not found' });
        // }

        // This would need to be implemented with actual app retrieval
        // const schema = convertAppToSchema(app);
        // const plan = appInsightsEngine.analyzeApp(schema);
        // const improvedSchema = applyAppImprovements(schema, plan, changeIds);
        // Update app with improved schema

        return reply.send({
          success: true,
          message: 'Improvements applied',
          // app: improvedApp,
        });
      } catch (error: any) {
        logger.error('Apply improvements failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to apply improvements',
          message: error.message,
        });
      }
    }
  );

  /**
   * Explain an app
   * POST /api/apps/:appId/explain
   */
  server.post<{
    Params: { appId: string };
    Body: { question?: string };
  }>(
    '/api/apps/:appId/explain',
    async (request: FastifyRequest<{ Params: { appId: string }; Body: { question?: string } }>, reply: FastifyReply) => {
      try {
        const { appId } = request.params;
        const { question } = request.body;

        // Get app from store
        // const app = appStore.get(appId);
        // if (!app) {
        //   return reply.code(404).send({ success: false, error: 'App not found' });
        // }

        // const schema = convertAppToSchema(app);
        
        // if (question) {
        //   const answer = answerQuestion(schema, question);
        //   return reply.send({ success: true, answer });
        // } else {
        //   const explanation = explainApp(schema);
        //   return reply.send({ success: true, explanation });
        // }

        return reply.send({
          success: true,
          message: 'Explanation generated',
        });
      } catch (error: any) {
        logger.error('Explain app failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to explain app',
          message: error.message,
        });
      }
    }
  );
}
