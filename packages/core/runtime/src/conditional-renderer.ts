/**
 * Conditional Rendering System
 * Handles show/hide, if/else, and conditional display of components
 */

import { RuntimeDataStore, DataRecord } from './data-store.js';
import { StateManager } from './state-manager.js';

export interface ConditionConfig {
  type: 'simple' | 'expression' | 'composite';
  field?: string;
  operator?: ConditionOperator;
  value?: unknown;
  expression?: string;
  conditions?: ConditionConfig[];
  logic?: 'and' | 'or';
}

export type ConditionOperator = 
  | 'equals' | 'notEquals'
  | 'contains' | 'notContains' | 'startsWith' | 'endsWith'
  | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual'
  | 'isEmpty' | 'isNotEmpty'
  | 'isTrue' | 'isFalse'
  | 'in' | 'notIn'
  | 'matches' | 'exists';

export interface ConditionalProps {
  show?: ConditionConfig | boolean | string;
  hide?: ConditionConfig | boolean | string;
  disabled?: ConditionConfig | boolean | string;
  visible?: ConditionConfig | boolean | string;
  readOnly?: ConditionConfig | boolean | string;
  className?: Record<string, ConditionConfig | boolean | string>;
  style?: Record<string, [ConditionConfig | boolean | string, unknown, unknown?]>;
}

export interface EvaluationContext {
  data: Record<string, DataRecord[]>;
  state: Record<string, unknown>;
  record?: DataRecord;
  index?: number;
  componentId?: string;
  formData?: Record<string, unknown>;
}

/**
 * ConditionalRenderer - Evaluates conditions for component visibility and state
 */
export class ConditionalRenderer {
  private dataStore: RuntimeDataStore;
  private stateManager: StateManager;
  private conditionCache: Map<string, { result: boolean; timestamp: number }>;
  private cacheTTL: number;

  constructor(
    dataStore: RuntimeDataStore,
    stateManager: StateManager,
    options?: { cacheTTL?: number }
  ) {
    this.dataStore = dataStore;
    this.stateManager = stateManager;
    this.conditionCache = new Map();
    this.cacheTTL = options?.cacheTTL ?? 100; // 100ms default cache
  }

  /**
   * Evaluate whether a component should be shown
   */
  shouldShow(props: ConditionalProps, context?: Partial<EvaluationContext>): boolean {
    const fullContext = this.buildContext(context);

    // Check 'hide' first (takes precedence)
    if (props.hide !== undefined) {
      const hideResult = this.evaluateCondition(props.hide, fullContext);
      if (hideResult) return false;
    }

    // Check 'show'
    if (props.show !== undefined) {
      return this.evaluateCondition(props.show, fullContext);
    }

    // Check 'visible' (alias for show)
    if (props.visible !== undefined) {
      return this.evaluateCondition(props.visible, fullContext);
    }

    return true; // Default to visible
  }

  /**
   * Evaluate whether a component should be disabled
   */
  shouldDisable(props: ConditionalProps, context?: Partial<EvaluationContext>): boolean {
    if (props.disabled === undefined) return false;
    return this.evaluateCondition(props.disabled, this.buildContext(context));
  }

  /**
   * Evaluate whether a component should be read-only
   */
  isReadOnly(props: ConditionalProps, context?: Partial<EvaluationContext>): boolean {
    if (props.readOnly === undefined) return false;
    return this.evaluateCondition(props.readOnly, this.buildContext(context));
  }

  /**
   * Evaluate conditional class names
   */
  evaluateClasses(props: ConditionalProps, context?: Partial<EvaluationContext>): string[] {
    if (!props.className) return [];

    const fullContext = this.buildContext(context);
    const classes: string[] = [];

    for (const [className, condition] of Object.entries(props.className)) {
      if (this.evaluateCondition(condition, fullContext)) {
        classes.push(className);
      }
    }

    return classes;
  }

