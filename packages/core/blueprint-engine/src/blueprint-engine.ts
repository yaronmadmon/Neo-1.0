/**
 * Blueprint Engine
 * Takes processed intent (kit + behavior + extracted details) and produces
 * a complete AppBlueprint object that becomes the single source of truth
 */

import { randomUUID } from 'node:crypto';
import type {
  AppBlueprint,
  EntityDef,
  PageDef,
  WorkflowDef,
  ComponentDef,
  LayoutConfig,
  ProcessedIntent,
  FieldDef,
} from './types.js';
import {
  BEHAVIOR_BUNDLES,
  detectBehavior,
  getBehaviorBundle,
  type BehaviorBundle,
} from './behavior-bundles.js';

// ============================================================
// BLUEPRINT ENGINE
// ============================================================

export class BlueprintEngine {
  /**
   * Generate a complete AppBlueprint from processed intent
   */
  async generateBlueprint(intent: ProcessedIntent): Promise<AppBlueprint> {
    // Step 1: Detect or use provided behavior
    const behavior = this.resolveBehavior(intent);
    const bundle = behavior ? (getBehaviorBundle(behavior) ?? null) : null;

    // Step 2: Generate entities
    const entities = this.generateEntities(intent, bundle);

    // Step 3: Generate pages for each entity
    const pages = this.generatePages(entities, intent, bundle);

    // Step 4: Generate workflows
    const workflows = this.generateWorkflows(entities, pages, intent, bundle);

    // Step 5: Generate navigation
    const navigation = this.generateNavigation(pages, entities);

    // Step 6: Determine theme
    const theme = this.generateTheme(intent, bundle);

    // Step 7: Build the complete blueprint
    const blueprint: AppBlueprint = {
      id: randomUUID(),
      version: 1,
      name: this.generateAppName(intent),
      description: this.generateAppDescription(intent),
      behavior: behavior || undefined,
      entities,
      pages,
      workflows,
      navigation,
      theme,
      settings: {
        locale: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        currency: 'USD',
      },
    };

    // Step 8: Validate and harden (no undefined states)
    return this.hardenBlueprint(blueprint);
  }

  /**
   * Resolve which behavior/kit to use
   */
  private resolveBehavior(intent: ProcessedIntent): string | null {
    // Use explicitly provided behavior
    if (intent.behavior) {
      return intent.behavior;
    }

    // Detect from input
    const detected = detectBehavior(intent.rawInput);
    if (detected && detected.confidence >= 0.3) {
      return detected.behaviorId;
    }

    return null;
  }

  /**
   * Generate entities based on intent and bundle
   */
  private generateEntities(intent: ProcessedIntent, bundle: BehaviorBundle | null): EntityDef[] {
    const entities: EntityDef[] = [];

    // If bundle exists, use its entities as base
    if (bundle) {
      entities.push(...bundle.entities);
    }

    // Add extracted entities from intent
    if (intent.extractedDetails?.entities) {
      for (const extracted of intent.extractedDetails.entities) {
        // Check if entity already exists
        const exists = entities.find(
          e => e.name.toLowerCase() === extracted.name.toLowerCase()
        );

        if (!exists) {
          const newEntity = this.createEntityFromExtracted(extracted);
          entities.push(newEntity);
        } else if (extracted.fields) {
          // Merge fields into existing entity
          this.mergeEntityFields(exists, extracted.fields);
        }
      }
    }

    // If no entities, create a default one
    if (entities.length === 0) {
      entities.push(this.createDefaultEntity(intent));
    }

    return entities;
  }

