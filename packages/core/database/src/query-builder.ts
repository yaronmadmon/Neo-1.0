/**
 * Query Builder
 * Builds SQL queries with filters, sorting, pagination
 */

import type { QueryFilter, QuerySort, QueryPagination, FilterOperator } from './types.js';

// ============================================================
// QUERY BUILDER
// ============================================================

export class QueryBuilder {
  private schema: string;
  private table: string;
  private selectFields: string[] = ['*'];
  private whereConditions: string[] = [];
  private whereParams: unknown[] = [];
  private orderByClause: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private distinctOn?: string[];
  private joins: string[] = [];
  private groupByClause: string[] = [];
  private havingConditions: string[] = [];
  private paramCounter = 0;

  constructor(table: string, schema = 'public') {
    this.table = table;
    this.schema = schema;
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.whereParams = [];
    this.orderByClause = [];
    this.limitValue = undefined;
    this.offsetValue = undefined;
    this.distinctOn = undefined;
    this.joins = [];
    this.groupByClause = [];
    this.havingConditions = [];
    this.paramCounter = 0;
    return this;
  }

  /**
   * Select specific fields
   */
  select(fields: string | string[]): this {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * Add distinct clause
   */
  distinct(fields?: string[]): this {
    this.distinctOn = fields;
    return this;
  }

  /**
   * Add a filter condition
   */
  where(filter: QueryFilter): this {
    const condition = this.buildFilterCondition(filter);
    if (condition) {
      this.whereConditions.push(condition.sql);
      this.whereParams.push(...condition.params);
    }
    return this;
  }

  /**
   * Add multiple filters (AND)
   */
  whereAll(filters: QueryFilter[]): this {
    for (const filter of filters) {
      this.where(filter);
    }
    return this;
  }

  /**
   * Add OR conditions
   */
  whereOr(filters: QueryFilter[]): this {
    const conditions: string[] = [];
    const params: unknown[] = [];
    
    for (const filter of filters) {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        conditions.push(condition.sql);
        params.push(...condition.params);
      }
    }
    
    if (conditions.length > 0) {
      this.whereConditions.push(`(${conditions.join(' OR ')})`);
      this.whereParams.push(...params);
    }
    
    return this;
  }

  /**
   * Add raw where clause
   */
  whereRaw(sql: string, params: unknown[] = []): this {
    // Renumber parameters
    let adjustedSql = sql;
    let paramOffset = this.paramCounter;
    for (let i = params.length; i >= 1; i--) {
      adjustedSql = adjustedSql.replace(new RegExp(`\\$${i}(?!\\d)`, 'g'), `$${i + paramOffset}`);
    }
    this.paramCounter += params.length;
    
    this.whereConditions.push(adjustedSql);
    this.whereParams.push(...params);
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(table: string, on: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER'): this {
    const qualifiedTable = `"${this.schema}"."${table}"`;
    this.joins.push(`${type} JOIN ${qualifiedTable} ON ${on}`);
    return this;
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table: string, on: string): this {
    return this.join(table, on, 'LEFT');
  }

  /**
   * Add ORDER BY
   */
  orderBy(sort: QuerySort | QuerySort[]): this {
    const sorts = Array.isArray(sort) ? sort : [sort];
    for (const s of sorts) {
      const nullsOrder = s.nulls ? ` NULLS ${s.nulls.toUpperCase()}` : '';
      this.orderByClause.push(`"${this.toSnakeCase(s.field)}" ${s.direction.toUpperCase()}${nullsOrder}`);
    }
    return this;
  }

  /**
   * Add GROUP BY
   */
  groupBy(fields: string | string[]): this {
    const fieldsArr = Array.isArray(fields) ? fields : [fields];
    this.groupByClause.push(...fieldsArr.map(f => `"${this.toSnakeCase(f)}"`));
    return this;
  }

  /**
   * Add HAVING
   */
  having(sql: string, params: unknown[] = []): this {
    this.havingConditions.push(sql);
    this.whereParams.push(...params);
    return this;
  }

  /**
   * Set pagination
   */
  paginate(pagination: QueryPagination): this {
    this.limitValue = pagination.limit;
    this.offsetValue = pagination.offset;
    return this;
  }

  /**
   * Set limit
   */
  limit(limit: number): this {
    this.limitValue = limit;
    return this;
  }

  /**
   * Set offset
   */
  offset(offset: number): this {
    this.offsetValue = offset;
    return this;
  }

  /**
   * Build the SELECT query
   */
  buildSelect(): { sql: string; params: unknown[] } {
    const parts: string[] = [];
    const qualifiedTable = `"${this.schema}"."${this.table}"`;

    // SELECT
    const selectStr = this.selectFields
      .map(f => f === '*' ? `${qualifiedTable}.*` : `"${this.toSnakeCase(f)}"`)
      .join(', ');
    
    if (this.distinctOn && this.distinctOn.length > 0) {
      const distinctFields = this.distinctOn.map(f => `"${this.toSnakeCase(f)}"`).join(', ');
      parts.push(`SELECT DISTINCT ON (${distinctFields}) ${selectStr}`);
    } else {
      parts.push(`SELECT ${selectStr}`);
    }

    // FROM
    parts.push(`FROM ${qualifiedTable}`);

    // JOINS
    if (this.joins.length > 0) {
      parts.push(...this.joins);
    }

    // WHERE
    if (this.whereConditions.length > 0) {
      parts.push(`WHERE ${this.whereConditions.join(' AND ')}`);
    }

    // GROUP BY
    if (this.groupByClause.length > 0) {
      parts.push(`GROUP BY ${this.groupByClause.join(', ')}`);
    }

    // HAVING
    if (this.havingConditions.length > 0) {
      parts.push(`HAVING ${this.havingConditions.join(' AND ')}`);
    }

    // ORDER BY
    if (this.orderByClause.length > 0) {
      parts.push(`ORDER BY ${this.orderByClause.join(', ')}`);
    }

    // LIMIT
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`);
    }

    // OFFSET
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET ${this.offsetValue}`);
    }

