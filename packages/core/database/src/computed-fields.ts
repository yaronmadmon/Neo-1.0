/**
 * Computed Fields Engine
 * Evaluates computed/derived fields at runtime
 */

import type { ComputedFieldDef, ComputedFieldContext } from './types.js';

// ============================================================
// EXPRESSION PARSER & EVALUATOR
// ============================================================

type ExpressionValue = string | number | boolean | null | undefined | Record<string, unknown> | ExpressionValue[];

/**
 * Parse and evaluate expressions for computed fields
 */
export class ExpressionEvaluator {
  private functions: Map<string, (...args: ExpressionValue[]) => ExpressionValue>;

  constructor() {
    this.functions = new Map();
    this.registerBuiltinFunctions();
  }

  /**
   * Evaluate an expression against a record
   */
  evaluate(expression: string, context: ComputedFieldContext): ExpressionValue {
    try {
      // Simple expression parser for common patterns
      // Supports: field references, arithmetic, string concat, functions
      return this.parseAndEvaluate(expression, context);
    } catch (error) {
      console.error(`[ComputedFields] Error evaluating expression: ${expression}`, error);
      return null;
    }
  }

  /**
   * Parse and evaluate the expression
   */
  private parseAndEvaluate(expression: string, context: ComputedFieldContext): ExpressionValue {
    const trimmed = expression.trim();

    // Handle string literals
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Handle numeric literals
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Handle boolean literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    // Handle function calls: FUNCTION_NAME(args)
    const funcMatch = trimmed.match(/^(\w+)\((.*)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1].toUpperCase();
      const argsStr = funcMatch[2];
      const args = this.parseArguments(argsStr, context);
      return this.callFunction(funcName, args);
    }

    // Handle arithmetic expressions
    if (/[+\-*/%]/.test(trimmed) && !trimmed.includes('(')) {
      return this.evaluateArithmetic(trimmed, context);
    }

    // Handle ternary: condition ? trueVal : falseVal
    const ternaryMatch = trimmed.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
    if (ternaryMatch) {
      const condition = this.parseAndEvaluate(ternaryMatch[1], context);
      return condition
        ? this.parseAndEvaluate(ternaryMatch[2], context)
        : this.parseAndEvaluate(ternaryMatch[3], context);
    }

    // Handle comparison operators
    if (/[<>=!]/.test(trimmed)) {
      return this.evaluateComparison(trimmed, context);
    }

    // Handle field reference (path like "record.field" or just "field")
    return this.resolveFieldPath(trimmed, context);
  }