  /**
   * Create an entity from extracted info
   */
  private createEntityFromExtracted(extracted: { name: string; fields?: Array<{ name: string; type?: string }> }): EntityDef {
    const entityId = this.toKebabCase(extracted.name);
    const fields: FieldDef[] = [
      {
        id: 'id',
        name: 'ID',
        type: 'string',
        required: true,
        unique: true,
        displayOptions: { hidden: true },
      },
    ];

    // Add extracted fields
    if (extracted.fields) {
      for (const field of extracted.fields) {
        fields.push({
          id: this.toCamelCase(field.name),
          name: field.name,
          type: this.inferFieldType(field.type, field.name),
          required: false,
        });
      }
    } else {
      // Add default name field
      fields.push({
        id: 'name',
        name: 'Name',
        type: 'string',
        required: true,
      });
    }

    // Add timestamps
    fields.push(
      { id: 'createdAt', name: 'Created At', type: 'datetime', required: false },
      { id: 'updatedAt', name: 'Updated At', type: 'datetime', required: false }
    );

    return {
      id: entityId,
      name: this.toTitleCase(extracted.name),
      pluralName: this.pluralize(this.toTitleCase(extracted.name)),
      fields,
      displayConfig: {
        titleField: fields.find(f => f.id === 'name' || f.id === 'title')?.id || fields[1]?.id || 'id',
        listFields: fields.filter(f => !f.displayOptions?.hidden).slice(0, 5).map(f => f.id),
        searchFields: fields.filter(f => f.type === 'string' && !f.displayOptions?.hidden).map(f => f.id),
      },
    };
  }

  /**
   * Create a default entity when nothing is detected
   */
  private createDefaultEntity(intent: ProcessedIntent): EntityDef {
    const appName = this.extractMainNoun(intent.rawInput) || 'Item';
    
    return {
      id: this.toKebabCase(appName),
      name: this.toTitleCase(appName),
      pluralName: this.pluralize(this.toTitleCase(appName)),
      fields: [
        { id: 'id', name: 'ID', type: 'string', required: true, unique: true, displayOptions: { hidden: true } },
        { id: 'name', name: 'Name', type: 'string', required: true },
        { id: 'description', name: 'Description', type: 'string', required: false },
        { id: 'status', name: 'Status', type: 'enum', required: false, enumOptions: [
          { value: 'active', label: 'Active', color: '#34d399' },
          { value: 'inactive', label: 'Inactive', color: '#9ca3af' },
        ], defaultValue: 'active' },
        { id: 'createdAt', name: 'Created At', type: 'datetime', required: false },
        { id: 'updatedAt', name: 'Updated At', type: 'datetime', required: false },
      ],
      displayConfig: {
        titleField: 'name',
        listFields: ['name', 'description', 'status'],
        searchFields: ['name', 'description'],
      },
    };
  }

  /**
   * Merge fields into existing entity
   */
  private mergeEntityFields(entity: EntityDef, newFields: Array<{ name: string; type?: string }>): void {
    for (const field of newFields) {
      const fieldId = this.toCamelCase(field.name);
      if (!entity.fields.find(f => f.id === fieldId)) {
        entity.fields.push({
          id: fieldId,
          name: field.name,
          type: this.inferFieldType(field.type, field.name),
          required: false,
        });
      }
    }
  }

  /**
   * Generate pages for entities
   */
  private generatePages(entities: EntityDef[], intent: ProcessedIntent, bundle: BehaviorBundle | null): PageDef[] {
    if (bundle?.pages && bundle.pages.length > 0) {
      return bundle.pages;
    }

    const pages: PageDef[] = [];

    // Generate standard pages for each entity
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      
      // List page
      pages.push(this.createListPage(entity, i === 0));
      
      // Form page (create/edit)
      pages.push(this.createFormPage(entity));
      
      // Detail page
      pages.push(this.createDetailPage(entity));
    }

    // Add dashboard if multiple entities or if it makes sense
    if (entities.length > 1 || bundle?.id === 'crm' || bundle?.id === 'fitness') {
      pages.unshift(this.createDashboardPage(entities));
    }

