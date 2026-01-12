import type { App, SafetyResult } from '@neo/contracts';
import { PromptSanitizer } from './validation/prompt-sanitizer.js';
import { OutputValidator } from './validation/output-validator.js';
import { ContentModerator } from './moderation/content-moderator.js';

interface SafetyCheck {
  safe: boolean;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export class SafetyOrchestrator {
  constructor(
    private promptSanitizer: PromptSanitizer,
    private outputValidator: OutputValidator,
    private contentModerator: ContentModerator
  ) {}

  async validateEndToEnd(
    userInput: string,
    aiOutput: unknown,
    generatedCode?: string
  ): Promise<SafetyResult> {
    const checks: Promise<SafetyCheck>[] = [];

    // 1. Input sanitization
    checks.push(
      (async () => {
        try {
          this.promptSanitizer.sanitizeUserInput(userInput);
          return { safe: true, type: 'input', severity: 'low', message: 'OK' };
        } catch (error: any) {
          return {
            safe: false,
            type: 'input',
            severity: 'high',
            message: error.message || 'Input sanitization failed',
          };
        }
      })()
    );

    // 2. Content moderation
    checks.push(
      (async () => {
        const result = await this.contentModerator.moderateRequest(userInput);
        if (!result.allowed) {
          return {
            safe: false,
            type: 'moderation',
            severity: result.severity || 'high',
            message: result.reason || 'Content moderation failed',
          };
        }
        return { safe: true, type: 'moderation', severity: 'low', message: 'OK' };
      })()
    );

    // 3. Output validation
    checks.push(
      (async () => {
        try {
          await this.outputValidator.validateAppStructure(aiOutput);
          return { safe: true, type: 'output', severity: 'low', message: 'OK' };
        } catch (error: any) {
          return {
            safe: false,
            type: 'output',
            severity: 'critical',
            message: error.message || 'Output validation failed',
          };
        }
      })()
    );

    // 4. Generated app moderation
    checks.push(
      (async () => {
        try {
          const { AppSchema } = await import('@neo/contracts');
          const app = AppSchema.parse(aiOutput);
          const result = await this.contentModerator.moderateGeneratedApp(app);
          if (!result.allowed) {
            return {
              safe: false,
              type: 'app-moderation',
              severity: result.severity || 'high',
              message: result.reason || 'App content moderation failed',
            };
          }
          return { safe: true, type: 'app-moderation', severity: 'low', message: 'OK' };
        } catch {
          return { safe: true, type: 'app-moderation', severity: 'low', message: 'OK' };
        }
      })()
    );

    const results = await Promise.allSettled(checks);
    const failures = results
      .filter((r) => r.status === 'fulfilled' && !r.value.safe)
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((v): v is SafetyCheck => v !== null);

    if (failures.length > 0) {
      return {
        safe: false,
        blocked: failures.some((f) => f.severity === 'critical' || f.severity === 'high'),
        violations: failures.map((f) => ({
          type: f.type,
          severity: f.severity,
          message: f.message,
        })),
      };
    }

    return { safe: true, blocked: false };
  }

  async validateApp(app: App): Promise<SafetyResult> {
    const checks: Promise<SafetyCheck>[] = [
      this.validateSchema(app),
      this.checkForXSS(app),
      this.checkResourceLimits(app),
    ];

    const results = await Promise.allSettled(checks);
    const failures = results
      .filter((r) => r.status === 'fulfilled' && !r.value.safe)
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((v): v is SafetyCheck => v !== null);

    if (failures.length > 0) {
      return {
        safe: false,
        blocked: failures.some((f) => f.severity === 'critical' || f.severity === 'high'),
        violations: failures.map((f) => ({
          type: f.type,
          severity: f.severity,
          message: f.message,
        })),
      };
    }

    return { safe: true, blocked: false };
  }

  private async validateSchema(app: App): Promise<SafetyCheck> {
    const maxDepth = this.calculateMaxDepth(app);
    if (maxDepth > 10) {
      return {
        safe: false,
        type: 'schema',
        severity: 'medium',
        message: 'Schema too deep. Maximum depth is 10 levels',
      };
    }
    return { safe: true, type: 'schema', severity: 'low', message: 'OK' };
  }

  private async checkForXSS(app: App): Promise<SafetyCheck> {
    const dangerousPatterns = [/<script/i, /on\w+\s*=/i, /javascript:/i];
    const appString = JSON.stringify(app);

    for (const pattern of dangerousPatterns) {
      if (pattern.test(appString)) {
        return {
          safe: false,
          type: 'xss',
          severity: 'critical',
          message: 'XSS vector detected',
        };
      }
    }
    return { safe: true, type: 'xss', severity: 'low', message: 'OK' };
  }

  private async checkResourceLimits(app: App): Promise<SafetyCheck> {
    if (app.schema.pages.length > 100) {
      return {
        safe: false,
        type: 'resource',
        severity: 'medium',
        message: 'Too many pages. Maximum is 100',
      };
    }
    return { safe: true, type: 'resource', severity: 'low', message: 'OK' };
  }

  private calculateMaxDepth(app: App, maxDepth: number = 0, currentDepth: number = 0): number {
    for (const page of app.schema.pages) {
      const depth = this.calculateComponentDepth(page.components || [], currentDepth);
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }

  private calculateComponentDepth(components: any[], currentDepth: number): number {
    if (!components || components.length === 0) {
      return currentDepth;
    }

    let maxChildDepth = currentDepth;
    for (const component of components) {
      const childDepth = this.calculateComponentDepth(component.children || [], currentDepth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth;
  }
}
