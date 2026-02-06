/**
 * Virtual Mailbox / Digital Mailroom Application Builder
 * 
 * Builds a full virtual mailbox application similar to iPostal with:
 * - Platform Admin surface (global control)
 * - Location Staff/Operator surface (mail processing)
 * - Customer/Mailbox Holder surface (mail management)
 * 
 * Single source of truth - all surfaces share the same entities and backend.
 */

import type { UnifiedAppSchema, UnifiedEntity, UnifiedPage, UnifiedWorkflow, UnifiedField } from '../packages/core/blueprint-engine/src/dna/schema.js';

// ============================================================
// ENTITIES
// ============================================================

const locationEntity: UnifiedEntity = {
  id: 'location',
  name: 'Location',
  pluralName: 'Locations',
  description: 'Mail center / physical location where mail is received',
  icon: '📍',
  color: '#3B82F6',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'name', name: 'Location Name', type: 'string', required: true },
    { id: 'address', name: 'Street Address', type: 'address', required: true },
    { id: 'city', name: 'City', type: 'string', required: true },
    { id: 'state', name: 'State', type: 'string', required: true },
    { id: 'zipCode', name: 'ZIP Code', type: 'string', required: true },
    { id: 'phone', name: 'Phone', type: 'phone' },
    { id: 'email', name: 'Email', type: 'email' },
    { id: 'operatingHours', name: 'Operating Hours', type: 'text' },
    { id: 'services', name: 'Supported Services', type: 'json', description: 'Array of service types offered' },
    { id: 'status', name: 'Status', type: 'enum', enumOptions: [
      { value: 'active', label: 'Active', color: '#22C55E' },
      { value: 'inactive', label: 'Inactive', color: '#EF4444' },
      { value: 'maintenance', label: 'Maintenance', color: '#F59E0B' },
    ]},
    { id: 'mailboxCapacity', name: 'Mailbox Capacity', type: 'number' },
    { id: 'activeMailboxes', name: 'Active Mailboxes', type: 'number', computed: { expression: 'COUNT(mailboxes WHERE status=active)', dependencies: ['mailboxes'] }},
  ],
  behaviors: ['trackable', 'searchable'],
  display: {
    titleField: 'name',
    subtitleField: 'address',
    listFields: ['name', 'city', 'state', 'status', 'activeMailboxes'],
    searchFields: ['name', 'address', 'city', 'state', 'zipCode'],
    filterFields: ['status', 'state'],
  },
};

const pricingPlanEntity: UnifiedEntity = {
  id: 'pricingPlan',
  name: 'Pricing Plan',
  pluralName: 'Pricing Plans',
  description: 'Monthly mailbox subscription plans',
  icon: '💰',
  color: '#10B981',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'name', name: 'Plan Name', type: 'string', required: true },
    { id: 'description', name: 'Description', type: 'text' },
    { id: 'monthlyPrice', name: 'Monthly Price', type: 'currency', required: true },
    { id: 'setupFee', name: 'Setup Fee', type: 'currency' },
    { id: 'includedScans', name: 'Included Scans/Month', type: 'number' },
    { id: 'includedForwards', name: 'Included Forwards/Month', type: 'number' },
    { id: 'scanPrice', name: 'Price per Additional Scan', type: 'currency' },
    { id: 'forwardPrice', name: 'Price per Forward', type: 'currency' },
    { id: 'shredPrice', name: 'Price per Shred', type: 'currency' },
    { id: 'pickupPrice', name: 'Pickup Fee', type: 'currency' },
    { id: 'storagePrice', name: 'Storage Fee (per item/day)', type: 'currency' },
    { id: 'retentionDays', name: 'Item Retention Days', type: 'number' },
    { id: 'status', name: 'Status', type: 'enum', enumOptions: [
      { value: 'active', label: 'Active', color: '#22C55E' },
      { value: 'inactive', label: 'Inactive', color: '#6B7280' },
    ]},
  ],
  behaviors: ['billable'],
  display: {
    titleField: 'name',
    subtitleField: 'monthlyPrice',
    listFields: ['name', 'monthlyPrice', 'includedScans', 'includedForwards', 'status'],
    searchFields: ['name', 'description'],
  },
};

const mailboxHolderEntity: UnifiedEntity = {
  id: 'mailboxHolder',
  name: 'Mailbox Holder',
  pluralName: 'Mailbox Holders',
  description: 'Customer who rents a mailbox',
  icon: '👤',
  color: '#8B5CF6',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'firstName', name: 'First Name', type: 'string', required: true },
    { id: 'lastName', name: 'Last Name', type: 'string', required: true },
    { id: 'email', name: 'Email', type: 'email', required: true },
    { id: 'phone', name: 'Phone', type: 'phone' },
    { id: 'company', name: 'Company Name', type: 'string' },
    { id: 'billingAddress', name: 'Billing Address', type: 'address' },
    { id: 'idVerified', name: 'ID Verified', type: 'boolean' },
    { id: 'idDocument', name: 'ID Document', type: 'file', access: { visibleTo: ['admin'], editableBy: ['admin'] }},
    { id: 'status', name: 'Account Status', type: 'enum', enumOptions: [
      { value: 'pending', label: 'Pending Verification', color: '#F59E0B' },
      { value: 'active', label: 'Active', color: '#22C55E' },
      { value: 'suspended', label: 'Suspended', color: '#EF4444' },
      { value: 'closed', label: 'Closed', color: '#6B7280' },
    ]},
    { id: 'notificationPreferences', name: 'Notification Preferences', type: 'json' },
    { id: 'createdAt', name: 'Created', type: 'datetime' },
  ],
  behaviors: ['trackable', 'searchable', 'auditable'],
  display: {
    titleField: 'firstName',
    subtitleField: 'email',
    listFields: ['firstName', 'lastName', 'email', 'status', 'company'],
    searchFields: ['firstName', 'lastName', 'email', 'company'],
    filterFields: ['status', 'idVerified'],
  },
};

const mailboxEntity: UnifiedEntity = {
  id: 'mailbox',
  name: 'Mailbox',
  pluralName: 'Mailboxes',
  description: 'Physical mailbox at a location assigned to a customer',
  icon: '📬',
  color: '#0EA5E9',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'mailboxNumber', name: 'Mailbox Number', type: 'string', required: true },
    { id: 'locationId', name: 'Location', type: 'reference', required: true, reference: { entity: 'location', displayField: 'name', relationship: 'many_to_one' }},
    { id: 'mailboxHolderId', name: 'Mailbox Holder', type: 'reference', reference: { entity: 'mailboxHolder', displayField: 'firstName', relationship: 'many_to_one' }},
    { id: 'pricingPlanId', name: 'Pricing Plan', type: 'reference', reference: { entity: 'pricingPlan', displayField: 'name', relationship: 'many_to_one' }},
    { id: 'streetAddress', name: 'Mail Address', type: 'string', description: 'Full address for receiving mail' },
    { id: 'status', name: 'Status', type: 'enum', enumOptions: [
      { value: 'available', label: 'Available', color: '#22C55E' },
      { value: 'assigned', label: 'Assigned', color: '#3B82F6' },
      { value: 'suspended', label: 'Suspended', color: '#F59E0B' },
      { value: 'retired', label: 'Retired', color: '#6B7280' },
    ]},
    { id: 'startDate', name: 'Start Date', type: 'date' },
    { id: 'endDate', name: 'End Date', type: 'date' },
    { id: 'autoRenew', name: 'Auto Renew', type: 'boolean' },
  ],
  behaviors: ['trackable', 'schedulable'],
  display: {
    titleField: 'mailboxNumber',
    subtitleField: 'streetAddress',
    listFields: ['mailboxNumber', 'locationId', 'mailboxHolderId', 'status'],
    searchFields: ['mailboxNumber', 'streetAddress'],
    filterFields: ['status', 'locationId'],
  },
};

