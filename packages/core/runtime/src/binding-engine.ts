/**
 * Binding Engine - Field ↔ Component data binding system
 * Handles two-way data binding between data models and UI components
 */

import { RuntimeDataStore, DataRecord } from './data-store.js';
import { StateManager } from './state-manager.js';
import { EventBus, RuntimeEventType, getEventBus } from './event-system.js';

export interface BindingConfig {
  componentId: string;
  type: 'data' | 'state' | 'computed' | 'expression';
  source: BindingSource;
  target: BindingTarget;
  transform?: BindingTransform;
  twoWay?: boolean;
  debounce?: number;
}

export interface BindingSource {
  modelId?: string;
  recordId?: string;
  field?: string;
  stateKey?: string;
  expression?: string;
}

export interface BindingTarget {
  prop: string;
  type?: 'text' | 'value' | 'checked' | 'selected' | 'visible' | 'disabled' | 'style' | 'class';
}

export interface BindingTransform {
  type: 'format' | 'parse' | 'compute' | 'custom';
  format?: string;
  fn?: (value: unknown, context: BindingContext) => unknown;
}

export interface BindingContext {
  componentId: string;
  data: Record<string, DataRecord[]>;
  state: Record<string, unknown>;
  record?: DataRecord;
  index?: number;
}

export interface ActiveBinding {
  config: BindingConfig;
  unsubscribe: () => void;
  currentValue: unknown;
}

/**
 * BindingEngine - Manages data bindings between components and data
 */
export class BindingEngine {
  private dataStore: RuntimeDataStore;
  private stateManager: StateManager;
  private eventBus: EventBus;
  private bindings: Map<string, ActiveBinding[]>;
  private componentCallbacks: Map<string, Set<(prop: string, value: unknown) => void>>;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  private expressionCache: Map<string, Function>;

  constructor(
    dataStore: RuntimeDataStore,
    stateManager: StateManager,
    eventBus?: EventBus
  ) {
    this.dataStore = dataStore;
    this.stateManager = stateManager;
    this.eventBus = eventBus ?? getEventBus();
    this.bindings = new Map();
    this.componentCallbacks = new Map();
    this.debounceTimers = new Map();
    this.expressionCache = new Map();
  }

  /**
   * Create a binding for a component
   */
  bind(config: BindingConfig): () => void {
    const { componentId } = config;

    // Initialize bindings array for component
    if (!this.bindings.has(componentId)) {
      this.bindings.set(componentId, []);
    }

    let unsubscribe: () => void;

    switch (config.type) {
      case 'data':
        unsubscribe = this.createDataBinding(config);
        break;
      case 'state':
        unsubscribe = this.createStateBinding(config);
        break;
      case 'computed':
        unsubscribe = this.createComputedBinding(config);
        break;
      case 'expression':
        unsubscribe = this.createExpressionBinding(config);
        break;
      default:
        unsubscribe = () => {};
    }

    const activeBinding: ActiveBinding = {
      config,
      unsubscribe,
      currentValue: undefined,
    };

    this.bindings.get(componentId)!.push(activeBinding);

    // Initial evaluation
    this.evaluateBinding(activeBinding);

    return () => {
      unsubscribe();
      const bindings = this.bindings.get(componentId);
      if (bindings) {
        const index = bindings.indexOf(activeBinding);
        if (index !== -1) {
          bindings.splice(index, 1);
        }
      }
    };
  }

  /**
   * Create a data binding (from DataStore)
   */
  private createDataBinding(config: BindingConfig): () => void {
    const { source, componentId, debounce } = config;
    if (!source.modelId) return () => {};

    return this.dataStore.subscribe(source.modelId, (modelId, records, change) => {
      this.scheduleUpdate(componentId, config, debounce, () => {
        this.evaluateDataBinding(config, records as DataRecord[]);
      });
    });
  }

  /**
   * Create a state binding (from StateManager)
   */
  private createStateBinding(config: BindingConfig): () => void {
    const { source, componentId, debounce } = config;
    if (!source.stateKey) return () => {};

    return this.stateManager.subscribe(source.stateKey, (value) => {
      this.scheduleUpdate(componentId, config, debounce, () => {
        this.notifyComponent(componentId, config.target.prop, value, config.transform);
      });
    });
  }