    // Check for specific page types from intent
    if (intent.extractedDetails?.pages) {
      for (const extractedPage of intent.extractedDetails.pages) {
        // Find if we need to add this page type
        const pageType = this.inferPageType(extractedPage.type || extractedPage.name);
        if (pageType === 'calendar') {
          pages.push(this.createCalendarPage(entities));
        } else if (pageType === 'kanban') {
          pages.push(this.createKanbanPage(entities[0]));
        }
      }
    }

    if (!pages.find(page => page.id === 'settings')) {
      pages.push(this.createSettingsPage());
    }

    return pages;
  }

  /**
   * Create a settings page
   */
  private createSettingsPage(): PageDef {
    return {
      id: 'settings',
      name: 'Settings',
      route: '/settings',
      type: 'custom',
      layout: this.createStandardLayout(['header', 'settings']),
      components: [
        {
          id: 'settings-title',
          type: 'text',
          props: { text: 'Settings', variant: 'h1' },
        },
        {
          id: 'settings-card',
          type: 'card',
          props: { title: 'App Settings', value: 'Manage preferences, notifications, and defaults.' },
        },
      ],
      navigation: {
        showInSidebar: true,
        order: 99,
      },
    };
  }

  /**
   * Create a list page for an entity
   */
  private createListPage(entity: EntityDef, isDefault: boolean): PageDef {
    const components: ComponentDef[] = [
      {
        id: `${entity.id}-header`,
        type: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: `${entity.id}-title`,
            type: 'text',
            props: { text: entity.pluralName, variant: 'h1' },
          },
          {
            id: `${entity.id}-add-btn`,
            type: 'button',
            props: { label: `Add ${entity.name}`, variant: 'primary' },
            events: { onClick: `navigate-${entity.id}-form` },
          },
        ],
      },
      {
        id: `${entity.id}-search`,
        type: 'input',
        props: {
          name: 'search',
          placeholder: `Search ${entity.pluralName.toLowerCase()}...`,
          type: 'search',
        },
      },
      {
        id: `${entity.id}-list`,
        type: 'list',
        props: {
          source: entity.id,
          showActions: true,
          columns: entity.displayConfig?.listFields || ['name'],
        },
      },
    ];

    return {
      id: `${entity.id}-list`,
      name: entity.pluralName,
      route: isDefault ? '/' : `/${entity.id}s`,
      type: 'list',
      entity: entity.id,
      layout: this.createStandardLayout(['header', 'search', 'list']),
      components,
      navigation: {
        showInSidebar: true,
        order: isDefault ? 0 : 10,
      },
      settings: {
        pagination: { enabled: true, pageSize: 20 },
        search: { enabled: true, placeholder: `Search ${entity.pluralName.toLowerCase()}...` },
      },
    };
  }

  /**
   * Create a form page for an entity
   */
  private createFormPage(entity: EntityDef): PageDef {
    const formFields: ComponentDef[] = entity.fields
      .filter(f => f.id !== 'id' && f.id !== 'createdAt' && f.id !== 'updatedAt' && !f.displayOptions?.hidden)
      .map(field => ({
        id: `field-${field.id}`,
        type: this.getInputTypeForField(field),
        props: {
          name: field.id,
          label: field.name,
          required: field.required,
          placeholder: field.displayOptions?.placeholder || `Enter ${field.name.toLowerCase()}`,
          ...(field.type === 'enum' && field.enumOptions
            ? { options: field.enumOptions.map(o => ({ value: o.value, label: o.label })) }
            : {}),
          ...(field.type === 'reference' && field.reference
            ? { source: field.reference.targetEntity, displayField: field.reference.displayField }
            : {}),
        },
      }));

    const components: ComponentDef[] = [
      {
        id: `${entity.id}-form-header`,
        type: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: `${entity.id}-form-title`,
            type: 'text',
            props: { text: `Add ${entity.name}`, variant: 'h1' },
          },
          {
            id: `${entity.id}-back-btn`,
            type: 'button',
            props: { label: 'Back', variant: 'ghost' },
            events: { onClick: `navigate-${entity.id}-list` },
          },
        ],
      },
      {
        id: `${entity.id}-form`,
        type: 'form',
        props: { submitLabel: `Save ${entity.name}` },
        children: formFields,
        events: { onSubmit: `create-${entity.id}` },
      },
    ];

    return {
      id: `${entity.id}-form`,
      name: `Add ${entity.name}`,
      route: `/${entity.id}s/new`,
      type: 'form',
      entity: entity.id,
      layout: this.createStandardLayout(['header', 'form']),
      components,
      navigation: { showInSidebar: false },
    };
  }

  /**
   * Create a detail page for an entity
   */
  private createDetailPage(entity: EntityDef): PageDef {
    const components: ComponentDef[] = [
      {
        id: `${entity.id}-detail-header`,
        type: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: `${entity.id}-detail-title`,
            type: 'text',
            props: { text: entity.name },
            bindings: { text: entity.displayConfig?.titleField || 'name' },
          },
          {
            id: `${entity.id}-detail-actions`,
            type: 'container',
            props: { className: 'flex gap-2' },
            children: [
              {
                id: `${entity.id}-edit-btn`,
                type: 'button',
                props: { label: 'Edit', variant: 'secondary' },
                events: { onClick: `navigate-${entity.id}-edit` },
              },
              {
                id: `${entity.id}-delete-btn`,
                type: 'button',
                props: { label: 'Delete', variant: 'danger' },
                events: { onClick: `delete-${entity.id}` },
              },
            ],
          },
        ],
      },
      {
        id: `${entity.id}-detail-card`,
        type: 'card',
        props: { source: entity.id },
        children: entity.fields
          .filter(f => f.id !== 'id' && !f.displayOptions?.hidden)
          .map(field => ({
            id: `detail-${field.id}`,
            type: 'field-display',
            props: { label: field.name, field: field.id, type: field.type },
          })),
      },
    ];

    return {
      id: `${entity.id}-detail`,
      name: `${entity.name} Details`,
      route: `/${entity.id}s/:id`,
      type: 'detail',
      entity: entity.id,
      layout: this.createStandardLayout(['header', 'card']),
      components,
      navigation: { showInSidebar: false },
    };
  }

  /**
   * Create a dashboard page
   */
  private createDashboardPage(entities: EntityDef[]): PageDef {
    const statsCards: ComponentDef[] = entities.slice(0, 4).map((entity, i) => ({
      id: `stat-${entity.id}`,
      type: 'stat-card',
      props: {
        title: entity.pluralName,
        value: `{${entity.id}.count}`,
        icon: entity.icon || '📊',
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'][i % 4],
      },
    }));

    const recentLists: ComponentDef[] = entities.slice(0, 2).map(entity => ({
      id: `recent-${entity.id}`,
      type: 'card',
      props: { title: `Recent ${entity.pluralName}` },
      children: [
        {
          id: `recent-${entity.id}-list`,
          type: 'list',
          props: {
            source: entity.id,
            limit: 5,
            compact: true,
          },
        },
      ],
    }));

    return {
      id: 'dashboard',
      name: 'Dashboard',
      route: '/',
      type: 'dashboard',
      layout: {
        type: 'dashboard-grid',
        sections: [
          { id: 'header', type: 'header', components: ['dashboard-title'] },
          { id: 'stats', type: 'grid', components: statsCards.map(c => c.id) },
          { id: 'recent', type: 'row', components: recentLists.map(c => c.id) },
        ],
      },
      components: [
        {
          id: 'dashboard-title',
          type: 'text',
          props: { text: 'Dashboard', variant: 'h1' },
        },
        ...statsCards,
        ...recentLists,
      ],
      navigation: {
        showInSidebar: true,
        order: 0,
      },
    };
  }

  /**
   * Create a calendar page
   */
  private createCalendarPage(entities: EntityDef[]): PageDef {
    // Find entity with date field
    const dateEntity = entities.find(e => 
      e.fields.some(f => f.type === 'date' || f.type === 'datetime')
    ) || entities[0];

    return {
      id: 'calendar',
      name: 'Calendar',
      route: '/calendar',
      type: 'calendar',
      entity: dateEntity?.id,
      layout: this.createStandardLayout(['calendar']),
      components: [
        {
          id: 'calendar-title',
          type: 'text',
          props: { text: 'Calendar', variant: 'h1' },
        },
        {
          id: 'calendar-view',
          type: 'calendar',
          props: {
            source: dateEntity?.id,
            dateField: dateEntity?.fields.find(f => f.type === 'date' || f.type === 'datetime')?.id || 'date',
            titleField: dateEntity?.displayConfig?.titleField || 'name',
          },
        },
      ],
      navigation: {
        showInSidebar: true,
        order: 50,
      },
    };
  }

  /**
   * Create a kanban board page
   */
  private createKanbanPage(entity: EntityDef): PageDef {
    // Find status/stage field
    const statusField = entity.fields.find(f => 
      f.type === 'enum' && (f.id === 'status' || f.id === 'stage')
    );

    return {
      id: `${entity.id}-kanban`,
      name: `${entity.name} Board`,
      route: `/${entity.id}s/board`,
      type: 'kanban',
      entity: entity.id,
      layout: this.createStandardLayout(['kanban']),
      components: [
        {
          id: 'kanban-title',
          type: 'text',
          props: { text: `${entity.name} Board`, variant: 'h1' },
        },
        {
          id: 'kanban-board',
          type: 'kanban',
          props: {
            source: entity.id,
            columnField: statusField?.id || 'status',
            columns: statusField?.enumOptions?.map(o => ({
              id: o.value,
              title: o.label,
              color: o.color,
            })) || [],
            titleField: entity.displayConfig?.titleField || 'name',
          },
        },
      ],
      navigation: {
        showInSidebar: true,
        order: 20,
      },
    };
  }

  /**
   * Generate workflows for CRUD and navigation
   */
  private generateWorkflows(entities: EntityDef[], pages: PageDef[], intent: ProcessedIntent, bundle: BehaviorBundle | null): WorkflowDef[] {
    const workflows: WorkflowDef[] = [];

    for (const entity of entities) {
      // Create workflow
      workflows.push({
        id: `create-${entity.id}`,
        name: `Create ${entity.name}`,
        enabled: true,
        trigger: {
          type: 'form_submit',
          componentId: `${entity.id}-form`,
        },
        actions: [
          {
            id: 'create',
            type: 'create_record',
            config: { entityId: entity.id, source: 'form_data' },
          },
          {
            id: 'notify',
            type: 'show_notification',
            config: { message: `${entity.name} created successfully!`, type: 'success' },
          },
          {
            id: 'navigate',
            type: 'navigate',
            config: { pageId: `${entity.id}-list` },
          },
        ],
      });

      // Update workflow
      workflows.push({
        id: `update-${entity.id}`,
        name: `Update ${entity.name}`,
        enabled: true,
        trigger: {
          type: 'form_submit',
          componentId: `${entity.id}-edit-form`,
        },
        actions: [
          {
            id: 'update',
            type: 'update_record',
            config: { entityId: entity.id, source: 'form_data' },
          },
          {
            id: 'notify',
            type: 'show_notification',
            config: { message: `${entity.name} updated successfully!`, type: 'success' },
          },
          {
            id: 'navigate',
            type: 'navigate',
            config: { pageId: `${entity.id}-detail` },
          },
        ],
      });

      // Delete workflow
      workflows.push({
        id: `delete-${entity.id}`,
        name: `Delete ${entity.name}`,
        enabled: true,
        trigger: {
          type: 'button_click',
          componentId: `${entity.id}-delete-btn`,
        },
        actions: [
          {
            id: 'confirm',
            type: 'conditional',
            config: {},
            condition: 'confirm("Are you sure you want to delete this?")',
            thenActions: [
              {
                id: 'delete',
                type: 'delete_record',
                config: { entityId: entity.id },
              },
              {
                id: 'notify',
                type: 'show_notification',
                config: { message: `${entity.name} deleted.`, type: 'info' },
              },
              {
                id: 'navigate',
                type: 'navigate',
                config: { pageId: `${entity.id}-list` },
              },
            ],
          },
        ],
      });

      // Navigation workflows
      workflows.push({
        id: `navigate-${entity.id}-list`,
        name: `Go to ${entity.pluralName}`,
        enabled: true,
        trigger: { type: 'button_click', componentId: `${entity.id}-back-btn` },
        actions: [
          { id: 'nav', type: 'navigate', config: { pageId: `${entity.id}-list` } },
        ],
      });

      workflows.push({
        id: `navigate-${entity.id}-form`,
        name: `Add ${entity.name}`,
        enabled: true,
        trigger: { type: 'button_click', componentId: `${entity.id}-add-btn` },
        actions: [
          { id: 'nav', type: 'navigate', config: { pageId: `${entity.id}-form` } },
        ],
      });
    }

    return workflows;
  }

  /**
   * Generate navigation structure
   */
  private generateNavigation(pages: PageDef[], entities: EntityDef[]): AppBlueprint['navigation'] {
    const sidebarItems = pages
      .filter(p => p.navigation?.showInSidebar)
      .sort((a, b) => (a.navigation?.order || 0) - (b.navigation?.order || 0))
      .map(page => ({
        pageId: page.id,
        icon: this.getIconForPage(page, entities),
        label: page.name,
      }));

    return {
      rules: pages.flatMap(page => [
        {
          id: `nav-${page.id}`,
          from: '*',
          to: page.id,
          trigger: 'link' as const,
        },
      ]),
      defaultPage: pages.find(p => p.route === '/')?.id || pages[0].id,
      sidebar: {
        enabled: true,
        position: 'left',
        collapsible: true,
        items: sidebarItems,
      },
    };
  }

  /**
   * Generate theme based on intent and bundle
   */
  private generateTheme(intent: ProcessedIntent, bundle: BehaviorBundle | null): AppBlueprint['theme'] {
    if (bundle?.theme) {
      return {
        primaryColor: bundle.theme.primaryColor,
        secondaryColor: bundle.theme.secondaryColor,
        accentColor: bundle.theme.accentColor,
        mode: 'light',
        borderRadius: 'medium',
      };
    }

    // Default theme based on category
    const category = intent.extractedDetails?.category?.toLowerCase() || 'personal';
    const themes: Record<string, AppBlueprint['theme']> = {
      business: { primaryColor: '#2563eb', secondaryColor: '#1e40af', mode: 'light', borderRadius: 'medium' },
      personal: { primaryColor: '#8b5cf6', secondaryColor: '#7c3aed', mode: 'light', borderRadius: 'medium' },
      health: { primaryColor: '#ec4899', secondaryColor: '#db2777', mode: 'light', borderRadius: 'medium' },
      home: { primaryColor: '#10b981', secondaryColor: '#059669', mode: 'light', borderRadius: 'medium' },
    };

    return themes[category] || themes.personal;
  }

  /**
   * Generate app name from intent
   */
  private generateAppName(intent: ProcessedIntent): string {
    if (intent.extractedDetails?.appName) {
      return intent.extractedDetails.appName;
    }

    // Extract from raw input
    const input = intent.rawInput.toLowerCase();
    const cleaned = input
      .replace(/^(build|create|make|design|develop)\s+(me\s+)?(an?\s+)?/i, '')
      .replace(/\s+(app|application|system|tool)$/i, '')
      .trim();

    if (cleaned.length > 0) {
      return this.toTitleCase(cleaned) + ' App';
    }

    return 'My App';
  }

  /**
   * Generate app description
   */
  private generateAppDescription(intent: ProcessedIntent): string {
    return `An app to help you manage ${intent.rawInput.toLowerCase().replace(/^(build|create|make)\s+/i, '')}`;
  }

  /**
   * Harden the blueprint to ensure no undefined states
   */
  private hardenBlueprint(blueprint: AppBlueprint): AppBlueprint {
    // Ensure at least one page exists
    if (blueprint.pages.length === 0) {
      blueprint.pages.push(this.createFallbackPage());
    }

    // Ensure all pages have components
    for (const page of blueprint.pages) {
      if (!page.components || page.components.length === 0) {
        page.components = [
          {
            id: 'fallback-content',
            type: 'text',
            props: { text: page.name, variant: 'h1' },
          },
          {
            id: 'fallback-message',
            type: 'text',
            props: { text: 'Content coming soon...', variant: 'body' },
          },
        ];
      }

      // Ensure layout exists
      if (!page.layout) {
        page.layout = this.createStandardLayout(['main']);
      }

      // Ensure navigation exists
      if (!page.navigation) {
        page.navigation = { showInSidebar: true };
      }
    }

    // Ensure navigation is complete
    if (!blueprint.navigation.defaultPage) {
      blueprint.navigation.defaultPage = blueprint.pages[0].id;
    }

    if (!blueprint.navigation.sidebar) {
      blueprint.navigation.sidebar = {
        enabled: true,
        position: 'left',
        collapsible: true,
        items: blueprint.pages
          .filter(p => p.navigation?.showInSidebar)
          .map(p => ({ pageId: p.id, label: p.name })),
      };
    }

    // Ensure theme exists
    if (!blueprint.theme) {
      blueprint.theme = {
        primaryColor: '#8b5cf6',
        mode: 'light',
        borderRadius: 'medium',
      };
    }

    return blueprint;
  }

  /**
   * Create a fallback page
   */
  private createFallbackPage(): PageDef {
    return {
      id: 'home',
      name: 'Home',
      route: '/',
      type: 'custom',
      layout: this.createStandardLayout(['main']),
      components: [
        {
          id: 'welcome',
          type: 'text',
          props: { text: 'Welcome to Your App', variant: 'h1' },
        },
        {
          id: 'description',
          type: 'text',
          props: { text: 'Get started by adding your first item.', variant: 'body' },
        },
      ],
      navigation: { showInSidebar: true, order: 0 },
    };
  }

  /**
   * Create a standard layout
   */
  private createStandardLayout(sections: string[]): LayoutConfig {
    return {
      type: 'single-column',
      sections: sections.map(s => ({
        id: s,
        type: s as 'header' | 'main',
        components: [],
      })),
      responsive: {
        mobile: 'stack',
      },
    };
  }

  /**
   * Get input type for a field
   */
  private getInputTypeForField(field: FieldDef): string {
    switch (field.type) {
      case 'boolean': return 'checkbox';
      case 'enum': return 'select';
      case 'reference': return 'reference-select';
      case 'richtext': return 'textarea';
      case 'date': return 'date-input';
      case 'datetime': return 'datetime-input';
      case 'number':
      case 'currency':
      case 'percentage': return 'number-input';
      case 'email': return 'email-input';
      case 'phone': return 'phone-input';
      case 'url': return 'url-input';
      case 'image':
      case 'file': return 'file-upload';
      default: return 'input';
    }
  }

  /**
   * Infer field type from name or type hint
   */
  private inferFieldType(typeHint: string | undefined, fieldName: string): FieldDef['type'] {
    if (typeHint) {
      const lower = typeHint.toLowerCase();
      if (lower.includes('number') || lower.includes('int') || lower.includes('amount') || lower.includes('count') || lower.includes('quantity')) return 'number';
      if (lower.includes('date') && lower.includes('time')) return 'datetime';
      if (lower.includes('date')) return 'date';
      if (lower.includes('bool') || lower.includes('flag') || lower.includes('check')) return 'boolean';
      if (lower.includes('email')) return 'email';
      if (lower.includes('phone') || lower.includes('tel')) return 'phone';
      if (lower.includes('url') || lower.includes('link') || lower.includes('website')) return 'url';
      if (lower.includes('image') || lower.includes('photo') || lower.includes('picture')) return 'image';
      if (lower.includes('file') || lower.includes('attachment') || lower.includes('document')) return 'file';
      if (lower.includes('money') || lower.includes('price') || lower.includes('cost') || lower.includes('currency')) return 'currency';
      if (lower.includes('percent')) return 'percentage';
      if (lower.includes('rich') || lower.includes('html') || lower.includes('content')) return 'richtext';
    }

    // Infer from field name
    const lower = fieldName.toLowerCase();
    if (lower.includes('email')) return 'email';
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) return 'phone';
    if (lower.includes('url') || lower.includes('website') || lower.includes('link')) return 'url';
    if (lower.includes('date') && (lower.includes('time') || lower.includes('at'))) return 'datetime';
    if (lower.includes('date') || lower.includes('birthday') || lower.includes('due') || lower.includes('deadline')) return 'date';
    if (lower.includes('price') || lower.includes('cost') || lower.includes('amount') || lower.includes('total') || lower.includes('fee')) return 'currency';
    if (lower.includes('count') || lower.includes('quantity') || lower.includes('number') || lower.includes('age') || lower.includes('size')) return 'number';
    if (lower.includes('image') || lower.includes('photo') || lower.includes('picture') || lower.includes('avatar') || lower.includes('logo')) return 'image';
    if (lower.includes('completed') || lower.includes('active') || lower.includes('enabled') || lower.includes('done') || lower.includes('checked')) return 'boolean';
    if (lower.includes('description') || lower.includes('notes') || lower.includes('content') || lower.includes('body')) return 'richtext';

    return 'string';
  }

  /**
   * Infer page type
   */
  private inferPageType(hint: string): string {
    const lower = hint.toLowerCase();
    if (lower.includes('calendar')) return 'calendar';
    if (lower.includes('kanban') || lower.includes('board')) return 'kanban';
    if (lower.includes('table')) return 'table';
    if (lower.includes('dashboard') || lower.includes('home') || lower.includes('overview')) return 'dashboard';
    if (lower.includes('form') || lower.includes('add') || lower.includes('create') || lower.includes('edit')) return 'form';
    if (lower.includes('detail') || lower.includes('view')) return 'detail';
    if (lower.includes('chart') || lower.includes('analytics') || lower.includes('report')) return 'chart';
    if (lower.includes('map')) return 'map';
    if (lower.includes('timeline')) return 'timeline';
    return 'list';
  }

  /**
   * Get icon for a page
   */
  private getIconForPage(page: PageDef, entities: EntityDef[]): string {
    if (page.type === 'dashboard') return '📊';
    if (page.type === 'calendar') return '📅';
    if (page.type === 'kanban') return '📋';
    if (page.type === 'form') return '📝';
    if (page.type === 'chart') return '📈';
    
    const entity = entities.find(e => e.id === page.entity);
    if (entity?.icon) return entity.icon;
    
    return '📄';
  }

  /**
   * Extract main noun from input
   */
  private extractMainNoun(input: string): string | null {
    const cleaned = input
      .toLowerCase()
      .replace(/^(build|create|make|design|develop)\s+(me\s+)?(an?\s+)?/i, '')
      .replace(/\s+(app|application|system|tool|manager|tracker)$/i, '')
      .trim();

    const words = cleaned.split(/\s+/);
    return words[0] || null;
  }

  // Helper methods
  private toKebabCase(str: string): string {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  private toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^./, c => c.toLowerCase());
  }

  private toTitleCase(str: string): string {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  private pluralize(str: string): string {
    if (str.endsWith('y')) return str.slice(0, -1) + 'ies';
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) return str + 'es';
    return str + 's';
  }
}

// Export singleton
export const blueprintEngine = new BlueprintEngine();
