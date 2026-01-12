/**
 * Page Builder
 * 
 * Generates complete page definitions for different page types:
 * list, detail, form, calendar, dashboard, gallery, kanban, etc.
 */

import type { UnifiedPage, UnifiedComponent, UnifiedLayout, UnifiedEntity } from './schema.js';
import type { IntelligenceResult, DetectedFeature, SelectedLayout } from '../intelligence/types.js';

// ============================================================
// TYPES
// ============================================================

export interface PageBuildContext {
  entity?: UnifiedEntity;
  entities?: UnifiedEntity[];
  features?: DetectedFeature[];
  layout?: SelectedLayout;
  intelligence?: IntelligenceResult;
  isDefault?: boolean;
  pageIndex?: number;
}

interface PageTemplate {
  type: UnifiedPage['type'];
  generate: (entity: UnifiedEntity, ctx: PageBuildContext) => UnifiedPage;
}

// ============================================================
// PAGE BUILDER
// ============================================================

export class PageBuilder {
  private templates: Map<string, PageTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Generate pages for an entity based on context
   */
  generateForEntity(entity: UnifiedEntity, ctx: PageBuildContext = {}): UnifiedPage[] {
    const pages: UnifiedPage[] = [];
    const features = ctx.features || [];
    
    // Always generate list page
    pages.push(this.buildListPage(entity, ctx));
    
    // Always generate form page
    pages.push(this.buildFormPage(entity, ctx));
    
    // Always generate detail page
    pages.push(this.buildDetailPage(entity, ctx));
    
    // Conditional pages based on features and entity
    if (this.shouldGenerateCalendar(entity, features)) {
      pages.push(this.buildCalendarPage(entity, ctx));
    }
    
    if (this.shouldGenerateKanban(entity, features)) {
      pages.push(this.buildKanbanPage(entity, ctx));
    }
    
    if (this.shouldGenerateGallery(entity, features)) {
      pages.push(this.buildGalleryPage(entity, ctx));
    }
    
    return pages;
  }

  /**
   * Generate a dashboard page for multiple entities
   */
  generateDashboard(entities: UnifiedEntity[], ctx: PageBuildContext = {}): UnifiedPage {
    const statsCards = entities.slice(0, 4).map((entity, i) => this.createStatCard(entity, i));
    const recentLists = entities.slice(0, 2).map(entity => this.createRecentList(entity));
    const quickActions = this.createQuickActions(entities);
    
    const components: UnifiedComponent[] = [
      {
        id: 'dashboard-header',
        type: 'container',
        props: { className: 'dashboard-header' },
        children: [
          { id: 'dashboard-title', type: 'heading', props: { text: 'Dashboard', level: 1 } },
          { id: 'dashboard-subtitle', type: 'text', props: { text: 'Overview of your data', variant: 'muted' } },
        ],
      },
      {
        id: 'stats-grid',
        type: 'grid',
        props: { columns: Math.min(entities.length, 4), gap: 'md' },
        children: statsCards,
      },
      ...quickActions,
      {
        id: 'recent-section',
        type: 'grid',
        props: { columns: 2, gap: 'lg' },
        children: recentLists,
      },
    ];

    // Add chart if analytics feature detected
    if (ctx.features?.some(f => f.id === 'analytics' || f.id === 'reports')) {
      components.push(this.createChartWidget(entities[0]));
    }

    return {
      id: 'dashboard',
      name: 'Dashboard',
      route: '/',
      type: 'dashboard',
      layout: {
        type: 'single_column',
        config: { maxWidth: 'xl', padding: 'lg' },
        sections: [
          { id: 'header', type: 'header', components: ['dashboard-header'] },
          { id: 'stats', type: 'grid', components: ['stats-grid'] },
          { id: 'actions', type: 'row', components: quickActions.map(a => a.id) },
          { id: 'recent', type: 'grid', components: ['recent-section'] },
        ],
      },
      components,
      config: {
        dashboard: {
          refreshInterval: 60000,
          widgets: entities.slice(0, 4).map((e, i) => ({
            id: `widget-${e.id}`,
            type: 'stat' as const,
            title: e.pluralName,
            span: 1,
            config: { entity: e.id, aggregate: 'count' },
          })),
        },
      },
      navigation: { showInSidebar: true, order: 0 },
    };
  }

