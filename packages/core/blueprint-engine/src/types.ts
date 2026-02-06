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
// SURFACE TYPES (Internal vs Customer-Facing)
// ============================================================

export const SurfaceTypeEnum = z.enum([
  'admin',      // Internal/staff-facing pages
  'provider',   // Provider-facing pages (doctors, therapists, etc.)
  'customer',   // Customer-facing pages (public or authenticated customers)
  'patient',    // Patient-facing pages (alias for customer in medical apps)
]);

export type SurfaceType = z.infer<typeof SurfaceTypeEnum>;

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
  'chat',
  'messaging',
  'custom',
  'profile',        // User/customer profile page
  // Customer-specific page types (e-commerce)
  'menu',           // Product/service catalog for customers
  'cart',           // Shopping cart
  'checkout',       // Checkout/payment
  'booking',        // Appointment/reservation booking
  'order_tracking', // Customer order status tracking
  'customer_portal', // Customer dashboard/home
  // Catering/quote page types (bakery, restaurant, event catering)
  'catering_request',  // Submit catering request form
  'quote_view',        // View and approve quotes
  'invoice_view',      // View and pay invoices
  'delivery_schedule', // View delivery schedule/tracking
  // Tenant/member portal page types
  'tenant_portal',       // Tenant home/dashboard
  'lease_view',          // Lease/contract details view
  'rent_payment',        // Rent/dues payment page
  'maintenance_request', // Maintenance request submission/tracking
  'document_library',    // Documents view/download
  'notices_board',       // Notices/announcements board
  'message_center',      // Messaging/communication center
  'facility_booking',    // Facility/amenity reservation
  // Medical/healthcare page types (provider surface)
  'provider_dashboard',  // Provider dashboard with schedule and patients
  'patient_list',        // List of assigned patients
  'patient_chart',       // Patient chart/record view
  'treatment_notes',     // Create/view treatment notes (write-once)
  'provider_schedule',   // Provider's appointment schedule
  'provider_availability', // Set availability slots
  // Medical/healthcare page types (patient surface)
  'patient_portal',      // Patient home/dashboard
  'my_appointments',     // Patient's appointments view/booking
  'my_records',          // Patient's medical records (approved only)
  'my_billing',          // Patient's billing/payments
  'intake_forms',        // Patient intake forms
  'prescription_view',   // View prescriptions
  // Construction/contractor page types (field staff surface)
  'project_list',        // List of assigned projects
  'project_detail',      // Project details view
  'daily_reports',       // Create/view daily site reports
  'issue_list',          // List/report project issues
  'material_request',    // Request materials
  // Construction/contractor page types (client surface)
  'client_portal',       // Client home/project overview
  'project_status',      // Project status and timeline
  'change_order_approval', // Review and approve change orders
  'estimate_view',       // View project estimates
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
  
  // Surface - determines if this page is internal (admin) or customer-facing
  // Pages without a surface default to 'admin'
  surface: SurfaceTypeEnum.optional(),  // Optional for backward compatibility, defaults to 'admin'
  
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

// Navigation item schema (reusable for admin and customer)
const NavigationItemSchema = z.object({
  pageId: z.string(),
  icon: z.string().optional(),
  label: z.string(),
  badge: z.string().optional(),
});

// Sidebar schema (reusable for admin and customer)
const SidebarSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(['left', 'right']).default('left'),
  collapsible: z.boolean().default(true),
  items: z.array(NavigationItemSchema),
});