  /**
   * Parse function arguments
   */
  private parseArguments(argsStr: string, context: ComputedFieldContext): ExpressionValue[] {
    const args: ExpressionValue[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if ((char === '"' || char === "'") && argsStr[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      if (!inString) {
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (char === ',' && depth === 0) {
          args.push(this.parseAndEvaluate(current.trim(), context));
          current = '';
          continue;
        }
      }
      
      current += char;
    }

    if (current.trim()) {
      args.push(this.parseAndEvaluate(current.trim(), context));
    }

    return args;
  }

  /**
   * Call a built-in function
   */
  private callFunction(name: string, args: ExpressionValue[]): ExpressionValue {
    const func = this.functions.get(name);
    if (!func) {
      console.warn(`[ComputedFields] Unknown function: ${name}`);
      return null;
    }
    return func(...args);
  }

  /**
   * Evaluate arithmetic expression
   */
  private evaluateArithmetic(expression: string, context: ComputedFieldContext): number {
    // Tokenize
    const tokens: (string | number)[] = [];
    let current = '';
    
    for (const char of expression) {
      if ('+-*/%'.includes(char)) {
        if (current.trim()) {
          const val = this.parseAndEvaluate(current.trim(), context);
          tokens.push(Number(val) || 0);
        }
        tokens.push(char);
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      const val = this.parseAndEvaluate(current.trim(), context);
      tokens.push(Number(val) || 0);
    }

    // Evaluate with precedence (* / % before + -)
    // First pass: * / %
    let i = 1;
    while (i < tokens.length) {
      const op = tokens[i];
      if (op === '*' || op === '/' || op === '%') {
        const left = tokens[i - 1] as number;
        const right = tokens[i + 1] as number;
        let result: number;
        
        if (op === '*') result = left * right;
        else if (op === '/') result = right !== 0 ? left / right : 0;
        else result = left % right;
        
        tokens.splice(i - 1, 3, result);
      } else {
        i += 2;
      }
    }

    // Second pass: + -
    let result = tokens[0] as number;
    for (let j = 1; j < tokens.length; j += 2) {
      const op = tokens[j];
      const val = tokens[j + 1] as number;
      if (op === '+') result += val;
      else if (op === '-') result -= val;
    }

    return result;
  }

  /**
   * Evaluate comparison expression
   */
  private evaluateComparison(expression: string, context: ComputedFieldContext): boolean {
    const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
    
    for (const op of operators) {
      const idx = expression.indexOf(op);
      if (idx !== -1) {
        const left = this.parseAndEvaluate(expression.slice(0, idx).trim(), context);
        const right = this.parseAndEvaluate(expression.slice(idx + op.length).trim(), context);
        
        switch (op) {
          case '===': return left === right;
          case '!==': return left !== right;
          case '==': return left == right;
          case '!=': return left != right;
          case '>=': return Number(left) >= Number(right);
          case '<=': return Number(left) <= Number(right);
          case '>': return Number(left) > Number(right);
          case '<': return Number(left) < Number(right);
        }
      }
    }

    // Logical operators
    if (expression.includes('&&')) {
      const parts = expression.split('&&');
      return parts.every(p => Boolean(this.parseAndEvaluate(p.trim(), context)));
    }
    if (expression.includes('||')) {
      const parts = expression.split('||');
      return parts.some(p => Boolean(this.parseAndEvaluate(p.trim(), context)));
    }

    return Boolean(this.parseAndEvaluate(expression, context));
  }

  /**
   * Resolve a field path (e.g., "record.field" or "relatedData.entity.field")
   */
  private resolveFieldPath(path: string, context: ComputedFieldContext): ExpressionValue {
    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) return null;
      
      // Handle array access: field[0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const field = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        current = (current as Record<string, unknown>)[field];
        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return null;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current as ExpressionValue;
  }

  /**
   * Register built-in functions
   */
  private registerBuiltinFunctions(): void {
    // String functions
    this.functions.set('CONCAT', (...args) => args.map(String).join(''));
    this.functions.set('UPPER', (str) => String(str ?? '').toUpperCase());
    this.functions.set('LOWER', (str) => String(str ?? '').toLowerCase());
    this.functions.set('TRIM', (str) => String(str ?? '').trim());
    this.functions.set('LENGTH', (str) => String(str ?? '').length);
    this.functions.set('SUBSTRING', (str, start, len) => 
      String(str ?? '').substring(Number(start) || 0, len ? Number(len) : undefined));
    this.functions.set('REPLACE', (str, search, replace) => 
      String(str ?? '').replace(new RegExp(String(search), 'g'), String(replace)));
    this.functions.set('SPLIT', (str, sep) => String(str ?? '').split(String(sep)));

    // Math functions
    this.functions.set('ABS', (num) => Math.abs(Number(num) || 0));
    this.functions.set('ROUND', (num, decimals = 0) => {
      const factor = Math.pow(10, Number(decimals) || 0);
      return Math.round((Number(num) || 0) * factor) / factor;
    });
    this.functions.set('FLOOR', (num) => Math.floor(Number(num) || 0));
    this.functions.set('CEIL', (num) => Math.ceil(Number(num) || 0));
    this.functions.set('MIN', (...args) => Math.min(...args.map(a => Number(a) || 0)));
    this.functions.set('MAX', (...args) => Math.max(...args.map(a => Number(a) || 0)));
    this.functions.set('SUM', (...args) => args.reduce<number>((sum, a) => sum + (Number(a) || 0), 0));
    this.functions.set('AVG', (...args) => {
      const nums = args.map(a => Number(a) || 0);
      return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    });
    this.functions.set('POW', (base, exp) => Math.pow(Number(base) || 0, Number(exp) || 1));
    this.functions.set('SQRT', (num) => Math.sqrt(Number(num) || 0));

    // Date functions
    this.functions.set('NOW', () => new Date().toISOString());
    this.functions.set('TODAY', () => new Date().toISOString().split('T')[0]);
    this.functions.set('YEAR', (date) => new Date(String(date)).getFullYear());
    this.functions.set('MONTH', (date) => new Date(String(date)).getMonth() + 1);
    this.functions.set('DAY', (date) => new Date(String(date)).getDate());
    this.functions.set('DAYS_BETWEEN', (date1, date2) => {
      const d1 = new Date(String(date1));
      const d2 = new Date(String(date2));
      return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    });
    this.functions.set('DATE_ADD', (date, days) => {
      const d = new Date(String(date));
      d.setDate(d.getDate() + (Number(days) || 0));
      return d.toISOString();
    });
    this.functions.set('FORMAT_DATE', (date, format = 'YYYY-MM-DD') => {
      const d = new Date(String(date));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return String(format)
        .replace('YYYY', String(yyyy))
        .replace('MM', mm)
        .replace('DD', dd);
    });

    // Logic functions
    this.functions.set('IF', (condition, trueVal, falseVal) => condition ? trueVal : falseVal);
    this.functions.set('COALESCE', (...args) => args.find(a => a !== null && a !== undefined) ?? null);
    this.functions.set('ISNULL', (val) => val === null || val === undefined);
    this.functions.set('ISEMPTY', (val) => 
      val === null || val === undefined || val === '' || 
      (Array.isArray(val) && val.length === 0));

    // Array functions
    this.functions.set('COUNT', (arr) => Array.isArray(arr) ? arr.length : 0);
    this.functions.set('FIRST', (arr) => Array.isArray(arr) ? arr[0] : null);
    this.functions.set('LAST', (arr) => Array.isArray(arr) ? arr[arr.length - 1] : null);
    this.functions.set('CONTAINS', (arr, val) => 
      Array.isArray(arr) ? arr.includes(val) : String(arr).includes(String(val)));
    this.functions.set('JOIN', (arr, sep = ', ') => 
      Array.isArray(arr) ? arr.join(String(sep)) : String(arr));
    this.functions.set('FILTER', (arr, field, value) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => 
        typeof item === 'object' && item !== null && 
        (item as Record<string, unknown>)[String(field)] === value
      ) as ExpressionValue;
    });
    this.functions.set('MAP', (arr, field) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(item => 
        typeof item === 'object' && item !== null 
          ? (item as Record<string, unknown>)[String(field)]
          : item
      ) as ExpressionValue;
    });