  /**
   * Generate settings page
   */
  generateSettingsPage(): UnifiedPage {
    return {
      id: 'settings',
      name: 'Settings',
      route: '/settings',
      type: 'settings',
      layout: {
        type: 'sidebar_left',
        config: { sidebarWidth: '200px' },
        sections: [
          { id: 'nav', type: 'sidebar', components: ['settings-nav'] },
          { id: 'content', type: 'main', components: ['settings-content'] },
        ],
      },
      components: [
        {
          id: 'settings-nav',
          type: 'nav-list',
          props: {
            items: [
              { label: 'General', value: 'general', icon: '⚙️' },
              { label: 'Appearance', value: 'appearance', icon: '🎨' },
              { label: 'Notifications', value: 'notifications', icon: '🔔' },
              { label: 'Integrations', value: 'integrations', icon: '🔌' },
              { label: 'Data', value: 'data', icon: '💾' },
            ],
          },
        },
        {
          id: 'settings-content',
          type: 'card',
          props: { title: 'Settings' },
          children: [
            {
              id: 'settings-form',
              type: 'form',
              props: { submitLabel: 'Save Changes' },
              children: [
                { id: 'app-name', type: 'input', props: { label: 'App Name', name: 'appName' } },
                { id: 'timezone', type: 'select', props: { label: 'Timezone', name: 'timezone' } },
                { id: 'date-format', type: 'select', props: { label: 'Date Format', name: 'dateFormat' } },
              ],
            },
          ],
        },
      ],
      navigation: { showInSidebar: true, order: 99, group: 'settings' },
    };
  }

  // ============================================================
  // PAGE TYPE BUILDERS
  // ============================================================

  private buildListPage(entity: UnifiedEntity, ctx: PageBuildContext): UnifiedPage {
    const isDefault = ctx.isDefault ?? false;
    const listFields = entity.display.listFields || [];
    const searchFields = entity.display.searchFields || [];
    
    const components: UnifiedComponent[] = [
      // Header with title and add button
      {
        id: `${entity.id}-list-header`,
        type: 'page-header',
        props: {
          title: entity.pluralName,
          subtitle: entity.description,
        },
        children: [
          {
            id: `${entity.id}-add-btn`,
            type: 'button',
            props: { label: `Add ${entity.name}`, variant: 'primary', icon: '+' },
            events: { onClick: `navigate-${entity.id}-form` },
          },
        ],
      },
      
      // Search and filters
      {
        id: `${entity.id}-toolbar`,
        type: 'toolbar',
        children: [
          {
            id: `${entity.id}-search`,
            type: 'search-input',
            props: {
              placeholder: `Search ${entity.pluralName.toLowerCase()}...`,
              fields: searchFields,
            },
          },
          ...this.createFilterComponents(entity),
        ],
      },
      
      // Data table/list
      {
        id: `${entity.id}-data-table`,
        type: 'data-table',
        props: {
          source: entity.id,
          columns: this.mapFieldsToColumns(entity, listFields),
          showActions: true,
          selectable: true,
        },
        events: {
          onRowClick: `navigate-${entity.id}-detail`,
          onEdit: `navigate-${entity.id}-edit`,
          onDelete: `delete-${entity.id}`,
        },
      },
      
      // Pagination
      {
        id: `${entity.id}-pagination`,
        type: 'pagination',
        props: { pageSize: 20, showPageSizeOptions: true },
      },
    ];

    // Add bulk actions if entity supports it
    if (entity.behaviors?.includes('assignable') || entity.behaviors?.includes('archivable')) {
      components.splice(2, 0, {
        id: `${entity.id}-bulk-actions`,
        type: 'bulk-actions',
        props: {
          actions: [
            ...(entity.behaviors.includes('assignable') ? [{ id: 'assign', label: 'Assign', icon: '👤' }] : []),
            ...(entity.behaviors.includes('archivable') ? [{ id: 'archive', label: 'Archive', icon: '📦' }] : []),
            { id: 'delete', label: 'Delete', icon: '🗑️', variant: 'danger' },
          ],
        },
      });
    }

    return {
      id: `${entity.id}-list`,
      name: entity.pluralName,
      route: isDefault ? '/' : `/${entity.id}s`,
      type: 'list',
      entity: entity.id,
      icon: entity.icon,
      layout: {
        type: 'single_column',
        config: { maxWidth: 'xl', padding: 'md' },
        sections: [
          { id: 'header', type: 'header', components: [`${entity.id}-list-header`] },
          { id: 'toolbar', type: 'row', components: [`${entity.id}-toolbar`] },
          { id: 'main', type: 'main', components: [`${entity.id}-data-table`, `${entity.id}-pagination`] },
        ],
      },
      components,
      config: {
        pagination: { enabled: true, pageSize: 20, showPageSizeOptions: true },
        search: { enabled: true, placeholder: `Search ${entity.pluralName.toLowerCase()}...`, fields: searchFields },
        sorting: { enabled: true, defaultField: listFields[0], defaultDirection: 'desc' },
        filters: entity.display.filterFields?.map(f => ({
          field: f,
          type: 'select' as const,
          label: entity.fields.find(field => field.id === f)?.name,
        })),
      },
      navigation: { showInSidebar: true, order: isDefault ? 0 : (ctx.pageIndex ?? 10) },
    };
  }