const mailItemEntity: UnifiedEntity = {
  id: 'mailItem',
  name: 'Mail Item',
  pluralName: 'Mail Items',
  description: 'Physical mail piece or package received',
  icon: '📦',
  color: '#F59E0B',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'mailboxId', name: 'Mailbox', type: 'reference', required: true, reference: { entity: 'mailbox', displayField: 'mailboxNumber', relationship: 'many_to_one' }},
    { id: 'locationId', name: 'Location', type: 'reference', required: true, reference: { entity: 'location', displayField: 'name', relationship: 'many_to_one' }},
    { id: 'type', name: 'Item Type', type: 'enum', required: true, enumOptions: [
      { value: 'letter', label: 'Letter', color: '#3B82F6' },
      { value: 'large_envelope', label: 'Large Envelope', color: '#8B5CF6' },
      { value: 'package_small', label: 'Small Package', color: '#F59E0B' },
      { value: 'package_medium', label: 'Medium Package', color: '#EF4444' },
      { value: 'package_large', label: 'Large Package', color: '#DC2626' },
    ]},
    { id: 'carrier', name: 'Carrier', type: 'enum', enumOptions: [
      { value: 'usps', label: 'USPS' },
      { value: 'ups', label: 'UPS' },
      { value: 'fedex', label: 'FedEx' },
      { value: 'dhl', label: 'DHL' },
      { value: 'amazon', label: 'Amazon' },
      { value: 'other', label: 'Other' },
    ]},
    { id: 'sender', name: 'Sender', type: 'string' },
    { id: 'receivedDate', name: 'Received Date', type: 'datetime', required: true },
    { id: 'weight', name: 'Weight (oz)', type: 'number' },
    { id: 'dimensions', name: 'Dimensions', type: 'string' },
    { id: 'envelopeImage', name: 'Envelope/Package Image', type: 'image' },
    { id: 'scannedContent', name: 'Scanned Contents', type: 'file', description: 'PDF of scanned contents' },
    { id: 'status', name: 'Status', type: 'enum', required: true, enumOptions: [
      { value: 'received', label: 'Received', color: '#3B82F6' },
      { value: 'scanned', label: 'Scanned (Envelope)', color: '#8B5CF6' },
      { value: 'awaiting_customer_action', label: 'Awaiting Customer Action', color: '#F59E0B' },
      { value: 'action_requested', label: 'Action Requested', color: '#EC4899' },
      { value: 'processing', label: 'Processing', color: '#6366F1' },
      { value: 'completed', label: 'Completed', color: '#22C55E' },
      { value: 'archived', label: 'Archived', color: '#6B7280' },
    ]},
    { id: 'requestedAction', name: 'Requested Action', type: 'enum', enumOptions: [
      { value: 'scan_contents', label: 'Open & Scan Contents' },
      { value: 'forward', label: 'Forward' },
      { value: 'shred', label: 'Shred' },
      { value: 'hold_pickup', label: 'Hold for Pickup' },
    ]},
    { id: 'actionRequestedAt', name: 'Action Requested At', type: 'datetime' },
    { id: 'actionCompletedAt', name: 'Action Completed At', type: 'datetime' },
    { id: 'forwardingAddressId', name: 'Forward To', type: 'reference', reference: { entity: 'forwardingAddress', displayField: 'name', relationship: 'many_to_one' }},
    { id: 'trackingNumber', name: 'Outbound Tracking', type: 'string' },
    { id: 'notes', name: 'Staff Notes', type: 'text', access: { visibleTo: ['admin', 'staff', 'operator'] }},
    { id: 'processedById', name: 'Processed By', type: 'string' },
  ],
  behaviors: ['trackable', 'attachable', 'auditable'],
  display: {
    titleField: 'type',
    subtitleField: 'sender',
    imageField: 'envelopeImage',
    listFields: ['type', 'sender', 'receivedDate', 'status', 'requestedAction'],
    searchFields: ['sender', 'trackingNumber'],
    filterFields: ['status', 'type', 'carrier', 'requestedAction', 'locationId'],
  },
};

const forwardingAddressEntity: UnifiedEntity = {
  id: 'forwardingAddress',
  name: 'Forwarding Address',
  pluralName: 'Forwarding Addresses',
  description: 'Address where mail can be forwarded',
  icon: '📮',
  color: '#10B981',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'mailboxHolderId', name: 'Mailbox Holder', type: 'reference', required: true, reference: { entity: 'mailboxHolder', displayField: 'firstName', relationship: 'many_to_one' }},
    { id: 'name', name: 'Address Name', type: 'string', required: true, description: 'e.g., Home, Office' },
    { id: 'recipientName', name: 'Recipient Name', type: 'string', required: true },
    { id: 'streetAddress', name: 'Street Address', type: 'string', required: true },
    { id: 'city', name: 'City', type: 'string', required: true },
    { id: 'state', name: 'State', type: 'string', required: true },
    { id: 'zipCode', name: 'ZIP Code', type: 'string', required: true },
    { id: 'country', name: 'Country', type: 'string', required: true },
    { id: 'isDefault', name: 'Default Address', type: 'boolean' },
    { id: 'status', name: 'Status', type: 'enum', enumOptions: [
      { value: 'active', label: 'Active', color: '#22C55E' },
      { value: 'inactive', label: 'Inactive', color: '#6B7280' },
    ]},
  ],
  behaviors: [],
  display: {
    titleField: 'name',
    subtitleField: 'streetAddress',
    listFields: ['name', 'recipientName', 'city', 'state', 'isDefault'],
    searchFields: ['name', 'recipientName', 'streetAddress'],
  },
};

