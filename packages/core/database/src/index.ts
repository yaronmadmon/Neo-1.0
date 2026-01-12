/**
 * Neo Database Package
 * Real database backend for Neo apps
 * 
 * Supports: PostgreSQL, Supabase, Neon
 */

// Types
export * from './types.js';

// Connection
export {
  DatabaseConnection,
  createConnectionFromEnv,
  createSupabaseConnection,
  createNeonConnection,
  getConnection,
  setConnection,
  closeConnection,
} from './connection.js';

// SQL Compiler
export {
  SqlCompiler,
  sqlCompiler,
} from './sql-compiler.js';

// Query Builder
export {
  QueryBuilder,
  query,
} from './query-builder.js';

// Validation
export {
  ValidationEngine,
  validationEngine,
} from './validation.js';

// CRUD Service
export {
  CrudService,
  ValidationError,
} from './crud-service.js';

// Relation Resolver
export {
  RelationResolver,
  relationResolver,
} from './relation-resolver.js';

// Computed Fields
export {
  ComputedFieldsEngine,
  ExpressionEvaluator,
  computedFieldsEngine,
} from './computed-fields.js';

// Schema Manager
export {
  SchemaManager,
} from './schema-manager.js';

// ============================================================
// UNIFIED DATABASE SERVICE
// ============================================================

import { DatabaseConnection, createConnectionFromEnv } from './connection.js';
import { CrudService } from './crud-service.js';
import { RelationResolver } from './relation-resolver.js';
import { ComputedFieldsEngine, computedFieldsEngine } from './computed-fields.js';
import { SchemaManager } from './schema-manager.js';
import type { QueryOptions, QueryResult, SingleResult, MutationResult, DatabaseConfig } from './types.js';

/**
 * Entity definition interface (matches blueprint-engine)
 */
export interface EntityDefinition {
  id: string;
  name: string;
  pluralName: string;
  fields: {
    id: string;
    name: string;
    type: string;
    required?: boolean;
    unique?: boolean;
    indexed?: boolean;
    reference?: {
      entity: string;
      displayField: string;
      relationship?: string;
      cascadeDelete?: boolean;
    };
    enumOptions?: { value: string; label: string }[];
    validation?: {
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      message?: string;
    };
    computed?: {
      expression: string;
      dependencies: string[];
    };
  }[];
  crud?: {
    create?: { enabled: boolean };
    read?: { enabled: boolean; defaultSort?: { field: string; direction: 'asc' | 'desc' }; pageSize?: number };
    update?: { enabled: boolean };
    delete?: { enabled: boolean; softDelete?: boolean };
  };
  timestamps?: {
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
  };
}

/**
 * Unified Database Service
 * Single entry point for all database operations
 */
export class DatabaseService {
  private connection: DatabaseConnection;
  private crud: CrudService;
  private relations: RelationResolver;
  private computed: ComputedFieldsEngine;
  private schemaManager: SchemaManager;
  private schema: string;
  private isInitialized = false;

  constructor(config?: DatabaseConfig) {
    this.schema = config?.schema ?? 'public';
    
    if (config) {
      this.connection = new DatabaseConnection(config);
    } else {
      this.connection = createConnectionFromEnv();
    }
    
    this.crud = new CrudService(this.connection, this.schema);
    this.relations = new RelationResolver(this.connection, this.schema);
    this.computed = computedFieldsEngine;
    this.schemaManager = new SchemaManager(this.connection, this.schema);
  }

  /**
   * Initialize the database connection and schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.connection.connect();
    await this.schemaManager.initialize();
    this.isInitialized = true;
  }

  /**
   * Register entities for CRUD operations
   */
  registerEntities(entities: EntityDefinition[]): void {
    for (const entity of entities) {
      this.crud.registerEntity(entity);
      this.relations.registerEntity(entity);
      
      // Register computed fields
      const computedFields = entity.fields
        .filter(f => f.computed)
        .map(f => ({
          name: f.name,
          expression: f.computed!.expression,
          dependencies: f.computed!.dependencies,
          type: 'virtual' as const,
          returnType: f.type,
        }));
      
      if (computedFields.length > 0) {
        this.computed.registerFields(entity.id, computedFields);
      }
    }
  }

  /**
   * Synchronize database schema with entity definitions
   */
  async syncSchema(entities: EntityDefinition[]): Promise<{ created: string[]; updated: string[]; errors: { entity: string; error: string }[] }> {
    return this.schemaManager.syncSchema(entities);
  }

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================

  /**
   * Create a new record
   */
  async create<T = Record<string, unknown>>(
    entityId: string,
    data: Record<string, unknown>
  ): Promise<MutationResult<T>> {
    const result = await this.crud.create<T>(entityId, data);
    
    // Apply computed fields
    result.data = this.computed.computeForRecord(entityId, result.data as Record<string, unknown>) as T;
    
    return result;
  }

  /**
   * Create multiple records
   */
  async createMany<T = Record<string, unknown>>(
    entityId: string,
    records: Record<string, unknown>[]
  ): Promise<{ success: boolean; data: T[]; inserted?: number; errors?: { row: number; error: string }[] }> {
    const result = await this.crud.createMany<T>(entityId, records);
    
    // Apply computed fields
    result.data = this.computed.computeForRecords(entityId, result.data as Record<string, unknown>[]) as T[];
    
    return result;
  }

