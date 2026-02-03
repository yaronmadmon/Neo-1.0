/**
 * Studio Validator
 * Validates app blueprints for Studio compatibility
 */

import type { AppBlueprint, EntityDef, PageDef, WorkflowDef, FieldDef } from '../types.js';

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Single validation issue
 */
export interface ValidationIssue {
  path: string;
  message: string;
  severity: ValidationSeverity;
  code: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Quick summary of validation */
  summary: string;
  /** Validated and potentially auto-fixed blueprint (if autoFix was enabled) */
  blueprint?: AppBlueprint;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Attempt to auto-fix issues where possible */
  autoFix?: boolean;
  /** Maximum number of entities allowed */
  maxEntities?: number;
  /** Maximum number of pages allowed */
  maxPages?: number;
  /** Maximum number of fields per entity */
  maxFieldsPerEntity?: number;
  /** Whether strict mode is enabled (warnings become errors) */
  strict?: boolean;
}

const DEFAULT_OPTIONS: ValidationOptions = {
  autoFix: true,
  maxEntities: 50,
  maxPages: 100,
  maxFieldsPerEntity: 50,
  strict: false,
};

/**
 * Required top-level fields for a valid blueprint
 */
const REQUIRED_FIELDS = ['id', 'name', 'entities', 'pages', 'navigation'] as const;

/**
 * Valid field types that Studio supports
 */
const VALID_FIELD_TYPES = [
  'string', 'number', 'boolean', 'date', 'datetime',
  'email', 'url', 'phone', 'image', 'file',
  'reference', 'enum', 'currency', 'percentage',
  'richtext', 'json',
] as const;

/**
 * Valid page types
 */
const VALID_PAGE_TYPES = [
  'dashboard', 'list', 'detail', 'form', 'calendar',
  'kanban', 'timeline', 'gallery', 'settings', 'report',
] as const;

/**
 * Valid workflow trigger types
 */
const VALID_TRIGGER_TYPES = [
  'button_click', 'form_submit', 'data_create', 'data_update',
  'data_delete', 'page_load', 'field_change', 'schedule', 'webhook',
] as const;

/**
 * Valid workflow action types
 */
const VALID_ACTION_TYPES = [
  'create_record', 'update_record', 'delete_record', 'navigate',
  'show_notification', 'show_modal', 'close_modal', 'refresh_data',
  'set_variable', 'send_email', 'call_api', 'validate', 'conditional',
] as const;

export class StudioValidator {
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate a blueprint for Studio compatibility
   */
  validate(blueprint: AppBlueprint): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Clone blueprint for potential auto-fixes
    let fixedBlueprint = this.options.autoFix ? JSON.parse(JSON.stringify(blueprint)) : blueprint;

    // 1. Validate required fields
    this.validateRequiredFields(fixedBlueprint, issues);

    // 2. Validate entities
    this.validateEntities(fixedBlueprint, issues);

    // 3. Validate pages
    this.validatePages(fixedBlueprint, issues);

    // 4. Validate workflows
    this.validateWorkflows(fixedBlueprint, issues);

    // 5. Validate navigation
    this.validateNavigation(fixedBlueprint, issues);

    // 6. Validate references
    this.validateReferences(fixedBlueprint, issues);

    // 7. Validate theme
    this.validateTheme(fixedBlueprint, issues);

    // 8. Check limits
    this.validateLimits(fixedBlueprint, issues);

    // Determine if valid
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    
    const valid = this.options.strict 
      ? (errors.length === 0 && warnings.length === 0)
      : errors.length === 0;

    // Generate summary
    const summary = this.generateSummary(valid, errors.length, warnings.length);