const chargeEntity: UnifiedEntity = {
  id: 'charge',
  name: 'Charge',
  pluralName: 'Charges',
  description: 'Individual charge for a service',
  icon: '💵',
  color: '#EF4444',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'mailboxHolderId', name: 'Mailbox Holder', type: 'reference', required: true, reference: { entity: 'mailboxHolder', displayField: 'firstName', relationship: 'many_to_one' }},
    { id: 'mailItemId', name: 'Related Mail Item', type: 'reference', reference: { entity: 'mailItem', displayField: 'type', relationship: 'many_to_one' }},
    { id: 'invoiceId', name: 'Invoice', type: 'reference', reference: { entity: 'invoice', displayField: 'invoiceNumber', relationship: 'many_to_one' }},
    { id: 'type', name: 'Charge Type', type: 'enum', required: true, enumOptions: [
      { value: 'subscription', label: 'Monthly Subscription' },
      { value: 'setup', label: 'Setup Fee' },
      { value: 'scan', label: 'Scan Service' },
      { value: 'forward', label: 'Forwarding Service' },
      { value: 'shred', label: 'Shredding Service' },
      { value: 'pickup', label: 'Pickup Fee' },
      { value: 'storage', label: 'Storage Fee' },
      { value: 'other', label: 'Other' },
    ]},
    { id: 'description', name: 'Description', type: 'string' },
    { id: 'amount', name: 'Amount', type: 'currency', required: true },
    { id: 'date', name: 'Charge Date', type: 'date', required: true },
    { id: 'status', name: 'Status', type: 'enum', enumOptions: [
      { value: 'pending', label: 'Pending', color: '#F59E0B' },
      { value: 'invoiced', label: 'Invoiced', color: '#3B82F6' },
      { value: 'paid', label: 'Paid', color: '#22C55E' },
      { value: 'refunded', label: 'Refunded', color: '#6B7280' },
    ]},
  ],
  behaviors: ['billable', 'auditable'],
  display: {
    titleField: 'type',
    subtitleField: 'amount',
    listFields: ['type', 'description', 'amount', 'date', 'status'],
    searchFields: ['description'],
    filterFields: ['type', 'status'],
  },
};

const invoiceEntity: UnifiedEntity = {
  id: 'invoice',
  name: 'Invoice',
  pluralName: 'Invoices',
  description: 'Customer invoice',
  icon: '🧾',
  color: '#6366F1',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'invoiceNumber', name: 'Invoice Number', type: 'string', required: true },
    { id: 'mailboxHolderId', name: 'Mailbox Holder', type: 'reference', required: true, reference: { entity: 'mailboxHolder', displayField: 'firstName', relationship: 'many_to_one' }},
    { id: 'periodStart', name: 'Period Start', type: 'date', required: true },
    { id: 'periodEnd', name: 'Period End', type: 'date', required: true },
    { id: 'issueDate', name: 'Issue Date', type: 'date', required: true },
    { id: 'dueDate', name: 'Due Date', type: 'date', required: true },
    { id: 'subtotal', name: 'Subtotal', type: 'currency' },
    { id: 'tax', name: 'Tax', type: 'currency' },
    { id: 'total', name: 'Total', type: 'currency', required: true },
    { id: 'status', name: 'Status', type: 'enum', enumOptions: [
      { value: 'draft', label: 'Draft', color: '#6B7280' },
      { value: 'sent', label: 'Sent', color: '#3B82F6' },
      { value: 'paid', label: 'Paid', color: '#22C55E' },
      { value: 'overdue', label: 'Overdue', color: '#EF4444' },
      { value: 'void', label: 'Void', color: '#9CA3AF' },
    ]},
    { id: 'paidAt', name: 'Paid At', type: 'datetime' },
    { id: 'paymentMethod', name: 'Payment Method', type: 'string' },
  ],
  behaviors: ['billable', 'auditable'],
  display: {
    titleField: 'invoiceNumber',
    subtitleField: 'total',
    listFields: ['invoiceNumber', 'mailboxHolderId', 'issueDate', 'total', 'status'],
    searchFields: ['invoiceNumber'],
    filterFields: ['status'],
  },
};

const staffMemberEntity: UnifiedEntity = {
  id: 'staffMember',
  name: 'Staff Member',
  pluralName: 'Staff Members',
  description: 'Location operator/staff member',
  icon: '👷',
  color: '#14B8A6',
  fields: [
    { id: 'id', name: 'ID', type: 'string', required: true },
    { id: 'firstName', name: 'First Name', type: 'string', required: true },
    { id: 'lastName', name: 'Last Name', type: 'string', required: true },
    { id: 'email', name: 'Email', type: 'email', required: true },
    { id: 'phone', name: 'Phone', type: 'phone' },
    { id: 'locationId', name: 'Assigned Location', type: 'reference', required: true, reference: { entity: 'location', displayField: 'name', relationship: 'many_to_one' }},
    { id: 'role', name: 'Role', type: 'enum', enumOptions: [
      { value: 'operator', label: 'Operator' },
      { value: 'manager', label: 'Location Manager' },
    ]},
    { id: 'status', name: 'Status', type: 'enum', enumOptions: [
      { value: 'active', label: 'Active', color: '#22C55E' },
      { value: 'inactive', label: 'Inactive', color: '#6B7280' },
    ]},
    { id: 'startDate', name: 'Start Date', type: 'date' },
  ],
  behaviors: ['trackable'],
  display: {
    titleField: 'firstName',
    subtitleField: 'role',
    listFields: ['firstName', 'lastName', 'locationId', 'role', 'status'],
    searchFields: ['firstName', 'lastName', 'email'],
    filterFields: ['status', 'locationId', 'role'],
  },
};

// ============================================================
// PAGES - ADMIN SURFACE
// ============================================================

const adminDashboardPage: UnifiedPage = {
  id: 'admin-dashboard',
  name: 'Admin Dashboard',
  route: '/admin',
  type: 'dashboard',
  surface: 'admin',
  icon: '📊',
  layout: {
    type: 'dashboard_grid',
    sections: [
      { id: 'stats', type: 'row', components: ['stats-cards'] },
      { id: 'charts', type: 'row', components: ['revenue-chart', 'items-chart'] },
      { id: 'lists', type: 'row', components: ['recent-items', 'pending-actions'] },
    ],
  },
  components: [
    {
      id: 'stats-cards',
      componentId: 'statsCardGrid',
      props: {},
      children: [
        { id: 'stat-1', componentId: 'statsCard', props: { title: 'Total Locations', value: '0', icon: '📍', source: 'locations', aggregation: 'count' } },
        { id: 'stat-2', componentId: 'statsCard', props: { title: 'Active Mailboxes', value: '0', icon: '📬', source: 'mailboxes', aggregation: 'count' } },
        { id: 'stat-3', componentId: 'statsCard', props: { title: 'Items Today', value: '0', icon: '📦', source: 'mailItems', aggregation: 'count' } },
        { id: 'stat-4', componentId: 'statsCard', props: { title: 'Monthly Revenue', value: '$0', icon: '💰', source: 'charges', field: 'amount', aggregation: 'sum', format: 'currency' } },
      ],
    },
    {
      id: 'revenue-chart',
      componentId: 'areaChart',
      props: { title: 'Revenue', dataKey: 'amount', xAxisKey: 'date', source: 'charges' },
    },
    {
      id: 'items-chart',
      componentId: 'areaChart',
      props: { title: 'Mail Items Processed', dataKey: 'count', xAxisKey: 'date', source: 'mailItems' },
    },
    {
      id: 'recent-items',
      componentId: 'list',
      props: { title: 'Recent Mail Items', source: 'mailItems', limit: 5 },
    },
    {
      id: 'pending-actions',
      componentId: 'list',
      props: { title: 'Pending Actions', source: 'mailItems', limit: 5 },
    },
  ],
  navigation: { showInSidebar: true, order: 0 },
};

