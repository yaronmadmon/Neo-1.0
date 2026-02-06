/**
 * Dashboard Intent System Tests
 * 
 * Verifies that the intent system correctly enforces rules for:
 * - Section ordering (Now → Work → Context)
 * - Action restrictions (no actions on summary/history)
 * - Priority limits (max 2 primary sections)
 * - Time scope filtering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  type DashboardSection,
  type DashboardIntent,
  type SectionRole,
  type SectionPriority,
  type DomainMetric,
  type ContextualAction,
  ROLE_ORDER,
  PRIORITY_ORDER,
  ACTIONABLE_ROLES,
  TIME_SCOPE_FILTERS,
  TIME_SCOPE_LABELS,
  validateSection,
  validateDashboardIntent,
  sortSections,
  canHaveActions,
  shouldShowAction,
  filterByTimeScope,
  formatMetricLabel,
  inferLayoutHint,
} from './dashboard-intent.js';

import {
  generateDashboardIntent,
  findStatusEntities,
  findSchedulableEntities,
  INDUSTRY_SECTION_CONFIGS,
} from './dashboard-intent-generator.js';

import type { EntityDef, FieldDef } from '../types.js';

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createTestEntity(overrides: Partial<EntityDef> = {}): EntityDef {
  return {
    id: 'order',
    name: 'Order',
    pluralName: 'Orders',
    fields: [
      { id: 'id', name: 'ID', type: 'string', required: true },
      { id: 'status', name: 'Status', type: 'enum', enumOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
      ]},
      { id: 'total', name: 'Total', type: 'currency' },
      { id: 'orderDate', name: 'Order Date', type: 'date' },
    ],
    ...overrides,
  } as EntityDef;
}

function createTestSection(overrides: Partial<DashboardSection> = {}): DashboardSection {
  return {
    id: 'test-section',
    role: 'today',
    priority: 'primary',
    title: 'Test Section',
    ...overrides,
  };
}

// =============================================================================
// ORDERING TESTS
// =============================================================================

describe('Dashboard Intent - Section Ordering', () => {
  it('should order sections by role: today → in-progress → upcoming → summary → history', () => {
    const sections: DashboardSection[] = [
      createTestSection({ id: 'history', role: 'history', priority: 'tertiary' }),
      createTestSection({ id: 'summary', role: 'summary', priority: 'tertiary' }),
      createTestSection({ id: 'upcoming', role: 'upcoming', priority: 'secondary' }),
      createTestSection({ id: 'today', role: 'today', priority: 'primary' }),
      createTestSection({ id: 'in-progress', role: 'in-progress', priority: 'secondary' }),
    ];
    
    const sorted = sortSections(sections);
    
    expect(sorted.map(s => s.role)).toEqual([
      'today',
      'in-progress',
      'upcoming',
      'summary',
      'history',
    ]);
  });
  
  it('should order by priority within the same role', () => {
    const sections: DashboardSection[] = [
      createTestSection({ id: 'today-3', role: 'today', priority: 'tertiary' }),
      createTestSection({ id: 'today-1', role: 'today', priority: 'primary' }),
      createTestSection({ id: 'today-2', role: 'today', priority: 'secondary' }),
    ];
    
    const sorted = sortSections(sections);
    
    expect(sorted.map(s => s.priority)).toEqual([
      'primary',
      'secondary',
      'tertiary',
    ]);
  });
  
  it('should have correct ROLE_ORDER values', () => {
    expect(ROLE_ORDER['today']).toBe(0);
    expect(ROLE_ORDER['in-progress']).toBe(1);
    expect(ROLE_ORDER['upcoming']).toBe(2);
    expect(ROLE_ORDER['summary']).toBe(3);
    expect(ROLE_ORDER['history']).toBe(4);
  });
  
  it('should have correct PRIORITY_ORDER values', () => {
    expect(PRIORITY_ORDER['primary']).toBe(0);
    expect(PRIORITY_ORDER['secondary']).toBe(1);
    expect(PRIORITY_ORDER['tertiary']).toBe(2);
  });
});

// =============================================================================
// ACTION RESTRICTION TESTS
// =============================================================================

describe('Dashboard Intent - Action Restrictions', () => {
  it('should remove actions from history sections', () => {
    const section = createTestSection({
      role: 'history',
      actions: [
        { actionId: 'delete', label: 'Delete', entity: 'order', visibilityRule: 'always' },
      ],
    });
    
    const validated = validateSection(section);
    
    expect(validated.actions).toBeUndefined();
  });
  
  it('should remove actions from summary sections', () => {
    const section = createTestSection({
      role: 'summary',
      actions: [
        { actionId: 'export', label: 'Export', entity: 'order', visibilityRule: 'always' },
      ],
    });
    
    const validated = validateSection(section);
    
    expect(validated.actions).toBeUndefined();
  });
  
  it('should keep actions on today sections', () => {
    const section = createTestSection({
      role: 'today',
      actions: [
        { actionId: 'create', label: 'Create', entity: 'order', visibilityRule: 'always' },
      ],
    });
    
    const validated = validateSection(section);
    
    expect(validated.actions).toHaveLength(1);
    expect(validated.actions![0].actionId).toBe('create');
  });
  
  it('should keep actions on in-progress sections', () => {
    const section = createTestSection({
      role: 'in-progress',
      actions: [
        { actionId: 'complete', label: 'Complete', entity: 'order', visibilityRule: 'if-active' },
      ],
    });
    
    const validated = validateSection(section);
    
    expect(validated.actions).toHaveLength(1);
  });
  
  it('should keep actions on upcoming sections', () => {
    const section = createTestSection({
      role: 'upcoming',
      actions: [
        { actionId: 'confirm', label: 'Confirm', entity: 'order', visibilityRule: 'if-pending' },
      ],
    });
    
    const validated = validateSection(section);
    
    expect(validated.actions).toHaveLength(1);
  });
  
  it('should correctly identify actionable roles', () => {
    expect(canHaveActions('today')).toBe(true);
    expect(canHaveActions('in-progress')).toBe(true);
    expect(canHaveActions('upcoming')).toBe(true);
    expect(canHaveActions('summary')).toBe(false);
    expect(canHaveActions('history')).toBe(false);
  });
  
  it('should have correct ACTIONABLE_ROLES', () => {
    expect(ACTIONABLE_ROLES).toContain('today');
    expect(ACTIONABLE_ROLES).toContain('in-progress');
    expect(ACTIONABLE_ROLES).toContain('upcoming');
    expect(ACTIONABLE_ROLES).not.toContain('summary');
    expect(ACTIONABLE_ROLES).not.toContain('history');
  });
});

// =============================================================================
// INTENT VALIDATION TESTS
// =============================================================================

describe('Dashboard Intent - Validation', () => {
  it('should ensure today section is first when present', () => {
    const intent: DashboardIntent = {
      sections: [
        createTestSection({ id: 'summary', role: 'summary', priority: 'tertiary' }),
        createTestSection({ id: 'today', role: 'today', priority: 'primary' }),
        createTestSection({ id: 'in-progress', role: 'in-progress', priority: 'secondary' }),
      ],
    };
    
    const validated = validateDashboardIntent(intent);
    
    expect(validated.sections[0].role).toBe('today');
  });
  
  it('should ensure summary section is never first', () => {
    const intent: DashboardIntent = {
      sections: [
        createTestSection({ id: 'summary', role: 'summary', priority: 'tertiary' }),
        createTestSection({ id: 'in-progress', role: 'in-progress', priority: 'secondary' }),
      ],
    };
    
    const validated = validateDashboardIntent(intent);
    
    expect(validated.sections[0].role).not.toBe('summary');
  });
  
  it('should limit primary sections to max 2', () => {
    const intent: DashboardIntent = {
      sections: [
        createTestSection({ id: 'a', role: 'today', priority: 'primary' }),
        createTestSection({ id: 'b', role: 'in-progress', priority: 'primary' }),
        createTestSection({ id: 'c', role: 'upcoming', priority: 'primary' }),
        createTestSection({ id: 'd', role: 'summary', priority: 'primary' }),
      ],
    };
    
    const validated = validateDashboardIntent(intent);
    
    const primaryCount = validated.sections.filter(s => s.priority === 'primary').length;
    expect(primaryCount).toBeLessThanOrEqual(2);
  });
});

// =============================================================================
// ACTION VISIBILITY TESTS
// =============================================================================

describe('Dashboard Intent - Action Visibility', () => {
  it('should show action with "always" visibility rule', () => {
    const action: ContextualAction = {
      actionId: 'test',
      label: 'Test',
      entity: 'order',
      visibilityRule: 'always',
    };
    
    expect(shouldShowAction(action, [])).toBe(true);
    expect(shouldShowAction(action, [{ status: 'completed' }])).toBe(true);
  });
  
  it('should show action with "if-pending" when pending items exist', () => {
    const action: ContextualAction = {
      actionId: 'test',
      label: 'Test',
      entity: 'order',
      visibilityRule: 'if-pending',
    };
    
    expect(shouldShowAction(action, [{ status: 'pending' }])).toBe(true);
    expect(shouldShowAction(action, [{ status: 'waiting' }])).toBe(true);
    expect(shouldShowAction(action, [{ status: 'completed' }])).toBe(false);
  });
  
  it('should show action with "if-active" when active items exist', () => {
    const action: ContextualAction = {
      actionId: 'test',
      label: 'Test',
      entity: 'order',
      visibilityRule: 'if-active',
    };
    
    expect(shouldShowAction(action, [{ status: 'active' }])).toBe(true);
    expect(shouldShowAction(action, [{ status: 'in_progress' }])).toBe(true);
    expect(shouldShowAction(action, [{ status: 'completed' }])).toBe(false);
  });
  
  it('should show action with "if-empty" when no items exist', () => {
    const action: ContextualAction = {
      actionId: 'test',
      label: 'Test',
      entity: 'order',
      visibilityRule: 'if-empty',
    };
    
    expect(shouldShowAction(action, [])).toBe(true);
    expect(shouldShowAction(action, [{ id: '1' }])).toBe(false);
  });
  
  it('should show action with "if-overdue" when overdue items exist', () => {
    const action: ContextualAction = {
      actionId: 'test',
      label: 'Test',
      entity: 'order',
      visibilityRule: 'if-overdue',
    };
    
    expect(shouldShowAction(action, [{ status: 'overdue' }])).toBe(true);
    expect(shouldShowAction(action, [{ status: 'late' }])).toBe(true);
    expect(shouldShowAction(action, [{ status: 'pending' }])).toBe(false);
  });
});

// =============================================================================
// TIME SCOPE TESTS
// =============================================================================

describe('Dashboard Intent - Time Scope', () => {
  it('should have labels for all time scopes', () => {
    expect(TIME_SCOPE_LABELS['now']).toBe('Right Now');
    expect(TIME_SCOPE_LABELS['today']).toBe('Today');
    expect(TIME_SCOPE_LABELS['this-week']).toBe('This Week');
    expect(TIME_SCOPE_LABELS['this-month']).toBe('This Month');
    expect(TIME_SCOPE_LABELS['all-time']).toBe('All Time');
  });
  
  it('should filter by "today" scope', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const items = [
      { id: '1', createdAt: today.toISOString() },
      { id: '2', createdAt: yesterday.toISOString() },
    ];
    
    const filtered = filterByTimeScope(items, 'today');
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });
  
  it('should pass all items through "all-time" scope', () => {
    const items = [
      { id: '1', createdAt: '2020-01-01' },
      { id: '2', createdAt: '2023-06-15' },
    ];
    
    const filtered = filterByTimeScope(items, 'all-time');
    
    expect(filtered).toHaveLength(2);
  });
  
  it('should filter by "this-month" scope', () => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 15);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
    
    const items = [
      { id: '1', createdAt: thisMonth.toISOString() },
      { id: '2', createdAt: lastMonth.toISOString() },
    ];
    
    const filtered = filterByTimeScope(items, 'this-month');
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });
});

// =============================================================================
// INTENT GENERATOR TESTS
// =============================================================================

describe('Dashboard Intent - Generator', () => {
  it('should generate intent with all required sections', () => {
    const entities = [createTestEntity()];
    
    const intent = generateDashboardIntent(entities);
    
    expect(intent.sections.length).toBeGreaterThan(0);
    
    // Should have at least today and summary
    const roles = intent.sections.map(s => s.role);
    expect(roles).toContain('today');
    expect(roles).toContain('summary');
  });
  
  it('should generate in-progress section for entities with status', () => {
    const entities = [createTestEntity()];
    
    const intent = generateDashboardIntent(entities);
    
    const roles = intent.sections.map(s => s.role);
    expect(roles).toContain('in-progress');
  });
  
  it('should generate upcoming section for schedulable entities', () => {
    const entities = [createTestEntity()]; // Has orderDate field
    
    const intent = generateDashboardIntent(entities);
    
    const roles = intent.sections.map(s => s.role);
    expect(roles).toContain('upcoming');
  });
  
  it('should return empty sections for empty entities', () => {
    const intent = generateDashboardIntent([]);
    
    expect(intent.sections).toHaveLength(0);
  });
  
  it('should use industry-specific titles when kit provided', () => {
    const config = INDUSTRY_SECTION_CONFIGS['bakery'];
    
    expect(config.todayTitle).toBe('Today at the Bakery');
    expect(config.inProgressTitle).toBe('Orders in Progress');
  });
});

// =============================================================================
// ENTITY ANALYSIS TESTS
// =============================================================================

describe('Dashboard Intent - Entity Analysis', () => {
  it('should find entities with status fields', () => {
    const entities = [
      createTestEntity({ id: 'order' }),
      createTestEntity({ 
        id: 'product',
        fields: [
          { id: 'name', name: 'Name', type: 'string', required: false },
          { id: 'price', name: 'Price', type: 'currency', required: false },
        ],
      }),
    ];
    
    const statusEntities = findStatusEntities(entities as EntityDef[]);
    
    expect(statusEntities).toHaveLength(1);
    expect(statusEntities[0].id).toBe('order');
  });
  
  it('should find schedulable entities', () => {
    const entities = [
      createTestEntity({ id: 'order' }), // Has orderDate
      createTestEntity({ 
        id: 'product',
        fields: [
          { id: 'name', name: 'Name', type: 'string', required: false },
          { id: 'price', name: 'Price', type: 'currency', required: false },
        ],
      }),
    ];
    
    const schedulable = findSchedulableEntities(entities as EntityDef[]);
    
    expect(schedulable).toHaveLength(1);
    expect(schedulable[0].id).toBe('order');
  });
});

// =============================================================================
// LAYOUT HINT TESTS
// =============================================================================

describe('Dashboard Intent - Layout Hints', () => {
  it('should infer stats-row layout for sections with metrics', () => {
    const section = createTestSection({
      metrics: [
        { sourceMetric: 'orders.count', label: 'Orders', timeScope: 'today' },
      ],
    });
    
    const hint = inferLayoutHint(section);
    
    expect(hint).toBe('stats-row');
  });
  
  it('should infer card-list layout for sections with list entity', () => {
    const section = createTestSection({
      listEntity: 'order',
      role: 'in-progress',
    });
    
    const hint = inferLayoutHint(section);
    
    expect(hint).toBe('card-list');
  });
  
  it('should infer data-table layout for history sections with list entity', () => {
    const section = createTestSection({
      listEntity: 'order',
      role: 'history',
    });
    
    const hint = inferLayoutHint(section);
    
    expect(hint).toBe('data-table');
  });
  
  it('should respect explicit layout hint', () => {
    const section = createTestSection({
      layoutHint: 'kanban',
    });
    
    const hint = inferLayoutHint(section);
    
    expect(hint).toBe('kanban');
  });
});

// =============================================================================
// METRIC DISPLAY TESTS
// =============================================================================

describe('Dashboard Intent - Metric Display', () => {
  it('should format metric label without time scope for all-time', () => {
    const metric: DomainMetric = {
      sourceMetric: 'customers.count',
      label: 'Total Customers',
      timeScope: 'all-time',
    };
    
    const formatted = formatMetricLabel(metric, true);
    
    expect(formatted).toBe('Total Customers');
  });
  
  it('should format metric label with time scope', () => {
    const metric: DomainMetric = {
      sourceMetric: 'orders.count',
      label: 'Orders',
      timeScope: 'today',
    };
    
    const formatted = formatMetricLabel(metric, true);
    
    expect(formatted).toBe('Orders (Today)');
  });
  
  it('should format metric label without time scope when not requested', () => {
    const metric: DomainMetric = {
      sourceMetric: 'orders.count',
      label: 'Orders',
      timeScope: 'today',
    };
    
    const formatted = formatMetricLabel(metric, false);
    
    expect(formatted).toBe('Orders');
  });
});

// =============================================================================
// INDUSTRY CONFIGURATION TESTS
// =============================================================================

describe('Dashboard Intent - Industry Configurations', () => {
  it('should have configuration for bakery', () => {
    const config = INDUSTRY_SECTION_CONFIGS['bakery'];
    
    expect(config).toBeDefined();
    expect(config.todayTitle).toContain('Bakery');
    expect(config.primaryEntity).toBe('order');
  });
  
  it('should have configuration for restaurant', () => {
    const config = INDUSTRY_SECTION_CONFIGS['restaurant'];
    
    expect(config).toBeDefined();
    expect(config.primaryEntity).toBe('order');
  });
  
  it('should have configuration for medical', () => {
    const config = INDUSTRY_SECTION_CONFIGS['medical'];
    
    expect(config).toBeDefined();
    expect(config.primaryEntity).toBe('appointment');
  });
  
  it('should have configuration for gym', () => {
    const config = INDUSTRY_SECTION_CONFIGS['gym'];
    
    expect(config).toBeDefined();
    expect(config.primaryEntity).toBe('classSchedule');
  });
  
  it('should have default fallback configuration', () => {
    const config = INDUSTRY_SECTION_CONFIGS['default'];
    
    expect(config).toBeDefined();
    expect(config.todayTitle).toBe('Today at a Glance');
  });
});