  /**
   * Find many records
   */
  async findMany<T = Record<string, unknown>>(
    entityId: string,
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    const result = await this.crud.findMany<T>(entityId, options);
    
    // Apply computed fields
    result.data = this.computed.computeForRecords(entityId, result.data as Record<string, unknown>[]) as T[];
    
    // Resolve relations if requested
    if (options?.include && result.data.length > 0) {
      for (const include of options.include) {
        const relationData = await this.relations.batchResolveRelation(
          entityId,
          result.data.map(r => (r as any).id),
          include.relation
        );
        
        for (const record of result.data) {
          const id = (record as any).id;
          (record as any)[include.relation] = relationData.get(id) || [];
        }
      }
    }
    
    return result;
  }

  /**
   * Find a single record by ID
   */
  async findById<T = Record<string, unknown>>(
    entityId: string,
    id: string,
    options?: { include?: { relation: string }[] }
  ): Promise<SingleResult<T>> {
    const result = await this.crud.findById<T>(entityId, id);
    
    if (result.data) {
      // Apply computed fields
      result.data = this.computed.computeForRecord(entityId, result.data as Record<string, unknown>) as T;
      
      // Resolve relations if requested
      if (options?.include) {
        const relations = await this.relations.resolveRelations(entityId, id, options.include);
        for (const [key, value] of Object.entries(relations)) {
          (result.data as any)[key] = value.data;
        }
      }
    }
    
    return result;
  }

  /**
   * Find one record by conditions
   */
  async findOne<T = Record<string, unknown>>(
    entityId: string,
    options?: QueryOptions
  ): Promise<SingleResult<T>> {
    const result = await this.crud.findOne<T>(entityId, options);
    
    if (result.data) {
      result.data = this.computed.computeForRecord(entityId, result.data as Record<string, unknown>) as T;
    }
    
    return result;
  }

  /**
   * Count records
   */
  async count(entityId: string, options?: { filters?: QueryOptions['filters'] }): Promise<number> {
    return this.crud.count(entityId, options);
  }

  /**
   * Check if a record exists
   */
  async exists(entityId: string, id: string): Promise<boolean> {
    return this.crud.exists(entityId, id);
  }

  /**
   * Update a record
   */
  async update<T = Record<string, unknown>>(
    entityId: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<MutationResult<T>> {
    const result = await this.crud.update<T>(entityId, id, data);
    
    result.data = this.computed.computeForRecord(entityId, result.data as Record<string, unknown>) as T;
    
    return result;
  }

  /**
   * Update many records
   */
  async updateMany<T = Record<string, unknown>>(
    entityId: string,
    filters: QueryOptions['filters'],
    data: Record<string, unknown>
  ): Promise<{ success: boolean; data: T[]; updated?: number }> {
    return this.crud.updateMany<T>(entityId, filters, data);
  }

  /**
   * Upsert a record
   */
  async upsert<T = Record<string, unknown>>(
    entityId: string,
    data: Record<string, unknown>,
    uniqueFields: string[]
  ): Promise<MutationResult<T>> {
    const result = await this.crud.upsert<T>(entityId, data, uniqueFields);
    
    result.data = this.computed.computeForRecord(entityId, result.data as Record<string, unknown>) as T;
    
    return result;
  }

  /**
   * Delete a record
   */
  async delete(entityId: string, id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.crud.delete(entityId, id);
  }

  /**
   * Delete many records
   */
  async deleteMany(
    entityId: string,
    filters: QueryOptions['filters']
  ): Promise<{ success: boolean; deletedCount: number }> {
    return this.crud.deleteMany(entityId, filters);
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(entityId: string, id: string): Promise<{ success: boolean }> {
    return this.crud.restore(entityId, id);
  }

  // ============================================================
  // RELATION OPERATIONS
  // ============================================================

  /**
   * Create a relation between two records
   */
  async createRelation(
    entityId: string,
    recordId: string,
    relationName: string,
    targetId: string
  ): Promise<void> {
    return this.relations.createRelation(entityId, recordId, relationName, targetId);
  }

  /**
   * Remove a relation between two records
   */
  async removeRelation(
    entityId: string,
    recordId: string,
    relationName: string,
    targetId: string
  ): Promise<void> {
    return this.relations.removeRelation(entityId, recordId, relationName, targetId);
  }

  /**
   * Get related records
   */
  async getRelated<T = Record<string, unknown>>(
    entityId: string,
    recordId: string,
    relationName: string
  ): Promise<T[]> {
    const result = await this.relations.resolveRelation<T>(entityId, recordId, relationName);
    return result.data as T[];
  }

  // ============================================================
  // TRANSACTION & RAW QUERY
  // ============================================================

  /**
   * Execute operations in a transaction
   */
  async transaction<T>(fn: (db: DatabaseService) => Promise<T>): Promise<T> {
    return this.connection.transaction(async () => fn(this));
  }

  /**
   * Execute a raw SQL query
   */
  async rawQuery<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.connection.query<T>(sql, params);
  }

  /**
   * Execute a raw SQL command
   */
  async rawExecute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }> {
    return this.connection.execute(sql, params);
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.connection.disconnect();
    this.isInitialized = false;
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; poolStats: { total: number; idle: number; waiting: number } } {
    return {
      connected: this.connection.getIsConnected(),
      poolStats: this.connection.getPoolStats(),
    };
  }
}

// Export factory function
export function createDatabaseService(config?: DatabaseConfig): DatabaseService {
  return new DatabaseService(config);
}

// Singleton instance
let globalDbService: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!globalDbService) {
    globalDbService = new DatabaseService();
  }
  return globalDbService;
}

export function setDatabaseService(service: DatabaseService): void {
  globalDbService = service;
}
