/**
 * Runtime Engine - Main entry point that orchestrates all runtime systems
 * This is what powers the preview AND future real apps
 */

import type { App, Flow, ComponentInstance, Page, DataModel } from '@neo/contracts';
import { FlowTriggerType } from '@neo/contracts';

import { EventBus, RuntimeEventType, getEventBus, resetEventBus } from './event-system.js';
import { RuntimeDataStore, DataRecord, getDataStore, resetDataStore } from './data-store.js';
import { StateManager, getStateManager, resetStateManager } from './state-manager.js';
import { BindingEngine } from './binding-engine.js';
import { ActionExecutor, ActionConfig, ActionResult } from './action-executor.js';
import { ConditionalRenderer, ConditionalProps } from './conditional-renderer.js';
import { DynamicStyler, ThemeConfig, StyleDefinition, CSSProperties } from './dynamic-styling.js';
import { LayoutManager, LayoutConfig, LayoutSlot, LayoutPresets, CSSProperties as LayoutCSSProperties } from './layout-manager.js';
import { PermissionsService, type PermissionContext } from './permissions-service.js';
import type { NeoRole, UnifiedAppSchema } from '@neo/blueprint-engine';

export interface RuntimeConfig {
  app: App;
  apiBaseUrl?: string;
  enableDevTools?: boolean;
  onError?: (error: Error, context: string) => void;
  onNavigate?: (pageId: string) => void;
  onNotification?: (notification: { type: string; message: string }) => void;
}

export interface RuntimeContext {
  appId: string;
  currentPage: Page | undefined;
  data: Record<string, DataRecord[]>;
  theme: ThemeConfig;
  state: Record<string, unknown>;
}

export interface ComponentRenderContext {
  instance: ComponentInstance;
  data: Record<string, DataRecord[]>;
  record?: DataRecord;
  index?: number;
  parentId?: string;
}

/**
 * RuntimeEngine - The main orchestrator for app execution
 */
export class RuntimeEngine {
  // Core systems
  readonly eventBus: EventBus;
  readonly dataStore: RuntimeDataStore;
  readonly stateManager: StateManager;
  readonly bindingEngine: BindingEngine;
  readonly actionExecutor: ActionExecutor;
  readonly conditionalRenderer: ConditionalRenderer;
  readonly dynamicStyler: DynamicStyler;
  readonly layoutManager: LayoutManager;
  readonly permissionsService: PermissionsService;

  // App configuration
  private app: App;
  private config: RuntimeConfig;
  private initialized: boolean = false;
  private currentRole: NeoRole = 'public';
  private currentUserId?: string;

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.app = config.app;

    // Initialize core systems
    this.eventBus = getEventBus();
    this.dataStore = getDataStore(config.app.data);
    this.stateManager = getStateManager(config.app.schema.pages[0]?.id);
    this.bindingEngine = new BindingEngine(this.dataStore, this.stateManager, this.eventBus);
    this.actionExecutor = new ActionExecutor(
      config.app.id,
      this.dataStore,
      this.stateManager,
      { apiBaseUrl: config.apiBaseUrl, eventBus: this.eventBus }
    );
    this.conditionalRenderer = new ConditionalRenderer(this.dataStore, this.stateManager);
    // Normalize theme from app to match ThemeConfig
    const normalizedTheme = config.app.theme ? {
      colors: config.app.theme.colors,
      typography: config.app.theme.typography as Record<string, { fontFamily?: string; fontSize?: string; fontWeight?: string | number; lineHeight?: string | number; letterSpacing?: string }>,
      spacing: config.app.theme.spacing as Record<string, string>,
      borderRadius: config.app.theme.borderRadius as Record<string, string> | undefined,
      shadows: config.app.theme.shadows as Record<string, string> | undefined,
    } : undefined;
    this.dynamicStyler = new DynamicStyler(this.dataStore, this.stateManager, normalizedTheme as ThemeConfig | undefined);
    this.layoutManager = new LayoutManager(this.stateManager);
    
