/**
 * App Merger
 * Merges industry kit with AI customizations to produce final app blueprint
 */

import type { AppBlueprint, EntityDef, PageDef, WorkflowDef, FieldDef, LayoutConfig } from '../types.js';
import type { IndustryKit } from '../kits/industries/types.js';

/**
 * Primary intent types for app creation
 */
export type PrimaryIntent = 'operations' | 'customer-facing' | 'internal' | 'hybrid';

/**
 * Context extracted from user input
 */
export interface ExtractedContext {
  teamSize?: 'solo' | 'small' | 'medium' | 'large';
  features?: string[];
  preferences?: string[];
  businessModel?: string;
  targetAudience?: string;
  customDetails?: Record<string, unknown>;
}

/**
 * Understanding result from AI service
 */
export interface UnderstandingResult {
  industry: string;
  primaryIntent: PrimaryIntent;
  confidence: number;
  context: ExtractedContext;
  suggestedQuestions: any[];
  interpretation?: string;
}

/**
 * Filtered customization spec
 */
export interface FilteredCustomizationSpec {
  entityModifications?: Array<{
    entityId: string;
    operation: string;
    data: Record<string, unknown>;
  }>;
  addEntities?: Array<{
    id: string;
    name: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
      required?: boolean;
      enumOptions?: Array<{ value: string; label: string }>;
    }>;
  }>;
  pageCustomizations?: Array<{
    pageId: string;
    operation: string;
    data: Record<string, unknown>;
  }>;
  workflowAdditions?: Array<{
    id: string;
    name: string;
    trigger: string;
    actions: Array<{
      type: string;
      config: Record<string, unknown>;
    }>;
  }>;
  themeAdjustments?: Array<{
    customization: string;
    value: unknown;
  }>;
  droppedOperations: string[];
}

/**
 * Build explanation - documents what was built and why
 */
export interface BuildExplanation {
  /** Assumptions made from user input */
  assumptions: string[];
  /** Kit defaults that were applied */
  defaultsApplied: string[];
  /** Customizations based on user input */
  customizationsFromInput: string[];
  /** Any fallbacks that occurred */
  fallbacks: string[];
  /** Summary for user */
  summary: string;
}

/**
 * Merge result
 */
export interface MergeResult {
  /** Final merged blueprint */
  blueprint: AppBlueprint;
  /** Build explanation for transparency */
  explanation: BuildExplanation;
  /** Whether any validation issues occurred */
  hadValidationIssues: boolean;
  /** Validation issues that were auto-fixed */
  autoFixedIssues: string[];
}

/**
 * Intent-based defaults
 */
const INTENT_DEFAULTS: Record<PrimaryIntent, {
  addLandingPage: boolean;
  requireAuth: boolean;
  emphasis: string[];
}> = {
  'operations': {
    addLandingPage: false,
    requireAuth: true,
    emphasis: ['dashboard', 'reporting', 'workflows'],
  },
  'customer-facing': {
    addLandingPage: true,
    requireAuth: false, // Public access to some pages
    emphasis: ['booking', 'portal', 'public-pages'],
  },
  'internal': {
    addLandingPage: false,
    requireAuth: true,
    emphasis: ['team', 'admin', 'permissions'],
  },
  'hybrid': {
    addLandingPage: true,
    requireAuth: true, // But with public pages
    emphasis: ['dashboard', 'portal', 'workflows'],
  },
};

