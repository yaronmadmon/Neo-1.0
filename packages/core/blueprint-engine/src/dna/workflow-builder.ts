/**
 * Workflow Builder
 * 
 * Generates complete workflow definitions with:
 * - Triggers (button click, form submit, data changes, schedules)
 * - Actions (CRUD, navigation, notifications, API calls)
 * - Conditions and branching
 * - Error handling
 */

import type { UnifiedWorkflow, UnifiedWorkflowAction, UnifiedEntity, UnifiedPage } from './schema.js';
import type { InferredWorkflow, DetectedFeature } from '../intelligence/types.js';

// ============================================================
// TYPES
// ============================================================

export interface WorkflowBuildContext {
  entities: UnifiedEntity[];
  pages: UnifiedPage[];
  features?: DetectedFeature[];
  industry?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: UnifiedWorkflow['trigger'];
  actions: UnifiedWorkflowAction[];
}

// ============================================================
// WORKFLOW BUILDER
// ============================================================

export class WorkflowBuilder {
  /**
   * Generate all workflows for an app
   */
  generateAll(ctx: WorkflowBuildContext): UnifiedWorkflow[] {
    const workflows: UnifiedWorkflow[] = [];

    // Generate CRUD workflows for each entity
    for (const entity of ctx.entities) {
      workflows.push(...this.generateCrudWorkflows(entity, ctx));
    }

    // Generate navigation workflows
    workflows.push(...this.generateNavigationWorkflows(ctx.pages, ctx.entities));

    // Generate feature-based workflows
    if (ctx.features) {
      workflows.push(...this.generateFeatureWorkflows(ctx.features, ctx));
    }

    // Generate industry-specific workflows
    if (ctx.industry) {
      workflows.push(...this.generateIndustryWorkflows(ctx.industry, ctx));
    }

    return workflows;
  }

  /**
   * Build workflow from inferred data
   */
  buildFromInference(inferred: InferredWorkflow, ctx: WorkflowBuildContext): UnifiedWorkflow {
    return {
      id: inferred.id,
      name: inferred.name,
      description: inferred.description,
      enabled: true,
      trigger: this.convertTrigger(inferred.trigger),
      actions: inferred.steps.map(step => this.convertStep(step)),
      onError: {
        action: 'stop',
        notification: `Error in ${inferred.name}`,
      },
    };
  }

  // ============================================================
  // CRUD WORKFLOWS
  // ============================================================