  /**
   * Create a computed binding (derived from multiple sources)
   */
  private createComputedBinding(config: BindingConfig): () => void {
    // For computed bindings, we subscribe to all relevant data changes
    const unsubs: (() => void)[] = [];

    if (config.source.modelId) {
      unsubs.push(
        this.dataStore.subscribeAll((modelId, records, change) => {
          this.evaluateBinding(this.findActiveBinding(config.componentId, config));
        })
      );
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }

  /**
   * Create an expression binding (evaluated expression)
   */
  private createExpressionBinding(config: BindingConfig): () => void {
    const { source } = config;
    if (!source.expression) return () => {};

    // Subscribe to all data changes for expression evaluation
    return this.dataStore.subscribeAll((modelId, records, change) => {
      this.evaluateExpressionBinding(config);
    });
  }

  /**
   * Evaluate a data binding
   */
  private evaluateDataBinding(config: BindingConfig, records?: DataRecord[]): void {
    const { source, componentId, target, transform } = config;
    
    let value: unknown;

    if (source.recordId && source.field) {
      // Specific record and field
      const record = records?.find(r => r.id === source.recordId) ??
                     this.dataStore.getRecord(source.modelId!, source.recordId);
      value = record?.[source.field];
    } else if (source.field && records && records.length > 0) {
      // First record field
      value = records[0]?.[source.field];
    } else if (source.modelId && !source.field) {
      // Whole collection
      value = records ?? this.dataStore.getRecords(source.modelId);
    }

    this.notifyComponent(componentId, target.prop, value, transform);
  }

  /**
   * Evaluate an expression binding
   */
  private evaluateExpressionBinding(config: BindingConfig): void {
    const { source, componentId, target, transform } = config;
    if (!source.expression) return;

    try {
      const fn = this.getExpressionFunction(source.expression);
      const context = this.buildContext(componentId);
      const value = fn(context);
      this.notifyComponent(componentId, target.prop, value, transform);
    } catch (err) {
      console.error(`[BindingEngine] Expression evaluation error:`, err);
    }
  }

  /**
   * Get or create cached expression function
   */
  private getExpressionFunction(expression: string): Function {
    if (!this.expressionCache.has(expression)) {
      // Safe expression evaluation with limited scope
      const fn = new Function('ctx', `
        with (ctx) {
          return ${expression};
        }
      `);
      this.expressionCache.set(expression, fn);
    }
    return this.expressionCache.get(expression)!;
  }

  /**
   * Build context for expression evaluation
   */
  private buildContext(componentId: string): BindingContext {
    return {
      componentId,
      data: this.dataStore.getAllData(),
      state: this.stateManager.getState().custom,
    };
  }

  /**
   * Evaluate a binding
   */
  private evaluateBinding(activeBinding?: ActiveBinding): void {
    if (!activeBinding) return;

    const { config } = activeBinding;
    
    switch (config.type) {
      case 'data':
        this.evaluateDataBinding(config);
        break;
      case 'expression':
        this.evaluateExpressionBinding(config);
        break;
      case 'state':
        if (config.source.stateKey) {
          const value = this.stateManager.getCustomState(config.source.stateKey);
          this.notifyComponent(config.componentId, config.target.prop, value, config.transform);
        }
        break;
    }
  }

  /**
   * Find an active binding
   */
  private findActiveBinding(componentId: string, config: BindingConfig): ActiveBinding | undefined {
    const bindings = this.bindings.get(componentId);
    return bindings?.find(b => b.config === config);
  }

  /**
   * Schedule an update with optional debouncing
   */
  private scheduleUpdate(
    componentId: string,
    config: BindingConfig,
    debounce: number | undefined,
    callback: () => void
  ): void {
    const key = `${componentId}:${config.target.prop}`;

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (debounce && debounce > 0) {
      const timer = setTimeout(callback, debounce);
      this.debounceTimers.set(key, timer);
    } else {
      callback();
    }
  }

  /**
   * Notify component of value change
   */
  private notifyComponent(
    componentId: string,
    prop: string,
    value: unknown,
    transform?: BindingTransform
  ): void {
    // Apply transform if specified
    const transformedValue = transform ? this.applyTransform(value, transform, componentId) : value;

    // Update active binding's current value
    const bindings = this.bindings.get(componentId);
    if (bindings) {
      const binding = bindings.find(b => b.config.target.prop === prop);
      if (binding) {
        binding.currentValue = transformedValue;
      }
    }

    // Notify registered callbacks
    const callbacks = this.componentCallbacks.get(componentId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(prop, transformedValue);
        } catch (err) {
          console.error(`[BindingEngine] Error in component callback:`, err);
        }
      }
    }
  }

  /**
   * Apply a transform to a value
   */
  private applyTransform(
    value: unknown,
    transform: BindingTransform,
    componentId: string
  ): unknown {
    switch (transform.type) {
      case 'format':
        return this.formatValue(value, transform.format);
      case 'compute':
      case 'custom':
        if (transform.fn) {
          return transform.fn(value, this.buildContext(componentId));
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Format a value using a format string
   */
  private formatValue(value: unknown, format?: string): string {
    if (value === null || value === undefined) return '';
    
    if (!format) return String(value);

    // Common formats
    switch (format) {
      case 'currency':
        return typeof value === 'number' 
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
          : String(value);
      case 'date':
        return value instanceof Date || typeof value === 'string'
          ? new Date(value as string | Date).toLocaleDateString()
          : String(value);
      case 'datetime':
        return value instanceof Date || typeof value === 'string'
          ? new Date(value as string | Date).toLocaleString()
          : String(value);
      case 'time':
        return value instanceof Date || typeof value === 'string'
          ? new Date(value as string | Date).toLocaleTimeString()
          : String(value);
      case 'number':
        return typeof value === 'number'
          ? new Intl.NumberFormat('en-US').format(value)
          : String(value);
      case 'percent':
        return typeof value === 'number'
          ? new Intl.NumberFormat('en-US', { style: 'percent' }).format(value)
          : String(value);
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      default:
        return String(value);
    }
  }

  /**
   * Register a callback to receive binding updates for a component
   */
  registerCallback(componentId: string, callback: (prop: string, value: unknown) => void): () => void {
    if (!this.componentCallbacks.has(componentId)) {
      this.componentCallbacks.set(componentId, new Set());
    }
    this.componentCallbacks.get(componentId)!.add(callback);

    return () => {
      const callbacks = this.componentCallbacks.get(componentId);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Push a value from component back to data source (two-way binding)
   */
  pushValue(componentId: string, prop: string, value: unknown): void {
    const bindings = this.bindings.get(componentId);
    if (!bindings) return;

    const binding = bindings.find(b => b.config.target.prop === prop && b.config.twoWay);
    if (!binding) return;

    const { source } = binding.config;

    if (binding.config.type === 'data' && source.modelId && source.recordId && source.field) {
      this.dataStore.updateRecord(source.modelId, source.recordId, {
        [source.field]: value,
      });
    } else if (binding.config.type === 'state' && source.stateKey) {
      this.stateManager.setCustomState(source.stateKey, value);
    }
  }

  /**
   * Get current bound value for a component prop
   */
  getValue(componentId: string, prop: string): unknown {
    const bindings = this.bindings.get(componentId);
    if (!bindings) return undefined;

    const binding = bindings.find(b => b.config.target.prop === prop);
    return binding?.currentValue;
  }

  /**
   * Get all bindings for a component
   */
  getComponentBindings(componentId: string): BindingConfig[] {
    const bindings = this.bindings.get(componentId);
    return bindings?.map(b => b.config) ?? [];
  }

  /**
   * Remove all bindings for a component
   */
  unbindComponent(componentId: string): void {
    const bindings = this.bindings.get(componentId);
    if (bindings) {
      for (const binding of bindings) {
        binding.unsubscribe();
      }
      this.bindings.delete(componentId);
    }
    this.componentCallbacks.delete(componentId);

    // Clear debounce timers
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (key.startsWith(`${componentId}:`)) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    }
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    for (const bindings of this.bindings.values()) {
      for (const binding of bindings) {
        binding.unsubscribe();
      }
    }
    this.bindings.clear();
    this.componentCallbacks.clear();
    this.expressionCache.clear();
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}