    return {
      sql: parts.join('\n'),
      params: this.whereParams,
    };
  }

  /**
   * Build a COUNT query
   */
  buildCount(): { sql: string; params: unknown[] } {
    const qualifiedTable = `"${this.schema}"."${this.table}"`;
    const parts: string[] = [];

    parts.push(`SELECT COUNT(*) as count`);
    parts.push(`FROM ${qualifiedTable}`);

    if (this.joins.length > 0) {
      parts.push(...this.joins);
    }

    if (this.whereConditions.length > 0) {
      parts.push(`WHERE ${this.whereConditions.join(' AND ')}`);
    }

    return {
      sql: parts.join('\n'),
      params: this.whereParams,
    };
  }

  /**
   * Build INSERT query
   */
  buildInsert(data: Record<string, unknown>): { sql: string; params: unknown[] } {
    const qualifiedTable = `"${this.schema}"."${this.table}"`;
    const columns: string[] = [];
    const placeholders: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        columns.push(`"${this.toSnakeCase(key)}"`);
        placeholders.push(`$${paramIndex++}`);
        params.push(this.serializeValue(value));
      }
    }

    const sql = `
INSERT INTO ${qualifiedTable} (${columns.join(', ')})
VALUES (${placeholders.join(', ')})
RETURNING *
`.trim();

    return { sql, params };
  }

  /**
   * Build bulk INSERT query
   */
  buildBulkInsert(records: Record<string, unknown>[]): { sql: string; params: unknown[] } {
    if (records.length === 0) {
      throw new Error('Cannot build bulk insert with empty records');
    }

    const qualifiedTable = `"${this.schema}"."${this.table}"`;
    
    // Get all unique columns from all records
    const columnSet = new Set<string>();
    for (const record of records) {
      for (const key of Object.keys(record)) {
        columnSet.add(key);
      }
    }
    const columns = Array.from(columnSet);
    const columnsSql = columns.map(c => `"${this.toSnakeCase(c)}"`).join(', ');

    const params: unknown[] = [];
    const valueRows: string[] = [];
    let paramIndex = 1;

    for (const record of records) {
      const placeholders: string[] = [];
      for (const col of columns) {
        const value = record[col];
        if (value === undefined) {
          placeholders.push('DEFAULT');
        } else {
          placeholders.push(`$${paramIndex++}`);
          params.push(this.serializeValue(value));
        }
      }
      valueRows.push(`(${placeholders.join(', ')})`);
    }

    const sql = `
INSERT INTO ${qualifiedTable} (${columnsSql})
VALUES ${valueRows.join(',\n')}
RETURNING *
`.trim();

    return { sql, params };
  }

  /**
   * Build UPDATE query
   */
  buildUpdate(data: Record<string, unknown>): { sql: string; params: unknown[] } {
    const qualifiedTable = `"${this.schema}"."${this.table}"`;
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'id' && value !== undefined) {
        setClauses.push(`"${this.toSnakeCase(key)}" = $${paramIndex++}`);
        params.push(this.serializeValue(value));
      }
    }

    // Renumber where params
    const whereClause = this.whereConditions.map(cond => {
      return cond.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + paramIndex - 1}`);
    }).join(' AND ');

    params.push(...this.whereParams);

    const sql = `
UPDATE ${qualifiedTable}
SET ${setClauses.join(', ')}, "updated_at" = NOW()
${whereClause ? `WHERE ${whereClause}` : ''}
RETURNING *
`.trim();

    return { sql, params };
  }

  /**
   * Build DELETE query
   */
  buildDelete(): { sql: string; params: unknown[] } {
    const qualifiedTable = `"${this.schema}"."${this.table}"`;
    
    let sql = `DELETE FROM ${qualifiedTable}`;
    
    if (this.whereConditions.length > 0) {
      sql += `\nWHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    sql += '\nRETURNING *';

    return { sql, params: this.whereParams };
  }

  /**
   * Build soft DELETE (UPDATE deleted_at)
   */
  buildSoftDelete(): { sql: string; params: unknown[] } {
    const qualifiedTable = `"${this.schema}"."${this.table}"`;
    
    let sql = `UPDATE ${qualifiedTable} SET "deleted_at" = NOW()`;
    
    if (this.whereConditions.length > 0) {
      sql += `\nWHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    sql += '\nRETURNING *';

    return { sql, params: this.whereParams };
  }

  /**
   * Build a filter condition
   */
  private buildFilterCondition(filter: QueryFilter): { sql: string; params: unknown[] } | null {
    const column = `"${this.toSnakeCase(filter.field)}"`;
    const paramNum = ++this.paramCounter;

    switch (filter.operator) {
      case 'eq':
        return { sql: `${column} = $${paramNum}`, params: [filter.value] };
      
      case 'neq':
        return { sql: `${column} != $${paramNum}`, params: [filter.value] };
      
      case 'gt':
        return { sql: `${column} > $${paramNum}`, params: [filter.value] };
      
      case 'gte':
        return { sql: `${column} >= $${paramNum}`, params: [filter.value] };
      
      case 'lt':
        return { sql: `${column} < $${paramNum}`, params: [filter.value] };
      
      case 'lte':
        return { sql: `${column} <= $${paramNum}`, params: [filter.value] };
      
      case 'in':
        if (!Array.isArray(filter.value) || filter.value.length === 0) return null;
        return { sql: `${column} = ANY($${paramNum})`, params: [filter.value] };
      
      case 'nin':
        if (!Array.isArray(filter.value) || filter.value.length === 0) return null;
        return { sql: `${column} != ALL($${paramNum})`, params: [filter.value] };
      
      case 'like':
        return { sql: `${column} LIKE $${paramNum}`, params: [`%${filter.value}%`] };
      
      case 'ilike':
        return { sql: `${column} ILIKE $${paramNum}`, params: [`%${filter.value}%`] };
      
      case 'contains':
        return { sql: `${column} ILIKE $${paramNum}`, params: [`%${filter.value}%`] };
      
      case 'startsWith':
        return { sql: `${column} ILIKE $${paramNum}`, params: [`${filter.value}%`] };
      
      case 'endsWith':
        return { sql: `${column} ILIKE $${paramNum}`, params: [`%${filter.value}`] };
      
      case 'isNull':
        this.paramCounter--; // No param needed
        return { sql: `${column} IS NULL`, params: [] };
      
      case 'isNotNull':
        this.paramCounter--; // No param needed
        return { sql: `${column} IS NOT NULL`, params: [] };
      
      case 'between':
        if (!Array.isArray(filter.value) || filter.value.length !== 2) return null;
        const paramNum2 = ++this.paramCounter;
        return { 
          sql: `${column} BETWEEN $${paramNum} AND $${paramNum2}`, 
          params: filter.value 
        };
      
      case 'jsonContains':
        return { sql: `${column} @> $${paramNum}::jsonb`, params: [JSON.stringify(filter.value)] };
      
      default:
        return null;
    }
  }

  /**
   * Serialize a value for SQL
   */
  private serializeValue(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}

/**
 * Create a new query builder
 */
export function query(table: string, schema = 'public'): QueryBuilder {
  return new QueryBuilder(table, schema);
}
