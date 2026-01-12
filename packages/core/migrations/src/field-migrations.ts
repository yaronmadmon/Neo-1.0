/**
 * Field Migration Engine
 * Handles field-level migrations (ADD_FIELD, REMOVE_FIELD, UPDATE_FIELD_TYPE)
 */

import { FieldType, type DataModel, type Field } from '@neo/contracts';
import type { Migration, DataMigration } from './types.js';
import { DataTransformer } from './data-transformers.js';

/**
 * Field migration engine
 */
export class FieldMigrationEngine {
  private dataTransformer: DataTransformer;
  
  constructor() {
    this.dataTransformer = new DataTransformer();
  }
  
  /**
   * Apply migration to a data model
   */
  applyMigration(
    model: DataModel,
    migration: Migration
  ): { model: DataModel; dataMigration?: DataMigration } {
    switch (migration.type) {
      case 'ADD_FIELD':
        return this.applyAddField(model, migration);
        
      case 'REMOVE_FIELD':
        return this.applyRemoveField(model, migration);
        
      case 'UPDATE_FIELD_TYPE':
        return this.applyUpdateFieldType(model, migration);
        
      case 'UPDATE_FIELD_PROPERTIES':
        return this.applyUpdateFieldProperties(model, migration);
        
      case 'RENAME_FIELD':
        return this.applyRenameField(model, migration);
        
      default:
        throw new Error(`Unsupported migration type: ${migration.type}`);
    }
  }
  
  /**
   * Apply ADD_FIELD migration
   */
  private applyAddField(
    model: DataModel,
    migration: Migration
  ): { model: DataModel; dataMigration?: DataMigration } {
    const { fieldId, fieldName, fieldType, properties } = migration.params;
    
    if (!fieldId || !fieldName || !fieldType) {
      throw new Error('ADD_FIELD migration requires fieldId, fieldName, and fieldType');
    }
    
    const fieldIdStr = fieldId as string;
    const fieldNameStr = fieldName as string;
    const fieldTypeStr = fieldType as string;
    const propertiesObj = properties as Record<string, unknown> | undefined;
    
    // Check if field already exists
    if (model.fields.some(f => f.id === fieldIdStr)) {
      throw new Error(`Field ${fieldIdStr} already exists in model ${model.id}`);
    }
    
    // Add field to schema
    const newField: Field = {
      id: fieldIdStr,
      name: fieldNameStr,
      type: fieldTypeStr as FieldType,
      required: (propertiesObj?.required as boolean) ?? false,
      unique: (propertiesObj?.unique as boolean),
      defaultValue: propertiesObj?.defaultValue,
      validation: (propertiesObj?.validation as any[]) ?? [],
    };
    
    const updatedModel: DataModel = {
      ...model,
      fields: [...model.fields, newField],
    };
    
    // Generate data migration for existing records
    const dataMigration: DataMigration = {
      type: 'ADD_FIELD_TO_RECORDS',
      modelId: model.id,
      fieldId: fieldIdStr,
      defaultValue: propertiesObj?.defaultValue,
    };
    
    return { model: updatedModel, dataMigration };
  }
  
  /**
   * Apply REMOVE_FIELD migration
   */
  private applyRemoveField(
    model: DataModel,
    migration: Migration
  ): { model: DataModel; dataMigration?: DataMigration } {
    const { fieldId } = migration.params;
    
    if (!fieldId) {
      throw new Error('REMOVE_FIELD migration requires fieldId');
    }
    
    const fieldIdStr = fieldId as string;
    
    // Check if field exists
    const fieldIndex = model.fields.findIndex(f => f.id === fieldIdStr);
    if (fieldIndex === -1) {
      throw new Error(`Field ${fieldIdStr} not found in model ${model.id}`);
    }
    
    // Remove field from schema
    const updatedModel: DataModel = {
      ...model,
      fields: model.fields.filter(f => f.id !== fieldIdStr),
    };
    
    // Generate data migration for existing records
    const dataMigration: DataMigration = {
      type: 'REMOVE_FIELD_FROM_RECORDS',
      modelId: model.id,
      fieldId: fieldIdStr,
    };
    
    return { model: updatedModel, dataMigration };
  }
  
