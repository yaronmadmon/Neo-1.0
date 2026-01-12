/**
 * Migration Applier
 * Applies migrations to apps atomically
 */

import type { App } from '@neo/contracts';
import type { Migration, MigrationPlan, MigrationResult, DataMigration } from './types.js';
import { FieldMigrationEngine } from './field-migrations.js';
import { ComponentMigrationEngine } from './component-migrations.js';
import { DataTransformer } from './data-transformers.js';

/**
 * Migration applier - applies migrations to apps
 */
export class MigrationApplier {
  private fieldEngine: FieldMigrationEngine;
  private componentEngine: ComponentMigrationEngine;
  private dataTransformer: DataTransformer;
  
  constructor() {
    this.fieldEngine = new FieldMigrationEngine();
    this.componentEngine = new ComponentMigrationEngine();
    this.dataTransformer = new DataTransformer();
  }
  
  /**
   * Apply migration plan to app
   */
  async applyMigrationPlan(
    app: App,
    plan: MigrationPlan
  ): Promise<MigrationResult> {
    const appliedMigrations: Migration[] = [];
    const dataMigrations: DataMigration[] = [];
    let currentApp = { ...app };
    
    try {
      // Apply migrations in sequence
      for (const migration of plan.migrations) {
        const result = await this.applyMigration(currentApp, migration);
        currentApp = result.app;
        appliedMigrations.push(migration);
        
        // Collect data migrations
        if (result.dataMigration) {
          dataMigrations.push(result.dataMigration);
        }
      }
      
      // Apply data migrations
      if (dataMigrations.length > 0 && currentApp.data) {
        currentApp.data = this.dataTransformer.transformData(
          currentApp.data,
          dataMigrations
        );
      }
      
      return {
        success: true,
        app: currentApp,
        appliedMigrations,
        dataMigrations: dataMigrations.length > 0 ? dataMigrations : undefined,
      };
      
    } catch (error: any) {
      // Rollback on failure (for now, just return error)
      // TODO: Implement rollback mechanism
      return {
        success: false,
        app: currentApp,
        appliedMigrations,
        error: error.message || 'Migration failed',
      };
    }
  }
  
  /**
   * Apply a single migration
   */
  private async applyMigration(
    app: App,
    migration: Migration
  ): Promise<{ app: App; dataMigration?: DataMigration }> {
    // Route to appropriate engine based on migration type
    if (this.isFieldMigration(migration.type)) {
      return this.applyFieldMigration(app, migration);
    }
    
    if (this.isComponentMigration(migration.type)) {
      return this.componentEngine.applyMigration(app, migration);
    }
    
    if (this.isThemeMigration(migration.type)) {
      return this.applyThemeMigration(app, migration);
    }
    
    throw new Error(`Unsupported migration type: ${migration.type}`);
  }
  
  /**
   * Apply field migration
   */
  private applyFieldMigration(
    app: App,
    migration: Migration
  ): { app: App; dataMigration?: DataMigration } {
    const { modelId } = migration.target;
    
    if (!modelId) {
      throw new Error(`Field migration requires modelId in target`);
    }
    
    // Find model
    const modelIndex = app.schema.dataModels.findIndex(m => m.id === modelId);
    if (modelIndex === -1) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    const model = app.schema.dataModels[modelIndex];
    
    // Apply migration to model
    const result = this.fieldEngine.applyMigration(model, migration);
    
    // Update app schema
    const updatedModels = [...app.schema.dataModels];
    updatedModels[modelIndex] = result.model;
    
    const updatedApp: App = {
      ...app,
      schema: {
        ...app.schema,
        dataModels: updatedModels,
      },
    };
    
    return {
      app: updatedApp,
      dataMigration: result.dataMigration,
    };
  }
  
  /**
   * Apply theme migration
   */
  private applyThemeMigration(
    app: App,
    migration: Migration
  ): { app: App } {
    const { themeProperty } = migration.target;
    const { value } = migration.params;
    
    if (!themeProperty || value === undefined) {
      throw new Error(`Theme migration requires themeProperty and value`);
    }
    
    // Update theme (simplified - assumes flat theme structure)
    const updatedTheme = {
      ...app.theme,
      [themeProperty]: value,
    };
    
    const updatedApp: App = {
      ...app,
      theme: updatedTheme,
    };
    
    return { app: updatedApp };
  }
  
  /**
   * Check if migration is a field migration
   */
  private isFieldMigration(type: string): boolean {
    return [
      'ADD_FIELD',
      'REMOVE_FIELD',
      'UPDATE_FIELD_TYPE',
      'UPDATE_FIELD_PROPERTIES',
      'RENAME_FIELD',
    ].includes(type);
  }
  
  /**
   * Check if migration is a component migration
   */
  private isComponentMigration(type: string): boolean {
    return [
      'ADD_COMPONENT',
      'REMOVE_COMPONENT',
      'UPDATE_COMPONENT_PROP',
      'UPDATE_COMPONENT_STYLE',
      'MOVE_COMPONENT',
    ].includes(type);
  }
  
  /**
   * Check if migration is a theme migration
   */
  private isThemeMigration(type: string): boolean {
    return [
      'UPDATE_THEME_COLOR',
      'UPDATE_THEME_TYPOGRAPHY',
      'UPDATE_THEME_SPACING',
    ].includes(type);
  }
}
