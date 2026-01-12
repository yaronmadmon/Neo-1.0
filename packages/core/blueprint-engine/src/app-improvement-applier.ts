/**
 * App Improvement Applier
 * Safely applies proposed improvements to an app schema
 */

import type { UnifiedAppSchema } from './dna/schema.js';
import type { AppImprovementPlan, ProposedChange } from './app-analysis/types.js';
import { randomUUID } from 'node:crypto';

/**
 * Apply proposed improvements to an app schema
 * Returns a new schema (no mutation)
 */
export function applyAppImprovements(
  app: UnifiedAppSchema,
  plan: AppImprovementPlan,
  changeIdsToApply: string[]
): UnifiedAppSchema {
  // Create a deep copy of the app
  const newApp: UnifiedAppSchema = JSON.parse(JSON.stringify(app));

  // Get the changes to apply
  const changesToApply = plan.proposedChanges.filter(c => changeIdsToApply.includes(c.id));

  // Apply each change
  for (const change of changesToApply) {
    try {
      applyChange(newApp, change);
    } catch (error: any) {
      console.error(`Failed to apply change ${change.id}:`, error);
      // Continue with other changes even if one fails
    }
  }

  // Update metadata
  newApp.version = (newApp.version || 1) + 1;
  if (newApp.metadata) {
    newApp.metadata.updatedAt = new Date().toISOString();
  } else {
    newApp.metadata = {
      updatedAt: new Date().toISOString(),
    };
  }

  return newApp;
}

/**
 * Apply a single change to the app
 */
function applyChange(app: UnifiedAppSchema, change: ProposedChange): void {
  switch (change.type) {
    case 'add_dashboard':
      applyAddDashboard(app);
      break;
    case 'add_list_view':
      applyAddListView(app, change);
      break;
    case 'add_detail_view':
      applyAddDetailView(app, change);
      break;
    case 'add_search':
      applyAddSearch(app);
      break;
    case 'add_filters':
      applyAddFilters(app);
      break;
    case 'tighten_permissions':
      applyTightenPermissions(app);
      break;
    case 'add_integration':
      applyAddIntegration(app, change);
      break;
    default:
      console.warn(`Unknown change type: ${change.type}`);
  }
}

/**
 * Add a dashboard page
 */
function applyAddDashboard(app: UnifiedAppSchema): void {
  if (!app.pages) {
    app.pages = [];
  }

  // Check if dashboard already exists
  if (app.pages.some(p => p.type === 'dashboard')) {
    return;
  }

  const dashboardPage = {
    id: randomUUID(),
    name: 'Dashboard',
    route: '/dashboard',
    type: 'dashboard' as const,
    icon: '📊',
    layout: {
      type: 'dashboard_grid' as const,
      sections: [
        {
          id: randomUUID(),
          type: 'card' as const,
          title: 'Overview',
          components: [],
        },
      ],
    },
    components: [],
    navigation: {
      showInSidebar: true,
      order: 0,
    },
  };

  app.pages.unshift(dashboardPage);

  // Update navigation default page
  if (app.navigation) {
    app.navigation.defaultPage = dashboardPage.id;
  }
}

/**
 * Add list view for an entity
 */
function applyAddListView(app: UnifiedAppSchema, change: ProposedChange): void {
  if (!app.pages) {
    app.pages = [];
  }

  const entityId = change.previewDiff?.entityId;
  if (!entityId) {
    return;
  }

  const entity = app.entities?.find(e => e.id === entityId);
  if (!entity) {
    return;
  }

  // Check if list view already exists for this entity
  if (app.pages.some(p => p.entity === entityId && (p.type === 'list' || p.type === 'table'))) {
    return;
  }

  const listPage = {
    id: randomUUID(),
    name: `${entity.pluralName}`,
    route: `/${entity.pluralName.toLowerCase()}`,
    type: 'list' as const,
    icon: entity.icon || '📋',
    entity: entityId,
    layout: {
      type: 'single_column' as const,
      sections: [
        {
          id: randomUUID(),
          type: 'main' as const,
          title: entity.pluralName,
          components: [],
        },
      ],
    },
    components: [],
    config: {
      pagination: {
        enabled: true,
        pageSize: 20,
      },
      search: {
        enabled: true,
        placeholder: `Search ${entity.pluralName.toLowerCase()}...`,
      },
      filters: [],
    },
    navigation: {
      showInSidebar: true,
      order: app.pages.length + 1,
    },
  };

  app.pages.push(listPage);
}

