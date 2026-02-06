import type { IndustryKit, IndustryKitId, IndustryEntitySpec, IndustryFieldSpec } from './types.js';

const field = (id: string, name: string, type: IndustryFieldSpec['type'], required = false): IndustryFieldSpec => ({
  id,
  name,
  type,
  required,
});

const enumField = (
  id: string,
  name: string,
  options: Array<{ value: string; label: string; color?: string }>,
  required = false
): IndustryFieldSpec => ({
  id,
  name,
  type: 'enum',
  required,
  enumOptions: options,
});

const refField = (id: string, name: string, targetEntity: string, displayField = 'name'): IndustryFieldSpec => ({
  id,
  name,
  type: 'reference',
  reference: { targetEntity, displayField },
});

const addressFields = (): IndustryFieldSpec[] => ([
  field('address', 'Address', 'string', true),
  field('city', 'City', 'string'),
  field('state', 'State', 'string'),
  field('postalCode', 'Postal Code', 'string'),
]);

// ============================================================
// GENERIC CLIENT ENTITY (for backwards compatibility)
// ============================================================

const clientEntity = (): IndustryEntitySpec => ({
  id: 'client',
  name: 'Client',
  pluralName: 'Clients',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    ...addressFields(),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

// ============================================================
// DOMAIN-SPECIFIC ENTITY FACTORIES
// ============================================================

/** Homeowner entity - for home service industries (plumber, electrician, HVAC, etc.) */
const homeownerEntity = (): IndustryEntitySpec => ({
  id: 'homeowner',
  name: 'Homeowner',
  pluralName: 'Homeowners',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    ...addressFields(),
    field('propertyType', 'Property Type', 'string'),
    field('preferredContactMethod', 'Preferred Contact', 'string'),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'lead', label: 'Lead', color: '#60a5fa' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

/** Customer entity - for retail/e-commerce industries */
const customerEntity = (): IndustryEntitySpec => ({
  id: 'customer',
  name: 'Customer',
  pluralName: 'Customers',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    ...addressFields(),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'vip', label: 'VIP', color: '#f59e0b' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

/** Member entity - for fitness/gym industries */
const memberEntity = (): IndustryEntitySpec => ({
  id: 'member',
  name: 'Member',
  pluralName: 'Members',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    field('joinDate', 'Join Date', 'date'),
    field('emergencyContact', 'Emergency Contact', 'string'),
    field('emergencyPhone', 'Emergency Phone', 'phone'),
    field('notes', 'Notes', 'richtext'),
    enumField('membershipType', 'Membership Type', [
      { value: 'basic', label: 'Basic', color: '#94a3b8' },
      { value: 'premium', label: 'Premium', color: '#f59e0b' },
      { value: 'unlimited', label: 'Unlimited', color: '#8b5cf6' },
    ]),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'trial', label: 'Trial', color: '#60a5fa' },
      { value: 'expired', label: 'Expired', color: '#ef4444' },
      { value: 'frozen', label: 'Frozen', color: '#94a3b8' },
    ]),
  ],
});

/** Student entity - for education/tutoring industries */
const studentEntity = (): IndustryEntitySpec => ({
  id: 'student',
  name: 'Student',
  pluralName: 'Students',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    field('parentName', 'Parent/Guardian Name', 'string'),
    field('parentPhone', 'Parent/Guardian Phone', 'phone'),
    field('gradeLevel', 'Grade Level', 'string'),
    field('subjects', 'Subjects', 'string'),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'on_hold', label: 'On Hold', color: '#f59e0b' },
      { value: 'completed', label: 'Completed', color: '#60a5fa' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

/** Care Recipient entity - for home health/caregiver industries */
const careRecipientEntity = (): IndustryEntitySpec => ({
  id: 'careRecipient',
  name: 'Care Recipient',
  pluralName: 'Care Recipients',
  fields: [
    field('name', 'Name', 'string', true),
    field('dateOfBirth', 'Date of Birth', 'date'),
    field('phone', 'Phone', 'phone'),
    ...addressFields(),
    field('primaryContact', 'Primary Contact', 'string', true),
    field('primaryContactPhone', 'Primary Contact Phone', 'phone', true),
    field('medicalNotes', 'Medical Notes', 'richtext'),
    field('careNeeds', 'Care Needs', 'richtext'),
    field('allergies', 'Allergies', 'string'),
    field('medications', 'Medications', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'on_hold', label: 'On Hold', color: '#f59e0b' },
      { value: 'discharged', label: 'Discharged', color: '#94a3b8' },
    ]),
  ],
});

/** Vehicle Owner entity - for mechanic/auto industries */
const vehicleOwnerEntity = (): IndustryEntitySpec => ({
  id: 'vehicleOwner',
  name: 'Vehicle Owner',
  pluralName: 'Vehicle Owners',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    ...addressFields(),
    field('preferredContactMethod', 'Preferred Contact', 'string'),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

/** Property Owner entity - for landscaping/cleaning industries */
const propertyOwnerEntity = (): IndustryEntitySpec => ({
  id: 'propertyOwner',
  name: 'Property Owner',
  pluralName: 'Property Owners',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    ...addressFields(),
    field('propertyType', 'Property Type', 'string'),
    field('propertySize', 'Property Size', 'string'),
    field('preferredServiceDay', 'Preferred Service Day', 'string'),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'seasonal', label: 'Seasonal', color: '#f59e0b' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

/** Tenant entity - for property management */
const tenantEntity = (): IndustryEntitySpec => ({
  id: 'tenant',
  name: 'Tenant',
  pluralName: 'Tenants',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    field('moveInDate', 'Move-in Date', 'date'),
    field('leaseEndDate', 'Lease End Date', 'date'),
    field('monthlyRent', 'Monthly Rent', 'currency'),
    field('securityDeposit', 'Security Deposit', 'currency'),
    field('emergencyContact', 'Emergency Contact', 'string'),
    field('emergencyPhone', 'Emergency Phone', 'phone'),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'pending', label: 'Pending Move-in', color: '#60a5fa' },
      { value: 'notice', label: 'Notice Given', color: '#f59e0b' },
      { value: 'past', label: 'Past Tenant', color: '#94a3b8' },
    ]),
  ],
});

/** Guest entity - for hospitality industries */
const guestEntity = (): IndustryEntitySpec => ({
  id: 'guest',
  name: 'Guest',
  pluralName: 'Guests',
  fields: [
    field('name', 'Name', 'string', true),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    field('preferences', 'Preferences', 'richtext'),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#16a34a' },
      { value: 'vip', label: 'VIP', color: '#f59e0b' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

const invoiceEntity = (): IndustryEntitySpec => ({
  id: 'invoice',
  name: 'Invoice',
  pluralName: 'Invoices',
  fields: [
    field('invoiceNumber', 'Invoice Number', 'string', true),
    refField('clientId', 'Client', 'client'),
    field('issueDate', 'Issue Date', 'date', true),
    field('dueDate', 'Due Date', 'date', true),
    field('subtotal', 'Subtotal', 'currency'),
    field('tax', 'Tax', 'currency'),
    field('total', 'Total', 'currency', true),
    enumField('status', 'Status', [
      { value: 'draft', label: 'Draft', color: '#94a3b8' },
      { value: 'sent', label: 'Sent', color: '#60a5fa' },
      { value: 'paid', label: 'Paid', color: '#22c55e' },
      { value: 'overdue', label: 'Overdue', color: '#ef4444' },
    ]),
    field('paid', 'Paid', 'boolean'),
  ],
});

const quoteEntity = (): IndustryEntitySpec => ({
  id: 'quote',
  name: 'Quote',
  pluralName: 'Quotes',
  fields: [
    field('quoteNumber', 'Quote Number', 'string', true),
    refField('clientId', 'Client', 'client'),
    field('issueDate', 'Issue Date', 'date', true),
    field('validUntil', 'Valid Until', 'date'),
    field('total', 'Total', 'currency', true),
    enumField('status', 'Status', [
      { value: 'draft', label: 'Draft', color: '#94a3b8' },
      { value: 'sent', label: 'Sent', color: '#60a5fa' },
      { value: 'accepted', label: 'Accepted', color: '#22c55e' },
      { value: 'declined', label: 'Declined', color: '#ef4444' },
    ]),
  ],
});

const appointmentEntity = (): IndustryEntitySpec => ({
  id: 'appointment',
  name: 'Appointment',
  pluralName: 'Schedule',
  fields: [
    field('title', 'Title', 'string', true),
    refField('clientId', 'Client', 'client'),
    field('startTime', 'Start Time', 'datetime', true),
    field('endTime', 'End Time', 'datetime'),
    field('location', 'Location', 'string'),
    enumField('status', 'Status', [
      { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
      { value: 'completed', label: 'Completed', color: '#22c55e' },
      { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
    ]),
  ],
});

const taskEntity = (): IndustryEntitySpec => ({
  id: 'task',
  name: 'Task',
  pluralName: 'Tasks',
  fields: [
    field('title', 'Title', 'string', true),
    field('description', 'Description', 'richtext'),
    field('dueDate', 'Due Date', 'date'),
    enumField('status', 'Status', [
      { value: 'todo', label: 'To Do', color: '#94a3b8' },
      { value: 'in_progress', label: 'In Progress', color: '#60a5fa' },
      { value: 'done', label: 'Done', color: '#22c55e' },
    ]),
    field('assignedTo', 'Assigned To', 'string'),
  ],
});

const messageEntity = (): IndustryEntitySpec => ({
  id: 'message',
  name: 'Message',
  pluralName: 'Messages',
  fields: [
    field('subject', 'Subject', 'string', true),
    field('body', 'Body', 'richtext'),
    refField('clientId', 'Client', 'client'),
    enumField('channel', 'Channel', [
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' },
      { value: 'call', label: 'Call' },
    ]),
    enumField('status', 'Status', [
      { value: 'draft', label: 'Draft', color: '#94a3b8' },
      { value: 'sent', label: 'Sent', color: '#60a5fa' },
    ]),
  ],
});

const staffEntity = (): IndustryEntitySpec => ({
  id: 'staff',
  name: 'Staff Member',
  pluralName: 'Staff',
  fields: [
    field('name', 'Name', 'string', true),
    field('role', 'Role', 'string'),
    field('email', 'Email', 'email'),
    field('phone', 'Phone', 'phone'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#22c55e' },
      { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
    ]),
  ],
});

const materialEntity = (): IndustryEntitySpec => ({
  id: 'material',
  name: 'Material',
  pluralName: 'Materials',
  fields: [
    field('name', 'Name', 'string', true),
    field('sku', 'SKU', 'string'),
    field('quantity', 'Quantity', 'number'),
    field('unitCost', 'Unit Cost', 'currency'),
    field('category', 'Category', 'string'),
    field('supplier', 'Supplier', 'string'),
    enumField('status', 'Status', [
      { value: 'in_stock', label: 'In Stock', color: '#22c55e' },
      { value: 'low', label: 'Low Stock', color: '#f97316' },
      { value: 'out_of_stock', label: 'Out of Stock', color: '#ef4444' },
    ]),
  ],
});

// ============================================================
// ADDITIONAL ENTITY FACTORIES (for behavior bundles)
// ============================================================

/** Product entity - for e-commerce and retail */
const productEntity = (): IndustryEntitySpec => ({
  id: 'product',
  name: 'Product',
  pluralName: 'Products',
  fields: [
    field('name', 'Name', 'string', true),
    field('sku', 'SKU', 'string'),
    field('description', 'Description', 'richtext'),
    field('price', 'Price', 'currency', true),
    field('cost', 'Cost', 'currency'),
    field('quantity', 'Stock Quantity', 'number'),
    field('category', 'Category', 'string'),
    field('imageUrl', 'Image URL', 'string'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#22c55e' },
      { value: 'draft', label: 'Draft', color: '#94a3b8' },
      { value: 'out_of_stock', label: 'Out of Stock', color: '#ef4444' },
    ]),
  ],
});

/** Order entity - for e-commerce and service businesses */
const orderEntity = (): IndustryEntitySpec => ({
  id: 'order',
  name: 'Order',
  pluralName: 'Orders',
  fields: [
    field('orderNumber', 'Order #', 'string', true),
    refField('customerId', 'Customer', 'customer'),
    field('orderDate', 'Order Date', 'date', true),
    field('subtotal', 'Subtotal', 'currency'),
    field('tax', 'Tax', 'currency'),
    field('total', 'Total', 'currency', true),
    field('notes', 'Notes', 'richtext'),
    enumField('status', 'Status', [
      { value: 'pending', label: 'Pending', color: '#f59e0b' },
      { value: 'processing', label: 'Processing', color: '#60a5fa' },
      { value: 'shipped', label: 'Shipped', color: '#8b5cf6' },
      { value: 'delivered', label: 'Delivered', color: '#22c55e' },
      { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
    ]),
  ],
});

/** Payment entity - for tracking payments */
const paymentEntity = (): IndustryEntitySpec => ({
  id: 'payment',
  name: 'Payment',
  pluralName: 'Payments',
  fields: [
    field('amount', 'Amount', 'currency', true),
    field('paymentDate', 'Payment Date', 'date', true),
    refField('invoiceId', 'Invoice', 'invoice'),
    field('reference', 'Reference', 'string'),
    enumField('method', 'Method', [
      { value: 'cash', label: 'Cash' },
      { value: 'card', label: 'Card' },
      { value: 'check', label: 'Check' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'other', label: 'Other' },
    ]),
    enumField('status', 'Status', [
      { value: 'pending', label: 'Pending', color: '#f59e0b' },
      { value: 'completed', label: 'Completed', color: '#22c55e' },
      { value: 'failed', label: 'Failed', color: '#ef4444' },
      { value: 'refunded', label: 'Refunded', color: '#94a3b8' },
    ]),
  ],
});

/** Conversation entity - for messaging/chat features */
const conversationEntity = (): IndustryEntitySpec => ({
  id: 'conversation',
  name: 'Conversation',
  pluralName: 'Conversations',
  fields: [
    field('subject', 'Subject', 'string'),
    refField('participantId', 'Participant', 'client'),
    field('lastMessageAt', 'Last Message', 'datetime'),
    field('messageCount', 'Messages', 'number'),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#22c55e' },
      { value: 'archived', label: 'Archived', color: '#94a3b8' },
    ]),
  ],
});

/** Notification entity - for in-app notifications */
const notificationEntity = (): IndustryEntitySpec => ({
  id: 'notification',
  name: 'Notification',
  pluralName: 'Notifications',
  fields: [
    field('title', 'Title', 'string', true),
    field('message', 'Message', 'richtext'),
    field('createdAt', 'Created', 'datetime'),
    field('readAt', 'Read At', 'datetime'),
    enumField('type', 'Type', [
      { value: 'info', label: 'Info', color: '#60a5fa' },
      { value: 'success', label: 'Success', color: '#22c55e' },
      { value: 'warning', label: 'Warning', color: '#f59e0b' },
      { value: 'error', label: 'Error', color: '#ef4444' },
    ]),
    enumField('status', 'Status', [
      { value: 'unread', label: 'Unread', color: '#60a5fa' },
      { value: 'read', label: 'Read', color: '#94a3b8' },
    ]),
  ],
});

/** Document entity - for file/document management */
const documentEntity = (): IndustryEntitySpec => ({
  id: 'document',
  name: 'Document',
  pluralName: 'Documents',
  fields: [
    field('name', 'Name', 'string', true),
    field('description', 'Description', 'string'),
    field('fileUrl', 'File URL', 'string'),
    field('fileSize', 'Size', 'number'),
    field('uploadedAt', 'Uploaded', 'datetime'),
    enumField('type', 'Type', [
      { value: 'contract', label: 'Contract' },
      { value: 'invoice', label: 'Invoice' },
      { value: 'receipt', label: 'Receipt' },
      { value: 'photo', label: 'Photo' },
      { value: 'other', label: 'Other' },
    ]),
    enumField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#22c55e' },
      { value: 'archived', label: 'Archived', color: '#94a3b8' },
    ]),
  ],
});

/** Gallery entity - for image galleries */
const galleryEntity = (): IndustryEntitySpec => ({
  id: 'gallery',
  name: 'Gallery Item',
  pluralName: 'Gallery',
  fields: [
    field('title', 'Title', 'string', true),
    field('description', 'Description', 'string'),
    field('imageUrl', 'Image URL', 'string', true),
    field('uploadedAt', 'Uploaded', 'datetime'),
    field('tags', 'Tags', 'string'),
    enumField('category', 'Category', [
      { value: 'before', label: 'Before' },
      { value: 'after', label: 'After' },
      { value: 'portfolio', label: 'Portfolio' },
      { value: 'other', label: 'Other' },
    ]),
  ],
});

/** Role entity - for permissions/access control */
const roleEntity = (): IndustryEntitySpec => ({
  id: 'role',
  name: 'Role',
  pluralName: 'Roles',
  fields: [
    field('name', 'Role Name', 'string', true),
    field('description', 'Description', 'string'),
    field('permissions', 'Permissions', 'richtext'),
    enumField('level', 'Access Level', [
      { value: 'admin', label: 'Admin', color: '#ef4444' },
      { value: 'manager', label: 'Manager', color: '#f59e0b' },
      { value: 'staff', label: 'Staff', color: '#60a5fa' },
      { value: 'readonly', label: 'Read Only', color: '#94a3b8' },
    ]),
  ],
});

/** Menu Item entity - for restaurants */
const menuItemEntity = (): IndustryEntitySpec => ({
  id: 'menuItem',
  name: 'Menu Item',
  pluralName: 'Menu Items',
  fields: [
    field('name', 'Name', 'string', true),
    field('description', 'Description', 'richtext'),
    field('price', 'Price', 'currency', true),
    field('category', 'Category', 'string'),
    field('imageUrl', 'Image', 'string'),
    enumField('status', 'Status', [
      { value: 'available', label: 'Available', color: '#22c55e' },
      { value: 'unavailable', label: 'Unavailable', color: '#ef4444' },
    ]),
  ],
});

// ============================================================
// INDUSTRY KITS
// ============================================================

const plumberKit: IndustryKit = {
  id: 'plumber',
  name: 'Plumber',
  professions: ['Plumber', 'Service Plumber', 'Pipefitter'],
  keywords: ['plumber', 'plumbing', 'pipe', 'leak', 'drain'],
  dashboardType: 'service',
  complexity: 'high',
  uiStyle: 'bold',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'invoices', 'quotes', 'inventory', 'scheduling', 'messaging', 'gallery', 'staff', 'tasks', 'settings'],
  optionalModules: ['payments', 'documents', 'notifications', 'permissions'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Accept card payments on-site' },
    { id: 'quickbooks', name: 'QuickBooks', purpose: 'Accounting and invoicing' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
    { id: 'thumbtack', name: 'Thumbtack', purpose: 'Lead generation' },
  ],
  entities: [
    homeownerEntity(),
    {
      id: 'job',
      name: 'Job',
      pluralName: 'Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        field('description', 'Description', 'richtext'),
        refField('homeownerId', 'Homeowner', 'homeowner'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'invoiced', label: 'Invoiced', color: '#14b8a6' },
        ]),
        enumField('urgencyLevel', 'Urgency', [
          { value: 'low', label: 'Low', color: '#94a3b8' },
          { value: 'medium', label: 'Medium', color: '#f97316' },
          { value: 'high', label: 'High', color: '#ef4444' },
          { value: 'emergency', label: 'Emergency', color: '#dc2626' },
        ]),
        field('appointmentDate', 'Appointment Date', 'datetime'),
        field('jobAddress', 'Job Address', 'string', true),
        field('partsUsed', 'Parts Used', 'string'),
        field('laborHours', 'Labor Hours', 'number'),
        field('quoteAmount', 'Quote Amount', 'currency'),
        field('invoiceTotal', 'Invoice Total', 'currency'),
        refField('technicianAssigned', 'Technician', 'staff'),
      ],
    },
    invoiceEntity(),
    quoteEntity(),
    materialEntity(),
    appointmentEntity(),
    taskEntity(),
    messageEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'form', 'calendar', 'timeline', 'gallery', 'settings'],
  workflows: ['job-status', 'invoice-generation', 'schedule-reminders', 'quote-approval'],
  automationRules: ['on job completed -> generate invoice', 'on quote accepted -> create job'],
  metrics: ['jobs_completed', 'revenue', 'average_response_time', 'open_quotes'],
};

const electricianKit: IndustryKit = {
  id: 'electrician',
  name: 'Electrician',
  professions: ['Electrician', 'Electrical Contractor'],
  keywords: ['electrician', 'electrical', 'wiring', 'circuit', 'panel'],
  dashboardType: 'service',
  complexity: 'high',
  uiStyle: 'bold',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'invoices', 'quotes', 'scheduling', 'inventory', 'staff', 'tasks', 'settings'],
  optionalModules: ['messaging', 'documents', 'gallery'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Accept card payments on-site' },
    { id: 'quickbooks', name: 'QuickBooks', purpose: 'Accounting and invoicing' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
    { id: 'homeadvisor', name: 'HomeAdvisor', purpose: 'Lead generation' },
  ],
  entities: [
    homeownerEntity(),
    {
      id: 'job',
      name: 'Job',
      pluralName: 'Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        refField('homeownerId', 'Homeowner', 'homeowner'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ]),
        field('serviceType', 'Service Type', 'string'),
        field('panelLocation', 'Panel Location', 'string'),
        field('permitRequired', 'Permit Required', 'boolean'),
        field('appointmentDate', 'Appointment Date', 'datetime'),
      ],
    },
    invoiceEntity(),
    quoteEntity(),
    appointmentEntity(),
    materialEntity(),
    staffEntity(),
    taskEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'form', 'detail', 'calendar'],
  workflows: ['job-status', 'permit-tracking'],
  automationRules: ['on job completed -> create invoice'],
  metrics: ['jobs_completed', 'open_permits', 'revenue'],
};

