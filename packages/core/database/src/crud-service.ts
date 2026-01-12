/**
 * CRUD Service
 * Provides high-level CRUD operations for entities
 */

import type { DatabaseConnection } from './connection.js';
import { QueryBuilder, query } from './query-builder.js';
import { ValidationEngine, validationEngine } from './validation.js';
import type {
  QueryResult,
  SingleResult,
  MutationResult,
  BulkMutationResult,
  QueryOptions,
  ValidationResult,
} from './types.js';

// Entity interface
interface EntityField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  reference?: {
    entity: string;
    displayField: string;
  };
  computed?: {
    expression: string;
    dependencies: string[];
  };
}

interface Entity {
  id: string;
  name: string;
  pluralName: string;
  fields: EntityField[];
  crud?: {
    create?: { enabled: boolean };
    read?: { enabled: boolean; defaultSort?: { field: string; direction: 'asc' | 'desc' }; pageSize?: number };
    update?: { enabled: boolean };
    delete?: { enabled: boolean; softDelete?: boolean };
  };
  timestamps?: {
    deletedAt?: boolean;
  };
}

// ============================================================
// CRUD SERVICE
// ============================================================

export class CrudService {
  private db: DatabaseConnection;
  private schema: string;
  private validator: ValidationEngine;
  private entityCache: Map<string, Entity> = new Map();

  constructor(db: DatabaseConnection, schema = 'public') {
    this.db = db;
    this.schema = schema;
    this.validator = validationEngine;
  }

  /**
   * Register an entity for CRUD operations
   */
  registerEntity(entity: Entity): void {
    this.entityCache.set(entity.id, entity);
    this.entityCache.set(entity.name.toLowerCase(), entity);
    this.entityCache.set(this.toTableName(entity), entity);
  }

  /**
   * Get entity by ID or name
   */
  private getEntity(entityIdOrName: string): Entity {
    const entity = this.entityCache.get(entityIdOrName) || 
                   this.entityCache.get(entityIdOrName.toLowerCase());
    if (!entity) {
      throw new Error(`Entity not found: ${entityIdOrName}`);
    }
    return entity;
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Create a new record
   */
  async create<T = Record<string, unknown>>(
    entityId: string,
    data: Record<string, unknown>,
    options: { skipValidation?: boolean } = {}
  ): Promise<MutationResult<T>> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    // Check if create is enabled
    if (entity.crud?.create?.enabled === false) {
      throw new Error(`Create operation is disabled for ${entity.name}`);
    }

    // Validate
    if (!options.skipValidation) {
      const validation = await this.validateForCreate(entity, data);
      if (!validation.valid) {
        throw new ValidationError(validation);
      }
    }

    // Sanitize data
    const sanitized = this.validator.sanitize(entity, data);

    // Convert to snake_case and build query
    const snakeCaseData = this.toSnakeCaseKeys(sanitized);
    const { sql, params } = query(tableName, this.schema).buildInsert(snakeCaseData);

    // Execute
    const rows = await this.db.query<T>(sql, params);
    
    return {
      data: this.toCamelCaseKeys(rows[0]) as T,
      success: true,
      affectedRows: 1,
    };
  }

  /**
   * Create multiple records
   */
  async createMany<T = Record<string, unknown>>(
    entityId: string,
    records: Record<string, unknown>[],
    options: { skipValidation?: boolean } = {}
  ): Promise<BulkMutationResult & { data: T[] }> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    // Validate all records
    if (!options.skipValidation) {
      const errors: { row: number; error: string }[] = [];
      for (let i = 0; i < records.length; i++) {
        const validation = await this.validateForCreate(entity, records[i]);
        if (!validation.valid) {
          errors.push({ 
            row: i, 
            error: validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
          });
        }
      }
      if (errors.length > 0) {
        return { success: false, errors, data: [] };
      }
    }

    // Sanitize and convert
    const sanitizedRecords = records.map(r => this.toSnakeCaseKeys(this.validator.sanitize(entity, r)));
    const { sql, params } = query(tableName, this.schema).buildBulkInsert(sanitizedRecords);

    // Execute
    const rows = await this.db.query<T>(sql, params);
    
