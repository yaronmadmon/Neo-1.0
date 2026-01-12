/**
 * Neo Runtime Engine - Complete Runtime Package
 * Powers the preview and future real apps
 */

// Core runtime (legacy)
export * from './runtime.js';
export * from './flow-engine.js';

// New runtime engine (Phase 3)
export * from './runtime-engine.js';

// Event System
export {
  EventBus,
  RuntimeEventType,
  getEventBus,
  resetEventBus,
  type EventCallback,
  type EventSubscription,
  type EventPayload,
} from './event-system.js';

// Data Store
export {
  RuntimeDataStore,
  getDataStore,
  resetDataStore,
  type DataChangeListener,
  type DataChange,
  type DataQuery,
  type DataRecord,
} from './data-store.js';

// State Manager
export {
  StateManager,
  getStateManager,
  resetStateManager,
  type StateSubscriber,
  type ComponentState,
  type PageState,
  type UIState,
  type NotificationState,
  type AppState,
} from './state-manager.js';

// Binding Engine
export {
  BindingEngine,
  type BindingConfig,
  type BindingSource,
  type BindingTarget,
  type BindingTransform,
  type BindingContext,
  type ActiveBinding,
} from './binding-engine.js';

// Action Executor
export {
  ActionExecutor,
  type ActionConfig,
  type ActionResult,
  type ActionContext,
  type ActionHandler,
} from './action-executor.js';

// Conditional Rendering
export {
  ConditionalRenderer,
  ConditionBuilder,
  type ConditionConfig,
  type ConditionOperator,
  type ConditionalProps,
  type EvaluationContext,
} from './conditional-renderer.js';

// Dynamic Styling
export {
  DynamicStyler,
  type StyleRule,
  type StyleDefinition,
  type StyleExpression,
  type ThemeConfig,
  type TypographyConfig,
  type StyleContext,
} from './dynamic-styling.js';

// Layout Manager
export {
  LayoutManager,
  LayoutPresets,
  type LayoutConfig,
  type LayoutType,
  type AlignValue,
  type JustifyValue,
  type ColumnConfig,
  type RowConfig,
  type ResponsiveLayout,
  type SectionConfig,
  type LayoutSlot,
  type PositionConfig,
} from './layout-manager.js';

// Permissions Service
export {
  PermissionsService,
  type PermissionContext,
  type RowContext,
} from './permissions-service.js';