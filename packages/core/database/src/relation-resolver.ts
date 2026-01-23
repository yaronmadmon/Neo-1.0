/**
 * Relation Resolver
 * Resolves references and relationships between entities
 */

import type { DatabaseConnection } from './connection.js';
import { query } from './query-builder.js';
import type { RelationType, RelationDefinition, ResolvedRelation, IncludeRelation } from './types.js';

// Entity interfaces
interface EntityField {
  id: string;
  name: string;
  type: string;
  reference?: {
    entity: string;
    displayField: string;
    relationship?: string;
    cascadeDelete?: boolean;
    backReference?: string;
  };
}

interface Entity {
  id: string;
  name: string;
  pluralName: string;
  fields: EntityField[];
  relationships?: {
    id: string;
    type: RelationType;
    targetEntity: string;
    foreignKey: string;
    backReference?: string;
  }[];
}

// ============================================================
// RELATION RESOLVER
// ============================================================

export class RelationResolver {
  private db: DatabaseConnection;
  private schema: string;
  private entityRegistry: Map<string, Entity> = new Map();

  constructor(db: DatabaseConnection, schema = 'public') {
    this.db = db;
    this.schema = schema;
  }

  /**
   * Register an entity
   */
  registerEntity(entity: Entity): void {
    this.entityRegistry.set(entity.id, entity);
    this.entityRegistry.set(entity.name.toLowerCase(), entity);
    this.entityRegistry.set(this.toTableName(entity), entity);
  }

  /**
   * Get all relations for an entity
   */
  getRelations(entityId: string): RelationDefinition[] {
    const entity = this.getEntity(entityId);
    const relations: RelationDefinition[] = [];

    // Extract relations from reference fields
    for (const field of entity.fields) {
      if (field.type === 'reference' && field.reference) {
        const relationType = this.mapRelationType(field.reference.relationship);
        relations.push({
          name: field.name,
          type: relationType,
          sourceEntity: entity.id,
          targetEntity: field.reference.entity,
          sourceField: field.name,
          targetField: 'id',
          foreignKey: this.toSnakeCase(field.name) + '_id',
          backReference: field.reference.backReference,
        });
      }
    }

    // Add explicit relationships
    if (entity.relationships) {
      for (const rel of entity.relationships) {
        relations.push({
          name: rel.id,
          type: rel.type,
          sourceEntity: entity.id,
          targetEntity: rel.targetEntity,
          sourceField: rel.foreignKey,
          targetField: 'id',
          foreignKey: rel.foreignKey,
          backReference: rel.backReference,
        });
      }
    }

    return relations;
  }

