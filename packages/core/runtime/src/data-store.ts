/**
 * Runtime Data Store - Centralized reactive data management
 * Manages app data with subscriptions and change notifications
 */

import { EventBus, RuntimeEventType, getEventBus } from './event-system.js';

export type DataChangeListener<T = unknown> = (
  modelId: string,
  data: T[],
  change: DataChange
) => void;

export interface DataChange {
  type: 'create' | 'update' | 'delete' | 'replace' | 'clear';
  recordId?: string;
  record?: Record<string, unknown>;
  previousValue?: unknown;
}

export interface DataQuery {
  modelId: string;
  filter?: Record<string, unknown>;
  sort?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export interface DataRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * RuntimeDataStore - Reactive data store with subscriptions
 */
export class RuntimeDataStore {
  private data: Map<string, DataRecord[]>;
  private listeners: Map<string, Set<DataChangeListener>>;
  private globalListeners: Set<DataChangeListener>;
  private eventBus: EventBus;
  private transactionStack: Map<string, DataRecord[]>[];
  private idCounter: number;

  constructor(initialData?: Record<string, unknown[]>, eventBus?: EventBus) {
    this.data = new Map();
    this.listeners = new Map();
    this.globalListeners = new Set();
    this.eventBus = eventBus ?? getEventBus();
    this.transactionStack = [];
    this.idCounter = 0;

    // Initialize with initial data
    if (initialData) {
      this.initializeData(initialData);
    }
  }

  /**
   * Initialize store with data
   */
  private initializeData(initialData: Record<string, unknown[]>): void {
    for (const [modelId, records] of Object.entries(initialData)) {
      if (Array.isArray(records)) {
        this.data.set(modelId, records.map(r => this.normalizeRecord(r)));
      }
    }
  }

  /**
   * Normalize a record to ensure it has an ID
   */
  private normalizeRecord(record: unknown): DataRecord {
    if (typeof record !== 'object' || record === null) {
      return { id: this.generateId(), value: record };
    }
    
    const rec = record as Record<string, unknown>;
    return {
      ...rec,
      id: rec.id ? String(rec.id) : this.generateId(),
    } as DataRecord;
  }

