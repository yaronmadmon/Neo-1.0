/**
 * Entity → SQL Compiler
 * Converts Neo entity definitions to SQL table schemas
 */

import type {
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  SqlColumnType,
  ConstraintDefinition,
} from './types.js';

// Entity types from blueprint engine
interface EntityField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  defaultValue?: unknown;
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
}

interface Entity {
  id: string;
  name: string;
  pluralName: string;
  fields: EntityField[];
  timestamps?: {
    createdAt?: boolean;
    updatedAt?: boolean;
    deletedAt?: boolean;
  };
}

// ============================================================
// SQL COMPILER
// ============================================================

export class SqlCompiler {
  private schema: string;

  constructor(schema = 'public') {
    this.schema = schema;
  }

  /**
   * Compile an entity to a table definition
   */
  compileEntity(entity: Entity): TableDefinition {
    const tableName = this.toSnakeCase(entity.pluralName || entity.name + 's');
    const columns: ColumnDefinition[] = [];
    const indexes: IndexDefinition[] = [];
    const constraints: ConstraintDefinition[] = [];

    // Primary key
    columns.push({
      name: 'id',
      type: 'UUID',
      nullable: false,
      primaryKey: true,
      default: 'gen_random_uuid()',
    });

    // Compile each field
    for (const field of entity.fields) {
      if (field.id === 'id') continue; // Skip duplicate id

      const column = this.compileField(field, entity);
      if (column) {
        columns.push(column);
      }

      // Add index for reference fields and unique fields
      if (field.reference || field.unique || field.indexed) {
        indexes.push({
          name: `idx_${tableName}_${this.toSnakeCase(field.name)}`,
          columns: [this.toSnakeCase(field.name)],
          unique: field.unique,
        });
      }
    }

    // Timestamps
    if (entity.timestamps?.createdAt !== false) {
      columns.push({
        name: 'created_at',
        type: 'TIMESTAMPTZ',
        nullable: false,
        default: 'NOW()',
      });
    }

    if (entity.timestamps?.updatedAt !== false) {
      columns.push({
        name: 'updated_at',
        type: 'TIMESTAMPTZ',
        nullable: false,
        default: 'NOW()',
      });
    }

    if (entity.timestamps?.deletedAt) {
      columns.push({
        name: 'deleted_at',
        type: 'TIMESTAMPTZ',
        nullable: true,
      });
      // Add index for soft delete queries
      indexes.push({
        name: `idx_${tableName}_deleted_at`,
        columns: ['deleted_at'],
        where: 'deleted_at IS NULL',
      });
    }

    return {
      name: tableName,
      schema: this.schema,
      columns,
      indexes,
      constraints,
      timestamps: entity.timestamps?.updatedAt !== false,
    };
  }

  /**
   * Compile a field to a column definition
   */
  private compileField(field: EntityField, entity: Entity): ColumnDefinition | null {
    // Skip computed virtual fields (they don't need columns)
    if (field.computed && field.computed.expression) {
      return null;
    }

    const columnName = this.toSnakeCase(field.name);
    const sqlType = this.mapFieldTypeToSql(field);
    
    const column: ColumnDefinition = {
      name: columnName,
      type: sqlType,
      nullable: !field.required,
      unique: field.unique,
    };

    // Default value
    if (field.defaultValue !== undefined) {
      column.default = this.compileDefaultValue(field.defaultValue, sqlType);
    }

    // Foreign key reference
    if (field.reference) {
      const targetTable = this.toSnakeCase(field.reference.entity + 's');
      column.references = {
        table: targetTable,
        column: 'id',
        onDelete: field.reference.cascadeDelete ? 'CASCADE' : 'SET NULL',
        onUpdate: 'CASCADE',
      };
    }

    // Check constraint for enums
    if (field.type === 'enum' && field.enumOptions) {
      const values = field.enumOptions.map(o => `'${o.value}'`).join(', ');
      column.check = `${columnName} IN (${values})`;
    }

    // Check constraints for validation
    if (field.validation) {
      const checks: string[] = [];
      if (field.validation.min !== undefined) {
        checks.push(`${columnName} >= ${field.validation.min}`);
      }
      if (field.validation.max !== undefined) {
        checks.push(`${columnName} <= ${field.validation.max}`);
      }
      if (checks.length > 0) {
        column.check = column.check
          ? `(${column.check}) AND (${checks.join(' AND ')})`
          : checks.join(' AND ');
      }
    }

    return column;
  }

