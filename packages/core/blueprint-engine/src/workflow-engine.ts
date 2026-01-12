/**
 * Workflow Engine
 * Converts blueprint workflows into executable actions
 * Supports button triggers, form submissions, CRUD operations, navigation, and automations
 */

import type { WorkflowDef, WorkflowAction, WorkflowTrigger, EntityDef } from './types.js';
import { integrationRegistry } from '@neo/integrations';

// ============================================================
// WORKFLOW EXECUTION CONTEXT
// ============================================================

export interface WorkflowContext {
  appId: string;
  entityId?: string;
  recordId?: string;
  formData?: Record<string, unknown>;
  currentData?: Record<string, unknown>;
  variables: Record<string, unknown>;
  user?: { id: string; name?: string };
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  nextAction?: 'continue' | 'stop' | 'skip';
}

export interface WorkflowResult {
  success: boolean;
  workflowId: string;
  actionsExecuted: number;
  results: ActionResult[];
  error?: string;
}

// ============================================================
// ACTION HANDLERS
// ============================================================

export type ActionHandler = (
  action: WorkflowAction,
  context: WorkflowContext,
  api: WorkflowAPI
) => Promise<ActionResult>;

export interface WorkflowAPI {
  // CRUD operations
  createRecord: (entityId: string, data: Record<string, unknown>) => Promise<{ id: string; data: unknown }>;
  updateRecord: (entityId: string, recordId: string, data: Record<string, unknown>) => Promise<{ data: unknown }>;
  deleteRecord: (entityId: string, recordId: string) => Promise<void>;
  getRecord: (entityId: string, recordId: string) => Promise<Record<string, unknown> | null>;
  
  // Navigation
  navigate: (pageId: string, params?: Record<string, string>) => void;
  
  // UI
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  showModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: (modalId?: string) => void;
  
  // Data refresh
  refreshData: (entityId?: string) => Promise<void>;
  
  // Variables
  setVariable: (name: string, value: unknown) => void;
  getVariable: (name: string) => unknown;
}

// ============================================================
// WORKFLOW ENGINE
// ============================================================