  private buildDetailPage(entity: UnifiedEntity, ctx: PageBuildContext): UnifiedPage {
    const displayFields = entity.fields.filter(f => 
      f.id !== 'id' && 
      !f.display?.hidden && 
      f.id !== 'createdAt' && 
      f.id !== 'updatedAt'
    );

    // Group fields by type for better layout
    const primaryFields = displayFields.slice(0, 4);
    const secondaryFields = displayFields.slice(4);

    const components: UnifiedComponent[] = [
      // Header with back button, title, and actions
      {
        id: `${entity.id}-detail-header`,
        type: 'page-header',
        props: { showBack: true },
        bindings: { title: entity.display.titleField },
        children: [
          {
            id: `${entity.id}-edit-btn`,
            type: 'button',
            props: { label: 'Edit', variant: 'secondary', icon: '✏️' },
            events: { onClick: `navigate-${entity.id}-edit` },
          },
          {
            id: `${entity.id}-delete-btn`,
            type: 'button',
            props: { label: 'Delete', variant: 'ghost', icon: '🗑️' },
            events: { onClick: `delete-${entity.id}` },
          },
        ],
      },
      
      // Main info card
      {
        id: `${entity.id}-info-card`,
        type: 'card',
        props: { title: 'Details' },
        children: [
          {
            id: `${entity.id}-field-grid`,
            type: 'field-grid',
            props: { columns: 2 },
            children: primaryFields.map(field => ({
              id: `detail-${field.id}`,
              type: 'field-display',
              props: { 
                label: field.name, 
                field: field.id, 
                type: field.type,
                format: field.display?.format,
              },
            })),
          },
        ],
      },
    ];

    // Add secondary info if present
    if (secondaryFields.length > 0) {
      components.push({
        id: `${entity.id}-additional-card`,
        type: 'card',
        props: { title: 'Additional Information', collapsible: true },
        children: [{
          id: `${entity.id}-additional-grid`,
          type: 'field-grid',
          props: { columns: 2 },
          children: secondaryFields.map(field => ({
            id: `detail-${field.id}`,
            type: 'field-display',
            props: { label: field.name, field: field.id, type: field.type },
          })),
        }],
      });
    }

    // Add related entities section
    const relatedEntities = entity.relationships?.filter(r => 
      r.type === 'one_to_many' || r.type === 'many_to_many'
    ) || [];

    if (relatedEntities.length > 0) {
      components.push({
        id: `${entity.id}-related`,
        type: 'tabs',
        children: relatedEntities.map(rel => ({
          id: `related-${rel.targetEntity}`,
          type: 'tab-panel',
          props: { label: rel.targetEntity },
          children: [{
            id: `related-${rel.targetEntity}-list`,
            type: 'data-table',
            props: {
              source: rel.targetEntity,
              filter: `${rel.foreignKey} = $record.id`,
              compact: true,
            },
          }],
        })),
      });
    }

    // Add comments if entity is commentable
    if (entity.behaviors?.includes('commentable')) {
      components.push({
        id: `${entity.id}-comments`,
        type: 'comments',
        props: { entityId: entity.id },
      });
    }

    // Add activity timeline if auditable
    if (entity.behaviors?.includes('auditable')) {
      components.push({
        id: `${entity.id}-activity`,
        type: 'activity-timeline',
        props: { entityId: entity.id },
      });
    }

    // Metadata footer
    components.push({
      id: `${entity.id}-metadata`,
      type: 'metadata-footer',
      props: { showCreated: true, showUpdated: true },
    });

    return {
      id: `${entity.id}-detail`,
      name: `${entity.name} Details`,
      route: `/${entity.id}s/:id`,
      type: 'detail',
      entity: entity.id,
      layout: {
        type: 'single_column',
        config: { maxWidth: 'lg', padding: 'md' },
        sections: [
          { id: 'header', type: 'header', components: [`${entity.id}-detail-header`] },
          { id: 'main', type: 'main', components: components.slice(1).map(c => c.id) },
        ],
      },
      components,
      navigation: { showInSidebar: false },
      data: { params: ['id'] },
    };
  }

