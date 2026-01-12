/**
 * Blueprint Engine Types
 * These types define the complete structure of an AppBlueprint
 * which is the single source of truth for app generation
 */

import { z } from 'zod';

// ============================================================
// FIELD TYPES
// ============================================================

export const FieldTypeEnum = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'email',
  'url',
  'phone',
  'image',
  'file',
  'reference',
  'enum',
  'currency',
  'percentage',
  'richtext',
  'json',
]);

export type FieldType = z.infer<typeof FieldTypeEnum>;

// ============================================================
// FIELD DEFINITION
// ============================================================

export const FieldValidationSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'pattern', 'email', 'url', 'custom']),
  value: z.unknown().optional(),
  message: z.string().optional(),
});

export const FieldDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: FieldTypeEnum,
  required: z.boolean().default(false),
  unique: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
  
  // Reference configuration
  reference: z.object({
    targetEntity: z.string(),
    displayField: z.string(),
    relationship: z.enum(['one-to-one', 'one-to-many', 'many-to-many']).default('many-to-many'),
  }).optional(),
  
  // Enum options
  enumOptions: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional(),
  })).optional(),
  
  // Validation rules
  validations: z.array(FieldValidationSchema).optional(),
  
  // Display options
  displayOptions: z.object({
    hidden: z.boolean().optional(),
    readonly: z.boolean().optional(),
    width: z.string().optional(),
    format: z.string().optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
  }).optional(),
});

export type FieldDef = z.infer<typeof FieldDefSchema>;

// ============================================================
// CRUD RULES
// ============================================================

export const CrudRuleSchema = z.object({
  create: z.object({
    enabled: z.boolean().default(true),
    requireConfirmation: z.boolean().optional(),
    redirectTo: z.string().optional(),
    successMessage: z.string().optional(),
  }).optional(),
  
  read: z.object({
    enabled: z.boolean().default(true),
    defaultSort: z.object({
      field: z.string(),
      direction: z.enum(['asc', 'desc']),
    }).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith']),
      value: z.unknown().optional(),
    })).optional(),
  }).optional(),
  
  update: z.object({
    enabled: z.boolean().default(true),
    requireConfirmation: z.boolean().optional(),
    successMessage: z.string().optional(),
  }).optional(),
  
  delete: z.object({
    enabled: z.boolean().default(true),
    requireConfirmation: z.boolean().default(true),
    confirmationMessage: z.string().optional(),
    softDelete: z.boolean().optional(),
  }).optional(),
});

export type CrudRule = z.infer<typeof CrudRuleSchema>;

// ============================================================
// ENTITY DEFINITION
// ============================================================

export const EntityDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  pluralName: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  
  // Fields
  fields: z.array(FieldDefSchema),
  
  // CRUD Rules
  crudRules: CrudRuleSchema.optional(),
  
  // Display configuration
  displayConfig: z.object({
    titleField: z.string(),
    subtitleField: z.string().optional(),
    imageField: z.string().optional(),
    listFields: z.array(z.string()).optional(),
    searchFields: z.array(z.string()).optional(),
  }).optional(),
  
  // Timestamps
  timestamps: z.object({
    createdAt: z.boolean().default(true),
    updatedAt: z.boolean().default(true),
  }).optional(),
});

export type EntityDef = z.infer<typeof EntityDefSchema>;

// ============================================================
// PAGE TYPES
// ============================================================

export const PageTypeEnum = z.enum([
  'list',
  'detail',
  'form',
  'dashboard',
  'calendar',
  'kanban',
  'table',
  'grid',
  'timeline',
  'map',
  'chart',
  'custom',
]);

export type PageType = z.infer<typeof PageTypeEnum>;

// ============================================================
// LAYOUT TOKENS
// ============================================================

export const LayoutSectionSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum(['header', 'sidebar', 'main', 'footer', 'card', 'row', 'column', 'grid', 'tabs', 'accordion']),
    title: z.string().optional(),
    collapsed: z.boolean().optional(),
    width: z.string().optional(),
    components: z.array(z.string()), // Component IDs
    children: z.array(LayoutSectionSchema).optional(),
  })
);

export type LayoutSection = z.infer<typeof LayoutSectionSchema>;

export const LayoutConfigSchema = z.object({
  type: z.enum(['single-column', 'two-column', 'sidebar-left', 'sidebar-right', 'dashboard-grid', 'full-width']),
  sections: z.array(LayoutSectionSchema),
  responsive: z.object({
    mobile: z.enum(['stack', 'hide-sidebar', 'bottom-nav']).optional(),
    tablet: z.enum(['collapse-sidebar', 'show-all']).optional(),
  }).optional(),
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

// ============================================================
// COMPONENT DEFINITION
// ============================================================

export const ComponentDefSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(), // e.g., 'text', 'button', 'form', 'list', 'table', etc.
    props: z.record(z.unknown()).optional(),
    bindings: z.record(z.string()).optional(), // Data bindings
    events: z.record(z.string()).optional(), // Event handlers -> workflow IDs
    children: z.array(ComponentDefSchema).optional(),
    styles: z.record(z.unknown()).optional(),
    conditions: z.object({
      visible: z.string().optional(), // Expression
      enabled: z.string().optional(),
    }).optional(),
  })
);

export type ComponentDef = z.infer<typeof ComponentDefSchema>;

// ============================================================
// PAGE DEFINITION
// ============================================================