const adminLocationsListPage: UnifiedPage = {
  id: 'admin-locations-list',
  name: 'Locations',
  route: '/admin/locations',
  type: 'list',
  entity: 'location',
  surface: 'admin',
  icon: '📍',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'locations-table'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Locations', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'Manage mail center locations' } },
        { id: 'add-btn', componentId: 'button', props: { label: 'Add Location', variant: 'primary' } },
      ],
    },
    {
      id: 'locations-table',
      componentId: 'dataTable',
      props: {
        source: 'locations',
        columns: ['name', 'city', 'state', 'status', 'activeMailboxes'],
        actions: ['view', 'edit', 'delete'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 1 },
};

const adminPricingPlansListPage: UnifiedPage = {
  id: 'admin-pricing-plans-list',
  name: 'Pricing Plans',
  route: '/admin/pricing-plans',
  type: 'list',
  entity: 'pricingPlan',
  surface: 'admin',
  icon: '💰',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'plans-table'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Pricing Plans', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'Manage subscription plans' } },
        { id: 'add-btn', componentId: 'button', props: { label: 'Add Plan', variant: 'primary' } },
      ],
    },
    {
      id: 'plans-table',
      componentId: 'dataTable',
      props: {
        source: 'pricingPlans',
        columns: ['name', 'monthlyPrice', 'includedScans', 'includedForwards', 'status'],
        actions: ['view', 'edit', 'delete'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 2 },
};

const adminCustomersListPage: UnifiedPage = {
  id: 'admin-customers-list',
  name: 'Customers',
  route: '/admin/customers',
  type: 'list',
  entity: 'mailboxHolder',
  surface: 'admin',
  icon: '👤',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'customers-table'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Customers', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'Manage mailbox holders' } },
        { id: 'add-btn', componentId: 'button', props: { label: 'Add Customer', variant: 'primary' } },
      ],
    },
    {
      id: 'customers-table',
      componentId: 'dataTable',
      props: {
        source: 'mailboxHolders',
        columns: ['firstName', 'lastName', 'email', 'company', 'status'],
        actions: ['view', 'edit'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 3 },
};

const adminMailboxesListPage: UnifiedPage = {
  id: 'admin-mailboxes-list',
  name: 'Mailboxes',
  route: '/admin/mailboxes',
  type: 'list',
  entity: 'mailbox',
  surface: 'admin',
  icon: '📬',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'mailboxes-table'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Mailboxes', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'Manage physical mailboxes' } },
      ],
    },
    {
      id: 'mailboxes-table',
      componentId: 'dataTable',
      props: {
        source: 'mailboxes',
        columns: ['mailboxNumber', 'locationId', 'mailboxHolderId', 'status'],
        actions: ['view', 'edit'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 4 },
};

const adminMailItemsListPage: UnifiedPage = {
  id: 'admin-mail-items-list',
  name: 'All Mail Items',
  route: '/admin/mail-items',
  type: 'list',
  entity: 'mailItem',
  surface: 'admin',
  icon: '📦',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'items-table'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'All Mail Items', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'View all mail items across locations' } },
      ],
    },
    {
      id: 'items-table',
      componentId: 'dataTable',
      props: {
        source: 'mailItems',
        columns: ['type', 'sender', 'mailboxId', 'locationId', 'status', 'receivedDate'],
        actions: ['view'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 5 },
};

const adminStaffListPage: UnifiedPage = {
  id: 'admin-staff-list',
  name: 'Staff',
  route: '/admin/staff',
  type: 'list',
  entity: 'staffMember',
  surface: 'admin',
  icon: '👷',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'staff-table'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Staff Members', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'Manage location operators' } },
        { id: 'add-btn', componentId: 'button', props: { label: 'Add Staff', variant: 'primary' } },
      ],
    },
    {
      id: 'staff-table',
      componentId: 'dataTable',
      props: {
        source: 'staffMembers',
        columns: ['firstName', 'lastName', 'locationId', 'role', 'status'],
        actions: ['view', 'edit', 'delete'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 6 },
};

const adminRevenueReportPage: UnifiedPage = {
  id: 'admin-revenue-report',
  name: 'Revenue Report',
  route: '/admin/reports/revenue',
  type: 'report',
  surface: 'admin',
  icon: '📈',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'filters', 'chart', 'table'] }],
  },
  components: [
    { id: 'header', componentId: 'container', props: {}, children: [{ id: 'title', componentId: 'text', props: { text: 'Revenue Report', variant: 'h2' } }] },
    { id: 'filters', componentId: 'container', props: {}, children: [{ id: 'filter-text', componentId: 'text', props: { text: 'Filters: Date, Location, Type' } }] },
    { id: 'chart', componentId: 'areaChart', props: { title: 'Revenue Over Time' }, bindings: { data: 'revenueByPeriod' } },
    { id: 'table', componentId: 'dataTable', props: { source: 'charges', columns: ['date', 'type', 'amount', 'status'] } },
  ],
  navigation: { showInSidebar: true, order: 10, group: 'reports' },
};

