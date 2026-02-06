/**
 * Unified App Schema
 * 
 * The complete structure of a Neo-generated application.
 * This is the DNA of the app - everything needed to render and run it.
 */

import { z } from 'zod';
import { NeoPermissionsSchema, type NeoPermissions } from './permissions-schema.js';

// ============================================================
// FIELD SCHEMA
// ============================================================

export const UnifiedFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'string', 'text', 'richtext', 'number', 'currency', 'percentage',
    'boolean', 'date', 'datetime', 'time', 'email', 'phone', 'url',
    'image', 'file', 'reference', 'enum', 'json', 'address', 'geolocation',
    'color', 'rating', 'signature', 'barcode', 'duration',
  ]),
  required: z.boolean().optional().default(false),
  unique: z.boolean().optional(),
  indexed: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
  
  // Validation
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
    custom: z.string().optional(), // Expression
  }).optional(),
  
  // Reference config
  reference: z.object({
    entity: z.string(),
    displayField: z.string(),
    relationship: z.enum(['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many']),
    cascadeDelete: z.boolean().optional(),
    backReference: z.string().optional(),
  }).optional(),
  
  // Enum options
  enumOptions: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
  })).optional(),
  
  // Display options
  display: z.object({
    hidden: z.boolean().optional(),
    readonly: z.boolean().optional(),
    writeOnce: z.boolean().optional(),  // Field cannot be modified after creation
    width: z.enum(['xs', 'sm', 'md', 'lg', 'xl', 'full']).optional(),
    format: z.string().optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }).optional(),
  
  // Access control for field-level permissions
  access: z.object({
    visibleTo: z.array(z.string()).optional(),   // Roles that can see this field
    editableBy: z.array(z.string()).optional(),  // Roles that can edit this field
    requiredApproval: z.boolean().optional(),    // Requires approval before patient sees
  }).optional(),
  
  // Computed field
  computed: z.object({
    expression: z.string(),
    dependencies: z.array(z.string()),
  }).optional(),
});

export type UnifiedField = z.infer<typeof UnifiedFieldSchema>;

// ============================================================
// ENTITY SCHEMA
// ============================================================

export const UnifiedEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  pluralName: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  
  // Fields
  fields: z.array(UnifiedFieldSchema),
  
  // Relationships (derived from reference fields)
  relationships: z.array(z.object({
    id: z.string(),
    type: z.enum(['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many']),
    targetEntity: z.string(),
    foreignKey: z.string(),
    backReference: z.string().optional(),
  })).optional(),
  
  // Entity behaviors
  behaviors: z.array(z.enum([
    'trackable',     // Has status progression
    'assignable',    // Can be assigned to users
    'schedulable',   // Has date/time component
    'billable',      // Has monetary value
    'archivable',    // Soft delete support
    'commentable',   // Has comments
    'attachable',    // Has file attachments
    'versionable',   // Has version history
    'auditable',     // Full audit trail
    'searchable',    // Full-text search
    'taggable',      // Can have tags
    'sortable',      // Has custom ordering
  ])).optional(),
  
  // Display configuration
  display: z.object({
    titleField: z.string(),
    subtitleField: z.string().optional(),
    imageField: z.string().optional(),
    colorField: z.string().optional(),
    listFields: z.array(z.string()),
    searchFields: z.array(z.string()),
    filterFields: z.array(z.string()).optional(),
    sortFields: z.array(z.string()).optional(),
  }),
  
  // CRUD configuration
  crud: z.object({
    create: z.object({
      enabled: z.boolean(),
      confirmation: z.boolean().optional(),
      successMessage: z.string().optional(),
      redirectTo: z.string().optional(),
    }).optional(),
    read: z.object({
      enabled: z.boolean(),
      defaultSort: z.object({ field: z.string(), direction: z.enum(['asc', 'desc']) }).optional(),
      pageSize: z.number().optional(),
    }).optional(),
    update: z.object({
      enabled: z.boolean(),
      confirmation: z.boolean().optional(),
      successMessage: z.string().optional(),
    }).optional(),
    delete: z.object({
      enabled: z.boolean(),
      confirmation: z.boolean().default(true),
      softDelete: z.boolean().optional(),
    }).optional(),
  }).optional(),
  
  // Timestamps
  timestamps: z.object({
    createdAt: z.boolean().default(true),
    updatedAt: z.boolean().default(true),
    deletedAt: z.boolean().optional(),
  }).optional(),
  
  // Hooks (expressions to run)
  hooks: z.object({
    beforeCreate: z.string().optional(),
    afterCreate: z.string().optional(),
    beforeUpdate: z.string().optional(),
    afterUpdate: z.string().optional(),
    beforeDelete: z.string().optional(),
    afterDelete: z.string().optional(),
  }).optional(),
});

