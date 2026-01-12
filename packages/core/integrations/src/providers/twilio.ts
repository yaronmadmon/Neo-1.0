/**
 * Twilio Integration Provider
 */

import type { IntegrationActionHandler, IntegrationActionContext, IntegrationActionResult, IntegrationConfig } from '../types.js';
import { integrationRegistry } from '../registry.js';
import type { IntegrationProvider } from '../types.js';

async function sendSMS(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { to, message } = ctx.payload;
  
  if (!to || !message) {
    return {
      success: false,
      error: 'Missing required parameters: to, message',
    };
  }

  // Mock implementation - replace with actual Twilio API call
  // const client = require('twilio')(config.settings.accountSid, config.settings.authToken);
  // const result = await client.messages.create({
  //   body: message,
  //   from: config.settings.fromNumber,
  //   to: to,
  // });

  return {
    success: true,
    data: {
      sid: `SM${Date.now()}`,
      to,
      from: config.settings.fromNumber,
      message,
      status: 'sent',
    },
  };
}

async function makeCall(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { to, message } = ctx.payload;
  
  if (!to || !message) {
    return {
      success: false,
      error: 'Missing required parameters: to, message',
    };
  }

  // Mock implementation
  return {
    success: true,
    data: {
      sid: `CA${Date.now()}`,
      to,
      from: config.settings.fromNumber,
      status: 'initiated',
    },
  };
}

export function registerTwilioProvider(): void {
  const provider: IntegrationProvider = {
    id: 'twilio',
    displayName: 'Twilio',
    description: 'SMS and voice communications',
    requiredSettings: ['accountSid', 'authToken', 'fromNumber'],
    actions: [
      {
        id: 'send_sms',
        displayName: 'Send SMS',
        description: 'Send an SMS message',
        handler: sendSMS,
        requiredParams: ['to', 'message'],
      },
      {
        id: 'make_call',
        displayName: 'Make Call',
        description: 'Make a voice call',
        handler: makeCall,
        requiredParams: ['to', 'message'],
      },
    ],
  };

  integrationRegistry.registerProvider(provider);
}
