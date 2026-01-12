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
    field('itemName', 'Item Name', 'string', true),
    field('sku', 'SKU', 'string'),
    field('quantity', 'Quantity', 'number'),
    field('unitCost', 'Unit Cost', 'currency'),
    enumField('status', 'Status', [
      { value: 'in_stock', label: 'In Stock', color: '#22c55e' },
      { value: 'low', label: 'Low', color: '#f97316' },
      { value: 'out', label: 'Out', color: '#ef4444' },
    ]),
  ],
});

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
  entities: [
    clientEntity(),
    {
      id: 'job',
      name: 'Job',
      pluralName: 'Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        field('description', 'Description', 'richtext'),
        refField('clientId', 'Client', 'client'),
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
  entities: [
    clientEntity(),
    {
      id: 'job',
      name: 'Job',
      pluralName: 'Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        refField('clientId', 'Client', 'client'),
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

const contractorKit: IndustryKit = {
  id: 'contractor',
  name: 'Contractor',
  professions: ['General Contractor', 'Contractor', 'Builder'],
  keywords: ['contractor', 'construction', 'project', 'renovation'],
  dashboardType: 'operations',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'invoices', 'quotes', 'tasks', 'scheduling', 'staff', 'documents', 'settings'],
  optionalModules: ['inventory', 'messaging', 'gallery'],
  entities: [
    clientEntity(),
    {
      id: 'project',
      name: 'Project',
      pluralName: 'Projects',
      fields: [
        field('projectName', 'Project Name', 'string', true),
        refField('clientId', 'Client', 'client'),
        field('startDate', 'Start Date', 'date'),
        field('endDate', 'End Date', 'date'),
        enumField('status', 'Status', [
          { value: 'planning', label: 'Planning' },
          { value: 'active', label: 'Active' },
          { value: 'on_hold', label: 'On Hold' },
          { value: 'completed', label: 'Completed' },
        ]),
        field('budget', 'Budget', 'currency'),
      ],
    },
    invoiceEntity(),
    quoteEntity(),
    taskEntity(),
    appointmentEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'form', 'calendar', 'timeline'],
  workflows: ['project-milestones', 'change-orders'],
  automationRules: ['on milestone complete -> notify client'],
  metrics: ['projects_active', 'budget_utilization'],
};

const cleaningKit: IndustryKit = {
  id: 'cleaning',
  name: 'Cleaning Services',
  professions: ['Cleaner', 'Cleaning Service'],
  keywords: ['cleaning', 'cleaner', 'janitorial', 'maid'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'invoices', 'staff', 'settings'],
  optionalModules: ['messaging', 'notifications'],
  entities: [
    clientEntity(),
    {
      id: 'cleaningJob',
      name: 'Cleaning Job',
      pluralName: 'Cleaning Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        refField('clientId', 'Client', 'client'),
        field('scheduledDate', 'Scheduled Date', 'datetime'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
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
  metrics: ['jobs_completed', 'repeat_clients'],
};

const bakeryKit: IndustryKit = {
  id: 'bakery',
  name: 'Bakery',
  professions: ['Baker', 'Bakery Owner'],
  keywords: ['bakery', 'baker', 'pastry', 'bread'],
  dashboardType: 'sales',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'inventory', 'orders', 'crm', 'scheduling', 'staff', 'settings'],
  optionalModules: ['payments', 'notifications'],
  entities: [
    {
      id: 'product',
      name: 'Product',
      pluralName: 'Products',
      fields: [
        field('name', 'Name', 'string', true),
        field('category', 'Category', 'string'),
        field('price', 'Price', 'currency'),
        field('available', 'Available', 'boolean'),
      ],
    },
    {
      id: 'order',
      name: 'Order',
      pluralName: 'Orders',
      fields: [
        field('orderNumber', 'Order Number', 'string', true),
        refField('clientId', 'Customer', 'client'),
        field('orderDate', 'Order Date', 'date'),
        field('total', 'Total', 'currency'),
        enumField('status', 'Status', [
          { value: 'new', label: 'New' },
          { value: 'preparing', label: 'Preparing' },
          { value: 'ready', label: 'Ready' },
          { value: 'completed', label: 'Completed' },
        ]),
      ],
    },
    clientEntity(),
    materialEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail', 'calendar'],
  workflows: ['order-fulfillment'],
  automationRules: ['on order completed -> notify customer'],
  metrics: ['orders_today', 'top_products'],
};

const restaurantKit: IndustryKit = {
  id: 'restaurant',
  name: 'Restaurant',
  professions: ['Restaurant Owner', 'Chef', 'Manager'],
  keywords: ['restaurant', 'menu', 'dining', 'reservation'],
  dashboardType: 'sales',
  complexity: 'high',
  uiStyle: 'bold',
  requiredModules: ['dashboard', 'inventory', 'orders', 'scheduling', 'staff', 'crm', 'settings'],
  optionalModules: ['payments', 'messaging', 'notifications'],
  entities: [
    {
      id: 'menuItem',
      name: 'Menu Item',
      pluralName: 'Menu Items',
      fields: [
        field('name', 'Name', 'string', true),
        field('category', 'Category', 'string'),
        field('price', 'Price', 'currency', true),
        field('available', 'Available', 'boolean'),
      ],
    },
    {
      id: 'reservation',
      name: 'Reservation',
      pluralName: 'Reservations',
      fields: [
        field('guestName', 'Guest Name', 'string', true),
        field('partySize', 'Party Size', 'number'),
        field('reservationTime', 'Reservation Time', 'datetime'),
        field('tableNumber', 'Table Number', 'string'),
        enumField('status', 'Status', [
          { value: 'booked', label: 'Booked' },
          { value: 'seated', label: 'Seated' },
          { value: 'completed', label: 'Completed' },
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
        field('total', 'Total', 'currency'),
        enumField('status', 'Status', [
          { value: 'new', label: 'New' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'served', label: 'Served' },
          { value: 'closed', label: 'Closed' },
        ]),
      ],
    },
    materialEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar', 'kanban'],
  workflows: ['table-management'],
  automationRules: ['on reservation time -> notify staff'],
  metrics: ['tables_occupied', 'orders_today'],
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
  keywords: ['tutor', 'tutoring', 'lesson'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'invoices', 'settings'],
  optionalModules: ['messaging'],
  entities: [
    clientEntity(),
    {
      id: 'lesson',
      name: 'Lesson',
      pluralName: 'Lessons',
      fields: [
        field('subject', 'Subject', 'string', true),
        refField('clientId', 'Student', 'client'),
        field('lessonDate', 'Lesson Date', 'datetime'),
        field('duration', 'Duration', 'number'),
      ],
    },
    taskEntity(),
    invoiceEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['lesson-reminders'],
  automationRules: ['after lesson -> send summary'],
  metrics: ['lessons_completed', 'students_active'],
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
  keywords: ['shop', 'ecommerce', 'store', 'online'],
  dashboardType: 'sales',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'inventory', 'orders', 'crm', 'payments', 'settings'],
  optionalModules: ['messaging', 'notifications'],
  entities: [
    {
      id: 'product',
      name: 'Product',
      pluralName: 'Products',
      fields: [
        field('name', 'Name', 'string', true),
        field('sku', 'SKU', 'string'),
        field('price', 'Price', 'currency', true),
        field('quantity', 'Quantity', 'number'),
      ],
    },
    {
      id: 'order',
      name: 'Order',
      pluralName: 'Orders',
      fields: [
        field('orderNumber', 'Order Number', 'string', true),
        refField('clientId', 'Customer', 'client'),
        field('orderDate', 'Order Date', 'date'),
        field('total', 'Total', 'currency'),
        enumField('status', 'Status', [
          { value: 'new', label: 'New' },
          { value: 'packed', label: 'Packed' },
          { value: 'shipped', label: 'Shipped' },
          { value: 'delivered', label: 'Delivered' },
        ]),
      ],
    },
    clientEntity(),
    materialEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'detail'],
  workflows: ['order-fulfillment'],
  automationRules: ['on order shipped -> notify customer'],
  metrics: ['orders_today', 'top_products'],
};

const mechanicKit: IndustryKit = {
  id: 'mechanic',
  name: 'Car Mechanic',
  professions: ['Mechanic', 'Auto Repair'],
  keywords: ['mechanic', 'auto', 'repair', 'vehicle'],
  dashboardType: 'service',
  complexity: 'high',
  uiStyle: 'neutral',
  requiredModules: ['dashboard', 'crm', 'job-pipeline', 'invoices', 'inventory', 'scheduling', 'staff', 'settings'],
  optionalModules: ['messaging', 'gallery'],
  entities: [
    clientEntity(),
    {
      id: 'vehicle',
      name: 'Vehicle',
      pluralName: 'Vehicles',
      fields: [
        field('make', 'Make', 'string'),
        field('model', 'Model', 'string'),
        field('year', 'Year', 'number'),
        field('vin', 'VIN', 'string'),
        refField('clientId', 'Owner', 'client'),
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
        enumField('status', 'Status', [
          { value: 'diagnosis', label: 'Diagnosis' },
          { value: 'repairing', label: 'Repairing' },
          { value: 'complete', label: 'Complete' },
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
  automationRules: ['on repair complete -> notify client'],
  metrics: ['repairs_completed', 'repeat_clients'],
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
    clientEntity(),
    {
      id: 'job',
      name: 'Job',
      pluralName: 'Jobs',
      fields: [
        field('jobTitle', 'Job Title', 'string', true),
        refField('clientId', 'Client', 'client'),
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
  metrics: ['jobs_completed', 'repeat_clients'],
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
    clientEntity(),
    {
      id: 'inspection',
      name: 'Inspection',
      pluralName: 'Inspections',
      fields: [
        field('inspectionDate', 'Inspection Date', 'date'),
        refField('clientId', 'Client', 'client'),
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
  entities: [
    clientEntity(),
    {
      id: 'equipment',
      name: 'Equipment',
      pluralName: 'Equipment',
      fields: [
        field('model', 'Model', 'string'),
        field('serialNumber', 'Serial Number', 'string'),
        field('installDate', 'Install Date', 'date'),
        refField('clientId', 'Client', 'client'),
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
  keywords: ['landscaping', 'lawn', 'garden'],
  dashboardType: 'service',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'invoices', 'staff', 'tasks', 'settings'],
  optionalModules: ['inventory', 'messaging'],
  entities: [
    clientEntity(),
    {
      id: 'project',
      name: 'Project',
      pluralName: 'Projects',
      fields: [
        field('projectName', 'Project Name', 'string', true),
        refField('clientId', 'Client', 'client'),
        field('startDate', 'Start Date', 'date'),
        field('endDate', 'End Date', 'date'),
        enumField('status', 'Status', [
          { value: 'planned', label: 'Planned' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
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
  metrics: ['projects_active', 'client_retention'],
};

const medicalKit: IndustryKit = {
  id: 'medical',
  name: 'Medical Office',
  professions: ['Medical Office', 'Clinic'],
  keywords: ['medical', 'clinic', 'patient', 'appointment'],
  dashboardType: 'health',
  complexity: 'high',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'staff', 'invoices', 'settings'],
  optionalModules: ['notifications', 'messaging'],
  entities: [
    {
      id: 'patient',
      name: 'Patient',
      pluralName: 'Patients',
      fields: [
        field('name', 'Name', 'string', true),
        field('dob', 'Date of Birth', 'date'),
        field('phone', 'Phone', 'phone'),
        field('email', 'Email', 'email'),
      ],
    },
    appointmentEntity(),
    {
      id: 'treatment',
      name: 'Treatment',
      pluralName: 'Treatments',
      fields: [
        refField('patientId', 'Patient', 'patient'),
        field('treatmentDate', 'Treatment Date', 'date'),
        field('notes', 'Notes', 'richtext'),
      ],
    },
    invoiceEntity(),
    staffEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['appointment-reminders'],
  automationRules: ['on treatment completed -> update record'],
  metrics: ['patients_active', 'appointments_today'],
};

const homeHealthKit: IndustryKit = {
  id: 'home-health',
  name: 'Home Health Aide',
  professions: ['Home Health Aide'],
  keywords: ['home health', 'caregiver', 'aide'],
  dashboardType: 'health',
  complexity: 'medium',
  uiStyle: 'light',
  requiredModules: ['dashboard', 'crm', 'scheduling', 'tasks', 'staff', 'settings'],
  optionalModules: ['messaging'],
  entities: [
    clientEntity(),
    {
      id: 'visit',
      name: 'Visit',
      pluralName: 'Visits',
      fields: [
        refField('clientId', 'Client', 'client'),
        field('visitDate', 'Visit Date', 'datetime'),
        field('notes', 'Notes', 'richtext'),
        enumField('status', 'Status', [
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'completed', label: 'Completed' },
        ]),
      ],
    },
    staffEntity(),
    taskEntity(),
  ],
  pageTypes: ['dashboard', 'list', 'calendar'],
  workflows: ['visit-followup'],
  automationRules: ['after visit -> update care plan'],
  metrics: ['visits_today', 'clients_active'],
};

const servicesKit: IndustryKit = {
  id: 'services',
  name: 'Services',
  professions: ['Service Business'],
  keywords: ['service', 'business', 'management'],
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

const industryKits: IndustryKit[] = [
  plumberKit,
  electricianKit,
  contractorKit,
  cleaningKit,
  bakeryKit,
  restaurantKit,
  salonKit,
  realEstateKit,
  homeOrganizerKit,
  fitnessKit,
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
  servicesKit,
];

export const listIndustryKits = (): IndustryKit[] => industryKits;

export const getIndustryKit = (id: IndustryKitId): IndustryKit => {
  const kit = industryKits.find((k) => k.id === id);
  return kit || servicesKit;
};