/**
 * Add detail view for an entity
 */
function applyAddDetailView(app: UnifiedAppSchema, change: ProposedChange): void {
  if (!app.pages) {
    app.pages = [];
  }

  const entityId = change.previewDiff?.entityId;
  if (!entityId) {
    return;
  }

  const entity = app.entities?.find(e => e.id === entityId);
  if (!entity) {
    return;
  }

  // Check if detail view already exists for this entity
  if (app.pages.some(p => p.entity === entityId && p.type === 'detail')) {
    return;
  }

  const detailPage = {
    id: randomUUID(),
    name: `${entity.name} Details`,
    route: `/${entity.pluralName.toLowerCase()}/:id`,
    type: 'detail' as const,
    icon: entity.icon || '📄',
    entity: entityId,
    layout: {
      type: 'single_column' as const,
      sections: [
        {
          id: randomUUID(),
          type: 'main' as const,
          title: entity.name,
          components: [],
        },
      ],
    },
    components: [],
    navigation: {
      showInSidebar: false, // Detail pages usually not in nav
    },
  };

  app.pages.push(detailPage);
}

/**
 * Add search functionality to list pages
 */
function applyAddSearch(app: UnifiedAppSchema): void {
  if (!app.pages) {
    return;
  }

  for (const page of app.pages) {
    if ((page.type === 'list' || page.type === 'table') && !page.config?.search?.enabled) {
      if (!page.config) {
        page.config = {};
      }
      if (!page.config.search) {
        page.config.search = {
          enabled: true,
          placeholder: 'Search...',
        };
      } else {
        page.config.search.enabled = true;
      }
    }
  }
}

/**
 * Add filters to list pages
 */
function applyAddFilters(app: UnifiedAppSchema): void {
  if (!app.pages) {
    return;
  }

  for (const page of app.pages) {
    if ((page.type === 'list' || page.type === 'table') && page.entity) {
      const entity = app.entities?.find(e => e.id === page.entity);
      if (entity && entity.fields) {
        if (!page.config) {
          page.config = {};
        }
        if (!page.config.filters) {
          page.config.filters = [];
        }

        // Add filters for common field types
        for (const field of entity.fields.slice(0, 3)) { // Limit to first 3 fields
          if (field.type === 'enum' || field.type === 'boolean' || field.type === 'date') {
            const filterExists = page.config.filters.some(f => f.field === field.id);
            if (!filterExists) {
              page.config.filters.push({
                field: field.id,
                type: field.type === 'enum' ? 'select' : field.type === 'boolean' ? 'select' : 'date_range',
              });
            }
          }
        }
      }
    }
  }
}

/**
 * Tighten permissions
 */
function applyTightenPermissions(app: UnifiedAppSchema): void {
  if (!app.permissions) {
    app.permissions = {
      roles: ['owner', 'admin', 'editor', 'viewer', 'public'],
      defaultRole: 'viewer',
      rules: [],
    };
  } else {
    // Update default role if it's public
    if (app.permissions.defaultRole === 'public') {
      app.permissions.defaultRole = 'viewer';
    }

    // Ensure we have basic roles
    if (!app.permissions.roles || app.permissions.roles.length === 0) {
      app.permissions.roles = ['owner', 'admin', 'editor', 'viewer', 'public'];
    }

    // Add basic rules if none exist
    if (!app.permissions.rules || app.permissions.rules.length === 0) {
      // Create basic page access rules
      app.permissions.rules = [
        {
          id: randomUUID(),
          type: 'page_access' as const,
          pageId: '*',
          roles: ['owner', 'admin'],
          allow: {
            read: true,
            write: true,
            delete: true,
          },
          enabled: true,
        },
        {
          id: randomUUID(),
          type: 'page_access' as const,
          pageId: '*',
          roles: ['viewer'],
          allow: {
            read: true,
            write: false,
            delete: false,
          },
          enabled: true,
        },
      ];
    }
  }
}

/**
 * Add integration placeholder
 */
function applyAddIntegration(app: UnifiedAppSchema, change: ProposedChange): void {
  if (!app.integrations) {
    app.integrations = [];
  }

  const providerId = change.previewDiff?.providerId;
  if (!providerId) {
    return;
  }

  // Check if integration already exists
  if (app.integrations.some(i => i.type === providerId)) {
    return;
  }

  app.integrations.push({
    id: randomUUID(),
    type: providerId,
    config: {},
    enabled: false, // User needs to configure it
  });
}
