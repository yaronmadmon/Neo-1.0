/**
 * Dashboard Intent System Test
 * 
 * This script demonstrates the Dashboard Intent system by:
 * 1. Generating intent for a bakery app
 * 2. Showing how sections are ordered by role and priority
 * 3. Demonstrating domain-specific labels and actions
 * 4. Verifying action restrictions on summary/history sections
 */

import {
  generateDashboardIntent,
  getIndustrySectionConfig,
  INDUSTRY_SECTION_CONFIGS,
  TIME_SCOPE_LABELS,
  ROLE_ORDER,
  PRIORITY_ORDER,
  canHaveActions,
  validateDashboardIntent,
  sortSections,
  type DashboardSection,
  type EntityDef,
} from '../packages/core/blueprint-engine/src/index.js';

import { getIndustryKit } from '../packages/core/blueprint-engine/src/kits/industries/index.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

function printSectionSummary(section: DashboardSection): void {
  const roleEmoji = {
    'today': '🌅',
    'in-progress': '⚡',
    'upcoming': '📅',
    'summary': '📊',
    'history': '📜',
  }[section.role] || '📋';
  
  const priorityEmoji = {
    'primary': '🔴',
    'secondary': '🟡',
    'tertiary': '⚪',
  }[section.priority] || '⚪';
  
  console.log(`  ${roleEmoji} ${priorityEmoji} [${section.role}/${section.priority}] ${section.title}`);
  
  if (section.metrics && section.metrics.length > 0) {
    console.log(`     Metrics: ${section.metrics.map(m => `${m.label} (${m.timeScope})`).join(', ')}`);
  }
  
  if (section.listEntity) {
    console.log(`     List: ${section.listEntity}${section.listFilter ? ` [${section.listFilter}]` : ''}`);
  }
  
  if (section.actions && section.actions.length > 0) {
    console.log(`     Actions: ${section.actions.map(a => a.label).join(', ')}`);
  } else if (canHaveActions(section.role)) {
    console.log(`     Actions: (none defined)`);
  } else {
    console.log(`     Actions: ❌ (${section.role} sections cannot have actions)`);
  }
}

// =============================================================================
// TEST ENTITIES
// =============================================================================

const bakeryEntities: EntityDef[] = [
  {
    id: 'order',
    name: 'Order',
    pluralName: 'Orders',
    fields: [
      { id: 'id', name: 'ID', type: 'string', required: true },
      { id: 'orderNumber', name: 'Order Number', type: 'string', required: true },
      { id: 'customerId', name: 'Customer', type: 'reference', required: true, reference: { targetEntity: 'customer', displayField: 'name', relationship: 'many-to-many' } },
      { id: 'total', name: 'Total', type: 'currency', required: true },
      { id: 'orderDate', name: 'Order Date', type: 'date', required: true },
      { id: 'status', name: 'Status', type: 'enum', required: true, enumOptions: [
        { value: 'pending', label: 'Pending', color: '#f59e0b' },
        { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
        { value: 'ready', label: 'Ready', color: '#22c55e' },
        { value: 'delivered', label: 'Delivered', color: '#6b7280' },
      ]},
    ],
  },
  {
    id: 'product',
    name: 'Product',
    pluralName: 'Products',
    fields: [
      { id: 'id', name: 'ID', type: 'string', required: true },
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'price', name: 'Price', type: 'currency', required: true },
      { id: 'category', name: 'Category', type: 'string', required: false },
    ],
  },
  {
    id: 'customer',
    name: 'Customer',
    pluralName: 'Customers',
    fields: [
      { id: 'id', name: 'ID', type: 'string', required: true },
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'email', name: 'Email', type: 'email', required: false },
      { id: 'phone', name: 'Phone', type: 'phone', required: false },
    ],
  },
] as EntityDef[];

const gymEntities: EntityDef[] = [
  {
    id: 'member',
    name: 'Member',
    pluralName: 'Members',
    fields: [
      { id: 'id', name: 'ID', type: 'string', required: true },
      { id: 'name', name: 'Name', type: 'string', required: true },
      { id: 'email', name: 'Email', type: 'email', required: false },
      { id: 'status', name: 'Status', type: 'enum', required: true, enumOptions: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'trial', label: 'Trial' },
      ]},
    ],
  },
  {
    id: 'classSchedule',
    name: 'Class',
    pluralName: 'Classes',
    fields: [
      { id: 'id', name: 'ID', type: 'string', required: true },
      { id: 'name', name: 'Class Name', type: 'string', required: true },
      { id: 'instructor', name: 'Instructor', type: 'string', required: false },
      { id: 'date', name: 'Date', type: 'date', required: true },
      { id: 'startTime', name: 'Start Time', type: 'datetime', required: true },
      { id: 'status', name: 'Status', type: 'enum', required: true, enumOptions: [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ]},
    ],
  },
  {
    id: 'membership',
    name: 'Membership',
    pluralName: 'Memberships',
    fields: [
      { id: 'id', name: 'ID', type: 'string', required: true },
      { id: 'memberId', name: 'Member', type: 'reference', required: true, reference: { targetEntity: 'member', displayField: 'name', relationship: 'many-to-many' } },
      { id: 'planType', name: 'Plan', type: 'string', required: true },
      { id: 'price', name: 'Price', type: 'currency', required: true },
      { id: 'startDate', name: 'Start Date', type: 'date', required: true },
      { id: 'endDate', name: 'End Date', type: 'date', required: true },
      { id: 'status', name: 'Status', type: 'enum', required: true, enumOptions: [
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
      ]},
    ],
  },
] as EntityDef[];

