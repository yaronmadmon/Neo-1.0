/**
 * Error Hardener
 * Ensures no undefined states, missing pages, null workflows, or blank previews
 * Validates and repairs blueprints to guarantee a valid app structure
 */

import type {
  AppBlueprint,
  EntityDef,
  PageDef,
  WorkflowDef,
  FieldDef,
  ComponentDef,
  LayoutConfig,
} from './types.js';
import { randomUUID } from 'node:crypto';

// ============================================================
// VALIDATION RESULT TYPES
// ============================================================

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  path: string;
  message: string;
  autoFixed: boolean;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  fixedBlueprint: AppBlueprint;
}

// ============================================================
// DEFAULT VALUES
// ============================================================

const DEFAULTS = {
  entity: {
    name: 'Item',
    pluralName: 'Items',
    fields: [
      { id: 'id', name: 'ID', type: 'string' as const, required: true, unique: true },
      { id: 'name', name: 'Name', type: 'string' as const, required: true },
      { id: 'createdAt', name: 'Created At', type: 'datetime' as const, required: false },
      { id: 'updatedAt', name: 'Updated At', type: 'datetime' as const, required: false },
    ] as FieldDef[],
  },
  page: {
    name: 'Home',
    route: '/',
    type: 'list' as const,
    layout: {
      type: 'single-column' as const,
      sections: [
        { id: 'header', type: 'header' as const, components: [] },
        { id: 'main', type: 'main' as const, components: [] },
      ],
    },
  },
  component: {
    id: 'placeholder',
    type: 'text',
    props: { text: 'Content', variant: 'body' },
  },
  theme: {
    primaryColor: '#8b5cf6',
    mode: 'light' as const,
    borderRadius: 'medium' as const,
  },
  navigation: {
    defaultPage: 'home',
    sidebar: {
      enabled: true,
      position: 'left' as const,
      collapsible: true,
      items: [] as Array<{ pageId: string; label: string; icon?: string }>,
    },
  },
};

// ============================================================
// ERROR HARDENER
// ============================================================

export class ErrorHardener {
  /**
   * Validate and fix a blueprint
   */
  validate(blueprint: AppBlueprint): ValidationResult {
    const issues: ValidationIssue[] = [];
    let fixedBlueprint = this.deepClone(blueprint);

    // Step 1: Ensure basic structure
    fixedBlueprint = this.ensureBasicStructure(fixedBlueprint, issues);

    // Step 2: Validate and fix entities
    fixedBlueprint = this.validateEntities(fixedBlueprint, issues);

    // Step 3: Validate and fix pages
    fixedBlueprint = this.validatePages(fixedBlueprint, issues);

    // Step 4: Validate and fix workflows
    fixedBlueprint = this.validateWorkflows(fixedBlueprint, issues);

    // Step 5: Validate and fix navigation
    fixedBlueprint = this.validateNavigation(fixedBlueprint, issues);

    // Step 6: Validate and fix theme
    fixedBlueprint = this.validateTheme(fixedBlueprint, issues);

    // Step 7: Cross-reference validation
    fixedBlueprint = this.validateCrossReferences(fixedBlueprint, issues);

    // Step 8: Ensure no blank preview
    fixedBlueprint = this.ensureRenderableContent(fixedBlueprint, issues);

    const valid = !issues.some(i => i.severity === 'error' && !i.autoFixed);

    return {
      valid,
      issues,
      fixedBlueprint,
    };
  }

