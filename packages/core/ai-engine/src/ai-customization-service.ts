/**
 * AI Customization Service (Call 2)
 * Generates customizations based on kit, context, and primary intent
 */

import type { AIProvider } from './providers/types.js';
import type { UnderstandingResult, PrimaryIntent, ExtractedContext } from './ai-understanding-service.js';
import { 
  CustomizationWhitelist, 
  createWhitelist,
  type CustomizationSpec,
  type FilteredCustomizationSpec,
  CUSTOMIZATION_WHITELIST,
} from './customization-whitelist.js';

/**
 * Industry kit interface (minimal for customization)
 */
export interface IndustryKitInfo {
  id: string;
  name: string;
  entities: Array<{
    id: string;
    name: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  }>;
  pageTypes: string[];
  workflows: string[];
}

/**
 * Customization input from understanding phase
 */
export interface CustomizationInput {
  kit: IndustryKitInfo;
  understanding: UnderstandingResult;
  originalInput: string;
}

/**
 * Customization output
 */
export interface CustomizationOutput {
  spec: FilteredCustomizationSpec;
  reasoning: string;
  appliedCustomizations: string[];
  warnings: string[];
}

/**
 * Intent-based customization presets
 */
const INTENT_PRESETS: Record<PrimaryIntent, {
  focusAreas: string[];
  emphasize: string[];
  deemphasize: string[];
}> = {
  'operations': {
    focusAreas: ['workflow automation', 'internal dashboards', 'task management', 'reporting'],
    emphasize: ['staff views', 'admin panels', 'analytics', 'internal tools'],
    deemphasize: ['public pages', 'customer portals', 'booking widgets'],
  },
  'customer-facing': {
    focusAreas: ['booking portals', 'customer communication', 'public views', 'self-service'],
    emphasize: ['booking pages', 'customer portal', 'public forms', 'notifications'],
    deemphasize: ['complex internal workflows', 'admin-only features'],
  },
  'internal': {
    focusAreas: ['team management', 'internal communication', 'staff scheduling', 'access control'],
    emphasize: ['team views', 'internal dashboards', 'permission controls'],
    deemphasize: ['customer-facing pages', 'public booking'],
  },
  'hybrid': {
    focusAreas: ['full business operations', 'both internal and external', 'end-to-end workflows'],
    emphasize: ['customer portal', 'staff dashboard', 'integrated workflows'],
    deemphasize: [],
  },
};

export class AICustomizationService {
  private whitelist: CustomizationWhitelist;

  constructor(private aiProvider: AIProvider) {
    this.whitelist = createWhitelist();
  }

  /**
   * Generate customizations for the app
   */
  async customize(input: CustomizationInput): Promise<CustomizationOutput> {
    try {
      // Get AI-generated customizations
      const rawSpec = await this.generateCustomizations(input);
      
      // Filter through whitelist
      const filteredSpec = this.whitelist.filter(rawSpec);

      // Generate reasoning and applied list
      const { reasoning, appliedCustomizations } = this.summarizeCustomizations(filteredSpec, input);

      // Generate warnings for dropped operations
      const warnings = filteredSpec.droppedOperations.length > 0
        ? [`${filteredSpec.droppedOperations.length} customization(s) were filtered out for safety`]
        : [];

      return {
        spec: filteredSpec,
        reasoning,
        appliedCustomizations,
        warnings,
      };
    } catch (error) {
      // Fallback to preset-based customization
      return this.fallbackCustomization(input);
    }
  }

  private async generateCustomizations(input: CustomizationInput): Promise<CustomizationSpec> {
    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    const response = await this.aiProvider.complete({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 3000,
      temperature: 0.4,
      timeout: 30000,
      schema: this.getCustomizationSchema(),
    });

    return response as CustomizationSpec;
  }

