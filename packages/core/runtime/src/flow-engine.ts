/**
 * CRUD Flow Engine
 * Executes simple, type-safe flows
 */

import type { App, Flow } from '@neo/contracts';
import { FlowActionType, FieldType, FlowActionSchema } from '@neo/contracts';
import type { AppRuntime } from './runtime.js';
import type { z } from 'zod';

type FlowAction = z.infer<typeof FlowActionSchema>;

/**
 * Flow execution result
 */
export interface FlowResult {
  success: boolean;
  actions?: FlowActionResult[];
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Flow action result
 */
export interface FlowActionResult {
  success: boolean;
  actionType: FlowActionType;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * CRUD Flow Engine
 * Executes flows with CRUD operations only
 */
export class CRUDFlowEngine {
  private runtime: AppRuntime;
  
  constructor(runtime: AppRuntime) {
    this.runtime = runtime;
  }
  
  /**
   * Execute a flow
   */
  async executeFlow(flowId: string, triggerData: unknown): Promise<FlowResult> {
    const schema = this.runtime.getSchema();
    const flow = schema.flows?.find(f => f.id === flowId);
    
    if (!flow) {
      return {
        success: false,
        error: `Flow ${flowId} not found`,
      };
    }
    
    if (!flow.enabled) {
      return {
        success: false,
        error: 'Flow is disabled',
      };
    }
    
    // Execute actions in sequence
    const results: FlowActionResult[] = [];
    
    for (const action of flow.actions) {
      try {
        const result = await this.executeAction(action, triggerData);
        results.push(result);
        
        // Stop on error (unless action is marked as non-blocking)
        if (!result.success && (action.blocking !== false)) {
          return {
            success: false,
            actions: results,
            error: result.error,
          };
        }
      } catch (error: any) {
        return {
          success: false,
          actions: results,
          error: error.message || 'Action execution failed',
        };
      }
    }
    
    return {
      success: true,
      actions: results,
    };
  }
  
  /**
   * Execute a single action
   */
  private async executeAction(
    action: FlowAction,
    triggerData: unknown
  ): Promise<FlowActionResult> {
    switch (action.type) {
      case FlowActionType.CREATE_RECORD:
        return this.createRecord(action, triggerData);
        
      case FlowActionType.UPDATE_RECORD:
        return this.updateRecord(action, triggerData);
        
      case FlowActionType.DELETE_RECORD:
        return this.deleteRecord(action);
        
      case FlowActionType.NAVIGATE:
        return this.navigate(action);
        
      case FlowActionType.SHOW_NOTIFICATION:
        return this.showNotification(action);
        
      case FlowActionType.REFRESH_DATA:
        return this.refreshData(action);
        
      default:
        return {
          success: false,
          actionType: action.type,
          error: `Unsupported action type: ${action.type}`,
        };
    }
  }
  
  /**
   * CREATE_RECORD action
   */
  private createRecord(action: FlowAction, triggerData: unknown): FlowActionResult {
    if (!action.modelId) {
      return {
        success: false,
        actionType: FlowActionType.CREATE_RECORD,
        error: 'modelId required for create_record',
      };
    }
    
    // Merge trigger data with action data
    const formData = this.extractFormData(triggerData);
    const recordData = {
      ...(action.data || {}),
      ...(formData || {}),
    };
    
    this.runtime.addRecord(action.modelId, recordData);
    
    return {
      success: true,
      actionType: FlowActionType.CREATE_RECORD,
      data: {
        modelId: action.modelId,
        recordId: (recordData as any).id,
      },
    };
  }
  
  /**
   * Validate reference fields in record data
   * Checks that all reference fields point to existing records
   */
  private validateReferenceFields(modelId: string, recordData: Record<string, unknown>): string | null {
    const schema = this.runtime.getSchema();
    const model = schema.dataModels?.find(m => m.id === modelId);
    
    if (!model) {
      return `Model ${modelId} not found`;
    }
    
    // Check each field in the model
    for (const field of model.fields || []) {
      if (field.type === FieldType.REFERENCE && field.reference) {
        const fieldValue = recordData[field.id];
        
        // Skip validation if field is optional and not provided
        if (!field.required && (fieldValue === null || fieldValue === undefined || fieldValue === '')) {
          continue;
        }
        
        // Required reference fields must have a value
        if (field.required && (fieldValue === null || fieldValue === undefined || fieldValue === '')) {
          return `Reference field ${field.name} is required`;
        }
        
        // Validate that the referenced record exists
        if (fieldValue) {
          const targetRecords = this.runtime.getRecords(field.reference.targetModel);
          if (!targetRecords || targetRecords.length === 0) {
            return `Target model ${field.reference.targetModel} has no records. Cannot reference non-existent records.`;
          }
          
          const referencedRecord = targetRecords.find(r => (r as Record<string, unknown>).id === fieldValue);
          
          if (!referencedRecord) {
            return `Referenced ${field.reference.targetModel} record with ID ${fieldValue} not found for field ${field.name}`;
          }
        }
      }
    }
    
    return null; // Validation passed
  }

