/**
 * Voice Integrations Parser
 * Parses voice commands related to integrations
 */

import type { IntegrationConfig, IntegrationProviderId } from '@neo/integrations';
import { integrationConfigService } from '@neo/integrations';
import type { UnifiedWorkflow, UnifiedWorkflowAction } from './dna/schema.js';

export interface VoiceIntegrationParseResult {
  config?: IntegrationConfig;
  workflow?: UnifiedWorkflow;
  confidence: number;
  errors?: string[];
}

export class VoiceIntegrationsParser {
  /**
   * Parse a voice command into integration configuration or workflow
   * 
   * Examples:
   * - "Connect Stripe"
   * - "Use Twilio for SMS"
   * - "Send an email when a job is completed"
   * - "When a new record is created, push it to Google Sheets"
   * - "On booking, add an event in Google Calendar"
   */
  parse(input: string, appId: string): VoiceIntegrationParseResult {
    const normalized = input.toLowerCase().trim();
    
    // Pattern: "Connect [Provider]"
    const connectPattern = /connect\s+(stripe|twilio|email|webhook|rest|google\s+sheets|google\s+calendar|notion|airtable|zapier)/i;
    const connectMatch = normalized.match(connectPattern);
    if (connectMatch) {
      return this.parseConnectCommand(connectMatch[1], appId);
    }

    // Pattern: "Use [Provider] for [Purpose]"
    const usePattern = /use\s+(stripe|twilio|email|webhook|rest|google\s+sheets|google\s+calendar|notion|airtable|zapier)\s+for\s+(.+)/i;
    const useMatch = normalized.match(usePattern);
    if (useMatch) {
      return this.parseUseCommand(useMatch[1], useMatch[2], appId);
    }

    // Pattern: "Send [Action] when [Trigger]"
    const sendWhenPattern = /send\s+(?:an?\s+)?(email|sms|webhook)\s+when\s+(.+)/i;
    const sendWhenMatch = normalized.match(sendWhenPattern);
    if (sendWhenMatch) {
      return this.parseSendWhenCommand(sendWhenMatch[1], sendWhenMatch[2], appId);
    }

    // Pattern: "When [Trigger], [Action]"
    const whenPattern = /when\s+(.+?)\s*(?:,|then|do)\s+(.+)/i;
    const whenMatch = normalized.match(whenPattern);
    if (whenMatch) {
      return this.parseWhenCommand(whenMatch[1], whenMatch[2], appId);
    }

    // Pattern: "Push [Data] to [Provider]"
    const pushPattern = /push\s+(?:this\s+)?(?:data\s+)?to\s+(google\s+sheets|airtable|notion)/i;
    const pushMatch = normalized.match(pushPattern);
    if (pushMatch) {
      return this.parsePushCommand(pushMatch[1], appId);
    }

    // Pattern: "Add [Event] in [Calendar]"
    const calendarPattern = /add\s+(?:an?\s+)?event\s+in\s+(?:google\s+)?calendar/i;
    const calendarMatch = normalized.match(calendarPattern);
    if (calendarMatch) {
      return this.parseCalendarCommand(input, appId);
    }

    return {
      confidence: 0,
      errors: ['Could not parse integration command'],
    };
  }

  /**
   * Parse "Connect [Provider]" command
   */
  private parseConnectCommand(providerName: string, appId: string): VoiceIntegrationParseResult {
    const providerId = this.normalizeProviderId(providerName);
    if (!providerId) {
      return {
        confidence: 0,
        errors: [`Unknown provider: ${providerName}`],
      };
    }

    const config: IntegrationConfig = {
      providerId,
      appId,
      displayName: this.getProviderDisplayName(providerId),
      settings: {},
      enabled: true,
    };

    return {
      config,
      confidence: 0.9,
    };
  }

  /**
   * Parse "Use [Provider] for [Purpose]" command
   */
  private parseUseCommand(providerName: string, purpose: string, appId: string): VoiceIntegrationParseResult {
    const providerId = this.normalizeProviderId(providerName);
    if (!providerId) {
      return {
        confidence: 0,
        errors: [`Unknown provider: ${providerName}`],
      };
    }

    const config: IntegrationConfig = {
      providerId,
      appId,
      displayName: `${this.getProviderDisplayName(providerId)} - ${purpose}`,
      settings: {},
      enabled: true,
    };

    return {
      config,
      confidence: 0.85,
    };
  }

  /**
   * Parse "Send [Action] when [Trigger]" command
   */
  private parseSendWhenCommand(actionType: string, trigger: string, appId: string): VoiceIntegrationParseResult {
    let providerId: IntegrationProviderId | null = null;
    let actionId = '';

    if (actionType === 'email') {
      providerId = 'email';
      actionId = 'send_email';
    } else if (actionType === 'sms') {
      providerId = 'twilio';
      actionId = 'send_sms';
    } else if (actionType === 'webhook') {
      providerId = 'webhook';
      actionId = 'trigger';
    }

    if (!providerId) {
      return {
        confidence: 0,
        errors: [`Unknown action type: ${actionType}`],
      };
    }

    // Parse trigger
    const triggerType = this.parseTrigger(trigger);
    
    const workflow: UnifiedWorkflow = {
      id: `workflow_${Date.now()}`,
      name: `Send ${actionType} on ${trigger}`,
      description: `Automatically send ${actionType} when ${trigger}`,
      enabled: true,
      trigger: triggerType,
      actions: [
        {
          id: `action_${Date.now()}`,
          type: actionId === 'send_email' ? 'send_email' : 
                actionId === 'send_sms' ? 'send_sms' : 
                'trigger_webhook',
          config: {},
        } as UnifiedWorkflowAction,
      ],
    };

    return {
      workflow,
      confidence: 0.8,
    };
  }