const adminSettingsPage: UnifiedPage = {
  id: 'admin-settings',
  name: 'Settings',
  route: '/admin/settings',
  type: 'settings',
  surface: 'admin',
  icon: '⚙️',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['settings-form'] }],
  },
  components: [
    {
      id: 'settings-form',
      componentId: 'form',
      props: {
        sections: [
          { title: 'General', fields: ['companyName', 'supportEmail', 'supportPhone'] },
          { title: 'Defaults', fields: ['defaultRetentionDays', 'autoArchiveDays'] },
          { title: 'Notifications', fields: ['emailNotifications', 'smsNotifications'] },
        ],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 99, group: 'settings' },
};

// ============================================================
// PAGES - STAFF SURFACE
// ============================================================

const staffDashboardPage: UnifiedPage = {
  id: 'staff-dashboard',
  name: 'Staff Dashboard',
  route: '/staff',
  type: 'dashboard',
  surface: 'staff',
  icon: '📋',
  layout: {
    type: 'dashboard_grid',
    sections: [
      { id: 'stats', type: 'row', components: ['stats-cards'] },
      { id: 'queue', type: 'main', components: ['work-queue'] },
    ],
  },
  components: [
    {
      id: 'stats-cards',
      componentId: 'statsCardGrid',
      props: {},
      children: [
        { id: 'stat-1', componentId: 'statsCard', props: { title: 'Items to Process', value: '0', icon: '📦', source: 'mailItems', aggregation: 'count' } },
        { id: 'stat-2', componentId: 'statsCard', props: { title: 'Actions Pending', value: '0', icon: '⏳', source: 'mailItems', aggregation: 'count' } },
        { id: 'stat-3', componentId: 'statsCard', props: { title: 'Completed Today', value: '0', icon: '✅', source: 'mailItems', aggregation: 'count' } },
      ],
    },
    {
      id: 'work-queue',
      componentId: 'kanban',
      props: {
        title: 'Work Queue',
        source: 'mailItems',
        columnField: 'status',
        columns: [
          { value: 'received', label: 'Received', color: '#3B82F6' },
          { value: 'action_requested', label: 'Action Requested', color: '#EC4899' },
          { value: 'processing', label: 'Processing', color: '#6366F1' },
        ],
        titleField: 'type',
        subtitleField: 'sender',
      },
    },
  ],
  navigation: { showInSidebar: true, order: 0 },
};

const staffIntakePage: UnifiedPage = {
  id: 'staff-intake',
  name: 'Mail Intake',
  route: '/staff/intake',
  componentId: 'form',
  entity: 'mailItem',
  surface: 'staff',
  icon: '📥',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['intake-form'] }],
  },
  components: [
    {
      id: 'intake-form',
      componentId: 'form',
      props: {
        title: 'Intake New Mail Item',
        mode: 'create',
        sections: [
          { title: 'Item Details', fields: ['type', 'carrier', 'sender'] },
          { title: 'Recipient', fields: ['mailboxId'] },
          { title: 'Physical Details', fields: ['weight', 'dimensions'] },
          { title: 'Image', fields: ['envelopeImage'] },
        ],
        submitLabel: 'Complete Intake',
      },
    },
  ],
  navigation: { showInSidebar: true, order: 1 },
};

const staffMailItemsListPage: UnifiedPage = {
  id: 'staff-mail-items-list',
  name: 'Location Mail Items',
  route: '/staff/mail-items',
  type: 'list',
  entity: 'mailItem',
  surface: 'staff',
  icon: '📦',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'items-table'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Mail Items at My Location', variant: 'h2' } },
        { id: 'intake-btn', componentId: 'button', props: { label: 'New Intake', variant: 'primary' } },
      ],
    },
    {
      id: 'items-table',
      componentId: 'dataTable',
      props: {
        source: 'mailItems',
        columns: ['type', 'sender', 'mailboxId', 'status', 'receivedDate', 'requestedAction'],
        actions: ['view', 'process'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 2 },
};

const staffProcessItemPage: UnifiedPage = {
  id: 'staff-process-item',
  name: 'Process Item',
  route: '/staff/mail-items/:id/process',
  componentId: 'form',
  entity: 'mailItem',
  surface: 'staff',
  icon: '⚙️',
  layout: {
    type: 'two_column',
    sections: [
      { id: 'details', type: 'sidebar', width: '400px', components: ['item-details'] },
      { id: 'actions', type: 'main', components: ['process-form'] },
    ],
  },
  components: [
    {
      id: 'item-details',
      componentId: 'card',
      props: { title: 'Item Details' },
      children: [
        { id: 'item-image', type: 'image', bindings: { src: 'mailItem.envelopeImage' } },
        { id: 'item-info', type: 'fieldList', props: { fields: ['type', 'carrier', 'sender', 'receivedDate', 'mailboxId', 'status', 'requestedAction'] } },
      ],
    },
    {
      id: 'process-form',
      componentId: 'form',
      props: {
        title: 'Process Item',
        mode: 'edit',
        sections: [
          { title: 'Update Status', fields: ['status'] },
          { title: 'Scan Contents', fields: ['scannedContent'], conditions: { visible: 'requestedAction == "scan_contents"' } },
          { title: 'Forward Details', fields: ['trackingNumber'], conditions: { visible: 'requestedAction == "forward"' } },
          { title: 'Notes', fields: ['notes'] },
        ],
        submitLabel: 'Update Item',
      },
    },
  ],
  navigation: { showInSidebar: false },
};

const staffPendingActionsPage: UnifiedPage = {
  id: 'staff-pending-actions',
  name: 'Pending Actions',
  route: '/staff/pending-actions',
  type: 'list',
  entity: 'mailItem',
  surface: 'staff',
  icon: '⏳',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'actions-list'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Pending Customer Actions', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'Items awaiting fulfillment' } },
      ],
    },
    {
      id: 'actions-list',
      componentId: 'list',
      props: {
        source: 'mailItems',
        filter: { status: ['action_requested'] },
        cardType: 'itemCard',
        fields: ['type', 'sender', 'mailboxId', 'requestedAction', 'actionRequestedAt'],
        actions: ['process'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 3 },
};

// ============================================================
// PAGES - CUSTOMER SURFACE
// ============================================================

const customerPortalPage: UnifiedPage = {
  id: 'customer-portal',
  name: 'My Mailbox',
  route: '/my-mailbox',
  type: 'customer_portal',
  surface: 'customer',
  icon: '📬',
  layout: {
    type: 'dashboard_grid',
    sections: [
      { id: 'address', componentId: 'card', components: ['mailbox-address'] },
      { id: 'stats', type: 'row', components: ['stats-cards'] },
      { id: 'items', type: 'main', components: ['recent-mail'] },
    ],
  },
  components: [
    {
      id: 'mailbox-address',
      componentId: 'card',
      props: {},
      children: [
        { id: 'address-title', componentId: 'text', props: { text: 'Your Mailing Address', variant: 'h3' } },
        { id: 'address-display', componentId: 'text', props: { text: 'Loading address...' } },
        { id: 'copy-btn', componentId: 'button', props: { label: 'Copy Address', variant: 'secondary' } },
      ],
    },
    {
      id: 'stats-cards',
      componentId: 'statsCardGrid',
      props: {},
      children: [
        { id: 'stat-1', componentId: 'statsCard', props: { title: 'New Items', value: '0', icon: '📦', source: 'mailItems', aggregation: 'count' } },
        { id: 'stat-2', componentId: 'statsCard', props: { title: 'Awaiting Action', value: '0', icon: '⏳', source: 'mailItems', aggregation: 'count' } },
        { id: 'stat-3', componentId: 'statsCard', props: { title: 'Processing', value: '0', icon: '⚙️', source: 'mailItems', aggregation: 'count' } },
      ],
    },
    {
      id: 'recent-mail',
      componentId: 'list',
      props: {
        title: 'Recent Mail',
        source: 'mailItems',
        cardType: 'itemCard',
        showImage: true,
        fields: ['type', 'sender', 'receivedDate', 'status'],
        actions: ['view', 'action'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 0 },
};

const customerMailItemsPage: UnifiedPage = {
  id: 'customer-mail-items',
  name: 'My Mail',
  route: '/my-mailbox/mail',
  type: 'list',
  entity: 'mailItem',
  surface: 'customer',
  icon: '📦',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'mail-list'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'My Mail Items', variant: 'h2' } },
      ],
    },
    {
      id: 'mail-list',
      componentId: 'list',
      props: {
        source: 'mailItems',
        cardType: 'itemCard',
        showImage: true,
        fields: ['type', 'sender', 'receivedDate', 'status', 'requestedAction'],
        actions: ['view'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 1 },
};

const customerMailItemDetailPage: UnifiedPage = {
  id: 'customer-mail-item-detail',
  name: 'Mail Item Details',
  route: '/my-mailbox/mail/:id',
  type: 'detail',
  entity: 'mailItem',
  surface: 'customer',
  icon: '📧',
  layout: {
    type: 'two_column',
    sections: [
      { id: 'image', type: 'sidebar', width: '400px', components: ['item-image', 'scanned-content'] },
      { id: 'details', type: 'main', components: ['item-info', 'action-buttons'] },
    ],
  },
  components: [
    {
      id: 'item-image',
      componentId: 'image',
      props: {},
    },
    {
      id: 'scanned-content',
      componentId: 'container',
      props: {},
      children: [
        { id: 'scanned-title', componentId: 'text', props: { text: 'Scanned Contents', variant: 'h3' } },
      ],
    },
    {
      id: 'item-info',
      componentId: 'container',
      props: {},
      children: [
        { id: 'info-title', componentId: 'text', props: { text: 'Item Details', variant: 'h3' } },
        { id: 'info-text', componentId: 'text', props: { text: 'View mail item details here' } },
      ],
    },
    {
      id: 'action-buttons',
      componentId: 'container',
      props: {},
      children: [
        { id: 'actions-title', componentId: 'text', props: { text: 'Available Actions', variant: 'h3' } },
        { id: 'scan-btn', componentId: 'button', props: { label: 'Open & Scan', variant: 'secondary' } },
        { id: 'forward-btn', componentId: 'button', props: { label: 'Forward', variant: 'secondary' } },
        { id: 'shred-btn', componentId: 'button', props: { label: 'Shred', variant: 'destructive' } },
        { id: 'pickup-btn', componentId: 'button', props: { label: 'Hold for Pickup', variant: 'secondary' } },
      ],
    },
  ],
  navigation: { showInSidebar: false },
};

const customerForwardingAddressesPage: UnifiedPage = {
  id: 'customer-forwarding-addresses',
  name: 'Forwarding Addresses',
  route: '/my-mailbox/forwarding-addresses',
  type: 'list',
  entity: 'forwardingAddress',
  surface: 'customer',
  icon: '📮',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['header', 'addresses-list'] }],
  },
  components: [
    {
      id: 'header',
      componentId: 'container',
      props: {},
      children: [
        { id: 'title', componentId: 'text', props: { text: 'Forwarding Addresses', variant: 'h2' } },
        { id: 'desc', componentId: 'text', props: { text: 'Manage addresses for mail forwarding' } },
        { id: 'add-btn', componentId: 'button', props: { label: 'Add Address', variant: 'primary' } },
      ],
    },
    {
      id: 'addresses-list',
      componentId: 'list',
      props: {
        source: 'forwardingAddresses',
        cardType: 'card',
        fields: ['name', 'recipientName', 'streetAddress', 'city', 'state', 'isDefault'],
        actions: ['edit', 'delete', 'setDefault'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 2 },
};

const customerBillingPage: UnifiedPage = {
  id: 'customer-billing',
  name: 'Billing',
  route: '/my-mailbox/billing',
  type: 'custom',
  surface: 'customer',
  icon: '💳',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['balance-card', 'invoices-list', 'charges-list'] }],
  },
  components: [
    {
      id: 'balance-card',
      componentId: 'card',
      props: {},
      children: [
        { id: 'balance-title', componentId: 'text', props: { text: 'Current Balance', variant: 'h3' } },
        { id: 'balance', componentId: 'text', props: { text: '$0.00', variant: 'h1' } },
        { id: 'pay-btn', componentId: 'button', props: { label: 'Make Payment', variant: 'primary' } },
      ],
    },
    {
      id: 'invoices-list',
      componentId: 'list',
      props: {
        title: 'Invoices',
        source: 'invoices',
        fields: ['invoiceNumber', 'issueDate', 'total', 'status'],
        actions: ['view', 'download'],
      },
    },
    {
      id: 'charges-list',
      componentId: 'list',
      props: {
        title: 'Recent Charges',
        source: 'charges',
        fields: ['type', 'description', 'date', 'amount'],
      },
    },
  ],
  navigation: { showInSidebar: true, order: 3 },
};

