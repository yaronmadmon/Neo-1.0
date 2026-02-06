/**
 * Page Materializer
 * Converts AppBlueprint pages into renderable UI structures
 * Produces complete page definitions ready for the frontend
 */

import type {
  AppBlueprint,
  PageDef,
  ComponentDef,
  EntityDef,
  LayoutConfig,
} from './types.js';

import {
  generateDashboardIntent,
  getIndustrySectionConfig,
  type DashboardIntent,
  type DashboardSection,
  type DomainMetric,
  type ContextualAction,
  TIME_SCOPE_LABELS,
  ACTIONABLE_ROLES,
} from './dna/index.js';

import { getIndustryKit } from './kits/industries/index.js';
import type { IndustryKitId } from './kits/industries/types.js';

// ============================================================
// MATERIALIZED PAGE TYPES
// ============================================================

export interface MaterializedComponent {
  id: string;
  componentId: string; // Maps to ComponentRegistry
  props: Record<string, unknown>;
  children?: MaterializedComponent[];
  styles?: Record<string, unknown>;
  
  // Dashboard Intent metadata (Phase 18)
  // Passed to SchemaRenderer for sorting and layout hints
  intent?: {
    role?: 'today' | 'in-progress' | 'upcoming' | 'summary' | 'history';
    priority?: 'primary' | 'secondary' | 'tertiary';
    timeScope?: 'now' | 'today' | 'this-week' | 'this-month' | 'all-time';
    layoutHint?: 'stats-row' | 'card-list' | 'data-table' | 'chart' | 'activity' | 'calendar' | 'kanban';
    emphasis?: 'normal' | 'highlighted';
  };
}

export interface MaterializedPage {
  id: string;
  name: string;
  route: string;
  type: string;
  entityId?: string;
  
  // MULTI-SURFACE: Which surface this page belongs to (admin, provider, patient, or customer)
  surface?: 'admin' | 'provider' | 'customer' | 'patient';
  
  // Layout
  layout: {
    type: string;
    showHeader: boolean;
    showSidebar: boolean;
    showFooter: boolean;
    sidebarPosition: 'left' | 'right';
    headerHeight: string;
    sidebarWidth: string;
  };
  
  // Components ready for rendering
  components: MaterializedComponent[];
  
  // Navigation metadata
  navigation: {
    showInSidebar: boolean;
    showInNavbar: boolean;
    order: number;
    icon?: string;
    label: string;
  };
  
  // Page-specific settings
  settings: {
    pagination?: { enabled: boolean; pageSize: number };
    search?: { enabled: boolean; placeholder: string };
    filters?: Array<{ field: string; type: string }>;
  };
}

export interface MaterializedApp {
  id: string;
  name: string;
  description?: string;
  
  // All materialized pages
  pages: MaterializedPage[];
  
  // Navigation structure
  navigation: {
    sidebar: {
      enabled: boolean;
      position: 'left' | 'right';
      collapsible: boolean;
      items: Array<{
        pageId: string;
        icon: string;
        label: string;
        route: string;
      }>;
    };
    defaultPage: string;
  };
  
  // Shell/Layout configuration (from visual blocks)
  shell: {
    id: string;
    name: string;
    dashboardType: 'operations' | 'sales' | 'service' | 'health';
    layout: {
      sidebarPosition: 'left' | 'right';
      sidebarStyle: 'full' | 'compact' | 'icons-only';
      headerStyle: 'standard' | 'minimal' | 'prominent';
      contentWidth: 'full' | 'contained' | 'narrow';
    };
    features: {
      showQuickActions: boolean;
      showRecentActivity: boolean;
      showSearch: boolean;
      showUserMenu: boolean;
      showNotifications: boolean;
    };
  };
  
  // Industry context (for dynamic actions/behaviors)
  industry?: {
    id: string;
    name: string;
    dashboardType: 'operations' | 'sales' | 'service' | 'health';
  };
  
  // Kit terminology for display names
  terminology?: Record<string, {
    primary: string;
    plural: string;
  }>;
  
  // App complexity level
  complexity?: 'simple' | 'standard' | 'advanced';
  
  // Setup summary - "Here's what I set up" messages
  setupSummary?: string[];
  
  // Welcome message
  welcomeMessage?: string;
  
  // Theme
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
      textSecondary: string;
      // Semantic colors
      success?: string;
      warning?: string;
      error?: string;
      info?: string;
    };
    typography: Record<string, unknown>;
    spacing: Record<string, string>;
    borderRadius: string;
    // Surface intent - controls ambient background and visual depth (atmosphere)
    surfaceIntent?: 'warm-artisanal' | 'neutral-professional' | 'modern-dark' | 'playful-light';
    // Design system information
    designSystem?: string;
    // Custom CSS variables from design system
    customVars?: Record<string, string>;
  };
  
  // Data structure info
  dataModels: Array<{
    id: string;
    name: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
      required: boolean;
    }>;
  }>;
  
  // Workflows
  flows: Array<{
    id: string;
    name: string;
    enabled: boolean;
    trigger: {
      type: string;
      componentId?: string;
    };
    actions: Array<{
      type: string;
      modelId?: string;
      model?: string;
      config?: Record<string, unknown>;
    }>;
  }>;
}

// ============================================================
// MATERIALIZATION CONTEXT
// ============================================================

export interface MaterializationContext {
  industry?: {
    id: string;
    name: string;
    dashboardType: 'operations' | 'sales' | 'service' | 'health';
  };
  features?: string[];
  // Kit's dashboard template for industry-specific layouts
  dashboardTemplate?: {
    kpis?: Array<{
      label: string;
      metric: string;
      icon?: string;
      format?: 'number' | 'currency' | 'percentage';
    }>;
    charts?: Array<{
      type: 'bar' | 'line' | 'pie' | 'donut';
      title: string;
      dataQuery: string;
    }>;
    lists?: Array<{
      title: string;
      query: string;
      limit?: number;
    }>;
  };
  // Kit's terminology for entity names
  terminology?: Record<string, {
    primary: string;
    plural: string;
  }>;
}

// ============================================================
// PAGE MATERIALIZER
// ============================================================

export class PageMaterializer {
  private context: MaterializationContext = {};

  /**
   * Materialize a complete blueprint into a renderable app structure
   */
  materialize(blueprint: AppBlueprint, context?: MaterializationContext): MaterializedApp {
    // Store context for use in page materialization
    this.context = context || {};
    
    const pages = blueprint.pages.map(page => 
      this.materializePage(page, blueprint.entities, blueprint)
    );

    // Determine shell based on industry and features
    const shell = this.materializeShell(this.context);

    return {
      id: blueprint.id,
      name: blueprint.name,
      description: blueprint.description,
      pages,
      navigation: this.materializeNavigation(blueprint, pages),
      shell,
      industry: this.context.industry,
      // Include terminology from kit for frontend display
      terminology: this.context.terminology,
      // Include complexity level for UI density
      complexity: undefined, // Will be set by AppConfiguration
      theme: this.materializeTheme(blueprint),
      dataModels: this.materializeDataModels(blueprint.entities),
      flows: this.materializeFlows(blueprint.workflows),
    };
  }

  /**
   * Materialize shell configuration based on industry and features
   */
  private materializeShell(context: MaterializationContext): MaterializedApp['shell'] {
    const { industry, features = [] } = context;
    const dashboardType = industry?.dashboardType || 'operations';
    
    // Determine shell ID based on features and industry
    let shellId = 'dashboard-02'; // Default standard shell
    let shellName = 'Standard Business Shell';
    
    // Feature-based shell selection
    if (features.some(f => ['invoices', 'payments', 'billing', 'accounting'].includes(f))) {
      shellId = 'dashboard-05';
      shellName = 'Data Specialist Shell';
    } else if (features.some(f => ['inventory', 'products', 'catalog', 'stock'].includes(f))) {
      shellId = 'dashboard-07';
      shellName = 'Inventory Shell';
    } else if (dashboardType === 'health') {
      shellId = 'dashboard-04';
      shellName = 'Health & Fitness Shell';
    } else if (dashboardType === 'service') {
      shellId = 'dashboard-03';
      shellName = 'Service Provider Shell';
    } else if (dashboardType === 'sales') {
      shellId = 'dashboard-06';
      shellName = 'Sales & CRM Shell';
    }
    
    // Determine layout based on shell type
    const layoutConfig = this.getShellLayout(shellId, dashboardType);
    const featureConfig = this.getShellFeatures(shellId, features);
    
    return {
      id: shellId,
      name: shellName,
      dashboardType,
      layout: layoutConfig,
      features: featureConfig,
    };
  }

