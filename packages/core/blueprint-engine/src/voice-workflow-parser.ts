/**
 * Voice-to-Workflow Parser
 * 
 * Converts natural language voice commands into structured workflows.
 * Supports patterns like "when user books a job, send confirmation"
 */

import type { UnifiedWorkflow, UnifiedWorkflowAction } from './dna/schema.js';
import type { ParsedInput } from './intelligence/types.js';

// ============================================================
// TRIGGER TYPE MAPPING
// ============================================================

export const TRIGGER_TYPE_MAP: Record<string, string> = {
  // New format to legacy format
  'onClick': 'button_click',
  'onSubmit': 'form_submit',
  'onChange': 'field_change',
  'onPageLoad': 'page_load',
  'scheduled': 'schedule',
  
  // Legacy format (also supported)
  'button_click': 'button_click',
  'form_submit': 'form_submit',
  'field_change': 'field_change',
  'page_load': 'page_load',
  'schedule': 'schedule',
  
  // Natural language mappings
  'click': 'button_click',
  'submit': 'form_submit',
  'change': 'field_change',
  'load': 'page_load',
};

/**
 * Normalize trigger type to standard format
 */
export function normalizeTriggerType(type: string): string {
  return TRIGGER_TYPE_MAP[type] || type;
}

// ============================================================
// VOICE WORKFLOW PARSER
// ============================================================

export interface VoiceWorkflowParseResult {
  workflow: UnifiedWorkflow | null;
  confidence: number;
  errors?: string[];
}

export class VoiceWorkflowParser {
  /**
   * Parse a voice command into a workflow
   * 
   * Examples:
   * - "when user books a job, send confirmation email"
   * - "when form is submitted, create a record and send email"
   * - "on page load, show welcome message"
   */
  parse(input: string | ParsedInput): VoiceWorkflowParseResult {
    const text = typeof input === 'string' ? input : input.normalized;
    const normalized = text.toLowerCase().trim();
    
    // Pattern: "when X, then Y"
    const whenPattern = /when\s+(.+?)\s*(?:,|then|do)\s+(.+)/i;
    const whenMatch = normalized.match(whenPattern);
    
    if (whenMatch) {
      return this.parseWhenThenWorkflow(whenMatch[1], whenMatch[2], text);
    }
    
    // Pattern: "on X, do Y"
    const onPattern = /on\s+(.+?)\s*(?:,|do|then)\s+(.+)/i;
    const onMatch = normalized.match(onPattern);
    
    if (onMatch) {
      return this.parseOnWorkflow(onMatch[1], onMatch[2], text);
    }
    
    // Pattern: "if X, then Y"
    const ifPattern = /if\s+(.+?)\s*(?:,|then|do)\s+(.+)/i;
    const ifMatch = normalized.match(ifPattern);
    
    if (ifMatch) {
      return this.parseIfThenWorkflow(ifMatch[1], ifMatch[2], text);
    }
    
    return {
      workflow: null,
      confidence: 0,
      errors: ['Could not parse workflow from input'],
    };
  }

  /**
   * Parse "when X, then Y" pattern
   */
  private parseWhenThenWorkflow(
    condition: string,
    action: string,
    originalText: string
  ): VoiceWorkflowParseResult {
    const trigger = this.parseTrigger(condition);
    const actions = this.parseActions(action);
    
    if (!trigger || actions.length === 0) {
      return {
        workflow: null,
        confidence: 0.3,
        errors: ['Could not parse trigger or actions'],
      };
    }
    
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: UnifiedWorkflow = {
      id: workflowId,
      name: this.generateWorkflowName(condition, action),
      description: `When ${condition}, ${action}`,
      enabled: true,
      trigger: {
        type: normalizeTriggerType(trigger.type) as any,
        ...(trigger.componentId && { componentId: trigger.componentId }),
        ...(trigger.entityId && { entityId: trigger.entityId }),
        ...(trigger.fieldId && { fieldId: trigger.fieldId }),
        ...(trigger.schedule && { schedule: trigger.schedule }),
      },
      actions,
    };
    
    return {
      workflow,
      confidence: 0.8,
    };
  }

  /**
   * Parse "on X, do Y" pattern
   */
  private parseOnWorkflow(
    triggerText: string,
    action: string,
    originalText: string
  ): VoiceWorkflowParseResult {
    const trigger = this.parseTrigger(triggerText);
    const actions = this.parseActions(action);
    
    if (!trigger || actions.length === 0) {
      return {
        workflow: null,
        confidence: 0.3,
        errors: ['Could not parse trigger or actions'],
      };
    }
    
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: UnifiedWorkflow = {
      id: workflowId,
      name: this.generateWorkflowName(triggerText, action),
      description: `On ${triggerText}, ${action}`,
      enabled: true,
      trigger: {
        type: normalizeTriggerType(trigger.type) as any,
        ...(trigger.componentId && { componentId: trigger.componentId }),
        ...(trigger.entityId && { entityId: trigger.entityId }),
        ...(trigger.fieldId && { fieldId: trigger.fieldId }),
        ...(trigger.schedule && { schedule: trigger.schedule }),
      },
      actions,
    };
    
    return {
      workflow,
      confidence: 0.75,
    };
  }