const customerProfilePage: UnifiedPage = {
  id: 'customer-profile',
  name: 'My Profile',
  route: '/my-mailbox/profile',
  type: 'profile',
  entity: 'mailboxHolder',
  surface: 'customer',
  icon: '👤',
  layout: {
    type: 'single_column',
    sections: [{ id: 'main', type: 'main', components: ['profile-form'] }],
  },
  components: [
    {
      id: 'profile-form',
      componentId: 'form',
      props: {
        title: 'My Profile',
        mode: 'edit',
        sections: [
          { title: 'Personal Information', fields: ['firstName', 'lastName', 'email', 'phone'] },
          { title: 'Company', fields: ['company'] },
          { title: 'Billing Address', fields: ['billingAddress'] },
          { title: 'Notification Preferences', fields: ['notificationPreferences'] },
        ],
        submitLabel: 'Save Changes',
      },
    },
  ],
  navigation: { showInSidebar: true, order: 4 },
};

// ============================================================
// WORKFLOWS
// ============================================================

const intakeMailItemWorkflow: UnifiedWorkflow = {
  id: 'intake-mail-item',
  name: 'Intake Mail Item',
  description: 'Staff intakes a new mail item',
  enabled: true,
  trigger: {
    type: 'form_submit',
    componentId: 'intake-form',
  },
  actions: [
    {
      id: 'set-received',
      type: 'set_variable',
      config: { variable: 'formData.status', value: 'received' },
    },
    {
      id: 'set-location',
      type: 'set_variable',
      config: { variable: 'formData.locationId', value: '{{user.locationId}}' },
    },
    {
      id: 'set-date',
      type: 'set_variable',
      config: { variable: 'formData.receivedDate', value: '{{now}}' },
    },
    {
      id: 'create-item',
      type: 'create_record',
      config: { entity: 'mailItem', data: '{{formData}}' },
    },
    {
      id: 'notify-customer',
      type: 'send_email',
      config: {
        template: 'new-mail-received',
        to: '{{mailbox.mailboxHolder.email}}',
        data: { itemType: '{{formData.type}}', sender: '{{formData.sender}}' },
      },
    },
    {
      id: 'show-success',
      type: 'show_notification',
      config: { message: 'Mail item intake complete', type: 'success' },
    },
    {
      id: 'navigate-queue',
      type: 'navigate',
      config: { pageId: 'staff-dashboard' },
    },
  ],
};

