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

// ============================================================
// MATERIALIZED PAGE TYPES
// ============================================================

export interface MaterializedComponent {
  id: string;
  componentId: string; // Maps to ComponentRegistry
  props: Record<string, unknown>;
  children?: MaterializedComponent[];
  styles?: Record<string, unknown>;
}

export interface MaterializedPage {
  id: string;
  name: string;
  route: string;
  type: string;
  entityId?: string;
  
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
    };
    typography: Record<string, unknown>;
    spacing: Record<string, string>;
    borderRadius: string;
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
// PAGE MATERIALIZER
// ============================================================

export class PageMaterializer {
  /**
   * Materialize a complete blueprint into a renderable app structure
   */
  materialize(blueprint: AppBlueprint): MaterializedApp {
    const pages = blueprint.pages.map(page => 
      this.materializePage(page, blueprint.entities, blueprint)
    );

    return {
      id: blueprint.id,
      name: blueprint.name,
      description: blueprint.description,
      pages,
      navigation: this.materializeNavigation(blueprint, pages),
      theme: this.materializeTheme(blueprint),
      dataModels: this.materializeDataModels(blueprint.entities),
      flows: this.materializeFlows(blueprint.workflows),
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
    const entity = page.entity ? entities.find(e => e.id === page.entity) : undefined;
    
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
   */
  private materializeListPage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityName = entity?.name || 'Item';
    const pluralName = entity?.pluralName || 'Items';
    const entityId = entity?.id || 'item';
    const listFields = entity?.displayConfig?.listFields || ['name'];

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
            id: `${page.id}-add-btn`,
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
      // Search bar
      {
        id: `${page.id}-search`,
        componentId: 'input',
        props: {
          name: 'search',
          label: '',
          placeholder: `Search ${pluralName.toLowerCase()}...`,
          type: 'search',
        },
      },
      // Data list
      {
        id: `${page.id}-list`,
        componentId: 'list',
        props: {
          source: entityId,
          columns: listFields,
          showActions: true,
          emptyMessage: `No ${pluralName.toLowerCase()} yet. Click "Add ${entityName}" to create one.`,
        },
      },
    ];
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
            id: `${page.id}-back-btn`,
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
      // Form
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
                id: `${page.id}-edit-btn`,
                componentId: 'button',
                props: { label: 'Edit', variant: 'secondary' },
              },
              {
                id: `${page.id}-delete-btn`,
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
   * Materialize a dashboard page
   */
  private materializeDashboardPage(page: PageDef, entities: EntityDef[]): MaterializedComponent[] {
    const components: MaterializedComponent[] = [
      // Dashboard title
      {
        id: 'dashboard-title',
        componentId: 'text',
        props: { text: 'Dashboard', variant: 'h1' },
      },
    ];

    // Stats cards for each entity
    const statsContainer: MaterializedComponent = {
      id: 'stats-container',
      componentId: 'container',
      props: { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8' },
      children: entities.slice(0, 4).map((entity, i) => ({
        id: `stat-${entity.id}`,
        componentId: 'card',
        props: {
          title: entity.pluralName,
          icon: entity.icon || ['📊', '📈', '📉', '📋'][i % 4],
          variant: 'stat',
        },
        children: [
          {
            id: `stat-${entity.id}-count`,
            componentId: 'text',
            props: { 
              text: '0', 
              variant: 'stat-value',
              dataSource: entity.id,
              dataField: 'count',
            },
          },
        ],
      })),
    };
    components.push(statsContainer);

    // Recent items for first 2 entities
    const recentContainer: MaterializedComponent = {
      id: 'recent-container',
      componentId: 'container',
      props: { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
      children: entities.slice(0, 2).map(entity => ({
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
            },
          },
        ],
      })),
    };
    components.push(recentContainer);

    return components;
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
   * Materialize a table page
   */
  private materializeTablePage(page: PageDef, entity?: EntityDef): MaterializedComponent[] {
    const entityId = entity?.id || 'item';
    const columns = entity?.displayConfig?.listFields || entity?.fields.map(f => f.id) || [];

    return [
      {
        id: `${page.id}-header`,
        componentId: 'text',
        props: { text: page.name, variant: 'h1' },
      },
      {
        id: `${page.id}-table`,
        componentId: 'table',
        props: {
          source: entityId,
          columns,
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
      'calendar': 'calendar',
      'kanban': 'kanban',
      'stat-card': 'card',
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
    };
    return entity?.icon || typeIcons[page.type] || '📄';
  }

  /**
   * Materialize navigation structure
   */
  private materializeNavigation(
    blueprint: AppBlueprint,
    pages: MaterializedPage[]
  ): MaterializedApp['navigation'] {
    const sidebarPages = pages
      .filter(p => p.navigation.showInSidebar)
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
   */
  private materializeTheme(blueprint: AppBlueprint): MaterializedApp['theme'] {
    const primary = blueprint.theme?.primaryColor || '#8b5cf6';
    const secondary = blueprint.theme?.secondaryColor || '#6d28d9';
    const accent = blueprint.theme?.accentColor || '#a78bfa';
    const isDark = blueprint.theme?.mode === 'dark';

    return {
      colors: {
        primary,
        secondary,
        accent,
        background: isDark ? '#1a1a2e' : '#ffffff',
        surface: isDark ? '#16213e' : '#f8fafc',
        text: isDark ? '#ffffff' : '#1e293b',
        textSecondary: isDark ? '#94a3b8' : '#64748b',
      },
      typography: {
        fontFamily: blueprint.theme?.fontFamily || 'system-ui, -apple-system, sans-serif',
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
      },
      borderRadius: this.getBorderRadius(blueprint.theme?.borderRadius),
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