export type UnifiedEntity = z.infer<typeof UnifiedEntitySchema>;

// ============================================================
// COMPONENT SCHEMA
// ============================================================

export const UnifiedComponentSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    
    // Props passed to component
    props: z.record(z.unknown()).optional(),
    
    // Data bindings
    bindings: z.record(z.string()).optional(),
    
    // Event handlers (workflow IDs or inline actions)
    events: z.record(z.union([z.string(), z.object({
      type: z.string(),
      config: z.record(z.unknown()),
    })])).optional(),
    
    // Nested components
    children: z.array(UnifiedComponentSchema).optional(),
    
    // Style overrides
    styles: z.record(z.unknown()).optional(),
    
    // Conditional rendering
    conditions: z.object({
      visible: z.string().optional(),
      enabled: z.string().optional(),
    }).optional(),
    
    // Slot content (for layout components)
    slots: z.record(z.array(z.string())).optional(),
  })
);

export type UnifiedComponent = z.infer<typeof UnifiedComponentSchema>;

// ============================================================
// LAYOUT SCHEMA
// ============================================================

const LayoutSectionBaseSchema = z.object({
  id: z.string(),
  type: z.enum([
    'header', 'sidebar', 'main', 'footer',
    'card', 'row', 'column', 'grid',
    'tabs', 'accordion', 'modal', 'drawer',
  ]),
  title: z.string().optional(),
  collapsible: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  width: z.string().optional(),
  components: z.array(z.string()),
});

type LayoutSectionType = z.infer<typeof LayoutSectionBaseSchema> & {
  children?: LayoutSectionType[];
};

const LayoutSectionWithChildrenSchema: z.ZodType<LayoutSectionType> = LayoutSectionBaseSchema.extend({
  children: z.lazy(() => z.array(LayoutSectionWithChildrenSchema)).optional(),
});

