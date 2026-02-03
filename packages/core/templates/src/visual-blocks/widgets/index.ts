/**
 * Widget Block Definitions
 * Defines reusable widget blocks that can be placed within pages
 * 
 * Note: These are metadata definitions. Actual React components
 * will be implemented in the web app.
 */

import type { VisualBlock } from '../types.js';

export const WIDGET_BLOCKS: VisualBlock[] = [
  // ============================================================
  // STATS WIDGETS
  // ============================================================
  {
    id: 'widget-stat-card',
    name: 'Stat Card',
    category: 'widget',
    description: 'Single statistic display with optional trend indicator.',
    triggers: {
      industries: ['*'],
    },
    requiredSlots: ['dashboard_stats'],
    optionalSlots: [],
  },
  {
    id: 'widget-stat-grid',
    name: 'Stats Grid',
    category: 'widget',
    description: 'Grid of stat cards for overview displays.',
    triggers: {
      industries: ['*'],
    },
    requiredSlots: ['dashboard_stats'],
    optionalSlots: [],
  },

  // ============================================================
  // ACTIVITY WIDGETS
  // ============================================================
  {
    id: 'widget-recent-activity',
    name: 'Recent Activity',
    category: 'widget',
    description: 'Timeline of recent actions and events.',
    triggers: {
      industries: ['*'],
      features: ['activity_tracking', 'audit'],
    },
    requiredSlots: ['recent_activity_items'],
    optionalSlots: [],
  },
  {
    id: 'widget-activity-feed',
    name: 'Activity Feed',
    category: 'widget',
    description: 'Scrollable feed of activity with filtering.',
    triggers: {
      features: ['activity_tracking', 'notifications'],
    },
    requiredSlots: ['recent_activity_items'],
    optionalSlots: ['filter_config'],
  },

  // ============================================================
  // CHART WIDGETS
  // ============================================================
  {
    id: 'widget-line-chart',
    name: 'Line Chart',
    category: 'widget',
    description: 'Line chart for trend visualization.',
    triggers: {
      features: ['analytics', 'reports', 'trends'],
    },
    requiredSlots: ['dashboard_charts'],
    optionalSlots: [],
  },
  {
    id: 'widget-bar-chart',
    name: 'Bar Chart',
    category: 'widget',
    description: 'Bar chart for comparison visualization.',
    triggers: {
      features: ['analytics', 'reports', 'comparison'],
    },
    requiredSlots: ['dashboard_charts'],
    optionalSlots: [],
  },
  {
    id: 'widget-pie-chart',
    name: 'Pie Chart',
    category: 'widget',
    description: 'Pie chart for distribution visualization.',
    triggers: {
      features: ['analytics', 'reports', 'distribution'],
    },
    requiredSlots: ['dashboard_charts'],
    optionalSlots: [],
  },

  // ============================================================
  // LIST WIDGETS
  // ============================================================
  {
    id: 'widget-recent-list',
    name: 'Recent Items List',
    category: 'widget',
    description: 'Compact list of recently added or modified items.',
    triggers: {
      industries: ['*'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: [],
  },
  {
    id: 'widget-top-list',
    name: 'Top Items List',
    category: 'widget',
    description: 'Ranked list of top items by some metric.',
    triggers: {
      features: ['analytics', 'leaderboard'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: [],
  },

  // ============================================================
  // ACTION WIDGETS
  // ============================================================
  {
    id: 'widget-quick-actions',
    name: 'Quick Actions',
    category: 'widget',
    description: 'Buttons for common actions.',
    triggers: {
      industries: ['*'],
    },
    requiredSlots: ['quick_actions'],
    optionalSlots: [],
  },

  // ============================================================
  // CALENDAR WIDGETS
  // ============================================================
  {
    id: 'widget-upcoming-events',
    name: 'Upcoming Events',
    category: 'widget',
    description: 'List of upcoming scheduled items.',
    triggers: {
      features: ['scheduling', 'appointments', 'events', 'calendar'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: [],
  },
  {
    id: 'widget-mini-calendar',
    name: 'Mini Calendar',
    category: 'widget',
    description: 'Compact calendar view for date selection.',
    triggers: {
      features: ['scheduling', 'appointments', 'calendar'],
    },
    requiredSlots: [],
    optionalSlots: ['dynamic_list_items'],
  },

  // ============================================================
  // INVOICE/PAYMENT WIDGETS
  // ============================================================
  {
    id: 'widget-recent-invoices',
    name: 'Recent Invoices',
    category: 'widget',
    description: 'List of recent invoices with status.',
    triggers: {
      features: ['invoices', 'billing'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: ['dashboard_stats'],
  },
  {
    id: 'widget-payment-summary',
    name: 'Payment Summary',
    category: 'widget',
    description: 'Summary of payments received and pending.',
    triggers: {
      features: ['payments', 'billing', 'accounting'],
    },
    requiredSlots: ['dashboard_stats'],
    optionalSlots: [],
  },

  // ============================================================
  // INVENTORY WIDGETS
  // ============================================================
  {
    id: 'widget-low-stock',
    name: 'Low Stock Alert',
    category: 'widget',
    description: 'Items running low on stock.',
    triggers: {
      features: ['inventory', 'stock'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: [],
  },
  {
    id: 'widget-inventory-summary',
    name: 'Inventory Summary',
    category: 'widget',
    description: 'Overview of inventory levels.',
    triggers: {
      features: ['inventory', 'warehouse'],
    },
    requiredSlots: ['dashboard_stats'],
    optionalSlots: ['dashboard_charts'],
  },

  // ============================================================
  // CHAT/MESSAGING WIDGETS
  // ============================================================
  {
    id: 'widget-chat',
    name: 'Chat Widget',
    category: 'widget',
    description: 'Real-time chat or messaging interface.',
    triggers: {
      features: ['chat', 'messaging', 'communication', 'support'],
    },
    requiredSlots: [],
    optionalSlots: ['dynamic_list_items'],
  },
  {
    id: 'widget-chat-history',
    name: 'Chat History',
    category: 'widget',
    description: 'View previous chat or message history.',
    triggers: {
      features: ['chat', 'messaging', 'conversations'],
    },
    requiredSlots: ['dynamic_list_items'],
    optionalSlots: [],
  },
  {
    id: 'widget-support-chat',
    name: 'Support Chat',
    category: 'widget',
    description: 'Customer support chat interface.',
    triggers: {
      features: ['support', 'help_desk', 'customer_service'],
    },
    requiredSlots: [],
    optionalSlots: ['dynamic_list_items'],
  },
];

/**
 * Get a widget block by ID
 */
export function getWidgetBlock(id: string): VisualBlock | undefined {
  return WIDGET_BLOCKS.find(block => block.id === id);
}

/**
 * Get widgets that match specific features
 */
export function getWidgetsForFeatures(features: string[]): VisualBlock[] {
  return WIDGET_BLOCKS.filter(block => 
    block.triggers.features?.some(f => features.includes(f)) ||
    block.triggers.industries?.includes('*')
  );
}
