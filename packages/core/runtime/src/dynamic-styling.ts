/**
 * Dynamic Styling Engine
 * Applies styles based on data, state, and conditions
 */

import { RuntimeDataStore, DataRecord } from './data-store.js';
import { StateManager } from './state-manager.js';
import { ConditionalRenderer, ConditionConfig } from './conditional-renderer.js';

// CSS Properties type (compatible with CSSProperties)
export type CSSProperties = Record<string, string | number | undefined>;

export interface StyleRule {
  selector?: string;
  condition?: ConditionConfig | string | boolean;
  styles: StyleDefinition;
  priority?: number;
}

export interface StyleDefinition {
  [key: string]: string | number | undefined | StyleExpression;
}

export interface StyleExpression {
  type: 'value' | 'computed' | 'theme' | 'data';
  value?: string | number;
  expression?: string;
  themeKey?: string;
  dataPath?: string;
  fallback?: string | number;
}

export interface ThemeConfig {
  colors: Record<string, string>;
  typography: Record<string, TypographyConfig>;
  spacing: Record<string, string>;
  borderRadius?: Record<string, string>;
  shadows?: Record<string, string>;
  breakpoints?: Record<string, string>;
}

export interface TypographyConfig {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
}

export interface StyleContext {
  data: Record<string, DataRecord[]>;
  state: Record<string, unknown>;
  record?: DataRecord;
  index?: number;
  theme?: ThemeConfig;
}

/**
 * DynamicStyler - Computes and applies dynamic styles
 */
export class DynamicStyler {
  private dataStore: RuntimeDataStore;
  private stateManager: StateManager;
  private conditionalRenderer: ConditionalRenderer;
  private theme: ThemeConfig;
  private globalRules: StyleRule[];
  private componentRules: Map<string, StyleRule[]>;
  private styleCache: Map<string, CSSProperties>;
  private cssVariables: Map<string, string>;

  constructor(
    dataStore: RuntimeDataStore,
    stateManager: StateManager,
    theme?: ThemeConfig
  ) {
    this.dataStore = dataStore;
    this.stateManager = stateManager;
    this.conditionalRenderer = new ConditionalRenderer(dataStore, stateManager);
    this.theme = theme ?? this.getDefaultTheme();
    this.globalRules = [];
    this.componentRules = new Map();
    this.styleCache = new Map();
    this.cssVariables = new Map();

    // Initialize CSS variables from theme
    this.initCSSVariables();
  }

  /**
   * Get default theme
   */
  private getDefaultTheme(): ThemeConfig {
    return {
      colors: {
        primary: '#7c3aed',
        secondary: '#64748b',
        accent: '#06b6d4',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        border: '#e2e8f0',
      },
      typography: {
        h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
        h2: { fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.3 },
        h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
        h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
        body: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
        small: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
        caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5 },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    };
  }

  /**
   * Initialize CSS variables from theme
   */
  private initCSSVariables(): void {
    // Colors
    for (const [key, value] of Object.entries(this.theme.colors)) {
      this.cssVariables.set(`--color-${key}`, value);
    }

    // Spacing
    for (const [key, value] of Object.entries(this.theme.spacing)) {
      this.cssVariables.set(`--spacing-${key}`, value);
    }

    // Border radius
    if (this.theme.borderRadius) {
      for (const [key, value] of Object.entries(this.theme.borderRadius)) {
        this.cssVariables.set(`--radius-${key}`, value);
      }
    }

    // Shadows
    if (this.theme.shadows) {
      for (const [key, value] of Object.entries(this.theme.shadows)) {
        this.cssVariables.set(`--shadow-${key}`, value);
      }
    }
  }

  /**
   * Set theme
   */
  setTheme(theme: Partial<ThemeConfig>): void {
    this.theme = {
      ...this.theme,
      ...theme,
      colors: { ...this.theme.colors, ...theme.colors },
      typography: { ...this.theme.typography, ...theme.typography },
      spacing: { ...this.theme.spacing, ...theme.spacing },
    };
    this.initCSSVariables();
    this.clearCache();
  }

