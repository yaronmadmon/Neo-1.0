/**
 * Page Block Definitions
 * Defines available page-level blocks for different page types
 * 
 * Note: These are metadata definitions. Actual React components
 * will be implemented in the web app.
 */

import type { VisualBlock } from '../types.js';

export const PAGE_BLOCKS: VisualBlock[] = [
  // ============================================================
  // LIST PAGE BLOCKS
  // ============================================================
  {
    id: 'list-standard',
    name: 'Standard List',
    category: 'page',
    description: 'A standard list view with search, filters, and pagination.',
    triggers: {
      pageTypes: ['list'],
      industries: ['*'],
    },
    requiredSlots: ['dynamic_list_title', 'dynamic_list_items'],
    optionalSlots: ['search_config', 'filter_config', 'quick_actions'],
  },
  {
    id: 'list-cards',
    name: 'Card Grid List',
    category: 'page',
    description: 'Grid of cards for visual entity display.',
    triggers: {
      pageTypes: ['list', 'gallery'],
      features: ['visual', 'gallery', 'portfolio'],
    },
    requiredSlots: ['dynamic_list_title', 'dynamic_list_items'],
    optionalSlots: ['search_config', 'filter_config'],
  },
  {
    id: 'list-people',
    name: 'People List',
    category: 'page',
    description: 'Optimized for displaying person entities with avatars and contact info.',
    triggers: {
      pageTypes: ['list'],
      features: ['contacts', 'members', 'customers', 'clients', 'patients'],
    },
    requiredSlots: ['dynamic_list_title', 'dynamic_list_items'],
    optionalSlots: ['search_config', 'filter_config', 'quick_actions'],
  },

  // ============================================================
  // DETAIL PAGE BLOCKS
  // ============================================================
  {
    id: 'detail-standard',
    name: 'Standard Detail',
    category: 'page',
    description: 'Standard detail view with field groups and actions.',
    triggers: {
      pageTypes: ['detail'],
      industries: ['*'],
    },
    requiredSlots: ['dynamic_entity_name', 'dynamic_entity_fields'],
    optionalSlots: ['quick_actions', 'recent_activity_items'],
  },
  {
    id: 'detail-person',
    name: 'Person Detail',
    category: 'page',
    description: 'Detail view optimized for person entities.',
    triggers: {
      pageTypes: ['detail'],
      features: ['contacts', 'members', 'customers', 'clients', 'patients'],
    },
    requiredSlots: ['dynamic_entity_name', 'dynamic_entity_fields'],
    optionalSlots: ['quick_actions', 'recent_activity_items'],
  },

  // ============================================================
  // FORM PAGE BLOCKS
  // ============================================================
  {
    id: 'form-standard',
    name: 'Standard Form',
    category: 'page',
    description: 'Standard form with field sections and validation.',
    triggers: {
      pageTypes: ['form'],
      industries: ['*'],
    },
    requiredSlots: ['dynamic_entity_name', 'dynamic_entity_fields'],
    optionalSlots: [],
  },
  {
    id: 'form-wizard',
    name: 'Wizard Form',
    category: 'page',
    description: 'Multi-step form wizard for complex data entry.',
    triggers: {
      pageTypes: ['form'],
      features: ['onboarding', 'registration', 'application'],
    },
    requiredSlots: ['dynamic_entity_name', 'dynamic_entity_fields'],
    optionalSlots: [],
  },

  // ============================================================
  // DASHBOARD PAGE BLOCKS
  // ============================================================
  {
    id: 'dashboard-overview',
    name: 'Overview Dashboard',
    category: 'page',
    description: 'High-level overview with stats and recent activity.',
    triggers: {
      pageTypes: ['dashboard'],
      industries: ['*'],
    },
    requiredSlots: ['dashboard_stats'],
    optionalSlots: ['dashboard_charts', 'recent_activity_items', 'quick_actions'],
  },
  {
    id: 'dashboard-analytics',
    name: 'Analytics Dashboard',
    category: 'page',
    description: 'Data-focused dashboard with charts and metrics.',
    triggers: {
      pageTypes: ['dashboard'],
      features: ['analytics', 'reports', 'metrics'],
    },
    requiredSlots: ['dashboard_stats', 'dashboard_charts'],
    optionalSlots: ['filter_config'],
  },

  // ============================================================
  // CALENDAR PAGE BLOCKS
  // ============================================================
  {
    id: 'calendar-standard',
    name: 'Standard Calendar',
    category: 'page',
    description: 'Calendar view with month, week, and day views.',
    triggers: {
      pageTypes: ['calendar'],
      features: ['scheduling', 'appointments', 'events'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: ['quick_actions', 'filter_config'],
  },

  // ============================================================
  // KANBAN PAGE BLOCKS
  // ============================================================
  {
    id: 'kanban-standard',
    name: 'Standard Kanban',
    category: 'page',
    description: 'Kanban board with draggable cards.',
    triggers: {
      pageTypes: ['kanban'],
      features: ['pipelines', 'status_tracking', 'workflow'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: ['quick_actions', 'filter_config'],
  },
];

/**
 * Get a page block by ID
 */
export function getPageBlock(id: string): VisualBlock | undefined {
  return PAGE_BLOCKS.find(block => block.id === id);
}

/**
 * Get page blocks for a specific page type
 */
export function getPageBlocksForType(pageType: string): VisualBlock[] {
  return PAGE_BLOCKS.filter(block => block.triggers.pageTypes?.includes(pageType));
}