  /**
   * Parse "if X, then Y" pattern (conditional workflow)
   */
  private parseIfThenWorkflow(
    condition: string,
    action: string,
    originalText: string
  ): VoiceWorkflowParseResult {
    // For "if" patterns, we create a conditional action
    const trigger = this.parseTrigger(condition);
    const actions = this.parseActions(action);
    
    if (!trigger || actions.length === 0) {
      return {
        workflow: null,
        confidence: 0.3,
        errors: ['Could not parse trigger or actions'],
      };
    }
    
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a conditional action
    const conditionalAction: UnifiedWorkflowAction = {
      id: 'conditional-1',
      type: 'conditional',
      config: {},
      condition,
      thenActions: actions,
    };
    
    const workflow: UnifiedWorkflow = {
      id: workflowId,
      name: this.generateWorkflowName(condition, action),
      description: `If ${condition}, then ${action}`,
      enabled: true,
      trigger: {
        type: normalizeTriggerType(trigger.type) as any,
        ...(trigger.componentId && { componentId: trigger.componentId }),
        ...(trigger.entityId && { entityId: trigger.entityId }),
        ...(trigger.fieldId && { fieldId: trigger.fieldId }),
      },
      actions: [conditionalAction],
    };
    
    return {
      workflow,
      confidence: 0.7,
    };
  }

  /**
   * Parse trigger from text
   */
  private parseTrigger(text: string): {
    type: string;
    componentId?: string;
    entityId?: string;
    fieldId?: string;
    schedule?: string;
  } | null {
    const lower = text.toLowerCase().trim();
    
    // Button click
    if (/click|button|press/i.test(text)) {
      const componentMatch = text.match(/(\w+)\s+button/i);
      return {
        type: 'button_click',
        componentId: componentMatch ? `${componentMatch[1]}-btn` : undefined,
      };
    }
    
    // Form submit
    if (/submit|form|save|create|book/i.test(text)) {
      const entityMatch = text.match(/(\w+)\s+(?:form|submit)/i);
      return {
        type: 'form_submit',
        componentId: entityMatch ? `${entityMatch[1]}-form` : 'form',
        entityId: entityMatch ? entityMatch[1] : undefined,
      };
    }
    
    // Field change
    if (/change|update|field|input/i.test(text)) {
      const fieldMatch = text.match(/(\w+)\s+(?:field|input)/i);
      return {
        type: 'field_change',
        fieldId: fieldMatch ? fieldMatch[1] : undefined,
      };
    }
    
    // Page load
    if (/load|open|page|start/i.test(text)) {
      return {
        type: 'page_load',
      };
    }
    
    // Scheduled
    if (/schedule|daily|weekly|monthly|every/i.test(text)) {
      // Extract schedule expression (simplified)
      const scheduleMatch = text.match(/(daily|weekly|monthly|every\s+\d+\s+(?:minute|hour|day|week|month)s?)/i);
      return {
        type: 'schedule',
        schedule: scheduleMatch ? this.parseSchedule(scheduleMatch[1]) : '0 0 * * *', // Default: daily at midnight
      };
    }
    
    // Record create/update/delete
    if (/create|add|new/i.test(text)) {
      const entityMatch = text.match(/(?:create|add|new)\s+(\w+)/i);
      return {
        type: 'record_create',
        entityId: entityMatch ? entityMatch[1] : undefined,
      };
    }
    
    if (/update|modify|change/i.test(text)) {
      const entityMatch = text.match(/(?:update|modify|change)\s+(\w+)/i);
      return {
        type: 'record_update',
        entityId: entityMatch ? entityMatch[1] : undefined,
      };
    }
    
    if (/delete|remove/i.test(text)) {
      const entityMatch = text.match(/(?:delete|remove)\s+(\w+)/i);
      return {
        type: 'record_delete',
        entityId: entityMatch ? entityMatch[1] : undefined,
      };
    }
    
    // Default: form submit
    return {
      type: 'form_submit',
    };
  }

  /**
   * Parse actions from text
   */
  private parseActions(text: string): UnifiedWorkflowAction[] {
    const actions: UnifiedWorkflowAction[] = [];
    const lower = text.toLowerCase();
    
    // Split by "and" or comma
    const actionParts = text.split(/\s+and\s+|,\s+/).map(s => s.trim());
    
    for (let i = 0; i < actionParts.length; i++) {
      const part = actionParts[i];
      const action = this.parseSingleAction(part, i + 1);
      if (action) {
        actions.push(action);
      }
    }
    
    return actions;
  }