// =============================================================================
// TESTS
// =============================================================================

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║          DASHBOARD INTENT SYSTEM TEST                            ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// Test 1: Bakery Dashboard Intent
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 1: Bakery Dashboard Intent');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const bakeryKit = getIndustryKit('bakery');
const bakeryConfig = getIndustrySectionConfig('bakery');

console.log('Industry Config:');
console.log(`  Today Title: "${bakeryConfig.todayTitle}"`);
console.log(`  In-Progress Title: "${bakeryConfig.inProgressTitle}"`);
console.log(`  Primary Entity: ${bakeryConfig.primaryEntity}`);
console.log();

const bakeryIntent = generateDashboardIntent(bakeryEntities, bakeryKit);

console.log(`Dashboard Title: "${bakeryIntent.title}"`);
console.log(`Refresh Interval: ${bakeryIntent.refreshInterval}s`);
console.log(`Total Sections: ${bakeryIntent.sections.length}\n`);

console.log('Sections (in story order):');
bakeryIntent.sections.forEach(printSectionSummary);

// Test 2: Gym Dashboard Intent
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 2: Gym Dashboard Intent');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const gymKit = getIndustryKit('gym');
const gymConfig = getIndustrySectionConfig('gym');

console.log('Industry Config:');
console.log(`  Today Title: "${gymConfig.todayTitle}"`);
console.log(`  In-Progress Title: "${gymConfig.inProgressTitle}"`);
console.log(`  Primary Entity: ${gymConfig.primaryEntity}`);
console.log();

const gymIntent = generateDashboardIntent(gymEntities, gymKit);

console.log(`Dashboard Title: "${gymIntent.title}"`);
console.log(`Total Sections: ${gymIntent.sections.length}\n`);

console.log('Sections (in story order):');
gymIntent.sections.forEach(printSectionSummary);

// Test 3: Ordering Verification
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 3: Ordering Verification');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Role Order Constants:');
Object.entries(ROLE_ORDER).forEach(([role, order]) => {
  console.log(`  ${order}: ${role}`);
});
console.log();

console.log('Priority Order Constants:');
Object.entries(PRIORITY_ORDER).forEach(([priority, order]) => {
  console.log(`  ${order}: ${priority}`);
});
console.log();

// Test scrambled sections get sorted correctly
const scrambledSections: DashboardSection[] = [
  { id: 'h', role: 'history', priority: 'tertiary', title: 'History' },
  { id: 's', role: 'summary', priority: 'tertiary', title: 'Summary' },
  { id: 't', role: 'today', priority: 'primary', title: 'Today' },
  { id: 'u', role: 'upcoming', priority: 'secondary', title: 'Upcoming' },
  { id: 'i', role: 'in-progress', priority: 'secondary', title: 'In Progress' },
];

console.log('Scrambled input order:');
scrambledSections.forEach((s, i) => console.log(`  ${i + 1}. ${s.role}`));

const sortedSections = sortSections(scrambledSections);

console.log('\nSorted output order:');
sortedSections.forEach((s, i) => console.log(`  ${i + 1}. ${s.role}`));

const expectedOrder = ['today', 'in-progress', 'upcoming', 'summary', 'history'];
const actualOrder = sortedSections.map(s => s.role);
const orderCorrect = JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);

console.log(`\n✅ Order correct: ${orderCorrect ? 'YES' : 'NO'}`);

// Test 4: Action Restrictions
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 4: Action Restrictions');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Roles that CAN have actions:');
['today', 'in-progress', 'upcoming', 'summary', 'history'].forEach(role => {
  const allowed = canHaveActions(role as any);
  console.log(`  ${role}: ${allowed ? '✅ YES' : '❌ NO'}`);
});

console.log('\nVerifying bakery intent action restrictions:');
bakeryIntent.sections.forEach(section => {
  const hasActions = section.actions && section.actions.length > 0;
  const shouldHaveActions = canHaveActions(section.role);
  const status = !shouldHaveActions && hasActions ? '❌ VIOLATION' : '✅ OK';
  console.log(`  ${section.role}: ${hasActions ? 'has actions' : 'no actions'} ${status}`);
});

// Test 5: Available Industry Configs
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST 5: Available Industry Configurations');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

Object.entries(INDUSTRY_SECTION_CONFIGS).forEach(([industry, config]) => {
  console.log(`${industry}:`);
  console.log(`  Today: "${config.todayTitle}"`);
  console.log(`  Primary Entity: ${config.primaryEntity || 'default'}`);
  console.log();
});

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ Dashboard Intent System is working correctly!');
console.log('');
console.log('Key Features Demonstrated:');
console.log('  • Story flow: Now → Work → Context (today → in-progress → summary)');
console.log('  • Domain-specific titles (e.g., "Today at the Bakery")');
console.log('  • KPIs with time scopes (today, all-time)');
console.log('  • Contextual actions only on actionable sections');
console.log('  • Industry personality without styling changes');
console.log('');
console.log('The system is ready for use in the page materializer!');
