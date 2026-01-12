/**
 * Voice App Coach
 * Voice-driven AI coach for app improvement suggestions
 */

import type { UnifiedAppSchema } from './dna/schema.js';
import type { AppImprovementPlan } from './app-analysis/types.js';
import { appInsightsEngine } from './app-analysis/app-insights-engine.js';

export interface CoachResponse {
  summary: string;
  plan: AppImprovementPlan;
  spokenSummary: string;
}

export class VoiceAppCoach {
  /**
   * Get improvement suggestions based on a question
   */
  async getSummary(app: UnifiedAppSchema, question: string): Promise<CoachResponse> {
    const normalizedQuestion = question.toLowerCase().trim();

    // Analyze the app
    const plan = appInsightsEngine.analyzeApp(app);

    // Generate spoken summary based on question type
    let spokenSummary = '';
    
    if (normalizedQuestion.includes('improve') || normalizedQuestion.includes('better')) {
      spokenSummary = this.generateImprovementSummary(plan);
    } else if (normalizedQuestion.includes('missing') || normalizedQuestion.includes('need')) {
      spokenSummary = this.generateMissingSummary(plan);
    } else if (normalizedQuestion.includes('production') || normalizedQuestion.includes('ready')) {
      spokenSummary = this.generateProductionReadinessSummary(plan);
    } else if (normalizedQuestion.includes('add') || normalizedQuestion.includes('next')) {
      spokenSummary = this.generateNextStepsSummary(plan);
    } else if (normalizedQuestion.includes('good') || normalizedQuestion.includes('enough')) {
      spokenSummary = this.generateQualitySummary(plan);
    } else {
      // Default: general improvement summary
      spokenSummary = this.generateImprovementSummary(plan);
    }

    return {
      summary: plan.summary,
      plan,
      spokenSummary,
    };
  }

  /**
   * Generate improvement-focused summary
   */
  private generateImprovementSummary(plan: AppImprovementPlan): string {
    const critical = plan.insights.filter(i => i.severity === 'critical').length;
    const warnings = plan.insights.filter(i => i.severity === 'warning').length;
    const autoFixable = plan.proposedChanges.filter(c => !c.requiresConfirmation).length;

    let summary = `Your app has a health score of ${plan.healthScore} out of 100, which is ${plan.overallHealth}. `;

    if (critical > 0) {
      summary += `There are ${critical} critical issue${critical > 1 ? 's' : ''} that need immediate attention. `;
    }

    if (warnings > 0) {
      summary += `${warnings} warning${warnings > 1 ? 's' : ''} should be addressed. `;
    }

    if (autoFixable > 0) {
      summary += `I can automatically fix ${autoFixable} issue${autoFixable > 1 ? 's' : ''} for you. `;
    }

    if (plan.proposedChanges.length > 0) {
      const topChange = plan.proposedChanges[0];
      summary += `The top recommendation is to ${topChange.description.toLowerCase()}. `;
    }

    return summary;
  }

  /**
   * Generate missing features summary
   */
  private generateMissingSummary(plan: AppImprovementPlan): string {
    const critical = plan.insights.filter(i => i.severity === 'critical');
    const missing: string[] = [];

    for (const insight of critical) {
      if (insight.title.includes('Missing')) {
        missing.push(insight.title.replace('Missing ', '').toLowerCase());
      }
    }

    if (missing.length > 0) {
      return `Your app is missing ${missing.join(', ')}. These are critical for a functional app. ` +
             `I can help you add them automatically.`;
    }

    return `Your app has the essential features. There are ${plan.insights.length} suggestions for enhancement.`;
  }

  /**
   * Generate production readiness summary
   */
  private generateProductionReadinessSummary(plan: AppImprovementPlan): string {
    const critical = plan.insights.filter(i => i.severity === 'critical').length;
    const warnings = plan.insights.filter(i => i.severity === 'warning').length;

    if (plan.overallHealth === 'excellent' || plan.overallHealth === 'good') {
      return `Your app is ${plan.overallHealth === 'excellent' ? 'ready' : 'mostly ready'} for production. ` +
             `There are ${warnings} minor improvements recommended.`;
    }

    if (critical > 0) {
      return `Your app is not ready for production. There are ${critical} critical issue${critical > 1 ? 's' : ''} ` +
             `that must be fixed first. I can help you address them.`;
    }

    return `Your app needs some improvements before production. There are ${warnings} important issues to address.`;
  }

  /**
   * Generate next steps summary
   */
  private generateNextStepsSummary(plan: AppImprovementPlan): string {
    if (plan.proposedChanges.length === 0) {
      return 'Your app looks great! No immediate changes needed.';
    }

    const top3 = plan.proposedChanges.slice(0, 3);
    const steps = top3.map((c, i) => `${i + 1}. ${c.description}`).join(' ');

    return `Here are the top ${top3.length} things to add next: ${steps}`;
  }

  /**
   * Generate quality assessment summary
   */
  private generateQualitySummary(plan: AppImprovementPlan): string {
    if (plan.overallHealth === 'excellent') {
      return 'Your app is excellent! It has all the essential features and is well-structured.';
    }

    if (plan.overallHealth === 'good') {
      return 'Your app is good with a solid foundation. There are some enhancements that could make it even better.';
    }

    return `Your app needs improvement. The health score is ${plan.healthScore} out of 100. ` +
           `I can help you improve it with ${plan.proposedChanges.length} suggested changes.`;
  }
}

export const voiceAppCoach = new VoiceAppCoach();
