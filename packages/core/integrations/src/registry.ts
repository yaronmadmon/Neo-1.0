/**
 * Integration Registry
 * Central registry for all integration providers
 */

import type {
  IntegrationProvider,
  IntegrationProviderId,
  IntegrationAction,
  IntegrationActionContext,
  IntegrationActionResult,
  IntegrationConfig,
} from './types.js';
import { integrationConfigService } from './config-service.js';

export class IntegrationRegistry {
  private providers: Map<IntegrationProviderId, IntegrationProvider> = new Map();

  /**
   * Register a provider
   */
  registerProvider(provider: IntegrationProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a provider by ID
   */
  getProvider(providerId: IntegrationProviderId): IntegrationProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IntegrationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Execute an integration action
   */
  async executeAction(
    providerId: IntegrationProviderId,
    actionId: string,
    ctx: IntegrationActionContext
  ): Promise<IntegrationActionResult> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return {
        success: false,
        error: `Provider ${providerId} not found`,
      };
    }

    const action = provider.actions.find(a => a.id === actionId);
    if (!action) {
      return {
        success: false,
        error: `Action ${actionId} not found for provider ${providerId}`,
      };
    }

    // Get integration config
    const config = integrationConfigService.getIntegration(ctx.appId, providerId);
    if (!config || !config.enabled) {
      return {
        success: false,
        error: `Integration ${providerId} is not configured or enabled for app ${ctx.appId}`,
      };
    }

    // Validate required settings
    const validation = integrationConfigService.validateSettings(providerId, config.settings);
    if (!validation.valid) {
      return {
        success: false,
        error: `Missing required settings: ${validation.missing.join(', ')}`,
      };
    }

    // Execute the action
    try {
      return await action.handler(actionId, ctx, config);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error executing integration action',
      };
    }
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(providerId: IntegrationProviderId): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get available actions for a provider
   */
  getProviderActions(providerId: IntegrationProviderId): IntegrationAction[] {
    const provider = this.getProvider(providerId);
    return provider?.actions || [];
  }
}

export const integrationRegistry = new IntegrationRegistry();
