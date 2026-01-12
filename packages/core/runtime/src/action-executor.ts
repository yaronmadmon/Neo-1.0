/**
 * Action Execution Engine - Centralized action handler
 * Executes actions from flows, components, and user interactions
 */

import { FlowActionType } from '@neo/contracts';
import { RuntimeDataStore, DataRecord } from './data-store.js';
import { StateManager } from './state-manager.js';
import { EventBus, RuntimeEventType, getEventBus } from './event-system.js';

export interface ActionConfig {
  type: string;
  modelId?: string;
  model?: string; // Alias for modelId
  recordId?: string;
  data?: Record<string, unknown>;
  targetPageId?: string;
  message?: string;
  componentId?: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  condition?: string;
  async?: boolean;
  delay?: number;
  [key: string]: unknown;
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  data?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

export interface ActionContext {
  appId: string;
  componentId?: string;
  formData?: Record<string, unknown>;
  triggerData?: unknown;
  record?: DataRecord;
  records?: DataRecord[];
  pageParams?: Record<string, string>;
}

export type ActionHandler = (
  action: ActionConfig,
  context: ActionContext
) => Promise<ActionResult>;

/**
 * ActionExecutor - Central action execution engine
 */
export class ActionExecutor {
  private dataStore: RuntimeDataStore;
  private stateManager: StateManager;
  private eventBus: EventBus;
  private handlers: Map<string, ActionHandler>;
  private middleware: ((action: ActionConfig, context: ActionContext, next: () => Promise<ActionResult>) => Promise<ActionResult>)[];
  private apiBaseUrl: string;
  private appId: string;

  constructor(
    appId: string,
    dataStore: RuntimeDataStore,
    stateManager: StateManager,
    options?: { apiBaseUrl?: string; eventBus?: EventBus }
  ) {
    this.appId = appId;
    this.dataStore = dataStore;
    this.stateManager = stateManager;
    this.eventBus = options?.eventBus ?? getEventBus();
    this.apiBaseUrl = options?.apiBaseUrl ?? '/api';
    this.handlers = new Map();
    this.middleware = [];

    // Register built-in action handlers
    this.registerBuiltInHandlers();
  }

  /**
   * Register built-in action handlers
   */
  private registerBuiltInHandlers(): void {
    // Data operations
    this.registerHandler('create_record', this.handleCreateRecord.bind(this));
    this.registerHandler('update_record', this.handleUpdateRecord.bind(this));
    this.registerHandler('delete_record', this.handleDeleteRecord.bind(this));
    this.registerHandler('refresh_data', this.handleRefreshData.bind(this));
    
    // Navigation
    this.registerHandler('navigate', this.handleNavigate.bind(this));
    this.registerHandler('go_back', this.handleGoBack.bind(this));
    
    // UI actions
    this.registerHandler('show_notification', this.handleShowNotification.bind(this));
    this.registerHandler('open_modal', this.handleOpenModal.bind(this));
    this.registerHandler('close_modal', this.handleCloseModal.bind(this));
    
    // State actions
    this.registerHandler('set_state', this.handleSetState.bind(this));
    this.registerHandler('set_component_state', this.handleSetComponentState.bind(this));
    
    // API actions
    this.registerHandler('api_call', this.handleApiCall.bind(this));
    
    // Flow control
    this.registerHandler('delay', this.handleDelay.bind(this));
    this.registerHandler('conditional', this.handleConditional.bind(this));
  }

  /**
   * Register a custom action handler
   */
  registerHandler(actionType: string, handler: ActionHandler): void {
    this.handlers.set(actionType.toLowerCase(), handler);
  }

  /**
   * Add middleware to the action execution pipeline
   */
  use(middleware: (action: ActionConfig, context: ActionContext, next: () => Promise<ActionResult>) => Promise<ActionResult>): void {
    this.middleware.push(middleware);
  }

  /**
   * Execute a single action
   */
  async execute(action: ActionConfig, context?: Partial<ActionContext>): Promise<ActionResult> {
    const startTime = Date.now();
    const fullContext: ActionContext = {
      appId: this.appId,
      ...context,
    };

    // Normalize action type
    const actionType = action.type?.toLowerCase() ?? '';

    // Check condition
    if (action.condition && !this.evaluateCondition(action.condition, fullContext)) {
      return {
        success: true,
        actionType,
        data: { skipped: true, reason: 'Condition not met' },
      };
    }

    // Apply delay if specified
    if (action.delay && action.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, action.delay));
    }