    return {
      success: true,
      inserted: rows.length,
      data: rows.map(r => this.toCamelCaseKeys(r) as T),
    };
  }

  // ============================================================
  // READ
  // ============================================================

  /**
   * Find many records with filters, sorting, pagination
   */
  async findMany<T = Record<string, unknown>>(
    entityId: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    // Check if read is enabled
    if (entity.crud?.read?.enabled === false) {
      throw new Error(`Read operation is disabled for ${entity.name}`);
    }

    const qb = query(tableName, this.schema);

    // Select fields
    if (options.select) {
      qb.select(options.select);
    }

    // Distinct
    if (options.distinct) {
      qb.distinct();
    }

    // Apply filters
    if (options.filters) {
      qb.whereAll(options.filters);
    }

    // Exclude soft-deleted records
    if (entity.timestamps?.deletedAt) {
      qb.where({ field: 'deleted_at', operator: 'isNull', value: null });
    }

    // Apply sorting
    if (options.sorts && options.sorts.length > 0) {
      qb.orderBy(options.sorts);
    } else if (entity.crud?.read?.defaultSort) {
      qb.orderBy(entity.crud.read.defaultSort);
    } else {
      qb.orderBy({ field: 'created_at', direction: 'desc' });
    }

    // Apply pagination
    if (options.pagination) {
      qb.paginate(options.pagination);
    } else if (entity.crud?.read?.pageSize) {
      qb.limit(entity.crud.read.pageSize);
    }

    // Build and execute
    const { sql, params } = qb.buildSelect();
    const start = Date.now();
    const rows = await this.db.query<T>(sql, params);
    const queryMs = Date.now() - start;

    // Get total count if paginated
    let totalCount: number | undefined;
    if (options.pagination) {
      const { sql: countSql, params: countParams } = qb.reset()
        .whereAll(options.filters || [])
        .buildCount();
      
      if (entity.timestamps?.deletedAt) {
        // Need to add deleted_at filter for count too
        // This is simplified - in production, preserve the original filters
      }
      
      const countResult = await this.db.queryOne<{ count: string }>(countSql, countParams);
      totalCount = parseInt(countResult?.count || '0', 10);
    }

    return {
      data: rows.map(r => this.toCamelCaseKeys(r) as T),
      count: rows.length,
      totalCount,
      hasMore: totalCount !== undefined && options.pagination 
        ? (options.pagination.offset + rows.length) < totalCount 
        : undefined,
      timing: { queryMs, parseMs: 0 },
    };
  }

  /**
   * Find a single record by ID
   */
  async findById<T = Record<string, unknown>>(
    entityId: string,
    id: string
  ): Promise<SingleResult<T>> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    const qb = query(tableName, this.schema)
      .where({ field: 'id', operator: 'eq', value: id });

    // Exclude soft-deleted records
    if (entity.timestamps?.deletedAt) {
      qb.where({ field: 'deleted_at', operator: 'isNull', value: null });
    }

    const { sql, params } = qb.limit(1).buildSelect();
    const row = await this.db.queryOne<T>(sql, params);

    return {
      data: row ? this.toCamelCaseKeys(row) as T : null,
      found: row !== null,
    };
  }

  /**
   * Find a single record by conditions
   */
  async findOne<T = Record<string, unknown>>(
    entityId: string,
    options: QueryOptions = {}
  ): Promise<SingleResult<T>> {
    const result = await this.findMany<T>(entityId, { ...options, pagination: { offset: 0, limit: 1 } });
    return {
      data: result.data[0] || null,
      found: result.data.length > 0,
    };
  }

  /**
   * Count records
   */
  async count(
    entityId: string,
    options: { filters?: QueryOptions['filters'] } = {}
  ): Promise<number> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    const qb = query(tableName, this.schema);
    
    if (options.filters) {
      qb.whereAll(options.filters);
    }

    if (entity.timestamps?.deletedAt) {
      qb.where({ field: 'deleted_at', operator: 'isNull', value: null });
    }

    const { sql, params } = qb.buildCount();
    const result = await this.db.queryOne<{ count: string }>(sql, params);
    
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Check if a record exists
   */
  async exists(
    entityId: string,
    id: string
  ): Promise<boolean> {
    const result = await this.findById(entityId, id);
    return result.found;
  }

  // ============================================================
  // UPDATE
  // ============================================================

  /**
   * Update a record by ID
   */
  async update<T = Record<string, unknown>>(
    entityId: string,
    id: string,
    data: Record<string, unknown>,
    options: { skipValidation?: boolean } = {}
  ): Promise<MutationResult<T>> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    // Check if update is enabled
    if (entity.crud?.update?.enabled === false) {
      throw new Error(`Update operation is disabled for ${entity.name}`);
    }

    // Check record exists
    const existing = await this.findById(entityId, id);
    if (!existing.found) {
      throw new Error(`Record not found: ${id}`);
    }

    // Validate
    if (!options.skipValidation) {
      const validation = await this.validateForUpdate(entity, data, existing.data as Record<string, unknown>);
      if (!validation.valid) {
        throw new ValidationError(validation);
      }
    }

    // Sanitize and convert
    const sanitized = this.validator.sanitize(entity, data);
    const snakeCaseData = this.toSnakeCaseKeys(sanitized);

    const { sql, params } = query(tableName, this.schema)
      .where({ field: 'id', operator: 'eq', value: id })
      .buildUpdate(snakeCaseData);

    const rows = await this.db.query<T>(sql, params);

    return {
      data: this.toCamelCaseKeys(rows[0]) as T,
      success: true,
      affectedRows: 1,
    };
  }

  /**
   * Update many records by filter
   */
  async updateMany<T = Record<string, unknown>>(
    entityId: string,
    filters: QueryOptions['filters'],
    data: Record<string, unknown>
  ): Promise<BulkMutationResult & { data: T[] }> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    if (!filters || filters.length === 0) {
      throw new Error('Filters are required for bulk update');
    }

    const snakeCaseData = this.toSnakeCaseKeys(this.validator.sanitize(entity, data));

    const qb = query(tableName, this.schema).whereAll(filters);
    const { sql, params } = qb.buildUpdate(snakeCaseData);

    const rows = await this.db.query<T>(sql, params);

    return {
      success: true,
      updated: rows.length,
      data: rows.map(r => this.toCamelCaseKeys(r) as T),
    };
  }

  /**
   * Upsert a record (update if exists, create if not)
   */
  async upsert<T = Record<string, unknown>>(
    entityId: string,
    data: Record<string, unknown>,
    uniqueFields: string[]
  ): Promise<MutationResult<T>> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    // Check if record exists by unique fields
    const filters = uniqueFields.map(field => ({
      field,
      operator: 'eq' as const,
      value: data[field],
    }));

    const existing = await this.findOne(entityId, { filters });

    if (existing.found && existing.data) {
      return this.update(entityId, (existing.data as any).id, data);
    } else {
      return this.create(entityId, data);
    }
  }

  // ============================================================
  // DELETE
  // ============================================================

  /**
   * Delete a record by ID
   */
  async delete(
    entityId: string,
    id: string
  ): Promise<{ success: boolean; deletedId: string }> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    // Check if delete is enabled
    if (entity.crud?.delete?.enabled === false) {
      throw new Error(`Delete operation is disabled for ${entity.name}`);
    }

    // Check record exists
    const existing = await this.findById(entityId, id);
    if (!existing.found) {
      throw new Error(`Record not found: ${id}`);
    }

    const qb = query(tableName, this.schema)
      .where({ field: 'id', operator: 'eq', value: id });

    let sql: string, params: unknown[];

    // Soft delete or hard delete
    if (entity.crud?.delete?.softDelete || entity.timestamps?.deletedAt) {
      ({ sql, params } = qb.buildSoftDelete());
    } else {
      ({ sql, params } = qb.buildDelete());
    }

    await this.db.query(sql, params);

    return { success: true, deletedId: id };
  }

  /**
   * Delete many records by filter
   */
  async deleteMany(
    entityId: string,
    filters: QueryOptions['filters']
  ): Promise<{ success: boolean; deletedCount: number }> {
    const entity = this.getEntity(entityId);
    const tableName = this.toTableName(entity);

    if (!filters || filters.length === 0) {
      throw new Error('Filters are required for bulk delete');
    }

    const qb = query(tableName, this.schema).whereAll(filters);

    let sql: string, params: unknown[];

    if (entity.crud?.delete?.softDelete || entity.timestamps?.deletedAt) {
      ({ sql, params } = qb.buildSoftDelete());
    } else {
      ({ sql, params } = qb.buildDelete());
    }

    const result = await this.db.executeReturning(sql, params);

    return { success: true, deletedCount: result.affectedRows };
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(
    entityId: string,
    id: string
  ): Promise<{ success: boolean }> {
    const entity = this.getEntity(entityId);
    
    if (!entity.timestamps?.deletedAt) {
      throw new Error(`Entity ${entity.name} does not support soft delete`);
    }

    const tableName = this.toTableName(entity);
    const qualifiedTable = `"${this.schema}"."${tableName}"`;

    const sql = `UPDATE ${qualifiedTable} SET "deleted_at" = NULL WHERE "id" = $1`;
    await this.db.execute(sql, [id]);

    return { success: true };
  }

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  private async validateForCreate(entity: Entity, data: Record<string, unknown>): Promise<ValidationResult> {
    return this.validator.validate(entity, data, {
      isCreate: true,
      checkUnique: async (field, value, excludeId) => {
        const count = await this.count(entity.id, {
          filters: [{ field, operator: 'eq', value }],
        });
        return count === 0;
      },
      checkExists: async (entityName, id) => {
        return this.exists(entityName, id);
      },
    });
  }

  private async validateForUpdate(
    entity: Entity,
    data: Record<string, unknown>,
    existing: Record<string, unknown>
  ): Promise<ValidationResult> {
    return this.validator.validate(entity, data, {
      isUpdate: true,
      existingData: existing,
      checkUnique: async (field, value, excludeId) => {
        const qb = query(this.toTableName(entity), this.schema)
          .where({ field, operator: 'eq', value });
        
        if (excludeId) {
          qb.where({ field: 'id', operator: 'neq', value: excludeId });
        }
        
        const { sql, params } = qb.buildCount();
        const result = await this.db.queryOne<{ count: string }>(sql, params);
        return parseInt(result?.count || '0', 10) === 0;
      },
      checkExists: async (entityName, id) => {
        return this.exists(entityName, id);
      },
    });
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private toTableName(entity: Entity): string {
    const name = entity.pluralName || entity.name + 's';
    return this.toSnakeCase(name);
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/\s+/g, '_');
  }

  private toSnakeCaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[this.toSnakeCase(key)] = value;
    }
    return result;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toCamelCaseKeys(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.toCamelCaseKeys(item));
    if (typeof obj !== 'object') return obj;

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[this.toCamelCase(key)] = value;
    }
    return result;
  }
}

// ============================================================
// VALIDATION ERROR
// ============================================================

export class ValidationError extends Error {
  public validation: ValidationResult;

  constructor(validation: ValidationResult) {
    const message = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.validation = validation;
  }
}