  /**
   * Get current theme
   */
  getTheme(): ThemeConfig {
    return this.theme;
  }

  /**
   * Get CSS variables as style object
   */
  getCSSVariables(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.cssVariables) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Add a global style rule
   */
  addGlobalRule(rule: StyleRule): void {
    this.globalRules.push(rule);
    this.globalRules.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    this.clearCache();
  }

  /**
   * Add a component-specific style rule
   */
  addComponentRule(componentId: string, rule: StyleRule): void {
    if (!this.componentRules.has(componentId)) {
      this.componentRules.set(componentId, []);
    }
    this.componentRules.get(componentId)!.push(rule);
    this.componentRules.get(componentId)!.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    this.clearCache();
  }

  /**
   * Compute styles for a component
   */
  computeStyles(
    componentId: string,
    baseStyles?: StyleDefinition,
    context?: Partial<StyleContext>
  ): CSSProperties {
    const fullContext = this.buildContext(context);
    const cacheKey = this.getCacheKey(componentId, baseStyles, fullContext);

    // Check cache
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey)!;
    }

    let styles: CSSProperties = {};

    // Apply global rules
    for (const rule of this.globalRules) {
      if (this.matchesRule(componentId, rule, fullContext)) {
        const resolvedStyles = this.resolveStyleDefinition(rule.styles, fullContext);
        styles = { ...styles, ...resolvedStyles };
      }
    }

    // Apply component-specific rules
    const componentRules = this.componentRules.get(componentId) ?? [];
    for (const rule of componentRules) {
      if (this.matchesRule(componentId, rule, fullContext)) {
        const resolvedStyles = this.resolveStyleDefinition(rule.styles, fullContext);
        styles = { ...styles, ...resolvedStyles };
      }
    }

    // Apply base styles (highest priority)
    if (baseStyles) {
      const resolvedBase = this.resolveStyleDefinition(baseStyles, fullContext);
      styles = { ...styles, ...resolvedBase };
    }

    // Cache and return
    this.styleCache.set(cacheKey, styles);
    return styles;
  }

  /**
   * Check if a rule matches
   */
  private matchesRule(componentId: string, rule: StyleRule, context: StyleContext): boolean {
    // Check selector
    if (rule.selector && rule.selector !== componentId) {
      // Simple selector matching (could be extended)
      if (!componentId.includes(rule.selector)) {
        return false;
      }
    }

    // Check condition
    if (rule.condition !== undefined) {
      return this.conditionalRenderer.evaluateCondition(rule.condition, {
        data: context.data,
        state: context.state,
        record: context.record,
        index: context.index,
      });
    }

    return true;
  }

  /**
   * Resolve a style definition
   */
  private resolveStyleDefinition(
    definition: StyleDefinition,
    context: StyleContext
  ): CSSProperties {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(definition)) {
      if (value === undefined) continue;

      const cssKey = this.toCSSProperty(key);
      result[cssKey] = this.resolveStyleValue(value, context);
    }

    return result as CSSProperties;
  }

  /**
   * Resolve a single style value
   */
  private resolveStyleValue(
    value: string | number | undefined | StyleExpression,
    context: StyleContext
  ): string | number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'string' || typeof value === 'number') {
      return this.interpolateValue(String(value), context);
    }

    // Handle StyleExpression
    switch (value.type) {
      case 'value':
        return value.value;

      case 'theme':
        return this.resolveThemeValue(value.themeKey || '', value.fallback);

      case 'data':
        return this.resolveDataValue(value.dataPath || '', context, value.fallback);

      case 'computed':
        return this.resolveComputedValue(value.expression || '', context, value.fallback);

      default:
        return value.fallback;
    }
  }

  /**
   * Interpolate a string value with variables
   */
  private interpolateValue(value: string, context: StyleContext): string | number {
    // Replace theme variables: ${theme.colors.primary}
    let result = value.replace(/\$\{theme\.([^}]+)\}/g, (_, path) => {
      return String(this.resolveThemeValue(path, ''));
    });

    // Replace data variables: ${data.modelId.0.field}
    result = result.replace(/\$\{data\.([^}]+)\}/g, (_, path) => {
      return String(this.resolveDataValue(path, context, ''));
    });

    // Replace state variables: ${state.key}
    result = result.replace(/\$\{state\.([^}]+)\}/g, (_, path) => {
      const value = this.resolvePath(context.state, path);
      return String(value ?? '');
    });

    // Replace CSS variables: var(--color-primary)
    result = result.replace(/var\(--([^)]+)\)/g, (match, varName) => {
      return this.cssVariables.get(`--${varName}`) ?? match;
    });

    return result;
  }

  /**
   * Resolve a theme value by path
   */
  private resolveThemeValue(path: string, fallback?: string | number): string | number {
    const parts = path.split('.');
    let current: unknown = this.theme;

    for (const part of parts) {
      if (current === null || current === undefined) return fallback ?? '';
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return fallback ?? '';
      }
    }

    return (current as string | number) ?? fallback ?? '';
  }

  /**
   * Resolve a data value by path
   */
  private resolveDataValue(
    path: string,
    context: StyleContext,
    fallback?: string | number
  ): string | number {
    const value = this.resolvePath({ ...context.data, record: context.record }, path);
    return (value as string | number) ?? fallback ?? '';
  }

  /**
   * Resolve a computed expression
   */
  private resolveComputedValue(
    expression: string,
    context: StyleContext,
    fallback?: string | number
  ): string | number {
    try {
      const fn = new Function('ctx', `with (ctx) { return ${expression}; }`);
      const result = fn({
        theme: this.theme,
        data: context.data,
        state: context.state,
        record: context.record,
        index: context.index,
      });
      return result ?? fallback ?? '';
    } catch (err) {
      console.error('[DynamicStyler] Expression error:', err);
      return fallback ?? '';
    }
  }

  /**
   * Resolve a path on an object
   */
  private resolvePath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Convert camelCase to CSS property
   */
  private toCSSProperty(key: string): string {
    // Already a CSS property (has hyphen)
    if (key.includes('-')) return key;
    // Convert camelCase to kebab-case
    return key.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  /**
   * Build full context
   */
  private buildContext(partial?: Partial<StyleContext>): StyleContext {
    return {
      data: partial?.data ?? this.dataStore.getAllData(),
      state: partial?.state ?? this.stateManager.getState().custom,
      record: partial?.record,
      index: partial?.index,
      theme: this.theme,
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    componentId: string,
    baseStyles: StyleDefinition | undefined,
    context: StyleContext
  ): string {
    return JSON.stringify({
      componentId,
      baseStyles,
      stateHash: Object.keys(context.state).join(','),
      recordId: context.record?.id,
      index: context.index,
    });
  }

  /**
   * Clear style cache
   */
  clearCache(): void {
    this.styleCache.clear();
  }

  /**
   * Generate responsive styles
   */
  getResponsiveStyles(
    styles: Record<string, StyleDefinition>,
    context?: Partial<StyleContext>
  ): CSSProperties {
    const fullContext = this.buildContext(context);
    let result: CSSProperties = {};

    // Apply styles in order: base, sm, md, lg, xl, 2xl
    const breakpointOrder = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
    
    for (const breakpoint of breakpointOrder) {
      if (styles[breakpoint]) {
        const resolvedStyles = this.resolveStyleDefinition(styles[breakpoint], fullContext);
        result = { ...result, ...resolvedStyles };
      }
    }

    return result;
  }

  /**
   * Create style helper functions for components
   */
  createStyleHelpers() {
    return {
      color: (key: string) => this.theme.colors[key] ?? key,
      spacing: (key: string) => this.theme.spacing[key] ?? key,
      radius: (key: string) => this.theme.borderRadius?.[key] ?? key,
      shadow: (key: string) => this.theme.shadows?.[key] ?? key,
      typography: (key: string) => this.theme.typography[key] ?? {},
      cssVar: (name: string) => `var(--${name})`,
    };
  }
}
