import type { EntityDef, WorkflowDef, WorkflowAction } from '../../types.js';
import type { IndustryKit } from '../../kits/industries/types.js';

export interface WorkflowInput {
  entities: EntityDef[];
  kit: IndustryKit;
  modules: string[];
}

export class WorkflowEngine {
  build(input: WorkflowInput): WorkflowDef[] {
    const workflows: WorkflowDef[] = [];

    for (const entity of input.entities) {
      workflows.push(this.createCrudWorkflow(entity));
    }

    for (const rule of input.kit.automationRules) {
      const automation = this.createAutomationWorkflow(rule);
      if (automation) workflows.push(automation);
    }

    return workflows;
  }

  private createCrudWorkflow(entity: EntityDef): WorkflowDef {
    const entityId = entity.id;
    const entityName = entity.name;
    const actions: WorkflowAction[] = [
      {
        id: `${entityId}-create-action`,
        type: 'create_record',
        config: { entityId, source: 'form_data' },
      },
      {
        id: `${entityId}-notify`,
        type: 'show_notification',
        config: { message: `${entityName} saved`, type: 'success' },
      },
      {
        id: `${entityId}-refresh`,
        type: 'refresh_data',
        config: { entityId },
      },
    ];

    return {
      id: `${entityId}-create`,
      name: `Create ${entityName}`,
      enabled: true,
      trigger: {
        type: 'form_submit',
        componentId: `${entityId}-form`,
      },
      actions,
    };
  }

  private createAutomationWorkflow(rule: string): WorkflowDef | null {
    if (/job completed/i.test(rule)) {
      return {
        id: 'job-complete-invoice',
        name: 'Generate invoice on job completion',
        enabled: true,
        trigger: {
          type: 'data_update',
          entityId: 'job',
          condition: "status == 'completed'",
        },
        actions: [
          {
            id: 'auto-invoice',
            type: 'create_record',
            config: { entityId: 'invoice', source: 'current_record' },
          },
          {
            id: 'notify-invoice',
            type: 'show_notification',
            config: { message: 'Invoice generated', type: 'success' },
          },
        ],
      };
    }

    if (/quote accepted/i.test(rule)) {
      return {
        id: 'quote-accepted-job',
        name: 'Create job on quote acceptance',
        enabled: true,
        trigger: {
          type: 'data_update',
          entityId: 'quote',
          condition: "status == 'accepted'",
        },
        actions: [
          {
            id: 'create-job',
            type: 'create_record',
            config: { entityId: 'job', source: 'current_record' },
          },
        ],
      };
    }

    return null;
  }
}
