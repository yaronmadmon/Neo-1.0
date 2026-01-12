/**
 * NEO DNA System - Blueprint Engine Phase 2
 * 
 * The DNA system generates complete multi-page apps from voice input.
 * Each builder is responsible for a specific aspect of the app blueprint.
 * 
 * @module @neo/dna
 */

export { AppSchema, type UnifiedAppSchema } from './schema.js';
export { PageBuilder, type PageBuildContext } from './page-builder.js';
export { EntityBuilder, type EntityBuildContext } from './entity-builder.js';
export { WorkflowBuilder, type WorkflowBuildContext } from './workflow-builder.js';
export { NavigationBuilder, type NavigationBuildContext } from './navigation-builder.js';
export { ThemeBuilder, type ThemeBuildContext } from './theme-builder.js';
export { DataModelInference, type DataModelContext } from './data-model-inference.js';
export { NeoBlueprintEngine, neoBlueprintEngine, type BlueprintContext, type BlueprintResult } from './neo-blueprint-engine.js';
export {
  NeoRoleSchema,
  NeoAccessRuleSchema,
  NeoPermissionsSchema,
  type NeoRole,
  type NeoAccessRule,
  type NeoPermissions,
  hasRolePermission,
  createDefaultPermissions,
  createPageAccessRule,
  createFieldAccessRule,
  createRowAccessRule,
  createActionAccessRule,
  ROLE_HIERARCHY,
} from './permissions-schema.js';