// ============================================================
// COMPREHENSIVE CONSTRUCTION/CONTRACTOR MANAGEMENT KIT
// Supports: Admin, Field Staff, Client surfaces
// ============================================================
const contractorKit: IndustryKit = {
  id: 'contractor',
  name: 'Construction / Contractor Management',
  professions: ['General Contractor', 'Contractor', 'Builder', 'Construction Company', 'Construction Manager'],
  keywords: ['contractor', 'construction', 'project', 'renovation', 'builder', 'subcontractor', 'change order', 'estimate'],
  dashboardType: 'operations',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'projects', 'estimates', 'change-orders', 'invoices', 'tasks', 'scheduling', 'materials', 'subcontractors', 'documents', 'daily-reports', 'settings'],
  optionalModules: ['messaging', 'gallery', 'permits'],
  suggestedIntegrations: [
    { id: 'quickbooks', name: 'QuickBooks', purpose: 'Accounting integration' },
    { id: 'stripe', name: 'Stripe', purpose: 'Payment processing' },
    { id: 'procore', name: 'Procore', purpose: 'Construction management' },
    { id: 'buildertrend', name: 'BuilderTrend', purpose: 'Project management' },
  ],
  featureBundle: {
    core: ['project_management', 'client_management', 'estimates', 'invoicing', 'task_management'],
    recommended: ['change_orders', 'materials_tracking', 'subcontractor_management', 'daily_reports', 'document_management'],
    optional: ['client_portal', 'field_staff_portal', 'retainage_tracking', 'progress_payments'],
  },
  entities: [
    // CLIENT - Project owners/companies
    {
      id: 'client',
      name: 'Client',
      pluralName: 'Clients',
      fields: [
        field('companyName', 'Company Name', 'string', true),
        field('contactName', 'Contact Person', 'string', true),
        field('email', 'Email', 'email', true),
        field('phone', 'Phone', 'phone'),
        field('billingAddress', 'Billing Address', 'string'),
        field('city', 'City', 'string'),
        field('state', 'State', 'string'),
        field('postalCode', 'Postal Code', 'string'),
        field('notes', 'Notes', 'richtext'),
        enumField('clientType', 'Client Type', [
          { value: 'residential', label: 'Residential', color: '#60a5fa' },
          { value: 'commercial', label: 'Commercial', color: '#8b5cf6' },
          { value: 'industrial', label: 'Industrial', color: '#f59e0b' },
          { value: 'government', label: 'Government', color: '#14b8a6' },
        ]),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'prospect', label: 'Prospect', color: '#60a5fa' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
      ],
    },
    // PROJECT - Construction projects
    {
      id: 'project',
      name: 'Project',
      pluralName: 'Projects',
      fields: [
        field('projectName', 'Project Name', 'string', true),
        refField('clientId', 'Client', 'client', 'companyName'),
        field('siteAddress', 'Site Address', 'string', true),
        field('city', 'City', 'string'),
        field('state', 'State', 'string'),
        field('scopeOfWork', 'Scope of Work', 'richtext'),
        field('contractValue', 'Contract Value', 'currency'),
        field('budget', 'Budget', 'currency'),
        field('startDate', 'Start Date', 'date'),
        field('targetEndDate', 'Target End Date', 'date'),
        field('actualEndDate', 'Actual End Date', 'date'),
        enumField('currentPhase', 'Current Phase', [
          { value: 'planning', label: 'Planning', color: '#60a5fa' },
          { value: 'permits', label: 'Permits', color: '#8b5cf6' },
          { value: 'demolition', label: 'Demolition', color: '#ef4444' },
          { value: 'foundation', label: 'Foundation', color: '#f97316' },
          { value: 'framing', label: 'Framing', color: '#f59e0b' },
          { value: 'mep', label: 'MEP (Mechanical/Electrical/Plumbing)', color: '#eab308' },
          { value: 'finishes', label: 'Finishes', color: '#84cc16' },
          { value: 'punch_list', label: 'Punch List', color: '#22c55e' },
          { value: 'closeout', label: 'Closeout', color: '#14b8a6' },
        ]),
        enumField('status', 'Status', [
          { value: 'bidding', label: 'Bidding', color: '#60a5fa' },
          { value: 'won', label: 'Contract Won', color: '#8b5cf6' },
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'on_hold', label: 'On Hold', color: '#f59e0b' },
          { value: 'completed', label: 'Completed', color: '#14b8a6' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]),
        field('percentComplete', 'Percent Complete', 'number'),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    // ESTIMATE - Project bids and quotes
    {
      id: 'estimate',
      name: 'Estimate',
      pluralName: 'Estimates',
      fields: [
        field('estimateNumber', 'Estimate #', 'string', true),
        refField('projectId', 'Project', 'project', 'projectName'),
        refField('clientId', 'Client', 'client', 'companyName'),
        field('description', 'Description', 'richtext'),
        field('laborCost', 'Labor Cost', 'currency'),
        field('materialsCost', 'Materials Cost', 'currency'),
        field('overheadCost', 'Overhead', 'currency'),
        field('markupPercent', 'Markup %', 'number'),
        field('totalAmount', 'Total Amount', 'currency'),
        field('validUntil', 'Valid Until', 'date'),
        field('versionNumber', 'Version', 'number'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'sent', label: 'Sent to Client', color: '#60a5fa' },
          { value: 'approved', label: 'Approved', color: '#22c55e' },
          { value: 'rejected', label: 'Rejected', color: '#ef4444' },
          { value: 'expired', label: 'Expired', color: '#f59e0b' },
          { value: 'revised', label: 'Revised', color: '#8b5cf6' },
        ]),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    // CHANGE ORDER - Project modifications
    {
      id: 'changeOrder',
      name: 'Change Order',
      pluralName: 'Change Orders',
      fields: [
        field('changeOrderNumber', 'CO #', 'string', true),
        refField('projectId', 'Project', 'project', 'projectName'),
        field('title', 'Title', 'string', true),
        field('description', 'Description', 'richtext', true),
        enumField('reason', 'Reason', [
          { value: 'client_request', label: 'Client Request', color: '#60a5fa' },
          { value: 'unforeseen_condition', label: 'Unforeseen Condition', color: '#f59e0b' },
          { value: 'design_change', label: 'Design Change', color: '#8b5cf6' },
          { value: 'code_requirement', label: 'Code Requirement', color: '#14b8a6' },
          { value: 'error_correction', label: 'Error Correction', color: '#ef4444' },
        ]),
        field('costImpact', 'Cost Impact', 'currency'),
        field('scheduleImpactDays', 'Schedule Impact (Days)', 'number'),
        field('submittedDate', 'Submitted Date', 'date'),
        field('approvedDate', 'Approved Date', 'date'),
        field('approvedBy', 'Approved By', 'string'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'pending_approval', label: 'Pending Approval', color: '#f59e0b' },
          { value: 'approved', label: 'Approved', color: '#22c55e' },
          { value: 'rejected', label: 'Rejected', color: '#ef4444' },
        ]),
        field('clientSignature', 'Client Signature', 'string'),
      ],
    },
    // TASK - Work items
    {
      id: 'task',
      name: 'Task',
      pluralName: 'Tasks',
      fields: [
        field('taskName', 'Task Name', 'string', true),
        refField('projectId', 'Project', 'project', 'projectName'),
        field('description', 'Description', 'richtext'),
        enumField('phase', 'Phase', [
          { value: 'planning', label: 'Planning', color: '#60a5fa' },
          { value: 'permits', label: 'Permits', color: '#8b5cf6' },
          { value: 'demolition', label: 'Demolition', color: '#ef4444' },
          { value: 'foundation', label: 'Foundation', color: '#f97316' },
          { value: 'framing', label: 'Framing', color: '#f59e0b' },
          { value: 'mep', label: 'MEP', color: '#eab308' },
          { value: 'finishes', label: 'Finishes', color: '#84cc16' },
          { value: 'punch_list', label: 'Punch List', color: '#22c55e' },
          { value: 'closeout', label: 'Closeout', color: '#14b8a6' },
        ]),
        refField('assignedToStaff', 'Assigned To (Staff)', 'staff', 'name'),
        refField('assignedToSubcontractor', 'Assigned To (Sub)', 'subcontractor', 'companyName'),
        field('startDate', 'Start Date', 'date'),
        field('dueDate', 'Due Date', 'date'),
        field('completedDate', 'Completed Date', 'date'),
        field('predecessorTask', 'Predecessor Task', 'string'),
        enumField('priority', 'Priority', [
          { value: 'low', label: 'Low', color: '#94a3b8' },
          { value: 'medium', label: 'Medium', color: '#60a5fa' },
          { value: 'high', label: 'High', color: '#f59e0b' },
          { value: 'urgent', label: 'Urgent', color: '#ef4444' },
        ]),
        enumField('status', 'Status', [
          { value: 'not_started', label: 'Not Started', color: '#94a3b8' },
          { value: 'in_progress', label: 'In Progress', color: '#60a5fa' },
          { value: 'blocked', label: 'Blocked', color: '#ef4444' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
        ]),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    // MATERIAL - Procurement tracking
    {
      id: 'material',
      name: 'Material',
      pluralName: 'Materials',
      fields: [
        field('materialName', 'Material Name', 'string', true),
        refField('projectId', 'Project', 'project', 'projectName'),
        field('description', 'Description', 'richtext'),
        field('quantity', 'Quantity', 'number', true),
        field('unitOfMeasure', 'Unit', 'string'),
        field('unitCost', 'Unit Cost', 'currency'),
        field('totalCost', 'Total Cost', 'currency'),
        field('supplierName', 'Supplier', 'string'),
        field('orderDate', 'Order Date', 'date'),
        field('expectedDelivery', 'Expected Delivery', 'date'),
        field('deliveredDate', 'Delivered Date', 'date'),
        enumField('orderStatus', 'Order Status', [
          { value: 'not_ordered', label: 'Not Ordered', color: '#94a3b8' },
          { value: 'ordered', label: 'Ordered', color: '#60a5fa' },
          { value: 'shipped', label: 'Shipped', color: '#8b5cf6' },
          { value: 'delivered', label: 'Delivered', color: '#22c55e' },
          { value: 'backordered', label: 'Backordered', color: '#f59e0b' },
        ]),
        field('receiptUrl', 'Receipt/Invoice', 'url'),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    // SUBCONTRACTOR - Trade partners
    {
      id: 'subcontractor',
      name: 'Subcontractor',
      pluralName: 'Subcontractors',
      fields: [
        field('companyName', 'Company Name', 'string', true),
        field('contactName', 'Contact Person', 'string'),
        field('email', 'Email', 'email'),
        field('phone', 'Phone', 'phone'),
        enumField('trade', 'Trade', [
          { value: 'electrical', label: 'Electrical', color: '#f59e0b' },
          { value: 'plumbing', label: 'Plumbing', color: '#60a5fa' },
          { value: 'hvac', label: 'HVAC', color: '#14b8a6' },
          { value: 'framing', label: 'Framing', color: '#8b5cf6' },
          { value: 'roofing', label: 'Roofing', color: '#ef4444' },
          { value: 'concrete', label: 'Concrete', color: '#94a3b8' },
          { value: 'drywall', label: 'Drywall', color: '#84cc16' },
          { value: 'painting', label: 'Painting', color: '#ec4899' },
          { value: 'flooring', label: 'Flooring', color: '#f97316' },
          { value: 'landscaping', label: 'Landscaping', color: '#22c55e' },
          { value: 'other', label: 'Other', color: '#6b7280' },
        ]),
        field('licenseNumber', 'License #', 'string'),
        field('insuranceExpiry', 'Insurance Expiry', 'date'),
        field('hourlyRate', 'Hourly Rate', 'currency'),
        field('dailyRate', 'Daily Rate', 'currency'),
        field('address', 'Address', 'string'),
        field('city', 'City', 'string'),
        field('state', 'State', 'string'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'preferred', label: 'Preferred', color: '#f59e0b' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    // INVOICE - Billing
    {
      id: 'invoice',
      name: 'Invoice',
      pluralName: 'Invoices',
      fields: [
        field('invoiceNumber', 'Invoice #', 'string', true),
        refField('projectId', 'Project', 'project', 'projectName'),
        refField('clientId', 'Client', 'client', 'companyName'),
        enumField('invoiceType', 'Invoice Type', [
          { value: 'progress_payment', label: 'Progress Payment', color: '#60a5fa' },
          { value: 'final', label: 'Final Invoice', color: '#22c55e' },
          { value: 'retainage_release', label: 'Retainage Release', color: '#8b5cf6' },
        ]),
        field('description', 'Description', 'richtext'),
        field('amount', 'Amount', 'currency', true),
        field('taxAmount', 'Tax', 'currency'),
        field('totalAmount', 'Total', 'currency'),
        field('retainagePercent', 'Retainage %', 'number'),
        field('retainageAmount', 'Retainage Held', 'currency'),
        field('issueDate', 'Issue Date', 'date', true),
        field('dueDate', 'Due Date', 'date', true),
        field('paidDate', 'Paid Date', 'date'),
        field('paidAmount', 'Amount Paid', 'currency'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'sent', label: 'Sent', color: '#60a5fa' },
          { value: 'partial', label: 'Partially Paid', color: '#f59e0b' },
          { value: 'paid', label: 'Paid', color: '#22c55e' },
          { value: 'overdue', label: 'Overdue', color: '#ef4444' },
        ]),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    // DOCUMENT - Project files
    {
      id: 'document',
      name: 'Document',
      pluralName: 'Documents',
      fields: [
        field('documentName', 'Document Name', 'string', true),
        refField('projectId', 'Project', 'project', 'projectName'),
        enumField('documentType', 'Document Type', [
          { value: 'plan', label: 'Plan/Drawing', color: '#60a5fa' },
          { value: 'permit', label: 'Permit', color: '#8b5cf6' },
          { value: 'contract', label: 'Contract', color: '#14b8a6' },
          { value: 'photo', label: 'Photo', color: '#f59e0b' },
          { value: 'inspection', label: 'Inspection Report', color: '#22c55e' },
          { value: 'specification', label: 'Specification', color: '#ec4899' },
          { value: 'other', label: 'Other', color: '#94a3b8' },
        ]),
        field('fileUrl', 'File', 'url'),
        field('versionNumber', 'Version', 'number'),
        field('uploadDate', 'Upload Date', 'datetime'),
        field('uploadedBy', 'Uploaded By', 'string'),
        field('description', 'Description', 'richtext'),
        field('visibleToClient', 'Visible to Client', 'boolean'),
      ],
    },
    // DAILY REPORT - Field staff submissions
    {
      id: 'dailyReport',
      name: 'Daily Report',
      pluralName: 'Daily Reports',
      fields: [
        refField('projectId', 'Project', 'project', 'projectName'),
        field('reportDate', 'Report Date', 'date', true),
        enumField('weather', 'Weather', [
          { value: 'sunny', label: 'Sunny', color: '#f59e0b' },
          { value: 'cloudy', label: 'Cloudy', color: '#94a3b8' },
          { value: 'rainy', label: 'Rainy', color: '#60a5fa' },
          { value: 'snow', label: 'Snow', color: '#e2e8f0' },
          { value: 'extreme', label: 'Extreme', color: '#ef4444' },
        ]),
        field('crewCount', 'Crew on Site', 'number'),
        field('workCompleted', 'Work Completed', 'richtext', true),
        field('issuesDelays', 'Issues/Delays', 'richtext'),
        field('materialsUsed', 'Materials Used', 'richtext'),
        field('equipmentUsed', 'Equipment Used', 'richtext'),
        field('photos', 'Photos', 'url'),
        field('submittedBy', 'Submitted By', 'string'),
        field('submittedAt', 'Submitted At', 'datetime'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'submitted', label: 'Submitted', color: '#60a5fa' },
          { value: 'reviewed', label: 'Reviewed', color: '#22c55e' },
        ]),
      ],
    },
    // ISSUE - Problems/blockers
    {
      id: 'issue',
      name: 'Issue',
      pluralName: 'Issues',
      fields: [
        field('title', 'Title', 'string', true),
        refField('projectId', 'Project', 'project', 'projectName'),
        field('description', 'Description', 'richtext', true),
        enumField('priority', 'Priority', [
          { value: 'low', label: 'Low', color: '#94a3b8' },
          { value: 'medium', label: 'Medium', color: '#60a5fa' },
          { value: 'high', label: 'High', color: '#f59e0b' },
          { value: 'critical', label: 'Critical', color: '#ef4444' },
        ]),
        enumField('status', 'Status', [
          { value: 'open', label: 'Open', color: '#ef4444' },
          { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
          { value: 'resolved', label: 'Resolved', color: '#22c55e' },
        ]),
        field('assignedTo', 'Assigned To', 'string'),
        field('reportedBy', 'Reported By', 'string'),
        field('reportedDate', 'Reported Date', 'date'),
        field('resolvedDate', 'Resolved Date', 'date'),
        field('resolution', 'Resolution Notes', 'richtext'),
      ],
    },
    // STAFF - Internal employees
    {
      id: 'staff',
      name: 'Staff',
      pluralName: 'Staff',
      fields: [
        field('name', 'Name', 'string', true),
        field('email', 'Email', 'email'),
        field('phone', 'Phone', 'phone'),
        enumField('role', 'Role', [
          { value: 'admin', label: 'Admin/Office', color: '#8b5cf6' },
          { value: 'project_manager', label: 'Project Manager', color: '#60a5fa' },
          { value: 'site_manager', label: 'Site Manager', color: '#14b8a6' },
          { value: 'foreman', label: 'Foreman', color: '#f59e0b' },
          { value: 'field_worker', label: 'Field Worker', color: '#22c55e' },
        ]),
        field('hireDate', 'Hire Date', 'date'),
        field('hourlyRate', 'Hourly Rate', 'currency'),
        field('certifications', 'Certifications', 'richtext'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
      ],
    },
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'form', 'calendar', 'timeline', 'kanban'],
  workflows: ['project-lifecycle', 'estimate-approval', 'change-order-approval', 'invoice-payment', 'task-completion'],
  automationRules: [
    'on estimate approved -> create project',
    'on change order approved -> update project budget',
    'on invoice overdue -> send reminder',
    'on daily report submitted -> notify project manager',
  ],
  metrics: ['projects_active', 'budget_utilization', 'invoices_outstanding', 'change_orders_pending', 'tasks_overdue'],
  statusWorkflows: [
    {
      entity: 'project',
      field: 'status',
      states: ['bidding', 'won', 'active', 'on_hold', 'completed', 'cancelled'],
      transitions: [
        { from: 'bidding', to: 'won', action: 'mark_won' },
        { from: 'bidding', to: 'cancelled', action: 'cancel' },
        { from: 'won', to: 'active', action: 'start_project' },
        { from: 'active', to: 'on_hold', action: 'put_on_hold' },
        { from: 'on_hold', to: 'active', action: 'resume' },
        { from: 'active', to: 'completed', action: 'complete' },
      ],
    },
    {
      entity: 'changeOrder',
      field: 'status',
      states: ['draft', 'pending_approval', 'approved', 'rejected'],
      transitions: [
        { from: 'draft', to: 'pending_approval', action: 'submit_for_approval' },
        { from: 'pending_approval', to: 'approved', action: 'approve' },
        { from: 'pending_approval', to: 'rejected', action: 'reject' },
      ],
    },
    {
      entity: 'estimate',
      field: 'status',
      states: ['draft', 'sent', 'approved', 'rejected', 'expired', 'revised'],
      transitions: [
        { from: 'draft', to: 'sent', action: 'send_to_client' },
        { from: 'sent', to: 'approved', action: 'approve' },
        { from: 'sent', to: 'rejected', action: 'reject' },
        { from: 'sent', to: 'expired', action: 'expire' },
        { from: 'rejected', to: 'revised', action: 'revise' },
        { from: 'revised', to: 'sent', action: 'resend' },
      ],
    },
  ],
  dashboardTemplate: {
    kpis: [
      { label: 'Active Projects', metric: 'project.count(status=active)', icon: 'folder', format: 'number' },
      { label: 'Outstanding Invoices', metric: 'invoice.sum(totalAmount, status in [sent,partial,overdue])', icon: 'dollar-sign', format: 'currency' },
      { label: 'Pending Change Orders', metric: 'changeOrder.count(status=pending_approval)', icon: 'file-text', format: 'number' },
      { label: 'Overdue Tasks', metric: 'task.count(status in [not_started,in_progress], dueDate < today)', icon: 'alert-circle', format: 'number' },
    ],
    charts: [
      { type: 'pie', title: 'Projects by Status', dataQuery: 'project.groupBy(status).count()' },
      { type: 'pie', title: 'Invoices by Status', dataQuery: 'invoice.groupBy(status).count()' },
    ],
    lists: [
      { title: 'Projects at Risk', query: 'project.where(status=active).limit(5)', limit: 5 },
      { title: 'Recent Change Orders', query: 'changeOrder.orderBy(submittedDate, desc).limit(5)', limit: 5 },
    ],
  },
  businessRules: [
    { id: 'change_order_approval', entity: 'changeOrder', action: 'update', field: 'status', condition: 'requiresClientSignature', message: 'Change orders require client approval before work proceeds', severity: 'error' },
    { id: 'retainage_tracking', entity: 'invoice', action: 'create', condition: 'retainagePercent > 0', message: 'Track retainage percentage on invoices (typically 5-10%)', severity: 'warning' },
    { id: 'progress_payments', entity: 'invoice', action: 'create', field: 'invoiceType', condition: 'invoiceType=progress_payment', message: 'Issue progress payments based on project milestones', severity: 'warning' },
  ],
  discoveryPromptFragment: 'construction company, general contractor, builder managing projects, clients, subcontractors, materials, and invoices',
  safeAssumptions: [
    'Needs project phase tracking',
    'Needs change order management with client approval',
    'Needs subcontractor management',
    'Needs material/procurement tracking',
    'Needs client portal for project visibility',
    'Needs field staff surface for daily reports',
    'Needs retainage tracking on invoices',
  ],
  ambiguityTriggers: [],
};

const cleaningKit: IndustryKit = {
  id: 'cleaning',
  name: 'Cleaning Services',
  professions: ['Cleaner', 'Cleaning Service'],
  keywords: ['cleaning', 'cleaner', 'janitorial', 'maid', 'housekeeping'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'invoices', 'staff', 'settings'],
  optionalModules: ['messaging', 'notifications'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Accept card payments' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
    { id: 'thumbtack', name: 'Thumbtack', purpose: 'Lead generation' },
    { id: 'launch27', name: 'Launch27', purpose: 'Online booking' },
  ],
  entities: [
    propertyOwnerEntity(),
    {
      id: 'cleaningJob',
      name: 'Cleaning Job',
      pluralName: 'Cleaning Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        refField('propertyOwnerId', 'Property Owner', 'propertyOwner'),
        field('propertyAddress', 'Property Address', 'string'),
        field('scheduledDate', 'Scheduled Date', 'datetime'),
        enumField('cleaningType', 'Cleaning Type', [
          { value: 'regular', label: 'Regular Cleaning', color: '#60a5fa' },
          { value: 'deep', label: 'Deep Cleaning', color: '#8b5cf6' },
          { value: 'move_in_out', label: 'Move-in/Move-out', color: '#f59e0b' },
          { value: 'post_construction', label: 'Post Construction', color: '#ef4444' },
        ]),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
        ]),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    appointmentEntity(),
    taskEntity(),
    invoiceEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar', 'form'],
  workflows: ['task-checklist'],
  automationRules: ['on job completed -> send feedback request'],
  metrics: ['jobs_completed', 'repeat_customers'],
};

const bakeryKit: IndustryKit = {
  id: 'bakery',
  name: 'Bakery / Pâtisserie',
  professions: ['Baker', 'Pastry Chef', 'Bakery Owner', 'Pâtissier', 'Caterer'],
  keywords: ['bakery', 'baker', 'pastry', 'pâtisserie', 'bread', 'cake', 'dessert', 'viennoiserie', 'catering', 'fine cuisine'],
  dashboardType: 'sales',
  complexity: 'high',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'inventory', 'orders', 'crm', 'scheduling', 'staff', 'invoices', 'quotes', 'tasks', 'settings'],
  optionalModules: ['payments', 'notifications', 'messaging', 'documents'],
  suggestedIntegrations: [
    { id: 'square', name: 'Square', purpose: 'POS and payments' },
    { id: 'stripe', name: 'Stripe', purpose: 'Online payments' },
    { id: 'instagram', name: 'Instagram', purpose: 'Showcase products' },
    { id: 'doordash', name: 'DoorDash', purpose: 'Delivery orders' },
    { id: 'uber_eats', name: 'Uber Eats', purpose: 'Delivery orders' },
    { id: 'mailchimp', name: 'Mailchimp', purpose: 'Customer newsletters' },
  ],
  featureBundle: {
    core: ['product_catalog', 'order_management', 'customer_management', 'inventory_tracking'],
    recommended: ['catering_management', 'delivery_scheduling', 'production_planning', 'invoicing'],
    optional: ['customer_portal', 'online_ordering', 'loyalty_program', 'allergen_tracking'],
  },
  entities: [
    {
      id: 'customer',
      name: 'Customer',
      pluralName: 'Customers',
      fields: [
        field('name', 'Name', 'string', true),
        field('email', 'Email', 'email'),
        field('phone', 'Phone', 'phone'),
        ...addressFields(),
        field('deliveryInstructions', 'Delivery Instructions', 'richtext'),
        field('dietaryNotes', 'Dietary Notes/Allergies', 'richtext'),
        field('preferences', 'Preferences', 'richtext'),
        field('notes', 'Notes', 'richtext'),
        enumField('customerType', 'Customer Type', [
          { value: 'individual', label: 'Individual', color: '#60a5fa' },
          { value: 'business', label: 'Business', color: '#8b5cf6' },
          { value: 'catering', label: 'Catering Client', color: '#f59e0b' },
        ]),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'vip', label: 'VIP', color: '#f59e0b' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
      ],
    },
    {
      id: 'product',
      name: 'Product',
      pluralName: 'Products',
      fields: [
        field('name', 'Name', 'string', true),
        field('description', 'Description', 'richtext'),
        field('price', 'Price', 'currency', true),
        field('cost', 'Cost', 'currency'),
        field('imageUrl', 'Image', 'string'),
        enumField('category', 'Category', [
          { value: 'pastry', label: 'Pastries', color: '#f59e0b' },
          { value: 'cake', label: 'Cakes', color: '#ec4899' },
          { value: 'dessert', label: 'Desserts', color: '#8b5cf6' },
          { value: 'viennoiserie', label: 'Viennoiserie', color: '#f97316' },
          { value: 'bread', label: 'Breads', color: '#a3863a' },
          { value: 'prepared', label: 'Prepared Foods', color: '#22c55e' },
          { value: 'savory', label: 'Savory', color: '#64748b' },
          { value: 'beverage', label: 'Beverages', color: '#06b6d4' },
        ]),
        field('allergens', 'Allergens', 'string'),
        field('isKosher', 'Kosher', 'boolean'),
        field('isHalal', 'Halal', 'boolean'),
        field('isVegan', 'Vegan', 'boolean'),
        field('isGlutenFree', 'Gluten-Free', 'boolean'),
        field('leadTime', 'Lead Time (hours)', 'number'),
        field('minOrderQuantity', 'Min Order Qty', 'number'),
        enumField('status', 'Status', [
          { value: 'available', label: 'Available', color: '#22c55e' },
          { value: 'limited', label: 'Limited', color: '#f59e0b' },
          { value: 'unavailable', label: 'Unavailable', color: '#ef4444' },
          { value: 'seasonal', label: 'Seasonal', color: '#8b5cf6' },
        ]),
      ],
    },
    {
      id: 'order',
      name: 'Order',
      pluralName: 'Orders',
      fields: [
        field('orderNumber', 'Order #', 'string', true),
        refField('customerId', 'Customer', 'customer'),
        field('orderDate', 'Order Date', 'datetime', true),
        field('fulfillmentDate', 'Fulfillment Date', 'datetime', true),
        enumField('orderType', 'Order Type', [
          { value: 'pickup', label: 'Pickup', color: '#22c55e' },
          { value: 'delivery', label: 'Delivery', color: '#60a5fa' },
          { value: 'in_store', label: 'In-Store', color: '#94a3b8' },
        ]),
        field('deliveryAddress', 'Delivery Address', 'string'),
        field('specialInstructions', 'Special Instructions', 'richtext'),
        field('dietaryNotes', 'Dietary/Allergy Notes', 'richtext'),
        field('giftMessage', 'Gift Message', 'string'),
        field('subtotal', 'Subtotal', 'currency'),
        field('deliveryFee', 'Delivery Fee', 'currency'),
        field('tax', 'Tax', 'currency'),
        field('total', 'Total', 'currency', true),
        enumField('status', 'Status', [
          { value: 'new', label: 'New', color: '#60a5fa' },
          { value: 'confirmed', label: 'Confirmed', color: '#8b5cf6' },
          { value: 'in_production', label: 'In Production', color: '#f97316' },
          { value: 'ready', label: 'Ready', color: '#22c55e' },
          { value: 'out_for_delivery', label: 'Out for Delivery', color: '#06b6d4' },
          { value: 'completed', label: 'Completed', color: '#94a3b8' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]),
        enumField('paymentStatus', 'Payment Status', [
          { value: 'pending', label: 'Pending', color: '#f59e0b' },
          { value: 'paid', label: 'Paid', color: '#22c55e' },
          { value: 'refunded', label: 'Refunded', color: '#94a3b8' },
        ]),
      ],
    },
    {
      id: 'cateringRequest',
      name: 'Catering Request',
      pluralName: 'Catering Requests',
      fields: [
        field('requestNumber', 'Request #', 'string', true),
        refField('customerId', 'Customer', 'customer'),
        enumField('eventType', 'Event Type', [
          { value: 'wedding', label: 'Wedding', color: '#ec4899' },
          { value: 'corporate', label: 'Corporate', color: '#60a5fa' },
          { value: 'birthday', label: 'Birthday', color: '#f59e0b' },
          { value: 'anniversary', label: 'Anniversary', color: '#8b5cf6' },
          { value: 'holiday', label: 'Holiday', color: '#22c55e' },
          { value: 'other', label: 'Other', color: '#94a3b8' },
        ]),
        field('eventDate', 'Event Date', 'datetime', true),
        field('eventVenue', 'Venue/Location', 'string'),
        field('guestCount', 'Guest Count', 'number', true),
        field('budgetMin', 'Budget Min', 'currency'),
        field('budgetMax', 'Budget Max', 'currency'),
        field('preferences', 'Menu Preferences', 'richtext'),
        field('dietaryRequirements', 'Dietary Requirements', 'richtext'),
        field('notes', 'Additional Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'new', label: 'New Request', color: '#60a5fa' },
          { value: 'reviewing', label: 'Reviewing', color: '#f59e0b' },
          { value: 'quote_sent', label: 'Quote Sent', color: '#8b5cf6' },
          { value: 'approved', label: 'Approved', color: '#22c55e' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#94a3b8' },
          { value: 'declined', label: 'Declined', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'quote',
      name: 'Quote',
      pluralName: 'Quotes',
      fields: [
        field('quoteNumber', 'Quote #', 'string', true),
        refField('cateringRequestId', 'Catering Request', 'cateringRequest'),
        refField('customerId', 'Customer', 'customer'),
        field('issueDate', 'Issue Date', 'date', true),
        field('validUntil', 'Valid Until', 'date'),
        field('menuDescription', 'Menu Description', 'richtext'),
        field('itemizedList', 'Itemized List', 'richtext'),
        field('subtotal', 'Subtotal', 'currency'),
        field('serviceFee', 'Service Fee', 'currency'),
        field('deliveryFee', 'Delivery Fee', 'currency'),
        field('total', 'Total', 'currency', true),
        field('depositRequired', 'Deposit Required', 'currency'),
        field('terms', 'Terms & Conditions', 'richtext'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'sent', label: 'Sent', color: '#60a5fa' },
          { value: 'approved', label: 'Approved', color: '#22c55e' },
          { value: 'declined', label: 'Declined', color: '#ef4444' },
          { value: 'expired', label: 'Expired', color: '#f59e0b' },
        ]),
      ],
    },
    {
      id: 'invoice',
      name: 'Invoice',
      pluralName: 'Invoices',
      fields: [
        field('invoiceNumber', 'Invoice #', 'string', true),
        refField('customerId', 'Customer', 'customer'),
        refField('orderId', 'Order', 'order'),
        refField('cateringRequestId', 'Catering Request', 'cateringRequest'),
        field('issueDate', 'Issue Date', 'date', true),
        field('dueDate', 'Due Date', 'date', true),
        field('subtotal', 'Subtotal', 'currency'),
        field('tax', 'Tax', 'currency'),
        field('total', 'Total', 'currency', true),
        field('amountPaid', 'Amount Paid', 'currency'),
        field('depositAmount', 'Deposit Amount', 'currency'),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'sent', label: 'Sent', color: '#60a5fa' },
          { value: 'partial', label: 'Partially Paid', color: '#f59e0b' },
          { value: 'paid', label: 'Paid', color: '#22c55e' },
          { value: 'overdue', label: 'Overdue', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'delivery',
      name: 'Delivery',
      pluralName: 'Deliveries',
      fields: [
        refField('orderId', 'Order', 'order'),
        refField('driverId', 'Driver', 'staff'),
        field('deliveryDate', 'Delivery Date', 'date', true),
        enumField('deliveryWindow', 'Time Window', [
          { value: 'morning', label: '8am-12pm', color: '#f59e0b' },
          { value: 'afternoon', label: '12pm-5pm', color: '#60a5fa' },
          { value: 'evening', label: '5pm-8pm', color: '#8b5cf6' },
          { value: 'custom', label: 'Custom Time', color: '#94a3b8' },
        ]),
        field('customTime', 'Custom Time', 'string'),
        field('address', 'Delivery Address', 'string', true),
        field('contactPhone', 'Contact Phone', 'phone'),
        field('instructions', 'Delivery Instructions', 'richtext'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'assigned', label: 'Assigned', color: '#8b5cf6' },
          { value: 'out_for_delivery', label: 'Out for Delivery', color: '#f97316' },
          { value: 'delivered', label: 'Delivered', color: '#22c55e' },
          { value: 'failed', label: 'Failed', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'ingredient',
      name: 'Ingredient',
      pluralName: 'Ingredients',
      fields: [
        field('name', 'Name', 'string', true),
        field('sku', 'SKU', 'string'),
        field('currentStock', 'Current Stock', 'number'),
        field('unit', 'Unit', 'string'),
        field('reorderLevel', 'Reorder Level', 'number'),
        field('reorderQuantity', 'Reorder Qty', 'number'),
        field('unitCost', 'Unit Cost', 'currency'),
        field('supplier', 'Supplier', 'string'),
        field('allergen', 'Allergen', 'string'),
        enumField('category', 'Category', [
          { value: 'flour', label: 'Flour & Grains', color: '#a3863a' },
          { value: 'dairy', label: 'Dairy', color: '#60a5fa' },
          { value: 'sugar', label: 'Sugar & Sweeteners', color: '#f59e0b' },
          { value: 'chocolate', label: 'Chocolate', color: '#78350f' },
          { value: 'fruit', label: 'Fruits', color: '#22c55e' },
          { value: 'nuts', label: 'Nuts', color: '#b45309' },
          { value: 'spices', label: 'Spices & Flavoring', color: '#dc2626' },
          { value: 'other', label: 'Other', color: '#94a3b8' },
        ]),
        enumField('status', 'Status', [
          { value: 'in_stock', label: 'In Stock', color: '#22c55e' },
          { value: 'low', label: 'Low Stock', color: '#f59e0b' },
          { value: 'out_of_stock', label: 'Out of Stock', color: '#ef4444' },
          { value: 'on_order', label: 'On Order', color: '#60a5fa' },
        ]),
      ],
    },
    {
      id: 'vendor',
      name: 'Vendor',
      pluralName: 'Vendors',
      fields: [
        field('name', 'Vendor Name', 'string', true),
        field('contactName', 'Contact Name', 'string'),
        field('email', 'Email', 'email'),
        field('phone', 'Phone', 'phone'),
        ...addressFields(),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
      ],
    },
    {
      id: 'productionTask',
      name: 'Production Task',
      pluralName: 'Production Tasks',
      fields: [
        field('taskName', 'Task Name', 'string', true),
        field('description', 'Description', 'richtext'),
        refField('orderId', 'Related Order', 'order'),
        refField('assignedTo', 'Assigned To', 'staff'),
        field('scheduledDate', 'Scheduled Date', 'date', true),
        field('dueTime', 'Due Time', 'string'),
        field('quantity', 'Quantity', 'number'),
        enumField('priority', 'Priority', [
          { value: 'low', label: 'Low', color: '#94a3b8' },
          { value: 'medium', label: 'Medium', color: '#f59e0b' },
          { value: 'high', label: 'High', color: '#f97316' },
          { value: 'urgent', label: 'Urgent', color: '#ef4444' },
        ]),
        enumField('status', 'Status', [
          { value: 'pending', label: 'Pending', color: '#60a5fa' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'staff',
      name: 'Staff Member',
      pluralName: 'Staff',
      fields: [
        field('name', 'Name', 'string', true),
        field('email', 'Email', 'email'),
        field('phone', 'Phone', 'phone'),
        enumField('role', 'Role', [
          { value: 'admin', label: 'Admin', color: '#ef4444' },
          { value: 'manager', label: 'Manager', color: '#f59e0b' },
          { value: 'chef', label: 'Chef', color: '#22c55e' },
          { value: 'baker', label: 'Baker', color: '#60a5fa' },
          { value: 'kitchen', label: 'Kitchen Staff', color: '#8b5cf6' },
          { value: 'driver', label: 'Delivery Driver', color: '#06b6d4' },
          { value: 'counter', label: 'Counter Staff', color: '#94a3b8' },
        ]),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
      ],
    },
    messageEntity(),
    documentEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'form', 'calendar', 'kanban'],
  workflows: ['order-fulfillment', 'catering-workflow', 'production-planning', 'delivery-scheduling'],
  automationRules: [
    'on order created -> assign production tasks',
    'on order ready -> notify customer',
    'on catering request -> create quote',
    'on quote approved -> create invoice',
    'on low stock -> create reorder task',
  ],
  metrics: ['orders_today', 'revenue_today', 'pending_catering', 'production_tasks', 'deliveries_scheduled'],
  terminology: {
    customer: {
      primary: 'Customer',
      plural: 'Customers',
      action: { add: 'Add Customer', edit: 'Edit Customer', delete: 'Remove Customer', view: 'View Customer' },
      empty: 'No customers yet',
      labels: { list: 'All Customers', details: 'Customer Details', new: 'New Customer' },
    },
    order: {
      primary: 'Order',
      plural: 'Orders',
      action: { add: 'New Order', edit: 'Edit Order', delete: 'Cancel Order', view: 'View Order' },
      empty: 'No orders yet',
      labels: { list: 'All Orders', details: 'Order Details', new: 'New Order' },
    },
  },
  dashboardTemplate: {
    kpis: [
      { label: 'Orders Today', metric: 'COUNT(orders WHERE date=TODAY())', icon: 'receipt', format: 'number' },
      { label: 'Revenue Today', metric: 'SUM(orders.total WHERE date=TODAY())', icon: 'dollar', format: 'currency' },
      { label: 'Pending Catering', metric: 'COUNT(cateringRequests WHERE status IN [new, reviewing])', icon: 'calendar', format: 'number' },
      { label: 'Production Tasks', metric: 'COUNT(productionTasks WHERE date=TODAY() AND status=pending)', icon: 'checklist', format: 'number' },
    ],
    charts: [
      { type: 'bar', title: 'Orders by Category', dataQuery: 'orders BY product.category' },
      { type: 'line', title: 'Weekly Revenue', dataQuery: 'SUM(orders.total) BY day WHERE week=current' },
    ],
    lists: [
      { title: 'Pending Orders', query: 'orders WHERE status IN [new, confirmed, in_production] ORDER BY fulfillmentDate', limit: 5 },
      { title: 'Today\'s Deliveries', query: 'deliveries WHERE deliveryDate=TODAY() ORDER BY deliveryWindow', limit: 5 },
      { title: 'Upcoming Catering', query: 'cateringRequests WHERE status IN [approved, in_progress] ORDER BY eventDate', limit: 5 },
    ],
  },
};

const restaurantKit: IndustryKit = {
  id: 'restaurant',
  name: 'Restaurant',
  professions: ['Restaurant Owner', 'Chef', 'Manager'],
  keywords: ['restaurant', 'menu', 'dining', 'reservation', 'food'],
  dashboardType: 'sales',
  complexity: 'high',
  uiStyle: 'bold',
  requiredModules: ['dashboard', 'inventory', 'orders', 'scheduling', 'staff', 'crm', 'settings'],
  optionalModules: ['payments', 'messaging', 'notifications'],
  entities: [
    guestEntity(),
    {
      id: 'menuItem',
      name: 'Menu Item',
      pluralName: 'Menu Items',
      fields: [
        field('name', 'Name', 'string', true),
        field('category', 'Category', 'string'),
        field('description', 'Description', 'richtext'),
        field('price', 'Price', 'currency', true),
        field('available', 'Available', 'boolean'),
      ],
    },
    {
      id: 'reservation',
      name: 'Reservation',
      pluralName: 'Reservations',
      fields: [
        refField('guestId', 'Guest', 'guest'),
        field('partySize', 'Party Size', 'number', true),
        field('reservationTime', 'Reservation Time', 'datetime', true),
        field('tableNumber', 'Table Number', 'string'),
        field('specialRequests', 'Special Requests', 'richtext'),
        enumField('status', 'Status', [
          { value: 'booked', label: 'Booked', color: '#60a5fa' },
          { value: 'confirmed', label: 'Confirmed', color: '#22c55e' },
          { value: 'seated', label: 'Seated', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#94a3b8' },
          { value: 'no_show', label: 'No Show', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'order',
      name: 'Order',
      pluralName: 'Orders',
      fields: [
        field('orderNumber', 'Order Number', 'string', true),
        field('tableNumber', 'Table Number', 'string'),
        field('serverName', 'Server', 'string'),
        field('total', 'Total', 'currency'),
        enumField('status', 'Status', [
          { value: 'new', label: 'New', color: '#60a5fa' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'served', label: 'Served', color: '#22c55e' },
          { value: 'closed', label: 'Closed', color: '#94a3b8' },
        ]),
      ],
    },
    materialEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar', 'kanban'],
  workflows: ['table-management'],
  automationRules: ['on reservation time -> notify staff'],
  metrics: ['tables_occupied', 'orders_today', 'reservations_today'],
  featureBundle: {
    core: ['reservation_management', 'table_tracking', 'order_management'],
    recommended: ['menu_management', 'kitchen_display', 'staff_scheduling'],
    optional: ['online_ordering', 'delivery_tracking', 'loyalty_program', 'inventory_tracking'],
  },
  suggestedIntegrations: [
    { id: 'square', name: 'Square POS', purpose: 'Payment processing' },
    { id: 'doordash', name: 'DoorDash', purpose: 'Delivery orders' },
    { id: 'opentable', name: 'OpenTable', purpose: 'Online reservations' },
    { id: 'yelp', name: 'Yelp', purpose: 'Review management' },
  ],
  terminology: {
    guest: {
      primary: 'Guest',
      plural: 'Guests',
      action: { add: 'Add Guest', edit: 'Edit Guest', delete: 'Remove Guest', view: 'View Guest' },
      empty: 'No guests yet',
      labels: { list: 'Guest List', details: 'Guest Details', new: 'New Guest' },
    },
    reservation: {
      primary: 'Reservation',
      plural: 'Reservations',
      action: { add: 'Add Reservation', edit: 'Edit Reservation', delete: 'Cancel Reservation', view: 'View Reservation' },
      empty: 'No reservations',
      labels: { list: 'All Reservations', details: 'Reservation Details', new: 'New Reservation' },
    },
  },
  workflowTemplates: [
    { id: 'reservation_reminder', name: 'Reservation Reminder', trigger: '2 hours before reservation.reservationTime', action: 'Send SMS reminder to guest', enabled: true },
    { id: 'feedback_request', name: 'Feedback Request', trigger: 'reservation.status changed to completed', action: 'Send feedback email', enabled: true },
    { id: 'no_show_followup', name: 'No-Show Follow-up', trigger: 'reservation.status changed to no_show', action: 'Add to no-show list', enabled: true },
    { id: 'vip_alert', name: 'VIP Guest Alert', trigger: 'reservation created AND guest.status=vip', action: 'Notify manager', enabled: true },
    { id: 'table_ready', name: 'Table Ready Notification', trigger: 'reservation.status changed to confirmed', action: 'Send table ready SMS', enabled: false },
  ],
  computedFields: [
    { id: 'tablesOccupied', name: 'Tables Occupied', formula: 'COUNT(reservation WHERE status=seated)', type: 'number' },
    { id: 'ordersToday', name: 'Orders Today', formula: 'COUNT(orders WHERE date=TODAY())', type: 'number' },
    { id: 'revenueToday', name: 'Revenue Today', formula: 'SUM(orders.total WHERE date=TODAY())', type: 'currency' },
    { id: 'averageOrderValue', name: 'Average Order Value', formula: 'AVG(orders.total)', type: 'currency' },
    { id: 'reservationsToday', name: 'Reservations Today', formula: 'COUNT(reservations WHERE date=TODAY())', type: 'number' },
    { id: 'noShowRate', name: 'No-Show Rate', formula: 'COUNT(reservations WHERE status=no_show) / COUNT(reservations)', type: 'percentage' },
  ],
  statusWorkflows: [
    {
      entity: 'reservation',
      field: 'status',
      states: ['booked', 'confirmed', 'seated', 'completed', 'no_show'],
      transitions: [
        { from: 'booked', to: 'confirmed', action: 'Confirm Reservation', trigger: 'manual' },
        { from: 'confirmed', to: 'seated', action: 'Seat Party', trigger: 'manual' },
        { from: 'seated', to: 'completed', action: 'Close Table', trigger: 'manual' },
        { from: ['booked', 'confirmed'], to: 'no_show', trigger: 'auto', condition: 'reservationTime + 30min < NOW()' },
      ],
    },
    {
      entity: 'order',
      field: 'status',
      states: ['new', 'in_progress', 'served', 'closed'],
      transitions: [
        { from: 'new', to: 'in_progress', action: 'Send to Kitchen', trigger: 'manual' },
        { from: 'in_progress', to: 'served', action: 'Mark Served', trigger: 'manual' },
        { from: 'served', to: 'closed', action: 'Close Order', trigger: 'manual' },
      ],
    },
  ],
  dashboardTemplate: {
    kpis: [
      { label: 'Tables Occupied', metric: 'tablesOccupied', icon: 'table', format: 'number' },
      { label: 'Orders Today', metric: 'ordersToday', icon: 'receipt', format: 'number' },
      { label: 'Revenue Today', metric: 'revenueToday', icon: 'dollar', format: 'currency' },
      { label: 'Reservations Today', metric: 'reservationsToday', icon: 'calendar', format: 'number' },
    ],
    charts: [
      { type: 'bar', title: 'Orders by Hour', dataQuery: 'orders BY hour WHERE date=TODAY()' },
      { type: 'pie', title: 'Popular Menu Items', dataQuery: 'orderItems BY menuItem LIMIT 10' },
      { type: 'line', title: 'Weekly Revenue', dataQuery: 'SUM(orders.total) BY day WHERE week=current' },
    ],
    lists: [
      { title: 'Upcoming Reservations', query: 'reservations WHERE date=TODAY() AND status IN [booked, confirmed] ORDER BY reservationTime', limit: 5 },
      { title: 'Active Orders', query: 'orders WHERE status IN [new, in_progress] ORDER BY createdAt', limit: 5 },
      { title: 'VIP Guests Today', query: 'reservations WHERE date=TODAY() AND guest.status=vip', limit: 5 },
    ],
  },
  businessRules: [
    { id: 'no_double_book_table', entity: 'reservation', action: 'create', condition: 'EXISTS(reservation WHERE tableNumber=this.tableNumber AND reservationTime OVERLAPS this.reservationTime AND status IN [booked, confirmed, seated])', message: 'Table already reserved for this time', severity: 'error' },
    { id: 'party_size_capacity', entity: 'reservation', action: 'create', condition: 'partySize > table.capacity', message: 'Party size exceeds table capacity', severity: 'warning' },
    { id: 'menu_item_available', entity: 'order', action: 'create', condition: 'EXISTS(menuItem WHERE id IN orderItems AND available=false)', message: 'Some menu items are not available', severity: 'error' },
    { id: 'no_delete_confirmed_reservation', entity: 'reservation', action: 'delete', condition: 'status IN [confirmed, seated]', message: 'Cannot delete confirmed or seated reservation', severity: 'error' },
  ],
};

const salonKit: IndustryKit = {
  id: 'salon',
  name: 'Beauty Salon',
  professions: ['Stylist', 'Salon Owner'],
  keywords: ['salon', 'beauty', 'hair', 'spa'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'invoices', 'staff', 'settings'],
  optionalModules: ['inventory', 'messaging'],
  entities: [
    clientEntity(),
    appointmentEntity(),
    {
      id: 'service',
      name: 'Service',
      pluralName: 'Services',
      fields: [
        field('name', 'Name', 'string', true),
        field('duration', 'Duration (min)', 'number'),
        field('price', 'Price', 'currency'),
      ],
    },
    staffEntity(),
    invoiceEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['appointment-reminders'],
  automationRules: ['on appointment booked -> notify staff'],
  metrics: ['appointments_today', 'repeat_clients'],
};

const realEstateKit: IndustryKit = {
  id: 'real-estate',
  name: 'Real Estate',
  professions: ['Real Estate Agent', 'Broker'],
  keywords: ['real estate', 'listing', 'property', 'showing'],
  dashboardType: 'sales',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'documents', 'tasks', 'settings'],
  optionalModules: ['messaging', 'gallery'],
  entities: [
    clientEntity(),
    {
      id: 'listing',
      name: 'Listing',
      pluralName: 'Listings',
      fields: [
        field('address', 'Address', 'string', true),
        field('price', 'Price', 'currency'),
        field('bedrooms', 'Bedrooms', 'number'),
        field('bathrooms', 'Bathrooms', 'number'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active' },
          { value: 'under_contract', label: 'Under Contract' },
          { value: 'sold', label: 'Sold' },
        ]),
      ],
    },
    appointmentEntity(),
    taskEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar', 'gallery'],
  workflows: ['showing-followup'],
  automationRules: ['on showing -> create follow-up task'],
  metrics: ['active_listings', 'offers_in_progress'],
};

const homeOrganizerKit: IndustryKit = {
  id: 'home-organizer',
  name: 'Home Organizer',
  professions: ['Home Organizer'],
  keywords: ['organizer', 'declutter', 'home organizer'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'tasks', 'scheduling', 'settings'],
  optionalModules: ['gallery', 'messaging'],
  entities: [
    clientEntity(),
    {
      id: 'project',
      name: 'Project',
      pluralName: 'Projects',
      fields: [
        field('projectName', 'Project Name', 'string', true),
        field('room', 'Room', 'string'),
        enumField('status', 'Status', [
          { value: 'planned', label: 'Planned' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
        ]),
        field('startDate', 'Start Date', 'date'),
      ],
    },
    taskEntity(),
    appointmentEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['project-checklists'],
  automationRules: ['on project completed -> send summary'],
  metrics: ['projects_active', 'sessions_completed'],
};

const fitnessKit: IndustryKit = {
  id: 'fitness-coach',
  name: 'Fitness Coach',
  professions: ['Fitness Coach', 'Personal Trainer'],
  keywords: ['fitness', 'trainer', 'coach', 'workout'],
  dashboardType: 'health',
  complexity: 'medium',
  uiStyle: 'bold',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'settings'],
  optionalModules: ['messaging', 'payments'],
  entities: [
    clientEntity(),
    {
      id: 'session',
      name: 'Session',
      pluralName: 'Sessions',
      fields: [
        field('sessionTitle', 'Session Title', 'string', true),
        refField('clientId', 'Client', 'client'),
        field('sessionDate', 'Session Date', 'datetime'),
        field('duration', 'Duration', 'number'),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    taskEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['session-followup'],
  automationRules: ['after session -> log progress'],
  metrics: ['sessions_completed', 'client_retention'],
};

const tutorKit: IndustryKit = {
  id: 'tutor',
  name: 'Tutor',
  professions: ['Tutor', 'Teacher'],
  keywords: ['tutor', 'tutoring', 'lesson', 'education', 'teaching'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'invoices', 'settings'],
  optionalModules: ['messaging'],
  entities: [
    studentEntity(),
    {
      id: 'lesson',
      name: 'Lesson',
      pluralName: 'Lessons',
      fields: [
        field('subject', 'Subject', 'string', true),
        refField('studentId', 'Student', 'student'),
        field('lessonDate', 'Lesson Date', 'datetime'),
        field('duration', 'Duration (minutes)', 'number'),
        field('homework', 'Homework Assigned', 'richtext'),
        field('notes', 'Session Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
          { value: 'rescheduled', label: 'Rescheduled', color: '#f97316' },
        ]),
      ],
    },
    taskEntity(),
    invoiceEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['lesson-reminders'],
  automationRules: ['after lesson -> send summary'],
  metrics: ['lessons_completed', 'students_active'],
  featureBundle: {
    core: ['student_management', 'lesson_scheduling', 'progress_tracking'],
    recommended: ['homework_assignments', 'parent_communication', 'invoicing'],
    optional: ['learning_materials', 'online_lessons', 'report_cards'],
  },
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Payment processing' },
    { id: 'zoom', name: 'Zoom', purpose: 'Online lessons' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
  ],
  terminology: {
    student: {
      primary: 'Student',
      plural: 'Students',
      action: { add: 'Add Student', edit: 'Edit Student', delete: 'Remove Student', view: 'View Student' },
      empty: 'No students yet',
      labels: { list: 'All Students', details: 'Student Details', new: 'New Student' },
    },
    lesson: {
      primary: 'Lesson',
      plural: 'Lessons',
      action: { add: 'Schedule Lesson', edit: 'Edit Lesson', delete: 'Cancel Lesson', view: 'View Lesson' },
      empty: 'No lessons scheduled',
      labels: { list: 'Lesson Schedule', details: 'Lesson Details', new: 'New Lesson' },
    },
  },
  workflowTemplates: [
    { id: 'lesson_reminder', name: 'Lesson Reminder', trigger: '24 hours before lesson.lessonDate', action: 'Send reminder to student/parent', enabled: true },
    { id: 'homework_due', name: 'Homework Due Reminder', trigger: '1 day before homework.dueDate', action: 'Send homework reminder', enabled: true },
    { id: 'progress_report', name: 'Monthly Progress Report', trigger: 'first day of month', action: 'Generate and send progress report', enabled: true },
    { id: 'lesson_summary', name: 'Lesson Summary', trigger: 'lesson.status changed to completed', action: 'Send lesson summary to parent', enabled: true },
    { id: 'missed_lesson_followup', name: 'Missed Lesson Follow-up', trigger: 'lesson.status changed to cancelled', action: 'Create reschedule task', enabled: true },
  ],
  computedFields: [
    { id: 'totalLessons', name: 'Total Lessons', formula: 'COUNT(lessons WHERE studentId=this.id AND status=completed)', type: 'number' },
    { id: 'lessonsThisMonth', name: 'Lessons This Month', formula: 'COUNT(lessons WHERE studentId=this.id AND month=current AND status=completed)', type: 'number' },
    { id: 'upcomingLessons', name: 'Upcoming Lessons', formula: 'COUNT(lessons WHERE studentId=this.id AND status=scheduled)', type: 'number' },
    { id: 'monthlyEarnings', name: 'Monthly Earnings', formula: 'SUM(lessons.rate WHERE month=current AND status=completed)', type: 'currency' },
    { id: 'activeStudents', name: 'Active Students', formula: 'COUNT(students WHERE status=active)', type: 'number' },
  ],
  statusWorkflows: [
    {
      entity: 'lesson',
      field: 'status',
      states: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      transitions: [
        { from: 'scheduled', to: 'completed', action: 'Mark Complete', trigger: 'manual' },
        { from: 'scheduled', to: 'cancelled', action: 'Cancel Lesson', trigger: 'manual' },
        { from: 'scheduled', to: 'rescheduled', action: 'Reschedule', trigger: 'manual' },
        { from: 'rescheduled', to: 'scheduled', trigger: 'auto', condition: 'newLessonDate IS SET' },
        { from: 'cancelled', to: 'rescheduled', action: 'Reschedule', trigger: 'manual' },
      ],
    },
    {
      entity: 'student',
      field: 'status',
      states: ['active', 'on_hold', 'completed', 'inactive'],
      transitions: [
        { from: 'active', to: 'on_hold', action: 'Put on Hold', trigger: 'manual' },
        { from: 'on_hold', to: 'active', action: 'Resume', trigger: 'manual' },
        { from: 'active', to: 'completed', action: 'Mark Completed', trigger: 'manual' },
        { from: 'active', to: 'inactive', action: 'Mark Inactive', trigger: 'manual' },
        { from: 'on_hold', to: 'inactive', action: 'Mark Inactive', trigger: 'manual' },
      ],
    },
  ],
  dashboardTemplate: {
    kpis: [
      { label: 'Active Students', metric: 'activeStudents', icon: 'users', format: 'number' },
      { label: 'Lessons This Week', metric: 'COUNT(lessons WHERE week=current)', format: 'number' },
      { label: 'Monthly Earnings', metric: 'monthlyEarnings', icon: 'dollar', format: 'currency' },
      { label: 'Completion Rate', metric: 'COUNT(lessons WHERE status=completed) / COUNT(lessons)', format: 'percentage' },
    ],
    charts: [
      { type: 'bar', title: 'Lessons by Subject', dataQuery: 'lessons BY subject' },
      { type: 'line', title: 'Monthly Lessons', dataQuery: 'COUNT(lessons WHERE status=completed) BY month' },
    ],
    lists: [
      { title: 'Today\'s Lessons', query: 'lessons WHERE date=TODAY() ORDER BY lessonDate', limit: 5 },
      { title: 'Recent Students', query: 'students WHERE status=active ORDER BY lastLesson DESC', limit: 5 },
      { title: 'Pending Homework', query: 'homework WHERE status=pending ORDER BY dueDate', limit: 5 },
    ],
  },
  businessRules: [
    { id: 'no_double_booking', entity: 'lesson', action: 'create', condition: 'EXISTS(lesson WHERE lessonDate OVERLAPS this.lessonDate AND status=scheduled)', message: 'Time slot already booked', severity: 'error' },
    { id: 'student_active_required', entity: 'lesson', action: 'create', condition: 'student.status != active', message: 'Cannot schedule lesson for inactive student', severity: 'error' },
    { id: 'advance_notice', entity: 'lesson', action: 'update', field: 'status', condition: 'status=cancelled AND lessonDate - NOW() < 24 hours', message: 'Less than 24 hours notice for cancellation', severity: 'warning' },
  ],
};

const photographerKit: IndustryKit = {
  id: 'photographer',
  name: 'Photographer',
  professions: ['Photographer'],
  keywords: ['photographer', 'photo', 'shoot'],
  dashboardType: 'sales',
  complexity: 'medium',
  uiStyle: 'bold',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'gallery', 'invoices', 'settings'],
  optionalModules: ['messaging', 'documents'],
  entities: [
    clientEntity(),
    {
      id: 'shoot',
      name: 'Photo Shoot',
      pluralName: 'Shoots',
      fields: [
        field('shootTitle', 'Shoot Title', 'string', true),
        refField('clientId', 'Client', 'client'),
        field('shootDate', 'Shoot Date', 'datetime'),
        field('location', 'Location', 'string'),
      ],
    },
    invoiceEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar', 'gallery'],
  workflows: ['gallery-delivery'],
  automationRules: ['after shoot -> deliver gallery'],
  metrics: ['shoots_completed', 'revenue'],
};

const ecommerceKit: IndustryKit = {
  id: 'ecommerce',
  name: 'E-commerce',
  professions: ['Shop Owner', 'E-commerce Manager'],
  keywords: ['shop', 'ecommerce', 'store', 'online', 'retail'],
  dashboardType: 'sales',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'inventory', 'orders', 'crm', 'payments', 'settings'],
  optionalModules: ['messaging', 'notifications'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Payment processing' },
    { id: 'shippo', name: 'Shippo', purpose: 'Shipping labels and tracking' },
    { id: 'mailchimp', name: 'Mailchimp', purpose: 'Email marketing' },
    { id: 'klaviyo', name: 'Klaviyo', purpose: 'E-commerce email automation' },
    { id: 'google_analytics', name: 'Google Analytics', purpose: 'Sales analytics' },
  ],
  entities: [
    customerEntity(),
    {
      id: 'product',
      name: 'Product',
      pluralName: 'Products',
      fields: [
        field('name', 'Name', 'string', true),
        field('sku', 'SKU', 'string'),
        field('description', 'Description', 'richtext'),
        field('price', 'Price', 'currency', true),
        field('quantity', 'Quantity in Stock', 'number'),
        field('category', 'Category', 'string'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'out_of_stock', label: 'Out of Stock', color: '#ef4444' },
          { value: 'discontinued', label: 'Discontinued', color: '#94a3b8' },
        ]),
      ],
    },
    {
      id: 'order',
      name: 'Order',
      pluralName: 'Orders',
      fields: [
        field('orderNumber', 'Order Number', 'string', true),
        refField('customerId', 'Customer', 'customer'),
        field('orderDate', 'Order Date', 'date'),
        field('shippingAddress', 'Shipping Address', 'string'),
        field('total', 'Total', 'currency'),
        field('trackingNumber', 'Tracking Number', 'string'),
        enumField('status', 'Status', [
          { value: 'new', label: 'New', color: '#60a5fa' },
          { value: 'processing', label: 'Processing', color: '#f97316' },
          { value: 'packed', label: 'Packed', color: '#8b5cf6' },
          { value: 'shipped', label: 'Shipped', color: '#14b8a6' },
          { value: 'delivered', label: 'Delivered', color: '#22c55e' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]),
      ],
    },
    materialEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail'],
  workflows: ['order-fulfillment'],
  automationRules: ['on order shipped -> notify customer'],
  metrics: ['orders_today', 'top_products', 'revenue'],
};

const mechanicKit: IndustryKit = {
  id: 'mechanic',
  name: 'Car Mechanic',
  professions: ['Mechanic', 'Auto Repair'],
  keywords: ['mechanic', 'auto', 'repair', 'vehicle', 'car', 'automotive'],
  dashboardType: 'service',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'invoices', 'inventory', 'scheduling', 'staff', 'settings'],
  optionalModules: ['messaging', 'gallery'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Accept card payments' },
    { id: 'quickbooks', name: 'QuickBooks', purpose: 'Accounting sync' },
    { id: 'carfax', name: 'CARFAX', purpose: 'Vehicle history reports' },
    { id: 'partstech', name: 'PartsTech', purpose: 'Parts ordering' },
  ],
  entities: [
    vehicleOwnerEntity(),
    {
      id: 'vehicle',
      name: 'Vehicle',
      pluralName: 'Vehicles',
      fields: [
        field('make', 'Make', 'string', true),
        field('model', 'Model', 'string', true),
        field('year', 'Year', 'number'),
        field('vin', 'VIN', 'string'),
        field('licensePlate', 'License Plate', 'string'),
        field('mileage', 'Current Mileage', 'number'),
        refField('ownerId', 'Owner', 'vehicleOwner'),
      ],
    },
    {
      id: 'repairOrder',
      name: 'Repair Order',
      pluralName: 'Repair Orders',
      fields: [
        field('orderNumber', 'Order Number', 'string', true),
        refField('vehicleId', 'Vehicle', 'vehicle'),
        field('issueDescription', 'Issue Description', 'richtext'),
        field('diagnosticNotes', 'Diagnostic Notes', 'richtext'),
        field('estimatedCost', 'Estimated Cost', 'currency'),
        enumField('status', 'Status', [
          { value: 'diagnosis', label: 'Diagnosis', color: '#60a5fa' },
          { value: 'waiting_approval', label: 'Waiting Approval', color: '#f59e0b' },
          { value: 'parts_ordered', label: 'Parts Ordered', color: '#8b5cf6' },
          { value: 'repairing', label: 'Repairing', color: '#f97316' },
          { value: 'complete', label: 'Complete', color: '#22c55e' },
        ]),
      ],
    },
    invoiceEntity(),
    materialEntity(),
    appointmentEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'calendar', 'kanban'],
  workflows: ['repair-status'],
  automationRules: ['on repair complete -> notify owner'],
  metrics: ['repairs_completed', 'repeat_customers'],
};

const handymanKit: IndustryKit = {
  id: 'handyman',
  name: 'Handyman',
  professions: ['Handyman'],
  keywords: ['handyman', 'repair', 'maintenance'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'invoices', 'scheduling', 'tasks', 'settings'],
  optionalModules: ['inventory', 'messaging'],
  entities: [
    homeownerEntity(),
    {
      id: 'job',
      name: 'Job',
      pluralName: 'Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        refField('homeownerId', 'Homeowner', 'homeowner'),
        field('jobDate', 'Job Date', 'datetime'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ]),
      ],
    },
    invoiceEntity(),
    appointmentEntity(),
    taskEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['job-followup'],
  automationRules: ['on job complete -> create invoice'],
  metrics: ['jobs_completed', 'repeat_homeowners'],
};

const roofingKit: IndustryKit = {
  id: 'roofing',
  name: 'Roofing Services',
  professions: ['Roofer'],
  keywords: ['roof', 'roofing', 'shingles'],
  dashboardType: 'service',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'quotes', 'invoices', 'scheduling', 'staff', 'settings'],
  optionalModules: ['documents', 'gallery'],
  entities: [
    homeownerEntity(),
    {
      id: 'inspection',
      name: 'Inspection',
      pluralName: 'Inspections',
      fields: [
        field('inspectionDate', 'Inspection Date', 'date'),
        refField('homeownerId', 'Homeowner', 'homeowner'),
        field('roofType', 'Roof Type', 'string'),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    quoteEntity(),
    invoiceEntity(),
    appointmentEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['inspection-followup'],
  automationRules: ['on inspection -> create quote'],
  metrics: ['inspections_completed', 'quotes_sent'],
};

const hvacKit: IndustryKit = {
  id: 'hvac',
  name: 'HVAC Technician',
  professions: ['HVAC Technician'],
  keywords: ['hvac', 'heating', 'cooling', 'air conditioning'],
  dashboardType: 'service',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'invoices', 'scheduling', 'inventory', 'staff', 'settings'],
  optionalModules: ['messaging'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Accept card payments on-site' },
    { id: 'quickbooks', name: 'QuickBooks', purpose: 'Accounting and invoicing' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
    { id: 'servicetitan', name: 'ServiceTitan', purpose: 'Field service management' },
  ],
  entities: [
    homeownerEntity(),
    {
      id: 'equipment',
      name: 'Equipment',
      pluralName: 'Equipment',
      fields: [
        field('model', 'Model', 'string'),
        field('serialNumber', 'Serial Number', 'string'),
        field('installDate', 'Install Date', 'date'),
        refField('homeownerId', 'Homeowner', 'homeowner'),
      ],
    },
    appointmentEntity(),
    invoiceEntity(),
    materialEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['maintenance-reminders'],
  automationRules: ['schedule annual maintenance'],
  metrics: ['service_calls', 'maintenance_due'],
};

const landscapingKit: IndustryKit = {
  id: 'landscaping',
  name: 'Landscaping Company',
  professions: ['Landscaper'],
  keywords: ['landscaping', 'lawn', 'garden', 'lawn care', 'yard'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'invoices', 'staff', 'tasks', 'settings'],
  optionalModules: ['inventory', 'messaging'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Accept card payments' },
    { id: 'quickbooks', name: 'QuickBooks', purpose: 'Accounting sync' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
    { id: 'jobber', name: 'Jobber', purpose: 'Route optimization' },
  ],
  entities: [
    propertyOwnerEntity(),
    {
      id: 'project',
      name: 'Project',
      pluralName: 'Projects',
      fields: [
        field('projectName', 'Project Name', 'string', true),
        refField('propertyOwnerId', 'Property Owner', 'propertyOwner'),
        field('propertyAddress', 'Property Address', 'string'),
        field('startDate', 'Start Date', 'date'),
        field('endDate', 'End Date', 'date'),
        enumField('serviceType', 'Service Type', [
          { value: 'maintenance', label: 'Regular Maintenance', color: '#22c55e' },
          { value: 'design', label: 'Landscape Design', color: '#8b5cf6' },
          { value: 'installation', label: 'Installation', color: '#60a5fa' },
          { value: 'seasonal', label: 'Seasonal Service', color: '#f59e0b' },
        ]),
        enumField('status', 'Status', [
          { value: 'planned', label: 'Planned', color: '#94a3b8' },
          { value: 'active', label: 'Active', color: '#60a5fa' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
        ]),
      ],
    },
    appointmentEntity(),
    invoiceEntity(),
    taskEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['seasonal-reminders'],
  automationRules: ['spring maintenance reminder'],
  metrics: ['projects_active', 'customer_retention'],
};

const medicalKit: IndustryKit = {
  id: 'medical',
  name: 'Medical/Therapy Clinic',
  professions: ['Medical Office', 'Clinic', 'Therapy Practice', 'Healthcare Provider', 'Mental Health Clinic'],
  keywords: ['medical', 'clinic', 'patient', 'appointment', 'therapy', 'healthcare', 'doctor', 'therapist', 'treatment'],
  dashboardType: 'health',
  complexity: 'high',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'staff', 'invoices', 'settings', 'documents', 'messaging'],
  optionalModules: ['notifications', 'permissions', 'payments'],
  
  // Multi-surface support: Admin, Provider, Patient
  featureBundle: {
    core: ['patient_management', 'appointment_scheduling', 'treatment_notes', 'billing'],
    recommended: ['secure_messaging', 'document_management', 'follow_ups'],
    optional: ['prescriptions', 'referrals', 'intake_forms'],
  },
  
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Payment processing' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
    { id: 'hipaa_vault', name: 'HIPAA Vault', purpose: 'Secure document storage' },
    { id: 'twilio', name: 'Twilio', purpose: 'Appointment reminders via SMS' },
  ],
  
  entities: [
    // PATIENT entity - core entity visible to all surfaces with different permissions
    {
      id: 'patient',
      name: 'Patient',
      pluralName: 'Patients',
      fields: [
        field('name', 'Full Name', 'string', true),
        field('dateOfBirth', 'Date of Birth', 'date', true),
        field('email', 'Email', 'email', true),
        field('phone', 'Phone', 'phone', true),
        ...addressFields(),
        field('emergencyContactName', 'Emergency Contact Name', 'string'),
        field('emergencyContactPhone', 'Emergency Contact Phone', 'phone'),
        field('insuranceProvider', 'Insurance Provider', 'string'),
        field('insurancePolicyNumber', 'Policy Number', 'string'),
        field('insuranceGroupNumber', 'Group Number', 'string'),
        field('allergies', 'Allergies', 'richtext'),
        field('medications', 'Current Medications', 'richtext'),
        field('medicalHistory', 'Medical History', 'richtext'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
          { value: 'pending', label: 'Pending', color: '#60a5fa' },
        ]),
      ],
      relationships: [
        { type: 'hasMany', target: 'appointment', foreignKey: 'patientId' },
        { type: 'hasMany', target: 'treatmentNote', foreignKey: 'patientId' },
        { type: 'hasMany', target: 'billing', foreignKey: 'patientId' },
        { type: 'hasMany', target: 'document', foreignKey: 'patientId' },
      ],
    },
    
    // PROVIDER entity - doctors, therapists, etc.
    {
      id: 'provider',
      name: 'Provider',
      pluralName: 'Providers',
      fields: [
        field('name', 'Full Name', 'string', true),
        field('email', 'Email', 'email', true),
        field('phone', 'Phone', 'phone'),
        field('title', 'Title', 'string'),
        field('licenseNumber', 'License Number', 'string'),
        field('npiNumber', 'NPI Number', 'string'),
        field('bio', 'Bio', 'richtext'),
        field('photo', 'Photo', 'image'),
        enumField('specialty', 'Specialty', [
          { value: 'general', label: 'General Practice', color: '#60a5fa' },
          { value: 'therapy', label: 'Therapy/Counseling', color: '#8b5cf6' },
          { value: 'psychiatry', label: 'Psychiatry', color: '#f59e0b' },
          { value: 'physical_therapy', label: 'Physical Therapy', color: '#22c55e' },
          { value: 'pediatrics', label: 'Pediatrics', color: '#ec4899' },
          { value: 'other', label: 'Other', color: '#94a3b8' },
        ]),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
          { value: 'on_leave', label: 'On Leave', color: '#f59e0b' },
        ]),
      ],
      relationships: [
        { type: 'hasMany', target: 'appointment', foreignKey: 'providerId' },
        { type: 'hasMany', target: 'treatmentNote', foreignKey: 'providerId' },
        { type: 'hasMany', target: 'availability', foreignKey: 'providerId' },
      ],
    },
    
    // PROVIDER-PATIENT ASSIGNMENT (many-to-many relationship)
    {
      id: 'patientAssignment',
      name: 'Patient Assignment',
      pluralName: 'Patient Assignments',
      fields: [
        refField('providerId', 'Provider', 'provider'),
        refField('patientId', 'Patient', 'patient'),
        field('assignedDate', 'Assigned Date', 'date', true),
        field('isPrimary', 'Is Primary Provider', 'boolean'),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'ended', label: 'Ended', color: '#94a3b8' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'provider', foreignKey: 'providerId' },
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
      ],
    },
    
    // APPOINTMENT entity
    {
      id: 'appointment',
      name: 'Appointment',
      pluralName: 'Appointments',
      fields: [
        refField('patientId', 'Patient', 'patient'),
        refField('providerId', 'Provider', 'provider'),
        field('dateTime', 'Date & Time', 'datetime', true),
        field('endTime', 'End Time', 'datetime'),
        field('duration', 'Duration (min)', 'number'),
        enumField('type', 'Appointment Type', [
          { value: 'initial', label: 'Initial Consultation', color: '#8b5cf6' },
          { value: 'follow_up', label: 'Follow-up', color: '#60a5fa' },
          { value: 'therapy', label: 'Therapy Session', color: '#22c55e' },
          { value: 'check_up', label: 'Check-up', color: '#f59e0b' },
          { value: 'emergency', label: 'Emergency', color: '#ef4444' },
        ]),
        field('reason', 'Reason for Visit', 'richtext'),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'confirmed', label: 'Confirmed', color: '#22c55e' },
          { value: 'checked_in', label: 'Checked In', color: '#8b5cf6' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#16a34a' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
          { value: 'no_show', label: 'No Show', color: '#94a3b8' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
        { type: 'belongsTo', target: 'provider', foreignKey: 'providerId' },
        { type: 'hasOne', target: 'treatmentNote', foreignKey: 'appointmentId' },
      ],
    },
    
    // TREATMENT NOTE entity - WRITE-ONCE for clinical notes
    {
      id: 'treatmentNote',
      name: 'Treatment Note',
      pluralName: 'Treatment Notes',
      fields: [
        refField('patientId', 'Patient', 'patient'),
        refField('providerId', 'Provider', 'provider'),
        refField('appointmentId', 'Appointment', 'appointment'),
        field('noteDate', 'Note Date', 'datetime', true),
        field('chiefComplaint', 'Chief Complaint', 'richtext', true),
        field('subjective', 'Subjective', 'richtext'),
        field('objective', 'Objective', 'richtext'),
        field('assessment', 'Assessment', 'richtext'),
        field('plan', 'Plan', 'richtext'),
        field('diagnosis', 'Diagnosis', 'richtext'),
        field('treatmentProvided', 'Treatment Provided', 'richtext'),
        field('followUpInstructions', 'Follow-up Instructions', 'richtext'),
        field('nextAppointment', 'Next Appointment', 'date'),
        field('approvedForPatient', 'Approved for Patient View', 'boolean'),
        field('signedBy', 'Signed By', 'string'),
        field('signedAt', 'Signed At', 'datetime'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'signed', label: 'Signed', color: '#16a34a' },
          { value: 'amended', label: 'Amended', color: '#f59e0b' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
        { type: 'belongsTo', target: 'provider', foreignKey: 'providerId' },
        { type: 'belongsTo', target: 'appointment', foreignKey: 'appointmentId', optional: true },
      ],
    },
    
    // AVAILABILITY entity - provider availability slots
    {
      id: 'availability',
      name: 'Availability',
      pluralName: 'Availability Slots',
      fields: [
        refField('providerId', 'Provider', 'provider'),
        enumField('dayOfWeek', 'Day of Week', [
          { value: 'monday', label: 'Monday' },
          { value: 'tuesday', label: 'Tuesday' },
          { value: 'wednesday', label: 'Wednesday' },
          { value: 'thursday', label: 'Thursday' },
          { value: 'friday', label: 'Friday' },
          { value: 'saturday', label: 'Saturday' },
          { value: 'sunday', label: 'Sunday' },
        ]),
        field('startTime', 'Start Time', 'string', true),
        field('endTime', 'End Time', 'string', true),
        field('slotDuration', 'Slot Duration (min)', 'number'),
        field('isRecurring', 'Is Recurring', 'boolean'),
        field('effectiveFrom', 'Effective From', 'date'),
        field('effectiveUntil', 'Effective Until', 'date'),
      ],
      relationships: [
        { type: 'belongsTo', target: 'provider', foreignKey: 'providerId' },
      ],
    },
    
    // BILLING entity
    {
      id: 'billing',
      name: 'Billing',
      pluralName: 'Billing Records',
      fields: [
        field('invoiceNumber', 'Invoice Number', 'string', true),
        refField('patientId', 'Patient', 'patient'),
        refField('appointmentId', 'Appointment', 'appointment'),
        field('serviceDate', 'Service Date', 'date', true),
        field('description', 'Description', 'string'),
        field('procedureCode', 'Procedure Code', 'string'),
        field('amount', 'Amount', 'currency', true),
        field('insuranceAmount', 'Insurance Amount', 'currency'),
        field('patientResponsibility', 'Patient Responsibility', 'currency'),
        field('paidAmount', 'Paid Amount', 'currency'),
        field('balance', 'Balance', 'currency'),
        field('dueDate', 'Due Date', 'date'),
        enumField('status', 'Status', [
          { value: 'pending', label: 'Pending', color: '#94a3b8' },
          { value: 'submitted', label: 'Submitted to Insurance', color: '#60a5fa' },
          { value: 'partially_paid', label: 'Partially Paid', color: '#f59e0b' },
          { value: 'paid', label: 'Paid', color: '#22c55e' },
          { value: 'overdue', label: 'Overdue', color: '#ef4444' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
        { type: 'belongsTo', target: 'appointment', foreignKey: 'appointmentId', optional: true },
        { type: 'hasMany', target: 'payment', foreignKey: 'billingId' },
      ],
    },
    
    // PAYMENT entity
    {
      id: 'payment',
      name: 'Payment',
      pluralName: 'Payments',
      fields: [
        refField('billingId', 'Billing Record', 'billing'),
        refField('patientId', 'Patient', 'patient'),
        field('paymentDate', 'Payment Date', 'datetime', true),
        field('amount', 'Amount', 'currency', true),
        enumField('paymentMethod', 'Payment Method', [
          { value: 'credit_card', label: 'Credit Card', color: '#60a5fa' },
          { value: 'debit_card', label: 'Debit Card', color: '#8b5cf6' },
          { value: 'cash', label: 'Cash', color: '#22c55e' },
          { value: 'check', label: 'Check', color: '#f59e0b' },
          { value: 'insurance', label: 'Insurance', color: '#ec4899' },
        ]),
        field('transactionId', 'Transaction ID', 'string'),
        field('notes', 'Notes', 'richtext'),
      ],
      relationships: [
        { type: 'belongsTo', target: 'billing', foreignKey: 'billingId' },
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
      ],
    },
    
    // DOCUMENT entity - consents, reports, etc.
    {
      id: 'document',
      name: 'Document',
      pluralName: 'Documents',
      fields: [
        field('name', 'Document Name', 'string', true),
        refField('patientId', 'Patient', 'patient'),
        refField('uploadedBy', 'Uploaded By', 'provider'),
        field('fileUrl', 'File', 'file', true),
        enumField('documentType', 'Document Type', [
          { value: 'consent', label: 'Consent Form', color: '#60a5fa' },
          { value: 'intake', label: 'Intake Form', color: '#8b5cf6' },
          { value: 'lab_result', label: 'Lab Result', color: '#22c55e' },
          { value: 'imaging', label: 'Imaging', color: '#f59e0b' },
          { value: 'referral', label: 'Referral', color: '#ec4899' },
          { value: 'insurance', label: 'Insurance Document', color: '#94a3b8' },
          { value: 'other', label: 'Other', color: '#64748b' },
        ]),
        field('description', 'Description', 'richtext'),
        field('uploadDate', 'Upload Date', 'datetime'),
        field('expirationDate', 'Expiration Date', 'date'),
        field('visibleToPatient', 'Visible to Patient', 'boolean'),
      ],
      relationships: [
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
      ],
    },
    
    // MESSAGE entity - secure messaging
    {
      id: 'message',
      name: 'Message',
      pluralName: 'Messages',
      fields: [
        refField('senderId', 'Sender', 'patient'),
        refField('recipientId', 'Recipient', 'provider'),
        refField('patientId', 'Patient', 'patient'),
        field('subject', 'Subject', 'string'),
        field('content', 'Message', 'richtext', true),
        field('sentAt', 'Sent At', 'datetime'),
        field('readAt', 'Read At', 'datetime'),
        field('isFromPatient', 'From Patient', 'boolean'),
        enumField('status', 'Status', [
          { value: 'unread', label: 'Unread', color: '#60a5fa' },
          { value: 'read', label: 'Read', color: '#22c55e' },
          { value: 'replied', label: 'Replied', color: '#16a34a' },
          { value: 'archived', label: 'Archived', color: '#94a3b8' },
        ]),
        enumField('priority', 'Priority', [
          { value: 'normal', label: 'Normal', color: '#94a3b8' },
          { value: 'urgent', label: 'Urgent', color: '#ef4444' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
      ],
    },
    
    // FOLLOW-UP entity - reminders and follow-ups
    {
      id: 'followUp',
      name: 'Follow-up',
      pluralName: 'Follow-ups',
      fields: [
        refField('patientId', 'Patient', 'patient'),
        refField('providerId', 'Provider', 'provider'),
        field('dueDate', 'Due Date', 'date', true),
        field('reason', 'Reason', 'string', true),
        field('notes', 'Notes', 'richtext'),
        field('reminderSent', 'Reminder Sent', 'boolean'),
        field('completedAt', 'Completed At', 'datetime'),
        enumField('type', 'Type', [
          { value: 'appointment', label: 'Schedule Appointment', color: '#60a5fa' },
          { value: 'lab_work', label: 'Lab Work', color: '#8b5cf6' },
          { value: 'medication', label: 'Medication Check', color: '#22c55e' },
          { value: 'call', label: 'Phone Call', color: '#f59e0b' },
          { value: 'other', label: 'Other', color: '#94a3b8' },
        ]),
        enumField('status', 'Status', [
          { value: 'pending', label: 'Pending', color: '#f59e0b' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'cancelled', label: 'Cancelled', color: '#94a3b8' },
          { value: 'overdue', label: 'Overdue', color: '#ef4444' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
        { type: 'belongsTo', target: 'provider', foreignKey: 'providerId' },
      ],
    },
    
    // INTAKE FORM entity
    {
      id: 'intakeForm',
      name: 'Intake Form',
      pluralName: 'Intake Forms',
      fields: [
        field('formName', 'Form Name', 'string', true),
        refField('patientId', 'Patient', 'patient'),
        field('submittedAt', 'Submitted At', 'datetime'),
        field('formData', 'Form Data', 'json'),
        enumField('formType', 'Form Type', [
          { value: 'new_patient', label: 'New Patient', color: '#60a5fa' },
          { value: 'medical_history', label: 'Medical History', color: '#8b5cf6' },
          { value: 'consent', label: 'Consent', color: '#22c55e' },
          { value: 'insurance', label: 'Insurance Info', color: '#f59e0b' },
          { value: 'hipaa', label: 'HIPAA Authorization', color: '#ec4899' },
        ]),
        enumField('status', 'Status', [
          { value: 'pending', label: 'Pending', color: '#f59e0b' },
          { value: 'submitted', label: 'Submitted', color: '#60a5fa' },
          { value: 'reviewed', label: 'Reviewed', color: '#22c55e' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'patient', foreignKey: 'patientId' },
      ],
    },
  ],
  
  pageTypes: ['dashboard', 'list', 'calendar', 'detail', 'form', 'kanban', 'messaging'],
  
  workflows: [
    'appointment-reminders',
    'follow-up-reminders',
    'treatment-note-completion',
    'payment-notifications',
    'intake-form-notifications',
  ],
  
  automationRules: [
    'on appointment confirmed -> send reminder',
    'on treatment note signed -> notify patient if approved',
    'on payment received -> update billing status',
    'on follow-up overdue -> send reminder',
    'on intake form submitted -> notify provider',
  ],
  
  metrics: [
    'patients_active',
    'appointments_today',
    'appointments_this_week',
    'pending_treatment_notes',
    'outstanding_balance',
    'follow_ups_due',
  ],
  
  // Status workflows
  statusWorkflows: [
    {
      entity: 'appointment',
      field: 'status',
      states: ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'],
      transitions: [
        { from: 'scheduled', to: 'confirmed', trigger: 'manual' },
        { from: 'confirmed', to: 'checked_in', trigger: 'manual' },
        { from: 'checked_in', to: 'in_progress', trigger: 'manual' },
        { from: 'in_progress', to: 'completed', trigger: 'manual' },
        { from: ['scheduled', 'confirmed'], to: 'cancelled', trigger: 'manual' },
        { from: ['scheduled', 'confirmed'], to: 'no_show', trigger: 'manual' },
      ],
    },
    {
      entity: 'treatmentNote',
      field: 'status',
      states: ['draft', 'completed', 'signed', 'amended'],
      transitions: [
        { from: 'draft', to: 'completed', trigger: 'manual' },
        { from: 'completed', to: 'signed', trigger: 'manual' },
        { from: 'signed', to: 'amended', trigger: 'manual' },
      ],
    },
  ],
  
  // Dashboard template
  dashboardTemplate: {
    kpis: [
      { label: 'Active Patients', metric: 'patients_active', icon: 'Users', format: 'number' },
      { label: "Today's Appointments", metric: 'appointments_today', icon: 'Calendar', format: 'number' },
      { label: 'Pending Notes', metric: 'pending_treatment_notes', icon: 'FileText', format: 'number' },
      { label: 'Outstanding Balance', metric: 'outstanding_balance', icon: 'DollarSign', format: 'currency' },
    ],
    charts: [
      { type: 'bar', title: 'Appointments This Week', dataQuery: 'appointments_by_day' },
      { type: 'pie', title: 'Appointments by Type', dataQuery: 'appointments_by_type' },
    ],
    lists: [
      { title: "Today's Schedule", query: 'appointments_today', limit: 10 },
      { title: 'Recent Patients', query: 'patients_recent', limit: 5 },
      { title: 'Follow-ups Due', query: 'follow_ups_due', limit: 5 },
    ],
  },
  
  // Business rules
  businessRules: [
    {
      id: 'treatment_note_write_once',
      entity: 'treatmentNote',
      action: 'update',
      condition: "record.status === 'signed'",
      message: 'Signed treatment notes cannot be modified. Create an amendment instead.',
      severity: 'error',
    },
    {
      id: 'patient_approval_required',
      entity: 'treatmentNote',
      action: 'update',
      field: 'approvedForPatient',
      condition: "record.status !== 'signed'",
      message: 'Only signed notes can be approved for patient viewing.',
      severity: 'warning',
    },
  ],
  
  // Terminology
  terminology: {
    patient: {
      primary: 'Patient',
      plural: 'Patients',
      action: { add: 'Register Patient', edit: 'Edit Patient', delete: 'Deactivate Patient', view: 'View Patient' },
      empty: 'No patients registered yet',
      labels: { list: 'Patient List', details: 'Patient Chart', new: 'New Patient' },
    },
    provider: {
      primary: 'Provider',
      plural: 'Providers',
      action: { add: 'Add Provider', edit: 'Edit Provider', delete: 'Deactivate Provider', view: 'View Provider' },
      empty: 'No providers added yet',
      labels: { list: 'Provider List', details: 'Provider Profile', new: 'New Provider' },
    },
    appointment: {
      primary: 'Appointment',
      plural: 'Appointments',
      action: { add: 'Schedule Appointment', edit: 'Reschedule', delete: 'Cancel Appointment', view: 'View Appointment' },
      empty: 'No appointments scheduled',
      labels: { list: 'Schedule', details: 'Appointment Details', new: 'New Appointment' },
    },
    treatmentNote: {
      primary: 'Treatment Note',
      plural: 'Treatment Notes',
      action: { add: 'Create Note', edit: 'Edit Note', delete: 'Delete Note', view: 'View Note' },
      empty: 'No treatment notes',
      labels: { list: 'Notes', details: 'Note Details', new: 'New Treatment Note' },
    },
  },
  
  // Discovery AI hints
  discoveryPromptFragment: 'For medical/therapy clinics, we support patient records, appointment scheduling, treatment notes (SOAP format), billing, secure messaging, and document management. Treatment notes are write-once after signing for compliance. We support multi-surface access: Admin (full management), Provider (assigned patients, schedule, notes), and Patient (portal with approved records).',
  
  safeAssumptions: [
    'Needs patient records management',
    'Needs appointment scheduling',
    'Needs treatment/clinical notes',
    'Needs billing and payments',
    'Treatment notes should be write-once after signing',
    'Patient data access should be restricted',
  ],
  
  ambiguityTriggers: [
    'What types of providers/specialists do you have?',
    'Do patients need portal access?',
    'Do you need insurance billing integration?',
    'What intake forms do patients need to complete?',
  ],
};

const homeHealthKit: IndustryKit = {
  id: 'home-health',
  name: 'Home Health Aide',
  professions: ['Home Health Aide', 'Caregiver'],
  keywords: ['home health', 'caregiver', 'aide', 'elderly care', 'senior care'],
  dashboardType: 'health',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'staff', 'settings'],
  optionalModules: ['messaging'],
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Payment processing' },
    { id: 'google_calendar', name: 'Google Calendar', purpose: 'Schedule sync' },
    { id: 'hipaa_compliant_storage', name: 'HIPAA Vault', purpose: 'Secure document storage' },
    { id: 'clearcare', name: 'ClearCare', purpose: 'Home care management' },
  ],
  entities: [
    careRecipientEntity(),
    {
      id: 'visit',
      name: 'Visit',
      pluralName: 'Visits',
      fields: [
        refField('careRecipientId', 'Care Recipient', 'careRecipient'),
        refField('caregiverId', 'Caregiver', 'staff'),
        field('visitDate', 'Visit Date', 'datetime'),
        field('duration', 'Duration (hours)', 'number'),
        field('tasksCompleted', 'Tasks Completed', 'richtext'),
        field('healthObservations', 'Health Observations', 'richtext'),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'carePlan',
      name: 'Care Plan',
      pluralName: 'Care Plans',
      fields: [
        refField('careRecipientId', 'Care Recipient', 'careRecipient'),
        field('effectiveDate', 'Effective Date', 'date'),
        field('dailyTasks', 'Daily Tasks', 'richtext'),
        field('medications', 'Medication Schedule', 'richtext'),
        field('dietaryRestrictions', 'Dietary Restrictions', 'richtext'),
        field('mobilityNeeds', 'Mobility Needs', 'richtext'),
        field('specialInstructions', 'Special Instructions', 'richtext'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'archived', label: 'Archived', color: '#64748b' },
        ]),
      ],
    },
    staffEntity(),
    taskEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['visit-followup'],
  automationRules: ['after visit -> update care plan'],
  metrics: ['visits_today', 'care_recipients_active'],
};

const generalBusinessKit: IndustryKit = {
  id: 'general_business',
  name: 'General Business',
  professions: ['Service Business', 'Small Business', 'Business Owner'],
  keywords: ['service', 'business', 'management', 'general', 'company'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'tasks', 'scheduling', 'invoices', 'settings'],
  optionalModules: ['messaging', 'inventory'],
  entities: [
    clientEntity(),
    taskEntity(),
    appointmentEntity(),
    invoiceEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['task-management'],
  automationRules: ['on task overdue -> notify'],
  metrics: ['tasks_open', 'revenue'],
};

// ============================================================
// SUB-VERTICAL KITS (More specialized industry kits)
// ============================================================

/** Property Management Kit - for landlords and property managers */
const propertyManagementKit: IndustryKit = {
  id: 'property-management',
  name: 'Property Management',
  professions: ['Property Manager', 'Landlord', 'Property Management Company'],
  keywords: ['property management', 'landlord', 'rental', 'tenant', 'lease', 'rent', 'apartment', 'property manager'],
  dashboardType: 'operations',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'tasks', 'scheduling', 'invoices', 'documents', 'settings'],
  optionalModules: ['payments', 'messaging', 'notifications', 'permissions'],
  entities: [
    tenantEntity(),
    {
      id: 'property',
      name: 'Property',
      pluralName: 'Properties',
      fields: [
        field('name', 'Property Name', 'string', true),
        ...addressFields(),
        enumField('propertyType', 'Property Type', [
          { value: 'single_family', label: 'Single Family', color: '#60a5fa' },
          { value: 'multi_family', label: 'Multi-Family', color: '#8b5cf6' },
          { value: 'apartment', label: 'Apartment Building', color: '#f59e0b' },
          { value: 'commercial', label: 'Commercial', color: '#ef4444' },
          { value: 'condo', label: 'Condo', color: '#22c55e' },
        ]),
        field('totalUnits', 'Total Units', 'number'),
        field('yearBuilt', 'Year Built', 'number'),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    {
      id: 'unit',
      name: 'Unit',
      pluralName: 'Units',
      fields: [
        field('unitNumber', 'Unit Number', 'string', true),
        refField('propertyId', 'Property', 'property'),
        field('bedrooms', 'Bedrooms', 'number'),
        field('bathrooms', 'Bathrooms', 'number'),
        field('squareFeet', 'Square Feet', 'number'),
        field('rentAmount', 'Rent Amount', 'currency', true),
        refField('currentTenantId', 'Current Tenant', 'tenant'),
        enumField('status', 'Status', [
          { value: 'occupied', label: 'Occupied', color: '#22c55e' },
          { value: 'vacant', label: 'Vacant', color: '#f59e0b' },
          { value: 'maintenance', label: 'Under Maintenance', color: '#ef4444' },
          { value: 'reserved', label: 'Reserved', color: '#60a5fa' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'property', foreignKey: 'propertyId', cascadeDelete: true },
        { type: 'hasMany', target: 'lease', foreignKey: 'unitId' },
        { type: 'hasMany', target: 'maintenanceRequest', foreignKey: 'unitId' },
      ],
    },
    {
      id: 'lease',
      name: 'Lease',
      pluralName: 'Leases',
      fields: [
        refField('tenantId', 'Tenant', 'tenant'),
        refField('unitId', 'Unit', 'unit'),
        field('startDate', 'Start Date', 'date', true),
        field('endDate', 'End Date', 'date', true),
        field('monthlyRent', 'Monthly Rent', 'currency', true),
        field('securityDeposit', 'Security Deposit', 'currency'),
        field('leaseDocument', 'Lease Document', 'string'),
        enumField('status', 'Status', [
          { value: 'draft', label: 'Draft', color: '#94a3b8' },
          { value: 'pending_signature', label: 'Pending Signature', color: '#f59e0b' },
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'expiring', label: 'Expiring Soon', color: '#f97316' },
          { value: 'expired', label: 'Expired', color: '#ef4444' },
          { value: 'terminated', label: 'Terminated', color: '#94a3b8' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'tenant', foreignKey: 'tenantId' },
        { type: 'belongsTo', target: 'unit', foreignKey: 'unitId' },
        { type: 'hasMany', target: 'rentPayment', foreignKey: 'leaseId' },
      ],
    },
    {
      id: 'rentPayment',
      name: 'Rent Payment',
      pluralName: 'Rent Payments',
      fields: [
        refField('leaseId', 'Lease', 'lease'),
        refField('tenantId', 'Tenant', 'tenant'),
        field('dueDate', 'Due Date', 'date', true),
        field('amount', 'Amount', 'currency', true),
        field('paidDate', 'Paid Date', 'date'),
        field('lateFee', 'Late Fee', 'currency'),
        enumField('status', 'Status', [
          { value: 'pending', label: 'Pending', color: '#f59e0b' },
          { value: 'paid', label: 'Paid', color: '#22c55e' },
          { value: 'partial', label: 'Partial', color: '#60a5fa' },
          { value: 'overdue', label: 'Overdue', color: '#ef4444' },
        ]),
        enumField('paymentMethod', 'Payment Method', [
          { value: 'check', label: 'Check' },
          { value: 'bank_transfer', label: 'Bank Transfer' },
          { value: 'cash', label: 'Cash' },
          { value: 'online', label: 'Online Payment' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'lease', foreignKey: 'leaseId' },
        { type: 'belongsTo', target: 'tenant', foreignKey: 'tenantId' },
      ],
    },
    {
      id: 'maintenanceRequest',
      name: 'Maintenance Request',
      pluralName: 'Maintenance Requests',
      fields: [
        field('title', 'Issue Title', 'string', true),
        field('description', 'Description', 'richtext', true),
        refField('unitId', 'Unit', 'unit'),
        refField('reportedBy', 'Reported By', 'tenant'),
        field('reportedDate', 'Reported Date', 'date', true),
        enumField('priority', 'Priority', [
          { value: 'low', label: 'Low', color: '#94a3b8' },
          { value: 'medium', label: 'Medium', color: '#f59e0b' },
          { value: 'high', label: 'High', color: '#f97316' },
          { value: 'emergency', label: 'Emergency', color: '#ef4444' },
        ]),
        enumField('category', 'Category', [
          { value: 'plumbing', label: 'Plumbing' },
          { value: 'electrical', label: 'Electrical' },
          { value: 'hvac', label: 'HVAC' },
          { value: 'appliance', label: 'Appliance' },
          { value: 'structural', label: 'Structural' },
          { value: 'pest', label: 'Pest Control' },
          { value: 'other', label: 'Other' },
        ]),
        enumField('status', 'Status', [
          { value: 'open', label: 'Open', color: '#60a5fa' },
          { value: 'assigned', label: 'Assigned', color: '#8b5cf6' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'closed', label: 'Closed', color: '#94a3b8' },
        ]),
        field('completedDate', 'Completed Date', 'date'),
        field('resolutionNotes', 'Resolution Notes', 'richtext'),
      ],
    },
    taskEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'form', 'calendar', 'kanban'],
  workflows: ['lease-renewal', 'rent-collection', 'maintenance-workflow'],
  automationRules: [
    'on lease expiring -> send renewal reminder',
    'on rent overdue -> add late fee',
    'on maintenance request -> notify property manager',
  ],
  metrics: ['occupancy_rate', 'rent_collected', 'outstanding_balance', 'maintenance_open'],
  featureBundle: {
    core: ['tenant_management', 'lease_tracking', 'rent_collection', 'property_tracking'],
    recommended: ['maintenance_requests', 'document_storage', 'payment_processing', 'automated_reminders'],
    optional: ['tenant_portal', 'financial_reports', 'background_checks', 'lease_templates'],
  },
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Collect rent payments online' },
    { id: 'docusign', name: 'DocuSign', purpose: 'Digital lease signing' },
    { id: 'quickbooks', name: 'QuickBooks', purpose: 'Accounting sync' },
    { id: 'zillow', name: 'Zillow', purpose: 'Sync property listings' },
  ],
  terminology: {
    tenant: {
      primary: 'Tenant',
      plural: 'Tenants',
      action: { add: 'Add Tenant', edit: 'Edit Tenant', delete: 'Remove Tenant', view: 'View Tenant' },
      empty: 'No tenants yet',
      labels: { list: 'All Tenants', details: 'Tenant Details', new: 'New Tenant' },
    },
    property: {
      primary: 'Property',
      plural: 'Properties',
      action: { add: 'Add Property', edit: 'Edit Property', delete: 'Remove Property', view: 'View Property' },
      empty: 'No properties yet',
      labels: { list: 'All Properties', details: 'Property Details', new: 'New Property' },
    },
  },
  workflowTemplates: [
    { id: 'lease_expiry_reminder', name: 'Lease Expiry Reminder', trigger: '30 days before lease.endDate', action: 'Send email to tenant', enabled: true },
    { id: 'rent_overdue_notice', name: 'Rent Overdue Notice', trigger: 'rentPayment.dueDate passed', action: 'Send reminder to tenant', enabled: true },
    { id: 'maintenance_assigned', name: 'Maintenance Assigned', trigger: 'maintenanceRequest.status changed to assigned', action: 'Notify assigned staff', enabled: true },
    { id: 'lease_renewal_followup', name: 'Lease Renewal Follow-up', trigger: '60 days before lease.endDate', action: 'Create renewal task', enabled: true },
    { id: 'welcome_new_tenant', name: 'Welcome New Tenant', trigger: 'lease.status changed to active', action: 'Send welcome email', enabled: true },
  ],
  computedFields: [
    { id: 'totalRentPaid', name: 'Total Rent Paid', formula: 'SUM(rentPayments.amount WHERE status=paid)', type: 'currency' },
    { id: 'balanceDue', name: 'Balance Due', formula: 'SUM(rentPayments.amount WHERE status IN [pending, overdue])', type: 'currency' },
    { id: 'occupancyRate', name: 'Occupancy Rate', formula: 'COUNT(units WHERE status=occupied) / COUNT(units)', type: 'percentage' },
    { id: 'daysUntilLeaseExpiry', name: 'Days Until Lease Expiry', formula: 'lease.endDate - TODAY()', type: 'number' },
    { id: 'totalMonthlyRent', name: 'Total Monthly Rent', formula: 'SUM(units.rentAmount WHERE status=occupied)', type: 'currency' },
    { id: 'openMaintenanceCount', name: 'Open Maintenance Requests', formula: 'COUNT(maintenanceRequests WHERE status IN [open, assigned, in_progress])', type: 'number' },
  ],
  statusWorkflows: [
    {
      entity: 'lease',
      field: 'status',
      states: ['draft', 'pending_signature', 'active', 'expiring', 'expired', 'terminated'],
      transitions: [
        { from: 'draft', to: 'pending_signature', action: 'Send for Signature', trigger: 'manual' },
        { from: 'pending_signature', to: 'active', action: 'Mark as Signed', trigger: 'manual' },
        { from: 'active', to: 'expiring', trigger: 'auto', condition: 'daysUntilExpiry < 30' },
        { from: 'expiring', to: 'expired', trigger: 'auto', condition: 'endDate < TODAY()' },
        { from: ['active', 'expiring'], to: 'terminated', action: 'Terminate Lease', trigger: 'manual' },
      ],
    },
    {
      entity: 'maintenanceRequest',
      field: 'status',
      states: ['open', 'assigned', 'in_progress', 'completed', 'closed'],
      transitions: [
        { from: 'open', to: 'assigned', action: 'Assign Staff', trigger: 'manual' },
        { from: 'assigned', to: 'in_progress', action: 'Start Work', trigger: 'manual' },
        { from: 'in_progress', to: 'completed', action: 'Mark Complete', trigger: 'manual' },
        { from: 'completed', to: 'closed', action: 'Close Request', trigger: 'manual' },
      ],
    },
    {
      entity: 'rentPayment',
      field: 'status',
      states: ['pending', 'paid', 'partial', 'overdue'],
      transitions: [
        { from: 'pending', to: 'paid', action: 'Record Payment', trigger: 'manual' },
        { from: 'pending', to: 'partial', action: 'Record Partial Payment', trigger: 'manual' },
        { from: 'pending', to: 'overdue', trigger: 'auto', condition: 'dueDate < TODAY()' },
        { from: 'partial', to: 'paid', action: 'Record Remaining', trigger: 'manual' },
        { from: 'overdue', to: 'paid', action: 'Record Late Payment', trigger: 'manual' },
      ],
    },
  ],
  dashboardTemplate: {
    kpis: [
      { label: 'Occupancy Rate', metric: 'occupancyRate', icon: 'building', format: 'percentage' },
      { label: 'Rent Collected', metric: 'SUM(rentPayments.amount WHERE status=paid AND month=current)', format: 'currency' },
      { label: 'Outstanding Balance', metric: 'balanceDue', icon: 'alert', format: 'currency' },
      { label: 'Open Maintenance', metric: 'openMaintenanceCount', icon: 'wrench', format: 'number' },
    ],
    charts: [
      { type: 'bar', title: 'Monthly Revenue', dataQuery: 'rentPayments.amount BY month' },
      { type: 'pie', title: 'Unit Status', dataQuery: 'units BY status' },
      { type: 'line', title: 'Occupancy Trend', dataQuery: 'occupancyRate BY month' },
    ],
    lists: [
      { title: 'Expiring Leases', query: 'leases WHERE status=expiring ORDER BY endDate', limit: 5 },
      { title: 'Overdue Rent', query: 'rentPayments WHERE status=overdue ORDER BY dueDate', limit: 5 },
      { title: 'Open Maintenance', query: 'maintenanceRequests WHERE status IN [open, assigned] ORDER BY priority DESC', limit: 5 },
    ],
  },
  businessRules: [
    { id: 'no_delete_active_tenant', entity: 'tenant', action: 'delete', condition: 'EXISTS(lease WHERE tenantId=this.id AND status=active)', message: 'Cannot delete tenant with active lease', severity: 'error' },
    { id: 'no_double_book_unit', entity: 'lease', action: 'create', condition: 'EXISTS(lease WHERE unitId=this.unitId AND status=active)', message: 'Cannot create lease for occupied unit', severity: 'error' },
    { id: 'security_deposit_required', entity: 'lease', action: 'create', field: 'securityDeposit', condition: 'securityDeposit IS NULL OR securityDeposit < monthlyRent', message: 'Security deposit should be at least one month rent', severity: 'warning' },
    { id: 'rent_increase_limit', entity: 'lease', action: 'update', field: 'monthlyRent', condition: 'monthlyRent > previousValue * 1.10', message: 'Rent increase exceeds 10% - please verify', severity: 'warning' },
    { id: 'no_delete_property_with_units', entity: 'property', action: 'delete', condition: 'EXISTS(unit WHERE propertyId=this.id)', message: 'Cannot delete property with units', severity: 'error' },
  ],
};

/** Gym Kit - for gyms with memberships and classes */
const gymKit: IndustryKit = {
  id: 'gym',
  name: 'Gym / Fitness Studio',
  professions: ['Gym Owner', 'Fitness Studio Owner', 'Gym Manager'],
  keywords: ['gym', 'fitness studio', 'membership', 'fitness class', 'workout', 'exercise'],
  dashboardType: 'health',
  complexity: 'high',
  uiStyle: 'bold',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'payments', 'staff', 'settings'],
  optionalModules: ['messaging', 'notifications', 'permissions'],
  entities: [
    memberEntity(),
    {
      id: 'membershipPlan',
      name: 'Membership Plan',
      pluralName: 'Membership Plans',
      fields: [
        field('name', 'Plan Name', 'string', true),
        field('description', 'Description', 'richtext'),
        field('price', 'Monthly Price', 'currency', true),
        field('duration', 'Duration (months)', 'number'),
        field('classesIncluded', 'Classes Included', 'number'),
        field('features', 'Features', 'richtext'),
        enumField('billingCycle', 'Billing Cycle', [
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'annual', label: 'Annual' },
        ]),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
      ],
    },
    {
      id: 'membership',
      name: 'Membership',
      pluralName: 'Memberships',
      fields: [
        refField('memberId', 'Member', 'member'),
        refField('planId', 'Plan', 'membershipPlan'),
        field('startDate', 'Start Date', 'date', true),
        field('endDate', 'End Date', 'date'),
        field('autoRenew', 'Auto Renew', 'boolean'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'frozen', label: 'Frozen', color: '#60a5fa' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
          { value: 'expired', label: 'Expired', color: '#94a3b8' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'member', foreignKey: 'memberId' },
        { type: 'belongsTo', target: 'membershipPlan', foreignKey: 'planId' },
      ],
    },
    {
      id: 'fitnessClass',
      name: 'Class',
      pluralName: 'Classes',
      fields: [
        field('name', 'Class Name', 'string', true),
        field('description', 'Description', 'richtext'),
        refField('instructorId', 'Instructor', 'staff'),
        field('dayOfWeek', 'Day of Week', 'string'),
        field('startTime', 'Start Time', 'string'),
        field('duration', 'Duration (minutes)', 'number'),
        field('capacity', 'Max Capacity', 'number'),
        field('location', 'Location/Room', 'string'),
        enumField('classType', 'Type', [
          { value: 'yoga', label: 'Yoga', color: '#8b5cf6' },
          { value: 'spinning', label: 'Spinning', color: '#f97316' },
          { value: 'strength', label: 'Strength', color: '#ef4444' },
          { value: 'cardio', label: 'Cardio', color: '#22c55e' },
          { value: 'pilates', label: 'Pilates', color: '#60a5fa' },
          { value: 'hiit', label: 'HIIT', color: '#f59e0b' },
          { value: 'other', label: 'Other', color: '#94a3b8' },
        ]),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'classSchedule',
      name: 'Scheduled Class',
      pluralName: 'Class Schedule',
      fields: [
        refField('classId', 'Class', 'fitnessClass'),
        field('date', 'Date', 'date', true),
        field('startTime', 'Start Time', 'datetime', true),
        field('spotsAvailable', 'Spots Available', 'number'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        ]),
      ],
    },
    {
      id: 'attendance',
      name: 'Attendance',
      pluralName: 'Attendance Records',
      fields: [
        refField('memberId', 'Member', 'member'),
        refField('classScheduleId', 'Class', 'classSchedule'),
        field('checkInTime', 'Check-in Time', 'datetime'),
        enumField('status', 'Status', [
          { value: 'registered', label: 'Registered', color: '#60a5fa' },
          { value: 'checked_in', label: 'Checked In', color: '#22c55e' },
          { value: 'no_show', label: 'No Show', color: '#ef4444' },
          { value: 'cancelled', label: 'Cancelled', color: '#94a3b8' },
        ]),
      ],
      relationships: [
        { type: 'belongsTo', target: 'member', foreignKey: 'memberId' },
        { type: 'belongsTo', target: 'classSchedule', foreignKey: 'classScheduleId' },
      ],
    },
    staffEntity(),
    taskEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'form', 'calendar'],
  workflows: ['membership-renewal', 'class-booking'],
  automationRules: [
    'on membership expiring -> send renewal reminder',
    'on class full -> waitlist notification',
    'on member signup -> send welcome email',
  ],
  metrics: ['active_members', 'monthly_revenue', 'class_attendance', 'membership_retention'],
  featureBundle: {
    core: ['member_management', 'membership_plans', 'attendance_tracking'],
    recommended: ['class_scheduling', 'payment_subscriptions', 'automated_reminders'],
    optional: ['member_portal', 'workout_tracking', 'trainer_assignment', 'equipment_booking'],
  },
  suggestedIntegrations: [
    { id: 'stripe', name: 'Stripe', purpose: 'Membership subscriptions' },
    { id: 'mindbody', name: 'Mindbody', purpose: 'Class booking sync' },
    { id: 'mailchimp', name: 'Mailchimp', purpose: 'Member newsletters' },
  ],
  terminology: {
    member: {
      primary: 'Member',
      plural: 'Members',
      action: { add: 'Add Member', edit: 'Edit Member', delete: 'Remove Member', view: 'View Member' },
      empty: 'No members yet',
      labels: { list: 'All Members', details: 'Member Details', new: 'New Member' },
    },
    fitnessClass: {
      primary: 'Class',
      plural: 'Classes',
      action: { add: 'Add Class', edit: 'Edit Class', delete: 'Remove Class', view: 'View Class' },
      empty: 'No classes scheduled',
      labels: { list: 'Class Schedule', details: 'Class Details', new: 'New Class' },
    },
  },
  workflowTemplates: [
    { id: 'welcome_member', name: 'Welcome New Member', trigger: 'membership.status changed to active', action: 'Send welcome email with gym info', enabled: true },
    { id: 'membership_renewal', name: 'Membership Renewal Reminder', trigger: '14 days before membership.endDate', action: 'Send renewal reminder', enabled: true },
    { id: 'class_reminder', name: 'Class Reminder', trigger: '2 hours before classSchedule.startTime', action: 'Send reminder to registered members', enabled: true },
    { id: 'membership_expired', name: 'Membership Expired Notice', trigger: 'membership.status changed to expired', action: 'Send reactivation offer', enabled: true },
    { id: 'attendance_streak', name: 'Attendance Streak', trigger: 'member visits 10 times in month', action: 'Send congratulations email', enabled: true },
  ],
  computedFields: [
    { id: 'membershipDaysLeft', name: 'Days Until Expiry', formula: 'membership.endDate - TODAY()', type: 'number' },
    { id: 'totalClassesAttended', name: 'Total Classes Attended', formula: 'COUNT(attendance WHERE memberId=this.id AND status=checked_in)', type: 'number' },
    { id: 'activeMembers', name: 'Active Members', formula: 'COUNT(memberships WHERE status=active)', type: 'number' },
    { id: 'monthlyRevenue', name: 'Monthly Revenue', formula: 'SUM(membershipPlan.price * COUNT(memberships WHERE planId=plan.id AND status=active))', type: 'currency' },
    { id: 'classCapacityUsed', name: 'Class Capacity Used', formula: 'COUNT(attendance WHERE classScheduleId=this.id) / fitnessClass.capacity', type: 'percentage' },
    { id: 'averageAttendance', name: 'Average Class Attendance', formula: 'AVG(COUNT(attendance) GROUP BY classScheduleId)', type: 'number' },
  ],
  statusWorkflows: [
    {
      entity: 'membership',
      field: 'status',
      states: ['active', 'frozen', 'cancelled', 'expired'],
      transitions: [
        { from: 'active', to: 'frozen', action: 'Freeze Membership', trigger: 'manual' },
        { from: 'frozen', to: 'active', action: 'Reactivate', trigger: 'manual' },
        { from: 'active', to: 'cancelled', action: 'Cancel Membership', trigger: 'manual' },
        { from: 'active', to: 'expired', trigger: 'auto', condition: 'endDate < TODAY() AND autoRenew = false' },
        { from: 'frozen', to: 'cancelled', action: 'Cancel Membership', trigger: 'manual' },
        { from: 'expired', to: 'active', action: 'Renew Membership', trigger: 'manual' },
      ],
    },
    {
      entity: 'classSchedule',
      field: 'status',
      states: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      transitions: [
        { from: 'scheduled', to: 'in_progress', trigger: 'auto', condition: 'startTime <= NOW()' },
        { from: 'in_progress', to: 'completed', trigger: 'auto', condition: 'startTime + duration <= NOW()' },
        { from: 'scheduled', to: 'cancelled', action: 'Cancel Class', trigger: 'manual' },
      ],
    },
    {
      entity: 'attendance',
      field: 'status',
      states: ['registered', 'checked_in', 'no_show', 'cancelled'],
      transitions: [
        { from: 'registered', to: 'checked_in', action: 'Check In', trigger: 'manual' },
        { from: 'registered', to: 'no_show', trigger: 'auto', condition: 'classSchedule.status = completed' },
        { from: 'registered', to: 'cancelled', action: 'Cancel Registration', trigger: 'manual' },
      ],
    },
  ],
  dashboardTemplate: {
    kpis: [
      { label: 'Active Members', metric: 'activeMembers', icon: 'users', format: 'number' },
      { label: 'Monthly Revenue', metric: 'monthlyRevenue', icon: 'dollar', format: 'currency' },
      { label: 'Classes This Week', metric: 'COUNT(classSchedule WHERE date BETWEEN startOfWeek AND endOfWeek)', format: 'number' },
      { label: 'Avg Class Attendance', metric: 'averageAttendance', icon: 'chart', format: 'number' },
    ],
    charts: [
      { type: 'bar', title: 'Membership by Plan', dataQuery: 'memberships BY planId' },
      { type: 'line', title: 'Member Growth', dataQuery: 'COUNT(memberships WHERE status=active) BY month' },
      { type: 'donut', title: 'Class Type Popularity', dataQuery: 'attendance BY fitnessClass.classType' },
    ],
    lists: [
      { title: 'Expiring Memberships', query: 'memberships WHERE status=active AND endDate < TODAY() + 14 ORDER BY endDate', limit: 5 },
      { title: 'Today\'s Classes', query: 'classSchedule WHERE date=TODAY() ORDER BY startTime', limit: 5 },
      { title: 'New Members', query: 'members ORDER BY createdAt DESC', limit: 5 },
    ],
  },
  businessRules: [
    { id: 'no_delete_active_member', entity: 'member', action: 'delete', condition: 'EXISTS(membership WHERE memberId=this.id AND status=active)', message: 'Cannot delete member with active membership', severity: 'error' },
    { id: 'class_capacity_check', entity: 'attendance', action: 'create', condition: 'COUNT(attendance WHERE classScheduleId=this.classScheduleId AND status IN [registered, checked_in]) >= fitnessClass.capacity', message: 'Class is at full capacity', severity: 'error' },
    { id: 'frozen_member_no_class', entity: 'attendance', action: 'create', condition: 'membership.status = frozen', message: 'Member has frozen membership - cannot register for classes', severity: 'error' },
    { id: 'membership_required', entity: 'attendance', action: 'create', condition: 'NOT EXISTS(membership WHERE memberId=this.memberId AND status=active)', message: 'Active membership required to register for classes', severity: 'error' },
  ],
};

/** Commercial Cleaning Kit - for cleaning companies serving businesses */
const commercialCleaningKit: IndustryKit = {
  id: 'commercial-cleaning',
  name: 'Commercial Cleaning',
  professions: ['Commercial Cleaner', 'Janitorial Service', 'Office Cleaning'],
  keywords: ['commercial cleaning', 'janitorial', 'office cleaning', 'building maintenance', 'facility cleaning'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'invoices', 'staff', 'settings'],
  optionalModules: ['inventory', 'messaging', 'notifications'],
  entities: [
    {
      id: 'businessClient',
      name: 'Business Client',
      pluralName: 'Business Clients',
      fields: [
        field('companyName', 'Company Name', 'string', true),
        field('contactName', 'Contact Name', 'string', true),
        field('contactEmail', 'Contact Email', 'email'),
        field('contactPhone', 'Contact Phone', 'phone'),
        field('billingEmail', 'Billing Email', 'email'),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'prospect', label: 'Prospect', color: '#60a5fa' },
          { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
        ]),
      ],
    },
    {
      id: 'location',
      name: 'Location',
      pluralName: 'Locations',
      fields: [
        field('name', 'Location Name', 'string', true),
        refField('businessClientId', 'Business Client', 'businessClient'),
        ...addressFields(),
        field('squareFootage', 'Square Footage', 'number'),
        field('floors', 'Number of Floors', 'number'),
        field('accessInstructions', 'Access Instructions', 'richtext'),
        field('keyCode', 'Key/Access Code', 'string'),
        enumField('locationType', 'Type', [
          { value: 'office', label: 'Office', color: '#60a5fa' },
          { value: 'retail', label: 'Retail', color: '#f59e0b' },
          { value: 'medical', label: 'Medical', color: '#ef4444' },
          { value: 'industrial', label: 'Industrial', color: '#94a3b8' },
          { value: 'educational', label: 'Educational', color: '#8b5cf6' },
          { value: 'other', label: 'Other', color: '#64748b' },
        ]),
      ],
    },
    {
      id: 'serviceContract',
      name: 'Service Contract',
      pluralName: 'Service Contracts',
      fields: [
        refField('businessClientId', 'Business Client', 'businessClient'),
        refField('locationId', 'Location', 'location'),
        field('startDate', 'Start Date', 'date', true),
        field('endDate', 'End Date', 'date'),
        field('monthlyPrice', 'Monthly Price', 'currency', true),
        enumField('frequency', 'Cleaning Frequency', [
          { value: 'daily', label: 'Daily', color: '#22c55e' },
          { value: 'weekly', label: 'Weekly', color: '#60a5fa' },
          { value: 'biweekly', label: 'Bi-weekly', color: '#f59e0b' },
          { value: 'monthly', label: 'Monthly', color: '#94a3b8' },
        ]),
        field('servicesIncluded', 'Services Included', 'richtext'),
        enumField('status', 'Status', [
          { value: 'active', label: 'Active', color: '#22c55e' },
          { value: 'pending', label: 'Pending', color: '#f59e0b' },
          { value: 'expired', label: 'Expired', color: '#ef4444' },
          { value: 'cancelled', label: 'Cancelled', color: '#94a3b8' },
        ]),
      ],
    },
    {
      id: 'cleaningVisit',
      name: 'Cleaning Visit',
      pluralName: 'Cleaning Visits',
      fields: [
        refField('contractId', 'Contract', 'serviceContract'),
        refField('locationId', 'Location', 'location'),
        field('scheduledDate', 'Scheduled Date', 'datetime', true),
        field('completedDate', 'Completed Date', 'datetime'),
        refField('assignedTeamLead', 'Team Lead', 'staff'),
        field('checklistCompleted', 'Checklist Completed', 'boolean'),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
          { value: 'in_progress', label: 'In Progress', color: '#f97316' },
          { value: 'completed', label: 'Completed', color: '#22c55e' },
          { value: 'missed', label: 'Missed', color: '#ef4444' },
        ]),
      ],
    },
    invoiceEntity(),
    staffEntity(),
    taskEntity(),
    materialEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'form', 'calendar'],
  workflows: ['service-scheduling', 'quality-inspection'],
  automationRules: [
    'on contract expiring -> send renewal notice',
    'on visit completed -> send confirmation',
  ],
  metrics: ['active_contracts', 'visits_completed', 'monthly_revenue', 'client_retention'],
};

const industryKits: IndustryKit[] = [
  plumberKit,
  electricianKit,
  contractorKit,
  cleaningKit,
  commercialCleaningKit,
  bakeryKit,
  restaurantKit,
  salonKit,
  realEstateKit,
  propertyManagementKit,
  homeOrganizerKit,
  fitnessKit,
  gymKit,
  tutorKit,
  photographerKit,
  ecommerceKit,
  mechanicKit,
  handymanKit,
  roofingKit,
  hvacKit,
  landscapingKit,
  medicalKit,
  homeHealthKit,
  generalBusinessKit,
];

export const listIndustryKits = (): IndustryKit[] => industryKits;

export const getIndustryKit = (id: IndustryKitId): IndustryKit => {
  const kit = industryKits.find((k) => k.id === id);
  return kit || generalBusinessKit;
};