  /**
   * Resolve a single relation for a record
   */
  async resolveRelation<T = Record<string, unknown>>(
    entityId: string,
    recordId: string,
    relationName: string
  ): Promise<ResolvedRelation> {
    const entity = this.getEntity(entityId);
    const relations = this.getRelations(entityId);
    const relation = relations.find(r => r.name === relationName);

    if (!relation) {
      throw new Error(`Relation '${relationName}' not found on entity '${entityId}'`);
    }

    const targetEntity = this.getEntity(relation.targetEntity);
    const targetTable = this.toTableName(targetEntity);

    // First, get the source record to find the foreign key value
    const sourceTable = this.toTableName(entity);
    const sourceRecord = await this.db.queryOne<Record<string, unknown>>(
      `SELECT * FROM "${this.schema}"."${sourceTable}" WHERE id = $1`,
      [recordId]
    );

    if (!sourceRecord) {
      return { data: [], count: 0, type: relation.type };
    }

    let data: T[] = [];
    
    switch (relation.type) {
      case 'many_to_one':
      case 'one_to_one': {
        // Foreign key is on source, fetch single target
        const foreignKey = relation.foreignKey;
        if (!foreignKey) {
          throw new Error(`Relation '${relation.name}' is missing a foreign key`);
        }
        const fkValue = sourceRecord[foreignKey];
        if (fkValue) {
          const { sql, params } = query(targetTable, this.schema)
            .where({ field: 'id', operator: 'eq', value: fkValue })
            .limit(1)
            .buildSelect();
          data = await this.db.query<T>(sql, params);
        }
        break;
      }

      case 'one_to_many': {
        // Foreign key is on target, fetch multiple targets
        const targetFk = relation.backReference 
          ? this.toSnakeCase(relation.backReference) + '_id'
          : this.toSnakeCase(entity.name) + '_id';
        
        const { sql, params } = query(targetTable, this.schema)
          .where({ field: targetFk, operator: 'eq', value: recordId })
          .orderBy({ field: 'created_at', direction: 'desc' })
          .buildSelect();
        data = await this.db.query<T>(sql, params);
        break;
      }

      case 'many_to_many': {
        // Need junction table
        const junctionTable = this.getJunctionTableName(entity.name, targetEntity.name);
        const sourceCol = this.toSnakeCase(entity.name) + '_id';
        const targetCol = this.toSnakeCase(targetEntity.name) + '_id';

        const sql = `
          SELECT t.*
          FROM "${this.schema}"."${targetTable}" t
          INNER JOIN "${this.schema}"."${junctionTable}" j ON t.id = j."${targetCol}"
          WHERE j."${sourceCol}" = $1
          ORDER BY j.created_at DESC
        `;
        data = await this.db.query<T>(sql, [recordId]);
        break;
      }
    }

    return {
      data: data as Record<string, unknown>[],
      count: data.length,
      type: relation.type,
    };
  }

  /**
   * Resolve multiple relations for a record
   */
  async resolveRelations(
    entityId: string,
    recordId: string,
    include: IncludeRelation[]
  ): Promise<Record<string, ResolvedRelation>> {
    const results: Record<string, ResolvedRelation> = {};

    await Promise.all(
      include.map(async (inc) => {
        results[inc.relation] = await this.resolveRelation(entityId, recordId, inc.relation);

        // Handle nested includes
        if (inc.include && results[inc.relation].data.length > 0) {
          const relation = this.getRelations(entityId).find(r => r.name === inc.relation);
          if (relation) {
            for (const record of results[inc.relation].data) {
              const nestedResults = await this.resolveRelations(
                relation.targetEntity,
                (record as any).id,
                inc.include
              );
              (record as any)._relations = nestedResults;
            }
          }
        }
      })
    );

    return results;
  }