    return {
      valid,
      issues,
      summary,
      blueprint: this.options.autoFix ? fixedBlueprint : undefined,
    };
  }

  private validateRequiredFields(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    for (const field of REQUIRED_FIELDS) {
      if (!(field in blueprint) || blueprint[field as keyof AppBlueprint] === undefined) {
        issues.push({
          path: field,
          message: `Missing required field: ${field}`,
          severity: 'error',
          code: 'MISSING_REQUIRED_FIELD',
        });

        // Auto-fix
        if (this.options.autoFix) {
          if (field === 'id') {
            (blueprint as any).id = `app-${Date.now()}`;
          } else if (field === 'name') {
            (blueprint as any).name = 'My App';
          } else if (field === 'entities') {
            (blueprint as any).entities = [];
          } else if (field === 'pages') {
            (blueprint as any).pages = [];
          } else if (field === 'navigation') {
            (blueprint as any).navigation = {
              rules: [],
              defaultPage: 'dashboard',
            };
          }
        }
      }
    }
  }

  private validateEntities(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    if (!Array.isArray(blueprint.entities)) {
      issues.push({
        path: 'entities',
        message: 'Entities must be an array',
        severity: 'error',
        code: 'INVALID_ENTITIES_TYPE',
      });
      return;
    }

    const entityIds = new Set<string>();

    for (let i = 0; i < blueprint.entities.length; i++) {
      const entity = blueprint.entities[i];
      const path = `entities[${i}]`;

      // Check required entity fields
      if (!entity.id) {
        issues.push({
          path: `${path}.id`,
          message: 'Entity missing ID',
          severity: 'error',
          code: 'MISSING_ENTITY_ID',
        });
        if (this.options.autoFix) {
          entity.id = `entity-${i}`;
        }
      }

      if (!entity.name) {
        issues.push({
          path: `${path}.name`,
          message: 'Entity missing name',
          severity: 'error',
          code: 'MISSING_ENTITY_NAME',
        });
        if (this.options.autoFix) {
          entity.name = entity.id || `Entity ${i}`;
        }
      }

      // Check for duplicate IDs
      if (entity.id && entityIds.has(entity.id)) {
        issues.push({
          path: `${path}.id`,
          message: `Duplicate entity ID: ${entity.id}`,
          severity: 'error',
          code: 'DUPLICATE_ENTITY_ID',
        });
      }
      entityIds.add(entity.id);

      // Validate fields
      this.validateEntityFields(entity, path, issues);
    }
  }

  private validateEntityFields(entity: EntityDef, basePath: string, issues: ValidationIssue[]): void {
    if (!Array.isArray(entity.fields)) {
      issues.push({
        path: `${basePath}.fields`,
        message: 'Entity fields must be an array',
        severity: 'error',
        code: 'INVALID_FIELDS_TYPE',
      });
      if (this.options.autoFix) {
        entity.fields = [];
      }
      return;
    }

    const fieldIds = new Set<string>();

    for (let i = 0; i < entity.fields.length; i++) {
      const field = entity.fields[i];
      const path = `${basePath}.fields[${i}]`;

      // Check required field properties
      if (!field.id) {
        issues.push({
          path: `${path}.id`,
          message: 'Field missing ID',
          severity: 'error',
          code: 'MISSING_FIELD_ID',
        });
        if (this.options.autoFix) {
          field.id = `field-${i}`;
        }
      }

      if (!field.name) {
        issues.push({
          path: `${path}.name`,
          message: 'Field missing name',
          severity: 'error',
          code: 'MISSING_FIELD_NAME',
        });
        if (this.options.autoFix) {
          field.name = field.id || `Field ${i}`;
        }
      }

      // Check field type
      if (!field.type || !VALID_FIELD_TYPES.includes(field.type as any)) {
        issues.push({
          path: `${path}.type`,
          message: `Invalid field type: ${field.type}`,
          severity: 'error',
          code: 'INVALID_FIELD_TYPE',
          suggestion: `Valid types: ${VALID_FIELD_TYPES.join(', ')}`,
        });
        if (this.options.autoFix) {
          field.type = 'string';
        }
      }

      // Check duplicate field IDs
      if (field.id && fieldIds.has(field.id)) {
        issues.push({
          path: `${path}.id`,
          message: `Duplicate field ID in entity: ${field.id}`,
          severity: 'error',
          code: 'DUPLICATE_FIELD_ID',
        });
      }
      fieldIds.add(field.id);

      // Validate reference fields
      if (field.type === 'reference' && !field.reference?.targetEntity) {
        issues.push({
          path: `${path}.reference`,
          message: 'Reference field missing targetEntity',
          severity: 'error',
          code: 'MISSING_REFERENCE_TARGET',
        });
      }

      // Validate enum fields
      if (field.type === 'enum' && (!field.enumOptions || field.enumOptions.length === 0)) {
        issues.push({
          path: `${path}.enumOptions`,
          message: 'Enum field missing options',
          severity: 'warning',
          code: 'MISSING_ENUM_OPTIONS',
        });
        if (this.options.autoFix) {
          field.enumOptions = [{ value: 'default', label: 'Default' }];
        }
      }
    }
  }

  private validatePages(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    if (!Array.isArray(blueprint.pages)) {
      issues.push({
        path: 'pages',
        message: 'Pages must be an array',
        severity: 'error',
        code: 'INVALID_PAGES_TYPE',
      });
      return;
    }

    const pageIds = new Set<string>();
    const routes = new Set<string>();

    for (let i = 0; i < blueprint.pages.length; i++) {
      const page = blueprint.pages[i];
      const path = `pages[${i}]`;

      // Check required page fields
      if (!page.id) {
        issues.push({
          path: `${path}.id`,
          message: 'Page missing ID',
          severity: 'error',
          code: 'MISSING_PAGE_ID',
        });
        if (this.options.autoFix) {
          page.id = `page-${i}`;
        }
      }

      if (!page.name) {
        issues.push({
          path: `${path}.name`,
          message: 'Page missing name',
          severity: 'error',
          code: 'MISSING_PAGE_NAME',
        });
        if (this.options.autoFix) {
          page.name = page.id || `Page ${i}`;
        }
      }

      if (!page.route) {
        issues.push({
          path: `${path}.route`,
          message: 'Page missing route',
          severity: 'error',
          code: 'MISSING_PAGE_ROUTE',
        });
        if (this.options.autoFix) {
          page.route = `/${page.id || `page-${i}`}`;
        }
      }

      // Check page type
      if (page.type && !VALID_PAGE_TYPES.includes(page.type as any)) {
        issues.push({
          path: `${path}.type`,
          message: `Invalid page type: ${page.type}`,
          severity: 'warning',
          code: 'INVALID_PAGE_TYPE',
          suggestion: `Valid types: ${VALID_PAGE_TYPES.join(', ')}`,
        });
      }

      // Check duplicate IDs
      if (page.id && pageIds.has(page.id)) {
        issues.push({
          path: `${path}.id`,
          message: `Duplicate page ID: ${page.id}`,
          severity: 'error',
          code: 'DUPLICATE_PAGE_ID',
        });
      }
      pageIds.add(page.id);

      // Check duplicate routes (warning, not error)
      if (page.route && routes.has(page.route)) {
        issues.push({
          path: `${path}.route`,
          message: `Duplicate route: ${page.route}`,
          severity: 'warning',
          code: 'DUPLICATE_ROUTE',
        });
      }
      routes.add(page.route);

      // Validate layout
      if (!page.layout) {
        issues.push({
          path: `${path}.layout`,
          message: 'Page missing layout',
          severity: 'warning',
          code: 'MISSING_PAGE_LAYOUT',
        });
        if (this.options.autoFix) {
          page.layout = {
            type: 'single-column',
            sections: [{ id: 'main', width: '100%' }],
          };
        }
      }

      // Validate components
      if (!page.components || !Array.isArray(page.components)) {
        issues.push({
          path: `${path}.components`,
          message: 'Page missing components array',
          severity: 'warning',
          code: 'MISSING_PAGE_COMPONENTS',
        });
        if (this.options.autoFix) {
          page.components = [];
        }
      }
    }
  }

  private validateWorkflows(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    if (!blueprint.workflows) {
      // Workflows are optional
      return;
    }

    if (!Array.isArray(blueprint.workflows)) {
      issues.push({
        path: 'workflows',
        message: 'Workflows must be an array',
        severity: 'error',
        code: 'INVALID_WORKFLOWS_TYPE',
      });
      return;
    }

    const workflowIds = new Set<string>();

    for (let i = 0; i < blueprint.workflows.length; i++) {
      const workflow = blueprint.workflows[i];
      const path = `workflows[${i}]`;

      // Check required workflow fields
      if (!workflow.id) {
        issues.push({
          path: `${path}.id`,
          message: 'Workflow missing ID',
          severity: 'error',
          code: 'MISSING_WORKFLOW_ID',
        });
        if (this.options.autoFix) {
          workflow.id = `workflow-${i}`;
        }
      }

      if (!workflow.name) {
        issues.push({
          path: `${path}.name`,
          message: 'Workflow missing name',
          severity: 'warning',
          code: 'MISSING_WORKFLOW_NAME',
        });
        if (this.options.autoFix) {
          workflow.name = workflow.id || `Workflow ${i}`;
        }
      }

      // Check duplicate IDs
      if (workflow.id && workflowIds.has(workflow.id)) {
        issues.push({
          path: `${path}.id`,
          message: `Duplicate workflow ID: ${workflow.id}`,
          severity: 'error',
          code: 'DUPLICATE_WORKFLOW_ID',
        });
      }
      workflowIds.add(workflow.id);

      // Validate trigger
      if (!workflow.trigger) {
        issues.push({
          path: `${path}.trigger`,
          message: 'Workflow missing trigger',
          severity: 'error',
          code: 'MISSING_WORKFLOW_TRIGGER',
        });
      } else if (!VALID_TRIGGER_TYPES.includes(workflow.trigger.type as any)) {
        issues.push({
          path: `${path}.trigger.type`,
          message: `Invalid trigger type: ${workflow.trigger.type}`,
          severity: 'error',
          code: 'INVALID_TRIGGER_TYPE',
          suggestion: `Valid types: ${VALID_TRIGGER_TYPES.join(', ')}`,
        });
      }

      // Validate actions
      if (!workflow.actions || !Array.isArray(workflow.actions)) {
        issues.push({
          path: `${path}.actions`,
          message: 'Workflow missing actions array',
          severity: 'warning',
          code: 'MISSING_WORKFLOW_ACTIONS',
        });
        if (this.options.autoFix) {
          workflow.actions = [];
        }
      } else {
        for (let j = 0; j < workflow.actions.length; j++) {
          const action = workflow.actions[j];
          if (!VALID_ACTION_TYPES.includes(action.type as any)) {
            issues.push({
              path: `${path}.actions[${j}].type`,
              message: `Invalid action type: ${action.type}`,
              severity: 'warning',
              code: 'INVALID_ACTION_TYPE',
              suggestion: `Valid types: ${VALID_ACTION_TYPES.join(', ')}`,
            });
          }
        }
      }
    }
  }

  private validateNavigation(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    if (!blueprint.navigation) {
      issues.push({
        path: 'navigation',
        message: 'Missing navigation configuration',
        severity: 'error',
        code: 'MISSING_NAVIGATION',
      });
      if (this.options.autoFix) {
        blueprint.navigation = {
          rules: [],
          defaultPage: blueprint.pages?.[0]?.id || 'dashboard',
        };
      }
      return;
    }

    // Check defaultPage exists
    if (blueprint.navigation.defaultPage) {
      const pageIds = new Set(blueprint.pages?.map(p => p.id) || []);
      if (!pageIds.has(blueprint.navigation.defaultPage)) {
        issues.push({
          path: 'navigation.defaultPage',
          message: `Default page does not exist: ${blueprint.navigation.defaultPage}`,
          severity: 'error',
          code: 'INVALID_DEFAULT_PAGE',
        });
        if (this.options.autoFix && blueprint.pages?.length > 0) {
          blueprint.navigation.defaultPage = blueprint.pages[0].id;
        }
      }
    }

    // Check sidebar items reference valid pages
    if (blueprint.navigation.sidebar?.items) {
      const pageIds = new Set(blueprint.pages?.map(p => p.id) || []);
      for (let i = 0; i < blueprint.navigation.sidebar.items.length; i++) {
        const item = blueprint.navigation.sidebar.items[i];
        if (!pageIds.has(item.pageId)) {
          issues.push({
            path: `navigation.sidebar.items[${i}].pageId`,
            message: `Sidebar item references non-existent page: ${item.pageId}`,
            severity: 'warning',
            code: 'INVALID_SIDEBAR_PAGE_REF',
          });
        }
      }
    }
  }

  private validateReferences(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    if (!blueprint.entities) return;

    const entityIds = new Set(blueprint.entities.map(e => e.id));

    for (const entity of blueprint.entities) {
      for (const field of entity.fields || []) {
        if (field.type === 'reference' && field.reference?.targetEntity) {
          if (!entityIds.has(field.reference.targetEntity)) {
            issues.push({
              path: `entities.${entity.id}.fields.${field.id}.reference.targetEntity`,
              message: `Reference to non-existent entity: ${field.reference.targetEntity}`,
              severity: 'error',
              code: 'INVALID_ENTITY_REFERENCE',
            });
          }
        }
      }
    }

    // Check page entity references
    for (const page of blueprint.pages || []) {
      if (page.entity && !entityIds.has(page.entity)) {
        issues.push({
          path: `pages.${page.id}.entity`,
          message: `Page references non-existent entity: ${page.entity}`,
          severity: 'error',
          code: 'INVALID_PAGE_ENTITY_REF',
        });
      }
    }
  }

  private validateTheme(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    if (!blueprint.theme) {
      issues.push({
        path: 'theme',
        message: 'Missing theme configuration',
        severity: 'info',
        code: 'MISSING_THEME',
      });
      if (this.options.autoFix) {
        blueprint.theme = {
          primaryColor: '#3b82f6',
          mode: 'light',
          borderRadius: 'medium',
        };
      }
      return;
    }

    // Validate primary color format
    if (blueprint.theme.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(blueprint.theme.primaryColor)) {
      issues.push({
        path: 'theme.primaryColor',
        message: `Invalid color format: ${blueprint.theme.primaryColor}`,
        severity: 'warning',
        code: 'INVALID_COLOR_FORMAT',
        suggestion: 'Use hex format: #RRGGBB',
      });
    }
  }

  private validateLimits(blueprint: AppBlueprint, issues: ValidationIssue[]): void {
    // Check entity count
    if (blueprint.entities && blueprint.entities.length > (this.options.maxEntities || 50)) {
      issues.push({
        path: 'entities',
        message: `Too many entities: ${blueprint.entities.length} (max: ${this.options.maxEntities})`,
        severity: 'warning',
        code: 'TOO_MANY_ENTITIES',
      });
    }

    // Check page count
    if (blueprint.pages && blueprint.pages.length > (this.options.maxPages || 100)) {
      issues.push({
        path: 'pages',
        message: `Too many pages: ${blueprint.pages.length} (max: ${this.options.maxPages})`,
        severity: 'warning',
        code: 'TOO_MANY_PAGES',
      });
    }

    // Check fields per entity
    for (const entity of blueprint.entities || []) {
      if (entity.fields && entity.fields.length > (this.options.maxFieldsPerEntity || 50)) {
        issues.push({
          path: `entities.${entity.id}.fields`,
          message: `Too many fields in ${entity.name}: ${entity.fields.length} (max: ${this.options.maxFieldsPerEntity})`,
          severity: 'warning',
          code: 'TOO_MANY_FIELDS',
        });
      }
    }
  }

  private generateSummary(valid: boolean, errorCount: number, warningCount: number): string {
    if (valid && errorCount === 0 && warningCount === 0) {
      return 'Blueprint is valid and ready for Studio.';
    }

    if (valid && warningCount > 0) {
      return `Blueprint is valid with ${warningCount} warning(s).`;
    }

    return `Blueprint has ${errorCount} error(s) and ${warningCount} warning(s).`;
  }
}

/**
 * Create a new studio validator
 */
export function createStudioValidator(options?: ValidationOptions): StudioValidator {
  return new StudioValidator(options);
}

/**
 * Quick validation helper
 */
export function validateForStudio(blueprint: AppBlueprint, autoFix = true): ValidationResult {
  const validator = new StudioValidator({ autoFix });
  return validator.validate(blueprint);
}
