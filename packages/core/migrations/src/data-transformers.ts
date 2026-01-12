/**
 * Data Transformer
 * Transforms existing data during schema migrations
 */

import { FieldType, type DataModel } from '@neo/contracts';
import type { DataMigration } from './types.js';

/**
 * Data transformer for field type conversions
 */
export class DataTransformer {
  /**
   * Transform data according to data migrations
   */
  transformData(
    data: Record<string, unknown[]>,
    migrations: DataMigration[]
  ): Record<string, unknown[]> {
    let transformedData = { ...data };
    
    for (const migration of migrations) {
      transformedData = this.applyDataMigration(transformedData, migration);
    }
    
    return transformedData;
  }
  
  /**
   * Apply a single data migration
   */
  private applyDataMigration(
    data: Record<string, unknown[]>,
    migration: DataMigration
  ): Record<string, unknown[]> {
    switch (migration.type) {
      case 'ADD_FIELD_TO_RECORDS':
        return this.addFieldToRecords(data, migration);
        
      case 'TRANSFORM_FIELD_DATA':
        return this.transformFieldData(data, migration);
        
      case 'REMOVE_FIELD_FROM_RECORDS':
        return this.removeFieldFromRecords(data, migration);
        
      default:
        return data;
    }
  }
  
  /**
   * Add field to all records in a model
   */
  private addFieldToRecords(
    data: Record<string, unknown[]>,
    migration: DataMigration
  ): Record<string, unknown[]> {
    const { modelId, fieldId, defaultValue } = migration;
    
    if (!modelId || !fieldId) {
      return data;
    }
    
    const records = data[modelId] || [];
    const transformedRecords = records.map((record: any) => ({
      ...record,
      [fieldId]: defaultValue,
    }));
    
    return {
      ...data,
      [modelId]: transformedRecords,
    };
  }
  
  /**
   * Transform field data (type conversion)
   */
  private transformFieldData(
    data: Record<string, unknown[]>,
    migration: DataMigration
  ): Record<string, unknown[]> {
    const { modelId, fieldId, transform } = migration;
    
    if (!modelId || !fieldId || !transform) {
      return data;
    }
    
    const records = data[modelId] || [];
    const transformedRecords = records.map((record: any) => {
      const value = record[fieldId];
      return {
        ...record,
        [fieldId]: transform(value),
      };
    });
    
    return {
      ...data,
      [modelId]: transformedRecords,
    };
  }
  
  /**
   * Remove field from all records in a model
   */
  private removeFieldFromRecords(
    data: Record<string, unknown[]>,
    migration: DataMigration
  ): Record<string, unknown[]> {
    const { modelId, fieldId } = migration;
    
    if (!modelId || !fieldId) {
      return data;
    }
    
    const records = data[modelId] || [];
    const transformedRecords = records.map((record: any) => {
      const { [fieldId]: removed, ...rest } = record;
      return rest;
    });
    
    return {
      ...data,
      [modelId]: transformedRecords,
    };
  }
  
  /**
   * Get type transformation function
   */
  getTypeTransformFunction(from: FieldType, to: FieldType): (value: unknown) => unknown {
    // Safe conversions (no data loss)
    if (from === FieldType.STRING && to === FieldType.EMAIL) {
      return (value) => value; // Email is still a string
    }
    
    if (from === FieldType.NUMBER && to === FieldType.STRING) {
      return (value) => String(value ?? '');
    }
    
    if (from === FieldType.BOOLEAN && to === FieldType.STRING) {
      return (value) => String(value ?? 'false');
    }
    
    // Conversions with defaults (potential data loss)
    if (from === FieldType.STRING && to === FieldType.NUMBER) {
      return (value) => {
        if (value === null || value === undefined) return 0;
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      };
    }
    
    if (from === FieldType.STRING && to === FieldType.DATE) {
      return (value) => {
        if (value === null || value === undefined) return new Date().toISOString();
        const date = new Date(value as string);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      };
    }
    
    if (from === FieldType.NUMBER && to === FieldType.BOOLEAN) {
      return (value) => Boolean(value);
    }
    
    // Default: return as-is (no conversion)
    return (value) => value;
  }
  
  /**
   * Backup field data before removal
   */
  backupFieldData(
    data: Record<string, unknown[]>,
    modelId: string,
    fieldId: string
  ): unknown[] {
    const records = data[modelId] || [];
    return records.map((record: any) => ({
      id: record.id,
      [fieldId]: record[fieldId],
    }));
  }
}
