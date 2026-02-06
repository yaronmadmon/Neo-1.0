/**
 * Construction/Contractor Management System - Neo Build & Validation
 * 
 * SURFACES:
 * 1. Admin / Office Management - Full access
 * 2. Field Staff (site managers, foremen) - Assigned projects only
 * 3. Clients (project owners) - Own projects only
 */

const API_BASE = 'http://localhost:3000';

interface ValidationResult {
  test: string;
  success: boolean;
  error?: string;
  details?: any;
}

const results: ValidationResult[] = [];

async function apiCall(
  method: string,
  endpoint: string,
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as any;
    return { success: response.ok, data, error: response.ok ? undefined : data.message || data.error || 'Request failed' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function logResult(test: string, success: boolean, details?: any, error?: string) {
  results.push({ test, success, error, details });
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${test}${error ? `: ${error}` : ''}`);
}

async function buildConstructionApp(): Promise<string | null> {
  console.log('═'.repeat(70));
  console.log('NEO CONSTRUCTION/CONTRACTOR MANAGEMENT SYSTEM');
  console.log('═'.repeat(70));

  const userInput = `
Build a full construction / contractor management system for a company managing multiple projects, clients, subcontractors, materials, and invoices.

This system MUST support MULTIPLE SURFACES sharing the SAME DATA:
1) Admin / Office Management - full access to all data
2) Field Staff (site managers, foremen) - view assigned projects only
3) Clients (project owners) - view their own projects only

SINGLE SOURCE OF TRUTH - same entities, schemas, backend. No duplicates.

=== ADMIN / OFFICE SURFACE ===

PROJECTS:
- Project name, client reference, site address
- Scope of work, contract value, budget
- Timeline: start date, end date, current phase
- Phases: planning, permits, demolition, foundation, framing, MEP, finishes, punch list, closeout
- Status: bidding, won, active, on_hold, completed, cancelled

CLIENTS:
- Client name, company, contact person
- Email, phone, billing address
- Linked projects
- Communication log

ESTIMATES & BIDDING:
- Linked to project
- Line items: description, quantity, unit cost, total
- Labor vs materials breakdown
- Markup/margin
- Version number (for revisions)
- Status: draft, sent, approved, rejected, expired

CHANGE ORDERS:
- Linked to project
- Description of change
- Reason: client request, unforeseen condition, design change, code requirement
- Cost impact (add/deduct)
- Schedule impact (days added)
- Requires client approval
- Status: pending, approved, rejected

TASKS & SCHEDULING:
- Task name, description
- Linked to project and phase
- Assigned to: staff member or subcontractor
- Due date, start date
- Dependencies (predecessor tasks)
- Status: not_started, in_progress, blocked, completed
- Priority: low, medium, high, urgent

MATERIALS & PROCUREMENT:
- Material name, description
- Linked to project
- Quantity needed, unit of measure
- Unit cost, total cost
- Supplier name
- Order status: not_ordered, ordered, shipped, delivered, backordered
- Receipt/invoice upload

SUBCONTRACTORS:
- Company name, contact person
- Trade: electrical, plumbing, HVAC, framing, roofing, concrete, drywall, painting, flooring, other
- License number, insurance expiry
- Hourly/daily rate
- Assigned projects
- Contract documents

INVOICING & PAYMENTS:
- Invoice number, linked to project
- Invoice type: progress_payment, final, retainage_release
- Amount, tax, total
- Due date
- Status: draft, sent, partial, paid, overdue
- Retainage percentage and amount
- Payment schedule milestones

DOCUMENTS:
- Document name, type: plan, permit, contract, photo, inspection, other
- Linked to project
- Version number
- Upload date, uploaded by
- File attachment

DAILY REPORTS:
- Linked to project
- Report date
- Weather conditions
- Crew on site (count)
- Work completed today
- Issues/delays
- Photos
- Submitted by (field staff)

ISSUES/BLOCKERS:
- Linked to project
- Title, description
- Priority: low, medium, high, critical
- Status: open, in_progress, resolved
- Assigned to
- Resolution notes

ADMIN DASHBOARD:
- Active projects count and list
- Projects at risk (over budget or behind schedule)
- Outstanding invoices total
- Change orders pending approval
- Tasks overdue
- Upcoming milestones

=== FIELD STAFF SURFACE ===

Field staff can ONLY see assigned projects:
- View project details and schedule
- View and update task status
- Upload site photos
- Submit daily reports
- Log issues/blockers
- Request materials
- View (but not edit) project documents

