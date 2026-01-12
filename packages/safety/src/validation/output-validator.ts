import { z } from 'zod';
import type { App, UserIntent, SafetyResult } from '@neo/contracts';
import { ValidationError, SecurityError } from '@neo/contracts';

export interface ValidationResult {
  safe: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  violations?: Array<{ type: string; severity: string; message: string }>;
}

export class OutputValidator {
  private readonly dangerousPatterns: RegExp[] = [
    /<script/i,
    /on\w+\s*=/i,
    /javascript:/i,
    /data:text\/html/i,
    /eval\(/i,
    /Function\(/i,
    /new Function/i,
    /import\(/i,
    /require\(/i,
  ];

  async validateAppStructure(output: unknown): Promise<App> {
    try {
      // Import AppSchema dynamically to avoid circular dependency
      const { AppSchema } = await import('@neo/contracts');
      
      // Strict schema validation
      const validated = AppSchema.parse(output);

      // Additional security checks
      this.checkForSecurityIssues(validated);

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('AI output does not match expected schema', error.errors);
      }
      throw error;
    }
  }

  async validateIntent(intent: unknown): Promise<{ valid: boolean; intent?: UserIntent }> {
    try {
      const { UserIntentSchema } = await import('@neo/contracts');
      const validated = UserIntentSchema.parse(intent);
      return { valid: true, intent: validated };
    } catch (error) {
      return { valid: false };
    }
  }

  private checkForSecurityIssues(app: App): void {
    // Check for XSS vectors in component props
    app.schema.pages.forEach((page) => {
      if (this.detectXSSVectors(page)) {
        throw new SecurityError('Potential XSS vector detected in page components', 'critical');
      }
    });

    // Limit nesting depth
    const maxDepth = this.calculateMaxDepth(app);
    if (maxDepth > 10) {
      throw new ValidationError('Component tree too deep. Maximum depth is 10 levels');
    }

    // Check for excessive resource usage
    if (app.schema.pages.length > 100) {
      throw new ValidationError('Too many pages. Maximum is 100 pages');
    }

    if (app.schema.dataModels.length > 50) {
      throw new ValidationError('Too many data models. Maximum is 50 models');
    }
  }

  private detectXSSVectors(page: Record<string, unknown>): boolean {
    const dangerousPatterns = [
      /<script/i,
      /on\w+\s*=/i,
      /javascript:/i,
      /data:text\/html/i,
    ];

    const pageString = JSON.stringify(page);
    return dangerousPatterns.some((pattern) => pattern.test(pageString));
  }

  private calculateMaxDepth(app: App, maxDepth: number = 0, currentDepth: number = 0): number {
    for (const page of app.schema.pages) {
      const depth = this.calculateComponentDepth(page.components, currentDepth);
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }

  private calculateComponentDepth(
    components: any[],
    currentDepth: number
  ): number {
    if (!components || components.length === 0) {
      return currentDepth;
    }

    let maxChildDepth = currentDepth;
    for (const component of components) {
      const childDepth = this.calculateComponentDepth(
        component.children || [],
        currentDepth + 1
      );
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return maxChildDepth;
  }
}