  /**
   * Parse a single action from text
   */
  private parseSingleAction(text: string, index: number): UnifiedWorkflowAction | null {
    const lower = text.toLowerCase();
    
    // Send email
    if (/send\s+email|email|send\s+confirmation|confirmation/i.test(text)) {
      const toMatch = text.match(/(?:to|send\s+to)\s+([\w@.]+)/i);
      return {
        id: `action-${index}`,
        type: 'send_email',
        config: {
          to: toMatch ? toMatch[1] : '{email}',
          subject: this.extractEmailSubject(text),
          body: this.extractEmailBody(text),
        },
      };
    }
    
    // Create record
    if (/create\s+record|create|add|new/i.test(text)) {
      const entityMatch = text.match(/(?:create|add|new)\s+(\w+)/i);
      return {
        id: `action-${index}`,
        type: 'create_record',
        config: {
          entityId: entityMatch ? entityMatch[1] : 'record',
          source: 'form_data',
        },
      };
    }
    
    // Update record
    if (/update\s+record|update|modify/i.test(text)) {
      const entityMatch = text.match(/(?:update|modify)\s+(\w+)/i);
      return {
        id: `action-${index}`,
        type: 'update_record',
        config: {
          entityId: entityMatch ? entityMatch[1] : 'record',
          source: 'form_data',
        },
      };
    }
    
    // Delete record
    if (/delete\s+record|delete|remove/i.test(text)) {
      const entityMatch = text.match(/(?:delete|remove)\s+(\w+)/i);
      return {
        id: `action-${index}`,
        type: 'delete_record',
        config: {
          entityId: entityMatch ? entityMatch[1] : 'record',
        },
      };
    }
    
    // Navigate
    if (/navigate|go\s+to|show|view/i.test(text)) {
      const pageMatch = text.match(/(?:to|show|view)\s+(\w+)/i);
      return {
        id: `action-${index}`,
        type: 'navigate',
        config: {
          pageId: pageMatch ? `${pageMatch[1]}-page` : 'home',
        },
      };
    }
    
    // Show notification
    if (/show\s+notification|notify|alert/i.test(text)) {
      const messageMatch = text.match(/(?:notification|message|alert)\s+(.+)/i);
      return {
        id: `action-${index}`,
        type: 'show_notification',
        config: {
          message: messageMatch ? messageMatch[1] : 'Notification',
          type: 'success',
        },
      };
    }
    
    // Create invoice
    if (/create\s+invoice|generate\s+invoice|invoice/i.test(text)) {
      return {
        id: `action-${index}`,
        type: 'create_invoice',
        config: {
          entityId: 'invoice',
        },
      };
    }
    
    // Schedule event
    if (/schedule\s+event|book\s+event|create\s+event/i.test(text)) {
      return {
        id: `action-${index}`,
        type: 'schedule_event',
        config: {
          entityId: 'event',
          title: '{title}',
          startTime: '{startTime}',
        },
      };
    }
    
    // Trigger webhook
    if (/trigger\s+webhook|webhook|call\s+webhook/i.test(text)) {
      const urlMatch = text.match(/(?:url|to)\s+(https?:\/\/[^\s]+)/i);
      return {
        id: `action-${index}`,
        type: 'trigger_webhook',
        config: {
          url: urlMatch ? urlMatch[1] : '{webhook_url}',
        },
      };
    }
    
    return null;
  }

  /**
   * Extract email subject from text
   */
  private extractEmailSubject(text: string): string {
    if (/confirmation/i.test(text)) return 'Confirmation';
    if (/invoice/i.test(text)) return 'Invoice';
    if (/notification/i.test(text)) return 'Notification';
    return 'Email';
  }

  /**
   * Extract email body from text
   */
  private extractEmailBody(text: string): string {
    if (/confirmation/i.test(text)) return 'Your request has been confirmed.';
    return 'Thank you for your request.';
  }

  /**
   * Parse schedule expression
   */
  private parseSchedule(text: string): string {
    const lower = text.toLowerCase();
    
    if (/daily|every day/i.test(lower)) return '0 0 * * *';
    if (/weekly|every week/i.test(lower)) return '0 0 * * 0';
    if (/monthly|every month/i.test(lower)) return '0 0 1 * *';
    
    const hourMatch = text.match(/every\s+(\d+)\s+hours?/i);
    if (hourMatch) {
      const hours = parseInt(hourMatch[1]);
      return `0 */${hours} * * *`;
    }
    
    const minuteMatch = text.match(/every\s+(\d+)\s+minutes?/i);
    if (minuteMatch) {
      const minutes = parseInt(minuteMatch[1]);
      return `*/${minutes} * * * *`;
    }
    
    return '0 0 * * *'; // Default: daily
  }

  /**
   * Generate workflow name
   */
  private generateWorkflowName(condition: string, action: string): string {
    const conditionWords = condition.split(/\s+/).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    
    const actionWords = action.split(/\s+/).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    
    return `${conditionWords} → ${actionWords}`;
  }
}

// Export singleton
export const voiceWorkflowParser = new VoiceWorkflowParser();