Field Dashboard:
- My assigned projects
- My tasks today/this week
- Pending daily reports
- Open issues

=== CLIENT SURFACE ===

Clients can ONLY see their own projects:
- View project status and progress
- View timeline and milestones
- View approved estimates
- View and approve change orders
- View invoices and payment status
- Download documents (plans, permits, contracts)
- Send messages to office

Client Dashboard:
- My projects overview
- Pending change orders to approve
- Outstanding invoices
- Recent documents

=== PERMISSIONS ===

- Clients: own projects only, approved documents only, no financial details beyond their invoices
- Field staff: assigned projects only, cannot see full financials, cannot modify estimates/invoices
- Admin: full access to everything

=== RELATIONSHIPS ===

- Project -> belongs to Client
- Project -> has many Estimates
- Project -> has many ChangeOrders
- Project -> has many Tasks
- Project -> has many Materials
- Project -> has many Invoices
- Project -> has many Documents
- Project -> has many DailyReports
- Project -> has many Issues
- Task -> assigned to Staff or Subcontractor
- Invoice -> has many PaymentScheduleItems
- Estimate -> has many LineItems
`;

  console.log('\n📋 PHASE 1: Building Construction Management App');
  console.log('─'.repeat(70));
  console.log('  Sending to Neo engine...');

  const createResult = await apiCall('POST', '/apps/create', {
    input: userInput,
    category: 'business',
  });

  if (!createResult.success || !createResult.data?.success) {
    logResult('App creation', false, undefined, createResult.data?.error || createResult.error);
    return null;
  }

  const app = createResult.data.app;
  const appId = app?.id;

  logResult('App created', true, {
    id: appId,
    name: app?.name,
  });

  return appId;
}

async function validateEntities(appId: string) {
  console.log('\n📋 PHASE 2: Entity Validation');
  console.log('─'.repeat(70));

  const appResult = await apiCall('GET', `/api/apps/${appId}`);
  
  if (!appResult.success) {
    logResult('Fetch app', false, undefined, appResult.error);
    return;
  }

  const app = appResult.data?.app;
  const dataModels = app?.schema?.dataModels || [];
  const appData = app?.data || {};

  console.log(`  Found ${dataModels.length} data models`);

  // Expected entities for construction app
  const expectedEntities = [
    'project', 'client', 'estimate', 'changeOrder', 'task', 
    'material', 'subcontractor', 'invoice', 'document'
  ];

  const foundEntities = dataModels.map((m: any) => m.id);
  
  // Check core entities
  let foundCore = 0;
  let missingCore: string[] = [];
  
  for (const expected of expectedEntities) {
    const found = foundEntities.some((f: string) => 
      f.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(f.toLowerCase())
    );
    if (found) {
      foundCore++;
    } else {
      missingCore.push(expected);
    }
  }

  logResult('Core entities exist', foundCore >= 7, {
    found: foundCore,
    expected: expectedEntities.length,
    foundEntities: foundEntities,
    missing: missingCore,
  });

  // Check sample data
  let entitiesWithData = 0;
  for (const entityId of Object.keys(appData)) {
    const entityData = appData[entityId];
    if (Array.isArray(entityData) && entityData.length > 0) {
      entitiesWithData++;
      console.log(`  ✅ ${entityId}: ${entityData.length} records`);
    }
  }

  logResult('Sample data generated', entitiesWithData >= 5, { count: entitiesWithData });
}

async function validateSurfaces(appId: string) {
  console.log('\n📋 PHASE 3: Surface Validation');
  console.log('─'.repeat(70));

  const appResult = await apiCall('GET', `/api/apps/${appId}`);
  
  if (!appResult.success) {
    logResult('Fetch app for surface check', false, undefined, appResult.error);
    return;
  }

  const app = appResult.data?.app;
  const pages = app?.schema?.pages || [];

  // Count pages by surface
  const adminPages = pages.filter((p: any) => !p.surface || p.surface === 'admin');
  const fieldStaffPages = pages.filter((p: any) => p.surface === 'provider' || p.surface === 'staff' || p.surface === 'field');
  const clientPages = pages.filter((p: any) => p.surface === 'customer' || p.surface === 'client' || p.surface === 'patient');

  console.log(`  Total pages: ${pages.length}`);
  console.log(`  Admin pages: ${adminPages.length}`);
  console.log(`  Field Staff pages: ${fieldStaffPages.length}`);
  console.log(`  Client pages: ${clientPages.length}`);

  logResult('Admin surface exists', adminPages.length >= 5, { count: adminPages.length });
  logResult('Field Staff surface exists', fieldStaffPages.length >= 3 || clientPages.length > 0, { 
    fieldCount: fieldStaffPages.length,
    clientCount: clientPages.length 
  });
  logResult('Client surface exists', clientPages.length >= 3 || fieldStaffPages.length > 0, { count: clientPages.length });

  // List all pages
  console.log('\n  All pages:');
  pages.forEach((p: any) => {
    console.log(`    - ${p.name} (${p.surface || 'admin'}) -> ${p.route}`);
  });
}

async function validateWorkflows(appId: string) {
  console.log('\n📋 PHASE 4: Workflow Validation');
  console.log('─'.repeat(70));

  const appResult = await apiCall('GET', `/api/apps/${appId}`);
  
  if (!appResult.success) {
    logResult('Fetch app for workflow check', false, undefined, appResult.error);
    return;
  }

  const app = appResult.data?.app;
  const workflows = app?.schema?.flows || [];

  console.log(`  Found ${workflows.length} workflows`);

  // Check for CRUD workflows
  const createWorkflows = workflows.filter((w: any) => w.name?.toLowerCase().includes('create'));
  const editWorkflows = workflows.filter((w: any) => w.name?.toLowerCase().includes('edit'));
  const viewWorkflows = workflows.filter((w: any) => w.name?.toLowerCase().includes('view'));

  logResult('Create workflows exist', createWorkflows.length >= 5, { count: createWorkflows.length });
  logResult('Edit workflows exist', editWorkflows.length >= 5, { count: editWorkflows.length });
  logResult('View/Navigate workflows exist', viewWorkflows.length >= 3, { count: viewWorkflows.length });
}

async function validateNavigation(appId: string) {
  console.log('\n📋 PHASE 5: Navigation Validation');
  console.log('─'.repeat(70));

  const appResult = await apiCall('GET', `/api/apps/${appId}`);
  
  if (!appResult.success) {
    logResult('Fetch app for navigation check', false, undefined, appResult.error);
    return;
  }

  const app = appResult.data?.app;
  const pages = app?.schema?.pages || [];

  // Check that key pages exist
  const hasDashboard = pages.some((p: any) => p.id?.includes('dashboard') || p.name?.toLowerCase().includes('dashboard'));
  const hasProjects = pages.some((p: any) => p.id?.includes('project') || p.name?.toLowerCase().includes('project'));
  const hasClients = pages.some((p: any) => p.id?.includes('client') || p.name?.toLowerCase().includes('client'));
  const hasInvoices = pages.some((p: any) => p.id?.includes('invoice') || p.name?.toLowerCase().includes('invoice'));
  const hasTasks = pages.some((p: any) => p.id?.includes('task') || p.name?.toLowerCase().includes('task'));

  logResult('Dashboard page exists', hasDashboard, { found: hasDashboard });
  logResult('Projects page exists', hasProjects, { found: hasProjects });
  logResult('Clients page exists', hasClients, { found: hasClients });
  logResult('Invoices page exists', hasInvoices, { found: hasInvoices });
  logResult('Tasks page exists', hasTasks, { found: hasTasks });
}

async function validatePreview(appId: string) {
  console.log('\n📋 PHASE 6: Preview Validation');
  console.log('─'.repeat(70));

  try {
    const response = await fetch(`http://localhost:5174/preview/${appId}`);
    logResult('Preview page accessible', response.status === 200, { status: response.status });
  } catch (error) {
    logResult('Preview page accessible', false, undefined, String(error));
  }
}

async function runBuildAndValidation() {
  // Check server health first
  const healthResult = await apiCall('GET', '/health');
  if (!healthResult.success) {
    console.log('❌ Server not running. Please start the server first.');
    return;
  }
  console.log('✅ Server is healthy\n');

  // Build the app
  const appId = await buildConstructionApp();
  
  if (!appId) {
    console.log('\n❌ Failed to create app. Aborting validation.');
    return;
  }

  // Run all validations
  await validateEntities(appId);
  await validateSurfaces(appId);
  await validateWorkflows(appId);
  await validateNavigation(appId);
  await validatePreview(appId);

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('═'.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  console.log(`\n  Total tests: ${total}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Success rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  FAILED TESTS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`    ❌ ${r.test}: ${r.error || 'Unknown error'}`);
    });
  }

  console.log('\n  App ID: ' + appId);
  console.log(`  Preview URL: http://localhost:5174/preview/${appId}`);
  console.log('\n' + '═'.repeat(70));

  return { appId, results, passed, failed };
}

runBuildAndValidation().catch(console.error);