  /**
   * Parse "When [Trigger], [Action]" command
   */
  private parseWhenCommand(trigger: string, action: string, appId: string): VoiceIntegrationParseResult {
    const triggerType = this.parseTrigger(trigger);
    const actionType = this.parseAction(action);

    if (!actionType) {
      return {
        confidence: 0,
        errors: ['Could not parse action'],
      };
    }

    const workflow: UnifiedWorkflow = {
      id: `workflow_${Date.now()}`,
      name: `When ${trigger}, ${action}`,
      description: `Automated workflow: ${action} when ${trigger}`,
      enabled: true,
      trigger: triggerType,
      actions: [
        {
          id: `action_${Date.now()}`,
          type: actionType.type,
          config: actionType.config,
        } as UnifiedWorkflowAction,
      ],
    };

    return {
      workflow,
      confidence: 0.75,
    };
  }

  /**
   * Parse "Push to [Provider]" command
   */
  private parsePushCommand(providerName: string, appId: string): VoiceIntegrationParseResult {
    const providerId = this.normalizeProviderId(providerName);
    if (!providerId) {
      return {
        confidence: 0,
        errors: [`Unknown provider: ${providerName}`],
      };
    }

    let actionType = '';
    if (providerId === 'google_sheets') {
      actionType = 'append_to_sheet';
    } else if (providerId === 'airtable') {
      actionType = 'create_record';
    } else if (providerId === 'notion') {
      actionType = 'create_page';
    }

    const workflow: UnifiedWorkflow = {
      id: `workflow_${Date.now()}`,
      name: `Push to ${this.getProviderDisplayName(providerId)}`,
      description: `Push data to ${this.getProviderDisplayName(providerId)}`,
      enabled: true,
      trigger: {
        type: 'record_create',
      },
      actions: [
        {
          id: `action_${Date.now()}`,
          type: actionType || 'call_api',
          config: { providerId },
        } as UnifiedWorkflowAction,
      ],
    };

    return {
      workflow,
      confidence: 0.8,
    };
  }

  /**
   * Parse calendar event command
   */
  private parseCalendarCommand(input: string, appId: string): VoiceIntegrationParseResult {
    const workflow: UnifiedWorkflow = {
      id: `workflow_${Date.now()}`,
      name: 'Add Calendar Event',
      description: 'Add event to Google Calendar',
      enabled: true,
      trigger: {
        type: 'record_create',
      },
      actions: [
        {
          id: `action_${Date.now()}`,
          type: 'schedule_event',
          config: {},
        } as UnifiedWorkflowAction,
      ],
    };

    return {
      workflow,
      confidence: 0.7,
    };
  }

  /**
   * Parse trigger from text
   */
  private parseTrigger(text: string): UnifiedWorkflow['trigger'] {
    const normalized = text.toLowerCase();

    if (normalized.includes('record create') || normalized.includes('new record')) {
      return { type: 'record_create' };
    }
    if (normalized.includes('record update') || normalized.includes('record updated')) {
      return { type: 'record_update' };
    }
    if (normalized.includes('record delete') || normalized.includes('record deleted')) {
      return { type: 'record_delete' };
    }
    if (normalized.includes('job') && normalized.includes('complete')) {
      return { type: 'record_update', condition: 'status === "completed"' };
    }
    if (normalized.includes('booking') || normalized.includes('book')) {
      return { type: 'record_create', condition: 'type === "booking"' };
    }
    if (normalized.includes('invoice') && normalized.includes('create')) {
      return { type: 'record_create', condition: 'type === "invoice"' };
    }

    // Default to record_create
    return { type: 'record_create' };
  }

  /**
   * Parse action from text
   */
  private parseAction(text: string): { type: string; config: Record<string, any> } | null {
    const normalized = text.toLowerCase();

    if (normalized.includes('send email') || normalized.includes('email')) {
      return { type: 'send_email', config: {} };
    }
    if (normalized.includes('send sms') || normalized.includes('sms')) {
      return { type: 'send_sms', config: {} };
    }
    if (normalized.includes('webhook')) {
      return { type: 'trigger_webhook', config: {} };
    }
    if (normalized.includes('charge') || normalized.includes('payment')) {
      return { type: 'charge_customer', config: {} };
    }
    if (normalized.includes('invoice')) {
      return { type: 'create_invoice', config: {} };
    }
    if (normalized.includes('calendar') || normalized.includes('event')) {
      return { type: 'schedule_event', config: {} };
    }
    if (normalized.includes('sheet') || normalized.includes('spreadsheet')) {
      return { type: 'append_to_sheet', config: {} };
    }

    return null;
  }

  /**
   * Normalize provider name to provider ID
   */
  private normalizeProviderId(name: string): IntegrationProviderId | null {
    const normalized = name.toLowerCase().replace(/\s+/g, '_');
    const providers: IntegrationProviderId[] = [
      'stripe', 'twilio', 'email', 'webhook', 'rest_api',
      'google_sheets', 'google_calendar', 'notion', 'airtable', 'zapier',
    ];
    return providers.find(p => p === normalized || p.replace(/_/g, ' ') === normalized) || null;
  }

  /**
   * Get display name for provider
   */
  private getProviderDisplayName(providerId: IntegrationProviderId): string {
    const names: Record<IntegrationProviderId, string> = {
      stripe: 'Stripe',
      twilio: 'Twilio',
      email: 'Email',
      webhook: 'Webhook',
      rest_api: 'REST API',
      google_sheets: 'Google Sheets',
      google_calendar: 'Google Calendar',
      notion: 'Notion',
      airtable: 'Airtable',
      zapier: 'Zapier',
    };
    return names[providerId] || providerId;
  }
}

export const voiceIntegrationsParser = new VoiceIntegrationsParser();