  /**
   * Get layout configuration for a shell
   */
  private getShellLayout(shellId: string, dashboardType: string): MaterializedApp['shell']['layout'] {
    // Different shells have different layout preferences
    const layouts: Record<string, MaterializedApp['shell']['layout']> = {
      'dashboard-02': {
        sidebarPosition: 'left',
        sidebarStyle: 'full',
        headerStyle: 'standard',
        contentWidth: 'contained',
      },
      'dashboard-03': { // Service
        sidebarPosition: 'left',
        sidebarStyle: 'compact',
        headerStyle: 'prominent',
        contentWidth: 'full',
      },
      'dashboard-04': { // Health
        sidebarPosition: 'left',
        sidebarStyle: 'full',
        headerStyle: 'standard',
        contentWidth: 'contained',
      },
      'dashboard-05': { // Data/Invoices
        sidebarPosition: 'left',
        sidebarStyle: 'compact',
        headerStyle: 'minimal',
        contentWidth: 'full',
      },
      'dashboard-06': { // Sales/CRM
        sidebarPosition: 'left',
        sidebarStyle: 'full',
        headerStyle: 'prominent',
        contentWidth: 'contained',
      },
      'dashboard-07': { // Inventory
        sidebarPosition: 'left',
        sidebarStyle: 'compact',
        headerStyle: 'standard',
        contentWidth: 'full',
      },
    };
    
    return layouts[shellId] || layouts['dashboard-02'];
  }

  /**
   * Get feature configuration for a shell
   */
  private getShellFeatures(shellId: string, features: string[]): MaterializedApp['shell']['features'] {
    const hasScheduling = features.some(f => ['scheduling', 'appointments', 'calendar'].includes(f));
    const hasNotifications = features.some(f => ['notifications', 'alerts', 'reminders'].includes(f));
    
    return {
      showQuickActions: true,
      showRecentActivity: ['dashboard-02', 'dashboard-05', 'dashboard-06'].includes(shellId),
      showSearch: true,
      showUserMenu: true,
      showNotifications: hasNotifications || hasScheduling,
    };
  }

  /**
   * Materialize a single page
   */
  private materializePage(
    page: PageDef,
    entities: EntityDef[],
    blueprint: AppBlueprint
  ): MaterializedPage {
    // Try to find entity by ID first
    let entity = page.entity ? entities.find(e => e.id === page.entity) : undefined;
    
    // If not found, try to infer from page name or route - BUT only if there's a reasonable match
    if (!entity && entities.length > 0) {
      const pageNameLower = page.name.toLowerCase();
      const pageRouteLower = page.route.toLowerCase();
      
      // Try to match entity by name similarity - STRICT matching only
      entity = entities.find(e => {
        const entityNameLower = e.name.toLowerCase();
        const entityPluralLower = (e.pluralName || e.name + 's').toLowerCase();
        const entityIdLower = e.id.toLowerCase();
        
        // Only match if page name/route clearly references this entity
        return pageNameLower.includes(entityNameLower) ||
               pageNameLower.includes(entityPluralLower) ||
               pageNameLower.includes(entityIdLower) ||
               pageRouteLower.includes(entityIdLower) ||
               entityPluralLower === pageNameLower ||
               entityNameLower === pageNameLower;
      });
      
      // DO NOT fall back to a random entity - this causes wrong UI to be shown
      // If no matching entity found, leave entity as undefined
      // The page will show an appropriate "no data configured" state
    }
    
    // Generate components based on page type
    let components: MaterializedComponent[];
    
    switch (page.type) {
      case 'list':
        components = this.materializeListPage(page, entity);
        break;
      case 'form':
        components = this.materializeFormPage(page, entity);
        break;
      case 'detail':
        components = this.materializeDetailPage(page, entity);
        break;
      case 'dashboard':
        components = this.materializeDashboardPage(page, entities);
        break;
      case 'calendar':
        components = this.materializeCalendarPage(page, entity);
        break;
      case 'kanban':
        components = this.materializeKanbanPage(page, entity);
        break;
      case 'table':
        components = this.materializeTablePage(page, entity);
        break;
      case 'chat':
      case 'messaging':
        components = this.materializeChatPage(page, entity);
        break;
      case 'timeline':
      case 'grid':
        components = this.materializeGenericPage(page, entity);
        break;
      default:
        components = this.materializeGenericPage(page, entity);
    }

    return {
      id: page.id,
      name: page.name,
      route: page.route,
      type: page.type,
      entityId: page.entity,
      // DUAL-SURFACE: Preserve surface type from page definition
      surface: page.surface || 'admin',
      layout: {
        type: page.layout?.type || 'single-column',
        showHeader: page.autoLayout?.showHeader ?? true,
        showSidebar: page.autoLayout?.showSidebar ?? true,
        showFooter: page.autoLayout?.showFooter ?? false,
        sidebarPosition: 'left',
        headerHeight: page.autoLayout?.headerHeight || '64px',
        sidebarWidth: page.autoLayout?.sidebarWidth || '250px',
      },
      components,
      navigation: {
        showInSidebar: page.navigation?.showInSidebar ?? true,
        showInNavbar: page.navigation?.showInNavbar ?? false,
        order: page.navigation?.order ?? 0,
        icon: this.getPageIcon(page, entity),
        label: page.name,
      },
      settings: {
        pagination: page.settings?.pagination,
        search: page.settings?.search,
        filters: page.settings?.filters,
      },
    };
  }

  /**
   * Materialize a list page
   * NOW USES DataTable for primary entities with proper columns
   */
  private materializeListPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    // If no entity, derive names from page name (e.g., "Materials" -> singular "Material")
    const pluralName = entity?.pluralName || page.name;
    const entityName = entity?.name || this.singularize(page.name);
    const entityId = entity?.id || this.toEntityId(page.name);
    
    // If no entity exists, we'll show a "not configured" message
    const hasEntity = !!entity;
    
    // Determine the best display mode for this entity
    const cardType = this.getCardTypeForEntity(entity);
    const useDataTable = this.shouldUseDataTable(entity);
    
    // Build smart columns for DataTable - hide id, format dates, show status as badge
    const tableColumns = this.buildTableColumns(entity);

