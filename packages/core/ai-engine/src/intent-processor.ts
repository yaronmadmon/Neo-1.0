import type { UserIntent, SafetyResult } from '@neo/contracts';
import { PromptSanitizer } from '@neo/safety';
import { ContentModerator } from '@neo/safety';
import { OutputValidator } from '@neo/safety';
import type { AIProvider } from './providers/types.js';
import { UserIntentSchema } from '@neo/contracts';

export class IntentProcessor {
  constructor(
    private promptSanitizer: PromptSanitizer,
    private contentModerator: ContentModerator,
    private outputValidator: OutputValidator,
    private aiProvider: AIProvider
  ) {}

  async processIntent(
    rawInput: string,
    context?: Record<string, unknown>
  ): Promise<{ intent: UserIntent | null; safety: SafetyResult }> {
    // Validate input
    if (!rawInput || typeof rawInput !== 'string' || rawInput.trim().length === 0) {
      return {
        intent: null,
        safety: {
          safe: false,
          blocked: false,
          violations: [
            {
              type: 'input_validation',
              severity: 'medium',
              message: 'Input is required and cannot be empty',
            },
          ],
        },
      };
    }
    
    // Step 1: Safety check - Content moderation
    const moderationResult = await this.contentModerator.moderateRequest(rawInput);
    if (!moderationResult.allowed) {
      return {
        intent: null,
        safety: {
          safe: false,
          blocked: true,
          violations: [
            {
              type: 'content_moderation',
              severity: 'high',
              message: moderationResult.reason || 'Content moderation failed',
            },
          ],
        },
      };
    }

    // Step 2: Sanitize input
    let sanitized;
    try {
      sanitized = this.promptSanitizer.sanitizeUserInput(rawInput);
    } catch (error: any) {
      return {
        intent: null,
        safety: {
          safe: false,
          blocked: true,
          violations: [
            {
              type: 'input_sanitization',
              severity: 'high',
              message: error.message || 'Input sanitization failed',
            },
          ],
        },
      };
    }

    // Step 3: Parse intent with AI (with safety bounds)
    const intent = await this.parseIntentSafely(sanitized.sanitized, context);

    // Step 4: Validate intent structure
    const validation = await this.outputValidator.validateIntent(intent);

    if (!validation.valid || !validation.intent) {
      return {
        intent: null,
        safety: {
          safe: false,
          blocked: false,
          violations: [
            {
              type: 'intent_validation',
              severity: 'medium',
              message: 'Failed to parse valid intent from input',
            },
          ],
        },
      };
    }

    return {
      intent: validation.intent,
      safety: { safe: true, blocked: false },
    };
  }

  private async parseIntentSafely(
    input: string,
    context?: Record<string, unknown>
  ): Promise<unknown> {
    const prompt = this.buildSafePrompt(input, context);

    try {
      const response = await Promise.race([
        this.aiProvider.complete(
          {
            prompt,
            systemPrompt: this.getSystemPrompt(),
            maxTokens: 1000,
            temperature: 0.3, // Lower = more deterministic
            timeout: 15000, // 15s timeout
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['create_app', 'modify_app', 'add_feature', 'change_design', 'add_data', 'create_flow', 'add_integration'] },
                input: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['type', 'input'],
            },
          },
          undefined // No cost callback for intent processing
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 15000)
        ),
      ]);

      // Ensure response has required fields
      if (typeof response === 'object' && response !== null) {
        const parsed = response as any;
        return {
          type: parsed.type || 'create_app',
          input: parsed.input || input,
          confidence: parsed.confidence ?? 0.8,
        };
      }

      return this.fallbackIntentClassification(input);
    } catch (error: any) {
      // Fallback to simple intent classification
      return this.fallbackIntentClassification(input);
    }
  }

  private getSystemPrompt(): string {
    return `You are an app creation assistant. Analyze user input and classify their intent.

Available intent types:
- create_app: User wants to create a new app
- modify_app: User wants to modify an existing app
- add_feature: User wants to add a feature to an app
- change_design: User wants to change colors, theme, or layout
- add_data: User wants to add data or records
- create_flow: User wants to create a workflow or process
- add_integration: User wants to integrate with external services

Return a JSON object with:
- type: one of the intent types above
- input: the user's original input
- confidence: number between 0 and 1 indicating your confidence

Be precise and choose the most appropriate intent type.`;
  }

  private buildSafePrompt(input: string, context?: Record<string, unknown>): string {
    const userSection = `User Input: ${input}`;
    const contextSection = context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : '';
    
    return `${userSection}${contextSection}\n\nAnalyze the intent and return the JSON response as specified in the system prompt.`;
  }

  private fallbackIntentClassification(input: string): unknown {
    // Simple keyword-based classification as fallback
    const lower = input.toLowerCase();
    
    let type = 'create_app';
    if (lower.includes('modify') || lower.includes('change') || lower.includes('update')) {
      type = 'modify_app';
    } else if (lower.includes('add') && (lower.includes('feature') || lower.includes('function'))) {
      type = 'add_feature';
    } else if (lower.includes('design') || lower.includes('color') || lower.includes('theme')) {
      type = 'change_design';
    } else if (lower.includes('data') || lower.includes('record') || lower.includes('item')) {
      type = 'add_data';
    } else if (lower.includes('flow') || lower.includes('workflow') || lower.includes('process')) {
      type = 'create_flow';
    } else if (lower.includes('integrate') || lower.includes('connect') || lower.includes('api')) {
      type = 'add_integration';
    }

    return {
      type,
      input,
      confidence: 0.6, // Lower confidence for fallback
    };
  }
}