  /**
   * UPDATE_RECORD action
   */
  private updateRecord(action: FlowAction, triggerData: unknown): FlowActionResult {
    if (!action.modelId || !action.recordId) {
      return {
        success: false,
        actionType: FlowActionType.UPDATE_RECORD,
        error: 'modelId and recordId required for update_record',
      };
    }
    
    const formData = this.extractFormData(triggerData);
    const updates = {
      ...(action.data || {}),
      ...(formData || {}),
    };
    
    // Get existing records to find the one being updated
    const allRecords = this.runtime.getRecords(action.modelId) || [];
    const existingRecord = allRecords.find(r => (r as Record<string, unknown>).id === action.recordId);
    if (!existingRecord) {
      return {
        success: false,
        actionType: FlowActionType.UPDATE_RECORD,
        error: `Record ${action.recordId} not found in model ${action.modelId}`,
      };
    }
    
    // Merge existing data with updates for validation
    const mergedData = {
      ...(existingRecord as Record<string, unknown>),
      ...updates,
    };
    
    // Validate reference fields in updated data
    const validationError = this.validateReferenceFields(action.modelId, mergedData);
    if (validationError) {
      return {
        success: false,
        actionType: FlowActionType.UPDATE_RECORD,
        error: validationError,
      };
    }
    
    this.runtime.updateRecord(action.modelId, action.recordId, updates);
    
    return {
      success: true,
      actionType: FlowActionType.UPDATE_RECORD,
      data: {
        modelId: action.modelId,
        recordId: action.recordId,
      },
    };
  }
  
  /**
   * DELETE_RECORD action
   */
  private deleteRecord(action: FlowAction): FlowActionResult {
    if (!action.modelId || !action.recordId) {
      return {
        success: false,
        actionType: FlowActionType.DELETE_RECORD,
        error: 'modelId and recordId required for delete_record',
      };
    }
    
    // Validate that no other records reference this one
    const validationError = this.validateDelete(action.modelId, action.recordId);
    if (validationError) {
      return {
        success: false,
        actionType: FlowActionType.DELETE_RECORD,
        error: validationError,
      };
    }
    
    this.runtime.deleteRecord(action.modelId, action.recordId);
    
    return {
      success: true,
      actionType: FlowActionType.DELETE_RECORD,
      data: {
        modelId: action.modelId,
        recordId: action.recordId,
      },
    };
  }

  /**
   * Validate that a record can be safely deleted
   * Checks if any other records reference this record
   */
  private validateDelete(modelId: string, recordId: string): string | null {
    const schema = this.runtime.getSchema();
    
    // Find all models that have reference fields pointing to this model
    const dependentModels = schema.dataModels?.filter(model => {
      return model.fields?.some(field => {
        return field.type === FieldType.REFERENCE && 
               field.reference?.targetModel === modelId;
      });
    }) || [];
    
    if (dependentModels.length === 0) {
      return null; // No dependent models, safe to delete
    }
    
    // Check each dependent model for references
    const blockingModels: string[] = [];
    
    for (const dependentModel of dependentModels) {
      // Find the reference field that points to our model
      const referenceField = dependentModel.fields?.find(field => {
        return field.type === FieldType.REFERENCE && 
               field.reference?.targetModel === modelId;
      });
      
      if (!referenceField) {
        continue;
      }
      
      // Get all records from the dependent model
      const dependentRecords = this.runtime.getRecords(dependentModel.id);
      
      // Check if any records reference the record we're trying to delete
      if (dependentRecords && dependentRecords.length > 0) {
        const hasReferences = dependentRecords.some(record => {
          const recordObj = record as Record<string, unknown>;
          return recordObj[referenceField.id] === recordId;
        });
        
        if (hasReferences) {
          blockingModels.push(dependentModel.name);
        }
      }
    }
    
    if (blockingModels.length > 0) {
      const modelNames = blockingModels.join(' and ');
      return `Cannot delete this record. It is currently referenced by ${modelNames}. Please delete or update those records first.`;
    }
    
    return null; // Safe to delete
  }
  
  /**
   * NAVIGATE action
   */
  private navigate(action: FlowAction): FlowActionResult {
    if (!action.targetPageId) {
      return {
        success: false,
        actionType: FlowActionType.NAVIGATE,
        error: 'targetPageId required for navigate',
      };
    }
    
    this.runtime.navigateTo(action.targetPageId);
    
    return {
      success: true,
      actionType: FlowActionType.NAVIGATE,
      data: {
        pageId: action.targetPageId,
      },
    };
  }
  
  /**
   * SHOW_NOTIFICATION action
   */
  private showNotification(action: FlowAction): FlowActionResult {
    // This would trigger a UI notification
    // For now, just log it (could emit event or call callback)
    if (action.message) {
      console.log('Notification:', action.message);
    }
    
    return {
      success: true,
      actionType: FlowActionType.SHOW_NOTIFICATION,
      data: {
        message: action.message,
      },
    };
  }
  
  /**
   * REFRESH_DATA action
   */
  private refreshData(action: FlowAction): FlowActionResult {
    // This would trigger a data refresh in the UI
    // For now, just return success
    return {
      success: true,
      actionType: FlowActionType.REFRESH_DATA,
      data: {
        modelId: action.modelId,
      },
    };
  }
  
  /**
   * Extract form data from trigger
   */
  private extractFormData(triggerData: unknown): Record<string, unknown> | null {
    if (triggerData && typeof triggerData === 'object' && 'formData' in triggerData) {
      return triggerData.formData as Record<string, unknown>;
    }
    
    // Also check for direct object with form-like structure
    if (triggerData && typeof triggerData === 'object' && !Array.isArray(triggerData)) {
      return triggerData as Record<string, unknown>;
    }
    
    return null;
  }
}
