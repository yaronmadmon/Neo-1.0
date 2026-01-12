import type { App } from '@neo/contracts';

/**
 * App Runtime Engine
 * Executes and renders generated apps
 */
export class AppRuntime {
  private app: App;
  private state: RuntimeState;

  constructor(app: App) {
    this.app = app;
    this.state = this.initializeState();
  }

  /**
   * Initialize runtime state from app data
   */
  private initializeState(): RuntimeState {
    return {
      app: this.app,
      currentPage: this.app.schema.pages[0]?.id || 'main',
      data: this.app.data || {},
      history: [],
    };
  }

  /**
   * Get current app state
   */
  getState(): RuntimeState {
    return {
      app: this.state.app,
      currentPage: this.state.currentPage,
      data: { ...this.state.data },
      history: [...this.state.history],
    };
  }

  /**
   * Navigate to a different page
   */
  navigateTo(pageId: string): void {
    const page = this.app.schema.pages.find((p) => p.id === pageId);
    if (page) {
      this.state.currentPage = pageId;
      this.state.history.push({
        type: 'navigation',
        from: this.state.currentPage,
        to: pageId,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get current page
   */
  getCurrentPage() {
    return this.app.schema.pages.find((p) => p.id === this.state.currentPage);
  }

  /**
   * Add a record to a data model
   */
  addRecord(modelId: string, record: Record<string, unknown>): void {
    if (!this.state.data[modelId]) {
      this.state.data[modelId] = [];
    }

    const newRecord = {
      id: this.generateId(),
      ...record,
      createdAt: new Date().toISOString(),
    };

    this.state.data[modelId].push(newRecord);

    this.state.history.push({
      type: 'data',
      action: 'create',
      modelId,
      recordId: newRecord.id,
      timestamp: new Date(),
    });
  }

  /**
   * Update a record
   */
  updateRecord(
    modelId: string,
    recordId: string,
    updates: Record<string, unknown>
  ): void {
    const records = this.state.data[modelId];
    if (!records) return;

    const index = records.findIndex((r: any) => r.id === recordId);
    if (index === -1) return;

    const existingRecord = records[index] as Record<string, unknown>;
    records[index] = {
      ...existingRecord,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.state.history.push({
      type: 'data',
      action: 'update',
      modelId,
      recordId,
      timestamp: new Date(),
    });
  }

  /**
   * Delete a record
   */
  deleteRecord(modelId: string, recordId: string): void {
    const records = this.state.data[modelId];
    if (!records) return;

    const index = records.findIndex((r: any) => r.id === recordId);
    if (index === -1) return;

    records.splice(index, 1);

    this.state.history.push({
      type: 'data',
      action: 'delete',
      modelId,
      recordId,
      timestamp: new Date(),
    });
  }

  /**
   * Execute a flow
   */
  async executeFlow(flowId: string, triggerData: unknown): Promise<unknown> {
    // Import flow engine dynamically to avoid circular dependency
    const { CRUDFlowEngine } = await import('./flow-engine.js');
    const flowEngine = new CRUDFlowEngine(this);
    
    const result = await flowEngine.executeFlow(flowId, triggerData);
    
    // Log to history
    this.state.history.push({
      type: 'flow',
      flowId,
      triggerData,
      timestamp: new Date(),
      success: result.success,
    });
    
    return result;
  }

  /**
   * Get app schema
   */
  getSchema() {
    return this.app.schema;
  }

  /**
   * Get app theme
   */
  getTheme() {
    return this.app.theme;
  }

  /**
   * Get all records from a model
   */
  getRecords(modelId: string): unknown[] | undefined {
    return this.state.data[modelId];
  }

  /**
   * Get a specific record by ID
   */
  getRecord(modelId: string, recordId: string): unknown | undefined {
    const records = this.state.data[modelId];
    if (!records) return undefined;
    return records.find(r => (r as Record<string, unknown>).id === recordId);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface RuntimeState {
  app: App;
  currentPage: string;
  data: Record<string, unknown[]>;
  history: RuntimeHistoryEntry[];
}

export interface RuntimeHistoryEntry {
  type: 'navigation' | 'data' | 'flow';
  timestamp: Date;
  [key: string]: unknown;
}