export const AppBlueprintSchema = z.object({
  // Metadata
  id: z.string(),
  version: z.number().default(1),
  name: z.string(),
  description: z.string().optional(),
  
  // Branding
  branding: z.object({
    logo: z.string().optional(), // URL to logo image (initials-based by default)
    logoText: z.string().optional(), // Text/initials for the logo
    tagline: z.string().optional(),
  }).optional(),
  
  // Behavior/Kit identifier
  behavior: z.string().optional(), // e.g., 'crm', 'inventory', 'fitness'
  
  // Surfaces configuration - which surfaces are enabled for this app
  // Optional for backward compatibility
  surfaces: z.object({
    admin: z.object({
      enabled: z.boolean().default(true),
      defaultPage: z.string().optional(),
    }).default({ enabled: true }),
    customer: z.object({
      enabled: z.boolean().default(false),
      defaultPage: z.string().optional(),
      // Customer surface features
      features: z.object({
        browseCatalog: z.boolean().optional(),      // Can browse products/services
        placeOrders: z.boolean().optional(),        // Can place orders
        bookAppointments: z.boolean().optional(),   // Can book appointments
        trackOrders: z.boolean().optional(),        // Can track order status
        manageProfile: z.boolean().optional(),      // Can manage their profile
        viewHistory: z.boolean().optional(),        // Can view order/appointment history
        usePromotions: z.boolean().optional(),      // Can use coupons/promotions
        makePayments: z.boolean().optional(),       // Can make payments online
        receiveNotifications: z.boolean().optional(), // Receives notifications
      }).optional(),
    }).default({ enabled: false }),
  }).optional(),
  
  // Entities (Tables) - SHARED between surfaces (single source of truth)
  entities: z.array(EntityDefSchema),
  
  // Pages - includes both admin and customer pages (distinguished by 'surface' field)
  pages: z.array(PageDefSchema),
  
  // Workflows - SHARED between surfaces
  workflows: z.array(WorkflowDefSchema),
  
  // Admin Navigation (internal/staff)
  navigation: z.object({
    rules: z.array(NavigationRuleSchema),
    defaultPage: z.string(),
    sidebar: SidebarSchema.optional(),
  }),
  
  // Provider Navigation (medical/healthcare apps)
  providerNavigation: z.object({
    rules: z.array(NavigationRuleSchema),
    defaultPage: z.string(),
    sidebar: SidebarSchema.optional(),
    // Provider-specific navigation options
    showProfile: z.boolean().optional(),
    showSchedule: z.boolean().optional(),
    showNotifications: z.boolean().optional(),
  }).optional(),
  
  // Patient Navigation (medical/healthcare apps)  
  patientNavigation: z.object({
    rules: z.array(NavigationRuleSchema),
    defaultPage: z.string(),
    sidebar: SidebarSchema.optional(),
    // Patient-specific navigation options
    showProfile: z.boolean().optional(),
    showAppointments: z.boolean().optional(),
    showMessages: z.boolean().optional(),
  }).optional(),
  
  // Customer Navigation (separate from admin, uses same entities)
  customerNavigation: z.object({
    rules: z.array(NavigationRuleSchema),
    defaultPage: z.string(),
    sidebar: SidebarSchema.optional(),
    // Customer-specific navigation options
    showCart: z.boolean().optional(),
    showProfile: z.boolean().optional(),
    showOrderHistory: z.boolean().optional(),
  }).optional(),
  
  // Theme
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    mode: z.enum(['light', 'dark', 'auto']).default('light'),
    // Surface Intent - controls ambient background and visual depth (atmosphere)
    surfaceIntent: z.enum([
      'warm-artisanal',
      'neutral-professional',
      'modern-dark',
      'playful-light',
    ]).optional(),
    borderRadius: z.enum(['none', 'small', 'medium', 'large']).default('medium'),
    fontFamily: z.string().optional(),
    // Extended design system support (matches UnifiedTheme from dna/schema.ts)
    typography: z.object({
      fontFamily: z.string().optional(),
      headingFamily: z.string().optional(),
      monoFamily: z.string().optional(),
      scale: z.enum(['compact', 'normal', 'relaxed']).optional(),
      weight: z.object({
        normal: z.number().optional(),
        medium: z.number().optional(),
        bold: z.number().optional(),
      }).optional(),
    }).optional(),
    spacing: z.object({
      scale: z.enum(['compact', 'normal', 'relaxed']).optional(),
      borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).optional(),
      cardPadding: z.enum(['sm', 'md', 'lg']).optional(),
    }).optional(),
    shadows: z.object({
      enabled: z.boolean().optional(),
      intensity: z.enum(['subtle', 'medium', 'strong']).optional(),
    }).optional(),
    animations: z.object({
      enabled: z.boolean().optional(),
      duration: z.enum(['fast', 'normal', 'slow']).optional(),
      easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'spring']).optional(),
    }).optional(),
    // Custom CSS variables from design system (includes --neo-design-system)
    customVars: z.record(z.string()).optional(),
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