    // Initialize permissions service
    const schema = config.app.schema as unknown as UnifiedAppSchema;
    this.permissionsService = new PermissionsService({
      userId: undefined,
      role: 'public',
      appId: config.app.id,
      schema,
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the runtime engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Emit initialization event
    this.eventBus.emitSync(RuntimeEventType.STATE_INITIALIZED, {
      appId: this.app.id,
      pages: this.app.schema.pages.length,
      dataModels: this.app.schema.dataModels?.length ?? 0,
      flows: this.app.schema.flows?.length ?? 0,
    });

    // Initialize layout sections
    for (const page of this.app.schema.pages) {
      const pageLayout = page.layout as unknown as LayoutConfig | undefined;
      this.layoutManager.registerSection({
        id: page.id,
        name: page.name,
        layout: pageLayout ?? { type: 'stack', gap: '1rem' },
      });
    }

    this.initialized = true;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Navigation events
    this.eventBus.on(RuntimeEventType.PAGE_NAVIGATED, ({ to }: { to: string }) => {
      this.config.onNavigate?.(to);
    });

    // Notification events
    this.eventBus.on(RuntimeEventType.NOTIFICATION_SHOW, (notification: { type: string; message: string }) => {
      this.config.onNotification?.(notification);
    });

    // Error events
    this.eventBus.on(RuntimeEventType.ERROR_OCCURRED, ({ error, context }: { error: Error; context: string }) => {
      this.config.onError?.(error, context);
    });
  }

  /**
   * Get current runtime context
   */
  getContext(): RuntimeContext {
    return {
      appId: this.app.id,
      currentPage: this.getCurrentPage(),
      data: this.dataStore.getAllData(),
      theme: this.dynamicStyler.getTheme(),
      state: this.stateManager.getState().custom,
    };
  }

  /**
   * Get the current page
   */
  getCurrentPage(): Page | undefined {
    const pageId = this.stateManager.getCurrentPage();
    return this.app.schema.pages.find(p => p.id === pageId);
  }

  /**
   * Navigate to a page
   */
  navigateTo(pageId: string, params?: Record<string, string>): void {
    const page = this.app.schema.pages.find(p => p.id === pageId);
    if (page) {
      this.stateManager.navigateTo(pageId, params);
    }
  }

  /**
   * Get all pages
   */
  getPages(): Page[] {
    return this.app.schema.pages;
  }

  /**
   * Get all data models
   */
  getDataModels(): DataModel[] {
    return this.app.schema.dataModels ?? [];
  }

  /**
   * Get all flows
   */
  getFlows(): Flow[] {
    return this.app.schema.flows ?? [];
  }

  /**
   * Handle component action (button click, form submit, etc.)
   */
  async handleAction(
    componentId: string,
    eventType: 'button_click' | 'form_submit',
    formData?: Record<string, unknown>
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    // Find matching flows
    const flows = this.findMatchingFlows(componentId, eventType);

    if (flows.length === 0) {
      console.warn(`[RuntimeEngine] No flows found for ${eventType} on ${componentId}`);
      return results;
    }

    // Execute each flow
    for (const flow of flows) {
      if (!flow.actions || flow.actions.length === 0) continue;

      const flowResults = await this.actionExecutor.executeSequence(
        flow.actions as ActionConfig[],
        {
          appId: this.app.id,
          componentId,
          formData,
        }
      );

      results.push(...flowResults);
    }

    return results;
  }

  /**
   * Find flows matching a trigger
   */
  private findMatchingFlows(componentId: string, eventType: string): Flow[] {
    const flows = this.app.schema.flows ?? [];
    
    const triggerType = eventType === 'button_click' 
      ? FlowTriggerType.BUTTON_CLICK 
      : FlowTriggerType.FORM_SUBMIT;

    return flows.filter(flow => {
      if (flow.enabled === false) return false;
      if (flow.trigger.type !== triggerType) return false;
      
      // If flow specifies a componentId, it must match
      if (flow.trigger.componentId && flow.trigger.componentId !== componentId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Execute a specific action
   */
  async executeAction(action: ActionConfig, formData?: Record<string, unknown>): Promise<ActionResult> {
    return this.actionExecutor.execute(action, { formData });
  }

  /**
   * Get component visibility
   */
  shouldShowComponent(componentId: string, conditions?: ConditionalProps): boolean {
    if (!conditions) return true;
    return this.conditionalRenderer.shouldShow(conditions, { componentId });
  }

  /**
   * Get component disabled state
   */
  isComponentDisabled(componentId: string, conditions?: ConditionalProps): boolean {
    if (!conditions) return false;
    return this.conditionalRenderer.shouldDisable(conditions, { componentId });
  }

  /**
   * Get computed styles for a component
   */
  getComponentStyles(
    componentId: string,
    baseStyles?: StyleDefinition,
    record?: DataRecord,
    index?: number
  ): CSSProperties {
    return this.dynamicStyler.computeStyles(componentId, baseStyles, { record, index });
  }

  /**
   * Get layout styles for a container
   */
  getLayoutStyles(layout: LayoutConfig): CSSProperties {
    return this.layoutManager.getLayoutStyles(layout);
  }

  /**
   * Get slot styles for a component
   */
  getSlotStyles(componentId: string): CSSProperties {
    const slot = this.layoutManager.getSlot(componentId);
    if (!slot) return {};
    return this.layoutManager.getSlotStyles(slot);
  }

  /**
   * Create a data binding for a component
   */
  bindComponent(componentId: string, bindings: Array<{
    source: { modelId?: string; field?: string; stateKey?: string };
    target: { prop: string };
    transform?: { type: 'format'; format: string };
    twoWay?: boolean;
  }>): () => void {
    const unsubscribes: (() => void)[] = [];

    for (const binding of bindings) {
      const unsub = this.bindingEngine.bind({
        componentId,
        type: binding.source.stateKey ? 'state' : 'data',
        source: binding.source,
        target: binding.target,
        transform: binding.transform,
        twoWay: binding.twoWay,
      });
      unsubscribes.push(unsub);
    }

    return () => {
      for (const unsub of unsubscribes) {
        unsub();
      }
    };
  }

  /**
   * Show a notification
   */
  showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number): void {
    this.stateManager.showNotification({ type, message, duration });
  }

  /**
   * Open a modal
   */
  openModal(modalId: string): void {
    this.stateManager.openModal(modalId);
  }

  /**
   * Close a modal
   */
  closeModal(modalId: string): void {
    this.stateManager.closeModal(modalId);
  }

  /**
   * Check if modal is open
   */
  isModalOpen(modalId: string): boolean {
    return this.stateManager.isModalOpen(modalId);
  }

  /**
   * Get records from a model
   */
  getRecords(modelId: string): DataRecord[] {
    return this.dataStore.getRecords(modelId);
  }

  /**
   * Get a single record
   */
  getRecord(modelId: string, recordId: string): DataRecord | undefined {
    return this.dataStore.getRecord(modelId, recordId);
  }

  /**
   * Create a record
   */
  async createRecord(modelId: string, data: Record<string, unknown>): Promise<DataRecord> {
    const result = await this.actionExecutor.execute({
      type: 'create_record',
      modelId,
      data,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data?.record as DataRecord;
  }

  /**
   * Update a record
   */
  async updateRecord(modelId: string, recordId: string, data: Record<string, unknown>): Promise<void> {
    const result = await this.actionExecutor.execute({
      type: 'update_record',
      modelId,
      recordId,
      data,
    });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(modelId: string, recordId: string): Promise<void> {
    const result = await this.actionExecutor.execute({
      type: 'delete_record',
      modelId,
      recordId,
    });

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  /**
   * Refresh app data from server
   */
  async refreshData(): Promise<void> {
    await this.actionExecutor.execute({ type: 'refresh_data' });
  }

  /**
   * Set custom state
   */
  setCustomState(key: string, value: unknown): void {
    this.stateManager.setCustomState(key, value);
  }

  /**
   * Get custom state
   */
  getCustomState<T = unknown>(key: string): T | undefined {
    return this.stateManager.getCustomState<T>(key);
  }

  /**
   * Subscribe to state changes
   */
  subscribeToState(key: string, callback: (value: unknown) => void): () => void {
    return this.stateManager.subscribe(key, callback);
  }

  /**
   * Subscribe to data changes
   */
  subscribeToData(modelId: string, callback: (records: DataRecord[]) => void): () => void {
    return this.dataStore.subscribe(modelId, (_, records) => callback(records as DataRecord[]));
  }

  /**
   * Subscribe to events
   */
  subscribeToEvent<T = unknown>(eventType: string, callback: (data: T) => void): () => void {
    const sub = this.eventBus.on<T>(eventType, callback);
    return sub.unsubscribe;
  }

  /**
   * Emit an event
   */
  emitEvent(eventType: string, data: unknown): void {
    this.eventBus.emitSync(eventType, data);
  }

  /**
   * Get the app
   */
  getApp(): App {
    return this.app;
  }

  /**
   * Update the app
   */
  updateApp(app: App): void {
    this.app = app;
    
    // Update data store
    if (app.data) {
      for (const [modelId, records] of Object.entries(app.data)) {
        if (Array.isArray(records)) {
          this.dataStore.setRecords(modelId, records);
        }
      }
    }

    // Update theme
    if (app.theme) {
      const normalizedTheme = {
        colors: app.theme.colors,
        typography: app.theme.typography as Record<string, { fontFamily?: string; fontSize?: string; fontWeight?: string | number; lineHeight?: string | number; letterSpacing?: string }>,
        spacing: app.theme.spacing as Record<string, string>,
        borderRadius: app.theme.borderRadius as Record<string, string> | undefined,
        shadows: app.theme.shadows as Record<string, string> | undefined,
      };
      this.dynamicStyler.setTheme(normalizedTheme);
    }
  }

  /**
   * Get layout presets
   */
  getLayoutPresets(): typeof LayoutPresets {
    return LayoutPresets;
  }

  /**
   * Destroy the runtime engine and clean up
   */
  destroy(): void {
    this.bindingEngine.clear();
    this.eventBus.clear();
    this.initialized = false;
  }

  /**
   * Get current user role
   */
  getCurrentRole(): NeoRole {
    return this.currentRole;
  }

  /**
   * Set current user role
   */
  setCurrentRole(role: NeoRole, userId?: string): void {
    this.currentRole = role;
    this.currentUserId = userId;
    const schema = this.app.schema as unknown as UnifiedAppSchema;
    this.permissionsService.updateContext({
      role,
      userId,
      schema,
    });
  }

  /**
   * Check if user can view a page
   */
  canViewPage(pageId: string): boolean {
    return this.permissionsService.canViewPage(pageId);
  }

  /**
   * Check if user can view a field
   */
  canViewField(entityId: string, fieldId: string): boolean {
    return this.permissionsService.canViewField(entityId, fieldId);
  }

  /**
   * Check if user can edit a field
   */
  canEditField(entityId: string, fieldId: string): boolean {
    return this.permissionsService.canEditField(entityId, fieldId);
  }

  /**
   * Filter rows based on visibility rules
   */
  filterRows(entityId: string, records: Record<string, unknown>[]): Record<string, unknown>[] {
    return this.permissionsService.filterRows(entityId, records);
  }

  /**
   * Check if user can perform an action
   */
  canPerformAction(actionId: string): boolean {
    return this.permissionsService.canPerformAction(actionId);
  }

  /**
   * Reset all singleton instances (for testing or app switching)
   */
  static resetAll(): void {
    resetEventBus();
    resetDataStore();
    resetStateManager();
  }
}

/**
 * Create a new runtime engine instance
 */
export function createRuntimeEngine(config: RuntimeConfig): RuntimeEngine {
  return new RuntimeEngine(config);
}