    // Emit action started event
    this.eventBus.emitSync(RuntimeEventType.FLOW_STARTED, {
      actionType,
      action,
      context: fullContext,
    });

    try {
      // Run through middleware chain
      const result = await this.runWithMiddleware(action, fullContext, async () => {
        const handler = this.handlers.get(actionType);
        if (!handler) {
          return {
            success: false,
            actionType,
            error: `Unknown action type: ${action.type}`,
          };
        }
        return handler(action, fullContext);
      });

      result.duration = Date.now() - startTime;

      // Emit action completed event
      this.eventBus.emitSync(RuntimeEventType.FLOW_COMPLETED, {
        actionType,
        action,
        result,
      });

      return result;
    } catch (error: any) {
      const result: ActionResult = {
        success: false,
        actionType,
        error: error.message || 'Action execution failed',
        duration: Date.now() - startTime,
      };

      // Emit error event
      this.eventBus.emitSync(RuntimeEventType.FLOW_ERROR, {
        actionType,
        action,
        error: error.message,
      });

      return result;
    }
  }

  /**
   * Execute multiple actions in sequence
   */
  async executeSequence(
    actions: ActionConfig[],
    context?: Partial<ActionContext>,
    options?: { stopOnError?: boolean }
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    const stopOnError = options?.stopOnError ?? true;

    for (const action of actions) {
      const result = await this.execute(action, context);
      results.push(result);

      if (!result.success && stopOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple actions in parallel
   */
  async executeParallel(
    actions: ActionConfig[],
    context?: Partial<ActionContext>
  ): Promise<ActionResult[]> {
    const promises = actions.map(action => this.execute(action, context));
    return Promise.all(promises);
  }

  /**
   * Run action through middleware chain
   */
  private async runWithMiddleware(
    action: ActionConfig,
    context: ActionContext,
    handler: () => Promise<ActionResult>
  ): Promise<ActionResult> {
    if (this.middleware.length === 0) {
      return handler();
    }

    let index = 0;
    const runNext = async (): Promise<ActionResult> => {
      if (index >= this.middleware.length) {
        return handler();
      }
      const mw = this.middleware[index++];
      return mw(action, context, runNext);
    };

    return runNext();
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, context: ActionContext): boolean {
    try {
      const fn = new Function('ctx', `
        with (ctx) {
          return Boolean(${condition});
        }
      `);
      return fn({
        ...context,
        data: this.dataStore.getAllData(),
        state: this.stateManager.getState().custom,
      });
    } catch (err) {
      console.error('[ActionExecutor] Condition evaluation error:', err);
      return false;
    }
  }

  // ==================== Built-in Action Handlers ====================

  private async handleCreateRecord(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const modelId = action.modelId || action.model;
    if (!modelId) {
      return { success: false, actionType: 'create_record', error: 'modelId is required' };
    }

    const recordData = { ...action.data, ...context.formData };
    
    // API call to persist
    try {
      const response = await fetch(`${this.apiBaseUrl}/apps/${this.appId}/data/${modelId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        return { success: false, actionType: 'create_record', error: errorData.message || 'Failed to create record' };
      }

      const result = await response.json() as { record?: Record<string, unknown> };
      
      // Update local store
      if (result.record) {
        this.dataStore.createRecord(modelId, result.record);
      }

      return {
        success: true,
        actionType: 'create_record',
        data: { modelId, record: result.record },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, actionType: 'create_record', error: message };
    }
  }

  private async handleUpdateRecord(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const modelId = action.modelId || action.model;
    if (!modelId || !action.recordId) {
      return { success: false, actionType: 'update_record', error: 'modelId and recordId are required' };
    }

    const updates = { ...action.data, ...context.formData };

    try {
      const response = await fetch(`${this.apiBaseUrl}/apps/${this.appId}/data/${modelId}/${action.recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        return { success: false, actionType: 'update_record', error: errorData.message || 'Failed to update record' };
      }

      // Update local store
      this.dataStore.updateRecord(modelId, action.recordId, updates);

      return {
        success: true,
        actionType: 'update_record',
        data: { modelId, recordId: action.recordId },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, actionType: 'update_record', error: message };
    }
  }

  private async handleDeleteRecord(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const modelId = action.modelId || action.model;
    if (!modelId || !action.recordId) {
      return { success: false, actionType: 'delete_record', error: 'modelId and recordId are required' };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/apps/${this.appId}/data/${modelId}/${action.recordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        return { success: false, actionType: 'delete_record', error: errorData.message || 'Failed to delete record' };
      }

      // Update local store
      this.dataStore.deleteRecord(modelId, action.recordId);

      return {
        success: true,
        actionType: 'delete_record',
        data: { modelId, recordId: action.recordId },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, actionType: 'delete_record', error: message };
    }
  }

  private async handleRefreshData(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/apps/${this.appId}`);
      if (!response.ok) {
        return { success: false, actionType: 'refresh_data', error: 'Failed to refresh data' };
      }

      const responseData = await response.json() as { app?: { data?: Record<string, unknown[]> } };
      if (responseData.app?.data) {
        for (const [modelId, records] of Object.entries(responseData.app.data)) {
          if (Array.isArray(records)) {
            this.dataStore.setRecords(modelId, records);
          }
        }
      }

      return { success: true, actionType: 'refresh_data' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, actionType: 'refresh_data', error: message };
    }
  }

  private async handleNavigate(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    if (!action.targetPageId) {
      return { success: false, actionType: 'navigate', error: 'targetPageId is required' };
    }

    this.stateManager.navigateTo(action.targetPageId, context.pageParams);

    return {
      success: true,
      actionType: 'navigate',
      data: { pageId: action.targetPageId },
    };
  }

  private async handleGoBack(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    this.stateManager.goBack();
    return { success: true, actionType: 'go_back' };
  }

  private async handleShowNotification(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const type = (action.notificationType as 'success' | 'error' | 'warning' | 'info') || 'success';
    
    this.stateManager.showNotification({
      type,
      message: action.message || '',
      title: action.title as string,
      duration: action.duration as number,
    });

    return {
      success: true,
      actionType: 'show_notification',
      data: { message: action.message },
    };
  }

  private async handleOpenModal(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const modalId = String(action.modalId || action.componentId || '');
    if (!modalId) {
      return { success: false, actionType: 'open_modal', error: 'modalId is required' };
    }

    this.stateManager.openModal(modalId);
    return { success: true, actionType: 'open_modal', data: { modalId } };
  }

  private async handleCloseModal(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const modalId = String(action.modalId || action.componentId || '');
    if (!modalId) {
      return { success: false, actionType: 'close_modal', error: 'modalId is required' };
    }

    this.stateManager.closeModal(modalId);
    return { success: true, actionType: 'close_modal', data: { modalId } };
  }

  private async handleSetState(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const { key, value } = action;
    if (!key) {
      return { success: false, actionType: 'set_state', error: 'key is required' };
    }

    this.stateManager.setCustomState(key as string, value);
    return { success: true, actionType: 'set_state', data: { key, value } };
  }

  private async handleSetComponentState(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const componentId = action.componentId || context.componentId;
    if (!componentId) {
      return { success: false, actionType: 'set_component_state', error: 'componentId is required' };
    }

    this.stateManager.setComponentState(componentId, action.state as Record<string, unknown>);
    return { success: true, actionType: 'set_component_state', data: { componentId } };
  }

  private async handleApiCall(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    if (!action.url) {
      return { success: false, actionType: 'api_call', error: 'url is required' };
    }

    try {
      const response = await fetch(action.url, {
        method: action.method || 'GET',
        headers: action.headers,
        body: action.body ? JSON.stringify(action.body) : undefined,
      });

      const responseData = await response.json() as Record<string, unknown>;
      
      if (!response.ok) {
        return { success: false, actionType: 'api_call', error: String(responseData.message || 'API call failed') };
      }

      return { success: true, actionType: 'api_call', data: responseData };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, actionType: 'api_call', error: message };
    }
  }

  private async handleDelay(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const duration = (action.duration as number) || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
    return { success: true, actionType: 'delay', data: { duration } };
  }

  private async handleConditional(action: ActionConfig, context: ActionContext): Promise<ActionResult> {
    const { condition, thenActions, elseActions } = action;
    
    if (!condition) {
      return { success: false, actionType: 'conditional', error: 'condition is required' };
    }

    const result = this.evaluateCondition(condition as string, context);
    const actionsToRun = result 
      ? (thenActions as ActionConfig[] || [])
      : (elseActions as ActionConfig[] || []);

    if (actionsToRun.length > 0) {
      await this.executeSequence(actionsToRun, context);
    }

    return {
      success: true,
      actionType: 'conditional',
      data: { conditionMet: result },
    };
  }
}