  /**
   * Resolve relations for multiple records (batch loading)
   */
  async batchResolveRelation<T = Record<string, unknown>>(
    entityId: string,
    recordIds: string[],
    relationName: string
  ): Promise<Map<string, T[]>> {
    if (recordIds.length === 0) {
      return new Map();
    }

    const entity = this.getEntity(entityId);
    const relations = this.getRelations(entityId);
    const relation = relations.find(r => r.name === relationName);

    if (!relation) {
      throw new Error(`Relation '${relationName}' not found on entity '${entityId}'`);
    }

    const targetEntity = this.getEntity(relation.targetEntity);
    const targetTable = this.toTableName(targetEntity);
    const results = new Map<string, T[]>();

    // Initialize all IDs with empty arrays
    for (const id of recordIds) {
      results.set(id, []);
    }

    switch (relation.type) {
      case 'many_to_one':
      case 'one_to_one': {
        // Get source records to find FK values
        const sourceTable = this.toTableName(entity);
        const foreignKey = relation.foreignKey;
        if (!foreignKey) {
          throw new Error(`Relation '${relation.name}' is missing a foreign key`);
        }
        const sourceRecords = await this.db.query<Record<string, unknown>>(
          `SELECT id, "${foreignKey}" FROM "${this.schema}"."${sourceTable}" WHERE id = ANY($1)`,
          [recordIds]
        );

        // Get unique FK values
        const fkValues = [...new Set(sourceRecords.map(r => r[foreignKey]).filter(Boolean))];
        
        if (fkValues.length > 0) {
          const targetRecords = await this.db.query<T>(
            `SELECT * FROM "${this.schema}"."${targetTable}" WHERE id = ANY($1)`,
            [fkValues]
          );

          // Map back to source records
          const targetMap = new Map(targetRecords.map(r => [(r as any).id, r]));
          for (const source of sourceRecords) {
            const target = targetMap.get(source[foreignKey] as string);
            if (target) {
              results.set(source.id as string, [target]);
            }
          }
        }
        break;
      }

      case 'one_to_many': {
        const targetFk = relation.backReference 
          ? this.toSnakeCase(relation.backReference) + '_id'
          : this.toSnakeCase(entity.name) + '_id';
        
        const targetRecords = await this.db.query<T>(
          `SELECT * FROM "${this.schema}"."${targetTable}" WHERE "${targetFk}" = ANY($1) ORDER BY created_at DESC`,
          [recordIds]
        );

        // Group by foreign key
        for (const record of targetRecords) {
          const fkValue = (record as any)[targetFk] as string;
          const existing = results.get(fkValue) || [];
          existing.push(record);
          results.set(fkValue, existing);
        }
        break;
      }

      case 'many_to_many': {
        const junctionTable = this.getJunctionTableName(entity.name, targetEntity.name);
        const sourceCol = this.toSnakeCase(entity.name) + '_id';
        const targetCol = this.toSnakeCase(targetEntity.name) + '_id';

        const sql = `
          SELECT t.*, j."${sourceCol}" as _source_id
          FROM "${this.schema}"."${targetTable}" t
          INNER JOIN "${this.schema}"."${junctionTable}" j ON t.id = j."${targetCol}"
          WHERE j."${sourceCol}" = ANY($1)
          ORDER BY j.created_at DESC
        `;
        const junctionRecords = await this.db.query<T & { _source_id: string }>(sql, [recordIds]);

        // Group by source ID
        for (const record of junctionRecords) {
          const sourceId = record._source_id;
          delete (record as any)._source_id;
          const existing = results.get(sourceId) || [];
          existing.push(record);
          results.set(sourceId, existing);
        }
        break;
      }
    }

    return results;
  }