  /**
   * Apply UPDATE_FIELD_TYPE migration
   */
  private applyUpdateFieldType(
    model: DataModel,
    migration: Migration
  ): { model: DataModel; dataMigration?: DataMigration } {
    const { fieldId, newType } = migration.params;
    
    if (!fieldId || !newType) {
      throw new Error('UPDATE_FIELD_TYPE migration requires fieldId and newType');
    }
    
    const fieldIdStr = fieldId as string;
    const newTypeStr = newType as string;
    
    // Find field
    const fieldIndex = model.fields.findIndex(f => f.id === fieldIdStr);
    if (fieldIndex === -1) {
      throw new Error(`Field ${fieldIdStr} not found in model ${model.id}`);
    }
    
    const field = model.fields[fieldIndex];
    const oldType = field.type;
    
    // Update field type
    const updatedField: Field = {
      ...field,
      type: newTypeStr as FieldType,
    };
    
    const updatedFields = [...model.fields];
    updatedFields[fieldIndex] = updatedField;
    
    const updatedModel: DataModel = {
      ...model,
      fields: updatedFields,
    };
    
    // Generate data transformation migration
    const transformFn = this.dataTransformer.getTypeTransformFunction(oldType, newTypeStr as FieldType);
    
    const dataMigration: DataMigration = {
      type: 'TRANSFORM_FIELD_DATA',
      modelId: model.id,
      fieldId: fieldIdStr,
      transform: transformFn,
    };
    
    return { model: updatedModel, dataMigration };
  }
  
  /**
   * Apply UPDATE_FIELD_PROPERTIES migration
   */
  private applyUpdateFieldProperties(
    model: DataModel,
    migration: Migration
  ): { model: DataModel; dataMigration?: DataMigration } {
    const { fieldId, properties } = migration.params;
    
    if (!fieldId || !properties) {
      throw new Error('UPDATE_FIELD_PROPERTIES migration requires fieldId and properties');
    }
    
    const fieldIdStr = fieldId as string;
    const propertiesObj = properties as Record<string, unknown>;
    
    // Find field
    const fieldIndex = model.fields.findIndex(f => f.id === fieldIdStr);
    if (fieldIndex === -1) {
      throw new Error(`Field ${fieldIdStr} not found in model ${model.id}`);
    }
    
    const field = model.fields[fieldIndex];
    
    // Update field properties
    const updatedField: Field = {
      ...field,
      required: (propertiesObj.required as boolean) ?? field.required,
      unique: (propertiesObj.unique as boolean) ?? field.unique,
      defaultValue: propertiesObj.defaultValue ?? field.defaultValue,
      validation: (propertiesObj.validation as any[]) ?? field.validation,
    };
    
    const updatedFields = [...model.fields];
    updatedFields[fieldIndex] = updatedField;
    
    const updatedModel: DataModel = {
      ...model,
      fields: updatedFields,
    };
    
    return { model: updatedModel };
  }
  
  /**
   * Apply RENAME_FIELD migration
   */
  private applyRenameField(
    model: DataModel,
    migration: Migration
  ): { model: DataModel; dataMigration?: DataMigration } {
    const { fieldId, newName } = migration.params;
    
    if (!fieldId || !newName) {
      throw new Error('RENAME_FIELD migration requires fieldId and newName');
    }
    
    const fieldIdStr = fieldId as string;
    const newNameStr = newName as string;
    
    // Find field
    const fieldIndex = model.fields.findIndex(f => f.id === fieldIdStr);
    if (fieldIndex === -1) {
      throw new Error(`Field ${fieldIdStr} not found in model ${model.id}`);
    }
    
    const field = model.fields[fieldIndex];
    
    // Update field name
    const updatedField: Field = {
      ...field,
      name: newNameStr,
    };
    
    const updatedFields = [...model.fields];
    updatedFields[fieldIndex] = updatedField;
    
    const updatedModel: DataModel = {
      ...model,
      fields: updatedFields,
    };
    
    return { model: updatedModel };
  }
}