  /**
   * Generate a unique ID
   */
  generateId(): string {
    return `rec_${++this.idCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all records from a model
   */
  getRecords(modelId: string): DataRecord[] {
    return [...(this.data.get(modelId) ?? [])];
  }

  /**
   * Get a single record by ID
   */
  getRecord(modelId: string, recordId: string): DataRecord | undefined {
    const records = this.data.get(modelId);
    return records?.find(r => r.id === recordId);
  }

  /**
   * Query records with filters, sorting, and pagination
   */
  query(queryOptions: DataQuery): DataRecord[] {
    let records = this.getRecords(queryOptions.modelId);

    // Apply filter
    if (queryOptions.filter) {
      records = records.filter(record => {
        return Object.entries(queryOptions.filter!).every(([key, value]) => {
          if (value === undefined) return true;
          
          // Handle special operators
          if (typeof value === 'object' && value !== null) {
            const ops = value as Record<string, unknown>;
            const recordValue = record[key];
            
            if ('$eq' in ops) return recordValue === ops.$eq;
            if ('$ne' in ops) return recordValue !== ops.$ne;
            if ('$gt' in ops) return (recordValue as number) > (ops.$gt as number);
            if ('$gte' in ops) return (recordValue as number) >= (ops.$gte as number);
            if ('$lt' in ops) return (recordValue as number) < (ops.$lt as number);
            if ('$lte' in ops) return (recordValue as number) <= (ops.$lte as number);
            if ('$in' in ops) return (ops.$in as unknown[]).includes(recordValue);
            if ('$nin' in ops) return !(ops.$nin as unknown[]).includes(recordValue);
            if ('$contains' in ops) return String(recordValue).includes(String(ops.$contains));
            if ('$startsWith' in ops) return String(recordValue).startsWith(String(ops.$startsWith));
            if ('$endsWith' in ops) return String(recordValue).endsWith(String(ops.$endsWith));
          }
          
          return record[key] === value;
        });
      });
    }

    // Apply sort
    if (queryOptions.sort) {
      const { field, direction } = queryOptions.sort;
      records.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        const comparison = aVal < bVal ? -1 : 1;
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    if (queryOptions.offset) {
      records = records.slice(queryOptions.offset);
    }
    if (queryOptions.limit) {
      records = records.slice(0, queryOptions.limit);
    }

    return records;
  }

  /**
   * Create a new record
   */
  createRecord(modelId: string, data: Record<string, unknown>): DataRecord {
    const record: DataRecord = {
      ...data,
      id: data.id ? String(data.id) : this.generateId(),
      createdAt: new Date().toISOString(),
    };

    if (!this.data.has(modelId)) {
      this.data.set(modelId, []);
    }
    this.data.get(modelId)!.push(record);

    const change: DataChange = {
      type: 'create',
      recordId: record.id,
      record,
    };

    this.notifyListeners(modelId, change);
    this.eventBus.emitSync(RuntimeEventType.DATA_CREATED, {
      modelId,
      record,
    });

    return record;
  }

  /**
   * Update an existing record
   */
  updateRecord(
    modelId: string,
    recordId: string,
    updates: Record<string, unknown>
  ): DataRecord | undefined {
    const records = this.data.get(modelId);
    if (!records) return undefined;

    const index = records.findIndex(r => r.id === recordId);
    if (index === -1) return undefined;

    const previousValue = { ...records[index] };
    const updatedRecord: DataRecord = {
      ...records[index],
      ...updates,
      id: recordId, // Preserve ID
      updatedAt: new Date().toISOString(),
    };
    records[index] = updatedRecord;

    const change: DataChange = {
      type: 'update',
      recordId,
      record: updatedRecord,
      previousValue,
    };

    this.notifyListeners(modelId, change);
    this.eventBus.emitSync(RuntimeEventType.DATA_UPDATED, {
      modelId,
      record: updatedRecord,
      previousValue,
    });

    return updatedRecord;
  }

  /**
   * Delete a record
   */
  deleteRecord(modelId: string, recordId: string): boolean {
    const records = this.data.get(modelId);
    if (!records) return false;

    const index = records.findIndex(r => r.id === recordId);
    if (index === -1) return false;

    const deletedRecord = records[index];
    records.splice(index, 1);

    const change: DataChange = {
      type: 'delete',
      recordId,
      previousValue: deletedRecord,
    };

    this.notifyListeners(modelId, change);
    this.eventBus.emitSync(RuntimeEventType.DATA_DELETED, {
      modelId,
      recordId,
      deletedRecord,
    });

    return true;
  }

  /**
   * Replace all records in a model
   */
  setRecords(modelId: string, records: unknown[]): void {
    const normalizedRecords = records.map(r => this.normalizeRecord(r));
    this.data.set(modelId, normalizedRecords);

    const change: DataChange = {
      type: 'replace',
    };

    this.notifyListeners(modelId, change);
    this.eventBus.emitSync(RuntimeEventType.DATA_REFRESHED, {
      modelId,
      records: normalizedRecords,
    });
  }

  /**
   * Clear all records from a model
   */
  clearModel(modelId: string): void {
    this.data.set(modelId, []);

    const change: DataChange = {
      type: 'clear',
    };

    this.notifyListeners(modelId, change);
  }

  /**
   * Get all data as a plain object
   */
  getAllData(): Record<string, DataRecord[]> {
    const result: Record<string, DataRecord[]> = {};
    for (const [modelId, records] of this.data) {
      result[modelId] = [...records];
    }
    return result;
  }

  /**
   * Subscribe to changes on a specific model
   */
  subscribe(modelId: string, listener: DataChangeListener): () => void {
    if (!this.listeners.has(modelId)) {
      this.listeners.set(modelId, new Set());
    }
    this.listeners.get(modelId)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(modelId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(modelId);
        }
      }
    };
  }

  /**
   * Subscribe to all data changes
   */
  subscribeAll(listener: DataChangeListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * Notify listeners of a change
   */
  private notifyListeners(modelId: string, change: DataChange): void {
    const records = this.getRecords(modelId);

    // Notify model-specific listeners
    const modelListeners = this.listeners.get(modelId);
    if (modelListeners) {
      for (const listener of modelListeners) {
        try {
          listener(modelId, records, change);
        } catch (err) {
          console.error(`[DataStore] Error in listener for ${modelId}:`, err);
        }
      }
    }

    // Notify global listeners
    for (const listener of this.globalListeners) {
      try {
        listener(modelId, records, change);
      } catch (err) {
        console.error(`[DataStore] Error in global listener:`, err);
      }
    }
  }

  /**
   * Begin a transaction (for atomic operations)
   */
  beginTransaction(): void {
    // Save current state
    const snapshot = new Map<string, DataRecord[]>();
    for (const [modelId, records] of this.data) {
      snapshot.set(modelId, records.map(r => ({ ...r })));
    }
    this.transactionStack.push(snapshot);
  }

  /**
   * Commit the current transaction
   */
  commitTransaction(): void {
    this.transactionStack.pop();
  }

  /**
   * Rollback the current transaction
   */
  rollbackTransaction(): void {
    const snapshot = this.transactionStack.pop();
    if (snapshot) {
      this.data = snapshot;
      // Notify all listeners of rollback
      for (const modelId of snapshot.keys()) {
        this.notifyListeners(modelId, { type: 'replace' });
      }
    }
  }

  /**
   * Get record count for a model
   */
  getCount(modelId: string): number {
    return this.data.get(modelId)?.length ?? 0;
  }

  /**
   * Check if a model exists and has data
   */
  hasModel(modelId: string): boolean {
    return this.data.has(modelId);
  }

  /**
   * Get all model IDs
   */
  getModelIds(): string[] {
    return Array.from(this.data.keys());
  }
}

// Singleton instance
let globalDataStore: RuntimeDataStore | null = null;

export function getDataStore(initialData?: Record<string, unknown[]>): RuntimeDataStore {
  if (!globalDataStore) {
    globalDataStore = new RuntimeDataStore(initialData);
  } else if (initialData) {
    // Merge initial data if store already exists
    for (const [modelId, records] of Object.entries(initialData)) {
      if (Array.isArray(records)) {
        globalDataStore.setRecords(modelId, records);
      }
    }
  }
  return globalDataStore;
}

export function resetDataStore(): void {
  globalDataStore = null;
}