export const UnifiedLayoutSchema = z.object({
  type: z.enum([
    'single_column', 'two_column', 'three_column',
    'sidebar_left', 'sidebar_right', 'sidebar_both',
    'dashboard_grid', 'masonry', 'full_width',
    'split_horizontal', 'split_vertical',
    'wizard', 'tabs', 'accordion',
  ]),
  
  // Layout configuration
  config: z.object({
    gap: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
    padding: z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl']).optional(),
    maxWidth: z.enum(['sm', 'md', 'lg', 'xl', 'full']).optional(),
    sidebarWidth: z.string().optional(),
    gridCols: z.number().optional(),
  }).optional(),
  
  // Layout sections
  sections: z.array(LayoutSectionWithChildrenSchema),
  
  // Responsive overrides
  responsive: z.object({
    mobile: z.object({
      type: z.string().optional(),
      hideSections: z.array(z.string()).optional(),
      stackOrder: z.array(z.string()).optional(),
    }).optional(),
    tablet: z.object({
      type: z.string().optional(),
      collapseSidebar: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export type UnifiedLayout = z.infer<typeof UnifiedLayoutSchema>;

// ============================================================
// PAGE SCHEMA
// ============================================================

// Surface type - determines the page audience
// Supports multi-surface apps: admin, staff, provider, customer/patient
export const SurfaceTypeSchema = z.enum(['admin', 'staff', 'provider', 'customer', 'patient']);
export type SurfaceType = z.infer<typeof SurfaceTypeSchema>;

export const UnifiedPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string(),
  type: z.enum([
    'list', 'detail', 'form', 'dashboard',
    'calendar', 'kanban', 'table', 'gallery',
    'timeline', 'map', 'chart', 'report',
    'wizard', 'settings', 'custom',
    'profile',        // User/customer profile page
    // Customer-specific page types (e-commerce)
    'menu',           // Product/service catalog for customers
    'cart',           // Shopping cart
    'checkout',       // Checkout/payment flow
    'booking',        // Appointment/reservation booking
    'order_tracking', // Customer order status tracking
    'customer_portal', // Customer dashboard/home
    // Tenant/member portal page types
    'tenant_portal',  // Tenant/member dashboard/home
    'lease_view',     // View lease/contract details
    'rent_payment',   // Pay rent/dues online
    'maintenance_request', // Submit and track maintenance requests
    'document_library',    // View/download documents
    'notices_board',       // View announcements/notices
    'message_center',      // Messages with admin/staff
    'facility_booking',    // Book amenities/facilities
  ]),
  description: z.string().optional(),
  icon: z.string().optional(),
  
  // Surface - determines if this page is internal (admin) or customer-facing
  // Optional for backward compatibility - defaults to 'admin' when not specified
  surface: SurfaceTypeSchema.optional(),
  
  // Entity binding
  entity: z.string().optional(),
  
  // Layout
  layout: UnifiedLayoutSchema,
  
  // Components
  components: z.array(UnifiedComponentSchema),
  
  // Page-specific configuration
  config: z.object({
    // List/Table config
    pagination: z.object({
      enabled: z.boolean(),
      pageSize: z.number(),
      showPageSizeOptions: z.boolean().optional(),
    }).optional(),
    search: z.object({
      enabled: z.boolean(),
      placeholder: z.string().optional(),
      fields: z.array(z.string()).optional(),
    }).optional(),
    filters: z.array(z.object({
      field: z.string(),
      type: z.enum(['select', 'date_range', 'number_range', 'text', 'boolean']),
      label: z.string().optional(),
    })).optional(),
    sorting: z.object({
      enabled: z.boolean(),
      defaultField: z.string().optional(),
      defaultDirection: z.enum(['asc', 'desc']).optional(),
    }).optional(),
    
    // Card type for list rendering (PersonCard, ItemCard, etc.)
    cardType: z.enum(['personCard', 'itemCard', 'card', 'default']).optional(),
    
    // Calendar config
    calendar: z.object({
      dateField: z.string(),
      endDateField: z.string().optional(),
      titleField: z.string(),
      colorField: z.string().optional(),
      views: z.array(z.enum(['month', 'week', 'day', 'agenda'])).optional(),
      defaultView: z.enum(['month', 'week', 'day', 'agenda']).optional(),
    }).optional(),
    
    // Kanban config
    kanban: z.object({
      columnField: z.string(),
      columns: z.array(z.object({
        value: z.string(),
        label: z.string(),
        color: z.string().optional(),
        limit: z.number().optional(),
      })),
      titleField: z.string(),
      subtitleField: z.string().optional(),
    }).optional(),
    
    // Dashboard config
    dashboard: z.object({
      refreshInterval: z.number().optional(),
      widgets: z.array(z.object({
        id: z.string(),
        type: z.enum(['stat', 'chart', 'list', 'table', 'calendar', 'progress']),
        title: z.string(),
        span: z.number().optional(),
        config: z.record(z.unknown()).optional(),
      })).optional(),
      
      // Dashboard Intent - semantic structure for story, hierarchy, and actions
      intent: z.array(z.object({
        id: z.string(),
        role: z.enum(['today', 'in-progress', 'upcoming', 'summary', 'history']),
        priority: z.enum(['primary', 'secondary', 'tertiary']),
        title: z.string(),
        subtitle: z.string().optional(),
        timeScope: z.enum(['now', 'today', 'this-week', 'this-month', 'all-time']).optional(),
        layoutHint: z.enum(['stats-row', 'card-list', 'data-table', 'chart', 'activity', 'calendar', 'kanban']).optional(),
        
        // Metrics for summary/today sections
        metrics: z.array(z.object({
          sourceMetric: z.string(),
          label: z.string(),
          timeScope: z.enum(['now', 'today', 'this-week', 'this-month', 'all-time']),
          emphasize: z.boolean().optional(),
          icon: z.string().optional(),
          format: z.enum(['number', 'currency', 'percentage', 'duration']).optional(),
        })).optional(),
        
        // List entity for in-progress/upcoming sections
        listEntity: z.string().optional(),
        listFilter: z.string().optional(),
        limit: z.number().optional(),
        
        // Contextual actions (only for actionable sections)
        actions: z.array(z.object({
          actionId: z.string(),
          label: z.string(),
          entity: z.string(),
          visibilityRule: z.enum(['always', 'if-active', 'if-pending', 'if-empty', 'if-overdue']),
          variant: z.enum(['primary', 'secondary', 'destructive']).optional(),
          icon: z.string().optional(),
        })).optional(),
      })).optional(),
    }).optional(),
    
    // Form config
    form: z.object({
      mode: z.enum(['create', 'edit', 'view']).optional(),
      sections: z.array(z.object({
        title: z.string(),
        fields: z.array(z.string()),
        collapsible: z.boolean().optional(),
      })).optional(),
      submitLabel: z.string().optional(),
      cancelLabel: z.string().optional(),
      successRedirect: z.string().optional(),
    }).optional(),
    
    // Gallery config
    gallery: z.object({
      imageField: z.string(),
      columns: z.number().optional(),
      gap: z.enum(['sm', 'md', 'lg']).optional(),
      aspectRatio: z.enum(['square', '4:3', '16:9', 'auto']).optional(),
    }).optional(),
  }).optional(),
  
  // Navigation config
  navigation: z.object({
    showInSidebar: z.boolean().default(true),
    showInNavbar: z.boolean().optional(),
    order: z.number().optional(),
    parentPageId: z.string().optional(),
    badge: z.string().optional(),
    group: z.string().optional(),
  }).optional(),
  
  // Access control
  access: z.object({
    roles: z.array(z.string()).optional(),
    permissions: z.array(z.string()).optional(),
    condition: z.string().optional(),
  }).optional(),
  
  // Page-level data loading
  data: z.object({
    preload: z.array(z.object({
      entity: z.string(),
      alias: z.string().optional(),
      filter: z.string().optional(),
      limit: z.number().optional(),
    })).optional(),
    params: z.array(z.string()).optional(),
  }).optional(),
});

export type UnifiedPage = z.infer<typeof UnifiedPageSchema>;

// ============================================================
// WORKFLOW SCHEMA
// ============================================================

export const UnifiedWorkflowActionSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      // Data actions
      'create_record', 'update_record', 'delete_record', 'bulk_update',
      // Navigation actions
      'navigate', 'open_modal', 'close_modal', 'open_drawer', 'close_drawer',
      // UI actions
      'show_notification', 'show_confirmation', 'show_toast',
      // Communication
      'send_email', 'send_sms', 'send_push',
      // API
      'call_api', 'webhook', 'trigger_webhook',
      // Logic
      'conditional', 'loop', 'wait', 'parallel',
      // Data manipulation
      'set_variable', 'transform', 'validate',
      // File operations
      'upload_file', 'download_file', 'generate_pdf',
      // Business actions
      'schedule_event', 'create_invoice',
      // Integration actions
      'charge_customer', 'create_subscription', 'append_to_sheet', 'create_calendar_event',
      'create_page', 'create_airtable_record',
    ]),
    
    config: z.record(z.unknown()),
    
    // For conditional actions
    condition: z.string().optional(),
    thenActions: z.array(UnifiedWorkflowActionSchema).optional(),
    elseActions: z.array(UnifiedWorkflowActionSchema).optional(),
    
    // For loop actions
    items: z.string().optional(),
    itemActions: z.array(UnifiedWorkflowActionSchema).optional(),
    
    // Error handling
    onError: z.enum(['stop', 'continue', 'retry', 'rollback']).optional(),
    retryCount: z.number().optional(),
  })
);

