/**
 * Migration System Types
 * Defines types for atomic, data-preserving app modifications
 */

import { z } from 'zod';
import { FieldType, type DataModel, type App } from '@neo/contracts';

/**
 * Migration types - atomic operations for modifying apps
 */
export enum MigrationType {
  // Data Model Migrations
  ADD_FIELD = 'ADD_FIELD',
  REMOVE_FIELD = 'REMOVE_FIELD',
  UPDATE_FIELD_TYPE = 'UPDATE_FIELD_TYPE',
  UPDATE_FIELD_PROPERTIES = 'UPDATE_FIELD_PROPERTIES',
  RENAME_FIELD = 'RENAME_FIELD',
  
  // Component Migrations
  ADD_COMPONENT = 'ADD_COMPONENT',
  REMOVE_COMPONENT = 'REMOVE_COMPONENT',
  UPDATE_COMPONENT_PROP = 'UPDATE_COMPONENT_PROP',
  UPDATE_COMPONENT_STYLE = 'UPDATE_COMPONENT_STYLE',
  MOVE_COMPONENT = 'MOVE_COMPONENT',
  
  // Page Migrations
  ADD_PAGE = 'ADD_PAGE',
  REMOVE_PAGE = 'REMOVE_PAGE',
  UPDATE_PAGE_ROUTE = 'UPDATE_PAGE_ROUTE',
  UPDATE_PAGE_LAYOUT = 'UPDATE_PAGE_LAYOUT',
  
  // Theme Migrations
  UPDATE_THEME_COLOR = 'UPDATE_THEME_COLOR',
  UPDATE_THEME_TYPOGRAPHY = 'UPDATE_THEME_TYPOGRAPHY',
  UPDATE_THEME_SPACING = 'UPDATE_THEME_SPACING',
  
  // Data Migrations
  TRANSFORM_DATA = 'TRANSFORM_DATA',
}

/**
 * Migration target - specifies what to modify
 */
export interface MigrationTarget {
  // For data models
  modelId?: string;
  fieldId?: string;
  
  // For components
  pageId?: string;
  componentId?: string;
  
  // For theme
  themeProperty?: string;
  
  // For data
  dataModelId?: string;
  dataRecordIds?: string[];
}

/**
 * Rollback parameters for undo capability
 */
export interface RollbackParams {
  previousValue: unknown;
  restoreData?: Record<string, unknown>;
}

/**
 * Migration - atomic operation for modifying an app
 */
export interface Migration {
  id: string;
  type: MigrationType;
  timestamp: Date;
  target: MigrationTarget;
  params: Record<string, unknown>;
  rollback?: RollbackParams;
}

/**
 * Validation check for migrations
 */
export interface ValidationCheck {
  type: 'data_integrity' | 'schema_validity' | 'component_references';
  description: string;
  passed: boolean;
  error?: string;
}

/**
 * Migration plan - sequence of migrations for a user request
 */
export interface MigrationPlan {
  id: string;
  description: string;
  migrations: Migration[];
  estimatedRisk: 'low' | 'medium' | 'high';
  dataPreservation: boolean;
  validationChecks: ValidationCheck[];
}

/**
 * Data migration - transformation of existing data
 */
export interface DataMigration {
  type: 'ADD_FIELD_TO_RECORDS' | 'TRANSFORM_FIELD_DATA' | 'REMOVE_FIELD_FROM_RECORDS';
  modelId: string;
  fieldId?: string;
  defaultValue?: unknown;
  transform?: (value: unknown) => unknown;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  app: App;
  appliedMigrations: Migration[];
  dataMigrations?: DataMigration[];
  error?: string;
}

/**
 * Helper function to generate migration ID
 */
export function generateMigrationId(): string {
  return `mig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