const customerRequestActionWorkflow: UnifiedWorkflow = {
  id: 'customer-request-action',
  name: 'Customer Request Action',
  description: 'Customer requests an action on a mail item',
  enabled: true,
  trigger: {
    type: 'button_click',
    componentId: 'action-buttons',
  },
  actions: [
    {
      id: 'validate-status',
      type: 'validate',
      config: {
        condition: 'mailItem.status == "scanned" || mailItem.status == "awaiting_customer_action"',
        errorMessage: 'This item is not available for actions',
      },
    },
    {
      id: 'update-item',
      type: 'update_record',
      config: {
        entity: 'mailItem',
        id: '{{mailItem.id}}',
        data: {
          status: 'action_requested',
          requestedAction: '{{actionType}}',
          actionRequestedAt: '{{now}}',
        },
      },
    },
    {
      id: 'create-charge',
      type: 'create_record',
      config: {
        entity: 'charge',
        data: {
          mailboxHolderId: '{{user.id}}',
          mailItemId: '{{mailItem.id}}',
          type: '{{actionType}}',
          amount: '{{getPriceForAction(actionType)}}',
          date: '{{now}}',
          status: 'pending',
        },
      },
    },
    {
      id: 'show-confirmation',
      type: 'show_notification',
      config: { message: 'Action requested. Staff will process shortly.', type: 'success' },
    },
  ],
};

const staffCompleteActionWorkflow: UnifiedWorkflow = {
  id: 'staff-complete-action',
  name: 'Staff Complete Action',
  description: 'Staff completes a customer-requested action',
  enabled: true,
  trigger: {
    type: 'form_submit',
    componentId: 'process-form',
  },
  actions: [
    {
      id: 'update-item',
      type: 'update_record',
      config: {
        entity: 'mailItem',
        id: '{{mailItem.id}}',
        data: {
          status: '{{formData.status}}',
          scannedContent: '{{formData.scannedContent}}',
          trackingNumber: '{{formData.trackingNumber}}',
          notes: '{{formData.notes}}',
          processedById: '{{user.id}}',
          actionCompletedAt: '{{now}}',
        },
      },
    },
    {
      id: 'notify-customer',
      type: 'conditional',
      config: { condition: 'formData.status == "completed"' },
      thenActions: [
        {
          id: 'send-completion-email',
          type: 'send_email',
          config: {
            template: 'action-completed',
            to: '{{mailItem.mailbox.mailboxHolder.email}}',
            data: { itemType: '{{mailItem.type}}', action: '{{mailItem.requestedAction}}' },
          },
        },
      ],
    },
    {
      id: 'show-success',
      type: 'show_notification',
      config: { message: 'Item processing updated', type: 'success' },
    },
    {
      id: 'refresh',
      type: 'refresh_data',
      config: {},
    },
  ],
};

// ============================================================
// ASSEMBLE APP SCHEMA
// ============================================================

