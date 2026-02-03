/**
 * Sample Data Generator
 * 
 * Creates narrative sample data that feels real and relevant.
 * Key principles:
 * - Data tells a story (past, present, future)
 * - Uses realistic names and addresses
 * - References service types from their industry
 * - Shows different states (completed, scheduled, pending)
 */

import type { AppConfiguration, LocationStyle, SampleDataContext } from './types.js';
import type { IndustryKitId } from '../kits/industries/types.js';
import { getKitDefaults } from './kit-defaults.js';

/**
 * Sample record for any entity
 */
export interface SampleRecord {
  id: string;
  [key: string]: unknown;
}

/**
 * Generated sample data set
 */
export interface GeneratedSampleData {
  /** Records by entity type */
  entities: Record<string, SampleRecord[]>;
  /** Dashboard statistics */
  stats: Record<string, number | string>;
  /** Welcome message context */
  welcomeContext: {
    businessName: string;
    todayCount: number;
    todayItems: string[];
  };
}

// ============================================================
// NAME GENERATORS
// ============================================================

const firstNames = [
  'Sarah', 'Marcus', 'Lisa', 'James', 'Emily',
  'Michael', 'Jennifer', 'Robert', 'Maria', 'David',
  'Jessica', 'Christopher', 'Amanda', 'Daniel', 'Ashley',
  'Matthew', 'Stephanie', 'Andrew', 'Nicole', 'Joshua',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia',
];

const lastNames = [
  'Mitchell', 'Chen', 'Rodriguez', 'Wilson', 'Parker',
  'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
  'Miller', 'Davis', 'Martinez', 'Anderson', 'Taylor',
  'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
];

const companyNames = [
  'Apex Industries', 'Summit Medical', 'Metro Bank', 'Tech Solutions Inc',
  'Downtown Legal', 'Bright Horizons', 'Central Services', 'Premier Partners',
  'Valley Insurance', 'Coastal Realty', 'Urban Design Co', 'Green Valley LLC',
];

/**
 * Generate a random name
 */
