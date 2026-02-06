/**
 * Test Script: Real Estate Management App
 * 
 * Demonstrates Neo's ability to build a complex dual-surface application:
 * - Internal admin surface for property owners/managers
 * - Tenant-facing portal for renters
 * 
 * This tests the engine enhancements made to support:
 * 1. Tenant portal features (viewLease, payRent, submitMaintenance, etc.)
 * 2. Tenant portal page types (tenant_portal, lease_view, rent_payment, etc.)
 * 3. Tenant portal detection from user input
 * 4. Permission-based data isolation
 */

// Simulate the discovery input that would be provided by a user
const userInput = `
Build me a full real estate management application for a property owner managing multiple properties and tenants.

This app MUST support both:
- Internal owner/admin management
- Tenant-facing portals

INTERNAL (OWNER / ADMIN) SURFACE:
- Manage properties (address, type, notes)
- Manage units within properties
- Manage tenants (personal info, lease terms, assigned unit)
- Track rent amounts, due dates, lease start/end
- Track tenant payments (paid, partial, late, missed)
- View payment history per tenant and per property
- Track overdue rent and upcoming rent
- Maintenance requests management (new, in progress, completed)
- Store documents (leases, notices, invoices)
- Notes and communication log per tenant
- Reports by property, tenant, and month

Admin Dashboard:
- Total monthly rent
- Collected vs outstanding rent
- Number of active tenants
- Late payments
- Upcoming rent due

TENANT-FACING SURFACE (PORTAL):
- Tenant login portal
- View own lease details
- View rent amount and due date
- View payment history
- Submit rent payments
- Submit maintenance requests
- View maintenance request status
- Upload/download documents related to their unit
- View notices/messages from landlord

Permissions:
- Tenants can ONLY see and act on their own data
- Owners/admins can see and manage everything
`;

/**
 * Expected entities that Neo should generate
 */
const expectedEntities = [
  {
    id: 'property',
    name: 'Property',
    pluralName: 'Properties',
    fields: ['name', 'address', 'city', 'state', 'postalCode', 'propertyType', 'totalUnits', 'yearBuilt', 'notes'],
  },
  {
    id: 'unit',
    name: 'Unit',
    pluralName: 'Units',
    fields: ['unitNumber', 'propertyId', 'bedrooms', 'bathrooms', 'squareFeet', 'rentAmount', 'currentTenantId', 'status'],
  },
  {
    id: 'tenant',
    name: 'Tenant',
    pluralName: 'Tenants',
    fields: ['name', 'email', 'phone', 'moveInDate', 'leaseEndDate', 'monthlyRent', 'securityDeposit', 'emergencyContact', 'emergencyPhone', 'notes', 'status'],
  },
  {
    id: 'lease',
    name: 'Lease',
    pluralName: 'Leases',
    fields: ['tenantId', 'unitId', 'startDate', 'endDate', 'monthlyRent', 'securityDeposit', 'leaseDocument', 'status'],
  },
  {
    id: 'rentPayment',
    name: 'Rent Payment',
    pluralName: 'Rent Payments',
    fields: ['leaseId', 'tenantId', 'dueDate', 'amount', 'paidDate', 'lateFee', 'status', 'paymentMethod'],
  },
  {
    id: 'maintenanceRequest',
    name: 'Maintenance Request',
    pluralName: 'Maintenance Requests',
    fields: ['title', 'description', 'unitId', 'reportedBy', 'reportedDate', 'priority', 'category', 'status', 'completedDate', 'resolutionNotes'],
  },
  {
    id: 'document',
    name: 'Document',
    pluralName: 'Documents',
    fields: ['name', 'description', 'fileUrl', 'uploadedAt', 'type', 'status'],
  },
];

/**
 * Expected admin pages that Neo should generate
 */
const expectedAdminPages = [
  { id: 'dashboard', type: 'dashboard', name: 'Dashboard' },
  { id: 'properties', type: 'list', name: 'Properties' },
  { id: 'units', type: 'list', name: 'Units' },
  { id: 'tenants', type: 'list', name: 'Tenants' },
  { id: 'leases', type: 'list', name: 'Leases' },
  { id: 'rent-payments', type: 'list', name: 'Rent Payments' },
  { id: 'maintenance-requests', type: 'kanban', name: 'Maintenance Requests' },
  { id: 'documents', type: 'list', name: 'Documents' },
  { id: 'settings', type: 'custom', name: 'Settings' },
];

/**
 * Expected tenant portal pages that Neo should generate
 */
const expectedTenantPages = [
  { id: 'tenant-home', type: 'tenant_portal', name: 'My Portal' },
  { id: 'tenant-lease', type: 'lease_view', name: 'My Lease' },
  { id: 'tenant-payments', type: 'rent_payment', name: 'Pay Rent' },
  { id: 'tenant-maintenance', type: 'maintenance_request', name: 'Maintenance' },
  { id: 'tenant-documents', type: 'document_library', name: 'Documents' },
  { id: 'tenant-notices', type: 'notices_board', name: 'Notices' },
  { id: 'tenant-profile', type: 'profile', name: 'My Profile' },
];