  /**
   * Create a relation between two records
   */
  async createRelation(
    entityId: string,
    recordId: string,
    relationName: string,
    targetId: string
  ): Promise<void> {
    const entity = this.getEntity(entityId);
    const relations = this.getRelations(entityId);
    const relation = relations.find(r => r.name === relationName);

    if (!relation) {
      throw new Error(`Relation '${relationName}' not found on entity '${entityId}'`);
    }

    const targetEntity = this.getEntity(relation.targetEntity);

    switch (relation.type) {
      case 'many_to_one':
      case 'one_to_one': {
        // Update source record with FK
        const sourceTable = this.toTableName(entity);
        const foreignKey = relation.foreignKey;
        if (!foreignKey) {
          throw new Error(`Relation '${relation.name}' is missing a foreign key`);
        }
        await this.db.execute(
          `UPDATE "${this.schema}"."${sourceTable}" SET "${foreignKey}" = $1 WHERE id = $2`,
          [targetId, recordId]
        );
        break;
      }

      case 'one_to_many': {
        // Update target record with FK
        const targetTable = this.toTableName(targetEntity);
        const targetFk = this.toSnakeCase(entity.name) + '_id';
        await this.db.execute(
          `UPDATE "${this.schema}"."${targetTable}" SET "${targetFk}" = $1 WHERE id = $2`,
          [recordId, targetId]
        );
        break;
      }

      case 'many_to_many': {
        // Insert into junction table
        const junctionTable = this.getJunctionTableName(entity.name, targetEntity.name);
        const sourceCol = this.toSnakeCase(entity.name) + '_id';
        const targetCol = this.toSnakeCase(targetEntity.name) + '_id';
        
        await this.db.execute(
          `INSERT INTO "${this.schema}"."${junctionTable}" ("${sourceCol}", "${targetCol}") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [recordId, targetId]
        );
        break;
      }
    }
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
    const entity = this.getEntity(entityId);
    const relations = this.getRelations(entityId);
    const relation = relations.find(r => r.name === relationName);

    if (!relation) {
      throw new Error(`Relation '${relationName}' not found on entity '${entityId}'`);
    }

    const targetEntity = this.getEntity(relation.targetEntity);

    switch (relation.type) {
      case 'many_to_one':
      case 'one_to_one': {
        // Set FK to NULL on source
        const sourceTable = this.toTableName(entity);
        const foreignKey = relation.foreignKey;
        if (!foreignKey) {
          throw new Error(`Relation '${relation.name}' is missing a foreign key`);
        }
        await this.db.execute(
          `UPDATE "${this.schema}"."${sourceTable}" SET "${foreignKey}" = NULL WHERE id = $1`,
          [recordId]
        );
        break;
      }

      case 'one_to_many': {
        // Set FK to NULL on target
        const targetTable = this.toTableName(targetEntity);
        const targetFk = this.toSnakeCase(entity.name) + '_id';
        await this.db.execute(
          `UPDATE "${this.schema}"."${targetTable}" SET "${targetFk}" = NULL WHERE id = $1`,
          [targetId]
        );
        break;
      }

      case 'many_to_many': {
        // Delete from junction table
        const junctionTable = this.getJunctionTableName(entity.name, targetEntity.name);
        const sourceCol = this.toSnakeCase(entity.name) + '_id';
        const targetCol = this.toSnakeCase(targetEntity.name) + '_id';
        
        await this.db.execute(
          `DELETE FROM "${this.schema}"."${junctionTable}" WHERE "${sourceCol}" = $1 AND "${targetCol}" = $2`,
          [recordId, targetId]
        );
        break;
      }
    }
  }

  /**
   * Get the display value for a reference field
   */
  async getDisplayValue(
    targetEntity: string,
    recordId: string,
    displayField: string
  ): Promise<string | null> {
    const entity = this.getEntity(targetEntity);
    const tableName = this.toTableName(entity);
    const fieldName = this.toSnakeCase(displayField);

    const record = await this.db.queryOne<Record<string, unknown>>(
      `SELECT "${fieldName}" FROM "${this.schema}"."${tableName}" WHERE id = $1`,
      [recordId]
    );

    return record ? String(record[fieldName] ?? '') : null;
  }

  /**
   * Get display values for multiple references (batch)
   */
  async batchGetDisplayValues(
    targetEntity: string,
    recordIds: string[],
    displayField: string
  ): Promise<Map<string, string>> {
    if (recordIds.length === 0) {
      return new Map();
    }

    const entity = this.getEntity(targetEntity);
    const tableName = this.toTableName(entity);
    const fieldName = this.toSnakeCase(displayField);

    const records = await this.db.query<{ id: string; [key: string]: unknown }>(
      `SELECT id, "${fieldName}" FROM "${this.schema}"."${tableName}" WHERE id = ANY($1)`,
      [recordIds]
    );

    return new Map(records.map(r => [r.id, String(r[fieldName] ?? '')]));
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getEntity(entityIdOrName: string): Entity {
    const entity = this.entityRegistry.get(entityIdOrName) ||
                   this.entityRegistry.get(entityIdOrName.toLowerCase());
    if (!entity) {
      throw new Error(`Entity not found: ${entityIdOrName}`);
    }
    return entity;
  }

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

  private mapRelationType(type: string | undefined): RelationType {
    switch (type) {
      case 'one_to_one':
      case 'oneToOne':
        return 'one_to_one';
      case 'one_to_many':
      case 'oneToMany':
        return 'one_to_many';
      case 'many_to_one':
      case 'manyToOne':
        return 'many_to_one';
      case 'many_to_many':
      case 'manyToMany':
      default:
        return 'many_to_many';
    }
  }

  private getJunctionTableName(entity1: string, entity2: string): string {
    // Sort alphabetically for consistency
    const names = [this.toSnakeCase(entity1), this.toSnakeCase(entity2)].sort();
    return `${names[0]}_${names[1]}`;
  }
}

export const relationResolver = (db: DatabaseConnection, schema = 'public') => 
  new RelationResolver(db, schema);