export type UnifiedWorkflowAction = z.infer<typeof UnifiedWorkflowActionSchema>;

export const UnifiedWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  
  // Trigger
  trigger: z.object({
    type: z.enum([
      // UI triggers (legacy and new formats)
      'button_click', 'onClick', 'form_submit', 'onSubmit', 'page_load', 'onPageLoad', 'field_change', 'onChange',
      // Data triggers
      'record_create', 'record_update', 'record_delete',
      // Time triggers
      'schedule', 'scheduled', 'delay',
      // External triggers
      'webhook', 'email_received',
      // System triggers
      'app_init', 'user_login', 'user_logout',
    ]),
    
    // Trigger-specific config
    componentId: z.string().optional(),
    entityId: z.string().optional(),
    fieldId: z.string().optional(),
    schedule: z.string().optional(), // Cron expression
    webhookPath: z.string().optional(),
    
    // Trigger condition
    condition: z.string().optional(),
  }),
  
  // Actions
  actions: z.array(UnifiedWorkflowActionSchema),
  
  // Variables available in workflow
  variables: z.record(z.object({
    type: z.string(),
    defaultValue: z.unknown().optional(),
  })).optional(),
  
  // Error handling
  onError: z.object({
    action: z.enum(['stop', 'continue', 'rollback', 'notify']),
    notification: z.string().optional(),
    fallbackActions: z.array(UnifiedWorkflowActionSchema).optional(),
  }).optional(),
  
  // Rate limiting
  rateLimit: z.object({
    maxExecutions: z.number(),
    windowSeconds: z.number(),
  }).optional(),
});

export type UnifiedWorkflow = z.infer<typeof UnifiedWorkflowSchema>;

// ============================================================
// NAVIGATION SCHEMA
// ============================================================

// Sidebar menu item schema (reusable)
const SidebarMenuItemSchema = z.object({
  pageId: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  children: z.array(z.object({
    pageId: z.string(),
    label: z.string(),
    icon: z.string().optional(),
  })).optional(),
});