const virtualMailboxApp: UnifiedAppSchema = {
  id: 'virtual-mailbox-app',
  version: 1,
  name: 'Virtual Mailbox',
  description: 'Digital mailroom system for managing physical mail remotely',
  icon: '📬',
  behavior: 'multi-surface',
  industry: 'logistics',
  
  // Enable all 3 surfaces
  surfaces: {
    admin: {
      enabled: true,
      defaultPage: 'admin-dashboard',
    },
    staff: {
      enabled: true,
      defaultPage: 'staff-dashboard',
      features: {
        viewAssignedLocation: true,
        viewAssignedItems: true,
        intakeItems: true,
        processItems: true,
        executeActions: true,
        updateItemStatus: true,
        uploadAttachments: true,
        viewWorkQueue: true,
        viewDailyTasks: true,
        markTaskComplete: true,
        recordFulfillment: true,
        recordTracking: true,
        confirmPickup: true,
        confirmAction: true,
      },
    },
    provider: { enabled: false },
    customer: {
      enabled: true,
      defaultPage: 'customer-portal',
      features: {
        manageProfile: true,
        viewHistory: true,
        makePayments: true,
        receiveNotifications: true,
        viewDocuments: true,
        sendMessages: true,
      },
    },
    patient: { enabled: false },
  },
  
  // All entities (shared single source of truth)
  entities: [
    locationEntity,
    pricingPlanEntity,
    mailboxHolderEntity,
    mailboxEntity,
    mailItemEntity,
    forwardingAddressEntity,
    chargeEntity,
    invoiceEntity,
    staffMemberEntity,
  ],
  
  // All pages across all surfaces
  pages: [
    // Admin pages
    adminDashboardPage,
    adminLocationsListPage,
    adminPricingPlansListPage,
    adminCustomersListPage,
    adminMailboxesListPage,
    adminMailItemsListPage,
    adminStaffListPage,
    adminRevenueReportPage,
    adminSettingsPage,
    // Staff pages
    staffDashboardPage,
    staffIntakePage,
    staffMailItemsListPage,
    staffProcessItemPage,
    staffPendingActionsPage,
    // Customer pages
    customerPortalPage,
    customerMailItemsPage,
    customerMailItemDetailPage,
    customerForwardingAddressesPage,
    customerBillingPage,
    customerProfilePage,
  ],
  
  // Workflows
  workflows: [
    intakeMailItemWorkflow,
    customerRequestActionWorkflow,
    staffCompleteActionWorkflow,
  ],
  
  // Admin navigation
  navigation: {
    sidebar: {
      enabled: true,
      position: 'left',
      collapsible: true,
      groups: [
        {
          id: 'main',
          items: [
            { pageId: 'admin-dashboard', label: 'Dashboard', icon: '📊' },
          ],
        },
        {
          id: 'management',
          label: 'Management',
          items: [
            { pageId: 'admin-locations-list', label: 'Locations', icon: '📍' },
            { pageId: 'admin-pricing-plans-list', label: 'Pricing Plans', icon: '💰' },
            { pageId: 'admin-customers-list', label: 'Customers', icon: '👤' },
            { pageId: 'admin-mailboxes-list', label: 'Mailboxes', icon: '📬' },
            { pageId: 'admin-staff-list', label: 'Staff', icon: '👷' },
          ],
        },
        {
          id: 'operations',
          label: 'Operations',
          items: [
            { pageId: 'admin-mail-items-list', label: 'All Mail Items', icon: '📦' },
          ],
        },
        {
          id: 'reports',
          label: 'Reports',
          items: [
            { pageId: 'admin-revenue-report', label: 'Revenue Report', icon: '📈' },
          ],
        },
        {
          id: 'settings',
          label: 'Settings',
          items: [
            { pageId: 'admin-settings', label: 'Settings', icon: '⚙️' },
          ],
        },
      ],
    },
    navbar: {
      enabled: true,
      showLogo: true,
      showSearch: true,
      showNotifications: true,
      showUserMenu: true,
    },
    rules: [],
    defaultPage: 'admin-dashboard',
  },
  
  // Staff navigation
  staffNavigation: {
    sidebar: {
      enabled: true,
      position: 'left',
      collapsible: true,
      groups: [
        {
          id: 'main',
          items: [
            { pageId: 'staff-dashboard', label: 'Dashboard', icon: '📋' },
          ],
        },
        {
          id: 'work',
          label: 'Work',
          items: [
            { pageId: 'staff-intake', label: 'Mail Intake', icon: '📥' },
            { pageId: 'staff-mail-items-list', label: 'Location Mail', icon: '📦' },
            { pageId: 'staff-pending-actions', label: 'Pending Actions', icon: '⏳' },
          ],
        },
      ],
      footerItems: [
        { action: 'logout', label: 'Log Out', icon: '🚪' },
      ],
    },
    navbar: {
      enabled: true,
      showLogo: true,
      showSearch: true,
      showNotifications: true,
    },
    rules: [],
    defaultPage: 'staff-dashboard',
  },
  
  // Customer navigation
  customerNavigation: {
    sidebar: {
      enabled: true,
      position: 'left',
      collapsible: true,
      groups: [
        {
          id: 'main',
          items: [
            { pageId: 'customer-portal', label: 'My Mailbox', icon: '📬' },
          ],
        },
        {
          id: 'mail',
          label: 'Mail',
          items: [
            { pageId: 'customer-mail-items', label: 'My Mail', icon: '📦' },
            { pageId: 'customer-forwarding-addresses', label: 'Forwarding Addresses', icon: '📮' },
          ],
        },
        {
          id: 'account',
          label: 'Account',
          items: [
            { pageId: 'customer-billing', label: 'Billing', icon: '💳' },
            { pageId: 'customer-profile', label: 'My Profile', icon: '👤' },
          ],
        },
      ],
      footerItems: [
        { action: 'logout', label: 'Log Out', icon: '🚪' },
      ],
    },
    navbar: {
      enabled: true,
      showLogo: true,
      showNotifications: true,
      showProfile: true,
    },
    rules: [],
    defaultPage: 'customer-portal',
    quickLinks: [
      { pageId: 'customer-portal', label: 'My Mailbox', icon: '📬' },
      { pageId: 'customer-mail-items', label: 'My Mail', icon: '📦' },
      { pageId: 'customer-billing', label: 'Billing', icon: '💳' },
    ],
  },
  
  // Theme
  theme: {
    preset: 'professional',
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#F59E0B',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    mode: 'light',
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    spacing: {
      borderRadius: 'md',
    },
  },
  
  // Settings
  settings: {
    locale: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    timezone: 'America/New_York',
    currency: 'USD',
  },
  
  // Features
  features: {
    auth: true,
    multiTenant: true,
    notifications: true,
    search: true,
    exports: true,
  },
  
  // Permissions
  permissions: {
    roles: ['owner', 'admin', 'staff', 'operator', 'customer'],
    defaultRole: 'customer',
    rules: [
      // Admin can do everything
      { id: 'admin-all', type: 'page_access', roles: ['owner', 'admin'], allow: { read: true, write: true, delete: true }, enabled: true },
      
      // Staff can only see staff surface pages
      { id: 'staff-pages', type: 'page_access', pageId: 'staff-*', roles: ['staff', 'operator'], allow: { read: true, write: true }, enabled: true },
      
      // Staff can only see items at their location
      { id: 'staff-items', type: 'row_access', entityId: 'mailItem', roles: ['staff', 'operator'], condition: 'record.locationId == user.locationId', allow: { read: true, write: true }, enabled: true },
      
      // Customers can only see their own data
      { id: 'customer-items', type: 'row_access', entityId: 'mailItem', roles: ['customer'], condition: 'record.mailbox.mailboxHolderId == user.id', allow: { read: true }, enabled: true },
      { id: 'customer-addresses', type: 'row_access', entityId: 'forwardingAddress', roles: ['customer'], condition: 'record.mailboxHolderId == user.id', allow: { read: true, write: true, delete: true }, enabled: true },
      { id: 'customer-charges', type: 'row_access', entityId: 'charge', roles: ['customer'], condition: 'record.mailboxHolderId == user.id', allow: { read: true }, enabled: true },
      { id: 'customer-invoices', type: 'row_access', entityId: 'invoice', roles: ['customer'], condition: 'record.mailboxHolderId == user.id', allow: { read: true }, enabled: true },
      
      // Hide sensitive fields from staff
      { id: 'staff-no-billing', type: 'field_access', entityId: 'charge', fieldId: '*', roles: ['staff', 'operator'], allow: { read: false }, enabled: true },
      { id: 'staff-no-invoices', type: 'field_access', entityId: 'invoice', fieldId: '*', roles: ['staff', 'operator'], allow: { read: false }, enabled: true },
    ],
  },
  
  // Metadata
  metadata: {
    createdAt: new Date().toISOString(),
    generatedBy: 'build-virtual-mailbox-app.ts',
    confidence: 1.0,
    sourceInput: 'Virtual Mailbox / Digital Mailroom Application with Platform Admin, Staff, and Customer surfaces',
  },
};

// ============================================================
// MAIN - Create the app via API
// ============================================================

async function main() {
  console.log('🚀 Building Virtual Mailbox Application...\n');
  
  console.log('📦 Entities:', virtualMailboxApp.entities.length);
  console.log('📄 Pages:', virtualMailboxApp.pages.length);
  console.log('  - Admin:', virtualMailboxApp.pages.filter(p => p.surface === 'admin').length);
  console.log('  - Staff:', virtualMailboxApp.pages.filter(p => p.surface === 'staff').length);
  console.log('  - Customer:', virtualMailboxApp.pages.filter(p => p.surface === 'customer').length);
  console.log('🔄 Workflows:', virtualMailboxApp.workflows.length);
  console.log('🔐 Permission Rules:', virtualMailboxApp.permissions?.rules.length);
  console.log('\n');
  
  // Try to create the app via API
  const serverUrl = process.env.NEO_SERVER_URL || 'http://localhost:3000';
  
  try {
    console.log(`📡 Importing app via ${serverUrl}/api/apps/import...`);
    
    const response = await fetch(`${serverUrl}/api/apps/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schema: virtualMailboxApp,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create app:', response.status, errorText);
      
      // Output the schema anyway so it can be used manually
      console.log('\n📋 App Schema (for manual creation):');
      console.log(JSON.stringify(virtualMailboxApp, null, 2));
      return;
    }
    
    const result = await response.json();
    console.log('✅ App created successfully!');
    console.log('🔗 App ID:', result.app?.id || result.id);
    console.log('🌐 Preview URL:', `${serverUrl}/preview/${result.app?.id || result.id}`);
    
  } catch (error) {
    console.error('❌ Error connecting to server:', error);
    console.log('\n📋 App Schema (for manual creation):');
    console.log(JSON.stringify(virtualMailboxApp, null, 2));
  }
}

main().catch(console.error);

export { virtualMailboxApp };