  private buildFormPage(entity: UnifiedEntity, ctx: PageBuildContext): UnifiedPage {
    const editableFields = entity.fields.filter(f => 
      f.id !== 'id' && 
      !f.display?.hidden && 
      !f.display?.readonly &&
      f.id !== 'createdAt' && 
      f.id !== 'updatedAt'
    );

    // Group required fields first
    const requiredFields = editableFields.filter(f => f.required);
    const optionalFields = editableFields.filter(f => !f.required);

    const formFields: UnifiedComponent[] = editableFields.map(field => ({
      id: `field-${field.id}`,
      type: this.getInputTypeForField(field),
      props: {
        name: field.id,
        label: field.name,
        required: field.required,
        placeholder: field.display?.placeholder || `Enter ${field.name.toLowerCase()}`,
        helpText: field.display?.helpText || field.description,
        ...(field.type === 'enum' && field.enumOptions
          ? { options: field.enumOptions.map(o => ({ value: o.value, label: o.label })) }
          : {}),
        ...(field.reference
          ? { source: field.reference.entity, displayField: field.reference.displayField }
          : {}),
        ...(field.validation
          ? { 
              min: field.validation.min, 
              max: field.validation.max, 
              pattern: field.validation.pattern,
            }
          : {}),
      },
    }));

    const components: UnifiedComponent[] = [
      {
        id: `${entity.id}-form-header`,
        type: 'page-header',
        props: {
          showBack: true,
          backLabel: entity.pluralName,
        },
        bindings: {
          title: { 
            create: `Add ${entity.name}`,
            edit: `Edit ${entity.name}`,
          },
        },
      },
      {
        id: `${entity.id}-form`,
        type: 'form',
        props: {
          submitLabel: `Save ${entity.name}`,
          cancelLabel: 'Cancel',
          showReset: true,
        },
        events: {
          onSubmit: `save-${entity.id}`,
          onCancel: `navigate-${entity.id}-list`,
        },
        children: [
          // Required fields section
          ...(requiredFields.length > 0 ? [{
            id: 'required-section',
            type: 'form-section',
            props: { title: 'Required Information' },
            children: formFields.filter(f => 
              requiredFields.some(rf => f.id === `field-${rf.id}`)
            ),
          }] : formFields.filter(f => requiredFields.some(rf => f.id === `field-${rf.id}`))),
          
          // Optional fields section
          ...(optionalFields.length > 0 ? [{
            id: 'optional-section',
            type: 'form-section',
            props: { title: 'Additional Information', collapsible: true },
            children: formFields.filter(f => 
              optionalFields.some(of => f.id === `field-${of.id}`)
            ),
          }] : []),
        ],
      },
    ];

    return {
      id: `${entity.id}-form`,
      name: `Add ${entity.name}`,
      route: `/${entity.id}s/new`,
      type: 'form',
      entity: entity.id,
      layout: {
        type: 'single_column',
        config: { maxWidth: 'md', padding: 'md' },
        sections: [
          { id: 'header', type: 'header', components: [`${entity.id}-form-header`] },
          { id: 'main', type: 'main', components: [`${entity.id}-form`] },
        ],
      },
      components,
      config: {
        form: {
          mode: 'create',
          submitLabel: `Save ${entity.name}`,
          cancelLabel: 'Cancel',
          successRedirect: `/${entity.id}s`,
        },
      },
      navigation: { showInSidebar: false },
    };
  }

