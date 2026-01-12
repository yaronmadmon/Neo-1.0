/**
 * App Checklist
 * Industry-specific and general app quality checks
 */

import type { UnifiedAppSchema } from '../dna/schema.js';
import type { AppMetrics } from './types.js';

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  check: (app: UnifiedAppSchema, metrics: AppMetrics) => boolean;
  industrySpecific?: string[];
}

export const APP_CHECKLIST: ChecklistItem[] = [
  // Structure checks
  {
    id: 'has_dashboard',
    category: 'structure',
    description: 'App has a dashboard page',
    check: (app, metrics) => metrics.hasDashboard,
  },
  {
    id: 'has_list_views',
    category: 'structure',
    description: 'App has list/table views for entities',
    check: (app, metrics) => metrics.hasListViews,
  },
  {
    id: 'has_detail_views',
    category: 'structure',
    description: 'App has detail views for entities',
    check: (app, metrics) => metrics.hasDetailViews,
  },
  {
    id: 'has_forms',
    category: 'structure',
    description: 'App has form pages for creating/editing',
    check: (app, metrics) => metrics.hasForms,
  },
  {
    id: 'has_search',
    category: 'structure',
    description: 'App has search functionality',
    check: (app, metrics) => metrics.hasSearch,
  },
  {
    id: 'has_filters',
    category: 'structure',
    description: 'App has filtering capabilities',
    check: (app, metrics) => metrics.hasFilters,
  },

  // Data model checks
  {
    id: 'has_primary_entity',
    category: 'data_model',
    description: 'App has at least one entity',
    check: (app, metrics) => metrics.totalEntities > 0,
  },
  {
    id: 'entities_have_fields',
    category: 'data_model',
    description: 'All entities have fields',
    check: (app, metrics) => {
      const entities = app.entities || [];
      return entities.every(e => (e.fields?.length || 0) > 0);
    },
  },
  {
    id: 'has_timestamps',
    category: 'data_model',
    description: 'Entities have timestamp fields',
    check: (app, metrics) => {
      const entities = app.entities || [];
      return entities.some(e => 
        e.fields?.some(f => f.name === 'createdAt' || f.name === 'updatedAt')
      );
    },
  },
  {
    id: 'has_relationships',
    category: 'data_model',
    description: 'App has entity relationships',
    check: (app, metrics) => {
      const entities = app.entities || [];
      return entities.some(e => 
        e.fields?.some(f => f.type === 'reference')
      );
    },
  },

  // Workflow checks
  {
    id: 'has_workflows',
    category: 'workflows',
    description: 'App has automated workflows',
    check: (app, metrics) => metrics.totalWorkflows > 0,
  },
  {
    id: 'has_notification_workflows',
    category: 'workflows',
    description: 'App has notification workflows',
    check: (app, metrics) => {
      const workflows = app.workflows || [];
      return workflows.some(w => 
        w.actions?.some(a => 
          a.type === 'send_email' || a.type === 'send_sms' || a.type === 'show_notification'
        )
      );
    },
  },
  {
    id: 'has_crud_workflows',
    category: 'workflows',
    description: 'App has CRUD operation workflows',
    check: (app, metrics) => {
      const workflows = app.workflows || [];
      return workflows.some(w => 
        w.actions?.some(a => 
          a.type === 'create_record' || a.type === 'update_record' || a.type === 'delete_record'
        )
      );
    },
  },

  // Integration checks
  {
    id: 'has_integrations',
    category: 'integrations',
    description: 'App has external integrations',
    check: (app, metrics) => metrics.totalIntegrations > 0,
  },
  {
    id: 'has_payment_integration',
    category: 'integrations',
    description: 'App has payment integration (for commerce apps)',
    check: (app, metrics) => {
      const integrations = app.integrations || [];
      return integrations.some(i => i.type === 'stripe' && i.enabled);
    },
    industrySpecific: ['ecommerce', 'services', 'marketplace'],
  },
  {
    id: 'has_email_integration',
    category: 'integrations',
    description: 'App has email integration',
    check: (app, metrics) => {
      const integrations = app.integrations || [];
      return integrations.some(i => i.type === 'email' && i.enabled);
    },
  },
  {
    id: 'has_sms_integration',
    category: 'integrations',
    description: 'App has SMS integration (for service apps)',
    check: (app, metrics) => {
      const integrations = app.integrations || [];
      return integrations.some(i => i.type === 'twilio' && i.enabled);
    },
    industrySpecific: ['services', 'plumber', 'fitness', 'real_estate'],
  },
  {
    id: 'has_calendar_integration',
    category: 'integrations',
    description: 'App has calendar integration (for booking apps)',
    check: (app, metrics) => {
      const integrations = app.integrations || [];
      return integrations.some(i => i.type === 'google_calendar' && i.enabled);
    },
    industrySpecific: ['services', 'plumber', 'fitness', 'real_estate'],
  },

  // Permissions checks
  {
    id: 'has_permissions',
    category: 'permissions',
    description: 'App has permission system configured',
    check: (app, metrics) => metrics.hasPermissions,
  },
  {
    id: 'has_role_separation',
    category: 'permissions',
    description: 'App has multiple roles defined',
    check: (app, metrics) => {
      const permissions = app.permissions;
      return !!(permissions && permissions.roles && permissions.roles.length > 1);
    },
  },
  {
    id: 'not_fully_public',
    category: 'permissions',
    description: 'App is not fully public (has some restrictions)',
    check: (app, metrics) => {
      const permissions = app.permissions;
      return !!(permissions && permissions.defaultRole !== 'public');
    },
  },

  // Theme checks
  {
    id: 'has_custom_theme',
    category: 'theme',
    description: 'App has custom theme (not default)',
    check: (app, metrics) => metrics.hasCustomTheme,
  },
];

export function runChecklist(
  app: UnifiedAppSchema,
  metrics: AppMetrics
): { passed: ChecklistItem[]; failed: ChecklistItem[] } {
  const industry = app.industry?.toLowerCase();
  
  const passed: ChecklistItem[] = [];
  const failed: ChecklistItem[] = [];

  for (const item of APP_CHECKLIST) {
    // Skip industry-specific items if not relevant
    if (item.industrySpecific && industry && !item.industrySpecific.includes(industry)) {
      continue;
    }

    if (item.check(app, metrics)) {
      passed.push(item);
    } else {
      failed.push(item);
    }
  }

  return { passed, failed };
}