export const PageDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string(),
  type: PageTypeEnum,
  icon: z.string().optional(),
  
  // Entity binding
  entity: z.string().optional(),
  
  // Layout
  layout: LayoutConfigSchema,
  
  // Components
  components: z.array(ComponentDefSchema),
  
  // Auto-layout metadata
  autoLayout: z.object({
    showHeader: z.boolean().default(true),
    showSidebar: z.boolean().default(true),
    showFooter: z.boolean().default(false),
    headerHeight: z.string().optional(),
    sidebarWidth: z.string().optional(),
  }).optional(),
  
  // Navigation
  navigation: z.object({
    showInSidebar: z.boolean().default(true),
    showInNavbar: z.boolean().optional(),
    order: z.number().optional(),
    parentPageId: z.string().optional(),
  }).optional(),
  
  // Page-specific settings
  settings: z.object({
    pagination: z.object({
      enabled: z.boolean(),
      pageSize: z.number(),
    }).optional(),
    search: z.object({
      enabled: z.boolean(),
      placeholder: z.string(),
    }).optional(),
    filters: z.array(z.object({
      field: z.string(),
      type: z.enum(['select', 'date-range', 'text', 'number-range']),
    })).optional(),
  }).optional(),
});

export type PageDef = z.infer<typeof PageDefSchema>;

// ============================================================
// WORKFLOW DEFINITIONS
// ============================================================

export const WorkflowTriggerSchema = z.object({
  type: z.enum([
    'button_click',
    'form_submit',
    'data_create',
    'data_update',
    'data_delete',
    'page_load',
    'field_change',
    'schedule',
    'webhook',
  ]),
  componentId: z.string().optional(),
  entityId: z.string().optional(),
  fieldId: z.string().optional(),
  condition: z.string().optional(), // Expression
});

export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;

export const WorkflowActionSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      'create_record',
      'update_record',
      'delete_record',
      'navigate',
      'show_notification',
      'show_modal',
      'close_modal',
      'refresh_data',
      'set_variable',
      'send_email',
      'call_api',
      'validate',
      'conditional',
    ]),
    
    // Action-specific config
    config: z.record(z.unknown()),
    
    // Conditional actions
    condition: z.string().optional(),
    thenActions: z.array(WorkflowActionSchema).optional(),
    elseActions: z.array(WorkflowActionSchema).optional(),
  })
);

export type WorkflowAction = z.infer<typeof WorkflowActionSchema>;

export const WorkflowDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  
  // Trigger
  trigger: WorkflowTriggerSchema,
  
  // Actions (executed in order)
  actions: z.array(WorkflowActionSchema),
  
  // Error handling
  onError: z.object({
    action: z.enum(['stop', 'continue', 'rollback']),
    notification: z.string().optional(),
  }).optional(),
  
  // Validation rules (for form submissions)
  validations: z.array(z.object({
    field: z.string(),
    rules: z.array(FieldValidationSchema),
  })).optional(),
});

export type WorkflowDef = z.infer<typeof WorkflowDefSchema>;

// ============================================================
// NAVIGATION RULES
// ============================================================

export const NavigationRuleSchema = z.object({
  id: z.string(),
  from: z.string(), // Page ID or '*'
  to: z.string(), // Page ID
  trigger: z.enum(['link', 'button', 'auto', 'action']),
  condition: z.string().optional(),
  params: z.record(z.string()).optional(),
});

export type NavigationRule = z.infer<typeof NavigationRuleSchema>;

// ============================================================
// APP BLUEPRINT (MAIN SCHEMA)
// ============================================================

export const AppBlueprintSchema = z.object({
  // Metadata
  id: z.string(),
  version: z.number().default(1),
  name: z.string(),
  description: z.string().optional(),
  
  // Behavior/Kit identifier
  behavior: z.string().optional(), // e.g., 'crm', 'inventory', 'fitness'
  
  // Entities (Tables)
  entities: z.array(EntityDefSchema),
  
  // Pages
  pages: z.array(PageDefSchema),
  
  // Workflows
  workflows: z.array(WorkflowDefSchema),
  
  // Navigation
  navigation: z.object({
    rules: z.array(NavigationRuleSchema),
    defaultPage: z.string(),
    sidebar: z.object({
      enabled: z.boolean().default(true),
      position: z.enum(['left', 'right']).default('left'),
      collapsible: z.boolean().default(true),
      items: z.array(z.object({
        pageId: z.string(),
        icon: z.string().optional(),
        label: z.string(),
        badge: z.string().optional(),
      })),
    }).optional(),
  }),
  
  // Theme
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    mode: z.enum(['light', 'dark', 'auto']).default('light'),
    borderRadius: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
    fontFamily: z.string().optional(),
  }).optional(),
  
  // Global settings
  settings: z.object({
    locale: z.string().default('en'),
    dateFormat: z.string().default('YYYY-MM-DD'),
    timeFormat: z.string().default('HH:mm'),
    currency: z.string().default('USD'),
  }).optional(),
});

export type AppBlueprint = z.infer<typeof AppBlueprintSchema>;

// ============================================================
// PROCESSED INTENT (INPUT TO BLUEPRINT ENGINE)
// ============================================================

export const ProcessedIntentSchema = z.object({
  rawInput: z.string(),
  type: z.enum(['create_app', 'modify_app', 'add_feature', 'change_design']),
  
  // Detected behavior/kit
  behavior: z.string().optional(),
  behaviorConfidence: z.number().optional(),
  
  // Extracted details
  extractedDetails: z.object({
    appName: z.string().optional(),
    category: z.string().optional(),
    entities: z.array(z.object({
      name: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string().optional(),
      })).optional(),
    })).optional(),
    features: z.array(z.string()).optional(),
    pages: z.array(z.object({
      name: z.string(),
      type: z.string().optional(),
    })).optional(),
    integrations: z.array(z.string()).optional(),
    customRequirements: z.array(z.string()).optional(),
  }).optional(),
  
  // Discovery info (from clarification)
  discoveredInfo: z.record(z.unknown()).optional(),
});

export type ProcessedIntent = z.infer<typeof ProcessedIntentSchema>;
