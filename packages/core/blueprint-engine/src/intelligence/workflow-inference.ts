/**
 * Workflow Inference Engine
 * 
 * Infers workflows and automations from natural language.
 * Understands what should happen when and automates it.
 */

import type {
  ParsedInput,
  InferredEntity,
  DetectedFeature,
  InferredWorkflow,
  WorkflowTrigger,
  WorkflowStep,
  WorkflowCondition,
} from './types.js';

// ============================================================
// WORKFLOW PATTERNS
// ============================================================

interface WorkflowPattern {
  id: string;
  name: string;
  triggers: string[];
  entityBased: boolean;
  description: string;
  template: {
    trigger: WorkflowTrigger;
    steps: WorkflowStep[];
    conditions?: WorkflowCondition[];
  };
}

const WORKFLOW_PATTERNS: WorkflowPattern[] = [
  // CRUD Workflows
  {
    id: 'create-record',
    name: 'Create Record',
    triggers: ['create', 'add', 'new', 'submit', 'save'],
    entityBased: true,
    description: 'Create a new record from form submission',
    template: {
      trigger: { type: 'form_submit', componentId: '{entity}-form' },
      steps: [
        { id: 'create', type: 'create', config: { entityId: '{entity}', source: 'form_data' } },
        { id: 'notify', type: 'notify', config: { message: '{Entity} created successfully!', type: 'success' } },
        { id: 'navigate', type: 'navigate', config: { pageId: '{entity}-list' } },
      ],
    },
  },
  {
    id: 'update-record',
    name: 'Update Record',
    triggers: ['update', 'edit', 'modify', 'change', 'save'],
    entityBased: true,
    description: 'Update an existing record',
    template: {
      trigger: { type: 'form_submit', componentId: '{entity}-edit-form' },
      steps: [
        { id: 'update', type: 'update', config: { entityId: '{entity}', source: 'form_data' } },
        { id: 'notify', type: 'notify', config: { message: '{Entity} updated!', type: 'success' } },
        { id: 'navigate', type: 'navigate', config: { pageId: '{entity}-detail' } },
      ],
    },
  },
  {
    id: 'delete-record',
    name: 'Delete Record',
    triggers: ['delete', 'remove', 'trash'],
    entityBased: true,
    description: 'Delete a record with confirmation',
    template: {
      trigger: { type: 'button_click', componentId: '{entity}-delete-btn' },
      steps: [
        { id: 'delete', type: 'delete', config: { entityId: '{entity}' } },
        { id: 'notify', type: 'notify', config: { message: '{Entity} deleted', type: 'info' } },
        { id: 'navigate', type: 'navigate', config: { pageId: '{entity}-list' } },
      ],
    },
  },

  // Status Workflows
  {
    id: 'change-status',
    name: 'Change Status',
    triggers: ['complete', 'finish', 'done', 'close', 'approve', 'reject', 'cancel'],
    entityBased: true,
    description: 'Change the status of a record',
    template: {
      trigger: { type: 'button_click', componentId: '{entity}-status-btn' },
      steps: [
        { id: 'update-status', type: 'update', config: { entityId: '{entity}', field: 'status', value: '{newStatus}' } },
        { id: 'notify', type: 'notify', config: { message: 'Status updated to {newStatus}', type: 'success' } },
      ],
    },
  },

  // Notification Workflows
  {
    id: 'send-email',
    name: 'Send Email Notification',
    triggers: ['email', 'send email', 'notify by email', 'email notification'],
    entityBased: true,
    description: 'Send an email when something happens',
    template: {
      trigger: { type: 'record_create', entityId: '{entity}' },
      steps: [
        { id: 'email', type: 'email', config: { to: '{recipient}', subject: 'New {Entity}', body: 'A new {entity} has been created.' } },
      ],
    },
  },
  {
    id: 'send-reminder',
    name: 'Send Reminder',
    triggers: ['remind', 'reminder', 'alert', 'notify before'],
    entityBased: true,
    description: 'Send a reminder before a scheduled event',
    template: {
      trigger: { type: 'schedule', schedule: '0 9 * * *' },
      steps: [
        { id: 'notify', type: 'notify', config: { message: 'Reminder: {entity} is coming up', type: 'info' } },
      ],
    },
  },

  // Assignment Workflows
  {
    id: 'assign-to',
    name: 'Assign To Team Member',
    triggers: ['assign', 'delegate', 'give to', 'hand off'],
    entityBased: true,
    description: 'Assign a record to a team member',
    template: {
      trigger: { type: 'button_click', componentId: '{entity}-assign-btn' },
      steps: [
        { id: 'assign', type: 'update', config: { entityId: '{entity}', field: 'assignedTo', value: '{userId}' } },
        { id: 'notify-assignee', type: 'notify', config: { message: 'You have been assigned a new {entity}', type: 'info', userId: '{userId}' } },
      ],
    },
  },

  // Scheduling Workflows
  {
    id: 'book-appointment',
    name: 'Book Appointment',
    triggers: ['book', 'schedule', 'reserve', 'make appointment'],
    entityBased: false,
    description: 'Book a new appointment',
    template: {
      trigger: { type: 'form_submit', componentId: 'booking-form' },
      steps: [
        { id: 'create-appointment', type: 'create', config: { entityId: 'appointment', source: 'form_data' } },
        { id: 'send-confirmation', type: 'email', config: { to: '{clientEmail}', subject: 'Appointment Confirmed', body: 'Your appointment is confirmed for {date}' } },
        { id: 'notify', type: 'notify', config: { message: 'Appointment booked!', type: 'success' } },
      ],
    },
  },

  // Billing Workflows
  {
    id: 'create-invoice',
    name: 'Create Invoice',
    triggers: ['invoice', 'bill', 'charge'],
    entityBased: false,
    description: 'Create an invoice from a job or project',
    template: {
      trigger: { type: 'button_click', componentId: 'create-invoice-btn' },
      steps: [
        { id: 'create-invoice', type: 'create', config: { entityId: 'invoice', source: 'job_data' } },
        { id: 'navigate', type: 'navigate', config: { pageId: 'invoice-detail' } },
      ],
    },
  },
  {
    id: 'send-invoice',
    name: 'Send Invoice',
    triggers: ['send invoice', 'email invoice'],
    entityBased: false,
    description: 'Email an invoice to the client',
    template: {
      trigger: { type: 'button_click', componentId: 'send-invoice-btn' },
      steps: [
        { id: 'update-status', type: 'update', config: { entityId: 'invoice', field: 'status', value: 'sent' } },
        { id: 'email', type: 'email', config: { to: '{clientEmail}', subject: 'Invoice #{invoiceNumber}', attachment: 'invoice_pdf' } },
        { id: 'notify', type: 'notify', config: { message: 'Invoice sent!', type: 'success' } },
      ],
    },
  },
  {
    id: 'mark-paid',
    name: 'Mark as Paid',
    triggers: ['paid', 'payment received', 'mark paid'],
    entityBased: false,
    description: 'Mark an invoice as paid',
    template: {
      trigger: { type: 'button_click', componentId: 'mark-paid-btn' },
      steps: [
        { id: 'update-status', type: 'update', config: { entityId: 'invoice', field: 'status', value: 'paid' } },
        { id: 'create-payment', type: 'create', config: { entityId: 'payment', data: { invoiceId: '{invoiceId}', amount: '{amount}' } } },
        { id: 'notify', type: 'notify', config: { message: 'Payment recorded!', type: 'success' } },
      ],
    },
  },

  // Quote Workflows
  {
    id: 'convert-quote',
    name: 'Convert Quote to Job',
    triggers: ['accept quote', 'approve quote', 'convert quote'],
    entityBased: false,
    description: 'Convert an approved quote into a job',
    template: {
      trigger: { type: 'button_click', componentId: 'accept-quote-btn' },
      steps: [
        { id: 'update-quote', type: 'update', config: { entityId: 'quote', field: 'status', value: 'accepted' } },
        { id: 'create-job', type: 'create', config: { entityId: 'job', source: 'quote_data' } },
        { id: 'notify', type: 'notify', config: { message: 'Quote converted to job!', type: 'success' } },
        { id: 'navigate', type: 'navigate', config: { pageId: 'job-detail' } },
      ],
    },
  },

  // Automated Triggers
  {
    id: 'on-overdue',
    name: 'Overdue Alert',
    triggers: ['overdue', 'past due', 'late'],
    entityBased: true,
    description: 'Alert when something is overdue',
    template: {
      trigger: { type: 'schedule', schedule: '0 8 * * *' },
      steps: [
        { id: 'notify', type: 'notify', config: { message: 'You have overdue {entities}', type: 'warning' } },
      ],
      conditions: [
        { field: 'dueDate', operator: 'less_than', value: 'now', thenStep: 'notify' },
      ],
    },
  },
];