  /**
   * Map Neo field type to SQL column type
   */
  private mapFieldTypeToSql(field: EntityField): SqlColumnType {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'richtext':
        return 'TEXT';
      
      case 'number':
      case 'integer':
        return 'INTEGER';
      
      case 'currency':
      case 'decimal':
      case 'percentage':
        return 'DECIMAL';
      
      case 'boolean':
        return 'BOOLEAN';
      
      case 'date':
        return 'DATE';
      
      case 'datetime':
      case 'timestamp':
        return 'TIMESTAMPTZ';
      
      case 'time':
        return 'TIME';
      
      case 'email':
      case 'phone':
      case 'url':
        return 'VARCHAR';
      
      case 'image':
      case 'file':
        return 'TEXT'; // Store URL/path
      
      case 'reference':
        return 'UUID';
      
      case 'enum':
        return 'VARCHAR';
      
      case 'json':
      case 'address':
      case 'geolocation':
        return 'JSONB';
      
      case 'rating':
        return 'INTEGER';
      
      case 'color':
      case 'barcode':
      case 'signature':
        return 'TEXT';
      
      case 'duration':
        return 'INTEGER'; // Store as seconds
      
      default:
        return 'TEXT';
    }
  }

  /**
   * Compile a default value to SQL
   */
  private compileDefaultValue(value: unknown, sqlType: SqlColumnType): string {
    if (value === null) return 'NULL';
    
    switch (sqlType) {
      case 'TEXT':
      case 'VARCHAR':
        return `'${String(value).replace(/'/g, "''")}'`;
      
      case 'INTEGER':
      case 'BIGINT':
      case 'DECIMAL':
      case 'NUMERIC':
        return String(value);
      
      case 'BOOLEAN':
        return value ? 'TRUE' : 'FALSE';
      
      case 'JSONB':
        return `'${JSON.stringify(value)}'::jsonb`;
      
      case 'TIMESTAMPTZ':
        if (value === 'now' || value === 'NOW()') return 'NOW()';
        return `'${String(value)}'::timestamptz`;
      
      case 'DATE':
        if (value === 'today' || value === 'CURRENT_DATE') return 'CURRENT_DATE';
        return `'${String(value)}'::date`;
      
      default:
        return `'${String(value).replace(/'/g, "''")}'`;
    }
  }

  /**
   * Generate CREATE TABLE SQL
   */
  generateCreateTableSql(table: TableDefinition): string {
    const lines: string[] = [];
    const tableName = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
    
    lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
    
    // Columns
    const columnDefs = table.columns.map(col => this.generateColumnSql(col));
    lines.push('  ' + columnDefs.join(',\n  '));
    
    lines.push(');');
    
    // Indexes
    if (table.indexes) {
      for (const index of table.indexes) {
        lines.push('');
        lines.push(this.generateIndexSql(table.name, index, table.schema));
      }
    }
    
    // Update trigger for updated_at
    if (table.timestamps) {
      lines.push('');
      lines.push(this.generateUpdatedAtTrigger(table.name, table.schema));
    }
    
    return lines.join('\n');
  }

  /**
   * Generate column definition SQL
   */
  private generateColumnSql(column: ColumnDefinition): string {
    const parts: string[] = [`"${column.name}"`, column.type];
    
    if (column.primaryKey) {
      parts.push('PRIMARY KEY');
    }
    
    if (!column.nullable) {
      parts.push('NOT NULL');
    }
    
    if (column.unique && !column.primaryKey) {
      parts.push('UNIQUE');
    }
    
    if (column.default) {
      parts.push(`DEFAULT ${column.default}`);
    }
    
    if (column.references) {
      const ref = column.references;
      parts.push(`REFERENCES "${ref.table}"("${ref.column}")`);
      if (ref.onDelete) parts.push(`ON DELETE ${ref.onDelete}`);
      if (ref.onUpdate) parts.push(`ON UPDATE ${ref.onUpdate}`);
    }
    
    if (column.check) {
      parts.push(`CHECK (${column.check})`);
    }
    
    return parts.join(' ');
  }

  /**
   * Generate index SQL
   */
  private generateIndexSql(tableName: string, index: IndexDefinition, schema?: string): string {
    const qualifiedTable = schema ? `"${schema}"."${tableName}"` : `"${tableName}"`;
    const columns = index.columns.map(c => `"${c}"`).join(', ');
    const unique = index.unique ? 'UNIQUE ' : '';
    const using = index.type ? ` USING ${index.type}` : '';
    const where = index.where ? ` WHERE ${index.where}` : '';
    
    return `CREATE ${unique}INDEX IF NOT EXISTS "${index.name}" ON ${qualifiedTable}${using} (${columns})${where};`;
  }

  /**
   * Generate updated_at trigger
   */
  private generateUpdatedAtTrigger(tableName: string, schema?: string): string {
    const qualifiedTable = schema ? `"${schema}"."${tableName}"` : `"${tableName}"`;
    const funcName = `update_${tableName}_updated_at`;
    
    return `
-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION ${funcName}()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_${tableName}_updated_at ON ${qualifiedTable};
CREATE TRIGGER trigger_${tableName}_updated_at
  BEFORE UPDATE ON ${qualifiedTable}
  FOR EACH ROW
  EXECUTE FUNCTION ${funcName}();
`.trim();
  }

  /**
   * Generate DROP TABLE SQL
   */
  generateDropTableSql(tableName: string, cascade = false): string {
    const qualifiedTable = this.schema ? `"${this.schema}"."${tableName}"` : `"${tableName}"`;
    return `DROP TABLE IF EXISTS ${qualifiedTable}${cascade ? ' CASCADE' : ''};`;
  }

  /**
   * Generate ALTER TABLE for adding columns
   */
  generateAddColumnSql(tableName: string, column: ColumnDefinition): string {
    const qualifiedTable = this.schema ? `"${this.schema}"."${tableName}"` : `"${tableName}"`;
    return `ALTER TABLE ${qualifiedTable} ADD COLUMN ${this.generateColumnSql(column)};`;
  }

  /**
   * Generate migration SQL for entity changes
   */
  generateMigrationSql(
    oldEntity: Entity | null,
    newEntity: Entity
  ): { up: string[]; down: string[] } {
    const up: string[] = [];
    const down: string[] = [];
    
    if (!oldEntity) {
      // New table
      const table = this.compileEntity(newEntity);
      up.push(this.generateCreateTableSql(table));
      down.push(this.generateDropTableSql(table.name, true));
    } else {
      // Alter existing table
      const tableName = this.toSnakeCase(newEntity.pluralName || newEntity.name + 's');
      const qualifiedTable = this.schema ? `"${this.schema}"."${tableName}"` : `"${tableName}"`;
      
      const oldFields = new Map(oldEntity.fields.map(f => [f.id, f]));
      const newFields = new Map(newEntity.fields.map(f => [f.id, f]));
      
      // Find added fields
      for (const [id, field] of newFields) {
        if (!oldFields.has(id)) {
          const column = this.compileField(field, newEntity);
          if (column) {
            up.push(this.generateAddColumnSql(tableName, column));
            down.push(`ALTER TABLE ${qualifiedTable} DROP COLUMN IF EXISTS "${column.name}";`);
          }
        }
      }
      
      // Find removed fields
      for (const [id, field] of oldFields) {
        if (!newFields.has(id)) {
          const columnName = this.toSnakeCase(field.name);
          up.push(`ALTER TABLE ${qualifiedTable} DROP COLUMN IF EXISTS "${columnName}";`);
          const column = this.compileField(field, oldEntity);
          if (column) {
            down.push(this.generateAddColumnSql(tableName, column));
          }
        }
      }
      
      // Find modified fields (type changes, etc.)
      for (const [id, newField] of newFields) {
        const oldField = oldFields.get(id);
        if (oldField && this.fieldChanged(oldField, newField)) {
          const columnName = this.toSnakeCase(newField.name);
          const newType = this.mapFieldTypeToSql(newField);
          const oldType = this.mapFieldTypeToSql(oldField);
          
          if (newType !== oldType) {
            up.push(`ALTER TABLE ${qualifiedTable} ALTER COLUMN "${columnName}" TYPE ${newType} USING "${columnName}"::${newType};`);
            down.push(`ALTER TABLE ${qualifiedTable} ALTER COLUMN "${columnName}" TYPE ${oldType} USING "${columnName}"::${oldType};`);
          }
          
          // Handle nullable changes
          if (oldField.required !== newField.required) {
            if (newField.required) {
              up.push(`ALTER TABLE ${qualifiedTable} ALTER COLUMN "${columnName}" SET NOT NULL;`);
              down.push(`ALTER TABLE ${qualifiedTable} ALTER COLUMN "${columnName}" DROP NOT NULL;`);
            } else {
              up.push(`ALTER TABLE ${qualifiedTable} ALTER COLUMN "${columnName}" DROP NOT NULL;`);
              down.push(`ALTER TABLE ${qualifiedTable} ALTER COLUMN "${columnName}" SET NOT NULL;`);
            }
          }
        }
      }
    }
    
    return { up, down };
  }

  /**
   * Generate many-to-many junction table
   */
  generateJunctionTableSql(
    entity1: string,
    entity2: string,
    field1: string,
    field2: string
  ): string {
    const table1 = this.toSnakeCase(entity1 + 's');
    const table2 = this.toSnakeCase(entity2 + 's');
    const junctionName = `${table1}_${table2}`;
    const col1 = `${this.toSnakeCase(entity1)}_id`;
    const col2 = `${this.toSnakeCase(entity2)}_id`;
    
    return `
CREATE TABLE IF NOT EXISTS "${this.schema}"."${junctionName}" (
  "${col1}" UUID NOT NULL REFERENCES "${this.schema}"."${table1}"("id") ON DELETE CASCADE,
  "${col2}" UUID NOT NULL REFERENCES "${this.schema}"."${table2}"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("${col1}", "${col2}")
);

CREATE INDEX IF NOT EXISTS "idx_${junctionName}_${col1}" ON "${this.schema}"."${junctionName}" ("${col1}");
CREATE INDEX IF NOT EXISTS "idx_${junctionName}_${col2}" ON "${this.schema}"."${junctionName}" ("${col2}");
`.trim();
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/\s+/g, '_');
  }

  /**
   * Check if a field definition changed
   */
  private fieldChanged(oldField: EntityField, newField: EntityField): boolean {
    return (
      oldField.type !== newField.type ||
      oldField.required !== newField.required ||
      oldField.unique !== newField.unique ||
      JSON.stringify(oldField.reference) !== JSON.stringify(newField.reference)
    );
  }
}

// Export singleton instance
export const sqlCompiler = new SqlCompiler();
