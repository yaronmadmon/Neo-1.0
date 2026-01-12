/**
 * App Insights Engine
 * Analyzes apps and generates improvement plans
 */

import type { UnifiedAppSchema } from '../dna/schema.js';
import type { AppInsight, AppImprovementPlan, ProposedChange, AppAnalysisContext } from './types.js';
import { calculateAppMetrics } from './app-metrics.js';
import { runChecklist } from './app-checklist.js';
import { randomUUID } from 'node:crypto';

export class AppInsightsEngine {
  /**
   * Analyze an app and generate improvement plan
   */
  analyzeApp(app: UnifiedAppSchema): AppImprovementPlan {
    const metrics = calculateAppMetrics(app);
    const context: AppAnalysisContext = {
      app,
      metrics,
      industry: app.industry,
      behavior: app.behavior,
    };

    const insights = this.generateInsights(context);
    const proposedChanges = this.generateProposedChanges(context, insights);
    const healthScore = this.calculateHealthScore(metrics, insights);
    const overallHealth = this.getOverallHealth(healthScore);
    const summary = this.generateSummary(context, insights, overallHealth);

    return {
      id: randomUUID(),
      summary,
      insights,
      proposedChanges,
      overallHealth,
      healthScore,
      industryRecommendations: this.getIndustryRecommendations(context),
    };
  }

  /**
   * Generate insights from app analysis
   */
  private generateInsights(context: AppAnalysisContext): AppInsight[] {
    const insights: AppInsight[] = [];
    const { app, metrics } = context;

    // Structure insights
    if (!metrics.hasDashboard && metrics.totalEntities > 0) {
      insights.push({
        id: randomUUID(),
        category: 'structure',
        severity: 'warning',
        title: 'Missing Dashboard',
        description: 'Your app does not have a dashboard page. Dashboards provide an overview of key metrics and data.',
        suggestion: 'Add a dashboard page with key metrics, recent activity, and quick actions.',
        autoFixable: true,
      });
    }

    if (!metrics.hasListViews && metrics.totalEntities > 0) {
      insights.push({
        id: randomUUID(),
        category: 'structure',
        severity: 'critical',
        title: 'Missing List Views',
        description: 'Your app does not have list or table views for entities. Users need to see and browse their data.',
        suggestion: 'Add list/table views for each entity to allow browsing and searching.',
        autoFixable: true,
      });
    }

    if (!metrics.hasDetailViews && metrics.totalEntities > 0) {
      insights.push({
        id: randomUUID(),
        category: 'structure',
        severity: 'warning',
        title: 'Missing Detail Views',
        description: 'Your app does not have detail views. Users need to see full information about individual records.',
        suggestion: 'Add detail views for each entity to show complete record information.',
        autoFixable: true,
      });
    }

    if (!metrics.hasSearch) {
      insights.push({
        id: randomUUID(),
        category: 'usability',
        severity: 'info',
        title: 'No Search Functionality',
        description: 'Your app does not have search functionality. Users may struggle to find specific records.',
        suggestion: 'Add search to list views to help users find records quickly.',
        autoFixable: true,
      });
    }

    // Data model insights
    if (metrics.totalEntities === 0) {
      insights.push({
        id: randomUUID(),
        category: 'data_model',
        severity: 'critical',
        title: 'No Data Models',
        description: 'Your app does not have any data models. Apps need entities to store and manage data.',
        suggestion: 'Add at least one entity to represent your main data type (e.g., Jobs, Customers, Products).',
        autoFixable: false,
      });
    }

    const entitiesWithoutFields = (app.entities || []).filter(e => (e.fields?.length || 0) === 0);
    if (entitiesWithoutFields.length > 0) {
      insights.push({
        id: randomUUID(),
        category: 'data_model',
        severity: 'critical',
        title: 'Entities Without Fields',
        description: `Some entities (${entitiesWithoutFields.map(e => e.name).join(', ')}) have no fields defined.`,
        suggestion: 'Add fields to all entities to store meaningful data.',
        autoFixable: false,
      });
    }

    // Workflow insights
    if (metrics.totalWorkflows === 0 && metrics.totalEntities > 0) {
      insights.push({
        id: randomUUID(),
        category: 'workflows',
        severity: 'warning',
        title: 'No Automated Workflows',
        description: 'Your app does not have any automated workflows. Workflows can automate tasks and send notifications.',
        suggestion: 'Add workflows for common tasks like sending confirmation emails, creating calendar events, or updating statuses.',
        autoFixable: false,
      });
    }

    // Integration insights
    const hasInvoices = (app.entities || []).some(e => 
      e.name.toLowerCase().includes('invoice') || e.name.toLowerCase().includes('payment')
    );
    if (hasInvoices && !metrics.totalIntegrations) {
      insights.push({
        id: randomUUID(),
        category: 'integrations',
        severity: 'warning',
        title: 'Invoices Without Payment Integration',
        description: 'Your app has invoice/payment entities but no payment integration (e.g., Stripe).',
        suggestion: 'Connect Stripe to enable payment processing for invoices.',
        autoFixable: false,
      });
    }

    const hasBookings = (app.entities || []).some(e => 
      e.name.toLowerCase().includes('booking') || e.name.toLowerCase().includes('appointment')
    );
    if (hasBookings) {
      const hasCalendar = (app.integrations || []).some(i => i.type === 'google_calendar' && i.enabled);
      if (!hasCalendar) {
        insights.push({
          id: randomUUID(),
          category: 'integrations',
          severity: 'info',
          title: 'Bookings Without Calendar Integration',
          description: 'Your app has bookings/appointments but no calendar integration.',
          suggestion: 'Connect Google Calendar to automatically create calendar events for bookings.',
          autoFixable: false,
        });
      }

      const hasSMS = (app.integrations || []).some(i => i.type === 'twilio' && i.enabled);
      if (!hasSMS) {
        insights.push({
          id: randomUUID(),
          category: 'integrations',
          severity: 'info',
          title: 'Bookings Without SMS Notifications',
          description: 'Your app has bookings but no SMS integration for reminders.',
          suggestion: 'Connect Twilio to send SMS reminders for bookings.',
          autoFixable: false,
        });
      }
    }

    // Permissions insights
    if (!metrics.hasPermissions) {
      insights.push({
        id: randomUUID(),
        category: 'permissions',
        severity: 'warning',
        title: 'No Permission System',
        description: 'Your app does not have a permission system configured. All data may be publicly accessible.',
        suggestion: 'Configure permissions to control who can view and edit data.',
        autoFixable: true,
      });
    } else {
      const permissions = app.permissions;
      if (permissions && permissions.defaultRole === 'public') {
        insights.push({
          id: randomUUID(),
          category: 'permissions',
          severity: 'warning',
          title: 'Default Public Access',
          description: 'Your app defaults to public access. Consider restricting default access.',
          suggestion: 'Change default role to "viewer" or "editor" instead of "public".',
          autoFixable: true,
        });
      }
    }

    // Theme insights
    if (!metrics.hasCustomTheme) {
      insights.push({
        id: randomUUID(),
        category: 'theme',
        severity: 'info',
        title: 'Using Default Theme',
        description: 'Your app is using the default theme. Customizing the theme can improve brand identity.',
        suggestion: 'Customize colors, fonts, and spacing to match your brand.',
        autoFixable: false,
      });
    }

    return insights;
  }