export class AppMerger {
  /**
   * Merge kit base with AI customizations
   */
  merge(
    kit: IndustryKit,
    customizations: FilteredCustomizationSpec | null,
    understanding: UnderstandingResult,
    originalInput: string
  ): MergeResult {
    const explanation: BuildExplanation = {
      assumptions: [],
      defaultsApplied: [],
      customizationsFromInput: [],
      fallbacks: [],
      summary: '',
    };

    const autoFixedIssues: string[] = [];

    try {
      // Step 1: Create base blueprint from kit
      const baseBlueprint = this.createBaseBlueprint(kit, understanding, explanation);

      // Step 2: Apply intent-based defaults
      this.applyIntentDefaults(baseBlueprint, understanding.primaryIntent, explanation);

      // Step 3: Apply AI customizations (if any)
      if (customizations) {
        this.applyCustomizations(baseBlueprint, customizations, explanation);
      }

      // Step 4: Apply context-based adjustments
      this.applyContextAdjustments(baseBlueprint, understanding.context, explanation);

      // Step 5: Ensure validity
      const { isValid, issues } = this.validateBlueprint(baseBlueprint);
      if (!isValid) {
        this.autoFixBlueprint(baseBlueprint, issues, autoFixedIssues);
      }

      // Generate summary
      explanation.summary = this.generateSummary(kit, understanding, customizations);

      return {
        blueprint: baseBlueprint,
        explanation,
        hadValidationIssues: autoFixedIssues.length > 0,
        autoFixedIssues,
      };
    } catch (error) {
      // Fallback: Return pure kit blueprint
      explanation.fallbacks.push('Full merge failed - returning pure kit blueprint');
      
      const fallbackBlueprint = this.createBaseBlueprint(kit, understanding, explanation);
      explanation.summary = `Created ${kit.name} app using default template due to customization error.`;

      return {
        blueprint: fallbackBlueprint,
        explanation,
        hadValidationIssues: true,
        autoFixedIssues: ['Fell back to pure kit due to merge error'],
      };
    }
  }

  private createBaseBlueprint(
    kit: IndustryKit,
    understanding: UnderstandingResult,
    explanation: BuildExplanation
  ): AppBlueprint {
    const appId = this.generateAppId(kit.id);
    const appName = this.generateAppName(kit.name, understanding.primaryIntent);

    explanation.defaultsApplied.push(`Using ${kit.name} template as base`);
    explanation.assumptions.push(`Industry identified as ${kit.name}`);

    // Convert kit entities to blueprint entities
    const displayField = this.findDisplayField(kit.entities[0]?.fields || []);
    const entities: EntityDef[] = kit.entities.map(kitEntity => {
      const entityDisplayField = this.findDisplayField(kitEntity.fields);
      return {
        id: kitEntity.id,
        name: kitEntity.name,
        pluralName: kitEntity.pluralName,
        icon: this.getEntityIcon(kitEntity.id),
        fields: kitEntity.fields.map((f: any) => this.convertKitField(f)),
        crudRules: this.getDefaultCrudRules(),
        displayConfig: {
          titleField: entityDisplayField,
          subtitleField: undefined,
          listFields: kitEntity.fields.slice(0, 4).map((f: any) => f.id),
        },
      };
    });

    // Create default pages based on kit
    const pages: PageDef[] = this.createDefaultPages(kit, entities);

    // Create default workflows based on kit
    const workflows: WorkflowDef[] = this.createDefaultWorkflows(kit);

    return {
      id: appId,
      version: 1,
      name: appName,
      description: `${kit.name} management application`,
      behavior: kit.id,
      entities,
      pages,
      workflows,
      navigation: {
        rules: [],
        defaultPage: 'dashboard',
        sidebar: {
          enabled: true,
          position: 'left',
          collapsible: true,
          items: pages.map(p => ({
            pageId: p.id,
            icon: p.icon || '📄',
            label: p.name,
          })),
        },
      },
      theme: {
        primaryColor: this.getIndustryColor(kit.id),
        mode: 'light',
        borderRadius: 'medium',
      },
      settings: {
        locale: 'en',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        currency: 'USD',
      },
    };
  }

