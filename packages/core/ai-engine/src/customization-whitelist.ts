/**
 * Customization Whitelist
 * Defines allowed operations for AI customization to ensure safety and Studio compatibility
 */

/**
 * Entity operation types
 */
export type EntityOperation = 
  | 'addFields'
  | 'modifyEnums'
  | 'setDefaultValue'
  | 'setDisplayField'
  | 'addValidation'
  | 'setIcon'
  | 'setDescription';

/**
 * Page operation types
 */
export type PageOperation =
  | 'addWidget'
  | 'removeWidget'
  | 'reorderSections'
  | 'setDefaultView'
  | 'setPageTitle'
  | 'addFilter'
  | 'setLayout'
  | 'addAction';

/**
 * Workflow trigger types
 */
export type WorkflowTrigger =
  | 'onCreate'
  | 'onUpdate'
  | 'onDelete'
  | 'onStatusChange'
  | 'scheduled'
  | 'manual';

/**
 * Workflow action types
 */
export type WorkflowAction =
  | 'sendEmail'
  | 'sendSms'
  | 'createRecord'
  | 'updateRecord'
  | 'setField'
  | 'notify'
  | 'delay'
  | 'condition';

/**
 * Theme customization types
 */
export type ThemeCustomization =
  | 'setPrimaryColor'
  | 'setAccentColor'
  | 'setBackgroundColor'
  | 'setFontFamily'
  | 'setDensity'
  | 'setRoundness';

/**
 * Field types allowed for AI to create
 */
export type AllowedFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'enum'
  | 'richtext'
  | 'image'
  | 'file'
  | 'reference'
  | 'address';

/**
 * Whitelist configuration
 */
export const CUSTOMIZATION_WHITELIST = {
  entity: {
    operations: [
      'addFields',
      'modifyEnums',
      'setDefaultValue',
      'setDisplayField',
      'addValidation',
      'setIcon',
      'setDescription',
    ] as EntityOperation[],
    maxFieldsPerEntity: 20,
    maxEnumOptions: 10,
  },
  
  page: {
    operations: [
      'addWidget',
      'removeWidget',
      'reorderSections',
      'setDefaultView',
      'setPageTitle',
      'addFilter',
      'setLayout',
      'addAction',
    ] as PageOperation[],
    maxWidgetsPerPage: 15,
    maxFilters: 5,
  },
  
  workflow: {
    triggers: [
      'onCreate',
      'onUpdate',
      'onDelete',
      'onStatusChange',
      'scheduled',
      'manual',
    ] as WorkflowTrigger[],
    actions: [
      'sendEmail',
      'sendSms',
      'createRecord',
      'updateRecord',
      'setField',
      'notify',
      'delay',
      'condition',
    ] as WorkflowAction[],
    maxActionsPerWorkflow: 10,
    maxWorkflows: 20,
  },
  
  theme: {
    customizations: [
      'setPrimaryColor',
      'setAccentColor',
      'setBackgroundColor',
      'setFontFamily',
      'setDensity',
      'setRoundness',
    ] as ThemeCustomization[],
  },
  
  field: {
    allowedTypes: [
      'string',
      'number',
      'boolean',
      'date',
      'datetime',
      'email',
      'phone',
      'url',
      'currency',
      'enum',
      'richtext',
      'image',
      'file',
      'reference',
      'address',
    ] as AllowedFieldType[],
  },
} as const;

/**
 * Entity modification request
 */
export interface EntityModification {
  entityId: string;
  operation: string;
  data: Record<string, unknown>;
}

/**
 * Page customization request
 */
export interface PageCustomization {
  pageId: string;
  operation: string;
  data: Record<string, unknown>;
}

/**
 * Workflow addition request
 */
export interface WorkflowAddition {
  id: string;
  name: string;
  trigger: string;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
}

/**
 * Theme adjustment request
 */
export interface ThemeAdjustment {
  customization: string;
  value: unknown;
}

/**
 * Full customization spec from AI
 */
export interface CustomizationSpec {
  entityModifications?: EntityModification[];
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
  pageCustomizations?: PageCustomization[];
  workflowAdditions?: WorkflowAddition[];
  themeAdjustments?: ThemeAdjustment[];
}

/**
 * Filtered customization spec (all invalid operations removed)
 */
export interface FilteredCustomizationSpec extends CustomizationSpec {
  droppedOperations: string[];
}

/**
 * Whitelist validator and filter
 */