  private generateCrudWorkflows(entity: UnifiedEntity, ctx: WorkflowBuildContext): UnifiedWorkflow[] {
    const workflows: UnifiedWorkflow[] = [];

    // Create workflow
    workflows.push({
      id: `create-${entity.id}`,
      name: `Create ${entity.name}`,
      description: `Creates a new ${entity.name.toLowerCase()} record`,
      enabled: true,
      trigger: {
        type: 'form_submit',
        componentId: `${entity.id}-form`,
      },
      actions: [
        {
          id: 'validate',
          type: 'validate',
          config: {
            rules: entity.fields
              .filter(f => f.required)
              .map(f => ({ field: f.id, rule: 'required', message: `${f.name} is required` })),
          },
        },
        {
          id: 'create-record',
          type: 'create_record',
          config: {
            entityId: entity.id,
            source: 'form_data',
            generateId: true,
            timestamps: true,
          },
        },
        {
          id: 'show-success',
          type: 'show_notification',
          config: {
            type: 'success',
            title: 'Success',
            message: `${entity.name} created successfully!`,
            duration: 3000,
          },
        },
        {
          id: 'navigate-list',
          type: 'navigate',
          config: {
            pageId: `${entity.id}-list`,
          },
        },
      ],
      onError: {
        action: 'stop',
        notification: `Failed to create ${entity.name.toLowerCase()}`,
      },
    });

    // Update workflow
    workflows.push({
      id: `update-${entity.id}`,
      name: `Update ${entity.name}`,
      description: `Updates an existing ${entity.name.toLowerCase()} record`,
      enabled: true,
      trigger: {
        type: 'form_submit',
        componentId: `${entity.id}-edit-form`,
      },
      actions: [
        {
          id: 'validate',
          type: 'validate',
          config: {
            rules: entity.fields
              .filter(f => f.required)
              .map(f => ({ field: f.id, rule: 'required', message: `${f.name} is required` })),
          },
        },
        {
          id: 'update-record',
          type: 'update_record',
          config: {
            entityId: entity.id,
            source: 'form_data',
            timestamps: true,
          },
        },
        {
          id: 'show-success',
          type: 'show_notification',
          config: {
            type: 'success',
            title: 'Success',
            message: `${entity.name} updated successfully!`,
            duration: 3000,
          },
        },
        {
          id: 'navigate-detail',
          type: 'navigate',
          config: {
            pageId: `${entity.id}-detail`,
            params: { id: '$record.id' },
          },
        },
      ],
      onError: {
        action: 'stop',
        notification: `Failed to update ${entity.name.toLowerCase()}`,
      },
    });

    // Delete workflow
    workflows.push({
      id: `delete-${entity.id}`,
      name: `Delete ${entity.name}`,
      description: `Deletes a ${entity.name.toLowerCase()} record`,
      enabled: true,
      trigger: {
        type: 'button_click',
        componentId: `${entity.id}-delete-btn`,
      },
      actions: [
        {
          id: 'confirm',
          type: 'show_confirmation',
          config: {
            title: `Delete ${entity.name}?`,
            message: `Are you sure you want to delete this ${entity.name.toLowerCase()}? This action cannot be undone.`,
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'danger',
          },
        },
        {
          id: 'conditional-delete',
          type: 'conditional',
          config: {},
          condition: '$confirmed === true',
          thenActions: [
            {
              id: 'delete-record',
              type: entity.crud?.delete?.softDelete ? 'update_record' : 'delete_record',
              config: entity.crud?.delete?.softDelete 
                ? { entityId: entity.id, data: { deletedAt: '$now' } }
                : { entityId: entity.id },
            },
            {
              id: 'show-success',
              type: 'show_notification',
              config: {
                type: 'info',
                message: `${entity.name} deleted`,
                duration: 3000,
              },
            },
            {
              id: 'navigate-list',
              type: 'navigate',
              config: {
                pageId: `${entity.id}-list`,
              },
            },
          ],
        },
      ],
    });

    // Bulk delete workflow
    workflows.push({
      id: `bulk-delete-${entity.id}`,
      name: `Bulk Delete ${entity.pluralName}`,
      enabled: true,
      trigger: {
        type: 'button_click',
        componentId: `${entity.id}-bulk-delete-btn`,
      },
      actions: [
        {
          id: 'confirm',
          type: 'show_confirmation',
          config: {
            title: `Delete Selected ${entity.pluralName}?`,
            message: `Are you sure you want to delete $selectedCount ${entity.pluralName.toLowerCase()}?`,
            confirmLabel: 'Delete All',
            variant: 'danger',
          },
        },
        {
          id: 'conditional-delete',
          type: 'conditional',
          config: {},
          condition: '$confirmed === true',
          thenActions: [
            {
              id: 'loop-delete',
              type: 'loop',
              config: {},
              items: '$selectedIds',
              itemActions: [
                {
                  id: 'delete-item',
                  type: 'delete_record',
                  config: { entityId: entity.id, id: '$item' },
                },
              ],
            },
            {
              id: 'refresh-data',
              type: 'refresh_data',
              config: { entityId: entity.id },
            },
            {
              id: 'show-success',
              type: 'show_notification',
              config: {
                type: 'info',
                message: `$selectedCount ${entity.pluralName.toLowerCase()} deleted`,
              },
            },
          ],
        },
      ],
    });

    // Add status change workflow if entity is trackable
    if (entity.behaviors?.includes('trackable')) {
      const statusField = entity.fields.find(f => f.id === 'status' || f.id === 'stage');
      if (statusField?.enumOptions) {
        workflows.push({
          id: `change-${entity.id}-status`,
          name: `Change ${entity.name} Status`,
          enabled: true,
          trigger: {
            type: 'field_change',
            entityId: entity.id,
            fieldId: statusField.id,
          },
          actions: [
            {
              id: 'update-status',
              type: 'update_record',
              config: {
                entityId: entity.id,
                data: { [statusField.id]: '$newValue', updatedAt: '$now' },
              },
            },
            {
              id: 'show-notification',
              type: 'show_notification',
              config: {
                type: 'success',
                message: `Status changed to $newValue`,
                duration: 2000,
              },
            },
          ],
        });
      }
    }

    return workflows;
  }

