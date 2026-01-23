/**
 * Integrations Routes
 * 
 * API routes for managing integrations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import {
  integrationConfigService,
  integrationRegistry,
  type IntegrationConfig,
  type IntegrationProviderId,
} from '@neo/integrations';

/**
 * Register integration routes
 */
export async function registerIntegrationsRoutes(server: FastifyInstance): Promise<void> {
  /**
   * Get all integrations for an app
   * GET /api/apps/:appId/integrations
   */
  server.get<{ Params: { appId: string } }>(
    '/api/apps/:appId/integrations',
    async (request: FastifyRequest<{ Params: { appId: string } }>, reply: FastifyReply) => {
      try {
        const { appId } = request.params;
        
        const integrations = integrationConfigService.getIntegrations(appId);
        const providers = integrationRegistry.getAllProviders();

        // Enrich with provider info
        const enriched = integrations.map(integration => {
          const provider = integrationRegistry.getProvider(integration.providerId);
          return {
            ...integration,
            provider: provider ? {
              id: provider.id,
              displayName: provider.displayName,
              description: provider.description,
              actions: provider.actions.map(a => ({
                id: a.id,
                displayName: a.displayName,
                description: a.description,
              })),
            } : null,
          };
        });

        return reply.send({
          success: true,
          integrations: enriched,
          availableProviders: providers.map(p => ({
            id: p.id,
            displayName: p.displayName,
            description: p.description,
            requiredSettings: p.requiredSettings,
            optionalSettings: p.optionalSettings,
          })),
        });
      } catch (error: any) {
        logger.error('Get integrations failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get integrations',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get a specific integration
   * GET /api/apps/:appId/integrations/:providerId
   */
  server.get<{ Params: { appId: string; providerId: string } }>(
    '/api/apps/:appId/integrations/:providerId',
    async (request: FastifyRequest<{ Params: { appId: string; providerId: string } }>, reply: FastifyReply) => {
      try {
        const { appId, providerId } = request.params;
        
        const integration = integrationConfigService.getIntegration(appId, providerId as IntegrationProviderId);
        
        if (!integration) {
          return reply.code(404).send({
            success: false,
            error: 'Integration not found',
          });
        }

        const provider = integrationRegistry.getProvider(integration.providerId);

        return reply.send({
          success: true,
          integration: {
            ...integration,
            provider: provider ? {
              id: provider.id,
              displayName: provider.displayName,
              description: provider.description,
            } : null,
          },
        });
      } catch (error: any) {
        logger.error('Get integration failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get integration',
          message: error.message,
        });
      }
    }
  );

  /**
   * Create or update an integration
   * POST /api/apps/:appId/integrations
   */
  server.post<{
    Params: { appId: string };
    Body: {
      providerId: IntegrationProviderId;
      displayName?: string;
      settings: Record<string, any>;
      enabled?: boolean;
    };
  }>(
    '/api/apps/:appId/integrations',
    async (request: FastifyRequest<{ Params: { appId: string }; Body: { providerId: IntegrationProviderId; displayName?: string; settings: Record<string, any>; enabled?: boolean } }>, reply: FastifyReply) => {
      try {
        const { appId } = request.params;
        const { providerId, displayName, settings, enabled = true } = request.body;

        if (!providerId) {
          return reply.code(400).send({
            success: false,
            error: 'Provider ID is required',
          });
        }

        // Validate settings
        const validation = integrationConfigService.validateSettings(providerId, settings);
        if (!validation.valid) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid settings',
            missing: validation.missing,
          });
        }

        const config: IntegrationConfig = {
          providerId,
          appId,
          displayName,
          settings,
          enabled,
        };

        integrationConfigService.setIntegration(config);

        logger.info('Integration created/updated', { appId, providerId });

        return reply.send({
          success: true,
          integration: config,
        });
      } catch (error: any) {
        logger.error('Create/update integration failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create/update integration',
          message: error.message,
        });
      }
    }
  );

  /**
   * Delete/disable an integration
   * DELETE /api/apps/:appId/integrations/:providerId
   */
  server.delete<{ Params: { appId: string; providerId: string } }>(
    '/api/apps/:appId/integrations/:providerId',
    async (request: FastifyRequest<{ Params: { appId: string; providerId: string } }>, reply: FastifyReply) => {
      try {
        const { appId, providerId } = request.params;
        
        const deleted = integrationConfigService.deleteIntegration(appId, providerId as IntegrationProviderId);
        
        if (!deleted) {
          return reply.code(404).send({
            success: false,
            error: 'Integration not found',
          });
        }

        logger.info('Integration deleted', { appId, providerId });

        return reply.send({
          success: true,
          message: 'Integration deleted',
        });
      } catch (error: any) {
        logger.error('Delete integration failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete integration',
          message: error.message,
        });
      }
    }
  );

  /**
   * Test an integration connection
   * POST /api/apps/:appId/integrations/:providerId/test
   */
  server.post<{ Params: { appId: string; providerId: string } }>(
    '/api/apps/:appId/integrations/:providerId/test',
    async (request: FastifyRequest<{ Params: { appId: string; providerId: string } }>, reply: FastifyReply) => {
      try {
        const { appId, providerId } = request.params;
        
        const integration = integrationConfigService.getIntegration(appId, providerId as IntegrationProviderId);
        
        if (!integration || !integration.enabled) {
          return reply.code(404).send({
            success: false,
            error: 'Integration not found or disabled',
          });
        }

        // Mock test - in production, this would actually test the connection
        const testResult = {
          success: true,
          message: 'Connection test successful (mock)',
          timestamp: new Date().toISOString(),
        };

        return reply.send({
          success: true,
          test: testResult,
        });
      } catch (error: any) {
        logger.error('Test integration failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to test integration',
          message: error.message,
        });
      }
    }
  );
}
