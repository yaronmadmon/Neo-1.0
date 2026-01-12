/**
 * Integrations Engine
 * Main entry point for the integrations system
 */

export * from './types.js';
export { IntegrationRegistry, integrationRegistry } from './registry.js';
export { IntegrationConfigService, integrationConfigService } from './config-service.js';

// Register all providers
import { registerStripeProvider } from './providers/stripe.js';
import { registerTwilioProvider } from './providers/twilio.js';
import { registerEmailProvider } from './providers/email.js';
import { registerWebhookProvider } from './providers/webhook.js';
import { registerRestProvider } from './providers/rest.js';
import { registerGoogleSheetsProvider } from './providers/google-sheets.js';
import { registerGoogleCalendarProvider } from './providers/google-calendar.js';
import { registerNotionProvider } from './providers/notion.js';
import { registerAirtableProvider } from './providers/airtable.js';
import { registerZapierProvider } from './providers/zapier.js';

/**
 * Initialize all integration providers
 */
export function initializeIntegrations(): void {
  registerStripeProvider();
  registerTwilioProvider();
  registerEmailProvider();
  registerWebhookProvider();
  registerRestProvider();
  registerGoogleSheetsProvider();
  registerGoogleCalendarProvider();
  registerNotionProvider();
  registerAirtableProvider();
  registerZapierProvider();
}

// Auto-initialize on import
initializeIntegrations();