  /**
   * Ensure basic blueprint structure exists
   */
  private ensureBasicStructure(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    // Ensure ID
    if (!blueprint.id) {
      blueprint.id = randomUUID();
      issues.push({
        severity: 'warning',
        path: 'id',
        message: 'Missing blueprint ID, generated new one',
        autoFixed: true,
      });
    }

    // Ensure name
    if (!blueprint.name || blueprint.name.trim() === '') {
      blueprint.name = 'My App';
      issues.push({
        severity: 'warning',
        path: 'name',
        message: 'Missing app name, set default',
        autoFixed: true,
      });
    }

    // Ensure version
    if (!blueprint.version || blueprint.version < 1) {
      blueprint.version = 1;
      issues.push({
        severity: 'info',
        path: 'version',
        message: 'Invalid version, set to 1',
        autoFixed: true,
      });
    }

    // Ensure arrays exist
    if (!Array.isArray(blueprint.entities)) {
      blueprint.entities = [];
      issues.push({
        severity: 'warning',
        path: 'entities',
        message: 'Missing entities array, initialized empty',
        autoFixed: true,
      });
    }

    if (!Array.isArray(blueprint.pages)) {
      blueprint.pages = [];
      issues.push({
        severity: 'warning',
        path: 'pages',
        message: 'Missing pages array, initialized empty',
        autoFixed: true,
      });
    }

    if (!Array.isArray(blueprint.workflows)) {
      blueprint.workflows = [];
      issues.push({
        severity: 'warning',
        path: 'workflows',
        message: 'Missing workflows array, initialized empty',
        autoFixed: true,
      });
    }

    // Ensure navigation exists
    if (!blueprint.navigation) {
      blueprint.navigation = {
        rules: [],
        defaultPage: '',
        sidebar: DEFAULTS.navigation.sidebar,
      };
      issues.push({
        severity: 'warning',
        path: 'navigation',
        message: 'Missing navigation, set defaults',
        autoFixed: true,
      });
    }

    return blueprint;
  }

  /**
   * Validate and fix entities
   */
  private validateEntities(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    // Ensure at least one entity exists
    if (blueprint.entities.length === 0) {
      const defaultEntity: EntityDef = {
        id: 'item',
        name: DEFAULTS.entity.name,
        pluralName: DEFAULTS.entity.pluralName,
        fields: DEFAULTS.entity.fields,
        displayConfig: {
          titleField: 'name',
          listFields: ['name'],
          searchFields: ['name'],
        },
      };
      blueprint.entities.push(defaultEntity);
      issues.push({
        severity: 'warning',
        path: 'entities',
        message: 'No entities defined, added default Item entity',
        autoFixed: true,
      });
    }

    // Validate each entity
    for (let i = 0; i < blueprint.entities.length; i++) {
      const entity = blueprint.entities[i];
      const path = `entities[${i}]`;

      // Ensure ID
      if (!entity.id) {
        entity.id = `entity-${i}`;
        issues.push({
          severity: 'warning',
          path: `${path}.id`,
          message: 'Missing entity ID, generated one',
          autoFixed: true,
        });
      }

      // Ensure name
      if (!entity.name) {
        entity.name = `Entity ${i + 1}`;
        issues.push({
          severity: 'warning',
          path: `${path}.name`,
          message: 'Missing entity name, generated one',
          autoFixed: true,
        });
      }

      // Ensure plural name
      if (!entity.pluralName) {
        entity.pluralName = entity.name + 's';
        issues.push({
          severity: 'info',
          path: `${path}.pluralName`,
          message: 'Missing plural name, derived from name',
          autoFixed: true,
        });
      }

      // Ensure fields array
      if (!Array.isArray(entity.fields) || entity.fields.length === 0) {
        entity.fields = [...DEFAULTS.entity.fields];
        issues.push({
          severity: 'warning',
          path: `${path}.fields`,
          message: 'Missing or empty fields, added defaults',
          autoFixed: true,
        });
      }

      // Ensure ID field exists
      if (!entity.fields.find(f => f.id === 'id')) {
        entity.fields.unshift({
          id: 'id',
          name: 'ID',
          type: 'string',
          required: true,
          unique: true,
        });
        issues.push({
          severity: 'warning',
          path: `${path}.fields`,
          message: 'Missing ID field, added',
          autoFixed: true,
        });
      }

      // Validate each field
      for (let j = 0; j < entity.fields.length; j++) {
        const field = entity.fields[j];
        const fieldPath = `${path}.fields[${j}]`;

        if (!field.id) {
          field.id = `field-${j}`;
          issues.push({
            severity: 'warning',
            path: `${fieldPath}.id`,
            message: 'Missing field ID, generated one',
            autoFixed: true,
          });
        }

        if (!field.name) {
          field.name = field.id;
          issues.push({
            severity: 'info',
            path: `${fieldPath}.name`,
            message: 'Missing field name, used ID',
            autoFixed: true,
          });
        }

        if (!field.type) {
          field.type = 'string';
          issues.push({
            severity: 'warning',
            path: `${fieldPath}.type`,
            message: 'Missing field type, defaulted to string',
            autoFixed: true,
          });
        }

        // Validate reference fields
        if (field.type === 'reference' && !field.reference) {
          field.reference = {
            targetEntity: blueprint.entities[0]?.id || 'item',
            displayField: 'name',
            relationship: 'many-to-many',
          };
          issues.push({
            severity: 'warning',
            path: `${fieldPath}.reference`,
            message: 'Reference field missing reference config, added default',
            autoFixed: true,
          });
        }

        // Validate enum fields
        if (field.type === 'enum' && (!field.enumOptions || field.enumOptions.length === 0)) {
          field.enumOptions = [
            { value: 'option1', label: 'Option 1', color: '#60a5fa' },
            { value: 'option2', label: 'Option 2', color: '#34d399' },
          ];
          issues.push({
            severity: 'warning',
            path: `${fieldPath}.enumOptions`,
            message: 'Enum field missing options, added defaults',
            autoFixed: true,
          });
        }
      }

      // Ensure display config
      if (!entity.displayConfig) {
        entity.displayConfig = {
          titleField: entity.fields.find(f => f.id !== 'id')?.id || 'id',
          listFields: entity.fields.slice(0, 4).map(f => f.id),
          searchFields: entity.fields.filter(f => f.type === 'string').map(f => f.id),
        };
        issues.push({
          severity: 'info',
          path: `${path}.displayConfig`,
          message: 'Missing display config, generated from fields',
          autoFixed: true,
        });
      }
    }

    return blueprint;
  }