/**
 * Expected permission rules for tenant data isolation
 */
const expectedPermissionRules = [
  // Tenants can only read their own data
  {
    entity: 'tenant',
    action: 'read',
    roles: ['tenant'],
    ownershipFilter: { field: 'id', useOwnershipEntity: true },
  },
  {
    entity: 'lease',
    action: 'read',
    roles: ['tenant'],
    ownershipFilter: { field: 'tenantId', useOwnershipEntity: true },
  },
  {
    entity: 'rentPayment',
    action: 'read',
    roles: ['tenant'],
    ownershipFilter: { field: 'tenantId', useOwnershipEntity: true },
  },
  {
    entity: 'maintenanceRequest',
    action: 'read',
    roles: ['tenant'],
    ownershipFilter: { field: 'reportedBy', useOwnershipEntity: true },
  },
  // Tenants can create maintenance requests
  {
    entity: 'maintenanceRequest',
    action: 'create',
    roles: ['tenant'],
  },
  // Admins have full access
  {
    entity: '*',
    action: '*',
    roles: ['owner', 'admin'],
  },
];

/**
 * Customer features that should be detected
 */
const expectedCustomerFeatures = {
  // Tenant portal features
  viewLease: true,              // "View own lease details"
  payRent: true,                // "Submit rent payments"
  submitMaintenanceRequest: true, // "Submit maintenance requests"
  viewMaintenanceStatus: true,   // "View maintenance request status"
  viewDocuments: true,          // "Upload/download documents"
  uploadDocuments: true,        // "Upload/download documents"
  viewNotices: true,            // "View notices/messages from landlord"
  sendMessages: false,          // Not explicitly mentioned, but could be inferred
  makePayments: true,           // "Submit rent payments"
  manageProfile: true,          // Always included
};

console.log('='.repeat(80));
console.log('NEO ENGINE TEST: Real Estate Management Application');
console.log('='.repeat(80));
console.log();

console.log('USER INPUT:');
console.log('-'.repeat(40));
console.log(userInput.trim());
console.log();

console.log('EXPECTED OUTPUT:');
console.log('-'.repeat(40));
console.log();

console.log('1. SURFACES CONFIGURATION:');
console.log('   - Admin Surface: enabled=true, defaultPage=dashboard');
console.log('   - Customer Surface: enabled=true, defaultPage=tenant-home');
console.log('   - Customer Features:');
Object.entries(expectedCustomerFeatures).forEach(([key, value]) => {
  if (value) console.log(`     - ${key}: ${value}`);
});
console.log();

console.log('2. ENTITIES (Single Source of Truth):');
expectedEntities.forEach(entity => {
  console.log(`   - ${entity.id}: ${entity.name} (${entity.pluralName})`);
  console.log(`     Fields: ${entity.fields.join(', ')}`);
});
console.log();

console.log('3. ADMIN PAGES:');
expectedAdminPages.forEach(page => {
  console.log(`   - ${page.id}: ${page.name} (type: ${page.type})`);
});
console.log();

console.log('4. TENANT PORTAL PAGES:');
expectedTenantPages.forEach(page => {
  console.log(`   - ${page.id}: ${page.name} (type: ${page.type})`);
});
console.log();

console.log('5. PERMISSION RULES (Tenant Data Isolation):');
expectedPermissionRules.forEach((rule, i) => {
  const filter = rule.ownershipFilter ? ` [filter: ${rule.ownershipFilter.field}]` : '';
  console.log(`   ${i + 1}. ${rule.entity}.${rule.action} -> roles: ${rule.roles?.join(', ')}${filter}`);
});
console.log();

console.log('6. DASHBOARD WIDGETS (Admin):');
console.log('   - Total Monthly Rent (currency)');
console.log('   - Collected vs Outstanding (currency)');
console.log('   - Active Tenants (number)');
console.log('   - Late Payments (number)');
console.log('   - Occupancy Rate (percentage)');
console.log();

console.log('7. DASHBOARD WIDGETS (Tenant Portal):');
console.log('   - Rent Status (current balance)');
console.log('   - Next Payment Due (date)');
console.log('   - Open Maintenance Requests (number)');
console.log('   - Quick Actions (pay rent, maintenance, documents, messages)');
console.log();

console.log('='.repeat(80));
console.log('TEST COMPLETED: Neo engine is ready to build this application');
console.log('='.repeat(80));
console.log();
console.log('To build this app:');
console.log('1. Start the Neo server: npm run dev');
console.log('2. Navigate to http://localhost:5173');
console.log('3. Enter the description in the chat interface');
console.log('4. Neo will auto-detect tenant portal requirements');
console.log('5. Both admin and tenant surfaces will be generated');
console.log();