// Sidebar configuration schema (reusable for admin and customer)
const SidebarConfigSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(['left', 'right']).default('left'),
  collapsible: z.boolean().default(true),
  defaultCollapsed: z.boolean().optional(),
  width: z.string().optional(),
  
  // Menu items (grouped)
  groups: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    collapsible: z.boolean().optional(),
    items: z.array(SidebarMenuItemSchema),
  })),
  
  // Footer items (settings, logout, etc)
  footerItems: z.array(z.object({
    pageId: z.string().optional(),
    action: z.string().optional(),
    label: z.string(),
    icon: z.string().optional(),
  })).optional(),
});

export const UnifiedNavigationSchema = z.object({
  // Sidebar configuration (admin/internal)
  sidebar: SidebarConfigSchema.optional(),
  
  // Top navbar configuration
  navbar: z.object({
    enabled: z.boolean().default(true),
    showLogo: z.boolean().default(true),
    showSearch: z.boolean().optional(),
    showNotifications: z.boolean().optional(),
    showUserMenu: z.boolean().default(true),
    
    // Quick action buttons
    actions: z.array(z.object({
      id: z.string(),
      label: z.string(),
      icon: z.string().optional(),
      action: z.string(), // Workflow ID or navigation target
    })).optional(),
  }).optional(),
  
  // Breadcrumbs
  breadcrumbs: z.object({
    enabled: z.boolean().default(true),
    showHome: z.boolean().default(true),
    separator: z.string().optional(),
  }).optional(),
  
  // Navigation rules
  rules: z.array(z.object({
    id: z.string(),
    from: z.string(), // Page ID or '*'
    to: z.string(),   // Page ID
    trigger: z.enum(['link', 'button', 'auto', 'action']),
    condition: z.string().optional(),
    params: z.record(z.string()).optional(),
  })),
  
  // Default page
  defaultPage: z.string(),
  
  // 404 page
  notFoundPage: z.string().optional(),
  
  // Login redirect
  loginRedirect: z.string().optional(),
});

export type UnifiedNavigation = z.infer<typeof UnifiedNavigationSchema>;

// Customer Navigation Schema - separate navigation for customer surface
export const CustomerNavigationSchema = z.object({
  // Sidebar configuration (customer-friendly)
  sidebar: SidebarConfigSchema.optional(),
  
  // Top navbar configuration (simpler for customers)
  navbar: z.object({
    enabled: z.boolean().default(true),
    showLogo: z.boolean().default(true),
    showSearch: z.boolean().optional(),
    showCart: z.boolean().optional(),      // Shopping cart icon
    showProfile: z.boolean().optional(),   // Customer profile menu
    showNotifications: z.boolean().optional(),
  }).optional(),
  
  // Navigation rules
  rules: z.array(z.object({
    id: z.string(),
    from: z.string(),
    to: z.string(),
    trigger: z.enum(['link', 'button', 'auto', 'action']),
    condition: z.string().optional(),
    params: z.record(z.string()).optional(),
  })),
  
  // Default page for customers
  defaultPage: z.string(),
  
  // Quick links (menu, orders, profile)
  quickLinks: z.array(z.object({
    pageId: z.string(),
    label: z.string(),
    icon: z.string().optional(),
  })).optional(),
});

export type CustomerNavigation = z.infer<typeof CustomerNavigationSchema>;

// ============================================================
// THEME SCHEMA
// ============================================================