  /**
   * Validate and fix pages
   */
  private validatePages(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    // Ensure at least one page exists
    if (blueprint.pages.length === 0) {
      const entity = blueprint.entities[0];
      const defaultPage: PageDef = {
        id: 'home',
        name: entity ? entity.pluralName : 'Home',
        route: '/',
        type: 'list',
        entity: entity?.id,
        layout: DEFAULTS.page.layout,
        components: this.generateDefaultComponents(entity),
        navigation: { showInSidebar: true, order: 0 },
      };
      blueprint.pages.push(defaultPage);
      issues.push({
        severity: 'warning',
        path: 'pages',
        message: 'No pages defined, added default home page',
        autoFixed: true,
      });
    }

    // Validate each page
    for (let i = 0; i < blueprint.pages.length; i++) {
      const page = blueprint.pages[i];
      const path = `pages[${i}]`;

      // Ensure ID
      if (!page.id) {
        page.id = `page-${i}`;
        issues.push({
          severity: 'warning',
          path: `${path}.id`,
          message: 'Missing page ID, generated one',
          autoFixed: true,
        });
      }

      // Ensure name
      if (!page.name) {
        page.name = `Page ${i + 1}`;
        issues.push({
          severity: 'warning',
          path: `${path}.name`,
          message: 'Missing page name, generated one',
          autoFixed: true,
        });
      }

      // Ensure route
      if (!page.route) {
        page.route = i === 0 ? '/' : `/${page.id}`;
        issues.push({
          severity: 'warning',
          path: `${path}.route`,
          message: 'Missing page route, generated one',
          autoFixed: true,
        });
      }

      // Ensure type
      if (!page.type) {
        page.type = 'list';
        issues.push({
          severity: 'warning',
          path: `${path}.type`,
          message: 'Missing page type, defaulted to list',
          autoFixed: true,
        });
      }

      // Ensure layout
      if (!page.layout) {
        page.layout = DEFAULTS.page.layout;
        issues.push({
          severity: 'warning',
          path: `${path}.layout`,
          message: 'Missing page layout, set default',
          autoFixed: true,
        });
      }

      // Ensure components
      if (!Array.isArray(page.components) || page.components.length === 0) {
        const entity = page.entity ? blueprint.entities.find(e => e.id === page.entity) : undefined;
        page.components = this.generateDefaultComponents(entity, page);
        issues.push({
          severity: 'warning',
          path: `${path}.components`,
          message: 'Missing or empty components, generated defaults',
          autoFixed: true,
        });
      }

      // Validate each component
      this.validateComponents(page.components, `${path}.components`, issues);

      // Ensure navigation
      if (!page.navigation) {
        page.navigation = { showInSidebar: true, order: i };
        issues.push({
          severity: 'info',
          path: `${path}.navigation`,
          message: 'Missing page navigation, set defaults',
          autoFixed: true,
        });
      }
    }

    // Ensure at least one page has route '/'
    if (!blueprint.pages.find(p => p.route === '/')) {
      blueprint.pages[0].route = '/';
      issues.push({
        severity: 'warning',
        path: 'pages[0].route',
        message: 'No home page (route "/"), set first page as home',
        autoFixed: true,
      });
    }

    return blueprint;
  }