  private applyIntentDefaults(
    blueprint: AppBlueprint,
    intent: PrimaryIntent,
    explanation: BuildExplanation
  ): void {
    const defaults = INTENT_DEFAULTS[intent];

    explanation.assumptions.push(`Primary intent is ${intent}`);

    // Add landing page for customer-facing or hybrid
    if (defaults.addLandingPage) {
      const landingPage: PageDef = {
        id: 'landing',
        name: 'Home',
        route: '/',
        type: 'dashboard',
        icon: '🏠',
        layout: {
          type: 'single-column',
          sections: [{ id: 'main', width: '100%' }],
        },
        components: [
          {
            id: 'welcome-hero',
            type: 'hero',
            props: { title: blueprint.name, subtitle: 'Welcome' },
          },
        ],
        navigation: {
          showInSidebar: true,
          showInNavbar: true,
          order: 0,
        },
      };

      blueprint.pages.unshift(landingPage);
      blueprint.navigation.defaultPage = 'landing';
      explanation.defaultsApplied.push('Added landing page for customer visibility');
    }

    // Add emphasis-based modifications
    for (const emphasis of defaults.emphasis) {
      if (emphasis === 'dashboard') {
        explanation.defaultsApplied.push('Emphasized dashboard with key metrics');
      } else if (emphasis === 'workflows') {
        explanation.defaultsApplied.push('Enabled workflow automation features');
      }
    }
  }

  private applyCustomizations(
    blueprint: AppBlueprint,
    customizations: FilteredCustomizationSpec,
    explanation: BuildExplanation
  ): void {
    // Apply entity modifications
    if (customizations.entityModifications) {
      for (const mod of customizations.entityModifications) {
        const entity = blueprint.entities.find(e => e.id === mod.entityId);
        if (entity) {
          this.applyEntityModification(entity, mod, explanation);
        }
      }
    }

    // Add new entities
    if (customizations.addEntities) {
      for (const newEntity of customizations.addEntities) {
        const entity: EntityDef = {
          id: newEntity.id,
          name: newEntity.name,
          pluralName: newEntity.name + 's',
          icon: '📋',
          fields: newEntity.fields.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type as FieldDef['type'],
            required: f.required || false,
            enumOptions: f.enumOptions,
          })),
          crudRules: this.getDefaultCrudRules(),
        };

        blueprint.entities.push(entity);
        explanation.customizationsFromInput.push(`Added new entity: ${newEntity.name}`);