  private buildSystemPrompt(input: CustomizationInput): string {
    const intent = input.understanding.primaryIntent;
    const preset = INTENT_PRESETS[intent];
    const allowedOps = this.whitelist.getAllowedOperations();

    return `You are an intelligent app customization assistant. Your task is to generate customizations for a business app based on user requirements.

BASE KIT: ${input.kit.name} (${input.kit.id})
PRIMARY INTENT: ${intent}

INTENT FOCUS AREAS:
${preset.focusAreas.map(f => `- ${f}`).join('\n')}

EMPHASIZE:
${preset.emphasize.map(e => `- ${e}`).join('\n')}

DE-EMPHASIZE:
${preset.deemphasize.map(d => `- ${d}`).join('\n')}

ALLOWED ENTITY OPERATIONS:
${allowedOps.entity.operations.join(', ')}

ALLOWED PAGE OPERATIONS:
${allowedOps.page.operations.join(', ')}

ALLOWED WORKFLOW TRIGGERS:
${allowedOps.workflow.triggers.join(', ')}

ALLOWED WORKFLOW ACTIONS:
${allowedOps.workflow.actions.join(', ')}

ALLOWED FIELD TYPES:
${allowedOps.field.allowedTypes.join(', ')}

RULES:
1. Only use operations from the allowed lists above
2. Keep customizations focused and relevant to the user's needs
3. Don't add unnecessary complexity
4. Respect the kit's existing structure - enhance, don't replace
5. Maximum ${allowedOps.entity.maxFieldsPerEntity} fields per entity
6. Maximum ${allowedOps.workflow.maxWorkflows} workflows total
7. Consider the primary intent when deciding what to emphasize

Return a JSON object with customizations following the schema.`;
  }

  private buildUserPrompt(input: CustomizationInput): string {
    const { understanding, originalInput, kit } = input;

    let prompt = `ORIGINAL USER REQUEST:
"${originalInput}"

EXTRACTED UNDERSTANDING:
- Industry: ${understanding.industry}
- Primary Intent: ${understanding.primaryIntent}
- Confidence: ${understanding.confidence}
- Context: ${JSON.stringify(understanding.context, null, 2)}

BASE KIT ENTITIES:
${kit.entities.map(e => `- ${e.name} (${e.id}): ${e.fields.map(f => f.name).join(', ')}`).join('\n')}

BASE KIT PAGE TYPES:
${kit.pageTypes.join(', ')}

BASE KIT WORKFLOWS:
${kit.workflows.join(', ')}

Generate customizations that enhance this base kit for the user's specific needs.
Focus on:
1. Any missing fields that would be valuable
2. Any workflows that would automate their work
3. Page customizations that improve their workflow
4. Theme adjustments that match their industry/brand`;

    // Add context-specific guidance
    if (understanding.context.features && understanding.context.features.length > 0) {
      prompt += `\n\nREQUESTED FEATURES: ${understanding.context.features.join(', ')}`;
    }

    if (understanding.context.teamSize) {
      prompt += `\n\nTEAM SIZE: ${understanding.context.teamSize}`;
      if (understanding.context.teamSize === 'solo') {
        prompt += '\n(Simplify workflows, reduce complexity)';
      } else if (understanding.context.teamSize === 'large') {
        prompt += '\n(Consider team collaboration features, permissions)';
      }
    }

    return prompt;
  }