  // ============================================================
  // NAVIGATION WORKFLOWS
  // ============================================================

  private generateNavigationWorkflows(pages: UnifiedPage[], entities: UnifiedEntity[]): UnifiedWorkflow[] {
    const workflows: UnifiedWorkflow[] = [];

    for (const entity of entities) {
      // Navigate to list
      workflows.push({
        id: `navigate-${entity.id}-list`,
        name: `Go to ${entity.pluralName}`,
        enabled: true,
        trigger: {
          type: 'button_click',
          componentId: `nav-${entity.id}-list`,
        },
        actions: [
          {
            id: 'navigate',
            type: 'navigate',
            config: { pageId: `${entity.id}-list` },
          },
        ],
      });

      // Navigate to form
      workflows.push({
        id: `navigate-${entity.id}-form`,
        name: `Add ${entity.name}`,
        enabled: true,
        trigger: {
          type: 'button_click',
          componentId: `${entity.id}-add-btn`,
        },
        actions: [
          {
            id: 'navigate',
            type: 'navigate',
            config: { pageId: `${entity.id}-form` },
          },
        ],
      });

      // Navigate to detail
      workflows.push({
        id: `navigate-${entity.id}-detail`,
        name: `View ${entity.name}`,
        enabled: true,
        trigger: {
          type: 'button_click',
          componentId: `${entity.id}-view-btn`,
        },
        actions: [
          {
            id: 'navigate',
            type: 'navigate',
            config: {
              pageId: `${entity.id}-detail`,
              params: { id: '$record.id' },
            },
          },
        ],
      });

      // Navigate to edit
      workflows.push({
        id: `navigate-${entity.id}-edit`,
        name: `Edit ${entity.name}`,
        enabled: true,
        trigger: {
          type: 'button_click',
          componentId: `${entity.id}-edit-btn`,
        },
        actions: [
          {
            id: 'navigate',
            type: 'navigate',
            config: {
              pageId: `${entity.id}-form`,
              params: { id: '$record.id', mode: 'edit' },
            },
          },
        ],
      });
    }

    return workflows;
  }

  // ============================================================
  // FEATURE-BASED WORKFLOWS
  // ============================================================