  private buildCalendarPage(entity: UnifiedEntity, ctx: PageBuildContext): UnifiedPage {
    const dateField = entity.fields.find(f => 
      f.type === 'date' || f.type === 'datetime'
    );
    const endDateField = entity.fields.find(f => 
      f.id.includes('end') && (f.type === 'date' || f.type === 'datetime')
    );

    return {
      id: `${entity.id}-calendar`,
      name: `${entity.name} Calendar`,
      route: `/${entity.id}s/calendar`,
      type: 'calendar',
      entity: entity.id,
      icon: '📅',
      layout: {
        type: 'single_column',
        config: { maxWidth: 'full', padding: 'md' },
        sections: [
          { id: 'header', type: 'header', components: ['calendar-header'] },
          { id: 'main', type: 'main', components: ['calendar-view'] },
        ],
      },
      components: [
        {
          id: 'calendar-header',
          type: 'page-header',
          props: { title: `${entity.name} Calendar` },
          children: [
            {
              id: 'calendar-add-btn',
              type: 'button',
              props: { label: `Add ${entity.name}`, variant: 'primary' },
              events: { onClick: `navigate-${entity.id}-form` },
            },
          ],
        },
        {
          id: 'calendar-view',
          type: 'calendar',
          props: {
            source: entity.id,
            dateField: dateField?.id || 'date',
            endDateField: endDateField?.id,
            titleField: entity.display.titleField,
            colorField: entity.display.colorField,
            views: ['month', 'week', 'day', 'agenda'],
            defaultView: 'month',
          },
          events: {
            onEventClick: `navigate-${entity.id}-detail`,
            onDateClick: `create-${entity.id}-at-date`,
          },
        },
      ],
      config: {
        calendar: {
          dateField: dateField?.id || 'date',
          endDateField: endDateField?.id,
          titleField: entity.display.titleField,
          colorField: entity.display.colorField,
          views: ['month', 'week', 'day', 'agenda'],
          defaultView: 'month',
        },
      },
      navigation: { showInSidebar: true, order: 50 },
    };
  }

