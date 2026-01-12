/**
 * Publisher Service
 * 
 * Handles publishing apps to different environments.
 */

import { randomUUID } from 'node:crypto';
import type { UnifiedAppSchema } from '@neo/blueprint-engine';
import type {
  AppVersion,
  PublishedBundle,
  PublishOptions,
  PublishResult,
  Environment,
} from './types.js';
import { getNextVersion, isValidVersion } from './versioning.js';

export interface PublisherStorage {
  saveVersion(version: AppVersion): Promise<void>;
  getVersion(versionId: string): Promise<AppVersion | null>;
  getVersions(appId: string, environment?: Environment): Promise<AppVersion[]>;
  setCurrentVersion(appId: string, environment: Environment, versionId: string): Promise<void>;
  getCurrentVersion(appId: string, environment: Environment): Promise<AppVersion | null>;
}

/**
 * Publisher Service
 * Handles publishing apps to different environments
 */
export class PublishingService {
  private storage: PublisherStorage;

  constructor(storage: PublisherStorage) {
    this.storage = storage;
  }

  /**
   * Publish an app to an environment
   */
  async publish(
    appId: string,
    schema: UnifiedAppSchema,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      // Validate schema
      if (!schema || !schema.id) {
        return {
          success: false,
          version: this.createEmptyVersion(appId, options.environment),
          error: 'Invalid schema',
        };
      }

      // Get existing versions to determine next version
      const existingVersions = await this.storage.getVersions(appId, options.environment);
      
      // Determine version
      let version: string;
      if (options.version && isValidVersion(options.version)) {
        version = options.version;
      } else {
        version = getNextVersion(existingVersions, options.environment);
      }

      // Create bundle (freeze current state)
      const bundle = this.createBundle(schema, options);

      // Create version record
      const appVersion: AppVersion = {
        id: randomUUID(),
        appId,
        version,
        environment: options.environment,
        bundle,
        description: options.description,
        createdBy: options.createdBy,
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        isCurrent: false,
        isActive: false,
      };

      // Save version
      await this.storage.saveVersion(appVersion);

      // Set as current version for this environment
      await this.storage.setCurrentVersion(appId, options.environment, appVersion.id);

      // Mark previous version as not current
      for (const existingVersion of existingVersions) {
        if (existingVersion.isCurrent) {
          existingVersion.isCurrent = false;
          existingVersion.isActive = false;
          await this.storage.saveVersion(existingVersion);
        }
      }

      // Mark new version as current and active
      appVersion.isCurrent = true;
      appVersion.isActive = true;
      await this.storage.saveVersion(appVersion);

      return {
        success: true,
        version: appVersion,
        message: `Published to ${options.environment} as version ${version}`,
      };
    } catch (error: any) {
      return {
        success: false,
        version: this.createEmptyVersion(appId, options.environment),
        error: error.message || 'Publish failed',
      };
    }
  }

  /**
   * Create a published bundle from schema
   */
  private createBundle(schema: UnifiedAppSchema, options: PublishOptions): PublishedBundle {
    // Deep clone schema to freeze it
    const frozenSchema = JSON.parse(JSON.stringify(schema)) as UnifiedAppSchema;
    
    // Remove any draft-only data if needed
    // This is where you'd filter out development-only configurations

    return {
      schema: frozenSchema,
      runtimeConfig: {
        enableDevTools: options.environment === 'draft',
      },
      buildTimestamp: new Date().toISOString(),
      buildVersion: schema.version?.toString() || '1.0.0',
    };
  }

  /**
   * Create empty version (for error cases)
   */
  private createEmptyVersion(appId: string, environment: Environment): AppVersion {
    return {
      id: randomUUID(),
      appId,
      version: '0.0.0',
      environment,
      bundle: {
        schema: {} as UnifiedAppSchema,
        runtimeConfig: {},
        buildTimestamp: new Date().toISOString(),
        buildVersion: '0.0.0',
      },
      createdAt: new Date().toISOString(),
      isCurrent: false,
      isActive: false,
    };
  }

  /**
   * Get version history
   */
  async getVersionHistory(appId: string, environment?: Environment): Promise<AppVersion[]> {
    return this.storage.getVersions(appId, environment);
  }

  /**
   * Get current version for environment
   */
  async getCurrentVersion(appId: string, environment: Environment): Promise<AppVersion | null> {
    return this.storage.getCurrentVersion(appId, environment);
  }

  /**
   * Get specific version
   */
  async getVersion(versionId: string): Promise<AppVersion | null> {
    return this.storage.getVersion(versionId);
  }
}