  /**
   * Evaluate conditional styles
   */
  evaluateStyles(
    props: ConditionalProps,
    context?: Partial<EvaluationContext>
  ): Record<string, unknown> {
    if (!props.style) return {};

    const fullContext = this.buildContext(context);
    const styles: Record<string, unknown> = {};

    for (const [property, [condition, trueValue, falseValue]] of Object.entries(props.style)) {
      const result = this.evaluateCondition(condition, fullContext);
      styles[property] = result ? trueValue : (falseValue ?? undefined);
    }

    // Filter out undefined values
    return Object.fromEntries(
      Object.entries(styles).filter(([_, v]) => v !== undefined)
    );
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(
    condition: ConditionConfig | boolean | string | undefined,
    context: EvaluationContext
  ): boolean {
    if (condition === undefined) return true;
    if (typeof condition === 'boolean') return condition;
    if (typeof condition === 'string') return this.evaluateExpression(condition, context);
    
    return this.evaluateConditionConfig(condition, context);
  }

  /**
   * Evaluate a condition configuration
   */
  private evaluateConditionConfig(condition: ConditionConfig, context: EvaluationContext): boolean {
    switch (condition.type) {
      case 'simple':
        return this.evaluateSimpleCondition(condition, context);
      case 'expression':
        return this.evaluateExpression(condition.expression || '', context);
      case 'composite':
        return this.evaluateCompositeCondition(condition, context);
      default:
        return true;
    }
  }

  /**
   * Evaluate a simple field-based condition
   */
  private evaluateSimpleCondition(condition: ConditionConfig, context: EvaluationContext): boolean {
    const { field, operator, value } = condition;
    if (!field || !operator) return true;

    const fieldValue = this.resolveFieldValue(field, context);
    return this.compareValues(fieldValue, operator, value);
  }

  /**
   * Evaluate a composite condition (AND/OR)
   */
  private evaluateCompositeCondition(condition: ConditionConfig, context: EvaluationContext): boolean {
    const { conditions, logic = 'and' } = condition;
    if (!conditions || conditions.length === 0) return true;

    if (logic === 'and') {
      return conditions.every(c => this.evaluateConditionConfig(c, context));
    } else {
      return conditions.some(c => this.evaluateConditionConfig(c, context));
    }
  }

  /**
   * Evaluate a JavaScript expression
   */
  private evaluateExpression(expression: string, context: EvaluationContext): boolean {
    // Check cache
    const cacheKey = `${expression}:${JSON.stringify(context)}`;
    const cached = this.conditionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    try {
      const fn = new Function('ctx', `
        with (ctx) {
          return Boolean(${expression});
        }
      `);

      const evalContext = {
        ...context,
        record: context.record || {},
        data: context.data || {},
        state: context.state || {},
        formData: context.formData || {},
        // Helper functions
        count: (arr: unknown[]) => arr?.length ?? 0,
        isEmpty: (val: unknown) => val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0),
        isNotEmpty: (val: unknown) => !this.isEmpty(val),
        includes: (arr: unknown[], val: unknown) => Array.isArray(arr) && arr.includes(val),
        today: () => new Date().toISOString().split('T')[0],
        now: () => new Date().toISOString(),
      };

      const result = fn(evalContext);

      // Cache result
      this.conditionCache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (err) {
      console.error('[ConditionalRenderer] Expression evaluation error:', err);
      return false;
    }
  }

  /**
   * Resolve a field path to a value
   */
  private resolveFieldValue(field: string, context: EvaluationContext): unknown {
    const parts = field.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      if (typeof current === 'object') {
        // Handle special prefixes
        if (part === 'data' && context.data) {
          current = context.data;
        } else if (part === 'state' && context.state) {
          current = context.state;
        } else if (part === 'record' && context.record) {
          current = context.record;
        } else if (part === 'formData' && context.formData) {
          current = context.formData;
        } else {
          current = (current as Record<string, unknown>)[part];
        }
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Compare values using an operator
   */
  private compareValues(fieldValue: unknown, operator: ConditionOperator, compareValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
        
      case 'notEquals':
        return fieldValue !== compareValue;
        
      case 'contains':
        return String(fieldValue).includes(String(compareValue));
        
      case 'notContains':
        return !String(fieldValue).includes(String(compareValue));
        
      case 'startsWith':
        return String(fieldValue).startsWith(String(compareValue));
        
      case 'endsWith':
        return String(fieldValue).endsWith(String(compareValue));
        
      case 'greaterThan':
        return Number(fieldValue) > Number(compareValue);
        
      case 'lessThan':
        return Number(fieldValue) < Number(compareValue);
        
      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(compareValue);
        
      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(compareValue);
        
      case 'isEmpty':
        return this.isEmpty(fieldValue);
        
      case 'isNotEmpty':
        return !this.isEmpty(fieldValue);
        
      case 'isTrue':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
        
      case 'isFalse':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
        
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
        
      case 'notIn':
        return !Array.isArray(compareValue) || !compareValue.includes(fieldValue);
        
      case 'matches':
        try {
          return new RegExp(String(compareValue)).test(String(fieldValue));
        } catch {
          return false;
        }
        
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
        
      default:
        return true;
    }
  }

  /**
   * Check if a value is empty
   */
  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  }

  /**
   * Build full evaluation context
   */
  private buildContext(partial?: Partial<EvaluationContext>): EvaluationContext {
    return {
      data: partial?.data ?? this.dataStore.getAllData(),
      state: partial?.state ?? this.stateManager.getState().custom,
      record: partial?.record,
      index: partial?.index,
      componentId: partial?.componentId,
      formData: partial?.formData,
    };
  }

  /**
   * Clear condition cache
   */
  clearCache(): void {
    this.conditionCache.clear();
  }

  /**
   * Create a condition builder (fluent API)
   */
  static condition(): ConditionBuilder {
    return new ConditionBuilder();
  }
}

/**
 * Fluent condition builder
 */
export class ConditionBuilder {
  private config: ConditionConfig;