export const UnifiedThemeSchema = z.object({
  // Style preset
  preset: z.enum([
    'modern', 'minimal', 'bold', 'professional',
    'playful', 'elegant', 'tech', 'nature',
    'dark', 'light', 'high_contrast',
  ]).optional(),
  
  // Colors
  colors: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    success: z.string().optional(),
    warning: z.string().optional(),
    error: z.string().optional(),
    info: z.string().optional(),
    background: z.string().optional(),
    surface: z.string().optional(),
    text: z.string().optional(),
    textMuted: z.string().optional(),
    border: z.string().optional(),
  }),
  
  // Mode
  mode: z.enum(['light', 'dark', 'auto']).default('light'),
  
  // Surface Intent - controls atmosphere and visual depth
  // This is separate from colors and can be mixed with any design system
  surfaceIntent: z.enum([
    'warm-artisanal',      // Bakery, craft, hospitality - warm & cozy
    'neutral-professional', // Business, admin, enterprise - clean & trustworthy
    'modern-dark',          // Tech, dashboards, analytics - focused & immersive
    'playful-light',        // Retail, consumer, education - friendly & approachable
  ]).optional(),
  
  // Typography
  typography: z.object({
    fontFamily: z.string().optional(),
    headingFamily: z.string().optional(),
    monoFamily: z.string().optional(),
    fontSize: z.enum(['xs', 'sm', 'base', 'lg', 'xl']).optional(),
    lineHeight: z.enum(['tight', 'normal', 'relaxed']).optional(),
  }).optional(),
  
  // Spacing & Layout
  spacing: z.object({
    scale: z.enum(['compact', 'normal', 'relaxed']).optional(),
    borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).optional(),
    cardPadding: z.enum(['sm', 'md', 'lg']).optional(),
  }).optional(),
  
  // Shadows
  shadows: z.object({
    enabled: z.boolean().default(true),
    intensity: z.enum(['subtle', 'medium', 'strong']).optional(),
  }).optional(),
  
  // Animations
  animations: z.object({
    enabled: z.boolean().default(true),
    duration: z.enum(['fast', 'normal', 'slow']).optional(),
    easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'spring']).optional(),
  }).optional(),
  
  // Component-specific overrides
  components: z.object({
    button: z.record(z.unknown()).optional(),
    card: z.record(z.unknown()).optional(),
    input: z.record(z.unknown()).optional(),
    table: z.record(z.unknown()).optional(),
    modal: z.record(z.unknown()).optional(),
  }).optional(),
  
  // Custom CSS variables
  customVars: z.record(z.string()).optional(),
});

export type UnifiedTheme = z.infer<typeof UnifiedThemeSchema>;

// ============================================================
// UNIFIED APP SCHEMA
// ============================================================

// Customer features schema - what customers can do in the customer surface
// Supports both e-commerce customers AND tenant/member portals
export const CustomerFeaturesSchema = z.object({
  // === E-commerce Features ===
  browseCatalog: z.boolean().optional(),      // Browse products/services/menu
  placeOrders: z.boolean().optional(),        // Place orders
  bookAppointments: z.boolean().optional(),   // Book appointments/reservations
  trackOrders: z.boolean().optional(),        // Track order/appointment status
  manageProfile: z.boolean().optional(),      // Manage customer profile
  viewHistory: z.boolean().optional(),        // View order/appointment history
  usePromotions: z.boolean().optional(),      // Use coupons/promotions
  makePayments: z.boolean().optional(),       // Make payments online
  receiveNotifications: z.boolean().optional(), // Receive notifications
  
  // === Tenant/Member Portal Features ===
  // For property management, gyms, HOAs, schools, clinics, etc.
  viewLease: z.boolean().optional(),          // View lease/contract details
  payRent: z.boolean().optional(),            // Pay rent/dues/fees
  submitMaintenanceRequest: z.boolean().optional(), // Submit maintenance/support requests
  viewMaintenanceStatus: z.boolean().optional(),    // Track maintenance request status
  viewDocuments: z.boolean().optional(),      // View/download documents (leases, notices, etc.)
  uploadDocuments: z.boolean().optional(),    // Upload documents
  viewNotices: z.boolean().optional(),        // View notices/announcements/messages
  sendMessages: z.boolean().optional(),       // Send messages to admin/staff
  viewSchedule: z.boolean().optional(),       // View schedules/calendars
  makeReservations: z.boolean().optional(),   // Make facility reservations (amenities, etc.)
});

export type CustomerFeatures = z.infer<typeof CustomerFeaturesSchema>;

// Provider features schema - what providers can do in their surface
export const ProviderFeaturesSchema = z.object({
  viewAssignedPatients: z.boolean().optional(),    // View only assigned patients
  viewSchedule: z.boolean().optional(),            // View their own schedule
  manageAvailability: z.boolean().optional(),      // Set availability slots
  createTreatmentNotes: z.boolean().optional(),    // Create clinical notes (write-once)
  viewPatientHistory: z.boolean().optional(),      // View patient treatment history
  viewPatientDocuments: z.boolean().optional(),    // View patient documents
  sendMessages: z.boolean().optional(),            // Message patients
  createPrescriptions: z.boolean().optional(),     // Create prescriptions
  createReferrals: z.boolean().optional(),         // Create referrals
  viewBilling: z.boolean().optional(),             // View billing for their services
});

export type ProviderFeatures = z.infer<typeof ProviderFeaturesSchema>;