export class WorkflowEngine {
  private actionHandlers: Map<string, ActionHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default action handlers
   */
  private registerDefaultHandlers(): void {
    // Create record
    this.actionHandlers.set('create_record', async (action, context, api) => {
      try {
        const entityId = action.config.entityId as string;
        const data = this.resolveData(action.config.source as string, context);
        const result = await api.createRecord(entityId, data);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Update record
    this.actionHandlers.set('update_record', async (action, context, api) => {
      try {
        const entityId = action.config.entityId as string;
        const recordId = context.recordId || action.config.recordId as string;
        const data = this.resolveData(action.config.source as string, context);
        const result = await api.updateRecord(entityId, recordId, data);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Delete record
    this.actionHandlers.set('delete_record', async (action, context, api) => {
      try {
        const entityId = action.config.entityId as string;
        const recordId = context.recordId || action.config.recordId as string;
        await api.deleteRecord(entityId, recordId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Navigate
    this.actionHandlers.set('navigate', async (action, context, api) => {
      const pageId = action.config.pageId as string;
      const params = action.config.params as Record<string, string> | undefined;
      api.navigate(pageId, params);
      return { success: true };
    });

    // Show notification
    this.actionHandlers.set('show_notification', async (action, context, api) => {
      const message = this.interpolate(action.config.message as string, context);
      const type = (action.config.type as 'success' | 'error' | 'warning' | 'info') || 'success';
      api.showNotification(message, type);
      return { success: true };
    });

    // Show modal
    this.actionHandlers.set('show_modal', async (action, context, api) => {
      const modalId = action.config.modalId as string;
      const data = action.config.data as Record<string, unknown> | undefined;
      api.showModal(modalId, data);
      return { success: true };
    });

    // Close modal
    this.actionHandlers.set('close_modal', async (action, context, api) => {
      const modalId = action.config.modalId as string | undefined;
      api.closeModal(modalId);
      return { success: true };
    });

    // Refresh data
    this.actionHandlers.set('refresh_data', async (action, context, api) => {
      const entityId = action.config.entityId as string | undefined;
      await api.refreshData(entityId);
      return { success: true };
    });

    // Set variable
    this.actionHandlers.set('set_variable', async (action, context, api) => {
      const name = action.config.name as string;
      const value = this.resolveValue(action.config.value, context);
      api.setVariable(name, value);
      context.variables[name] = value;
      return { success: true, data: { [name]: value } };
    });

    // Validate
    this.actionHandlers.set('validate', async (action, context, api) => {
      const rules = action.config.rules as Array<{ field: string; rule: string; message: string }>;
      const errors: string[] = [];

      for (const rule of rules) {
        const value = context.formData?.[rule.field];
        const isValid = this.validateField(value, rule.rule);
        if (!isValid) {
          errors.push(rule.message);
        }
      }

      if (errors.length > 0) {
        api.showNotification(errors[0], 'error');
        return { success: false, error: errors.join(', '), nextAction: 'stop' };
      }

      return { success: true };
    });

    // Conditional
    this.actionHandlers.set('conditional', async (action, context, api) => {
      const condition = action.condition;
      const result = condition ? this.evaluateCondition(condition, context) : true;

      if (result && action.thenActions) {
        for (const thenAction of action.thenActions) {
          await this.executeAction(thenAction, context, api);
        }
      } else if (!result && action.elseActions) {
        for (const elseAction of action.elseActions) {
          await this.executeAction(elseAction, context, api);
        }
      }

      return { success: true };
    });

    // Call API (external - via integrations engine)
    this.actionHandlers.set('call_api', async (action, context, api) => {
      try {
        const url = this.interpolate(action.config.url as string, context);
        const method = (action.config.method as string) || 'GET';
        const headers = action.config.headers as Record<string, string> | undefined;
        const body = action.config.body ? this.resolveData('body', { ...context, currentData: action.config.body as Record<string, unknown> }) : undefined;

        // Try to use REST API integration if baseUrl matches
        const restResult = await integrationRegistry.executeAction('rest_api', method.toLowerCase() as 'get' | 'post' | 'put' | 'delete', {
          appId: context.appId,
          userId: context.user?.id,
          payload: { path: url, body, headers },
          variables: context.variables,
        });

        if (restResult.success) {
          return { success: true, data: restResult.data };
        }

        // Fallback to direct fetch
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        return { success: true, data };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Send email (via integrations engine)
    this.actionHandlers.set('send_email', async (action, context, api) => {
      try {
        const to = this.interpolate(action.config.to as string, context);
        const subject = this.interpolate(action.config.subject as string, context);
        const body = this.interpolate(action.config.body as string, context);
        const html = action.config.html ? this.interpolate(action.config.html as string, context) : undefined;

        const result = await integrationRegistry.executeAction('email', 'send_email', {
          appId: context.appId,
          userId: context.user?.id,
          payload: { to, subject, body, html },
          variables: context.variables,
        });

        if (result.success) {
          api.showNotification('Email sent successfully', 'success');
          return { success: true, data: result.data };
        } else {
          api.showNotification(result.error || 'Failed to send email', 'error');
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        api.showNotification('Failed to send email', 'error');
        return { success: false, error: error.message };
      }
    });

    // Send SMS (via integrations engine)
    this.actionHandlers.set('send_sms', async (action, context, api) => {
      try {
        const to = this.interpolate(action.config.to as string, context);
        const message = this.interpolate(action.config.message as string, context);

        const result = await integrationRegistry.executeAction('twilio', 'send_sms', {
          appId: context.appId,
          userId: context.user?.id,
          payload: { to, message },
          variables: context.variables,
        });

        if (result.success) {
          api.showNotification('SMS sent successfully', 'success');
          return { success: true, data: result.data };
        } else {
          api.showNotification(result.error || 'Failed to send SMS', 'error');
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        api.showNotification('Failed to send SMS', 'error');
        return { success: false, error: error.message };
      }
    });

    // Schedule event (via integrations engine - Google Calendar)
    this.actionHandlers.set('schedule_event', async (action, context, api) => {
      try {
        const title = this.interpolate(action.config.title as string, context);
        const description = action.config.description ? this.interpolate(action.config.description as string, context) : undefined;
        const startTime = action.config.startTime as string;
        const endTime = action.config.endTime as string | undefined;
        const attendees = action.config.attendees as string[] | undefined;
        const entityId = action.config.entityId as string | undefined;

        // Try to use Google Calendar integration if available
        const calendarResult = await integrationRegistry.executeAction('google_calendar', 'create_event', {
          appId: context.appId,
          userId: context.user?.id,
          payload: { summary: title, start: startTime, end: endTime || startTime, description, attendees },
          variables: context.variables,
        });

        if (calendarResult.success) {
          // Also create a record if entityId is provided
          if (entityId && api.createRecord) {
            const eventData: Record<string, unknown> = {
              title,
              startTime,
              ...(description && { description }),
              ...(endTime && { endTime }),
              ...(attendees && { attendees }),
              calendarEventId: calendarResult.data?.id,
            };
            await api.createRecord(entityId, eventData);
          }
          api.showNotification('Event scheduled successfully', 'success');
          return { success: true, data: calendarResult.data };
        } else {
          // Fallback: create record only if calendar integration not available
          if (entityId && api.createRecord) {
            const eventData: Record<string, unknown> = {
              title,
              startTime,
              ...(description && { description }),
              ...(endTime && { endTime }),
              ...(attendees && { attendees }),
            };
            const result = await api.createRecord(entityId, eventData);
            api.showNotification('Event scheduled successfully', 'success');
            return { success: true, data: result };
          }
          // If no entityId, just log (calendar integration failed silently)
          api.showNotification('Event scheduled (calendar integration not configured)', 'info');
          return { success: true, data: { title, startTime } };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Create invoice (via integrations engine - Stripe)
    this.actionHandlers.set('create_invoice', async (action, context, api) => {
      try {
        const entityId = action.config.entityId as string;
        const customerId = action.config.customerId ? this.interpolate(action.config.customerId as string, context) : context.recordId;
        const items = action.config.items as Array<{ description: string; quantity: number; price: number }> | undefined;
        const dueDate = action.config.dueDate as string | undefined;
        const notes = action.config.notes ? this.interpolate(action.config.notes as string, context) : undefined;

        if (!customerId) {
          return { success: false, error: 'Customer ID is required for invoice creation' };
        }

        // Try to use Stripe integration if available
        const stripeResult = await integrationRegistry.executeAction('stripe', 'create_invoice', {
          appId: context.appId,
          userId: context.user?.id,
          payload: { customerId, items: items || [], description: notes },
          variables: context.variables,
        });

        // Calculate totals
        const subtotal = items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
        const tax = action.config.taxRate ? subtotal * (action.config.taxRate as number) : 0;
        const total = subtotal + tax;

        const invoiceData: Record<string, unknown> = {
          customerId,
          items: items || [],
          subtotal,
          tax,
          total,
          status: 'draft',
          ...(dueDate && { dueDate }),
          ...(notes && { notes }),
          ...(stripeResult.success && stripeResult.data && { stripeInvoiceId: stripeResult.data.id }),
        };

        // Always create a record
        const result = await api.createRecord(entityId, invoiceData);
        api.showNotification('Invoice created successfully', 'success');
        return { success: true, data: { ...result, stripeInvoice: stripeResult.data } };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Trigger webhook (via integrations engine)
    this.actionHandlers.set('trigger_webhook', async (action, context, api) => {
      try {
        const url = action.config.url ? this.interpolate(action.config.url as string, context) : undefined;
        const method = (action.config.method as string) || 'POST';
        const headers = action.config.headers as Record<string, string> | undefined;
        const payload = action.config.payload 
          ? (action.config.payload as Record<string, unknown>)
          : (context.formData || context.currentData || {});

        // Interpolate payload values
        const processedPayload = typeof payload === 'object' && payload !== null
          ? Object.fromEntries(
              Object.entries(payload).map(([key, value]) => [
                key,
                typeof value === 'string' ? this.interpolate(value, context) : value
              ])
            )
          : payload;

        // Try to use webhook integration if configured (requires URL in config)
        // For now, fallback to direct fetch since webhook integration needs URL in settings
        // In future, we can check if webhook integration exists and use it

        // Fallback to direct fetch if integration not configured
        if (!url) {
          return { success: false, error: 'Webhook URL not configured' };
        }

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(processedPayload),
        });

        if (!response.ok) {
          throw new Error(`Webhook call failed: ${response.statusText}`);
        }

        const data = await response.json().catch(() => ({}));
        return { success: true, data };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Webhook (alias for trigger_webhook)
    this.actionHandlers.set('webhook', async (action, context, api) => {
      return this.actionHandlers.get('trigger_webhook')!(action, context, api);
    });
  }

  /**
   * Register a custom action handler
   */
  registerActionHandler(type: string, handler: ActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: WorkflowDef,
    context: WorkflowContext,
    api: WorkflowAPI
  ): Promise<WorkflowResult> {
    if (!workflow.enabled) {
      return {
        success: false,
        workflowId: workflow.id,
        actionsExecuted: 0,
        results: [],
        error: 'Workflow is disabled',
      };
    }

    const results: ActionResult[] = [];
    let actionsExecuted = 0;

    try {
      for (const action of workflow.actions) {
        const result = await this.executeAction(action, context, api);
        results.push(result);
        actionsExecuted++;

        if (!result.success && workflow.onError?.action === 'stop') {
          break;
        }

        if (result.nextAction === 'stop') {
          break;
        }
      }

      const success = results.every(r => r.success);

      return {
        success,
        workflowId: workflow.id,
        actionsExecuted,
        results,
      };
    } catch (error: any) {
      if (workflow.onError?.notification) {
        api.showNotification(workflow.onError.notification, 'error');
      }

      return {
        success: false,
        workflowId: workflow.id,
        actionsExecuted,
        results,
        error: error.message,
      };
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    context: WorkflowContext,
    api: WorkflowAPI
  ): Promise<ActionResult> {
    // Check condition
    if (action.condition && !this.evaluateCondition(action.condition, context)) {
      return { success: true, nextAction: 'skip' };
    }

    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      return { success: false, error: `Unknown action type: ${action.type}` };
    }

    return handler(action, context, api);
  }

  /**
   * Find workflows matching a trigger
   * Supports both legacy and new trigger type formats
   */
  findMatchingWorkflows(
    workflows: WorkflowDef[],
    triggerType: WorkflowTrigger['type'] | string,
    componentId?: string,
    entityId?: string
  ): WorkflowDef[] {
    // Normalize trigger type (support onClick, onSubmit, etc.)
    const normalizedTriggerType = this.normalizeTriggerType(triggerType);
    
    return workflows.filter(workflow => {
      if (!workflow.enabled) return false;
      
      // Normalize workflow trigger type for comparison
      const workflowTriggerType = this.normalizeTriggerType(workflow.trigger.type);
      if (workflowTriggerType !== normalizedTriggerType) return false;
      
      if (componentId && workflow.trigger.componentId && workflow.trigger.componentId !== componentId) {
        return false;
      }
      
      if (entityId && workflow.trigger.entityId && workflow.trigger.entityId !== entityId) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Normalize trigger type to standard format
   */
  private normalizeTriggerType(type: string): string {
    const typeMap: Record<string, string> = {
      'onClick': 'button_click',
      'onSubmit': 'form_submit',
      'onChange': 'field_change',
      'onPageLoad': 'page_load',
      'scheduled': 'schedule',
    };
    
    return typeMap[type] || type;
  }

  /**
   * Resolve data from context
   */
  private resolveData(source: string, context: WorkflowContext): Record<string, unknown> {
    switch (source) {
      case 'form_data':
        return context.formData || {};
      case 'current_data':
        return context.currentData || {};
      case 'variables':
        return context.variables;
      default:
        return context.formData || {};
    }
  }

  /**
   * Resolve a value with interpolation
   */
  private resolveValue(value: unknown, context: WorkflowContext): unknown {
    if (typeof value === 'string') {
      return this.interpolate(value, context);
    }
    return value;
  }

  /**
   * Interpolate template strings
   */
  private interpolate(template: string, context: WorkflowContext): string {
    return template.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, path) => {
      const parts = path.split('.');
      let value: unknown = context;

      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[part];
        } else {
          return match;
        }
      }

      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, context: WorkflowContext): boolean {
    // Simple condition evaluation
    // Supports: field === value, field !== value, field > value, etc.
    
    // Handle confirm() specially
    if (condition.startsWith('confirm(')) {
      // In preview mode, always return true
      // In real app, this would show a confirmation dialog
      return true;
    }

    try {
      // Create safe evaluation context
      const evalContext: Record<string, unknown> = {
        ...context.formData,
        ...context.currentData,
        ...context.variables,
        recordId: context.recordId,
        entityId: context.entityId,
      };

      // Simple expression evaluator
      const parts = condition.match(/(\w+)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)/);
      if (parts) {
        const [, field, operator, rawValue] = parts;
        const fieldValue = evalContext[field];
        let compareValue: unknown = rawValue.trim();

        // Parse value
        if (compareValue === 'true') compareValue = true;
        else if (compareValue === 'false') compareValue = false;
        else if (compareValue === 'null') compareValue = null;
        else if (/^['"].*['"]$/.test(compareValue as string)) {
          compareValue = (compareValue as string).slice(1, -1);
        } else if (!isNaN(Number(compareValue))) {
          compareValue = Number(compareValue);
        }

        switch (operator) {
          case '===':
          case '==':
            return fieldValue === compareValue;
          case '!==':
          case '!=':
            return fieldValue !== compareValue;
          case '>':
            return Number(fieldValue) > Number(compareValue);
          case '>=':
            return Number(fieldValue) >= Number(compareValue);
          case '<':
            return Number(fieldValue) < Number(compareValue);
          case '<=':
            return Number(fieldValue) <= Number(compareValue);
        }
      }

      // If just a field name, check truthiness
      if (evalContext[condition] !== undefined) {
        return Boolean(evalContext[condition]);
      }

      return true;
    } catch {
      return true;
    }
  }

  /**
   * Validate a field value
   */
  private validateField(value: unknown, rule: string): boolean {
    switch (rule) {
      case 'required':
        return value !== undefined && value !== null && value !== '';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value as string);
          return true;
        } catch {
          return false;
        }
      case 'number':
        return !isNaN(Number(value));
      default:
        // Handle pattern matching: pattern:/regex/
        if (rule.startsWith('pattern:')) {
          const pattern = rule.slice(8);
          return new RegExp(pattern).test(String(value));
        }
        // Handle min/max: min:5, max:100
        if (rule.startsWith('min:')) {
          return Number(value) >= Number(rule.slice(4));
        }
        if (rule.startsWith('max:')) {
          return Number(value) <= Number(rule.slice(4));
        }
        return true;
    }
  }
}

// ============================================================
// WORKFLOW GENERATOR
// ============================================================

export class WorkflowGenerator {
  /**
   * Generate standard CRUD workflows for an entity
   */
  generateCrudWorkflows(entity: EntityDef): WorkflowDef[] {
    const workflows: WorkflowDef[] = [];

    // Create workflow
    workflows.push({
      id: `create-${entity.id}`,
      name: `Create ${entity.name}`,
      enabled: true,
      trigger: {
        type: 'form_submit',
        componentId: `${entity.id}-form`,
      },
      actions: [
        {
          id: 'validate',
          type: 'validate',
          config: {
            rules: entity.fields
              .filter(f => f.required)
              .map(f => ({
                field: f.id,
                rule: 'required',
                message: `${f.name} is required`,
              })),
          },
        },
        {
          id: 'create',
          type: 'create_record',
          config: { entityId: entity.id, source: 'form_data' },
        },
        {
          id: 'notify',
          type: 'show_notification',
          config: { message: `${entity.name} created successfully!`, type: 'success' },
        },
        {
          id: 'refresh',
          type: 'refresh_data',
          config: { entityId: entity.id },
        },
        {
          id: 'navigate',
          type: 'navigate',
          config: { pageId: `${entity.id}-list` },
        },
      ],
    });

    // Update workflow
    workflows.push({
      id: `update-${entity.id}`,
      name: `Update ${entity.name}`,
      enabled: true,
      trigger: {
        type: 'form_submit',
        componentId: `${entity.id}-edit-form`,
      },
      actions: [
        {
          id: 'update',
          type: 'update_record',
          config: { entityId: entity.id, source: 'form_data' },
        },
        {
          id: 'notify',
          type: 'show_notification',
          config: { message: `${entity.name} updated successfully!`, type: 'success' },
        },
        {
          id: 'refresh',
          type: 'refresh_data',
          config: { entityId: entity.id },
        },
      ],
    });

    // Delete workflow
    workflows.push({
      id: `delete-${entity.id}`,
      name: `Delete ${entity.name}`,
      enabled: true,
      trigger: {
        type: 'button_click',
        componentId: `${entity.id}-delete-btn`,
      },
      actions: [
        {
          id: 'confirm-delete',
          type: 'conditional',
          config: {},
          condition: 'confirm("Are you sure you want to delete this?")',
          thenActions: [
            {
              id: 'delete',
              type: 'delete_record',
              config: { entityId: entity.id },
            },
            {
              id: 'notify',
              type: 'show_notification',
              config: { message: `${entity.name} deleted.`, type: 'info' },
            },
            {
              id: 'refresh',
              type: 'refresh_data',
              config: { entityId: entity.id },
            },
            {
              id: 'navigate',
              type: 'navigate',
              config: { pageId: `${entity.id}-list` },
            },
          ],
        },
      ],
    });

    return workflows;
  }

  /**
   * Generate navigation workflows for pages
   */
  generateNavigationWorkflows(entityId: string, entityName: string): WorkflowDef[] {
    return [
      {
        id: `navigate-${entityId}-list`,
        name: `Go to ${entityName} List`,
        enabled: true,
        trigger: { type: 'button_click', componentId: `${entityId}-back-btn` },
        actions: [
          { id: 'nav', type: 'navigate', config: { pageId: `${entityId}-list` } },
        ],
      },
      {
        id: `navigate-${entityId}-form`,
        name: `Add New ${entityName}`,
        enabled: true,
        trigger: { type: 'button_click', componentId: `${entityId}-add-btn` },
        actions: [
          { id: 'nav', type: 'navigate', config: { pageId: `${entityId}-form` } },
        ],
      },
      {
        id: `navigate-${entityId}-detail`,
        name: `View ${entityName} Details`,
        enabled: true,
        trigger: { type: 'button_click', componentId: `${entityId}-view-btn` },
        actions: [
          { id: 'nav', type: 'navigate', config: { pageId: `${entityId}-detail` } },
        ],
      },
    ];
  }
}

// Export singletons
export const workflowEngine = new WorkflowEngine();
export const workflowGenerator = new WorkflowGenerator();