export class CustomizationWhitelist {
  /**
   * Filter customization spec through whitelist
   * Invalid operations are silently dropped and recorded
   */
  filter(spec: CustomizationSpec): FilteredCustomizationSpec {
    const droppedOperations: string[] = [];
    const result: FilteredCustomizationSpec = {
      droppedOperations,
    };

    // Filter entity modifications
    if (spec.entityModifications) {
      result.entityModifications = spec.entityModifications.filter(mod => {
        if (this.isValidEntityOperation(mod.operation)) {
          return true;
        }
        droppedOperations.push(`entity:${mod.entityId}:${mod.operation}`);
        return false;
      }).slice(0, CUSTOMIZATION_WHITELIST.entity.maxFieldsPerEntity);
    }

    // Filter and validate new entities
    if (spec.addEntities) {
      result.addEntities = spec.addEntities.map(entity => ({
        ...entity,
        fields: entity.fields
          .filter(field => {
            if (this.isValidFieldType(field.type)) {
              return true;
            }
            droppedOperations.push(`entity:${entity.id}:field:${field.id}:invalidType:${field.type}`);
            return false;
          })
          .slice(0, CUSTOMIZATION_WHITELIST.entity.maxFieldsPerEntity)
          .map(field => ({
            ...field,
            enumOptions: field.enumOptions?.slice(0, CUSTOMIZATION_WHITELIST.entity.maxEnumOptions),
          })),
      }));
    }

    // Filter page customizations
    if (spec.pageCustomizations) {
      result.pageCustomizations = spec.pageCustomizations.filter(page => {
        if (this.isValidPageOperation(page.operation)) {
          return true;
        }
        droppedOperations.push(`page:${page.pageId}:${page.operation}`);
        return false;
      });
    }

    // Filter workflow additions
    if (spec.workflowAdditions) {
      result.workflowAdditions = spec.workflowAdditions
        .filter(workflow => {
          if (this.isValidWorkflowTrigger(workflow.trigger)) {
            return true;
          }
          droppedOperations.push(`workflow:${workflow.id}:invalidTrigger:${workflow.trigger}`);
          return false;
        })
        .slice(0, CUSTOMIZATION_WHITELIST.workflow.maxWorkflows)
        .map(workflow => ({
          ...workflow,
          actions: workflow.actions
            .filter(action => {
              if (this.isValidWorkflowAction(action.type)) {
                return true;
              }
              droppedOperations.push(`workflow:${workflow.id}:action:${action.type}`);
              return false;
            })
            .slice(0, CUSTOMIZATION_WHITELIST.workflow.maxActionsPerWorkflow),
        }));
    }

    // Filter theme adjustments
    if (spec.themeAdjustments) {
      result.themeAdjustments = spec.themeAdjustments.filter(adj => {
        if (this.isValidThemeCustomization(adj.customization)) {
          return true;
        }
        droppedOperations.push(`theme:${adj.customization}`);
        return false;
      });
    }

    return result;
  }

  /**
   * Check if entity operation is allowed
   */
  isValidEntityOperation(operation: string): operation is EntityOperation {
    return (CUSTOMIZATION_WHITELIST.entity.operations as readonly string[]).includes(operation);
  }

  /**
   * Check if page operation is allowed
   */
  isValidPageOperation(operation: string): operation is PageOperation {
    return (CUSTOMIZATION_WHITELIST.page.operations as readonly string[]).includes(operation);
  }

  /**
   * Check if workflow trigger is allowed
   */
  isValidWorkflowTrigger(trigger: string): trigger is WorkflowTrigger {
    return (CUSTOMIZATION_WHITELIST.workflow.triggers as readonly string[]).includes(trigger);
  }

  /**
   * Check if workflow action is allowed
   */
  isValidWorkflowAction(action: string): action is WorkflowAction {
    return (CUSTOMIZATION_WHITELIST.workflow.actions as readonly string[]).includes(action);
  }

  /**
   * Check if theme customization is allowed
   */
  isValidThemeCustomization(customization: string): customization is ThemeCustomization {
    return (CUSTOMIZATION_WHITELIST.theme.customizations as readonly string[]).includes(customization);
  }

  /**
   * Check if field type is allowed
   */
  isValidFieldType(type: string): type is AllowedFieldType {
    return (CUSTOMIZATION_WHITELIST.field.allowedTypes as readonly string[]).includes(type);
  }

  /**
   * Get all allowed operations for documentation
   */
  getAllowedOperations(): typeof CUSTOMIZATION_WHITELIST {
    return CUSTOMIZATION_WHITELIST;
  }
}

/**
 * Create a new whitelist validator
 */
export function createWhitelist(): CustomizationWhitelist {
  return new CustomizationWhitelist();
}