// Staff/Operator features schema - what staff can do in their surface
// For location-based operators, field workers, or non-admin internal users
export const StaffFeaturesSchema = z.object({
  // Location & Assignment
  viewAssignedLocation: z.boolean().optional(),      // View only their assigned location
  viewAssignedItems: z.boolean().optional(),         // View only items at their location
  
  // Item/Task Management
  intakeItems: z.boolean().optional(),               // Receive/intake new items
  processItems: z.boolean().optional(),              // Process items (scan, update status)
  executeActions: z.boolean().optional(),            // Execute customer-requested actions
  updateItemStatus: z.boolean().optional(),          // Update item status
  uploadAttachments: z.boolean().optional(),         // Upload photos/documents
  
  // Workflow & Queue
  viewWorkQueue: z.boolean().optional(),             // View pending work queue
  viewDailyTasks: z.boolean().optional(),            // View daily task list
  markTaskComplete: z.boolean().optional(),          // Mark tasks as complete
  
  // Fulfillment
  recordFulfillment: z.boolean().optional(),         // Record fulfillment details
  recordTracking: z.boolean().optional(),            // Record tracking numbers
  confirmPickup: z.boolean().optional(),             // Confirm customer pickup
  confirmAction: z.boolean().optional(),             // Confirm action completion
  
  // Communication
  sendNotifications: z.boolean().optional(),         // Send notifications to customers
  viewCustomerInfo: z.boolean().optional(),          // View basic customer info (for fulfillment)
  
  // Schedule
  viewSchedule: z.boolean().optional(),              // View work schedule
  viewShiftDetails: z.boolean().optional(),          // View shift details
});

export type StaffFeatures = z.infer<typeof StaffFeaturesSchema>;

// Patient features schema - what patients can do in their surface
export const PatientFeaturesSchema = z.object({
  viewProfile: z.boolean().optional(),             // View their own profile
  updateProfile: z.boolean().optional(),           // Update contact info
  viewAppointments: z.boolean().optional(),        // View their appointments
  bookAppointments: z.boolean().optional(),        // Book new appointments
  cancelAppointments: z.boolean().optional(),      // Cancel appointments
  viewTreatmentNotes: z.boolean().optional(),      // View approved notes only
  viewDocuments: z.boolean().optional(),           // View their documents
  uploadDocuments: z.boolean().optional(),         // Upload documents (consents, etc.)
  viewBilling: z.boolean().optional(),             // View their bills
  makePayments: z.boolean().optional(),            // Make payments
  sendMessages: z.boolean().optional(),            // Message providers
  viewMessages: z.boolean().optional(),            // View messages
  submitForms: z.boolean().optional(),             // Submit intake forms
});

export type PatientFeatures = z.infer<typeof PatientFeaturesSchema>;

// Surfaces configuration - which app surfaces are enabled
// Supports multi-surface apps: admin, staff, provider, customer/patient
export const SurfacesConfigSchema = z.object({
  // Admin/internal surface (always enabled)
  admin: z.object({
    enabled: z.boolean().default(true),
    defaultPage: z.string().optional(),
  }).default({ enabled: true }),
  
  // Staff/Operator surface (for location-based staff, field workers, operators)
  // Non-admin internal users with restricted access to their assigned location/items
  staff: z.object({
    enabled: z.boolean().default(false),
    defaultPage: z.string().optional(),
    features: StaffFeaturesSchema.optional(),
  }).default({ enabled: false }),
  
  // Provider surface (for doctors, therapists, etc.)
  provider: z.object({
    enabled: z.boolean().default(false),
    defaultPage: z.string().optional(),
    features: ProviderFeaturesSchema.optional(),
  }).default({ enabled: false }),
  
  // Customer surface (auto-enabled when customer-facing features detected)
  customer: z.object({
    enabled: z.boolean().default(false),
    defaultPage: z.string().optional(),
    // Customer surface capabilities
    features: CustomerFeaturesSchema.optional(),
  }).default({ enabled: false }),
  
  // Patient surface (alias for customer in medical context)
  patient: z.object({
    enabled: z.boolean().default(false),
    defaultPage: z.string().optional(),
    features: PatientFeaturesSchema.optional(),
  }).default({ enabled: false }),
}).optional();

export type SurfacesConfig = z.infer<typeof SurfacesConfigSchema>;

