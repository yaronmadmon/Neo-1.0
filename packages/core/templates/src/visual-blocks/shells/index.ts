/**
 * Shell Block Definitions
 * Defines available shell layouts for app composition
 * 
 * Note: These are metadata definitions. Actual React components
 * for these shells will be added when shadcn/ui blocks are ported.
 */

import type { VisualBlock } from '../types.js';

export const SHELL_BLOCKS: VisualBlock[] = [
  // ============================================================
  // STANDARD BUSINESS SHELL (Default)
  // ============================================================
  {
    id: 'dashboard-02',
    name: 'Standard Business Shell',
    category: 'shell',
    description: 'Classic sidebar navigation with header. Suitable for most business applications.',
    triggers: {
      industries: ['*'], // Universal default
      dashboardType: 'operations',
    },
    requiredSlots: ['neo_app_name', 'neo_blueprint_navigation'],
    optionalSlots: ['neo_user_info', 'neo_workspace_list', 'dashboard_stats', 'quick_actions'],
  },

  // ============================================================
  // DATA/INVOICES SHELL
  // ============================================================
  {
    id: 'dashboard-05',
    name: 'Data Specialist Shell',
    category: 'shell',
    description: 'Optimized for data-heavy applications with invoices, payments, and transactions.',
    triggers: {
      features: ['invoices', 'payments', 'billing', 'transactions', 'accounting'],
      dashboardType: 'sales',
    },
    requiredSlots: ['neo_app_name', 'neo_blueprint_navigation', 'recent_activity_items'],
    optionalSlots: ['dashboard_stats', 'dashboard_charts', 'filter_config'],
  },

  // ============================================================
  // INVENTORY/PRODUCT SHELL
  // ============================================================
  {
    id: 'dashboard-07',
    name: 'Inventory Shell',
    category: 'shell',
    description: 'Designed for inventory management, product catalogs, and warehouse operations.',
    triggers: {
      features: ['inventory', 'products', 'catalog', 'stock', 'warehouse'],
      dashboardType: 'operations',
    },
    requiredSlots: ['neo_app_name', 'neo_blueprint_navigation'],
    optionalSlots: ['dynamic_list_items', 'dashboard_stats', 'search_config', 'filter_config'],
  },

  // ============================================================
  // SERVICE SHELL
  // ============================================================
  {
    id: 'dashboard-03',
    name: 'Service Provider Shell',
    category: 'shell',
    description: 'Built for service-oriented businesses like salons, clinics, and contractors.',
    triggers: {
      industries: ['salon', 'medical', 'plumber', 'electrician', 'contractor', 'cleaning'],
      dashboardType: 'service',
    },
    requiredSlots: ['neo_app_name', 'neo_blueprint_navigation'],
    optionalSlots: ['dashboard_stats', 'quick_actions', 'recent_activity_items'],
  },

  // ============================================================
  // HEALTH/FITNESS SHELL
  // ============================================================
  {
    id: 'dashboard-04',
    name: 'Health & Fitness Shell',
    category: 'shell',
    description: 'Tailored for gyms, fitness studios, and health-focused applications.',
    triggers: {
      industries: ['gym', 'fitness-coach', 'medical', 'home-health'],
      dashboardType: 'health',
    },
    requiredSlots: ['neo_app_name', 'neo_blueprint_navigation'],
    optionalSlots: ['dashboard_stats', 'dashboard_charts', 'recent_activity_items'],
  },

  // ============================================================
  // SALES/CRM SHELL
  // ============================================================
  {
    id: 'dashboard-06',
    name: 'Sales & CRM Shell',
    category: 'shell',
    description: 'Optimized for sales teams, CRM, and customer relationship management.',
    triggers: {
      industries: ['real-estate', 'ecommerce'],
      features: ['crm', 'sales', 'leads', 'pipeline'],
      dashboardType: 'sales',
    },
    requiredSlots: ['neo_app_name', 'neo_blueprint_navigation'],
    optionalSlots: ['dashboard_stats', 'dashboard_charts', 'recent_activity_items', 'quick_actions'],
  },
];

/**
 * Get a shell block by ID
 */
export function getShellBlock(id: string): VisualBlock | undefined {
  return SHELL_BLOCKS.find(block => block.id === id);
}

/**
 * Get the default shell block
 */
export function getDefaultShell(): VisualBlock {
  return SHELL_BLOCKS.find(block => block.id === 'dashboard-02') || SHELL_BLOCKS[0];
}
