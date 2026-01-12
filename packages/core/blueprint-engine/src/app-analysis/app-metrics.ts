/**
 * App Metrics Calculator
 * Calculates quantitative metrics about an app
 */

import type { UnifiedAppSchema } from '../dna/schema.js';
import type { AppMetrics } from './types.js';

export function calculateAppMetrics(app: UnifiedAppSchema): AppMetrics {
  const pages = app.pages || [];
  const entities = app.entities || [];
  const workflows = app.workflows || [];
  const integrations = app.integrations || [];

  // Page type analysis
  const hasDashboard = pages.some(p => p.type === 'dashboard');
  const hasListViews = pages.some(p => p.type === 'list' || p.type === 'table');
  const hasDetailViews = pages.some(p => p.type === 'detail');
  const hasForms = pages.some(p => p.type === 'form');
  const hasSearch = pages.some(p => p.config?.search?.enabled);
  const hasFilters = pages.some(p => p.config?.filters && p.config.filters.length > 0);

  // Entity analysis
  const totalFields = entities.reduce((sum, e) => sum + (e.fields?.length || 0), 0);
  const averageFieldsPerEntity = entities.length > 0 ? totalFields / entities.length : 0;

  // Workflow analysis
  const workflowsPerEntity = entities.length > 0 ? workflows.length / entities.length : 0;

  // Integration analysis
  const enabledIntegrations = integrations.filter(i => i.enabled).length;
  const integrationCoverage = integrations.length > 0 ? enabledIntegrations / integrations.length : 0;

  // Permissions
  const hasPermissions = !!app.permissions && 
    (app.permissions.rules?.length > 0 || app.permissions.defaultRole !== 'public');

  // Theme
  const hasCustomTheme = !!(app.theme?.colors?.primary && 
    app.theme.colors.primary !== '#3b82f6'); // Not default blue

  return {
    totalPages: pages.length,
    totalEntities: entities.length,
    totalWorkflows: workflows.length,
    totalIntegrations: integrations.length,
    hasDashboard,
    hasListViews,
    hasDetailViews,
    hasForms,
    hasSearch,
    hasFilters,
    hasPermissions,
    hasCustomTheme,
    averageFieldsPerEntity,
    workflowsPerEntity,
    integrationCoverage,
  };
}