export const UnifiedAppSchemaDefinition = z.object({
  // Metadata
  id: z.string(),
  version: z.number().default(1),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  
  // Behavior/Industry identifier
  behavior: z.string().optional(),
  industry: z.string().optional(),
  
  // Surfaces configuration - determines which surfaces are active
  // Customer surface auto-enabled when customer-facing intent detected
  // Optional for backward compatibility
  surfaces: SurfacesConfigSchema,
  
  // Core components - SHARED between surfaces (single source of truth)
  entities: z.array(UnifiedEntitySchema),    // Same entities for admin and customer
  pages: z.array(UnifiedPageSchema),         // Pages marked with 'surface' field
  workflows: z.array(UnifiedWorkflowSchema), // Same workflows, permissions control access
  
  // Admin navigation (internal/staff)
  navigation: UnifiedNavigationSchema,
  
  // Staff/Operator navigation (for location-based staff, separate from admin)
  staffNavigation: CustomerNavigationSchema.optional(),
  
  // Provider navigation (for healthcare/service providers)
  providerNavigation: CustomerNavigationSchema.optional(),
  
  // Patient navigation (for medical apps - alias for customer in healthcare context)
  patientNavigation: CustomerNavigationSchema.optional(),
  
  // Customer navigation (separate from admin, only present when customer surface enabled)
  customerNavigation: CustomerNavigationSchema.optional(),
  
  // Theme - can be shared or have customer-specific overrides
  theme: UnifiedThemeSchema,
  
  // Global settings
  settings: z.object({
    locale: z.string().default('en'),
    dateFormat: z.string().default('YYYY-MM-DD'),
    timeFormat: z.string().default('HH:mm'),
    timezone: z.string().optional(),
    currency: z.string().default('USD'),
    numberFormat: z.string().optional(),
  }).optional(),
  
  // Feature flags
  features: z.object({
    auth: z.boolean().optional(),
    multiTenant: z.boolean().optional(),
    offline: z.boolean().optional(),
    realtime: z.boolean().optional(),
    notifications: z.boolean().optional(),
    analytics: z.boolean().optional(),
    search: z.boolean().optional(),
    exports: z.boolean().optional(),
    imports: z.boolean().optional(),
    api: z.boolean().optional(),
  }).optional(),
  
  // Integrations
  integrations: z.array(z.object({
    id: z.string(),
    type: z.string(),
    config: z.record(z.unknown()),
    enabled: z.boolean().default(true),
  })).optional(),
  
  // Permissions & Access Control
  permissions: NeoPermissionsSchema.optional(),
  
  // Generated metadata
  metadata: z.object({
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    generatedBy: z.string().optional(),
    confidence: z.number().optional(),
    sourceInput: z.string().optional(),
  }).optional(),
});

export type UnifiedAppSchema = z.infer<typeof UnifiedAppSchemaDefinition>;

// ============================================================
// SCHEMA VALIDATOR
// ============================================================

export class AppSchema {
  /**
   * Validate an app schema
   */
  static validate(schema: unknown): { valid: boolean; errors?: string[] } {
    const result = UnifiedAppSchemaDefinition.safeParse(schema);
    if (result.success) {
      return { valid: true };
    }
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }

  /**
   * Create a minimal valid schema
   */
  static createMinimal(name: string): UnifiedAppSchema {
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      version: 1,
      name,
      entities: [],
      pages: [{
        id: 'home',
        name: 'Home',
        route: '/',
        type: 'custom',
        layout: {
          type: 'single_column',
          sections: [{ id: 'main', type: 'main', components: ['welcome'] }],
        },
        components: [{
          id: 'welcome',
          type: 'text',
          props: { text: `Welcome to ${name}`, variant: 'h1' },
        }],
      }],
      workflows: [],
      navigation: {
        rules: [],
        defaultPage: 'home',
        sidebar: {
          enabled: true,
          position: 'left',
          collapsible: true,
          groups: [{
            id: 'main',
            items: [{ pageId: 'home', label: 'Home', icon: '🏠' }],
          }],
        },
      },
      theme: {
        colors: { primary: '#8b5cf6' },
        mode: 'light',
      },
    };
  }

  /**
   * Merge two schemas (for incremental building)
   */
  static merge(base: UnifiedAppSchema, additions: Partial<UnifiedAppSchema>): UnifiedAppSchema {
    return {
      ...base,
      ...additions,
      entities: [...base.entities, ...(additions.entities || [])],
      pages: [...base.pages, ...(additions.pages || [])],
      workflows: [...base.workflows, ...(additions.workflows || [])],
      navigation: {
        ...base.navigation,
        ...additions.navigation,
        rules: [...base.navigation.rules, ...(additions.navigation?.rules || [])],
        sidebar: additions.navigation?.sidebar ? {
          ...base.navigation.sidebar,
          ...additions.navigation.sidebar,
          groups: [
            ...(base.navigation.sidebar?.groups || []),
            ...(additions.navigation.sidebar?.groups || []),
          ],
        } : base.navigation.sidebar,
      },
      theme: { ...base.theme, ...additions.theme },
    };
  }
}
