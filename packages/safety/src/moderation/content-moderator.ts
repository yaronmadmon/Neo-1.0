import type { SafetyResult } from '@neo/contracts';

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  categories?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  patterns?: string[];
}

export class ContentModerator {
  private readonly blockedCategories = [
    'illegal-activity',
    'harmful-content',
    'privacy-violation',
    'fraud',
    'hate-speech',
    'violence',
    'self-harm',
  ];

  private readonly harmfulPatterns: Array<{
    pattern: RegExp;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    {
      pattern: /\b(credit card|ssn|social security|password)\s*(number|code)?\s*[:=]\s*\d+/i,
      category: 'privacy-violation',
      severity: 'high',
    },
    {
      pattern: /\b(hack|crack|exploit|bypass)\s+(security|password|account)/i,
      category: 'illegal-activity',
      severity: 'high',
    },
    // Add more patterns as needed
  ];

  async moderateRequest(input: string): Promise<ModerationResult> {
    // Pattern-based checks (fast, offline)
    const patternResults = this.detectHarmfulPatterns(input);
    if (patternResults.length > 0) {
      return {
        allowed: false,
        reason: 'Harmful patterns detected',
        patterns: patternResults.map((r) => r.category),
        severity: patternResults[0].severity,
        categories: patternResults.map((r) => r.category),
      };
    }

    // TODO: Integrate with AI moderation API (OpenAI Moderation, Perspective API, etc.)
    // For now, pass through if no patterns match
    return { allowed: true };
  }

  async moderateGeneratedApp(app: any): Promise<ModerationResult> {
    // Check app name and description
    const nameCheck = await this.moderateRequest(app.name || '');
    if (!nameCheck.allowed) {
      return nameCheck;
    }

    const descCheck = await this.moderateRequest(app.description || '');
    if (!descCheck.allowed) {
      return descCheck;
    }

    // Check data for sensitive information
    if (app.data) {
      const dataString = JSON.stringify(app.data);
      const dataCheck = this.detectHarmfulPatterns(dataString);
      if (dataCheck.length > 0) {
        return {
          allowed: false,
          reason: 'Sensitive data patterns detected in app data',
          patterns: dataCheck.map((r) => r.category),
          severity: dataCheck[0].severity,
        };
      }
    }

    return { allowed: true };
  }

  private detectHarmfulPatterns(input: string): Array<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const matches: Array<{ category: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [];

    for (const { pattern, category, severity } of this.harmfulPatterns) {
      if (pattern.test(input)) {
        matches.push({ category, severity });
      }
    }

    return matches;
  }
}
