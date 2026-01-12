/**
 * Debug Routes
 * Endpoints to help AI assistant and developers debug issues
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import { exportDebugState, createDebugReport, getRecentErrors, addErrorToBuffer } from './utils/debug-helper.js';

export async function registerDebugRoutes(
  server: FastifyInstance,
  dependencies: {
    appStore?: Map<string, any>;
    config?: any;
  }
): Promise<void> {
  const { appStore, config } = dependencies;

  /**
   * GET /api/debug/state
   * Get current server state (useful for AI assistant to analyze)
   */
  server.get('/api/debug/state', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const state = await exportDebugState(server, appStore, config);
      
      // Read the file and return its contents
      const fs = await import('fs/promises');
      const stateContent = await fs.readFile(state, 'utf-8');
      
      return reply.send({
        success: true,
        state: JSON.parse(stateContent),
        filePath: state,
      });
    } catch (error: any) {
      logger.error('Failed to export debug state', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to export debug state',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/debug/errors
   * Get recent errors from memory buffer
   */
  server.get<{
    Querystring: { count?: string };
  }>('/api/debug/errors', async (request, reply) => {
    try {
      const count = parseInt(request.query.count || '10', 10);
      const errors = getRecentErrors(count);
      
      return reply.send({
        success: true,
        errors,
        count: errors.length,
      });
    } catch (error: any) {
      logger.error('Failed to get recent errors', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get recent errors',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/debug/report
   * Create a comprehensive debug report
   */
  server.get('/api/debug/report', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const reportPath = await createDebugReport(server, appStore, config);
      
      // Read the file and return its contents
      const fs = await import('fs/promises');
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      
      return reply.send({
        success: true,
        report: JSON.parse(reportContent),
        filePath: reportPath,
      });
    } catch (error: any) {
      logger.error('Failed to create debug report', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to create debug report',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/debug/config
   * Get current configuration (sanitized, no secrets)
   */
  server.get('/api/debug/config', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const safeConfig = {
        port: config?.port,
        host: config?.host,
        nodeEnv: config?.nodeEnv,
        logLevel: config?.logLevel,
        aiProvider: config?.aiProvider,
        openaiModel: config?.openaiModel,
        anthropicModel: config?.anthropicModel,
        rateLimit: config?.rateLimit,
        // Explicitly exclude sensitive data
        hasOpenaiKey: !!config?.openaiApiKey,
        hasAnthropicKey: !!config?.anthropicApiKey,
      };
      
      return reply.send({
        success: true,
        config: safeConfig,
      });
    } catch (error: any) {
      logger.error('Failed to get config', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get config',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/debug/health
   * Quick health check with basic info
   */
  server.get('/api/debug/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return reply.send({
        success: true,
        health: {
          status: 'ok',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
          appStoreSize: appStore?.size || 0,
        },
      });
    } catch (error: any) {
      logger.error('Health check failed', error);
      return reply.code(500).send({
        success: false,
        error: 'Health check failed',
        message: error.message,
      });
    }
  });

  logger.info('Debug routes registered', {
    endpoints: [
      '/api/debug/state',
      '/api/debug/errors',
      '/api/debug/report',
      '/api/debug/config',
      '/api/debug/health',
    ],
  });
}
