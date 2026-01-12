/**
 * Database Types for Neo
 * Defines all types for the database layer
 */

import { z } from 'zod';

// ============================================================
// DATABASE CONFIGURATION
// ============================================================

export type DatabaseProvider = 'postgres' | 'supabase' | 'neon';

export interface DatabaseConfig {
  provider: DatabaseProvider;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  poolSize?: number;
  schema?: string;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

// ============================================================
// COLUMN TYPES
// ============================================================

export type SqlColumnType =
  | 'TEXT'
  | 'VARCHAR'
  | 'INTEGER'
  | 'BIGINT'
  | 'DECIMAL'
  | 'NUMERIC'
  | 'BOOLEAN'
  | 'DATE'
  | 'TIMESTAMP'
  | 'TIMESTAMPTZ'
  | 'TIME'
  | 'UUID'
  | 'JSONB'
  | 'BYTEA';

export interface ColumnDefinition {
  name: string;
  type: SqlColumnType;
  nullable: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: string;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  check?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  where?: string;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface TableDefinition {
  name: string;
  schema?: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
  timestamps?: boolean;
}

export interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  references?: {
    table: string;
    columns: string[];
  };
  expression?: string;
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'like'
  | 'ilike'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isNull'
  | 'isNotNull'
  | 'between'
  | 'jsonContains';

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export interface QueryPagination {
  offset: number;
  limit: number;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  sorts?: QuerySort[];
  pagination?: QueryPagination;
  select?: string[];
  include?: IncludeRelation[];
  distinct?: boolean;
}

export interface IncludeRelation {
  relation: string;
  select?: string[];
  filters?: QueryFilter[];
  include?: IncludeRelation[];
}

// ============================================================
// RESULT TYPES
// ============================================================

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  count: number;
  totalCount?: number;
  hasMore?: boolean;
  timing?: {
    queryMs: number;
    parseMs: number;
  };
}

export interface SingleResult<T = Record<string, unknown>> {
  data: T | null;
  found: boolean;
}

export interface MutationResult<T = Record<string, unknown>> {
  data: T;
  success: boolean;
  affectedRows?: number;
}

export interface BulkMutationResult {
  success: boolean;
  inserted?: number;
  updated?: number;
  deleted?: number;
  errors?: { row: number; error: string }[];
}

// ============================================================
// TRANSACTION TYPES
// ============================================================

export interface Transaction {
  id: string;
  status: 'pending' | 'committed' | 'rolled_back';
  queries: string[];
  startedAt: Date;
}

export interface TransactionClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ============================================================
// VALIDATION TYPES
// ============================================================

export const ValidationRuleSchema = z.object({
  type: z.enum([
    'required',
    'type',
    'min',
    'max',
    'minLength',
    'maxLength',
    'pattern',
    'email',
    'url',
    'enum',
    'unique',
    'exists',
    'custom',
  ]),
  value: z.unknown().optional(),
  message: z.string().optional(),
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================
// COMPUTED FIELD TYPES
// ============================================================

export interface ComputedFieldDef {
  name: string;
  expression: string;
  dependencies: string[];
  type: 'virtual' | 'stored';
  returnType: string;
}

export interface ComputedFieldContext {
  record: Record<string, unknown>;
  entity: string;
  relatedData?: Record<string, unknown[]>;
}

// ============================================================
// MIGRATION TYPES
// ============================================================

export interface SchemaMigration {
  id: string;
  version: number;
  name: string;
  up: string[];
  down: string[];
  appliedAt?: Date;
}

export interface MigrationPlan {
  migrations: SchemaMigration[];
  isDestructive: boolean;
  warnings: string[];
}

// ============================================================
// RELATION TYPES
// ============================================================

export type RelationType = 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';

export interface RelationDefinition {
  name: string;
  type: RelationType;
  sourceEntity: string;
  targetEntity: string;
  sourceField: string;
  targetField: string;
  through?: string; // Junction table for many-to-many
  foreignKey?: string;
  backReference?: string;
}

export interface ResolvedRelation {
  data: Record<string, unknown>[];
  count: number;
  type: RelationType;
}
