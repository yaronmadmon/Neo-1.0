/**
 * App Analysis Types
 * Type definitions for app insights and improvement plans
 */

import type { UnifiedAppSchema } from '../dna/schema.js';

export interface AppInsight {
  id: string;
  category:
    | "structure"
    | "data_model"
    | "workflows"
    | "integrations"
    | "permissions"
    | "theme"
    | "usability"
    | "performance"
    | "industry_fit";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  suggestion?: string;
  autoFixable?: boolean;
  relatedEntityId?: string;
  relatedPageId?: string;
  relatedWorkflowId?: string;
}

export interface ProposedChange {
  id: string;
  type:
    | "add_page"
    | "add_workflow"
    | "add_field"
    | "add_entity"
    | "add_integration"
    | "tighten_permissions"
    | "improve_theme"
    | "improve_layout"
    | "add_dashboard"
    | "add_list_view"
    | "add_detail_view"
    | "add_form_view"
    | "add_search"
    | "add_filters";
  description: string;
  insightId: string;
  previewDiff?: any; // blueprint-level diff
  estimatedImpact?: "low" | "medium" | "high";
  requiresConfirmation?: boolean;
}

export interface AppImprovementPlan {
  id: string;
  summary: string;
  insights: AppInsight[];
  proposedChanges: ProposedChange[];
  overallHealth: "excellent" | "good" | "fair" | "needs_improvement" | "critical";
  healthScore: number; // 0-100
  industryRecommendations?: string[];
}

export interface AppMetrics {
  totalPages: number;
  totalEntities: number;
  totalWorkflows: number;
  totalIntegrations: number;
  hasDashboard: boolean;
  hasListViews: boolean;
  hasDetailViews: boolean;
  hasForms: boolean;
  hasSearch: boolean;
  hasFilters: boolean;
  hasPermissions: boolean;
  hasCustomTheme: boolean;
  averageFieldsPerEntity: number;
  workflowsPerEntity: number;
  integrationCoverage: number; // 0-1
}

export interface AppAnalysisContext {
  app: UnifiedAppSchema;
  metrics: AppMetrics;
  industry?: string;
  behavior?: string;
}