    // Currency functions
    this.functions.set('FORMAT_CURRENCY', (amount, currency = 'USD') => {
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: String(currency),
        }).format(Number(amount) || 0);
      } catch {
        return `${currency} ${Number(amount).toFixed(2)}`;
      }
    });

    // Percentage functions
    this.functions.set('PERCENT', (value, total) => {
      const t = Number(total) || 1;
      return ((Number(value) || 0) / t) * 100;
    });
    this.functions.set('FORMAT_PERCENT', (value, decimals = 1) => 
      `${(Number(value) || 0).toFixed(Number(decimals))}%`);
  }

  /**
   * Register a custom function
   */
  registerFunction(name: string, fn: (...args: ExpressionValue[]) => ExpressionValue): void {
    this.functions.set(name.toUpperCase(), fn);
  }
}

// ============================================================
// COMPUTED FIELDS ENGINE
// ============================================================

export class ComputedFieldsEngine {
  private evaluator: ExpressionEvaluator;
  private fieldDefinitions: Map<string, Map<string, ComputedFieldDef>> = new Map();

  constructor() {
    this.evaluator = new ExpressionEvaluator();
  }

  /**
   * Register computed fields for an entity
   */
  registerFields(entityId: string, fields: ComputedFieldDef[]): void {
    const fieldMap = new Map(fields.map(f => [f.name, f]));
    this.fieldDefinitions.set(entityId, fieldMap);
  }