  constructor() {
    this.config = { type: 'simple' };
  }

  field(name: string): this {
    this.config.field = name;
    return this;
  }

  equals(value: unknown): this {
    this.config.operator = 'equals';
    this.config.value = value;
    return this;
  }

  notEquals(value: unknown): this {
    this.config.operator = 'notEquals';
    this.config.value = value;
    return this;
  }

  contains(value: string): this {
    this.config.operator = 'contains';
    this.config.value = value;
    return this;
  }

  greaterThan(value: number): this {
    this.config.operator = 'greaterThan';
    this.config.value = value;
    return this;
  }

  lessThan(value: number): this {
    this.config.operator = 'lessThan';
    this.config.value = value;
    return this;
  }

  isEmpty(): this {
    this.config.operator = 'isEmpty';
    return this;
  }

  isNotEmpty(): this {
    this.config.operator = 'isNotEmpty';
    return this;
  }

  isTrue(): this {
    this.config.operator = 'isTrue';
    return this;
  }

  isFalse(): this {
    this.config.operator = 'isFalse';
    return this;
  }

  in(values: unknown[]): this {
    this.config.operator = 'in';
    this.config.value = values;
    return this;
  }

  expression(expr: string): this {
    this.config.type = 'expression';
    this.config.expression = expr;
    return this;
  }

  and(...conditions: ConditionConfig[]): this {
    this.config.type = 'composite';
    this.config.logic = 'and';
    this.config.conditions = conditions;
    return this;
  }

  or(...conditions: ConditionConfig[]): this {
    this.config.type = 'composite';
    this.config.logic = 'or';
    this.config.conditions = conditions;
    return this;
  }

  build(): ConditionConfig {
    return { ...this.config };
  }
}
