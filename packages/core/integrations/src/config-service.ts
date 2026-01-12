/**
 * Integration Config Service
 * Manages integration configurations per app
 */

import type { IntegrationConfig, IntegrationProviderId } from './types.js';

// In-memory store (replace with database in production)
const integrationConfigs = new Map<string, IntegrationConfig[]>(); // appId -> configs[]

export class IntegrationConfigService {
  /**
   * Get all integrations for an app
   */
  getIntegrations(appId: string): IntegrationConfig[] {
    return integrationConfigs.get(appId) || [];
  }

  /**
   * Get a specific integration config
   */
  getIntegration(appId: string, providerId: IntegrationProviderId): IntegrationConfig | null {
    const configs = this.getIntegrations(appId);
    return configs.find(c => c.providerId === providerId && c.enabled) || null;
  }

  /**
   * Create or update an integration config
   */
  setIntegration(config: IntegrationConfig): void {
    const configs = this.getIntegrations(config.appId);
    const existingIndex = configs.findIndex(c => c.providerId === config.providerId);
    
    const now = new Date().toISOString();
    const updatedConfig: IntegrationConfig = {
      ...config,
      updatedAt: now,
      createdAt: existingIndex >= 0 ? configs[existingIndex].createdAt : now,
    };

    if (existingIndex >= 0) {
      configs[existingIndex] = updatedConfig;
    } else {
      configs.push(updatedConfig);
    }

    integrationConfigs.set(config.appId, configs);
  }

  /**
   * Delete/disable an integration
   */
  deleteIntegration(appId: string, providerId: IntegrationProviderId): boolean {
    const configs = this.getIntegrations(appId);
    const index = configs.findIndex(c => c.providerId === providerId);
    
    if (index >= 0) {
      configs.splice(index, 1);
      integrationConfigs.set(appId, configs);
      return true;
    }
    
    return false;
  }

  /**
   * Disable an integration (keep config but mark as disabled)
   */
  disableIntegration(appId: string, providerId: IntegrationProviderId): boolean {
    const configs = this.getIntegrations(appId);
    const config = configs.find(c => c.providerId === providerId);
    
    if (config) {
      config.enabled = false;
      config.updatedAt = new Date().toISOString();
      return true;
    }
    
    return false;
  }

  /**
   * Enable an integration
   */
  enableIntegration(appId: string, providerId: IntegrationProviderId): boolean {
    const configs = this.getIntegrations(appId);
    const config = configs.find(c => c.providerId === providerId);
    
    if (config) {
      config.enabled = true;
      config.updatedAt = new Date().toISOString();
      return true;
    }
    
    return false;
  }

  /**
   * Validate required settings for a provider
   */
  validateSettings(providerId: IntegrationProviderId, settings: Record<string, any>): {
    valid: boolean;
    missing: string[];
  } {
    // This will be enhanced by each provider
    const requiredSettings: Record<IntegrationProviderId, string[]> = {
      stripe: ['apiKey'],
      twilio: ['accountSid', 'authToken', 'fromNumber'],
      email: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail'],
      webhook: ['url'],
      rest_api: ['baseUrl'],
      google_sheets: ['apiKey', 'spreadsheetId'],
      google_calendar: ['apiKey', 'calendarId'],
      notion: ['apiKey', 'databaseId'],
      airtable: ['apiKey', 'baseId'],
      zapier: ['webhookUrl'],
    };

    const required = requiredSettings[providerId] || [];
    const missing = required.filter(key => !settings[key]);

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

export const integrationConfigService = new IntegrationConfigService();