  private buildKanbanPage(entity: UnifiedEntity, ctx: PageBuildContext): UnifiedPage {
    const statusField = entity.fields.find(f => 
      f.type === 'enum' && (f.id === 'status' || f.id === 'stage')
    );

    const columns = statusField?.enumOptions || [
      { value: 'todo', label: 'To Do' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'done', label: 'Done' },
    ];

    return {
      id: `${entity.id}-kanban`,
      name: `${entity.name} Board`,
      route: `/${entity.id}s/board`,
      type: 'kanban',
      entity: entity.id,
      icon: '📋',
      layout: {
        type: 'full_width',
        sections: [
          { id: 'header', type: 'header', components: ['kanban-header'] },
          { id: 'main', type: 'main', components: ['kanban-board'] },
        ],
      },
      components: [
        {
          id: 'kanban-header',
          type: 'page-header',
          props: { title: `${entity.name} Board` },
          children: [
            {
              id: 'kanban-add-btn',
              type: 'button',
              props: { label: `Add ${entity.name}`, variant: 'primary' },
              events: { onClick: `navigate-${entity.id}-form` },
            },
            {
              id: 'kanban-filter-btn',
              type: 'button',
              props: { label: 'Filter', variant: 'ghost', icon: '🔍' },
            },
          ],
        },
        {
          id: 'kanban-board',
          type: 'kanban',
          props: {
            source: entity.id,
            columnField: statusField?.id || 'status',
            columns: columns.map(c => ({
              id: c.value,
              title: c.label,
              color: c.color,
            })),
            titleField: entity.display.titleField,
            subtitleField: entity.display.subtitleField,
            draggable: true,
          },
          events: {
            onCardClick: `navigate-${entity.id}-detail`,
            onCardMove: `update-${entity.id}-status`,
          },
        },
      ],
      config: {
        kanban: {
          columnField: statusField?.id || 'status',
          columns: columns.map(c => ({
            value: c.value,
            label: c.label,
            color: c.color,
          })),
          titleField: entity.display.titleField,
          subtitleField: entity.display.subtitleField,
        },
      },
      navigation: { showInSidebar: true, order: 30 },
    };
  }