  private generateFeatureWorkflows(features: DetectedFeature[], ctx: WorkflowBuildContext): UnifiedWorkflow[] {
    const workflows: UnifiedWorkflow[] = [];
    const featureIds = features.map(f => f.id);

    // Email notifications
    if (featureIds.includes('email') || featureIds.includes('notifications')) {
      for (const entity of ctx.entities) {
        workflows.push({
          id: `email-on-${entity.id}-create`,
          name: `Email on ${entity.name} Created`,
          enabled: true,
          trigger: {
            type: 'record_create',
            entityId: entity.id,
          },
          actions: [
            {
              id: 'send-email',
              type: 'send_email',
              config: {
                template: `${entity.id}_created`,
                to: '$owner.email',
                subject: `New ${entity.name}: $record.name`,
                body: `A new ${entity.name.toLowerCase()} has been created.`,
              },
            },
          ],
        });
      }
    }

    // Reminders
    if (featureIds.includes('reminders')) {
      const schedulableEntities = ctx.entities.filter(e => e.behaviors?.includes('schedulable'));
      for (const entity of schedulableEntities) {
        const dateField = entity.fields.find(f => f.type === 'date' || f.type === 'datetime');
        if (dateField) {
          workflows.push({
            id: `reminder-${entity.id}`,
            name: `${entity.name} Reminder`,
            enabled: true,
            trigger: {
              type: 'schedule',
              schedule: '0 9 * * *', // Daily at 9 AM
              condition: `$record.${dateField.id} == $today`,
            },
            actions: [
              {
                id: 'send-notification',
                type: 'show_notification',
                config: {
                  type: 'reminder',
                  title: `${entity.name} Today`,
                  message: `You have a ${entity.name.toLowerCase()} scheduled for today.`,
                },
              },
            ],
          });
        }
      }
    }

    // Invoicing
    if (featureIds.includes('invoicing')) {
      const billableEntities = ctx.entities.filter(e => e.behaviors?.includes('billable'));
      for (const entity of billableEntities) {
        workflows.push({
          id: `generate-invoice-${entity.id}`,
          name: `Generate Invoice from ${entity.name}`,
          enabled: true,
          trigger: {
            type: 'button_click',
            componentId: `${entity.id}-generate-invoice-btn`,
          },
          actions: [
            {
              id: 'open-modal',
              type: 'open_modal',
              config: {
                modalId: 'invoice-modal',
                data: { sourceEntity: entity.id, sourceRecord: '$record' },
              },
            },
          ],
        });
      }
    }

    // Approvals
    if (featureIds.includes('approvals')) {
      for (const entity of ctx.entities) {
        if (entity.behaviors?.includes('trackable')) {
          workflows.push({
            id: `approve-${entity.id}`,
            name: `Approve ${entity.name}`,
            enabled: true,
            trigger: {
              type: 'button_click',
              componentId: `${entity.id}-approve-btn`,
            },
            actions: [
              {
                id: 'update-status',
                type: 'update_record',
                config: {
                  entityId: entity.id,
                  data: { status: 'approved', approvedAt: '$now', approvedBy: '$user.id' },
                },
              },
              {
                id: 'notify',
                type: 'show_notification',
                config: {
                  type: 'success',
                  message: `${entity.name} approved`,
                },
              },
            ],
          });

          workflows.push({
            id: `reject-${entity.id}`,
            name: `Reject ${entity.name}`,
            enabled: true,
            trigger: {
              type: 'button_click',
              componentId: `${entity.id}-reject-btn`,
            },
            actions: [
              {
                id: 'show-modal',
                type: 'open_modal',
                config: { modalId: 'rejection-reason-modal' },
              },
              {
                id: 'update-status',
                type: 'update_record',
                config: {
                  entityId: entity.id,
                  data: { status: 'rejected', rejectedAt: '$now', rejectionReason: '$modal.reason' },
                },
              },
            ],
          });
        }
      }
    }

    return workflows;
  }

  // ============================================================
  // INDUSTRY WORKFLOWS
  // ============================================================

