/**
 * Zapier Integration Provider
 */

import type { IntegrationActionHandler, IntegrationActionContext, IntegrationActionResult, IntegrationConfig } from '../types.js';
import { integrationRegistry } from '../registry.js';
import type { IntegrationProvider } from '../types.js';

async function triggerWebhook(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { data } = ctx.payload;
  const webhookUrl = config.settings.webhookUrl;

  if (!webhookUrl) {
    return {
      success: false,
      error: 'Zapier webhook URL not configured',
    };
  }

  // Mock implementation - replace with actual HTTP request
  // const response = await fetch(webhookUrl, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data || {}),
  // });

  return {
    success: true,
    data: {
      webhookUrl,
      data,
      timestamp: new Date().toISOString(),
    },
  };
}

export function registerZapierProvider(): void {
  const provider: IntegrationProvider = {
    id: 'zapier',
    displayName: 'Zapier',
    description: 'Trigger Zapier webhooks',
    requiredSettings: ['webhookUrl'],
    actions: [
      {
        id: 'trigger',
        displayName: 'Trigger Webhook',
        description: 'Trigger a Zapier webhook',
        handler: triggerWebhook,
        optionalParams: ['data'],
      },
    ],
  };

  integrationRegistry.registerProvider(provider);
}