  /**
   * Validate components recursively
   */
  private validateComponents(components: ComponentDef[], path: string, issues: ValidationIssue[]): void {
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const componentPath = `${path}[${i}]`;

      // Ensure ID
      if (!component.id) {
        component.id = `component-${Date.now()}-${i}`;
        issues.push({
          severity: 'warning',
          path: `${componentPath}.id`,
          message: 'Missing component ID, generated one',
          autoFixed: true,
        });
      }

      // Ensure type
      if (!component.type) {
        component.type = 'text';
        issues.push({
          severity: 'warning',
          path: `${componentPath}.type`,
          message: 'Missing component type, defaulted to text',
          autoFixed: true,
        });
      }

      // Ensure props
      if (!component.props) {
        component.props = {};
        issues.push({
          severity: 'info',
          path: `${componentPath}.props`,
          message: 'Missing component props, initialized empty',
          autoFixed: true,
        });
      }

      // Validate children recursively
      if (component.children && component.children.length > 0) {
        this.validateComponents(component.children, `${componentPath}.children`, issues);
      }
    }
  }

  /**
   * Validate and fix workflows
   */
  private validateWorkflows(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    // Generate CRUD workflows if none exist
    if (blueprint.workflows.length === 0) {
      for (const entity of blueprint.entities) {
        const crudWorkflows = this.generateCrudWorkflows(entity);
        blueprint.workflows.push(...crudWorkflows);
      }
      issues.push({
        severity: 'info',
        path: 'workflows',
        message: 'No workflows defined, generated CRUD workflows',
        autoFixed: true,
      });
    }

    // Validate each workflow
    for (let i = 0; i < blueprint.workflows.length; i++) {
      const workflow = blueprint.workflows[i];
      const path = `workflows[${i}]`;

      // Ensure ID
      if (!workflow.id) {
        workflow.id = `workflow-${i}`;
        issues.push({
          severity: 'warning',
          path: `${path}.id`,
          message: 'Missing workflow ID, generated one',
          autoFixed: true,
        });
      }

      // Ensure name
      if (!workflow.name) {
        workflow.name = `Workflow ${i + 1}`;
        issues.push({
          severity: 'warning',
          path: `${path}.name`,
          message: 'Missing workflow name, generated one',
          autoFixed: true,
        });
      }

      // Ensure enabled is set
      if (workflow.enabled === undefined) {
        workflow.enabled = true;
        issues.push({
          severity: 'info',
          path: `${path}.enabled`,
          message: 'Missing enabled flag, set to true',
          autoFixed: true,
        });
      }

      // Ensure trigger exists
      if (!workflow.trigger) {
        workflow.trigger = { type: 'button_click' };
        issues.push({
          severity: 'warning',
          path: `${path}.trigger`,
          message: 'Missing workflow trigger, added default',
          autoFixed: true,
        });
      }

      // Ensure actions exist
      if (!Array.isArray(workflow.actions) || workflow.actions.length === 0) {
        workflow.actions = [
          {
            id: 'default-action',
            type: 'show_notification',
            config: { message: 'Action executed', type: 'info' },
          },
        ];
        issues.push({
          severity: 'warning',
          path: `${path}.actions`,
          message: 'Missing or empty actions, added default',
          autoFixed: true,
        });
      }

      // Validate actions
      for (let j = 0; j < workflow.actions.length; j++) {
        const action = workflow.actions[j];
        if (!action.id) {
          action.id = `action-${j}`;
          issues.push({
            severity: 'info',
            path: `${path}.actions[${j}].id`,
            message: 'Missing action ID, generated one',
            autoFixed: true,
          });
        }
        if (!action.type) {
          action.type = 'show_notification';
          issues.push({
            severity: 'warning',
            path: `${path}.actions[${j}].type`,
            message: 'Missing action type, defaulted to notification',
            autoFixed: true,
          });
        }
        if (!action.config) {
          action.config = {};
          issues.push({
            severity: 'info',
            path: `${path}.actions[${j}].config`,
            message: 'Missing action config, initialized empty',
            autoFixed: true,
          });
        }
      }
    }

    return blueprint;
  }

  /**
   * Validate and fix navigation
   */
  private validateNavigation(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    // Ensure rules array
    if (!Array.isArray(blueprint.navigation.rules)) {
      blueprint.navigation.rules = [];
      issues.push({
        severity: 'info',
        path: 'navigation.rules',
        message: 'Missing navigation rules, initialized empty',
        autoFixed: true,
      });
    }

    // Ensure default page
    if (!blueprint.navigation.defaultPage || !blueprint.pages.find(p => p.id === blueprint.navigation.defaultPage)) {
      blueprint.navigation.defaultPage = blueprint.pages.find(p => p.route === '/')?.id || blueprint.pages[0]?.id || 'home';
      issues.push({
        severity: 'warning',
        path: 'navigation.defaultPage',
        message: 'Invalid or missing default page, set to first page',
        autoFixed: true,
      });
    }

    // Ensure sidebar
    if (!blueprint.navigation.sidebar) {
      blueprint.navigation.sidebar = {
        enabled: true,
        position: 'left',
        collapsible: true,
        items: [],
      };
      issues.push({
        severity: 'warning',
        path: 'navigation.sidebar',
        message: 'Missing sidebar config, set defaults',
        autoFixed: true,
      });
    }

    // Generate sidebar items from pages
    if (!blueprint.navigation.sidebar.items || blueprint.navigation.sidebar.items.length === 0) {
      blueprint.navigation.sidebar.items = blueprint.pages
        .filter(p => p.navigation?.showInSidebar !== false)
        .sort((a, b) => (a.navigation?.order || 0) - (b.navigation?.order || 0))
        .map(p => ({
          pageId: p.id,
          label: p.name,
          icon: this.getPageIcon(p.type),
        }));
      issues.push({
        severity: 'info',
        path: 'navigation.sidebar.items',
        message: 'Empty sidebar items, generated from pages',
        autoFixed: true,
      });
    }

    return blueprint;
  }

  /**
   * Validate and fix theme
   */
  private validateTheme(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    if (!blueprint.theme) {
      blueprint.theme = DEFAULTS.theme;
      issues.push({
        severity: 'warning',
        path: 'theme',
        message: 'Missing theme, set defaults',
        autoFixed: true,
      });
      return blueprint;
    }

    // Ensure primary color
    if (!blueprint.theme.primaryColor) {
      blueprint.theme.primaryColor = DEFAULTS.theme.primaryColor;
      issues.push({
        severity: 'warning',
        path: 'theme.primaryColor',
        message: 'Missing primary color, set default',
        autoFixed: true,
      });
    }

    // Ensure mode
    if (!blueprint.theme.mode) {
      blueprint.theme.mode = 'light';
      issues.push({
        severity: 'info',
        path: 'theme.mode',
        message: 'Missing theme mode, set to light',
        autoFixed: true,
      });
    }

    // Ensure border radius
    if (!blueprint.theme.borderRadius) {
      blueprint.theme.borderRadius = 'medium';
      issues.push({
        severity: 'info',
        path: 'theme.borderRadius',
        message: 'Missing border radius, set to medium',
        autoFixed: true,
      });
    }

    return blueprint;
  }

  /**
   * Validate cross-references between entities, pages, workflows
   */
  private validateCrossReferences(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    const entityIds = new Set(blueprint.entities.map(e => e.id));

    // Validate page entity references
    for (const page of blueprint.pages) {
      if (page.entity && !entityIds.has(page.entity)) {
        page.entity = undefined;
        issues.push({
          severity: 'warning',
          path: `pages.${page.id}.entity`,
          message: `Page references non-existent entity, removed`,
          autoFixed: true,
        });
      }
    }

    // Validate field references
    for (const entity of blueprint.entities) {
      for (const field of entity.fields) {
        if (field.type === 'reference' && field.reference) {
          if (!entityIds.has(field.reference.targetEntity)) {
            // Change to string type if target doesn't exist
            field.type = 'string';
            delete field.reference;
            issues.push({
              severity: 'warning',
              path: `entities.${entity.id}.fields.${field.id}`,
              message: `Reference to non-existent entity, changed to string`,
              autoFixed: true,
            });
          }
        }
      }
    }

    return blueprint;
  }

  /**
   * Ensure the blueprint will render valid content (no blank preview)
   */
  private ensureRenderableContent(blueprint: AppBlueprint, issues: ValidationIssue[]): AppBlueprint {
    for (const page of blueprint.pages) {
      // Check if page has visible content
      const hasVisibleContent = page.components.some(c => 
        c.type === 'text' || c.type === 'list' || c.type === 'form' || 
        c.type === 'table' || c.type === 'card' || c.type === 'button' ||
        (c.children && c.children.length > 0)
      );

      if (!hasVisibleContent) {
        // Add minimal content
        page.components = [
          {
            id: `${page.id}-title`,
            type: 'text',
            props: { text: page.name, variant: 'h1' },
          },
          {
            id: `${page.id}-content`,
            type: 'text',
            props: { 
              text: `Welcome to ${page.name}. Start adding content!`, 
              variant: 'body' 
            },
          },
          ...(page.entity ? [{
            id: `${page.id}-list`,
            type: 'list',
            props: { source: page.entity },
          }] : []),
        ];
        issues.push({
          severity: 'warning',
          path: `pages.${page.id}.components`,
          message: 'Page had no visible content, added defaults',
          autoFixed: true,
        });
      }
    }

    return blueprint;
  }

  /**
   * Generate default components for a page
   */
  private generateDefaultComponents(entity?: EntityDef, page?: PageDef): ComponentDef[] {
    const pageName = page?.name || entity?.pluralName || 'Home';
    const entityId = entity?.id || 'item';
    const pageType = page?.type || 'list';

    const components: ComponentDef[] = [
      {
        id: 'page-header',
        type: 'container',
        props: { className: 'flex justify-between items-center mb-6' },
        children: [
          {
            id: 'page-title',
            type: 'text',
            props: { text: pageName, variant: 'h1' },
          },
        ],
      },
    ];

    if (entity && pageType === 'list') {
      components[0].children?.push({
        id: 'add-button',
        type: 'button',
        props: { label: `Add ${entity.name}`, variant: 'primary' },
      });

      components.push({
        id: 'data-list',
        type: 'list',
        props: { source: entityId },
      });
    } else if (entity && pageType === 'form') {
      components.push({
        id: 'entity-form',
        type: 'form',
        props: { submitLabel: `Save ${entity.name}`, source: entityId },
      });
    }

    return components;
  }

  /**
   * Generate CRUD workflows for an entity
   */
  private generateCrudWorkflows(entity: EntityDef): WorkflowDef[] {
    return [
      {
        id: `create-${entity.id}`,
        name: `Create ${entity.name}`,
        enabled: true,
        trigger: { type: 'form_submit', componentId: `${entity.id}-form` },
        actions: [
          { id: 'create', type: 'create_record', config: { entityId: entity.id, source: 'form_data' } },
          { id: 'notify', type: 'show_notification', config: { message: `${entity.name} created!`, type: 'success' } },
          { id: 'refresh', type: 'refresh_data', config: { entityId: entity.id } },
        ],
      },
      {
        id: `delete-${entity.id}`,
        name: `Delete ${entity.name}`,
        enabled: true,
        trigger: { type: 'button_click', componentId: `${entity.id}-delete-btn` },
        actions: [
          { id: 'delete', type: 'delete_record', config: { entityId: entity.id } },
          { id: 'notify', type: 'show_notification', config: { message: `${entity.name} deleted.`, type: 'info' } },
          { id: 'refresh', type: 'refresh_data', config: { entityId: entity.id } },
        ],
      },
    ];
  }

  /**
   * Get icon for page type
   */
  private getPageIcon(type: string): string {
    const icons: Record<string, string> = {
      'dashboard': '📊',
      'list': '📋',
      'form': '📝',
      'detail': '📄',
      'calendar': '📅',
      'kanban': '📌',
      'table': '📊',
      'chart': '📈',
    };
    return icons[type] || '📄';
  }

  /**
   * Deep clone an object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// Export singleton
export const errorHardener = new ErrorHardener();
