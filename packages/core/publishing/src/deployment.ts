/**
 * Deployment Service
 * 
 * Handles deployment and serving of published apps.
 */

import type { AppVersion, RollbackResult, Environment } from './types.js';
import { compareVersions } from './versioning.js';

export interface DeploymentStorage {
  saveVersion(version: AppVersion): Promise<void>;
  getVersion(versionId: string): Promise<AppVersion | null>;
  getVersions(appId: string, environment?: Environment): Promise<AppVersion[]>;
  setCurrentVersion(appId: string, environment: Environment, versionId: string): Promise<void>;
  getCurrentVersion(appId: string, environment: Environment): Promise<AppVersion | null>;
}

/**
 * Deployment Service
 * Handles deployment operations like rollback
 */
export class DeploymentService {
  private storage: DeploymentStorage;

  constructor(storage: DeploymentStorage) {
    this.storage = storage;
  }

  /**
   * Rollback to a previous version
   */
  async rollback(
    appId: string,
    environment: Environment,
    versionId: string
  ): Promise<RollbackResult> {
    try {
      // Get target version
      const targetVersion = await this.storage.getVersion(versionId);
      if (!targetVersion) {
        return {
          success: false,
          version: this.createEmptyVersion(appId, environment),
          error: 'Version not found',
        };
      }

      if (targetVersion.appId !== appId) {
        return {
          success: false,
          version: targetVersion,
          error: 'Version does not belong to this app',
        };
      }

      if (targetVersion.environment !== environment) {
        return {
          success: false,
          version: targetVersion,
          error: 'Version does not match environment',
        };
      }

      // Get current version
      const currentVersion = await this.storage.getCurrentVersion(appId, environment);

      // Get all versions for this environment
      const versions = await this.storage.getVersions(appId, environment);
      
      // Mark all versions as not current
      for (const version of versions) {
        if (version.isCurrent) {
          version.isCurrent = false;
          version.isActive = false;
          await this.storage.saveVersion(version);
        }
      }

      // Mark target version as current and active
      targetVersion.isCurrent = true;
      targetVersion.isActive = true;
      await this.storage.saveVersion(targetVersion);

      return {
        success: true,
        version: targetVersion,
        previousVersion: currentVersion || undefined,
        message: `Rolled back to version ${targetVersion.version}`,
      };
    } catch (error: any) {
      return {
        success: false,
        version: this.createEmptyVersion(appId, environment),
        error: error.message || 'Rollback failed',
      };
    }
  }

  /**
   * Rollback to previous version (automatically finds previous)
   */
  async rollbackToPrevious(
    appId: string,
    environment: Environment
  ): Promise<RollbackResult> {
    try {
      // Get current version
      const currentVersion = await this.storage.getCurrentVersion(appId, environment);
      if (!currentVersion) {
        return {
          success: false,
          version: this.createEmptyVersion(appId, environment),
          error: 'No current version found',
        };
      }

      // Get all versions sorted by version number
      const versions = await this.storage.getVersions(appId, environment);
      const sortedVersions = versions.sort((a, b) => compareVersions(b.version, a.version));

      // Find previous version (next in sorted list after current)
      const currentIndex = sortedVersions.findIndex(v => v.id === currentVersion.id);
      if (currentIndex < 0 || currentIndex >= sortedVersions.length - 1) {
        return {
          success: false,
          version: currentVersion,
          error: 'No previous version found',
        };
      }

      const previousVersion = sortedVersions[currentIndex + 1];
      return this.rollback(appId, environment, previousVersion.id);
    } catch (error: any) {
      return {
        success: false,
        version: this.createEmptyVersion(appId, environment),
        error: error.message || 'Rollback failed',
      };
    }
  }

  /**
   * Create empty version (for error cases)
   */
  private createEmptyVersion(appId: string, environment: Environment): AppVersion {
    return {
      id: 'error',
      appId,
      version: '0.0.0',
      environment,
      bundle: {
        schema: {} as any,
        runtimeConfig: {},
        buildTimestamp: new Date().toISOString(),
        buildVersion: '0.0.0',
      },
      createdAt: new Date().toISOString(),
      isCurrent: false,
      isActive: false,
    };
  }
}