function randomName(): string {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

/**
 * Generate a random company name
 */
function randomCompany(): string {
  return companyNames[Math.floor(Math.random() * companyNames.length)];
}

// ============================================================
// ADDRESS GENERATORS
// ============================================================

const residentialStreets = [
  'Oak Lane', 'Pine Street', 'Maple Avenue', 'Cedar Court', 'Birch Drive',
  'Elm Street', 'Walnut Lane', 'Cherry Road', 'Ash Court', 'Willow Way',
  'Sunset Blvd', 'Garden Way', 'Hillcrest Drive', 'Valley Road', 'Meadow Lane',
];

const commercialStreets = [
  'Corporate Plaza', 'Business Park Drive', 'Commerce Street', 'Executive Blvd',
  'Tower Way', 'Industrial Avenue', 'Trade Center', 'Financial District',
  'Professional Drive', 'Office Park Lane', 'Market Street', 'Center Blvd',
];

/**
 * Generate a random address
 */
function randomAddress(style: LocationStyle): string {
  const number = Math.floor(Math.random() * 2000) + 100;
  const streets = style === 'commercial' ? commercialStreets : residentialStreets;
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${number} ${street}`;
}

// ============================================================
// DATE GENERATORS
// ============================================================

/**
 * Get a date relative to today
 */
function relativeDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Get a datetime relative to today
 */
function relativeDateTime(daysOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/**
 * Get today's date formatted nicely
 */
function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================
// INDUSTRY-SPECIFIC GENERATORS
// ============================================================

/**
 * Generate sample data for a plumber/service business
 */
function generatePlumberData(config: AppConfiguration): GeneratedSampleData {
  const defaults = getKitDefaults(config.kitId);
  const serviceTypes = config.sampleData.serviceTypes.length > 0 
    ? config.sampleData.serviceTypes 
    : defaults.sampleDataTemplates.serviceTypes;

  const customers = [
    { id: 'c1', name: randomName(), phone: '(555) 123-4567', address: randomAddress('residential'), status: 'active' },
    { id: 'c2', name: randomName(), phone: '(555) 234-5678', address: randomAddress('residential'), status: 'active' },
    { id: 'c3', name: randomName(), phone: '(555) 345-6789', address: randomAddress('residential'), status: 'active' },
    { id: 'c4', name: randomName(), phone: '(555) 456-7890', address: randomAddress('residential'), status: 'lead' },
  ];

  const jobs = [
    {
      id: 'j1',
      jobTitle: `${serviceTypes[0]} - ${customers[0].address}`,
      homeownerId: 'c1',
      status: 'completed',
      appointmentDate: relativeDateTime(-1, 10),
      jobAddress: customers[0].address,
      invoiceTotal: 275,
    },
    {
      id: 'j2',
      jobTitle: `${serviceTypes[1]} - ${customers[1].address}`,
      homeownerId: 'c2',
      status: 'scheduled',
      appointmentDate: relativeDateTime(0, 14),
      jobAddress: customers[1].address,
      quoteAmount: 150,
    },
    {
      id: 'j3',
      jobTitle: `${serviceTypes[2]} - ${customers[2].address}`,
      homeownerId: 'c3',
      status: 'scheduled',
      appointmentDate: relativeDateTime(1, 9),
      jobAddress: customers[2].address,
      quoteAmount: 450,
    },
    {
      id: 'j4',
      jobTitle: `${serviceTypes[0]} estimate - ${customers[3].address}`,
      homeownerId: 'c4',
      status: 'scheduled',
      appointmentDate: relativeDateTime(2, 11),
      jobAddress: customers[3].address,
    },
  ];

  const todayJobs = jobs.filter(j => {
    const jobDate = new Date(j.appointmentDate).toDateString();
    return jobDate === new Date().toDateString();
  });

  return {
    entities: {
      homeowner: customers,
      job: jobs,
    },
    stats: {
      todayServiceCalls: todayJobs.length,
      scheduledThisWeek: jobs.filter(j => j.status === 'scheduled').length,
      completedThisMonth: 12,
      pendingInvoices: 3,
    },
    welcomeContext: {
      businessName: config.sampleData.businessName,
      todayCount: todayJobs.length,
      todayItems: todayJobs.map(j => j.jobTitle),
    },
  };
}

/**
 * Generate sample data for property management
 */
function generatePropertyManagementData(config: AppConfiguration): GeneratedSampleData {
  const tenants = [
    { id: 't1', name: randomName(), email: 'tenant1@email.com', phone: '(555) 111-2222', status: 'active', monthlyRent: 1500 },
    { id: 't2', name: randomName(), email: 'tenant2@email.com', phone: '(555) 222-3333', status: 'active', monthlyRent: 1200 },
    { id: 't3', name: randomName(), email: 'tenant3@email.com', phone: '(555) 333-4444', status: 'active', monthlyRent: 1800 },
    { id: 't4', name: randomName(), email: 'tenant4@email.com', phone: '(555) 444-5555', status: 'pending', monthlyRent: 1400 },
  ];

  const units = [
    { id: 'u1', unitNumber: '101', bedrooms: 2, bathrooms: 1, rentAmount: 1500, status: 'occupied', currentTenantId: 't1' },
    { id: 'u2', unitNumber: '102', bedrooms: 1, bathrooms: 1, rentAmount: 1200, status: 'occupied', currentTenantId: 't2' },
    { id: 'u3', unitNumber: '201', bedrooms: 3, bathrooms: 2, rentAmount: 1800, status: 'occupied', currentTenantId: 't3' },
    { id: 'u4', unitNumber: '202', bedrooms: 2, bathrooms: 1, rentAmount: 1400, status: 'vacant' },
    { id: 'u5', unitNumber: '203', bedrooms: 2, bathrooms: 1, rentAmount: 1400, status: 'reserved', currentTenantId: 't4' },
  ];

  const maintenanceRequests = [
    { id: 'm1', title: 'Leaky faucet in kitchen', unitId: 'u1', status: 'open', priority: 'medium', reportedDate: relativeDate(-2) },
    { id: 'm2', title: 'AC not cooling', unitId: 'u3', status: 'in_progress', priority: 'high', reportedDate: relativeDate(-1) },
    { id: 'm3', title: 'Light bulb replacement', unitId: 'u2', status: 'completed', priority: 'low', reportedDate: relativeDate(-5) },
  ];

  const rentPayments = [
    { id: 'r1', tenantId: 't1', amount: 1500, dueDate: relativeDate(-5), status: 'paid', paidDate: relativeDate(-3) },
    { id: 'r2', tenantId: 't2', amount: 1200, dueDate: relativeDate(-5), status: 'paid', paidDate: relativeDate(-4) },
    { id: 'r3', tenantId: 't3', amount: 1800, dueDate: relativeDate(-5), status: 'overdue' },
  ];

  const openRequests = maintenanceRequests.filter(m => m.status !== 'completed');

  return {
    entities: {
      tenant: tenants,
      unit: units,
      maintenanceRequest: maintenanceRequests,
      rentPayment: rentPayments,
    },
    stats: {
      occupancyRate: '80%',
      rentCollectedThisMonth: 2700,
      outstandingBalance: 1800,
      openMaintenanceRequests: openRequests.length,
    },
    welcomeContext: {
      businessName: config.sampleData.businessName,
      todayCount: openRequests.length,
      todayItems: openRequests.map(m => `${m.title} (Unit ${units.find(u => u.id === m.unitId)?.unitNumber})`),
    },
  };
}

/**
 * Generate sample data for gym
 */
function generateGymData(config: AppConfiguration): GeneratedSampleData {
  const members = [
    { id: 'm1', name: randomName(), email: 'member1@email.com', membershipType: 'premium', status: 'active' },
    { id: 'm2', name: randomName(), email: 'member2@email.com', membershipType: 'basic', status: 'active' },
    { id: 'm3', name: randomName(), email: 'member3@email.com', membershipType: 'unlimited', status: 'active' },
    { id: 'm4', name: randomName(), email: 'member4@email.com', membershipType: 'basic', status: 'trial' },
    { id: 'm5', name: randomName(), email: 'member5@email.com', membershipType: 'premium', status: 'expired' },
  ];

  const classes = [
    { id: 'cl1', name: 'Morning Yoga', classType: 'yoga', startTime: '06:00', duration: 60, capacity: 20 },
    { id: 'cl2', name: 'Spin Class', classType: 'spinning', startTime: '07:30', duration: 45, capacity: 15 },
    { id: 'cl3', name: 'HIIT Training', classType: 'hiit', startTime: '12:00', duration: 30, capacity: 12 },
    { id: 'cl4', name: 'Evening Strength', classType: 'strength', startTime: '18:00', duration: 60, capacity: 10 },
  ];

  const todayClasses = classes.slice(0, 3);

  return {
    entities: {
      member: members,
      fitnessClass: classes,
    },
    stats: {
      activeMembers: members.filter(m => m.status === 'active').length,
      classesToday: todayClasses.length,
      newMembersThisMonth: 8,
      expiringMemberships: 2,
    },
    welcomeContext: {
      businessName: config.sampleData.businessName,
      todayCount: todayClasses.length,
      todayItems: todayClasses.map(c => `${c.name} at ${c.startTime}`),
    },
  };
}

/**
 * Generate sample data for cleaning service
 */
function generateCleaningData(config: AppConfiguration): GeneratedSampleData {
  const defaults = getKitDefaults(config.kitId);
  const serviceTypes = config.sampleData.serviceTypes.length > 0 
    ? config.sampleData.serviceTypes 
    : defaults.sampleDataTemplates.serviceTypes;

  const clients = [
    { id: 'c1', name: randomName(), address: randomAddress('residential'), phone: '(555) 123-4567', status: 'active' },
    { id: 'c2', name: randomName(), address: randomAddress('residential'), phone: '(555) 234-5678', status: 'active' },
    { id: 'c3', name: randomName(), address: randomAddress('residential'), phone: '(555) 345-6789', status: 'active' },
  ];

  const jobs = [
    {
      id: 'j1',
      jobTitle: `${serviceTypes[0]} - ${clients[0].name}`,
      propertyOwnerId: 'c1',
      propertyAddress: clients[0].address,
      scheduledDate: relativeDateTime(-1, 9),
      cleaningType: 'regular',
      status: 'completed',
    },
    {
      id: 'j2',
      jobTitle: `${serviceTypes[0]} - ${clients[1].name}`,
      propertyOwnerId: 'c2',
      propertyAddress: clients[1].address,
      scheduledDate: relativeDateTime(0, 10),
      cleaningType: 'regular',
      status: 'scheduled',
    },
    {
      id: 'j3',
      jobTitle: `${serviceTypes[1]} - ${clients[2].name}`,
      propertyOwnerId: 'c3',
      propertyAddress: clients[2].address,
      scheduledDate: relativeDateTime(1, 9),
      cleaningType: 'deep',
      status: 'scheduled',
    },
  ];

  const todayJobs = jobs.filter(j => {
    const jobDate = new Date(j.scheduledDate).toDateString();
    return jobDate === new Date().toDateString();
  });

  return {
    entities: {
      propertyOwner: clients,
      cleaningJob: jobs,
    },
    stats: {
      cleaningsToday: todayJobs.length,
      scheduledThisWeek: jobs.filter(j => j.status === 'scheduled').length,
      completedThisMonth: 15,
      activeClients: clients.length,
    },
    welcomeContext: {
      businessName: config.sampleData.businessName,
      todayCount: todayJobs.length,
      todayItems: todayJobs.map(j => `${j.cleaningType} at ${j.propertyAddress}`),
    },
  };
}

/**
 * Generate generic sample data
 */
function generateGenericData(config: AppConfiguration): GeneratedSampleData {
  const clients = [
    { id: 'c1', name: randomName(), email: 'client1@email.com', phone: '(555) 123-4567', status: 'active' },
    { id: 'c2', name: randomName(), email: 'client2@email.com', phone: '(555) 234-5678', status: 'active' },
    { id: 'c3', name: randomName(), email: 'client3@email.com', phone: '(555) 345-6789', status: 'active' },
  ];

  const tasks = [
    { id: 't1', title: 'Follow up with client', status: 'todo', dueDate: relativeDate(0) },
    { id: 't2', title: 'Send invoice', status: 'todo', dueDate: relativeDate(1) },
    { id: 't3', title: 'Review proposal', status: 'in_progress', dueDate: relativeDate(-1) },
    { id: 't4', title: 'Schedule meeting', status: 'done', dueDate: relativeDate(-2) },
  ];

  const appointments = [
    { id: 'a1', title: 'Client meeting', clientId: 'c1', startTime: relativeDateTime(0, 14), status: 'scheduled' },
    { id: 'a2', title: 'Follow-up call', clientId: 'c2', startTime: relativeDateTime(1, 10), status: 'scheduled' },
  ];

  const todayTasks = tasks.filter(t => {
    const taskDate = new Date(t.dueDate).toDateString();
    return taskDate === new Date().toDateString() && t.status !== 'done';
  });

  return {
    entities: {
      client: clients,
      task: tasks,
      appointment: appointments,
    },
    stats: {
      activeClients: clients.length,
      openTasks: tasks.filter(t => t.status !== 'done').length,
      appointmentsToday: 1,
      tasksOverdue: 1,
    },
    welcomeContext: {
      businessName: config.sampleData.businessName,
      todayCount: todayTasks.length,
      todayItems: todayTasks.map(t => t.title),
    },
  };
}

// ============================================================
// MAIN GENERATOR
// ============================================================

/**
 * Generate sample data based on app configuration
 */
export function generateSampleData(config: AppConfiguration): GeneratedSampleData {
  // Don't generate if disabled
  if (!config.sampleData.includeSampleData) {
    return {
      entities: {},
      stats: {},
      welcomeContext: {
        businessName: config.sampleData.businessName,
        todayCount: 0,
        todayItems: [],
      },
    };
  }

  // Route to industry-specific generator
  switch (config.kitId) {
    case 'plumber':
    case 'electrician':
    case 'hvac':
    case 'handyman':
    case 'roofing':
      return generatePlumberData(config);
    
    case 'property-management':
      return generatePropertyManagementData(config);
    
    case 'gym':
      return generateGymData(config);
    
    case 'cleaning':
    case 'commercial-cleaning':
      return generateCleaningData(config);
    
    // TODO: Add more industry-specific generators
    
    default:
      return generateGenericData(config);
  }
}

/**
 * Generate a welcome message based on sample data
 */
export function generateWelcomeMessage(
  config: AppConfiguration,
  sampleData: GeneratedSampleData
): string {
  const { welcomeContext } = sampleData;
  const now = new Date();
  const hour = now.getHours();
  
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  if (hour >= 17) greeting = 'Good evening';

  const businessName = welcomeContext.businessName || 'there';
  
  if (welcomeContext.todayCount === 0) {
    return `${greeting}, ${businessName}. Your schedule is clear for today.`;
  }
  
  if (welcomeContext.todayCount === 1) {
    return `${greeting}, ${businessName}. You have 1 item scheduled for today.`;
  }
  
  return `${greeting}, ${businessName}. You have ${welcomeContext.todayCount} items scheduled for today.`;
}

/**
 * Generate "Here's what I set up" summary
 */
export function generateSetupSummary(config: AppConfiguration): string[] {
  const summary: string[] = [];
  const kitDefaults = getKitDefaults(config.kitId);

  // Industry
  summary.push(`Set up as a ${config.kitId.replace(/-/g, ' ')} business`);

  // Complexity
  if (config.complexity === 'simple') {
    summary.push('Configured for solo use (team features hidden)');
  } else if (config.complexity === 'advanced') {
    summary.push('Configured for team use with full features');
  }

  // Primary view
  const viewNames: Record<string, string> = {
    calendar: 'Calendar',
    list: 'List',
    kanban: 'Kanban board',
    dashboard: 'Dashboard',
    table: 'Table',
  };
  summary.push(`Home view set to ${viewNames[config.defaults.primaryView] || config.defaults.primaryView}`);

  // Key features
  if (config.features.scheduling === 'prominent') {
    summary.push('Scheduling prominently featured');
  }
  if (config.features.invoicing === 'prominent') {
    summary.push('Invoicing ready to use');
  }
  if (config.features.customerPortal === 'visible' || config.features.customerPortal === 'prominent') {
    summary.push('Customer portal available');
  }

  // What's hidden
  const hiddenFeatures: string[] = [];
  if (config.features.teamManagement === 'hidden') hiddenFeatures.push('team management');
  if (config.features.inventory === 'hidden') hiddenFeatures.push('inventory');
  if (config.features.customerPortal === 'hidden') hiddenFeatures.push('customer portal');
  
  if (hiddenFeatures.length > 0) {
    summary.push(`Hidden for now: ${hiddenFeatures.join(', ')} (enable anytime in Settings)`);
  }

  return summary;
}