  /**
   * Generate proposed changes from insights
   */
  private generateProposedChanges(
    context: AppAnalysisContext,
    insights: AppInsight[]
  ): ProposedChange[] {
    const changes: ProposedChange[] = [];

    for (const insight of insights) {
      if (insight.category === 'structure' && insight.title === 'Missing Dashboard') {
        changes.push({
          id: randomUUID(),
          type: 'add_dashboard',
          description: 'Add a dashboard page with key metrics and recent activity',
          insightId: insight.id,
          estimatedImpact: 'high',
          requiresConfirmation: false,
        });
      }

      if (insight.category === 'structure' && insight.title === 'Missing List Views') {
        const entities = context.app.entities || [];
        for (const entity of entities) {
          changes.push({
            id: randomUUID(),
            type: 'add_list_view',
            description: `Add list view for ${entity.name}`,
            insightId: insight.id,
            estimatedImpact: 'high',
            requiresConfirmation: false,
            previewDiff: { entityId: entity.id },
          });
        }
      }

      if (insight.category === 'structure' && insight.title === 'Missing Detail Views') {
        const entities = context.app.entities || [];
        for (const entity of entities) {
          changes.push({
            id: randomUUID(),
            type: 'add_detail_view',
            description: `Add detail view for ${entity.name}`,
            insightId: insight.id,
            estimatedImpact: 'medium',
            requiresConfirmation: false,
            previewDiff: { entityId: entity.id },
          });
        }
      }

      if (insight.category === 'usability' && insight.title === 'No Search Functionality') {
        changes.push({
          id: randomUUID(),
          type: 'add_search',
          description: 'Add search functionality to list views',
          insightId: insight.id,
          estimatedImpact: 'medium',
          requiresConfirmation: false,
        });
      }

      if (insight.category === 'permissions' && insight.title === 'No Permission System') {
        changes.push({
          id: randomUUID(),
          type: 'tighten_permissions',
          description: 'Configure basic permission system with roles',
          insightId: insight.id,
          estimatedImpact: 'high',
          requiresConfirmation: true,
        });
      }

      if (insight.category === 'integrations' && insight.title.includes('Stripe')) {
        changes.push({
          id: randomUUID(),
          type: 'add_integration',
          description: 'Add Stripe payment integration',
          insightId: insight.id,
          estimatedImpact: 'high',
          requiresConfirmation: false,
          previewDiff: { providerId: 'stripe' },
        });
      }

      if (insight.category === 'integrations' && insight.title.includes('Calendar')) {
        changes.push({
          id: randomUUID(),
          type: 'add_integration',
          description: 'Add Google Calendar integration',
          insightId: insight.id,
          estimatedImpact: 'medium',
          requiresConfirmation: false,
          previewDiff: { providerId: 'google_calendar' },
        });
      }
    }

    return changes;
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(metrics: any, insights: AppInsight[]): number {
    let score = 100;

    // Deduct for critical issues
    const criticalCount = insights.filter(i => i.severity === 'critical').length;
    score -= criticalCount * 15;

    // Deduct for warnings
    const warningCount = insights.filter(i => i.severity === 'warning').length;
    score -= warningCount * 5;

    // Deduct for info issues
    const infoCount = insights.filter(i => i.severity === 'info').length;
    score -= infoCount * 2;

    // Bonus for good metrics
    if (metrics.hasDashboard) score += 5;
    if (metrics.hasListViews) score += 10;
    if (metrics.hasDetailViews) score += 5;
    if (metrics.hasSearch) score += 3;
    if (metrics.hasPermissions) score += 5;
    if (metrics.hasCustomTheme) score += 2;
    if (metrics.totalWorkflows > 0) score += 5;
    if (metrics.totalIntegrations > 0) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get overall health rating
   */
  private getOverallHealth(score: number): AppImprovementPlan['overallHealth'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'needs_improvement';
    return 'critical';
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    context: AppAnalysisContext,
    insights: AppInsight[],
    health: AppImprovementPlan['overallHealth']
  ): string {
    const critical = insights.filter(i => i.severity === 'critical').length;
    const warnings = insights.filter(i => i.severity === 'warning').length;
    const info = insights.filter(i => i.severity === 'info').length;

    const parts: string[] = [];
    
    if (health === 'excellent') {
      parts.push('Your app is in excellent shape!');
    } else if (health === 'good') {
      parts.push('Your app is in good shape with some room for improvement.');
    } else if (health === 'fair') {
      parts.push('Your app has a solid foundation but needs some improvements.');
    } else if (health === 'needs_improvement') {
      parts.push('Your app needs significant improvements before production.');
    } else {
      parts.push('Your app has critical issues that should be addressed.');
    }

    if (critical > 0) {
      parts.push(`There are ${critical} critical issue${critical > 1 ? 's' : ''} to address.`);
    }
    if (warnings > 0) {
      parts.push(`${warnings} warning${warnings > 1 ? 's' : ''} should be reviewed.`);
    }
    if (info > 0) {
      parts.push(`${info} suggestion${info > 1 ? 's' : ''} for enhancement.`);
    }

    return parts.join(' ');
  }

  /**
   * Get industry-specific recommendations
   */
  private getIndustryRecommendations(context: AppAnalysisContext): string[] {
    const recommendations: string[] = [];
    const industry = context.industry?.toLowerCase();

    if (industry === 'plumber' || industry === 'services') {
      recommendations.push('Consider adding SMS reminders for appointments');
      recommendations.push('Add calendar integration for scheduling');
      recommendations.push('Include customer contact information fields');
    }

    if (industry === 'ecommerce' || industry === 'marketplace') {
      recommendations.push('Add payment integration (Stripe) for transactions');
      recommendations.push('Include product image fields');
      recommendations.push('Add order status tracking');
    }

    if (industry === 'fitness') {
      recommendations.push('Add calendar integration for class scheduling');
      recommendations.push('Include member check-in functionality');
      recommendations.push('Add progress tracking fields');
    }

    return recommendations;
  }
}

export const appInsightsEngine = new AppInsightsEngine();