    return [
      // Header with title and add button
      {
        id: `${page.id}-header`,
        componentId: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: `${page.id}-title`,
            componentId: 'text',
            props: { text: pluralName, variant: 'h1' },
          },
          {
            // IMPORTANT: Use entityId for button ID to match WorkflowEngine triggers
            id: `${entityId}-add-btn`,
            componentId: 'button',
            props: { 
              label: `Add ${entityName}`, 
              variant: 'primary',
              action: 'open_modal',
              modalId: `${entityId}-form-modal`,
            },
          },
        ],
      },
      // Data display - DataTable for data-heavy entities, Card list for person-type
      hasEntity ? (useDataTable ? {
        // DataTable for structured data (invoices, orders, products, etc.)
        id: `${page.id}-table`,
        componentId: 'dataTable',
        props: {
          source: entityId,
          columns: tableColumns,
          searchable: true,
          searchPlaceholder: `Search ${pluralName.toLowerCase()}...`,
          paginated: true,
          pageSize: 10,
          emptyMessage: `No ${pluralName.toLowerCase()} yet. Click "Add ${entityName}" to create one.`,
        },
      } : {
        // Card list for person-type entities (members, clients, patients)
        id: `${page.id}-list`,
        componentId: 'list',
        props: {
          source: entityId,
          showActions: true,
          emptyMessage: `No ${pluralName.toLowerCase()} yet. Click "Add ${entityName}" to create one.`,
          cardType,
          entityName,
          cardConfig: this.getCardConfig(entity, cardType),
        },
      }) : {
        // Show "not configured" message when entity doesn't exist
        id: `${page.id}-not-configured`,
        componentId: 'container',
        props: { className: 'flex flex-col items-center justify-center py-12 text-center' },
        children: [
          {
            id: `${page.id}-not-configured-icon`,
            componentId: 'text',
            props: { text: '📋', variant: 'h1', className: 'text-4xl mb-4 opacity-50' },
          },
          {
            id: `${page.id}-not-configured-title`,
            componentId: 'text',
            props: { text: `${pluralName} Not Configured`, variant: 'h3', className: 'text-muted-foreground' },
          },
          {
            id: `${page.id}-not-configured-desc`,
            componentId: 'text',
            props: { 
              text: `The ${pluralName.toLowerCase()} feature is not yet set up for this app. Use the discovery chat to add this functionality.`,
              variant: 'p',
              className: 'text-sm text-muted-foreground mt-2 max-w-md',
            },
          },
        ],
      },
    ];
  }
  
  /**
   * Determine if entity should use DataTable (structured data) or Card list (person-type)
   */
  private shouldUseDataTable(entity?: EntityDef): boolean {
    if (!entity) return false;
    
    const nameLower = entity.name.toLowerCase();
    
    // Card list is better for person-type entities
    const personTypes = [
      'member', 'client', 'customer', 'patient', 'contact',
      'user', 'employee', 'staff', 'student', 'tenant', 'guest'
    ];
    if (personTypes.some(t => nameLower.includes(t))) {
      return false; // Use card list for people
    }
    
    // DataTable is better for data-heavy/transactional entities
    const tableTypes = [
      'invoice', 'order', 'payment', 'product', 'item',
      'appointment', 'booking', 'reservation', 'job', 'task',
      'lease', 'contract', 'quote', 'estimate', 'material',
      'equipment', 'vehicle', 'property', 'unit'
    ];
    if (tableTypes.some(t => nameLower.includes(t))) {
      return true; // Use DataTable for transactional data
    }
    
    // Default: use DataTable if entity has many fields (>5)
    return (entity.fields?.length || 0) > 5;
  }
  
  /**
   * Build smart table columns for DataTable
   * - Hides internal fields (id, createdAt, updatedAt)
   * - Formats dates, currency, phone numbers
   * - Shows status as badge
   */
  private buildTableColumns(entity?: EntityDef): Array<{
    id: string;
    header: string;
    field: string;
    sortable: boolean;
    format?: string;
  }> {
    if (!entity?.fields) {
      return [
        { id: 'name', header: 'Name', field: 'name', sortable: true },
      ];
    }
    
    // Fields to always hide
    const hiddenFields = new Set(['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at']);
    
    // Build columns with smart formatting
    return entity.fields
      .filter(f => !hiddenFields.has(f.id) && !f.displayOptions?.hidden)
      .slice(0, 6) // Limit to 6 columns for readability
      .map(field => {
        const column: {
          id: string;
          header: string;
          field: string;
          sortable: boolean;
          format?: string;
        } = {
          id: field.id,
          header: field.name,
          field: field.id,
          sortable: true,
        };
        
        // Add format hints for the renderer
        if (field.type === 'date' || field.type === 'datetime') {
          column.format = 'date';
        } else if (field.type === 'currency') {
          column.format = 'currency';
        } else if (field.type === 'phone') {
          column.format = 'phone';
        } else if (field.type === 'email') {
          column.format = 'email';
        } else if (field.type === 'enum') {
          column.format = 'badge';
        }
        
        return column;
      });
  }
  
  /**
   * Convert plural name to singular (e.g., "Materials" -> "Material")
   */
  private singularize(name: string): string {
    if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
    if (name.endsWith('es') && !name.endsWith('ses')) return name.slice(0, -2);
    if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
    return name;
  }
  
  /**
   * Convert page name to entity ID (e.g., "Materials" -> "material")
   */
  private toEntityId(name: string): string {
    return this.singularize(name).toLowerCase();
  }

  /**
   * Get card configuration based on entity and card type
   */
  private getCardConfig(entity?: EntityDef, cardType?: string): Record<string, unknown> {
    if (!entity) return {};

    const fields = entity.fields || [];
    
    // Find common field types
    const nameField = fields.find(f => f.id === 'name' || f.id === 'title' || f.name.toLowerCase().includes('name'));
    const emailField = fields.find(f => f.type === 'email' || f.id === 'email');
    const phoneField = fields.find(f => f.type === 'phone' || f.id === 'phone');
    const imageField = fields.find(f => f.type === 'image' || f.id === 'avatar' || f.id === 'image' || f.id === 'photo');
    const statusField = fields.find(f => f.type === 'enum' && (f.id === 'status' || f.id === 'state'));
    const priceField = fields.find(f => f.type === 'currency' || f.id === 'price' || f.id === 'amount');
    const subtitleField = fields.find(f => f.id === 'subtitle' || f.id === 'role' || f.id === 'position' || f.id === 'type');

    if (cardType === 'personCard') {
      return {
        type: 'personCard',
        nameField: nameField?.id || 'name',
        // ENHANCED: Always include common avatar field names - data generator adds them
        avatarField: imageField?.id || 'avatar',
        subtitleField: subtitleField?.id,
        fieldMappings: [
          emailField ? { field: emailField.id, type: 'email', icon: '✉️' } : null,
          phoneField ? { field: phoneField.id, type: 'phone', icon: '📞' } : null,
        ].filter(Boolean),
        statusField: statusField?.id,
        // Default actions for person cards
        primaryAction: { label: 'View', icon: '👁️' },
        secondaryActions: [
          { label: 'Edit', icon: '✏️' },
          emailField ? { label: 'Email', icon: '✉️' } : null,
          phoneField ? { label: 'Call', icon: '📞' } : null,
        ].filter(Boolean),
      };
    }

    if (cardType === 'itemCard') {
      return {
        type: 'itemCard',
        titleField: nameField?.id || 'name',
        // ENHANCED: Always include common image field name - data generator adds them
        imageField: imageField?.id || 'image',
        subtitleField: subtitleField?.id,
        priceField: priceField?.id,
        statusField: statusField?.id,
        fieldMappings: fields
          .filter(f => f.id !== nameField?.id && f.id !== imageField?.id && f.id !== priceField?.id)
          .slice(0, 4)
          .map(f => ({ field: f.id, label: f.name })),
        // Default actions for item cards
        actions: [
          { label: 'View', icon: '👁️' },
          { label: 'Edit', icon: '✏️' },
        ],
      };
    }

    // Default card config - still include avatar/image for fallback rendering
    return {
      type: 'card',
      titleField: nameField?.id || 'name',
      avatarField: imageField?.id || 'avatar',
      imageField: imageField?.id || 'image',
    };
  }

  /**
   * Materialize a form page
   */
  private materializeFormPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityName = entity?.name || 'Item';
    const entityId = entity?.id || 'item';
    const fields = entity?.fields.filter(f => 
      f.id !== 'id' && f.id !== 'createdAt' && f.id !== 'updatedAt' && !f.displayOptions?.hidden
    ) || [
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'description', name: 'Description', type: 'string', required: false },
    ];

    const formInputs: MaterializedComponent[] = fields.map(field => ({
      id: `field-${field.id}`,
      componentId: 'input',
      props: {
        name: field.id,
        label: field.name,
        type: this.getInputType(field.type),
        required: field.required,
        placeholder: `Enter ${field.name.toLowerCase()}`,
        ...(field.type === 'enum' && field.enumOptions
          ? { options: field.enumOptions.map(o => ({ value: o.value, label: o.label })) }
          : {}),
      },
    }));

    return [
      // Header
      {
        id: `${page.id}-header`,
        componentId: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: `${page.id}-title`,
            componentId: 'text',
            props: { text: `Add ${entityName}`, variant: 'h1' },
          },
          {
            // IMPORTANT: Use entityId for button ID to match WorkflowEngine triggers
            id: `nav-${entityId}-list`,
            componentId: 'button',
            props: { 
              label: '← Back', 
              variant: 'ghost',
              action: 'navigate',
              route: `/${entityId}s`,
            },
          },
        ],
      },
      // Form - ID must match WorkflowEngine's form_submit trigger
      {
        id: `${entityId}-form`,
        componentId: 'form',
        props: {
          submitLabel: `Save ${entityName}`,
          source: entityId,
        },
        children: formInputs,
      },
    ];
  }

  /**
   * Materialize a detail page
   */
  private materializeDetailPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityName = entity?.name || 'Item';
    const entityId = entity?.id || 'item';
    const fields = entity?.fields.filter(f => 
      f.id !== 'id' && !f.displayOptions?.hidden
    ) || [
      { id: 'name', name: 'Name', type: 'string' },
      { id: 'description', name: 'Description', type: 'string' },
    ];

    const fieldDisplays: MaterializedComponent[] = fields.map(field => ({
      id: `display-${field.id}`,
      componentId: 'text',
      props: {
        label: field.name,
        field: field.id,
        variant: 'field',
      },
    }));

    return [
      // Header with actions
      {
        id: `${page.id}-header`,
        componentId: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: `${page.id}-title`,
            componentId: 'text',
            props: { text: entityName, variant: 'h1' },
          },
          {
            id: `${page.id}-actions`,
            componentId: 'container',
            props: { className: 'flex gap-2' },
            children: [
              {
                // IMPORTANT: Use entityId for button ID to match WorkflowEngine triggers
                id: `${entityId}-edit-btn`,
                componentId: 'button',
                props: { label: 'Edit', variant: 'secondary' },
              },
              {
                // IMPORTANT: Use entityId for button ID to match WorkflowEngine triggers
                id: `${entityId}-delete-btn`,
                componentId: 'button',
                props: { label: 'Delete', variant: 'danger' },
              },
            ],
          },
        ],
      },
      // Detail card
      {
        id: `${page.id}-card`,
        componentId: 'card',
        props: { source: entityId },
        children: fieldDisplays,
      },
    ];
  }

  /**
   * Materialize a dashboard page using Dashboard Intent System (Phase 18)
   * 
   * ENHANCED: Now uses semantic intent for story, hierarchy, and actions
   * Story flow: Now → Work → Context (today → in-progress → upcoming → summary → history)
   * 
   * WHY: This creates dashboards that tell a clear story with domain personality
   */
  private materializeDashboardPage(page: PageDef, entities: EntityDef[]): MaterializedComponent[] {
    const { industry, dashboardTemplate } = this.context;
    
    // Generate dashboard intent using the intent system
    const industryKit = industry?.id ? getIndustryKit(industry.id as IndustryKitId) : undefined;
    const intent = generateDashboardIntent(entities, industryKit);
    
    // Get section config for domain personality
    const sectionConfig = getIndustrySectionConfig(industry?.id || 'default');
    
    const components: MaterializedComponent[] = [];
    
    // Dashboard header with title and quick actions
    const headerContainer: MaterializedComponent = {
      id: 'dashboard-header',
      componentId: 'container',
      props: { className: 'flex justify-between items-center mb-6' },
      children: [
        {
          id: 'dashboard-title',
          componentId: 'text',
          props: { 
            text: intent.title || sectionConfig.todayTitle || 'Dashboard', 
            variant: 'h1' 
          },
        },
        {
          id: 'dashboard-actions',
          componentId: 'container',
          props: { className: 'flex gap-2' },
          children: this.getDashboardQuickActions(entities, industry?.id),
        },
      ],
    };
    components.push(headerContainer);

    // ================================================================
    // INTENT-DRIVEN SECTIONS
    // Sections are generated and ordered by the intent system
    // Each section has role, priority, and appropriate content
    // ================================================================
    
    for (const section of intent.sections) {
      const sectionComponent = this.materializeDashboardSection(section, entities);
      if (sectionComponent) {
        components.push(sectionComponent);
      }
    }

    // ================================================================
    // ACTIVITY FEED - Always added for real-time feel
    // WHY: Makes dashboard feel "alive" with real-time activity updates
    // ================================================================
    if (entities.length > 0) {
      const activityFeed: MaterializedComponent = {
        id: 'activity-feed',
        componentId: 'activityFeed',
        props: {
          title: 'Recent Activity',
          sources: entities.slice(0, 3).map(e => e.id),
          limit: 5,
        },
        intent: {
          role: 'history',
          priority: 'tertiary',
          layoutHint: 'activity',
        },
      };
      components.push(activityFeed);
    }

    return components;
  }
  
  /**
   * Materialize a single dashboard section based on intent
   */
  private materializeDashboardSection(
    section: DashboardSection, 
    entities: EntityDef[]
  ): MaterializedComponent | null {
    const { industry } = this.context;
    
    // Map section role to appropriate component structure
    switch (section.role) {
      case 'today':
        return this.materializeTodaySection(section, entities);
      
      case 'in-progress':
        return this.materializeInProgressSection(section, entities);
      
      case 'upcoming':
        return this.materializeUpcomingSection(section, entities);
      
      case 'summary':
        return this.materializeSummarySection(section, entities);
      
      case 'history':
        return this.materializeHistorySection(section, entities);
      
      default:
        return null;
    }
  }
  
  /**
   * Materialize a "today" section - KPI stats and current state
   */
  private materializeTodaySection(
    section: DashboardSection, 
    entities: EntityDef[]
  ): MaterializedComponent {
    const statsCards: MaterializedComponent[] = [];
    
    if (section.metrics && section.metrics.length > 0) {
      // Build stats cards from intent metrics
      section.metrics.forEach((metric, index) => {
        statsCards.push({
          id: `kpi-${section.id}-${index}`,
          componentId: 'statsCard',
          props: {
            title: metric.label,
            metric: metric.sourceMetric,
            timeScope: metric.timeScope,
            timeScopeLabel: TIME_SCOPE_LABELS[metric.timeScope],
            icon: metric.icon,
            format: metric.format || 'number',
            emphasize: metric.emphasize,
          },
          intent: {
            role: section.role,
            priority: section.priority,
            timeScope: metric.timeScope,
            emphasis: metric.emphasize ? 'highlighted' : 'normal',
          },
        });
      });
    } else {
      // Fallback to entity-based KPIs
      const kpiWidgets = this.buildKPIWidgets(entities);
      statsCards.push(...kpiWidgets.map(w => ({
        ...w,
        intent: {
          role: section.role as 'today',
          priority: section.priority,
          timeScope: 'today' as const,
        },
      })));
    }
    
    return {
      id: `section-${section.id}`,
      componentId: 'container',
      props: { 
        className: 'mb-6',
        'data-section-role': section.role,
        'data-section-priority': section.priority,
      },
      children: [
        // Section title (if different from dashboard title)
        ...(section.title !== 'Today at a Glance' ? [{
          id: `${section.id}-title`,
          componentId: 'text',
          props: { text: section.title, variant: 'h2', className: 'mb-4' },
        }] : []),
        // Stats grid
        {
          id: `${section.id}-grid`,
          componentId: 'statsCardGrid',
          props: { 
            columns: Math.min(statsCards.length, 4),
          },
          children: statsCards,
        },
      ],
      intent: {
        role: section.role,
        priority: section.priority,
        timeScope: section.timeScope,
        layoutHint: section.layoutHint || 'stats-row',
      },
    };
  }
  
  /**
   * Materialize an "in-progress" section - active work needing attention
   */
  private materializeInProgressSection(
    section: DashboardSection, 
    entities: EntityDef[]
  ): MaterializedComponent {
    const entity = entities.find(e => e.id === section.listEntity) || entities[0];
    
    // Build action buttons if section allows actions
    const actionButtons: MaterializedComponent[] = [];
    if (section.actions && ACTIONABLE_ROLES.includes(section.role)) {
      section.actions.forEach((action, index) => {
        actionButtons.push({
          id: `${section.id}-action-${index}`,
          componentId: 'button',
          props: {
            label: action.label,
            variant: action.variant || 'secondary',
            icon: action.icon,
            'data-action-id': action.actionId,
            'data-entity': action.entity,
            'data-visibility-rule': action.visibilityRule,
          },
        });
      });
    }
    
    return {
      id: `section-${section.id}`,
      componentId: 'card',
      props: { 
        title: section.title,
        subtitle: section.subtitle,
        className: 'mb-6',
        'data-section-role': section.role,
        'data-section-priority': section.priority,
      },
      children: [
        // Header with title and actions
        ...(actionButtons.length > 0 ? [{
          id: `${section.id}-header`,
          componentId: 'container',
          props: { className: 'flex justify-between items-center mb-4' },
          children: [
            {
              id: `${section.id}-title`,
              componentId: 'text',
              props: { text: section.title, variant: 'h3' },
            },
            {
              id: `${section.id}-actions`,
              componentId: 'container',
              props: { className: 'flex gap-2' },
              children: actionButtons,
            },
          ],
        }] : [{
          id: `${section.id}-title`,
          componentId: 'text',
          props: { text: section.title, variant: 'h3', className: 'mb-4' },
        }]),
        // Entity list
        {
          id: `${section.id}-list`,
          componentId: 'list',
          props: {
            source: entity?.id || section.listEntity,
            filter: section.listFilter,
            limit: section.limit || 5,
            variant: 'compact',
            showStatus: true,
          },
        },
      ],
      intent: {
        role: section.role,
        priority: section.priority,
        layoutHint: section.layoutHint || 'card-list',
      },
    };
  }
  
  /**
   * Materialize an "upcoming" section - scheduled future items
   */
  private materializeUpcomingSection(
    section: DashboardSection, 
    entities: EntityDef[]
  ): MaterializedComponent {
    const entity = entities.find(e => e.id === section.listEntity) || entities[0];
    
    // Build action buttons if section allows actions
    const actionButtons: MaterializedComponent[] = [];
    if (section.actions && ACTIONABLE_ROLES.includes(section.role)) {
      section.actions.forEach((action, index) => {
        actionButtons.push({
          id: `${section.id}-action-${index}`,
          componentId: 'button',
          props: {
            label: action.label,
            variant: action.variant || 'secondary',
            icon: action.icon,
          },
        });
      });
    }
    
    // Use calendar layout hint if suggested
    const useCalendar = section.layoutHint === 'calendar';
    
    return {
      id: `section-${section.id}`,
      componentId: 'card',
      props: { 
        title: section.title,
        subtitle: section.timeScope ? TIME_SCOPE_LABELS[section.timeScope] : undefined,
        className: 'mb-6',
        'data-section-role': section.role,
        'data-section-priority': section.priority,
      },
      children: [
        // Header
        {
          id: `${section.id}-header`,
          componentId: 'container',
          props: { className: 'flex justify-between items-center mb-4' },
          children: [
            {
              id: `${section.id}-title`,
              componentId: 'text',
              props: { text: section.title, variant: 'h3' },
            },
            ...(actionButtons.length > 0 ? [{
              id: `${section.id}-actions`,
              componentId: 'container',
              props: { className: 'flex gap-2' },
              children: actionButtons,
            }] : []),
          ],
        },
        // Content - calendar or list
        useCalendar ? {
          id: `${section.id}-calendar`,
          componentId: 'calendar',
          props: {
            source: entity?.id || section.listEntity,
            view: 'week',
            compact: true,
          },
        } : {
          id: `${section.id}-list`,
          componentId: 'list',
          props: {
            source: entity?.id || section.listEntity,
            filter: section.listFilter,
            limit: section.limit || 5,
            variant: 'timeline',
            showDate: true,
          },
        },
      ],
      intent: {
        role: section.role,
        priority: section.priority,
        timeScope: section.timeScope,
        layoutHint: section.layoutHint || 'card-list',
      },
    };
  }
  
  /**
   * Materialize a "summary" section - aggregate metrics, no actions
   */
  private materializeSummarySection(
    section: DashboardSection, 
    entities: EntityDef[]
  ): MaterializedComponent {
    const statsCards: MaterializedComponent[] = [];
    
    if (section.metrics && section.metrics.length > 0) {
      section.metrics.forEach((metric, index) => {
        statsCards.push({
          id: `summary-${section.id}-${index}`,
          componentId: 'statsCard',
          props: {
            title: metric.label,
            metric: metric.sourceMetric,
            timeScope: metric.timeScope,
            timeScopeLabel: TIME_SCOPE_LABELS[metric.timeScope],
            icon: metric.icon,
            format: metric.format || 'number',
            variant: 'compact', // Summary cards are more compact
          },
          intent: {
            role: section.role,
            priority: section.priority,
            timeScope: metric.timeScope,
          },
        });
      });
    }
    
    return {
      id: `section-${section.id}`,
      componentId: 'container',
      props: { 
        className: 'mb-6',
        'data-section-role': section.role,
        'data-section-priority': section.priority,
      },
      children: [
        {
          id: `${section.id}-title`,
          componentId: 'text',
          props: { text: section.title, variant: 'h3', className: 'mb-4 text-muted-foreground' },
        },
        {
          id: `${section.id}-grid`,
          componentId: 'statsCardGrid',
          props: { 
            columns: Math.min(statsCards.length, 4),
            variant: 'compact',
          },
          children: statsCards,
        },
      ],
      intent: {
        role: section.role,
        priority: section.priority,
        timeScope: section.timeScope,
        layoutHint: section.layoutHint || 'stats-row',
      },
    };
  }
  
  /**
   * Materialize a "history" section - past records, no actions
   */
  private materializeHistorySection(
    section: DashboardSection, 
    entities: EntityDef[]
  ): MaterializedComponent {
    const entity = entities.find(e => e.id === section.listEntity) || entities[0];
    
    return {
      id: `section-${section.id}`,
      componentId: 'card',
      props: { 
        title: section.title,
        className: 'mb-6',
        'data-section-role': section.role,
        'data-section-priority': section.priority,
      },
      children: [
        {
          id: `${section.id}-title`,
          componentId: 'text',
          props: { text: section.title, variant: 'h3', className: 'mb-4' },
        },
        {
          id: `${section.id}-table`,
          componentId: 'dataTable',
          props: {
            source: entity?.id || section.listEntity,
            limit: section.limit || 10,
            compact: true,
            pagination: true,
          },
        },
      ],
      intent: {
        role: section.role,
        priority: section.priority,
        timeScope: section.timeScope,
        layoutHint: section.layoutHint || 'data-table',
      },
    };
  }
  
  /**
   * Build action-first widgets based on entities and kit template
   * These show "things that need attention" not vanity metrics
   */
  private buildActionFirstWidgets(
    entities: EntityDef[],
    dashboardTemplate?: MaterializationContext['dashboardTemplate'],
    industryId?: string
  ): MaterializedComponent[] {
    const widgets: MaterializedComponent[] = [];
    
    // Use kit's list definitions if available - they define what's actionable
    if (dashboardTemplate?.lists?.length) {
      dashboardTemplate.lists.slice(0, 3).forEach((list, i) => {
        const source = this.extractDataSourceFromQuery(list.query);
        const matchingEntity = entities.find(e => 
          e.id === source || 
          e.id === source.replace(/s$/, '') ||
          e.pluralName?.toLowerCase() === source.toLowerCase()
        );
        const cardType = this.getCardTypeFromQuery(list.query, list.title, matchingEntity);
        
        widgets.push({
          id: `action-widget-${i}`,
          componentId: 'card',
          props: { 
            title: list.title,
            className: 'h-fit',
          },
          children: [
            {
              id: `action-widget-${i}-content`,
              componentId: 'list',
              props: {
                source,
                limit: list.limit || 5,
                compact: true,
                showActions: true,
                cardType,
                cardConfig: this.getCardConfigFromQuery(cardType, matchingEntity),
                entityName: matchingEntity?.name || this.inferEntityNameFromQuery(list.query, list.title),
              },
            },
          ],
        });
      });
      
      return widgets;
    }
    
    // Fallback: Build widgets based on entity types
    
    // 1. "Today's Schedule" - for entities with date/datetime fields
    const schedulableEntity = entities.find(e => 
      e.fields?.some(f => f.type === 'datetime' || f.type === 'date') &&
      ['appointment', 'booking', 'class', 'session', 'visit', 'job', 'reservation'].some(
        k => e.name.toLowerCase().includes(k)
      )
    );
    
    if (schedulableEntity) {
      const cardType = this.getCardTypeForEntity(schedulableEntity);
      widgets.push({
        id: 'today-schedule',
        componentId: 'card',
        props: { 
          title: `Today's ${schedulableEntity.pluralName}`,
          className: 'h-fit',
        },
        children: [
          {
            id: 'today-schedule-list',
            componentId: 'list',
            props: {
              source: schedulableEntity.id,
              limit: 5,
              compact: true,
              showActions: true,
              cardType,
              cardConfig: this.getCardConfig(schedulableEntity, cardType),
              entityName: schedulableEntity.name,
            },
          },
        ],
      });
    }
    
    // 2. "Pending [Status]" - for entities with status enum having pending/open states
    const statusEntity = entities.find(e => 
      e.fields?.some(f => 
        f.type === 'enum' && 
        f.id === 'status' &&
        f.enumOptions?.some(o => 
          ['pending', 'open', 'scheduled', 'new', 'waiting'].includes(o.value.toLowerCase())
        )
      )
    );
    
    if (statusEntity && statusEntity.id !== schedulableEntity?.id) {
      const cardType = this.getCardTypeForEntity(statusEntity);
      const pendingLabel = statusEntity.name.toLowerCase().includes('payment') ? 'Pending Payments' :
                          statusEntity.name.toLowerCase().includes('invoice') ? 'Unpaid Invoices' :
                          statusEntity.name.toLowerCase().includes('order') ? 'Open Orders' :
                          statusEntity.name.toLowerCase().includes('task') ? 'Open Tasks' :
                          `Pending ${statusEntity.pluralName}`;
      
      widgets.push({
        id: 'pending-items',
        componentId: 'card',
        props: { 
          title: pendingLabel,
          className: 'h-fit',
        },
        children: [
          {
            id: 'pending-items-list',
            componentId: 'list',
            props: {
              source: statusEntity.id,
              limit: 5,
              compact: true,
              showActions: true,
              cardType,
              cardConfig: this.getCardConfig(statusEntity, cardType),
              entityName: statusEntity.name,
              // Filter hint for renderer (if supported)
              filterStatus: ['pending', 'open', 'scheduled', 'new', 'waiting'],
            },
          },
        ],
      });
    }
    
    // 3. Primary person entity - "Recent [People]"
    const personEntity = entities.find(e => 
      ['member', 'client', 'customer', 'patient', 'student', 'tenant', 'guest'].some(
        k => e.name.toLowerCase().includes(k)
      )
    );
    
    if (personEntity) {
      widgets.push({
        id: 'recent-people',
        componentId: 'card',
        props: { 
          title: `Recent ${personEntity.pluralName}`,
          className: 'h-fit',
        },
        children: [
          {
            id: 'recent-people-list',
            componentId: 'list',
            props: {
              source: personEntity.id,
              limit: 5,
              compact: true,
              showActions: true,
              cardType: 'personCard',
              cardConfig: this.getCardConfig(personEntity, 'personCard'),
              entityName: personEntity.name,
            },
          },
        ],
      });
    }
    
    return widgets;
  }
  
  /**
   * Build "Recent X" widgets for entities not covered by action widgets
   */
  private buildRecentWidgets(
    entities: EntityDef[],
    dashboardTemplate?: MaterializationContext['dashboardTemplate']
  ): MaterializedComponent[] {
    const widgets: MaterializedComponent[] = [];
    
    // If kit template has lists, we already used them in action widgets
    if (dashboardTemplate?.lists?.length) {
      // Add any remaining entities as "Recent X" 
      const usedSources = new Set(
        dashboardTemplate.lists.map(l => this.extractDataSourceFromQuery(l.query))
      );
      
      entities
        .filter(e => !usedSources.has(e.id))
        .slice(0, 2)
        .forEach(entity => {
          const cardType = this.getCardTypeForEntity(entity);
          widgets.push({
            id: `recent-${entity.id}`,
            componentId: 'card',
            props: { title: `Recent ${entity.pluralName}` },
            children: [
              {
                id: `recent-${entity.id}-list`,
                componentId: 'list',
                props: {
                  source: entity.id,
                  limit: 5,
                  compact: true,
                  showActions: false,
                  cardType,
                  cardConfig: this.getCardConfig(entity, cardType),
                  entityName: entity.name,
                },
              },
            ],
          });
        });
    } else {
      // No kit template - show recent items for first 2 entities not used in action widgets
      entities.slice(0, 2).forEach(entity => {
        const cardType = this.getCardTypeForEntity(entity);
        widgets.push({
          id: `recent-${entity.id}`,
          componentId: 'card',
          props: { title: `Recent ${entity.pluralName}` },
          children: [
            {
              id: `recent-${entity.id}-list`,
              componentId: 'list',
              props: {
                source: entity.id,
                limit: 5,
                compact: true,
                showActions: false,
                cardType,
                cardConfig: this.getCardConfig(entity, cardType),
                entityName: entity.name,
              },
            },
          ],
        });
      });
    }
    
    return widgets;
  }

  /**
   * Build KPI stats cards for dashboard
   * Creates statsCard components from entities with numeric/currency fields
   * WHY: statsCard provides rich KPI display with trends, icons, and formatting
   */
  private buildKPIWidgets(entities: EntityDef[]): MaterializedComponent[] {
    const kpis: MaterializedComponent[] = [];
    
    for (const entity of entities) {
      // Find currency fields that make good KPIs (e.g., "Total Revenue")
      const currencyField = entity.fields?.find(f => f.type === 'currency');
      
      if (currencyField) {
        kpis.push({
          id: `kpi-${entity.id}-${currencyField.id}`,
          componentId: 'statsCard',  // Rich component, not generic card
          props: {
            title: `Total ${currencyField.name}`,
            value: '$0',  // Will be hydrated with aggregated data
            icon: 'currency',
            source: entity.id,
            field: currencyField.id,
            aggregation: 'sum',
            format: 'currency',
          },
        });
      }
      
      // Add count KPI for primary entities (e.g., "Total Clients")
      if (kpis.length < 4) {
        const icon = this.getEntityIcon(entity);
        kpis.push({
          id: `kpi-${entity.id}-count`,
          componentId: 'statsCard',
          props: {
            title: `Total ${entity.pluralName}`,
            value: '0',
            icon,
            source: entity.id,
            aggregation: 'count',
          },
        });
      }
    }
    
    // Limit to 4 KPIs for clean layout
    return kpis.slice(0, 4);
  }

  /**
   * Build chart widget for dashboard
   * Creates areaChart from entity with date + numeric fields (trend data)
   * WHY: Charts show trends over time, making dashboards feel "alive"
   */
  private buildChartWidget(entities: EntityDef[]): MaterializedComponent | null {
    // Find entity with date + numeric field (good for time-series)
    const chartEntity = entities.find(e => 
      e.fields?.some(f => f.type === 'date' || f.type === 'datetime') &&
      e.fields?.some(f => f.type === 'currency' || f.type === 'number')
    );
    
    if (!chartEntity) return null;
    
    const dateField = chartEntity.fields?.find(f => f.type === 'date' || f.type === 'datetime');
    const valueField = chartEntity.fields?.find(f => f.type === 'currency' || f.type === 'number');
    
    if (!dateField || !valueField) return null;
    
    return {
      id: `chart-${chartEntity.id}`,
      componentId: 'areaChart',  // Rich chart component
      props: {
        title: `${chartEntity.pluralName} Over Time`,
        description: `Trend of ${valueField.name.toLowerCase()} by ${dateField.name.toLowerCase()}`,
        source: chartEntity.id,
        xAxisKey: dateField.id,
        dataKeys: [valueField.id],
        dataLabels: {
          [valueField.id]: valueField.name,
        },
      },
    };
  }

  /**
   * Get icon string for an entity based on its type
   */
  private getEntityIcon(entity: EntityDef): string {
    const nameLower = entity.name.toLowerCase();
    
    // Person types
    if (['member', 'client', 'customer', 'patient', 'user', 'employee', 'staff', 'student', 'tenant', 'guest'].some(k => nameLower.includes(k))) {
      return 'users';
    }
    // Financial
    if (['invoice', 'payment', 'order', 'revenue', 'expense', 'bill'].some(k => nameLower.includes(k))) {
      return 'currency';
    }
    // Scheduling
    if (['appointment', 'booking', 'reservation', 'class', 'session', 'job'].some(k => nameLower.includes(k))) {
      return 'calendar';
    }
    // Products/Inventory
    if (['product', 'item', 'inventory', 'material', 'equipment'].some(k => nameLower.includes(k))) {
      return 'package';
    }
    // Tasks/Projects
    if (['task', 'project', 'ticket', 'issue'].some(k => nameLower.includes(k))) {
      return 'clipboard';
    }
    
    return 'activity';  // Default icon
  }

  /**
   * Extract data source entity from query string (e.g., 'reservations WHERE...' -> 'reservation')
   */
  private extractDataSourceFromQuery(query: string): string {
    const queryLower = query.toLowerCase();
    const entities = [
      'reservation', 'order', 'invoice', 'member', 'patient', 'student', 
      'tenant', 'job', 'appointment', 'guest', 'client', 'lesson',
      'maintenance', 'rentpayment', 'lease', 'unit', 'property',
    ];
    
    for (const entity of entities) {
      if (queryLower.includes(entity)) return entity;
    }
    
    // Try to extract first word before WHERE
    const match = query.match(/^(\w+)/);
    return match ? match[1].toLowerCase().replace(/s$/, '') : 'items';
  }

  /**
   * Get quick action buttons for dashboard
   */
  private getDashboardQuickActions(entities: EntityDef[], industryId?: string): MaterializedComponent[] {
    const primaryEntity = entities[0];
    if (!primaryEntity) return [];

    const actions: MaterializedComponent[] = [
      {
        id: 'quick-add',
        componentId: 'button',
        props: {
          label: `Add ${primaryEntity.name}`,
          variant: 'primary',
          icon: '+',
          action: 'navigate',
          route: `/${primaryEntity.id}s/new`,
        },
      },
    ];

    // Industry-specific quick actions
    if (industryId === 'gym') {
      actions.push({
        id: 'quick-checkin',
        componentId: 'button',
        props: { label: 'Quick Check-In', variant: 'secondary', icon: '✅' },
      });
    } else if (industryId === 'salon' || industryId === 'medical') {
      actions.push({
        id: 'quick-book',
        componentId: 'button',
        props: { label: 'New Booking', variant: 'secondary', icon: '📅' },
      });
    } else if (['plumber', 'electrician', 'contractor'].includes(industryId || '')) {
      actions.push({
        id: 'quick-job',
        componentId: 'button',
        props: { label: 'New Job', variant: 'secondary', icon: '🔧' },
      });
    }

    return actions;
  }


  /**
   * Materialize a calendar page
   */
  private materializeCalendarPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityId = entity?.id || 'event';
    const dateField = entity?.fields.find(f => f.type === 'date' || f.type === 'datetime')?.id || 'date';
    const titleField = entity?.displayConfig?.titleField || 'name';

    return [
      {
        id: 'calendar-header',
        componentId: 'text',
        props: { text: 'Calendar', variant: 'h1' },
      },
      {
        id: 'calendar-view',
        componentId: 'calendar',
        props: {
          source: entityId,
          dateField,
          titleField,
          view: 'month',
        },
      },
    ];
  }

  /**
   * Materialize a kanban page
   */
  private materializeKanbanPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityId = entity?.id || 'item';
    const statusField = entity?.fields.find(f => f.type === 'enum' && (f.id === 'status' || f.id === 'stage'));
    const columns = statusField?.enumOptions || [
      { value: 'todo', label: 'To Do', color: '#9ca3af' },
      { value: 'in_progress', label: 'In Progress', color: '#60a5fa' },
      { value: 'done', label: 'Done', color: '#34d399' },
    ];

    return [
      {
        id: 'kanban-header',
        componentId: 'text',
        props: { text: `${entity?.name || 'Item'} Board`, variant: 'h1' },
      },
      {
        id: 'kanban-board',
        componentId: 'kanban',
        props: {
          source: entityId,
          columnField: statusField?.id || 'status',
          columns: columns.map(c => ({
            id: c.value,
            title: c.label,
            color: c.color,
          })),
          titleField: entity?.displayConfig?.titleField || 'name',
        },
      },
    ];
  }

  /**
   * Materialize a chat/messaging page
   * Uses the chat component instead of a list with add button
   */
  private materializeChatPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityId = entity?.id || 'message';
    
    return [
      // Header
      {
        id: `${page.id}-header`,
        componentId: 'container',
        props: { className: 'flex justify-between items-center mb-4' },
        children: [
          {
            id: `${page.id}-title`,
            componentId: 'text',
            props: { text: page.name || 'Messaging', variant: 'h1' },
          },
          {
            id: `${page.id}-compose`,
            componentId: 'button',
            props: { 
              label: 'New Conversation', 
              variant: 'primary',
              icon: '✏️',
            },
          },
        ],
      },
      // Chat interface
      {
        id: `${page.id}-chat`,
        componentId: 'chat',
        props: {
          source: entityId,
          messageField: 'message',
          senderField: 'sender',
          timestampField: 'timestamp',
          currentUser: 'me',
          placeholder: 'Type a message...',
        },
      },
    ];
  }

  /**
   * Materialize a table page - now using enhanced dataTable component
   */
  private materializeTablePage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityId = entity?.id || 'item';
    const entityName = entity?.name || 'Item';
    const pluralName = entity?.pluralName || 'Items';
    
    // Build columns with proper labels
    const columns = (entity?.displayConfig?.listFields || entity?.fields.map(f => f.id) || []).map(fieldId => {
      const field = entity?.fields.find(f => f.id === fieldId);
      return {
        id: fieldId,
        header: field?.name || fieldId.charAt(0).toUpperCase() + fieldId.slice(1).replace(/_/g, ' '),
        field: fieldId,
        sortable: true,
      };
    });

    return [
      // Header with title and add button
      {
        id: `${page.id}-header`,
        componentId: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: `${page.id}-title`,
            componentId: 'text',
            props: { text: page.name || pluralName, variant: 'h1' },
          },
          {
            // IMPORTANT: Use entityId for button ID to match WorkflowEngine triggers
            id: `${entityId}-add-btn`,
            componentId: 'button',
            props: { 
              label: `Add ${entityName}`, 
              variant: 'primary',
              action: 'open_modal',
              modalId: `${entityId}-form-modal`,
            },
          },
        ],
      },
      // Enhanced data table with search, pagination, sorting
      {
        id: `${page.id}-table`,
        componentId: 'dataTable',
        props: {
          source: entityId,
          columns,
          searchable: true,
          searchPlaceholder: `Search ${pluralName.toLowerCase()}...`,
          paginated: true,
          pageSize: 10,
          emptyMessage: `No ${pluralName.toLowerCase()} found.`,
        },
      },
    ];
  }

  /**
   * Materialize a generic page
   */
  private materializeGenericPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    // Convert page components to materialized format
    if (page.components && page.components.length > 0) {
      return page.components.map(c => this.materializeComponent(c, entity));
    }

    // Default content
    return [
      {
        id: 'page-title',
        componentId: 'text',
        props: { text: page.name, variant: 'h1' },
      },
      {
        id: 'page-content',
        componentId: 'text',
        props: { text: 'Page content goes here...', variant: 'body' },
      },
    ];
  }

  /**
   * Materialize a component definition
   */
  private materializeComponent(component: ComponentDef, entity?: EntityDef): MaterializedComponent {
    return {
      id: component.id,
      componentId: this.mapComponentType(component.type),
      props: { ...component.props },
      children: component.children?.map((child: ComponentDef) => this.materializeComponent(child, entity)),
      styles: component.styles,
    };
  }

  /**
   * Map component type to registry ID
   */
  private mapComponentType(type: string): string {
    const typeMap: Record<string, string> = {
      'container': 'container',
      'text': 'text',
      'button': 'button',
      'input': 'input',
      'form': 'form',
      'list': 'list',
      'table': 'table',
      'card': 'card',
      'personCard': 'personCard',
      'itemCard': 'itemCard',
      'calendar': 'calendar',
      'kanban': 'kanban',
      'chat': 'chat',
      'stat-card': 'statsCard',  // FIXED: Map to rich statsCard component
      'field-display': 'text',
      'checkbox': 'input',
      'select': 'input',
      'textarea': 'input',
      'date-input': 'input',
      'datetime-input': 'input',
      'number-input': 'input',
      'email-input': 'input',
      'phone-input': 'input',
      'url-input': 'input',
      'file-upload': 'input',
      'reference-select': 'input',
    };
    return typeMap[type] || type;
  }

  /**
   * Get the appropriate card type for an entity
   * Used to select PersonCard, ItemCard, or generic Card based on entity type
   */
  private getCardTypeForEntity(entity?: EntityDef): 'personCard' | 'itemCard' | 'card' {
    if (!entity) return 'card';
    
    const personKeywords = [
      'customer', 'client', 'member', 'patient', 'contact', 
      'user', 'employee', 'staff', 'student', 'tenant',
      'guest', 'visitor', 'lead', 'prospect', 'homeowner',
      'caregiver', 'recipient', 'owner', 'instructor', 'trainer',
      'technician', 'provider', 'attendee', 'participant'
    ];
    const itemKeywords = [
      'product', 'item', 'order', 'service', 'appointment',
      'booking', 'invoice', 'payment', 'class', 'equipment',
      'property', 'listing', 'task', 'project', 'job', 'ticket',
      'reservation', 'session', 'schedule', 'vehicle', 'unit',
      'lease', 'contract', 'quote', 'estimate', 'material'
    ];
    
    const nameLower = entity.name.toLowerCase();
    
    if (personKeywords.some(k => nameLower.includes(k))) {
      return 'personCard';
    }
    if (itemKeywords.some(k => nameLower.includes(k))) {
      return 'itemCard';
    }
    
    return 'card';
  }

  /**
   * Get card type from a query string and title (for kit template lists)
   * Analyzes the query/title to determine if it's person-type or item-type data
   */
  private getCardTypeFromQuery(query: string, title: string, entity?: EntityDef): 'personCard' | 'itemCard' | 'card' {
    // If we have a matching entity, use its type
    if (entity) {
      return this.getCardTypeForEntity(entity);
    }
    
    // Otherwise, infer from query and title
    const combined = `${query} ${title}`.toLowerCase();
    
    const personKeywords = [
      'member', 'membership', 'customer', 'client', 'patient', 'contact',
      'user', 'employee', 'staff', 'student', 'tenant', 'guest', 'visitor',
      'lead', 'prospect', 'person', 'people', 'homeowner', 'caregiver',
      'recipient', 'owner', 'instructor', 'trainer', 'technician',
      'provider', 'attendee', 'participant'
    ];
    const itemKeywords = [
      'product', 'item', 'order', 'service', 'appointment', 'booking',
      'invoice', 'payment', 'class', 'equipment', 'property', 'listing',
      'task', 'project', 'lease', 'reservation', 'job', 'ticket',
      'session', 'schedule', 'vehicle', 'unit', 'contract', 'quote',
      'estimate', 'material', 'treatment'
    ];
    
    if (personKeywords.some(k => combined.includes(k))) {
      return 'personCard';
    }
    if (itemKeywords.some(k => combined.includes(k))) {
      return 'itemCard';
    }
    
    return 'card';
  }

  /**
   * Get card config for kit template lists
   * Generates sensible defaults based on card type and entity (if available)
   */
  private getCardConfigFromQuery(cardType: 'personCard' | 'itemCard' | 'card', entity?: EntityDef): Record<string, unknown> {
    // If we have an entity, use the existing method
    if (entity) {
      return this.getCardConfig(entity, cardType);
    }
    
    // Otherwise, generate reasonable defaults based on card type
    if (cardType === 'personCard') {
      return {
        type: 'personCard',
        nameField: 'name',
        // ENHANCED: Always include avatar field - data generator adds them
        avatarField: 'avatar',
        subtitleField: 'email',
        fieldMappings: [
          { field: 'email', type: 'email', icon: '✉️' },
          { field: 'phone', type: 'phone', icon: '📞' },
        ],
        statusField: 'status',
        primaryAction: { label: 'View', icon: '👁️' },
        secondaryActions: [
          { label: 'Edit', icon: '✏️' },
        ],
      };
    }
    
    if (cardType === 'itemCard') {
      return {
        type: 'itemCard',
        titleField: 'name',
        // ENHANCED: Always include image field - data generator adds them
        imageField: 'image',
        subtitleField: 'type',
        statusField: 'status',
        priceField: 'price',
        fieldMappings: [
          { field: 'date', label: 'Date' },
          { field: 'amount', label: 'Amount' },
        ],
        actions: [
          { label: 'View', icon: '👁️' },
          { label: 'Edit', icon: '✏️' },
        ],
      };
    }
    
    // Default card config - still include avatar/image for fallback rendering
    return {
      type: 'card',
      titleField: 'name',
      avatarField: 'avatar',
      imageField: 'image',
    };
  }

  /**
   * Infer entity name from query and title (for display purposes)
   */
  private inferEntityNameFromQuery(query: string, title: string): string {
    // Try to extract from title first (e.g., "Expiring Memberships" -> "Membership")
    const titleWords = title.split(/\s+/);
    const lastWord = titleWords[titleWords.length - 1];
    if (lastWord && lastWord.length > 3) {
      // Remove trailing 's' for singular form
      return lastWord.replace(/s$/i, '');
    }
    
    // Try to extract from query (e.g., "memberships WHERE..." -> "Membership")
    const queryMatch = query.match(/^(\w+)/);
    if (queryMatch) {
      const word = queryMatch[1];
      // Capitalize and singularize
      return word.charAt(0).toUpperCase() + word.slice(1).replace(/s$/i, '');
    }
    
    return 'Item';
  }

  /**
   * Get input type for field type
   */
  private getInputType(fieldType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'number': 'number',
      'boolean': 'checkbox',
      'date': 'date',
      'datetime': 'datetime-local',
      'email': 'email',
      'phone': 'tel',
      'url': 'url',
      'currency': 'number',
      'percentage': 'number',
      'richtext': 'textarea',
      'enum': 'select',
      'reference': 'select',
    };
    return typeMap[fieldType] || 'text';
  }

  /**
   * Get icon for page
   */
  private getPageIcon(page: PageDef, entity?: EntityDef): string {
    const typeIcons: Record<string, string> = {
      'dashboard': '📊',
      'list': '📋',
      'form': '📝',
      'detail': '📄',
      'calendar': '📅',
      'kanban': '📌',
      'table': '📊',
      'chart': '📈',
      'chat': '💬',
      'messaging': '💬',
    };
    return entity?.icon || typeIcons[page.type] || '📄';
  }

  /**
   * Materialize navigation structure
   * IMPORTANT: Only show top-level sections in sidebar, NOT form/detail pages
   */
  private materializeNavigation(
    blueprint: AppBlueprint,
    pages: MaterializedPage[]
  ): MaterializedApp['navigation'] {
    // Filter out form and detail pages from sidebar - these should be accessed via buttons/modals
    // Keep: dashboard, list, calendar, kanban, table, settings
    // Hide: form, detail, and any page with -form, -detail, Add X, X Details in the name
    const sidebarPages = pages
      .filter(p => {
        // Must have showInSidebar flag
        if (!p.navigation.showInSidebar) return false;
        
        // Exclude form and detail page types
        if (['form', 'detail'].includes(p.type)) return false;
        
        // Exclude pages with form/detail in ID
        const idLower = p.id.toLowerCase();
        if (idLower.includes('-form') || idLower.includes('-detail')) return false;
        if (idLower.includes('add-') || idLower.endsWith('-add')) return false;
        
        // Exclude pages with "Add X" or "X Details" patterns in name
        const nameLower = p.name.toLowerCase();
        if (nameLower.startsWith('add ') || nameLower.endsWith(' details')) return false;
        if (nameLower.includes('new ') && !nameLower.includes('dashboard')) return false;
        
        return true;
      })
      .sort((a, b) => a.navigation.order - b.navigation.order);

    return {
      sidebar: {
        enabled: blueprint.navigation?.sidebar?.enabled ?? true,
        position: blueprint.navigation?.sidebar?.position ?? 'left',
        collapsible: blueprint.navigation?.sidebar?.collapsible ?? true,
        items: sidebarPages.map(page => ({
          pageId: page.id,
          icon: page.navigation.icon || '📄',
          label: page.navigation.label,
          route: page.route,
        })),
      },
      defaultPage: blueprint.navigation?.defaultPage || pages[0]?.id || 'home',
    };
  }

  /**
   * Materialize theme
   * 
   * IMPORTANT: The ThemeBuilder returns theme.colors.primary, not theme.primaryColor
   * So we need to check both locations for compatibility.
   */
  private materializeTheme(blueprint: AppBlueprint): MaterializedApp['theme'] {
    const customVars = blueprint.theme?.customVars;
    
    // Check both new format (theme.colors.primary) and legacy format (theme.primaryColor)
    const themeColors = (blueprint.theme as any)?.colors;
    const primary = themeColors?.primary || blueprint.theme?.primaryColor || customVars?.['--neo-primary'] || '#8b5cf6';
    const secondary = themeColors?.secondary || blueprint.theme?.secondaryColor || customVars?.['--neo-secondary'] || '#6d28d9';
    const accent = themeColors?.accent || blueprint.theme?.accentColor || customVars?.['--neo-accent'] || '#a78bfa';
    const isDark = blueprint.theme?.mode === 'dark';
    
    // Extract design system identifier from customVars or directly from theme
    const designSystem = customVars?.['--neo-design-system'] || (blueprint.theme as any)?.designSystem;

    // Get typography from theme if available
    const themeTypography = (blueprint.theme as any)?.typography;
    const fontFamily = themeTypography?.fontFamily || blueprint.theme?.fontFamily || customVars?.['--neo-font-sans'] || 'system-ui, -apple-system, sans-serif';
    const headingFamily = themeTypography?.headingFamily || customVars?.['--neo-font-heading'];
    
    // Get spacing scale from theme if available
    const themeSpacing = (blueprint.theme as any)?.spacing;
    const spacingScale = themeSpacing?.scale; // 'compact', 'normal', or 'relaxed'
    
    // Background and surface colors with design system support
    const background = themeColors?.background || (isDark ? '#1a1a2e' : '#ffffff');
    const surface = themeColors?.surface || (isDark ? '#16213e' : '#f8fafc');
    const text = themeColors?.text || (isDark ? '#ffffff' : '#1e293b');
    const textMuted = themeColors?.textMuted || themeColors?.textSecondary || (isDark ? '#94a3b8' : '#64748b');

    return {
      colors: {
        primary,
        secondary,
        accent,
        background,
        surface,
        text,
        textSecondary: textMuted,
        // Semantic colors from design system
        success: themeColors?.success || customVars?.['--neo-success'],
        warning: themeColors?.warning || customVars?.['--neo-warning'],
        error: themeColors?.error || customVars?.['--neo-error'],
        info: themeColors?.info || customVars?.['--neo-info'],
      },
      typography: {
        fontFamily,
        headingFamily,
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '2rem',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        // Include scale information for density-aware components
        scale: spacingScale,
      },
      borderRadius: this.getBorderRadius(themeSpacing?.borderRadius || blueprint.theme?.borderRadius),
      // Surface intent - controls ambient background and visual depth (atmosphere)
      surfaceIntent: blueprint.theme?.surfaceIntent,
      // Design system information
      designSystem,
      // Pass through all custom CSS variables
      customVars,
    };
  }

  /**
   * Get border radius value
   */
  private getBorderRadius(size?: string): string {
    const sizes: Record<string, string> = {
      'none': '0',
      'small': '0.25rem',
      'medium': '0.5rem',
      'large': '1rem',
    };
    return sizes[size || 'medium'] || '0.5rem';
  }

  /**
   * Materialize data models
   */
  private materializeDataModels(entities: EntityDef[]): MaterializedApp['dataModels'] {
    return entities.map(entity => ({
      id: entity.id,
      name: entity.name,
      fields: entity.fields.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: field.required || false,
      })),
    }));
  }

  /**
   * Materialize workflows into flows
   */
  private materializeFlows(workflows: import('./types.js').WorkflowDef[]): MaterializedApp['flows'] {
    return workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled ?? true,
      trigger: {
        type: workflow.trigger.type,
        componentId: workflow.trigger.componentId,
      },
      actions: workflow.actions.map(action => ({
        type: action.type,
        modelId: action.config.entityId as string | undefined,
        model: action.config.entityId as string | undefined,
        config: action.config,
      })),
    }));
  }
}

// Export singleton
export const pageMaterializer = new PageMaterializer();
