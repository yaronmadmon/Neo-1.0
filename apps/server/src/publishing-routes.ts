/**
 * Publishing Routes
 * 
 * API routes for publishing and versioning apps.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './utils/logger.js';
import { getUserFromRequest } from './auth-routes.js';
import {
  PublishingService,
  DeploymentService,
  type PublisherStorage,
  type DeploymentStorage,
} from '@neo/publishing';
import type { UnifiedAppSchema } from '@neo/blueprint-engine';

// In-memory store (replace with database in production)
const versions = new Map<string, Map<string, any>>(); // appId -> versionId -> version
const currentVersions = new Map<string, Map<string, string>>(); // appId -> environment -> versionId

/**
 * Simple in-memory storage implementation
 */
class InMemoryPublisherStorage implements PublisherStorage, DeploymentStorage {
  private versions: Map<string, Map<string, any>>;
  private currentVersions: Map<string, Map<string, string>>;

  constructor() {
    this.versions = versions;
    this.currentVersions = currentVersions;
  }

  async saveVersion(version: any): Promise<void> {
    const appVersions = this.versions.get(version.appId) || new Map();
    appVersions.set(version.id, version);
    this.versions.set(version.appId, appVersions);
  }

  async getVersion(versionId: string): Promise<any | null> {
    for (const appVersions of this.versions.values()) {
      const version = appVersions.get(versionId);
      if (version) return version;
    }
    return null;
  }

  async getVersions(appId: string, environment?: string): Promise<any[]> {
    const appVersions = this.versions.get(appId);
    if (!appVersions) return [];
    
    const allVersions = Array.from(appVersions.values());
    if (environment) {
      return allVersions.filter(v => v.environment === environment);
    }
    return allVersions;
  }

  async setCurrentVersion(appId: string, environment: string, versionId: string): Promise<void> {
    const envVersions = this.currentVersions.get(appId) || new Map();
    envVersions.set(environment, versionId);
    this.currentVersions.set(appId, envVersions);
  }

  async getCurrentVersion(appId: string, environment: string): Promise<any | null> {
    const envVersions = this.currentVersions.get(appId);
    if (!envVersions) return null;
    
    const versionId = envVersions.get(environment);
    if (!versionId) return null;
    
    return this.getVersion(versionId);
  }
}

// Create services
const storage = new InMemoryPublisherStorage();
const publishingService = new PublishingService(storage);
const deploymentService = new DeploymentService(storage);

// In-memory app store (reference to existing app store)
let appStore: Map<string, any> | null = null;

export function setAppStore(store: Map<string, any>): void {
  appStore = store;
}

/**
 * Register publishing routes
 */
export async function registerPublishingRoutes(server: FastifyInstance): Promise<void> {
  /**
   * Publish app to environment
   * POST /apps/:appId/publish
   */
  server.post<{
    Params: { appId: string };
    Body: {
      environment?: 'draft' | 'staging' | 'production';
      version?: string;
      description?: string;
    };
  }>(
    '/apps/:appId/publish',
    async (request, reply) => {
      try {
        const { appId } = request.params;
        const { environment = 'staging', version, description } = request.body;
        
        // Get user (optional)
        const user = await getUserFromRequest(request);
        
        // Get app from store (would come from database in production)
        if (!appStore) {
          return reply.code(500).send({
            success: false,
            error: 'App store not initialized',
          });
        }
        
        const app = appStore.get(appId);
        if (!app) {
          return reply.code(404).send({
            success: false,
            error: 'App not found',
          });
        }
        
        // Convert app to UnifiedAppSchema
        const schema = app.schema as UnifiedAppSchema;
        
        // Publish
        const result = await publishingService.publish(appId, schema, {
          environment: environment as any,
          version,
          description,
          createdBy: user?.id,
          includeData: false,
          minify: true,
          optimize: true,
        });
        
        if (!result.success) {
          return reply.code(500).send(result);
        }
        
        logger.info('App published', { appId, version: result.version.version, environment });
        
        return reply.send(result);
      } catch (error: any) {
        logger.error('Publish failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Publish failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Get version history
   * GET /apps/:appId/versions
   */
  server.get<{
    Params: { appId: string };
    Querystring: { environment?: string };
  }>(
    '/apps/:appId/versions',
    async (request, reply) => {
      try {
        const { appId } = request.params;
        const { environment } = request.query;
        
        const versions = await publishingService.getVersionHistory(
          appId,
          environment as any
        );
        
        return reply.send({
          success: true,
          versions,
        });
      } catch (error: any) {
        logger.error('Get versions failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get versions',
          message: error.message,
        });
      }
    }
  );

  /**
   * Rollback to a version
   * POST /apps/:appId/rollback/:versionId
   */
  server.post<{ Params: { appId: string; versionId: string } }>(
    '/apps/:appId/rollback/:versionId',
    async (request, reply) => {
      try {
        const { appId, versionId } = request.params;
        
        // Get version to determine environment
        const version = await publishingService.getVersion(versionId);
        if (!version) {
          return reply.code(404).send({
            success: false,
            error: 'Version not found',
          });
        }
        
        if (version.appId !== appId) {
          return reply.code(400).send({
            success: false,
            error: 'Version does not belong to this app',
          });
        }
        
        // Rollback
        const result = await deploymentService.rollback(
          appId,
          version.environment,
          versionId
        );
        
        if (!result.success) {
          return reply.code(500).send(result);
        }
        
        logger.info('App rolled back', { appId, version: result.version.version, environment: result.version.environment });
        
        return reply.send(result);
      } catch (error: any) {
        logger.error('Rollback failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Rollback failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Rollback to previous version
   * POST /apps/:appId/rollback/previous
   */
  server.post<{
    Params: { appId: string };
    Body: { environment?: 'draft' | 'staging' | 'production' };
  }>(
    '/apps/:appId/rollback/previous',
    async (request, reply) => {
      try {
        const { appId } = request.params;
        const { environment = 'production' } = request.body;
        
        // Rollback to previous
        const result = await deploymentService.rollbackToPrevious(
          appId,
          environment as any
        );
        
        if (!result.success) {
          return reply.code(500).send(result);
        }
        
        logger.info('App rolled back to previous', { appId, version: result.version.version, environment });
        
        return reply.send(result);
      } catch (error: any) {
        logger.error('Rollback failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Rollback failed',
          message: error.message,
        });
      }
    }
  );

  /**
   * Serve published app
   * GET /live/:appId/*
   */
  server.get<{ Params: { appId: string; '*'?: string } }>(
    '/live/:appId/*',
    async (request, reply) => {
      try {
        const { appId } = request.params;
        
        // Get current production version
        const version = await publishingService.getCurrentVersion(appId, 'production');
        
        if (!version || !version.isActive) {
          return reply.code(404).send({
            success: false,
            error: 'No published version found',
          });
        }
        
        // Return bundle (in production, serve static files)
        return reply.send({
          success: true,
          version: version.version,
          bundle: version.bundle,
        });
      } catch (error: any) {
        logger.error('Get published app failed', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to get published app',
          message: error.message,
        });
      }
    }
  );
}
