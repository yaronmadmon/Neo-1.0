/**
 * NEO DNA System - Blueprint Engine Phase 2
 * 
 * The DNA system generates complete multi-page apps from voice input.
 * Each builder is responsible for a specific aspect of the app blueprint.
 * 
 * @module @neo/dna
 */

export { 
  AppSchema, 
  type UnifiedAppSchema, 
  type SurfaceType,
  type SurfacesConfig,
  type CustomerNavigation,
  type StaffFeatures,
  SurfaceTypeSchema,
  SurfacesConfigSchema,
  CustomerNavigationSchema,
  StaffFeaturesSchema,
} from './schema.js';
export { PageBuilder, type PageBuildContext } from './page-builder.js';
export { EntityBuilder, type EntityBuildContext } from './entity-builder.js';
export { WorkflowBuilder, type WorkflowBuildContext } from './workflow-builder.js';
export { NavigationBuilder, type NavigationBuildContext } from './navigation-builder.js';
export { ThemeBuilder, type ThemeBuildContext } from './theme-builder.js';
export { DataModelInference, type DataModelContext } from './data-model-inference.js';

// Design Systems - Research-based visual configurations
export {
  DESIGN_SYSTEMS,
  INDUSTRY_DESIGN_SYSTEM_MAP,
  getDesignSystem,
  getDesignSystemForIndustry,
  getDesignSystemByIntent,
  designSystemToTheme,
  listDesignSystems,
  hasDesignSystemMapping,
  validateThemeCoherence,
  type DesignSystem,
  type DesignSystemId,
  type DesignSystemPalette,
  type DesignSystemTypography,
  type DesignSystemSpacing,
  type DesignSystemShadows,
  type DesignSystemAnimations,
} from './design-systems.js';

// Surface Themes - Environment/atmosphere layer
export {
  SURFACE_PRESETS,
  DESIGN_SYSTEM_SURFACE_MAP,
  getSurfaceTheme,
  getSurfaceIntentForDesignSystem,
  listSurfaceIntents,
  listSurfacePresets,
  validateWhiteBudget,
  warnIfWhiteBudgetExceeded,
  hexToHSLString,
  type SurfaceTheme,
  type SurfaceIntent,
} from './surface-theme.js';
export { NeoBlueprintEngine, neoBlueprintEngine, type BlueprintContext, type BlueprintResult } from './neo-blueprint-engine.js';
export {
  NeoRoleSchema,
  NeoAccessRuleSchema,
  NeoPermissionsSchema,
  type NeoRole,
  type NeoAccessRule,
  type NeoPermissions,
  type StaffPermissionContext,
  hasRolePermission,
  createDefaultPermissions,
  createPageAccessRule,
  createFieldAccessRule,
  createRowAccessRule,
  createActionAccessRule,
  canStaffAccessLocation,
  generateStaffPortalPermissions,
  ROLE_HIERARCHY,
} from './permissions-schema.js';

// Dashboard Intent System - semantic structure for dashboards
export {
  // Core types
  type SectionRole,
  type SectionPriority,
  type TimeScope,
  type LayoutHint,
  type EmphasisLevel,
  type ActionVisibilityRule,
  type DomainMetric,
  type ContextualAction,
  type DashboardSection,
  type DashboardIntent,
  // Ordering constants
  ROLE_ORDER,
  PRIORITY_ORDER,
  ACTIONABLE_ROLES,
  // Time scope helpers
  TIME_SCOPE_LABELS,
  TIME_SCOPE_SHORT_LABELS,
  TIME_SCOPE_FILTERS,
  filterByTimeScope,
  // Action helpers
  shouldShowAction,
  filterVisibleActions,
  // Validation
  validateSection,
  validateDashboardIntent,
  // Sorting
  sortSections,
  // Display helpers
  formatMetricLabel,
  canHaveActions,
  inferLayoutHint,
} from './dashboard-intent.js';

// Dashboard Intent Generator
export {
  generateDashboardIntent,
  getIndustrySectionConfig,
  extendIndustrySectionConfig,
  INDUSTRY_SECTION_CONFIGS,
  type IndustrySectionConfig,
  // Entity analysis helpers
  findStatusEntities,
  findSchedulableEntities,
  findPrimaryDateField,
  findStatusField,
  findMetricFields,
} from './dashboard-intent-generator.js';
