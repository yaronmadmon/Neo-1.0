import { z } from 'zod';

// App Categories
export enum AppCategory {
  BUSINESS = 'business',
  PERSONAL = 'personal',
  HOME = 'home',
  CREATIVE = 'creative',
  HEALTH = 'health',
  EDUCATION = 'education',
}

// Privacy Levels
export enum AppPrivacyLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  FAMILY = 'family',
  ENTERPRISE = 'enterprise',
}

// Component Types
export enum ComponentType {
  // Basic components
  CONTAINER = 'container',
  TEXT = 'text',
  BUTTON = 'button',
  INPUT = 'input',
  
  // Data display components
  LIST = 'list',
  TABLE = 'table',
  CARD = 'card',
  CALENDAR = 'calendar',
  KANBAN = 'kanban',
  GALLERY = 'gallery',
  CHART = 'chart',
  
  // Interactive components
  FORM = 'form',
  CHAT = 'chat',
  MAP = 'map',
  
  // Layout components
  SECTION = 'section',
  ROW = 'row',
  GRID = 'grid',
  DASHBOARD = 'dashboard',
  DIVIDER = 'divider',
  
  // Navigation & overlay
  NAVIGATION = 'navigation',
  MODAL = 'modal',
  
  // Media components
  IMAGE = 'image',
  VIDEO = 'video',
  
  // UI elements
  BADGE = 'badge',
}

// Field Types
export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone',
  IMAGE = 'image',
  FILE = 'file',
  REFERENCE = 'reference',
}

// Intent Types
export enum IntentType {
  CREATE_APP = 'create_app',
  MODIFY_APP = 'modify_app',
  ADD_FEATURE = 'add_feature',
  CHANGE_DESIGN = 'change_design',
  ADD_DATA = 'add_data',
  CREATE_FLOW = 'create_flow',
  ADD_INTEGRATION = 'add_integration',
}

// Flow Trigger Types
export enum FlowTriggerType {
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  DATA_CREATE = 'data_create',
  DATA_UPDATE = 'data_update',
  DATA_DELETE = 'data_delete',
}

// Flow Action Types
export enum FlowActionType {
  CREATE_RECORD = 'create_record',
  UPDATE_RECORD = 'update_record',
  DELETE_RECORD = 'delete_record',
  NAVIGATE = 'navigate',
  SHOW_NOTIFICATION = 'show_notification',
  REFRESH_DATA = 'refresh_data',
}

// Zod Schemas
export const ReferenceFieldConfigSchema = z.object({
  targetModel: z.string(), // e.g., "Project" - the model this field references
  displayField: z.string(), // e.g., "name" - the field to show in dropdowns/tables
});

export const FieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(FieldType),
  required: z.boolean().default(false),
  unique: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  validation: z.array(z.any()).optional(),
  // Reference-specific configuration (only used when type === 'reference')
  reference: ReferenceFieldConfigSchema.optional(),
}).refine(
  (field) => {
    // If type is REFERENCE, reference config must be provided
    if (field.type === FieldType.REFERENCE) {
      return field.reference !== undefined;
    }
    // If type is not REFERENCE, reference config should not be provided
    return field.reference === undefined;
  },
  {
    message: "Reference fields must have reference configuration, and non-reference fields cannot have reference configuration",
  }
);

export const DataModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(FieldSchema),
  relationships: z.array(z.any()).optional(),
});

export const ComponentInstanceSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string(),
  componentId: z.string(),
  props: z.record(z.unknown()),
  children: z.array(ComponentInstanceSchema).optional(),
  styles: z.record(z.unknown()).optional(),
}));

export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string().regex(/^\/[a-z0-9\-/]*$/i),
  layout: z.record(z.unknown()),
  components: z.array(ComponentInstanceSchema),
});

export const FlowTriggerSchema = z.object({
  type: z.nativeEnum(FlowTriggerType),
  componentId: z.string().optional(),
  modelId: z.string().optional(),
  event: z.string().optional(),
});

export const FlowActionSchema = z.object({
  type: z.nativeEnum(FlowActionType),
  modelId: z.string().optional(),
  recordId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  targetPageId: z.string().optional(),
  message: z.string().optional(),
  blocking: z.boolean().optional().default(true),
});

export const FlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  trigger: FlowTriggerSchema,
  actions: z.array(FlowActionSchema).min(1).max(10),
  enabled: z.boolean().default(true),
});

export const AppSchemaSchema = z.object({
  schemaVersion: z.string().optional(), // Optional version for schema compatibility
  pages: z.array(PageSchema).max(100),
  components: z.array(z.any()).max(500),
  dataModels: z.array(DataModelSchema).max(50),
  flows: z.array(FlowSchema).max(100),
});

export const ThemeConfigSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    textSecondary: z.string(),
    error: z.string().optional(),
    success: z.string().optional(),
    warning: z.string().optional(),
  }),
  typography: z.record(z.unknown()),
  spacing: z.record(z.unknown()),
  borderRadius: z.record(z.unknown()).optional(),
  shadows: z.record(z.unknown()).optional(),
});

export const AppSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.nativeEnum(AppCategory),
  privacyLevel: z.nativeEnum(AppPrivacyLevel),
  version: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid(),
  schema: AppSchemaSchema,
  theme: ThemeConfigSchema,
  data: z.record(z.array(z.unknown())).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const UserIntentSchema = z.object({
  type: z.nativeEnum(IntentType),
  input: z.string().min(1).max(10000),
  context: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const SafetyResultSchema = z.object({
  safe: z.boolean(),
  blocked: z.boolean(),
  violations: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    message: z.string(),
  })).optional(),
  suggestions: z.array(z.string()).optional(),
});

// TypeScript Types
export type ReferenceFieldConfig = z.infer<typeof ReferenceFieldConfigSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type DataModel = z.infer<typeof DataModelSchema>;
export type ComponentInstance = z.infer<typeof ComponentInstanceSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type AppSchemaType = z.infer<typeof AppSchemaSchema>;
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;
export type App = z.infer<typeof AppSchema>;
export type AppBlueprint = AppSchemaType; // Alias for app structure/blueprint
export type UserIntent = z.infer<typeof UserIntentSchema>;
export type SafetyResult = z.infer<typeof SafetyResultSchema>;

// User Preferences
export interface UserPreferences {
  userId?: string;
  category?: AppCategory;
  enableAnalytics?: boolean;
  privacyFirst?: boolean;
  offlineMode?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}