  private generateIndustryWorkflows(industry: string, ctx: WorkflowBuildContext): UnifiedWorkflow[] {
    const workflows: UnifiedWorkflow[] = [];

    switch (industry) {
      case 'trades':
      case 'services':
        // Job completion workflow
        const jobEntity = ctx.entities.find(e => 
          e.id === 'job' || e.id === 'service' || e.id === 'work-order'
        );
        if (jobEntity) {
          workflows.push({
            id: 'complete-job',
            name: 'Complete Job',
            enabled: true,
            trigger: {
              type: 'button_click',
              componentId: 'complete-job-btn',
            },
            actions: [
              {
                id: 'update-status',
                type: 'update_record',
                config: {
                  entityId: jobEntity.id,
                  data: { status: 'completed', completedAt: '$now' },
                },
              },
              {
                id: 'conditional-invoice',
                type: 'conditional',
                config: {},
                condition: '$autoInvoice === true',
                thenActions: [
                  {
                    id: 'create-invoice',
                    type: 'create_record',
                    config: {
                      entityId: 'invoice',
                      data: {
                        jobId: '$record.id',
                        amount: '$record.total',
                        status: 'pending',
                      },
                    },
                  },
                ],
              },
              {
                id: 'notify-customer',
                type: 'send_email',
                config: {
                  to: '$record.client.email',
                  template: 'job_completed',
                  subject: 'Your job has been completed',
                },
              },
            ],
          });
        }
        break;

      case 'healthcare':
        // Appointment reminder workflow
        const appointmentEntity = ctx.entities.find(e => 
          e.id === 'appointment' || e.id === 'booking'
        );
        if (appointmentEntity) {
          workflows.push({
            id: 'appointment-reminder',
            name: 'Send Appointment Reminder',
            enabled: true,
            trigger: {
              type: 'schedule',
              schedule: '0 9 * * *',
            },
            actions: [
              {
                id: 'find-appointments',
                type: 'set_variable',
                config: {
                  name: 'tomorrowAppointments',
                  query: `${appointmentEntity.id}.where(date == tomorrow)`,
                },
              },
              {
                id: 'send-reminders',
                type: 'loop',
                config: {},
                items: '$tomorrowAppointments',
                itemActions: [
                  {
                    id: 'send-sms',
                    type: 'send_sms',
                    config: {
                      to: '$item.patient.phone',
                      message: 'Reminder: You have an appointment tomorrow at $item.time',
                    },
                  },
                ],
              },
            ],
          });
        }
        break;

      case 'real_estate':
        // Showing follow-up workflow
        const showingEntity = ctx.entities.find(e => e.id === 'showing');
        if (showingEntity) {
          workflows.push({
            id: 'showing-followup',
            name: 'Showing Follow-up',
            enabled: true,
            trigger: {
              type: 'schedule',
              schedule: '0 10 * * *',
            },
            actions: [
              {
                id: 'find-completed',
                type: 'set_variable',
                config: {
                  name: 'yesterdayShowings',
                  query: 'showing.where(date == yesterday && status == completed)',
                },
              },
              {
                id: 'send-followups',
                type: 'loop',
                config: {},
                items: '$yesterdayShowings',
                itemActions: [
                  {
                    id: 'send-email',
                    type: 'send_email',
                    config: {
                      to: '$item.client.email',
                      template: 'showing_followup',
                      subject: 'Thank you for viewing $item.property.title',
                    },
                  },
                ],
              },
            ],
          });
        }
        break;
    }

    return workflows;
  }

  // ============================================================
  // CONVERSION HELPERS
  // ============================================================

  private convertTrigger(trigger: InferredWorkflow['trigger']): UnifiedWorkflow['trigger'] {
    const typeMap: Record<string, UnifiedWorkflow['trigger']['type']> = {
      'form_submit': 'form_submit',
      'button_click': 'button_click',
      'record_create': 'record_create',
      'record_update': 'record_update',
      'record_delete': 'record_delete',
      'schedule': 'schedule',
      'webhook': 'webhook',
    };

    return {
      type: typeMap[trigger.type] || 'button_click',
      entityId: trigger.entityId,
      componentId: trigger.componentId,
      schedule: trigger.schedule,
    };
  }

  private convertStep(step: InferredWorkflow['steps'][number]): UnifiedWorkflowAction {
    const typeMap: Record<string, UnifiedWorkflowAction['type']> = {
      'create': 'create_record',
      'update': 'update_record',
      'delete': 'delete_record',
      'notify': 'show_notification',
      'email': 'send_email',
      'navigate': 'navigate',
      'condition': 'conditional',
      'wait': 'wait',
      'webhook': 'call_api',
    };

    return {
      id: step.id,
      type: typeMap[step.type] || 'set_variable',
      config: step.config,
    };
  }
}