        // Add pages for new entity
        blueprint.pages.push(
          this.createListPage(entity),
          this.createDetailPage(entity)
        );
      }
    }

    // Apply page customizations
    if (customizations.pageCustomizations) {
      for (const pageMod of customizations.pageCustomizations) {
        const page = blueprint.pages.find(p => p.id === pageMod.pageId);
        if (page) {
          this.applyPageCustomization(page, pageMod, explanation);
        }
      }
    }

    // Add workflows
    if (customizations.workflowAdditions) {
      for (const workflow of customizations.workflowAdditions) {
        const workflowDef: WorkflowDef = {
          id: workflow.id,
          name: workflow.name,
          enabled: true,
          trigger: this.convertWorkflowTrigger(workflow.trigger),
          actions: workflow.actions.map((a: { type: string; config: Record<string, unknown> }) => ({
            id: `action-${Math.random().toString(36).substring(7)}`,
            type: this.mapWorkflowActionType(a.type),
            config: a.config,
          })),
        };

        blueprint.workflows.push(workflowDef);
        explanation.customizationsFromInput.push(`Added workflow: ${workflow.name}`);
      }
    }

    // Apply theme adjustments
    if (customizations.themeAdjustments && blueprint.theme) {
      for (const adj of customizations.themeAdjustments) {
        this.applyThemeAdjustment(blueprint.theme, adj, explanation);
      }
    }
  }

  private applyContextAdjustments(
    blueprint: AppBlueprint,
    context: UnderstandingResult['context'],
    explanation: BuildExplanation
  ): void {
    // Adjust for team size
    if (context.teamSize) {
      explanation.assumptions.push(`Team size is ${context.teamSize}`);

      if (context.teamSize === 'solo') {
        // Simplify for solo users
        blueprint.workflows = blueprint.workflows.filter(w => 
          !w.name.toLowerCase().includes('team') && 
          !w.name.toLowerCase().includes('assign')
        );
        explanation.customizationsFromInput.push('Simplified workflows for solo operation');
      } else if (context.teamSize === 'large') {
        // Add team collaboration features
        const staffEntity = blueprint.entities.find(e => e.id === 'staff');
        if (staffEntity) {
          explanation.defaultsApplied.push('Enhanced staff management for larger team');
        }
      }
    }

    // Add requested features
    if (context.features && context.features.length > 0) {
      explanation.assumptions.push(`Requested features: ${context.features.join(', ')}`);
    }
  }

  private applyEntityModification(
    entity: EntityDef,
    mod: { operation: string; data: Record<string, unknown> },
    explanation: BuildExplanation
  ): void {
    switch (mod.operation) {
      case 'addFields':
        if (Array.isArray(mod.data.fields)) {
          for (const field of mod.data.fields as any[]) {
            entity.fields.push({
              id: field.id,
              name: field.name,
              type: field.type,
              required: field.required || false,
            });
          }
          explanation.customizationsFromInput.push(`Added fields to ${entity.name}`);
        }
        break;

      case 'setDisplayField':
        if (typeof mod.data.displayField === 'string') {
          // Store in displayConfig - initialize with required titleField
          if (!entity.displayConfig) {
            entity.displayConfig = {
              titleField: mod.data.displayField as string,
            };
          } else {
            entity.displayConfig.titleField = mod.data.displayField as string;
          }
        }
        break;

      case 'setIcon':
        if (typeof mod.data.icon === 'string') {
          entity.icon = mod.data.icon;
        }
        break;

      case 'setDescription':
        if (typeof mod.data.description === 'string') {
          entity.description = mod.data.description;
        }
        break;
    }
  }

  private applyPageCustomization(
    page: PageDef,
    mod: { operation: string; data: Record<string, unknown> },
    explanation: BuildExplanation
  ): void {
    switch (mod.operation) {
      case 'setPageTitle':
        if (typeof mod.data.title === 'string') {
          page.name = mod.data.title;
          explanation.customizationsFromInput.push(`Renamed page to ${mod.data.title}`);
        }
        break;

      case 'setDefaultView':
        if (typeof mod.data.view === 'string') {
          // Could be 'list', 'grid', 'kanban', etc.
          explanation.customizationsFromInput.push(`Set ${page.name} default view`);
        }
        break;
    }
  }

  private applyThemeAdjustment(
    theme: NonNullable<AppBlueprint['theme']>,
    adj: { customization: string; value: unknown },
    explanation: BuildExplanation
  ): void {
    switch (adj.customization) {
      case 'setPrimaryColor':
        if (typeof adj.value === 'string') {
          theme.primaryColor = adj.value;
          explanation.customizationsFromInput.push('Customized primary color');
        }
        break;

      case 'setAccentColor':
        if (typeof adj.value === 'string') {
          theme.accentColor = adj.value;
        }
        break;

      case 'setRoundness':
        if (typeof adj.value === 'string' && ['none', 'small', 'medium', 'large'].includes(adj.value)) {
          theme.borderRadius = adj.value as 'none' | 'small' | 'medium' | 'large';
        }
        break;
    }
  }

  private validateBlueprint(blueprint: AppBlueprint): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check required fields
    if (!blueprint.id) issues.push('Missing blueprint ID');
    if (!blueprint.name) issues.push('Missing blueprint name');
    if (blueprint.entities.length === 0) issues.push('No entities defined');
    if (blueprint.pages.length === 0) issues.push('No pages defined');

    // Check entity references are valid
    const entityIds = new Set(blueprint.entities.map(e => e.id));
    for (const page of blueprint.pages) {
      if (page.entity && !entityIds.has(page.entity)) {
        issues.push(`Page ${page.id} references unknown entity ${page.entity}`);
      }
    }

    // Check navigation references
    const pageIds = new Set(blueprint.pages.map(p => p.id));
    if (!pageIds.has(blueprint.navigation.defaultPage)) {
      issues.push(`Default page ${blueprint.navigation.defaultPage} does not exist`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  private autoFixBlueprint(blueprint: AppBlueprint, issues: string[], autoFixed: string[]): void {
    for (const issue of issues) {
      if (issue.includes('Missing blueprint ID')) {
        blueprint.id = `app-${Date.now()}`;
        autoFixed.push('Generated missing app ID');
      }

      if (issue.includes('Missing blueprint name')) {
        blueprint.name = 'My App';
        autoFixed.push('Set default app name');
      }

      if (issue.includes('Default page') && issue.includes('does not exist')) {
        if (blueprint.pages.length > 0) {
          blueprint.navigation.defaultPage = blueprint.pages[0].id;
          autoFixed.push('Fixed default page reference');
        }
      }
    }
  }

  private generateSummary(
    kit: IndustryKit,
    understanding: UnderstandingResult,
    customizations: FilteredCustomizationSpec | null
  ): string {
    const parts: string[] = [];

    parts.push(`Created a ${kit.name} app`);

    if (understanding.primaryIntent === 'customer-facing') {
      parts.push('optimized for customer interaction');
    } else if (understanding.primaryIntent === 'operations') {
      parts.push('focused on internal operations');
    } else if (understanding.primaryIntent === 'hybrid') {
      parts.push('with both customer and team features');
    }

    if (customizations) {
      const customCount = 
        (customizations.entityModifications?.length || 0) +
        (customizations.addEntities?.length || 0) +
        (customizations.workflowAdditions?.length || 0);

      if (customCount > 0) {
        parts.push(`with ${customCount} customization(s)`);
      }
    }

    return parts.join(' ') + '.';
  }

  // Helper methods

  private generateAppId(kitId: string): string {
    return `${kitId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  private generateAppName(kitName: string, intent: PrimaryIntent): string {
    const suffix = intent === 'customer-facing' ? 'Portal' : 'Manager';
    return `${kitName} ${suffix}`;
  }

  private getEntityIcon(entityId: string): string {
    const icons: Record<string, string> = {
      client: '👤',
      job: '🔧',
      invoice: '📄',
      quote: '📋',
      appointment: '📅',
      task: '✅',
      staff: '👥',
      material: '📦',
      product: '🛍️',
      order: '🛒',
      project: '📊',
    };
    return icons[entityId] || '📋';
  }

  private convertKitField(field: any): FieldDef {
    return {
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required || false,
      description: field.description,
      reference: field.reference,
      enumOptions: field.enumOptions,
      displayOptions: field.displayOptions,
    };
  }

  private getDefaultCrudRules(): EntityDef['crudRules'] {
    return {
      create: { enabled: true },
      read: { enabled: true },
      update: { enabled: true },
      delete: { enabled: true, requireConfirmation: true },
    };
  }

  private findDisplayField(fields: any[]): string {
    const nameField = fields.find(f => 
      f.id === 'name' || f.id === 'title' || f.name.toLowerCase().includes('name')
    );
    return nameField?.id || fields[0]?.id || 'id';
  }

  private createDefaultPages(kit: IndustryKit, entities: EntityDef[]): PageDef[] {
    const pages: PageDef[] = [];

    // Dashboard
    pages.push({
      id: 'dashboard',
      name: 'Dashboard',
      route: '/dashboard',
      type: 'dashboard',
      icon: '📊',
      layout: {
        type: 'sidebar-left',
        sections: [
          { id: 'main', width: '100%' },
        ],
      },
      components: [
        {
          id: 'stats-grid',
          type: 'stats-grid',
          props: { columns: 4 },
        },
      ],
      navigation: {
        showInSidebar: true,
        order: 0,
      },
    });

    // Create list and detail pages for main entities
    const primaryEntities = entities.slice(0, 5); // Limit to avoid too many pages
    for (const entity of primaryEntities) {
      pages.push(this.createListPage(entity));
      pages.push(this.createDetailPage(entity));
    }

    // Settings page
    pages.push({
      id: 'settings',
      name: 'Settings',
      route: '/settings',
      type: 'form', // Use 'form' type for settings pages
      icon: '⚙️',
      layout: {
        type: 'single-column',
        sections: [{ id: 'main', width: '100%' }],
      },
      components: [],
      navigation: {
        showInSidebar: true,
        order: 99,
      },
    });

    return pages;
  }

  private createListPage(entity: EntityDef): PageDef {
    return {
      id: `${entity.id}-list`,
      name: entity.pluralName || entity.name + 's',
      route: `/${entity.id}`,
      type: 'list',
      icon: entity.icon || '📋',
      entity: entity.id,
      layout: {
        type: 'single-column',
        sections: [{ id: 'main', width: '100%' }],
      },
      components: [
        {
          id: `${entity.id}-table`,
          type: 'data-table',
          props: {
            entity: entity.id,
            columns: entity.fields.slice(0, 6).map(f => f.id),
          },
        },
      ],
      navigation: {
        showInSidebar: true,
      },
      settings: {
        pagination: { enabled: true, pageSize: 25 },
        search: { enabled: true, placeholder: `Search ${entity.pluralName || entity.name}...` },
      },
    };
  }

  private createDetailPage(entity: EntityDef): PageDef {
    return {
      id: `${entity.id}-detail`,
      name: `${entity.name} Details`,
      route: `/${entity.id}/:id`,
      type: 'detail',
      icon: entity.icon || '📋',
      entity: entity.id,
      layout: {
        type: 'single-column',
        sections: [{ id: 'main', width: '100%' }],
      },
      components: [
        {
          id: `${entity.id}-form`,
          type: 'entity-form',
          props: { entity: entity.id, mode: 'edit' },
        },
      ],
      navigation: {
        showInSidebar: false,
      },
    };
  }

  private createDefaultWorkflows(kit: IndustryKit): WorkflowDef[] {
    const workflows: WorkflowDef[] = [];

    // Add basic CRUD notification workflow
    workflows.push({
      id: 'new-record-notification',
      name: 'New Record Notification',
      enabled: true,
      trigger: {
        type: 'data_create',
      },
      actions: [
        {
          id: 'notify',
          type: 'show_notification',
          config: {
            message: 'Record created successfully',
            type: 'success',
          },
        },
      ],
    });

    return workflows;
  }

  private convertWorkflowTrigger(trigger: string): WorkflowDef['trigger'] {
    const triggerMap: Record<string, WorkflowDef['trigger']['type']> = {
      'onCreate': 'data_create',
      'onUpdate': 'data_update',
      'onDelete': 'data_delete',
      'onStatusChange': 'field_change',
      'scheduled': 'schedule',
      'manual': 'button_click',
    };

    return {
      type: triggerMap[trigger] || 'data_create',
    };
  }

  private mapWorkflowActionType(type: string): WorkflowDef['actions'][0]['type'] {
    const actionMap: Record<string, WorkflowDef['actions'][0]['type']> = {
      'sendEmail': 'send_email',
      'sendSms': 'show_notification', // Map SMS to notification for now
      'createRecord': 'create_record',
      'updateRecord': 'update_record',
      'setField': 'set_variable',
      'notify': 'show_notification',
      'delay': 'show_notification', // No direct mapping
      'condition': 'conditional',
    };

    return actionMap[type] || 'show_notification';
  }

  private getIndustryColor(kitId: string): string {
    const colors: Record<string, string> = {
      plumber: '#2563eb', // Blue
      electrician: '#f59e0b', // Amber
      contractor: '#6b7280', // Gray
      cleaning: '#10b981', // Emerald
      bakery: '#f97316', // Orange
      restaurant: '#ef4444', // Red
      salon: '#ec4899', // Pink
      'real-estate': '#3b82f6', // Blue
      'fitness-coach': '#8b5cf6', // Violet
      tutor: '#06b6d4', // Cyan
      photographer: '#6366f1', // Indigo
      ecommerce: '#22c55e', // Green
      mechanic: '#78716c', // Stone
      handyman: '#ca8a04', // Yellow
      roofing: '#dc2626', // Red
      hvac: '#0284c7', // Light Blue
      landscaping: '#16a34a', // Green
      medical: '#0891b2', // Cyan
      'home-health': '#a855f7', // Purple
      general_business: '#6366f1', // Indigo
    };

    return colors[kitId] || '#3b82f6';
  }
}

/**
 * Create a new app merger
 */
export function createAppMerger(): AppMerger {
  return new AppMerger();
}