// ============================================================
// WORKFLOW INFERENCE ENGINE
// ============================================================

export class WorkflowInferenceEngine {
  /**
   * Infer workflows from parsed input
   */
  async infer(
    parsed: ParsedInput,
    entities: InferredEntity[],
    features: DetectedFeature[]
  ): Promise<InferredWorkflow[]> {
    const workflows: InferredWorkflow[] = [];
    
    // Step 1: Detect workflow patterns from input
    const detectedPatterns = this.detectPatterns(parsed);
    for (const { pattern, confidence } of detectedPatterns) {
      const workflow = this.patternToWorkflow(pattern, entities, confidence);
      if (workflow) {
        workflows.push(workflow);
      }
    }
    
    // Step 2: Generate standard CRUD workflows for each entity
    for (const entity of entities) {
      const crudWorkflows = this.generateCRUDWorkflows(entity);
      for (const cw of crudWorkflows) {
        if (!workflows.find(w => w.id === cw.id)) {
          workflows.push(cw);
        }
      }
    }
    
    // Step 3: Add feature-based workflows
    const featureWorkflows = this.getFeatureWorkflows(features, entities);
    for (const fw of featureWorkflows) {
      if (!workflows.find(w => w.id === fw.id)) {
        workflows.push(fw);
      }
    }
    
    // Step 4: Infer from "when...then" patterns
    const conditionalWorkflows = this.inferConditionalWorkflows(parsed, entities);
    workflows.push(...conditionalWorkflows);
    
    return workflows;
  }