  /**
   * Get computed field definitions for an entity
   */
  getFields(entityId: string): ComputedFieldDef[] {
    const fields = this.fieldDefinitions.get(entityId);
    return fields ? Array.from(fields.values()) : [];
  }

  /**
   * Compute values for a single record
   */
  computeForRecord(
    entityId: string,
    record: Record<string, unknown>,
    relatedData?: Record<string, unknown[]>
  ): Record<string, unknown> {
    const fields = this.fieldDefinitions.get(entityId);
    if (!fields) return record;

    const context: ComputedFieldContext = {
      record,
      entity: entityId,
      relatedData,
    };

    const result = { ...record };
    
    // Evaluate in dependency order
    const evaluated = new Set<string>();
    const toEvaluate = [...fields.keys()];

    while (toEvaluate.length > 0) {
      const name = toEvaluate.shift()!;
      const field = fields.get(name)!;
      
      // Check if all dependencies are evaluated
      const depsReady = field.dependencies.every(dep => 
        evaluated.has(dep) || record[dep] !== undefined
      );

      if (depsReady) {
        result[name] = this.evaluator.evaluate(field.expression, {
          ...context,
          record: result, // Use partial result for chained computed fields
        });
        evaluated.add(name);
      } else {
        // Dependencies not ready, try again later
        toEvaluate.push(name);
      }
    }

    return result;
  }

  /**
   * Compute values for multiple records
   */
  computeForRecords(
    entityId: string,
    records: Record<string, unknown>[],
    relatedData?: Record<string, unknown[]>
  ): Record<string, unknown>[] {
    return records.map(record => this.computeForRecord(entityId, record, relatedData));
  }

  /**
   * Generate SQL for stored computed fields (used in CREATE TABLE)
   */
  generateStoredComputedColumnSql(field: ComputedFieldDef): string | null {
    if (field.type !== 'stored') return null;

    // Convert expression to SQL
    const sqlExpr = this.expressionToSql(field.expression);
    if (!sqlExpr) return null;

    return `"${this.toSnakeCase(field.name)}" ${field.returnType} GENERATED ALWAYS AS (${sqlExpr}) STORED`;
  }

  /**
   * Convert a simple expression to SQL (limited support)
   */
  private expressionToSql(expression: string): string | null {
    // Only support simple field arithmetic
    // Example: "quantity * unitPrice" -> "quantity * unit_price"
    
    // Protect string literals
    let sql = expression;
    
    // Convert field names to snake_case
    sql = sql.replace(/\b([a-z][a-zA-Z0-9]*)\b/g, (match) => {
      // Check if it's a function name
      if (this.isKnownSqlFunction(match)) {
        return match.toUpperCase();
      }
      // Convert to snake_case
      return this.toSnakeCase(match);
    });

    // Convert function names
    sql = sql
      .replace(/\bCONCAT\b/gi, 'CONCAT')
      .replace(/\bUPPER\b/gi, 'UPPER')
      .replace(/\bLOWER\b/gi, 'LOWER')
      .replace(/\bABS\b/gi, 'ABS')
      .replace(/\bROUND\b/gi, 'ROUND')
      .replace(/\bCOALESCE\b/gi, 'COALESCE')
      .replace(/\bNOW\(\)/gi, 'NOW()');

    return sql;
  }

  private isKnownSqlFunction(name: string): boolean {
    const sqlFunctions = [
      'CONCAT', 'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'SUBSTRING', 'REPLACE',
      'ABS', 'ROUND', 'FLOOR', 'CEIL', 'MIN', 'MAX', 'SUM', 'AVG', 'COUNT',
      'COALESCE', 'NULLIF', 'GREATEST', 'LEAST', 'NOW', 'DATE', 'EXTRACT',
    ];
    return sqlFunctions.includes(name.toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * Register a custom function for expressions
   */
  registerFunction(name: string, fn: (...args: ExpressionValue[]) => ExpressionValue): void {
    this.evaluator.registerFunction(name, fn);
  }
}

// Export singleton
export const computedFieldsEngine = new ComputedFieldsEngine();