  private getCustomizationSchema(): object {
    return {
      type: 'object',
      properties: {
        entityModifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityId: { type: 'string' },
              operation: { type: 'string' },
              data: { type: 'object' },
            },
            required: ['entityId', 'operation', 'data'],
          },
        },
        addEntities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                    enumOptions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          value: { type: 'string' },
                          label: { type: 'string' },
                        },
                      },
                    },
                  },
                  required: ['id', 'name', 'type'],
                },
              },
            },
            required: ['id', 'name', 'fields'],
          },
        },
        pageCustomizations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pageId: { type: 'string' },
              operation: { type: 'string' },
              data: { type: 'object' },
            },
            required: ['pageId', 'operation', 'data'],
          },
        },
        workflowAdditions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              trigger: { type: 'string' },
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    config: { type: 'object' },
                  },
                  required: ['type', 'config'],
                },
              },
            },
            required: ['id', 'name', 'trigger', 'actions'],
          },
        },
        themeAdjustments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              customization: { type: 'string' },
              value: {},
            },
            required: ['customization', 'value'],
          },
        },
      },
    };
  }

  private summarizeCustomizations(
    spec: FilteredCustomizationSpec,
    input: CustomizationInput
  ): { reasoning: string; appliedCustomizations: string[] } {
    const applied: string[] = [];
    const parts: string[] = [];

    if (spec.entityModifications && spec.entityModifications.length > 0) {
      applied.push(`${spec.entityModifications.length} entity modification(s)`);
      parts.push(`Modified ${spec.entityModifications.length} existing entities`);
    }

    if (spec.addEntities && spec.addEntities.length > 0) {
      applied.push(`${spec.addEntities.length} new entity/entities`);
      const entityNames = spec.addEntities.map(e => e.name).join(', ');
      parts.push(`Added new entities: ${entityNames}`);
    }

    if (spec.pageCustomizations && spec.pageCustomizations.length > 0) {
      applied.push(`${spec.pageCustomizations.length} page customization(s)`);
      parts.push(`Customized ${spec.pageCustomizations.length} pages`);
    }

    if (spec.workflowAdditions && spec.workflowAdditions.length > 0) {
      applied.push(`${spec.workflowAdditions.length} workflow(s)`);
      const workflowNames = spec.workflowAdditions.map(w => w.name).join(', ');
      parts.push(`Added workflows: ${workflowNames}`);
    }

    if (spec.themeAdjustments && spec.themeAdjustments.length > 0) {
      applied.push(`${spec.themeAdjustments.length} theme adjustment(s)`);
      parts.push('Customized visual theme');
    }

    const reasoning = parts.length > 0
      ? `Customized the ${input.kit.name} template for ${input.understanding.primaryIntent} focus. ${parts.join('. ')}.`
      : `Using the ${input.kit.name} template as-is - it already matches your needs well.`;

    return { reasoning, appliedCustomizations: applied };
  }

  private fallbackCustomization(input: CustomizationInput): CustomizationOutput {
    const preset = INTENT_PRESETS[input.understanding.primaryIntent];
    const spec: CustomizationSpec = {
      entityModifications: [],
      pageCustomizations: [],
      workflowAdditions: [],
      themeAdjustments: [],
    };

    // Add basic workflows based on intent
    if (input.understanding.primaryIntent === 'customer-facing') {
      spec.workflowAdditions = [
        {
          id: 'booking-notification',
          name: 'New Booking Notification',
          trigger: 'onCreate',
          actions: [
            { type: 'notify', config: { message: 'New booking received' } },
            { type: 'sendEmail', config: { template: 'booking-confirmation' } },
          ],
        },
      ];
    } else if (input.understanding.primaryIntent === 'operations') {
      spec.workflowAdditions = [
        {
          id: 'task-reminder',
          name: 'Task Due Reminder',
          trigger: 'scheduled',
          actions: [
            { type: 'notify', config: { message: 'Task due today' } },
          ],
        },
      ];
    }

    // Filter through whitelist
    const filteredSpec = this.whitelist.filter(spec);

    return {
      spec: filteredSpec,
      reasoning: `Applied standard ${input.understanding.primaryIntent} customizations to the ${input.kit.name} template.`,
      appliedCustomizations: spec.workflowAdditions?.map(w => w.name) || [],
      warnings: ['AI customization unavailable - using preset customizations'],
    };
  }
}

/**
 * Create a new customization service
 */
export function createCustomizationService(aiProvider: AIProvider): AICustomizationService {
  return new AICustomizationService(aiProvider);
}