  /**
   * Detect workflow patterns in input
   */
  private detectPatterns(parsed: ParsedInput): Array<{ pattern: WorkflowPattern; confidence: number }> {
    const matches: Array<{ pattern: WorkflowPattern; confidence: number }> = [];
    const inputText = parsed.normalized;
    
    for (const pattern of WORKFLOW_PATTERNS) {
      let score = 0;
      
      for (const trigger of pattern.triggers) {
        if (inputText.includes(trigger)) {
          score += 0.3;
        }
      }
      
      // Check actions match
      for (const action of parsed.actions) {
        if (pattern.triggers.some(t => t.includes(action))) {
          score += 0.2;
        }
      }
      
      // Check semantic intents
      if (parsed.intents.includes('automating') && pattern.template.trigger.type === 'schedule') {
        score += 0.15;
      }
      if (parsed.intents.includes('communicating') && pattern.template.steps.some(s => s.type === 'email' || s.type === 'notify')) {
        score += 0.15;
      }
      
      if (score > 0.15) {
        matches.push({ pattern, confidence: Math.min(score, 1) });
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Convert pattern to workflow for specific entities
   */
  private patternToWorkflow(
    pattern: WorkflowPattern,
    entities: InferredEntity[],
    confidence: number
  ): InferredWorkflow | null {
    // If pattern is entity-based, create for primary entity
    const entity = entities[0];
    if (!entity) return null;
    
    const entityId = entity.id;
    const entityName = entity.name;
    
    // Replace placeholders
    const trigger = this.replacePlaceholders(pattern.template.trigger, entityId, entityName);
    const steps = pattern.template.steps.map(step => 
      this.replacePlaceholders(step, entityId, entityName)
    );
    
    return {
      id: `${pattern.id}-${entityId}`,
      name: pattern.name.replace('{Entity}', entityName),
      description: pattern.description.replace('{entity}', entityId).replace('{Entity}', entityName),
      confidence,
      trigger,
      steps,
      conditions: pattern.template.conditions?.map(c => ({
        ...c,
        field: c.field.replace('{entity}', entityId),
      })),
    };
  }

  /**
   * Replace placeholders in workflow templates
   */
  private replacePlaceholders(obj: any, entityId: string, entityName: string): any {
    const json = JSON.stringify(obj);
    const replaced = json
      .replace(/\{entity\}/g, entityId)
      .replace(/\{Entity\}/g, entityName)
      .replace(/\{entities\}/g, entityId + 's');
    return JSON.parse(replaced);
  }

  /**
   * Generate standard CRUD workflows for an entity
   */
  private generateCRUDWorkflows(entity: InferredEntity): InferredWorkflow[] {
    const workflows: InferredWorkflow[] = [];
    const id = entity.id;
    const name = entity.name;
    
    // Create workflow
    workflows.push({
      id: `create-${id}`,
      name: `Create ${name}`,
      description: `Create a new ${name.toLowerCase()}`,
      confidence: 0.9,
      trigger: { type: 'form_submit', componentId: `${id}-form` },
      steps: [
        { id: 'create', type: 'create', config: { entityId: id, source: 'form_data' } },
        { id: 'notify', type: 'notify', config: { message: `${name} created!`, type: 'success' } },
        { id: 'navigate', type: 'navigate', config: { pageId: `${id}-list` } },
      ],
    });
    
    // Update workflow
    workflows.push({
      id: `update-${id}`,
      name: `Update ${name}`,
      description: `Update an existing ${name.toLowerCase()}`,
      confidence: 0.9,
      trigger: { type: 'form_submit', componentId: `${id}-edit-form` },
      steps: [
        { id: 'update', type: 'update', config: { entityId: id, source: 'form_data' } },
        { id: 'notify', type: 'notify', config: { message: `${name} updated!`, type: 'success' } },
        { id: 'navigate', type: 'navigate', config: { pageId: `${id}-detail` } },
      ],
    });
    
    // Delete workflow
    workflows.push({
      id: `delete-${id}`,
      name: `Delete ${name}`,
      description: `Delete a ${name.toLowerCase()}`,
      confidence: 0.9,
      trigger: { type: 'button_click', componentId: `${id}-delete-btn` },
      steps: [
        { id: 'delete', type: 'delete', config: { entityId: id } },
        { id: 'notify', type: 'notify', config: { message: `${name} deleted`, type: 'info' } },
        { id: 'navigate', type: 'navigate', config: { pageId: `${id}-list` } },
      ],
    });
    
    // Status change workflows if entity is trackable
    if (entity.behaviors.includes('trackable')) {
      workflows.push({
        id: `complete-${id}`,
        name: `Complete ${name}`,
        description: `Mark ${name.toLowerCase()} as complete`,
        confidence: 0.7,
        trigger: { type: 'button_click', componentId: `${id}-complete-btn` },
        steps: [
          { id: 'update', type: 'update', config: { entityId: id, field: 'status', value: 'completed' } },
          { id: 'notify', type: 'notify', config: { message: `${name} completed!`, type: 'success' } },
        ],
      });
    }
    
    // Navigation workflows
    workflows.push({
      id: `navigate-${id}-list`,
      name: `View ${entity.pluralName}`,
      description: `Navigate to ${entity.pluralName.toLowerCase()} list`,
      confidence: 0.95,
      trigger: { type: 'button_click', componentId: `${id}-back-btn` },
      steps: [
        { id: 'navigate', type: 'navigate', config: { pageId: `${id}-list` } },
      ],
    });
    
    workflows.push({
      id: `navigate-${id}-form`,
      name: `Add ${name}`,
      description: `Navigate to add ${name.toLowerCase()} form`,
      confidence: 0.95,
      trigger: { type: 'button_click', componentId: `${id}-add-btn` },
      steps: [
        { id: 'navigate', type: 'navigate', config: { pageId: `${id}-form` } },
      ],
    });
    
    return workflows;
  }

  /**
   * Get workflows based on detected features
   */
  private getFeatureWorkflows(
    features: DetectedFeature[],
    entities: InferredEntity[]
  ): InferredWorkflow[] {
    const workflows: InferredWorkflow[] = [];
    
    const featureIds = new Set(features.map(f => f.id));
    
    // Scheduling features
    if (featureIds.has('appointments') || featureIds.has('calendar')) {
      workflows.push({
        id: 'book-appointment',
        name: 'Book Appointment',
        description: 'Book a new appointment and send confirmation',
        confidence: 0.8,
        trigger: { type: 'form_submit', componentId: 'booking-form' },
        steps: [
          { id: 'create', type: 'create', config: { entityId: 'appointment', source: 'form_data' } },
          { id: 'email', type: 'email', config: { to: '{clientEmail}', subject: 'Appointment Confirmed' } },
          { id: 'notify', type: 'notify', config: { message: 'Appointment booked!', type: 'success' } },
        ],
      });
    }
    
    // Billing features
    if (featureIds.has('invoicing')) {
      workflows.push({
        id: 'create-invoice-from-job',
        name: 'Create Invoice from Job',
        description: 'Create an invoice from a completed job',
        confidence: 0.8,
        trigger: { type: 'button_click', componentId: 'create-invoice-btn' },
        steps: [
          { id: 'create', type: 'create', config: { entityId: 'invoice', source: 'job_data' } },
          { id: 'notify', type: 'notify', config: { message: 'Invoice created!', type: 'success' } },
          { id: 'navigate', type: 'navigate', config: { pageId: 'invoice-detail' } },
        ],
      });
      
      workflows.push({
        id: 'send-invoice',
        name: 'Send Invoice',
        description: 'Email invoice to client',
        confidence: 0.8,
        trigger: { type: 'button_click', componentId: 'send-invoice-btn' },
        steps: [
          { id: 'update', type: 'update', config: { entityId: 'invoice', field: 'status', value: 'sent' } },
          { id: 'email', type: 'email', config: { to: '{clientEmail}', subject: 'Invoice' } },
          { id: 'notify', type: 'notify', config: { message: 'Invoice sent!', type: 'success' } },
        ],
      });
    }
    
    // Quote features
    if (featureIds.has('quotes')) {
      workflows.push({
        id: 'accept-quote',
        name: 'Accept Quote',
        description: 'Accept quote and create job',
        confidence: 0.7,
        trigger: { type: 'button_click', componentId: 'accept-quote-btn' },
        steps: [
          { id: 'update', type: 'update', config: { entityId: 'quote', field: 'status', value: 'accepted' } },
          { id: 'create', type: 'create', config: { entityId: 'job', source: 'quote_data' } },
          { id: 'notify', type: 'notify', config: { message: 'Quote accepted!', type: 'success' } },
        ],
      });
    }
    
    // Reminder features
    if (featureIds.has('reminders')) {
      workflows.push({
        id: 'send-reminder',
        name: 'Send Appointment Reminder',
        description: 'Send reminder before appointments',
        confidence: 0.7,
        trigger: { type: 'schedule', schedule: '0 9 * * *' },
        steps: [
          { id: 'notify', type: 'notify', config: { message: 'Reminder: You have an appointment today', type: 'info' } },
        ],
      });
    }
    
    return workflows;
  }

  /**
   * Infer conditional workflows from "when...then" patterns
   * Enhanced for voice-driven workflow creation
   */
  private inferConditionalWorkflows(
    parsed: ParsedInput,
    entities: InferredEntity[]
  ): InferredWorkflow[] {
    const workflows: InferredWorkflow[] = [];
    const text = parsed.normalized;
    
    // Pattern variations: "when X then Y", "when X, Y", "when X do Y"
    const whenThenPatterns = [
      /when\s+(.+?)\s+(then|,|do)\s+(.+)/i,
      /when\s+user\s+(.+?)\s*,?\s*(then|do)\s+(.+)/i,
      /when\s+(.+?)\s*,?\s*([a-z]+)\s+(.+)/i,
    ];
    
    let match: RegExpMatchArray | null = null;
    for (const pattern of whenThenPatterns) {
      match = text.match(pattern);
      if (match) break;
    }
    
    if (match) {
      const condition = match[1]?.trim() || '';
      const action = match[3]?.trim() || match[2]?.trim() || '';
      
      // Parse trigger from condition
      const trigger = this.parseTriggerFromCondition(condition, entities);
      if (!trigger) return workflows;
      
      // Parse actions from action text
      const steps = this.parseActionsFromText(action, entities, condition);
      
      if (steps.length > 0) {
        const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        workflows.push({
          id: workflowId,
          name: this.generateWorkflowName(condition, action),
          description: `When ${condition}, ${action}`,
          confidence: 0.75,
          trigger,
          steps,
        });
      }
    }
    
    return workflows;
  }

  /**
   * Parse trigger from condition text
   */
  private parseTriggerFromCondition(
    condition: string,
    entities: InferredEntity[]
  ): WorkflowTrigger | null {
    const lowerCondition = condition.toLowerCase();
    
    // Find entity in condition
    const matchedEntity = entities.find(e => 
      lowerCondition.includes(e.name.toLowerCase()) || 
      lowerCondition.includes(e.id.toLowerCase())
    );
    const entityId = matchedEntity?.id || entities[0]?.id;
    const entityName = matchedEntity?.name || entities[0]?.name || '';
    
    // Record creation triggers
    if (/book|create|add|new|submit|save/i.test(condition)) {
      return {
        type: 'record_create',
        entityId,
        componentId: `${entityId}-form`,
      };
    }
    
    // Record update triggers
    if (/update|change|modify|edit/i.test(condition)) {
      return {
        type: 'record_update',
        entityId,
      };
    }
    
    // Record delete triggers
    if (/delete|remove|trash/i.test(condition)) {
      return {
        type: 'record_delete',
        entityId,
      };
    }
    
    // Specific entity actions
    if (lowerCondition.includes('book') || lowerCondition.includes('booking')) {
      return {
        type: 'form_submit',
        componentId: 'booking-form',
        entityId: entityId || 'booking',
      };
    }
    
    if (lowerCondition.includes('job') && lowerCondition.includes('book')) {
      return {
        type: 'form_submit',
        componentId: 'job-form',
        entityId: entityId || 'job',
      };
    }
    
    // Default: form submit for the first entity
    if (entityId) {
      return {
        type: 'form_submit',
        componentId: `${entityId}-form`,
        entityId,
      };
    }
    
    return null;
  }

  /**
   * Parse actions from action text
   */
  private parseActionsFromText(
    action: string,
    entities: InferredEntity[],
    condition: string
  ): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    const lowerAction = action.toLowerCase();
    const lowerCondition = condition.toLowerCase();
    
    // Extract entity references from condition
    const matchedEntity = entities.find(e => 
      lowerCondition.includes(e.name.toLowerCase()) || 
      lowerCondition.includes(e.id.toLowerCase())
    );
    const entityId = matchedEntity?.id || entities[0]?.id;
    
    // Email/confirmation actions
    if (/send\s+confirmation|send\s+email|email|notify|notification/i.test(action)) {
      const emailStep: WorkflowStep = {
        id: 'send-email',
        type: 'email',
        config: {
          to: '{email}',
          subject: this.extractEmailSubject(action, condition),
          body: this.extractEmailBody(action, condition),
        },
      };
      steps.push(emailStep);
    }
    
    // Create invoice
    if (/create\s+invoice|generate\s+invoice|invoice/i.test(action)) {
      steps.push({
        id: 'create-invoice',
        type: 'create',
        config: {
          entityId: 'invoice',
          source: 'current_data',
        },
      });
    }
    
    // Schedule event
    if (/schedule|book\s+event|create\s+event|add\s+to\s+calendar/i.test(action)) {
      steps.push({
        id: 'schedule-event',
        type: 'create',
        config: {
          entityId: 'event',
          source: 'form_data',
        },
      });
    }
    
    // Update record
    if (/update|change|set|mark/i.test(action)) {
      const updateField = this.extractFieldFromAction(action);
      const updateValue = this.extractValueFromAction(action);
      if (updateField && entityId) {
        steps.push({
          id: 'update-record',
          type: 'update',
          config: {
            entityId,
            field: updateField,
            value: updateValue,
          },
        });
      }
    }
    
    // Navigate
    if (/navigate|go\s+to|show|view/i.test(action)) {
      const pageId = this.extractPageIdFromAction(action, entities);
      if (pageId) {
        steps.push({
          id: 'navigate',
          type: 'navigate',
          config: { pageId },
        });
      }
    }
    
    // Show notification
    if (/show\s+notification|display\s+message|alert/i.test(action)) {
      steps.push({
        id: 'notify',
        type: 'notify',
        config: {
          message: this.extractNotificationMessage(action),
          type: 'success',
        },
      });
    }
    
    // Webhook
    if (/trigger\s+webhook|call\s+webhook|webhook/i.test(action)) {
      steps.push({
        id: 'webhook',
        type: 'webhook',
        config: {
          url: '{webhook_url}',
        },
      });
    }
    
    // If no specific action matched but we have a condition, add notification
    if (steps.length === 0 && condition) {
      steps.push({
        id: 'notify',
        type: 'notify',
        config: {
          message: 'Workflow executed',
          type: 'success',
        },
      });
    }
    
    return steps;
  }

  /**
   * Extract email subject from action text
   */
  private extractEmailSubject(action: string, condition: string): string {
    if (/confirmation|confirm/i.test(action)) {
      return 'Confirmation';
    }
    if (/invoice/i.test(action)) {
      return 'Invoice';
    }
    if (/booking|appointment/i.test(condition)) {
      return 'Booking Confirmation';
    }
    return 'Notification';
  }

  /**
   * Extract email body from action text
   */
  private extractEmailBody(action: string, condition: string): string {
    if (/confirmation|confirm/i.test(action)) {
      return 'Your request has been confirmed.';
    }
    return 'Thank you for your request.';
  }

  /**
   * Extract field name from action text
   */
  private extractFieldFromAction(action: string): string | null {
    const fieldPatterns = [
      /status/i,
      /state/i,
      /complete/i,
      /approved/i,
    ];
    
    for (const pattern of fieldPatterns) {
      if (pattern.test(action)) {
        return pattern.source.replace(/\\i/i, '').toLowerCase();
      }
    }
    
    return null;
  }

  /**
   * Extract value from action text
   */
  private extractValueFromAction(action: string): string {
    if (/complete|completed/i.test(action)) return 'completed';
    if (/approved|approve/i.test(action)) return 'approved';
    if (/rejected|reject/i.test(action)) return 'rejected';
    return 'updated';
  }

  /**
   * Extract page ID from action text
   */
  private extractPageIdFromAction(action: string, entities: InferredEntity[]): string | null {
    for (const entity of entities) {
      if (action.toLowerCase().includes(entity.name.toLowerCase())) {
        return `${entity.id}-list`;
      }
    }
    return entities[0]?.id ? `${entities[0].id}-list` : null;
  }

  /**
   * Extract notification message from action text
   */
  private extractNotificationMessage(action: string): string {
    // Try to extract a meaningful message
    const messageMatch = action.match(/(?:show|display|alert)\s+(.+)/i);
    if (messageMatch) {
      return messageMatch[1];
    }
    return 'Action completed successfully';
  }

  /**
   * Generate workflow name from condition and action
   */
  private generateWorkflowName(condition: string, action: string): string {
    // Capitalize first letter of each word
    const conditionWords = condition.split(/\s+/).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    
    const actionWords = action.split(/\s+/).map(w => 
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
    
    return `When ${conditionWords}, ${actionWords}`;
  }
}