  private buildGalleryPage(entity: UnifiedEntity, ctx: PageBuildContext): UnifiedPage {
    const imageField = entity.fields.find(f => f.type === 'image');

    return {
      id: `${entity.id}-gallery`,
      name: `${entity.name} Gallery`,
      route: `/${entity.id}s/gallery`,
      type: 'gallery',
      entity: entity.id,
      icon: '🖼️',
      layout: {
        type: 'single_column',
        config: { maxWidth: 'xl', padding: 'md' },
        sections: [
          { id: 'header', type: 'header', components: ['gallery-header'] },
          { id: 'main', type: 'main', components: ['gallery-grid'] },
        ],
      },
      components: [
        {
          id: 'gallery-header',
          type: 'page-header',
          props: { title: `${entity.name} Gallery` },
          children: [
            {
              id: 'gallery-upload-btn',
              type: 'button',
              props: { label: 'Upload', variant: 'primary', icon: '📤' },
            },
            {
              id: 'gallery-view-toggle',
              type: 'toggle-group',
              props: {
                options: [
                  { value: 'grid', icon: '⊞' },
                  { value: 'list', icon: '☰' },
                ],
                defaultValue: 'grid',
              },
            },
          ],
        },
        {
          id: 'gallery-grid',
          type: 'image-grid',
          props: {
            source: entity.id,
            imageField: imageField?.id || 'image',
            titleField: entity.display.titleField,
            columns: 4,
            gap: 'md',
            aspectRatio: 'square',
          },
          events: {
            onClick: `open-${entity.id}-lightbox`,
          },
        },
      ],
      config: {
        gallery: {
          imageField: imageField?.id || 'image',
          columns: 4,
          gap: 'md',
          aspectRatio: 'square',
        },
      },
      navigation: { showInSidebar: true, order: 40 },
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private shouldGenerateCalendar(entity: UnifiedEntity, features: DetectedFeature[]): boolean {
    const hasDateField = entity.fields.some(f => f.type === 'date' || f.type === 'datetime');
    const hasCalendarFeature = features.some(f => 
      f.id === 'calendar' || f.id === 'scheduling' || f.id === 'appointments'
    );
    const isSchedulable = entity.behaviors?.includes('schedulable') ?? false;
    return hasDateField && (hasCalendarFeature || isSchedulable);
  }

  private shouldGenerateKanban(entity: UnifiedEntity, features: DetectedFeature[]): boolean {
    const hasStatusField = entity.fields.some(f => 
      f.type === 'enum' && (f.id === 'status' || f.id === 'stage')
    );
    const hasKanbanFeature = features.some(f => f.id === 'pipelines' || f.id === 'status_tracking');
    const isTrackable = entity.behaviors?.includes('trackable') ?? false;
    return hasStatusField && (hasKanbanFeature || isTrackable);
  }

  private shouldGenerateGallery(entity: UnifiedEntity, features: DetectedFeature[]): boolean {
    const hasImageField = entity.fields.some(f => f.type === 'image');
    return hasImageField && entity.fields.filter(f => f.type === 'image').length >= 1;
  }

  private getInputTypeForField(field: UnifiedEntity['fields'][0]): string {
    switch (field.type) {
      case 'boolean': return 'checkbox';
      case 'enum': return 'select';
      case 'reference': return 'reference-select';
      case 'richtext': return 'rich-text-editor';
      case 'text': return 'textarea';
      case 'date': return 'date-picker';
      case 'datetime': return 'datetime-picker';
      case 'time': return 'time-picker';
      case 'number': return 'number-input';
      case 'currency': return 'currency-input';
      case 'percentage': return 'percentage-input';
      case 'email': return 'email-input';
      case 'phone': return 'phone-input';
      case 'url': return 'url-input';
      case 'image': return 'image-upload';
      case 'file': return 'file-upload';
      case 'color': return 'color-picker';
      case 'rating': return 'rating-input';
      case 'signature': return 'signature-pad';
      case 'address': return 'address-input';
      case 'geolocation': return 'location-picker';
      default: return 'text-input';
    }
  }

  private mapFieldsToColumns(entity: UnifiedEntity, fieldIds: string[]): unknown[] {
    return fieldIds.map(id => {
      const field = entity.fields.find(f => f.id === id);
      if (!field) return { id, label: id };
      return {
        id: field.id,
        label: field.name,
        type: field.type,
        sortable: true,
        width: field.display?.width,
        format: field.display?.format,
      };
    });
  }

  private createFilterComponents(entity: UnifiedEntity): UnifiedComponent[] {
    const filterFields = entity.display.filterFields || 
      entity.fields.filter(f => f.type === 'enum').slice(0, 3).map(f => f.id);

    return filterFields.map(fieldId => {
      const field = entity.fields.find(f => f.id === fieldId);
      if (!field) return { id: `filter-${fieldId}`, type: 'select', props: {} };

      return {
        id: `filter-${field.id}`,
        type: field.type === 'enum' ? 'select' : 'text-input',
        props: {
          placeholder: `Filter by ${field.name}`,
          options: field.enumOptions?.map(o => ({ value: o.value, label: o.label })),
          clearable: true,
        },
      };
    });
  }

  private createStatCard(entity: UnifiedEntity, index: number): UnifiedComponent {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    return {
      id: `stat-${entity.id}`,
      type: 'stat-card',
      props: {
        title: entity.pluralName,
        icon: entity.icon || '📊',
        color: colors[index % colors.length],
      },
      bindings: { value: `${entity.id}.count` },
    };
  }

  private createRecentList(entity: UnifiedEntity): UnifiedComponent {
    return {
      id: `recent-${entity.id}`,
      type: 'card',
      props: { title: `Recent ${entity.pluralName}` },
      children: [{
        id: `recent-${entity.id}-list`,
        type: 'data-list',
        props: {
          source: entity.id,
          limit: 5,
          compact: true,
          titleField: entity.display.titleField,
          subtitleField: entity.display.subtitleField,
        },
      }],
    };
  }

  private createQuickActions(entities: UnifiedEntity[]): UnifiedComponent[] {
    return [{
      id: 'quick-actions',
      type: 'button-group',
      children: entities.slice(0, 3).map(entity => ({
        id: `quick-add-${entity.id}`,
        type: 'button',
        props: { 
          label: `Add ${entity.name}`, 
          variant: 'outline',
          icon: '+',
        },
        events: { onClick: `navigate-${entity.id}-form` },
      })),
    }];
  }

  private createChartWidget(entity: UnifiedEntity): UnifiedComponent {
    return {
      id: 'analytics-chart',
      type: 'card',
      props: { title: 'Analytics' },
      children: [{
        id: 'analytics-chart-content',
        type: 'line-chart',
        props: {
          source: entity.id,
          xField: 'createdAt',
          yField: 'count',
          groupBy: 'day',
        },
      }],
    };
  }

  private registerDefaultTemplates(): void {
    // Can be extended to register custom page templates
  }
}
