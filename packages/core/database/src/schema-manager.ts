/**
 * Schema Manager
 * Manages database schema creation, migrations, and synchronization
 */

import type { DatabaseConnection } from './connection.js';
import { SqlCompiler } from './sql-compiler.js';
import type { SchemaMigration, MigrationPlan, TableDefinition } from './types.js';

// Entity interface
interface Entity {
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
      pattern?: string;
    };
    computed?: {
      expression: string;
      dependencies: string[];
    };
  }[];
  relationships?: {
    id: string;
    type: string;
    targetEntity: string;
    foreignKey: string;
    backReference?: string;
  }[];
  timestamps?: {
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
  };
}

// ============================================================
// SCHEMA MANAGER
// ============================================================

export class SchemaManager {
  private db: DatabaseConnection;
  private schema: string;
  private compiler: SqlCompiler;

  constructor(db: DatabaseConnection, schema = 'public') {
    this.db = db;
    this.schema = schema;
    this.compiler = new SqlCompiler(schema);
  }

  /**
   * Initialize the database schema (create migration tracking table)
   */
  async initialize(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS "${this.schema}"."_neo_migrations" (
        "id" VARCHAR(255) PRIMARY KEY,
        "version" INTEGER NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "checksum" VARCHAR(64),
        "execution_time_ms" INTEGER
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS "${this.schema}"."_neo_entities" (
        "id" VARCHAR(255) PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "table_name" VARCHAR(255) NOT NULL UNIQUE,
        "schema_json" JSONB NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  /**
   * Synchronize database schema with entity definitions
   */
  async syncSchema(entities: Entity[]): Promise<{ created: string[]; updated: string[]; errors: { entity: string; error: string }[] }> {
    const created: string[] = [];
    const updated: string[] = [];
    const errors: { entity: string; error: string }[] = [];

    for (const entity of entities) {
      try {
        const tableName = this.toTableName(entity);
        const exists = await this.tableExists(tableName);

        if (!exists) {
          // Create new table
          await this.createTable(entity);
          created.push(entity.name);
        } else {
          // Check for schema changes
          const hasChanges = await this.hasSchemaChanges(entity);
          if (hasChanges) {
            await this.updateTable(entity);
            updated.push(entity.name);
          }
        }

        // Store entity metadata
        await this.storeEntityMetadata(entity);
      } catch (error: any) {
        errors.push({ entity: entity.name, error: error.message });
      }
    }

    // Create junction tables for many-to-many relationships
    for (const entity of entities) {
      for (const field of entity.fields) {
        if (field.reference?.relationship === 'many_to_many') {
          try {
            await this.createJunctionTable(entity.name, field.reference.entity);
          } catch (error: any) {
            // Junction table might already exist
            if (!error.message.includes('already exists')) {
              errors.push({ entity: `${entity.name}_${field.reference.entity}`, error: error.message });
            }
          }
        }
      }
    }

    return { created, updated, errors };
  }

  /**
   * Create a table for an entity
   */
  async createTable(entity: Entity): Promise<void> {
    const tableDef = this.compiler.compileEntity(entity);
    const sql = this.compiler.generateCreateTableSql(tableDef);
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await this.db.execute(stmt);
    }
  }

  /**
   * Update a table with schema changes
   */
  async updateTable(entity: Entity): Promise<void> {
    const stored = await this.getStoredEntity(entity.id);
    if (!stored) {
      return this.createTable(entity);
    }

    const { up, down } = this.compiler.generateMigrationSql(stored, entity);
    
    // Execute migration
    for (const sql of up) {
      try {
        await this.db.execute(sql);
      } catch (error: any) {
        // Handle "column already exists" errors gracefully
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  /**
   * Create a junction table for many-to-many relationships
   */
  async createJunctionTable(entity1: string, entity2: string): Promise<void> {
    const sql = this.compiler.generateJunctionTableSql(entity1, entity2, 'id', 'id');
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await this.db.execute(stmt);
    }
  }

  /**
   * Drop a table
   */
  async dropTable(tableName: string, cascade = false): Promise<void> {
    const sql = this.compiler.generateDropTableSql(tableName, cascade);
    await this.db.execute(sql);
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.db.queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = $2
      )
    `, [this.schema, tableName]);
    return result?.exists ?? false;
  }

  /**
   * Get table columns
   */
  async getTableColumns(tableName: string): Promise<{ name: string; type: string; nullable: boolean }[]> {
    return this.db.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [this.schema, tableName]);
  }

  /**
   * Check if entity schema has changes
   */
  async hasSchemaChanges(entity: Entity): Promise<boolean> {
    const stored = await this.getStoredEntity(entity.id);
    if (!stored) return true;

    // Compare field counts
    if (stored.fields.length !== entity.fields.length) return true;

    // Compare each field
    const storedFields = new Map(stored.fields.map(f => [f.id, f]));
    for (const field of entity.fields) {
      const storedField = storedFields.get(field.id);
      if (!storedField) return true;
      if (storedField.type !== field.type) return true;
      if (storedField.required !== field.required) return true;
      if (storedField.unique !== field.unique) return true;
    }

    return false;
  }

  /**
   * Store entity metadata
   */
  private async storeEntityMetadata(entity: Entity): Promise<void> {
    const tableName = this.toTableName(entity);
    
    await this.db.execute(`
      INSERT INTO "${this.schema}"."_neo_entities" (id, name, table_name, schema_json, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        table_name = EXCLUDED.table_name,
        schema_json = EXCLUDED.schema_json,
        updated_at = NOW()
    `, [entity.id, entity.name, tableName, JSON.stringify(entity)]);
  }

  /**
   * Get stored entity metadata
   */
  async getStoredEntity(entityId: string): Promise<Entity | null> {
    const result = await this.db.queryOne<{ schema_json: Entity }>(`
      SELECT schema_json FROM "${this.schema}"."_neo_entities" WHERE id = $1
    `, [entityId]);
    return result?.schema_json ?? null;
  }

  /**
   * Get all stored entities
   */
  async getAllStoredEntities(): Promise<Entity[]> {
    const results = await this.db.query<{ schema_json: Entity }>(`
      SELECT schema_json FROM "${this.schema}"."_neo_entities"
    `);
    return results.map(r => r.schema_json);
  }

  /**
   * Apply migrations
   */
  async applyMigrations(migrations: SchemaMigration[]): Promise<{ applied: string[]; errors: { id: string; error: string }[] }> {
    const applied: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const migration of migrations) {
      try {
        // Check if already applied
        const existing = await this.db.queryOne<{ id: string }>(`
          SELECT id FROM "${this.schema}"."_neo_migrations" WHERE id = $1
        `, [migration.id]);

        if (existing) continue;

        // Apply migration
        const start = Date.now();
        const client = await this.db.beginTransaction();
        
        try {
          for (const sql of migration.up) {
            await client.query(sql);
          }
          
          await client.query(`
            INSERT INTO "${this.schema}"."_neo_migrations" (id, version, name, execution_time_ms)
            VALUES ($1, $2, $3, $4)
          `, [migration.id, migration.version, migration.name, Date.now() - start]);
          
          await client.commit();
          applied.push(migration.id);
        } catch (error) {
          await client.rollback();
          throw error;
        }
      } catch (error: any) {
        errors.push({ id: migration.id, error: error.message });
      }
    }

    return { applied, errors };
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations(count = 1): Promise<{ rolledBack: string[]; errors: { id: string; error: string }[] }> {
    const rolledBack: string[] = [];
    const errors: { id: string; error: string }[] = [];

    // Get last N migrations
    const migrations = await this.db.query<{ id: string; name: string }>(`
      SELECT id, name FROM "${this.schema}"."_neo_migrations"
      ORDER BY applied_at DESC
      LIMIT $1
    `, [count]);

    for (const migration of migrations) {
      try {
        // Get stored entity to regenerate down migration
        // This is simplified - in production, store the down SQL with the migration
        await this.db.execute(`
          DELETE FROM "${this.schema}"."_neo_migrations" WHERE id = $1
        `, [migration.id]);
        
        rolledBack.push(migration.id);
      } catch (error: any) {
        errors.push({ id: migration.id, error: error.message });
      }
    }

    return { rolledBack, errors };
  }

  /**
   * Get applied migrations
   */
  async getAppliedMigrations(): Promise<{ id: string; version: number; name: string; appliedAt: Date }[]> {
    const results = await this.db.query<{ id: string; version: number; name: string; applied_at: Date }>(`
      SELECT id, version, name, applied_at FROM "${this.schema}"."_neo_migrations"
      ORDER BY applied_at DESC
    `);
    return results.map(r => ({
      id: r.id,
      version: r.version,
      name: r.name,
      appliedAt: r.applied_at,
    }));
  }

  /**
   * Generate migration plan for entity changes
   */
  generateMigrationPlan(oldEntities: Entity[], newEntities: Entity[]): MigrationPlan {
    const migrations: SchemaMigration[] = [];
    const warnings: string[] = [];
    let isDestructive = false;

    const oldMap = new Map(oldEntities.map(e => [e.id, e]));
    const newMap = new Map(newEntities.map(e => [e.id, e]));

    // Find new entities
    for (const [id, entity] of newMap) {
      if (!oldMap.has(id)) {
        const { up, down } = this.compiler.generateMigrationSql(null, entity);
        migrations.push({
          id: `create_${entity.name.toLowerCase()}_${Date.now()}`,
          version: migrations.length + 1,
          name: `Create ${entity.name} table`,
          up,
          down,
        });
      }
    }

    // Find modified entities
    for (const [id, newEntity] of newMap) {
      const oldEntity = oldMap.get(id);
      if (oldEntity) {
        const { up, down } = this.compiler.generateMigrationSql(oldEntity, newEntity);
        if (up.length > 0) {
          migrations.push({
            id: `modify_${newEntity.name.toLowerCase()}_${Date.now()}`,
            version: migrations.length + 1,
            name: `Modify ${newEntity.name} table`,
            up,
            down,
          });

          // Check for destructive changes
          for (const sql of up) {
            if (sql.includes('DROP COLUMN') || sql.includes('DROP TABLE')) {
              isDestructive = true;
              warnings.push(`Destructive change detected: ${sql.substring(0, 50)}...`);
            }
          }
        }
      }
    }

    // Find deleted entities
    for (const [id, entity] of oldMap) {
      if (!newMap.has(id)) {
        isDestructive = true;
        warnings.push(`Table ${entity.name} will be dropped`);
        migrations.push({
          id: `drop_${entity.name.toLowerCase()}_${Date.now()}`,
          version: migrations.length + 1,
          name: `Drop ${entity.name} table`,
          up: [this.compiler.generateDropTableSql(this.toTableName(entity), true)],
          down: this.compiler.generateMigrationSql(null, entity).up,
        });
      }
    }

    return { migrations, isDestructive, warnings };
  }

  /**
   * Seed initial data
   */
  async seedData(entityId: string, records: Record<string, unknown>[]): Promise<{ inserted: number }> {
    const entity = await this.getStoredEntity(entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const tableName = this.toTableName(entity);
    let inserted = 0;

    for (const record of records) {
      try {
        const columns: string[] = [];
        const values: unknown[] = [];
        const placeholders: string[] = [];
        let i = 1;

        for (const [key, value] of Object.entries(record)) {
          columns.push(`"${this.toSnakeCase(key)}"`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
          placeholders.push(`$${i++}`);
        }

        await this.db.execute(`
          INSERT INTO "${this.schema}"."${tableName}" (${columns.join(', ')})
          VALUES (${placeholders.join(', ')})
          ON CONFLICT (id) DO NOTHING
        `, values);
        
        inserted++;
      } catch (error) {
        console.error(`[SchemaManager] Error seeding record:`, error);
      }
    }

    return { inserted };
  }

  /**
   * Convert entity to table name
   */
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
}
