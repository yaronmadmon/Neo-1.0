/**
 * Webhook Integration Provider
 */

import type { IntegrationActionHandler, IntegrationActionContext, IntegrationActionResult, IntegrationConfig } from '../types.js';
import { integrationRegistry } from '../registry.js';
import type { IntegrationProvider } from '../types.js';

async function triggerWebhook(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { method = 'POST', headers = {}, body } = ctx.payload;
  const url = config.settings.url;

  if (!url) {
    return {
      success: false,
      error: 'Webhook URL not configured',
    };
  }

  // Mock implementation - replace with actual HTTP request
  // const response = await fetch(url, {
  //   method,
  //   headers: {
  //     'Content-Type': 'application/json',
  //     ...headers,
  //   },
  //   body: body ? JSON.stringify(body) : undefined,
  // });

  return {
    success: true,
    data: {
      url,
      method,
      statusCode: 200,
      timestamp: new Date().toISOString(),
    },
  };
}

export function registerWebhookProvider(): void {
  const provider: IntegrationProvider = {
    id: 'webhook',
    displayName: 'Webhook',
    description: 'Trigger webhooks',
    requiredSettings: ['url'],
    optionalSettings: ['method', 'headers', 'auth'],
    actions: [
      {
        id: 'trigger',
        displayName: 'Trigger Webhook',
        description: 'Send a webhook request',
        handler: triggerWebhook,
        optionalParams: ['method', 'headers', 'body'],
      },
    ],
  };

  integrationRegistry.registerProvider(provider);
}
