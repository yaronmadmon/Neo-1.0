/**
 * Kit Default Configurations
 * 
 * Each kit has a default configuration that shapes how it's presented.
 * These defaults can be overridden by discovery results.
 */

import type { IndustryKitId } from '../kits/industries/types.js';
import type { 
  KitDefaultConfiguration, 
  FeatureVisibilityConfig,
  EntityTerminology,
  ComplexityLevel,
} from './types.js';

/**
 * Base feature visibility - everything visible but not prominent
 */
const baseFeatureVisibility: FeatureVisibilityConfig = {
  scheduling: 'visible',
  invoicing: 'visible',
  quotes: 'visible',
  teamManagement: 'visible',
  staffScheduling: 'visible',
  permissions: 'hidden',
  customerPortal: 'hidden',
  customerCommunication: 'visible',
  inventory: 'visible',
  gallery: 'hidden',
  documents: 'hidden',
  reports: 'visible',
  integrations: 'hidden',
};

/**
 * Solo operator feature visibility - simplified for one person
 */
const soloFeatureVisibility: Partial<FeatureVisibilityConfig> = {
  teamManagement: 'hidden',
  staffScheduling: 'hidden',
  permissions: 'hidden',
  customerPortal: 'hidden',
};

/**
 * Service business feature visibility - scheduling and invoicing prominent
 */
const serviceFeatureVisibility: Partial<FeatureVisibilityConfig> = {
  scheduling: 'prominent',
  invoicing: 'prominent',
  quotes: 'visible',
  inventory: 'hidden',
  gallery: 'hidden',
};

// ============================================================
// PLUMBER KIT DEFAULTS
// ============================================================

const plumberDefaults: KitDefaultConfiguration = {
  complexity: 'simple',
  terminology: {
    job: {
      singular: 'Service Call',
      plural: 'Service Calls',
      actions: {
        create: 'Schedule Service Call',
        edit: 'Edit Service Call',
        delete: 'Cancel Service Call',
        view: 'View Details',
        complete: 'Complete Call',
      },
      statuses: {
        scheduled: 'Scheduled',
        in_progress: 'On Site',
        completed: 'Completed',
        invoiced: 'Invoiced',
      },
      emptyMessage: 'No service calls scheduled',
    },
    homeowner: {
      singular: 'Customer',
      plural: 'Customers',
      actions: {
        create: 'Add Customer',
        edit: 'Edit Customer',
        delete: 'Remove Customer',
        view: 'View Customer',
        complete: 'Archive Customer',
      },
      emptyMessage: 'No customers yet',
    },
  },
  features: {
    ...soloFeatureVisibility,
    scheduling: 'prominent',
    invoicing: 'prominent',
    quotes: 'visible',
    inventory: 'hidden', // Most plumbers don't track parts
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'today',
    calendarStartHour: 7,
    defaultDuration: 60,
    businessDays: [1, 2, 3, 4, 5], // Mon-Fri default
    businessStartHour: 7,
    businessEndHour: 18,
  },
  sampleDataTemplates: {
    serviceTypes: ['Leak repair', 'Drain cleaning', 'Water heater service', 'Pipe replacement', 'Faucet installation'],
    sampleNames: ['Sarah Mitchell', 'Marcus Chen', 'Lisa Rodriguez', 'James Wilson', 'Emily Parker'],
    sampleAddresses: ['742 Oak Lane', '158 Pine Street', '2201 Maple Ave', '89 Cedar Court', '1456 Birch Drive'],
    locationStyle: 'residential',
  },
};

// ============================================================
// ELECTRICIAN KIT DEFAULTS
// ============================================================

const electricianDefaults: KitDefaultConfiguration = {
  complexity: 'simple',
  terminology: {
    job: {
      singular: 'Service Call',
      plural: 'Service Calls',
      actions: {
        create: 'Schedule Service Call',
        edit: 'Edit Service Call',
        delete: 'Cancel Service Call',
        view: 'View Details',
        complete: 'Complete Call',
      },
      statuses: {
        scheduled: 'Scheduled',
        in_progress: 'Working',
        completed: 'Completed',
      },
      emptyMessage: 'No service calls scheduled',
    },
    homeowner: {
      singular: 'Customer',
      plural: 'Customers',
      actions: {
        create: 'Add Customer',
        edit: 'Edit Customer',
        delete: 'Remove Customer',
        view: 'View Customer',
        complete: 'Archive Customer',
      },
      emptyMessage: 'No customers yet',
    },
  },
  features: {
    ...soloFeatureVisibility,
    scheduling: 'prominent',
    invoicing: 'prominent',
    quotes: 'prominent', // Electricians often do quotes for bigger jobs
    inventory: 'hidden',
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'today',
    calendarStartHour: 7,
    defaultDuration: 90,
    businessDays: [1, 2, 3, 4, 5],
    businessStartHour: 7,
    businessEndHour: 17,
  },
  sampleDataTemplates: {
    serviceTypes: ['Panel upgrade', 'Outlet installation', 'Lighting repair', 'Circuit troubleshooting', 'Ceiling fan install'],
    sampleNames: ['Robert Kim', 'Maria Santos', 'David Thompson', 'Jennifer Lee', 'Michael Brown'],
    sampleAddresses: ['521 Elm Street', '1089 Oak Avenue', '234 Walnut Lane', '876 Cherry Road', '445 Ash Court'],
    locationStyle: 'residential',
  },
};

// ============================================================
// CLEANING KIT DEFAULTS (Residential)
// ============================================================

const cleaningDefaults: KitDefaultConfiguration = {
  complexity: 'simple',
  terminology: {
    cleaningJob: {
      singular: 'Cleaning',
      plural: 'Cleanings',
      actions: {
        create: 'Schedule Cleaning',
        edit: 'Edit Cleaning',
        delete: 'Cancel Cleaning',
        view: 'View Details',
        complete: 'Mark Complete',
      },
      statuses: {
        scheduled: 'Scheduled',
        in_progress: 'In Progress',
        completed: 'Completed',
      },
      emptyMessage: 'No cleanings scheduled',
    },
    propertyOwner: {
      singular: 'Client',
      plural: 'Clients',
      actions: {
        create: 'Add Client',
        edit: 'Edit Client',
        delete: 'Remove Client',
        view: 'View Client',
        complete: 'Archive Client',
      },
      emptyMessage: 'No clients yet',
    },
  },
  features: {
    ...soloFeatureVisibility,
    scheduling: 'prominent',
    invoicing: 'visible',
    quotes: 'hidden', // Residential cleaning rarely needs quotes
    inventory: 'hidden',
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'today',
    calendarStartHour: 8,
    defaultDuration: 120, // 2 hour default
    businessDays: [1, 2, 3, 4, 5],
    businessStartHour: 8,
    businessEndHour: 17,
  },
  sampleDataTemplates: {
    serviceTypes: ['Regular cleaning', 'Deep cleaning', 'Move-out cleaning', 'Spring cleaning'],
    sampleNames: ['Amanda White', 'Chris Johnson', 'Rachel Green', 'Steven Davis', 'Nicole Taylor'],
    sampleAddresses: ['1234 Sunset Blvd', '567 Garden Way', '890 Hillcrest Drive', '234 Valley Road', '678 Meadow Lane'],
    locationStyle: 'residential',
  },
};

// ============================================================
// COMMERCIAL CLEANING KIT DEFAULTS
// ============================================================

const commercialCleaningDefaults: KitDefaultConfiguration = {
  complexity: 'standard',
  terminology: {
    cleaningVisit: {
      singular: 'Service Visit',
      plural: 'Service Visits',
      actions: {
        create: 'Schedule Visit',
        edit: 'Edit Visit',
        delete: 'Cancel Visit',
        view: 'View Details',
        complete: 'Complete Visit',
      },
      statuses: {
        scheduled: 'Scheduled',
        in_progress: 'In Progress',
        completed: 'Completed',
        missed: 'Missed',
      },
      emptyMessage: 'No visits scheduled',
    },
    businessClient: {
      singular: 'Client',
      plural: 'Clients',
      actions: {
        create: 'Add Client',
        edit: 'Edit Client',
        delete: 'Remove Client',
        view: 'View Client',
        complete: 'Archive Client',
      },
      emptyMessage: 'No clients yet',
    },
    serviceContract: {
      singular: 'Contract',
      plural: 'Contracts',
      actions: {
        create: 'Create Contract',
        edit: 'Edit Contract',
        delete: 'Cancel Contract',
        view: 'View Contract',
        complete: 'Close Contract',
      },
      emptyMessage: 'No active contracts',
    },
  },
  features: {
    scheduling: 'prominent',
    invoicing: 'prominent',
    quotes: 'visible',
    teamManagement: 'visible', // Commercial usually has teams
    staffScheduling: 'visible',
    permissions: 'hidden',
    customerPortal: 'hidden',
    customerCommunication: 'visible',
    inventory: 'visible', // Track supplies
    gallery: 'hidden',
    documents: 'visible', // Contracts
    reports: 'visible',
    integrations: 'hidden',
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'dashboard',
    calendarStartHour: 6, // Early for commercial
    defaultDuration: 180,
    businessDays: [1, 2, 3, 4, 5],
    businessStartHour: 6,
    businessEndHour: 22, // Late for offices
  },
  sampleDataTemplates: {
    serviceTypes: ['Daily cleaning', 'Floor care', 'Window cleaning', 'Restroom sanitation', 'Carpet cleaning'],
    sampleNames: ['Apex Industries', 'Summit Medical', 'Metro Bank', 'Tech Solutions Inc', 'Downtown Legal'],
    sampleAddresses: ['100 Corporate Plaza', '2500 Business Park Dr', '888 Commerce Street', '1200 Executive Blvd', '450 Tower Way'],
    locationStyle: 'commercial',
  },
};

// ============================================================
// PROPERTY MANAGEMENT KIT DEFAULTS
// ============================================================

const propertyManagementDefaults: KitDefaultConfiguration = {
  complexity: 'standard',
  terminology: {
    tenant: {
      singular: 'Tenant',
      plural: 'Tenants',
      actions: {
        create: 'Add Tenant',
        edit: 'Edit Tenant',
        delete: 'Remove Tenant',
        view: 'View Tenant',
        complete: 'Archive Tenant',
      },
      emptyMessage: 'No tenants yet',
    },
    unit: {
      singular: 'Unit',
      plural: 'Units',
      actions: {
        create: 'Add Unit',
        edit: 'Edit Unit',
        delete: 'Remove Unit',
        view: 'View Unit',
        complete: 'Archive Unit',
      },
      statuses: {
        occupied: 'Occupied',
        vacant: 'Vacant',
        maintenance: 'Under Maintenance',
        reserved: 'Reserved',
      },
      emptyMessage: 'No units added',
    },
    maintenanceRequest: {
      singular: 'Maintenance Request',
      plural: 'Maintenance Requests',
      actions: {
        create: 'Create Request',
        edit: 'Edit Request',
        delete: 'Close Request',
        view: 'View Request',
        complete: 'Mark Complete',
      },
      statuses: {
        open: 'Open',
        assigned: 'Assigned',
        in_progress: 'In Progress',
        completed: 'Completed',
        closed: 'Closed',
      },
      emptyMessage: 'No open requests',
    },
    rentPayment: {
      singular: 'Payment',
      plural: 'Payments',
      actions: {
        create: 'Record Payment',
        edit: 'Edit Payment',
        delete: 'Void Payment',
        view: 'View Payment',
        complete: 'Mark Paid',
      },
      statuses: {
        pending: 'Due',
        paid: 'Paid',
        partial: 'Partial',
        overdue: 'Overdue',
      },
      emptyMessage: 'No payments recorded',
    },
  },
  features: {
    scheduling: 'visible',
    invoicing: 'prominent', // Rent collection is key
    quotes: 'hidden',
    teamManagement: 'hidden', // Start simple
    staffScheduling: 'hidden',
    permissions: 'hidden',
    customerPortal: 'visible', // Tenant portal
    customerCommunication: 'prominent',
    inventory: 'hidden',
    gallery: 'visible', // Property photos
    documents: 'prominent', // Leases
    reports: 'prominent', // Financial reports
    integrations: 'hidden',
  },
  defaults: {
    primaryView: 'dashboard',
    homePage: 'dashboard',
    calendarStartHour: 8,
    defaultDuration: 60,
    businessDays: [1, 2, 3, 4, 5],
    businessStartHour: 9,
    businessEndHour: 17,
  },
  sampleDataTemplates: {
    serviceTypes: ['Plumbing repair', 'HVAC service', 'Appliance repair', 'General maintenance', 'Electrical issue'],
    sampleNames: ['Alex Morgan', 'Jordan Rivera', 'Casey Smith', 'Taylor Johnson', 'Morgan Williams'],
    sampleAddresses: ['Unit 101, Oak Apartments', 'Unit 205, Pine Gardens', '3B, Maple Heights', '12A, Cedar View', 'Unit 8, Birch Place'],
    locationStyle: 'residential',
  },
};

// ============================================================
// GYM KIT DEFAULTS
// ============================================================

const gymDefaults: KitDefaultConfiguration = {
  complexity: 'standard',
  terminology: {
    member: {
      singular: 'Member',
      plural: 'Members',
      actions: {
        create: 'Add Member',
        edit: 'Edit Member',
        delete: 'Remove Member',
        view: 'View Profile',
        complete: 'Archive Member',
      },
      statuses: {
        active: 'Active',
        trial: 'Trial',
        expired: 'Expired',
        frozen: 'Frozen',
      },
      emptyMessage: 'No members yet',
    },
    fitnessClass: {
      singular: 'Class',
      plural: 'Classes',
      actions: {
        create: 'Add Class',
        edit: 'Edit Class',
        delete: 'Cancel Class',
        view: 'View Class',
        complete: 'Complete Class',
      },
      emptyMessage: 'No classes scheduled',
    },
    membership: {
      singular: 'Membership',
      plural: 'Memberships',
      actions: {
        create: 'Create Membership',
        edit: 'Edit Membership',
        delete: 'Cancel Membership',
        view: 'View Membership',
        complete: 'Renew Membership',
      },
      statuses: {
        active: 'Active',
        frozen: 'Frozen',
        cancelled: 'Cancelled',
        expired: 'Expired',
      },
      emptyMessage: 'No memberships',
    },
  },
  features: {
    scheduling: 'prominent', // Class scheduling
    invoicing: 'visible',
    quotes: 'hidden',
    teamManagement: 'visible', // Trainers
    staffScheduling: 'visible',
    permissions: 'hidden',
    customerPortal: 'prominent', // Member booking
    customerCommunication: 'visible',
    inventory: 'hidden',
    gallery: 'hidden',
    documents: 'hidden',
    reports: 'visible',
    integrations: 'visible', // Payment integration important
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'dashboard',
    calendarStartHour: 5, // Early gym hours
    defaultDuration: 60,
    businessDays: [0, 1, 2, 3, 4, 5, 6], // 7 days
    businessStartHour: 5,
    businessEndHour: 22,
  },
  sampleDataTemplates: {
    serviceTypes: ['Yoga', 'Spin Class', 'HIIT', 'Strength Training', 'Pilates'],
    sampleNames: ['Emma Wilson', 'Liam Johnson', 'Olivia Davis', 'Noah Martinez', 'Sophia Brown'],
    sampleAddresses: ['Studio A', 'Main Floor', 'Studio B', 'Weight Room', 'Spin Room'],
    locationStyle: 'commercial',
  },
};

// ============================================================
// FITNESS COACH KIT DEFAULTS (Personal Training)
// ============================================================

const fitnessCoachDefaults: KitDefaultConfiguration = {
  complexity: 'simple',
  terminology: {
    session: {
      singular: 'Session',
      plural: 'Sessions',
      actions: {
        create: 'Schedule Session',
        edit: 'Edit Session',
        delete: 'Cancel Session',
        view: 'View Session',
        complete: 'Complete Session',
      },
      emptyMessage: 'No sessions scheduled',
    },
    client: {
      singular: 'Client',
      plural: 'Clients',
      actions: {
        create: 'Add Client',
        edit: 'Edit Client',
        delete: 'Remove Client',
        view: 'View Client',
        complete: 'Archive Client',
      },
      emptyMessage: 'No clients yet',
    },
  },
  features: {
    ...soloFeatureVisibility,
    scheduling: 'prominent',
    invoicing: 'visible',
    quotes: 'hidden',
    customerCommunication: 'prominent',
    gallery: 'hidden',
    reports: 'visible',
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'today',
    calendarStartHour: 6,
    defaultDuration: 60,
    businessDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
    businessStartHour: 6,
    businessEndHour: 20,
  },
  sampleDataTemplates: {
    serviceTypes: ['Personal Training', 'Nutrition Consultation', 'Fitness Assessment', 'Group Training'],
    sampleNames: ['Jake Thompson', 'Mia Garcia', 'Ethan Clark', 'Isabella Lee', 'Mason White'],
    sampleAddresses: ['Downtown Gym', 'Home Visit', 'Park Session', 'Virtual/Online', 'Client Home'],
    locationStyle: 'mixed',
  },
};

// ============================================================
// TUTOR KIT DEFAULTS
// ============================================================

const tutorDefaults: KitDefaultConfiguration = {
  complexity: 'simple',
  terminology: {
    lesson: {
      singular: 'Lesson',
      plural: 'Lessons',
      actions: {
        create: 'Schedule Lesson',
        edit: 'Edit Lesson',
        delete: 'Cancel Lesson',
        view: 'View Lesson',
        complete: 'Complete Lesson',
      },
      statuses: {
        scheduled: 'Scheduled',
        completed: 'Completed',
        cancelled: 'Cancelled',
        rescheduled: 'Rescheduled',
      },
      emptyMessage: 'No lessons scheduled',
    },
    student: {
      singular: 'Student',
      plural: 'Students',
      actions: {
        create: 'Add Student',
        edit: 'Edit Student',
        delete: 'Remove Student',
        view: 'View Student',
        complete: 'Archive Student',
      },
      statuses: {
        active: 'Active',
        on_hold: 'On Hold',
        completed: 'Completed',
        inactive: 'Inactive',
      },
      emptyMessage: 'No students yet',
    },
  },
  features: {
    ...soloFeatureVisibility,
    scheduling: 'prominent',
    invoicing: 'visible',
    quotes: 'hidden',
    customerCommunication: 'prominent', // Parent communication
    documents: 'visible', // Study materials
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'today',
    calendarStartHour: 14, // After school
    defaultDuration: 60,
    businessDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
    businessStartHour: 14,
    businessEndHour: 20,
  },
  sampleDataTemplates: {
    serviceTypes: ['Math tutoring', 'English tutoring', 'Science tutoring', 'Test prep', 'Homework help'],
    sampleNames: ['Lucas Anderson', 'Ava Martinez', 'Benjamin Taylor', 'Charlotte Wilson', 'Henry Moore'],
    sampleAddresses: ['Library', 'Student Home', 'Virtual/Online', 'Coffee Shop', 'Community Center'],
    locationStyle: 'mixed',
  },
};

// ============================================================
// SALON KIT DEFAULTS
// ============================================================

const salonDefaults: KitDefaultConfiguration = {
  complexity: 'simple',
  terminology: {
    appointment: {
      singular: 'Appointment',
      plural: 'Appointments',
      actions: {
        create: 'Book Appointment',
        edit: 'Edit Appointment',
        delete: 'Cancel Appointment',
        view: 'View Appointment',
        complete: 'Complete',
      },
      statuses: {
        scheduled: 'Booked',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
      emptyMessage: 'No appointments today',
    },
    client: {
      singular: 'Client',
      plural: 'Clients',
      actions: {
        create: 'Add Client',
        edit: 'Edit Client',
        delete: 'Remove Client',
        view: 'View Client',
        complete: 'Archive Client',
      },
      emptyMessage: 'No clients yet',
    },
    service: {
      singular: 'Service',
      plural: 'Services',
      actions: {
        create: 'Add Service',
        edit: 'Edit Service',
        delete: 'Remove Service',
        view: 'View Service',
        complete: 'Disable Service',
      },
      emptyMessage: 'No services defined',
    },
  },
  features: {
    ...soloFeatureVisibility,
    scheduling: 'prominent',
    invoicing: 'visible',
    quotes: 'hidden',
    customerPortal: 'visible', // Online booking
    customerCommunication: 'visible',
    gallery: 'visible', // Portfolio
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'today',
    calendarStartHour: 9,
    defaultDuration: 45,
    businessDays: [1, 2, 3, 4, 5, 6],
    businessStartHour: 9,
    businessEndHour: 19,
  },
  sampleDataTemplates: {
    serviceTypes: ['Haircut', 'Color', 'Highlights', 'Blowout', 'Treatment'],
    sampleNames: ['Sophia Martinez', 'Emma Johnson', 'Olivia Williams', 'Ava Brown', 'Isabella Davis'],
    sampleAddresses: ['Station 1', 'Station 2', 'Station 3', 'VIP Room', 'Wash Station'],
    locationStyle: 'commercial',
  },
};

// ============================================================
// RESTAURANT KIT DEFAULTS
// ============================================================

const restaurantDefaults: KitDefaultConfiguration = {
  complexity: 'standard',
  terminology: {
    reservation: {
      singular: 'Reservation',
      plural: 'Reservations',
      actions: {
        create: 'Make Reservation',
        edit: 'Edit Reservation',
        delete: 'Cancel Reservation',
        view: 'View Reservation',
        complete: 'Complete',
      },
      statuses: {
        booked: 'Booked',
        confirmed: 'Confirmed',
        seated: 'Seated',
        completed: 'Completed',
        no_show: 'No Show',
      },
      emptyMessage: 'No reservations today',
    },
    guest: {
      singular: 'Guest',
      plural: 'Guests',
      actions: {
        create: 'Add Guest',
        edit: 'Edit Guest',
        delete: 'Remove Guest',
        view: 'View Guest',
        complete: 'Archive Guest',
      },
      emptyMessage: 'No guests yet',
    },
    order: {
      singular: 'Order',
      plural: 'Orders',
      actions: {
        create: 'New Order',
        edit: 'Edit Order',
        delete: 'Cancel Order',
        view: 'View Order',
        complete: 'Close Order',
      },
      statuses: {
        new: 'New',
        in_progress: 'Preparing',
        served: 'Served',
        closed: 'Closed',
      },
      emptyMessage: 'No active orders',
    },
  },
  features: {
    scheduling: 'prominent', // Reservations
    invoicing: 'visible',
    quotes: 'hidden',
    teamManagement: 'visible', // Staff
    staffScheduling: 'visible',
    permissions: 'hidden',
    customerPortal: 'visible', // Online reservations
    customerCommunication: 'visible',
    inventory: 'visible', // Kitchen supplies
    gallery: 'visible', // Menu photos
    documents: 'hidden',
    reports: 'prominent',
    integrations: 'visible',
  },
  defaults: {
    primaryView: 'calendar',
    homePage: 'dashboard',
    calendarStartHour: 11,
    defaultDuration: 90,
    businessDays: [0, 1, 2, 3, 4, 5, 6],
    businessStartHour: 11,
    businessEndHour: 23,
  },
  sampleDataTemplates: {
    serviceTypes: ['Dinner reservation', 'Lunch reservation', 'Private event', 'Large party', 'Special occasion'],
    sampleNames: ['The Johnson Party', 'Smith Anniversary', 'Chen Birthday', 'Williams Business Dinner', 'Garcia Celebration'],
    sampleAddresses: ['Table 1', 'Table 5', 'Patio', 'Private Room', 'Bar Area'],
    locationStyle: 'commercial',
  },
};

// ============================================================
// DEFAULT CONFIGURATION (General Business)
// ============================================================

const generalBusinessDefaults: KitDefaultConfiguration = {
  complexity: 'simple',
  terminology: {
    client: {
      singular: 'Client',
      plural: 'Clients',
      actions: {
        create: 'Add Client',
        edit: 'Edit Client',
        delete: 'Remove Client',
        view: 'View Client',
        complete: 'Archive Client',
      },
      emptyMessage: 'No clients yet',
    },
    task: {
      singular: 'Task',
      plural: 'Tasks',
      actions: {
        create: 'Add Task',
        edit: 'Edit Task',
        delete: 'Delete Task',
        view: 'View Task',
        complete: 'Complete Task',
      },
      statuses: {
        todo: 'To Do',
        in_progress: 'In Progress',
        done: 'Done',
      },
      emptyMessage: 'No tasks',
    },
    appointment: {
      singular: 'Appointment',
      plural: 'Appointments',
      actions: {
        create: 'Schedule',
        edit: 'Edit',
        delete: 'Cancel',
        view: 'View',
        complete: 'Complete',
      },
      emptyMessage: 'No appointments scheduled',
    },
  },
  features: {
    ...baseFeatureVisibility,
    ...soloFeatureVisibility,
  },
  defaults: {
    primaryView: 'list',
    homePage: 'dashboard',
    calendarStartHour: 8,
    defaultDuration: 60,
    businessDays: [1, 2, 3, 4, 5],
    businessStartHour: 9,
    businessEndHour: 17,
  },
  sampleDataTemplates: {
    serviceTypes: ['Consultation', 'Service', 'Meeting', 'Follow-up'],
    sampleNames: ['John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams'],
    sampleAddresses: ['123 Main Street', '456 Oak Avenue', '789 Pine Road'],
    locationStyle: 'mixed',
  },
};

// ============================================================
// KIT DEFAULTS MAP
// ============================================================

const kitDefaultsMap: Partial<Record<IndustryKitId, KitDefaultConfiguration>> = {
  plumber: plumberDefaults,
  electrician: electricianDefaults,
  cleaning: cleaningDefaults,
  'commercial-cleaning': commercialCleaningDefaults,
  'property-management': propertyManagementDefaults,
  gym: gymDefaults,
  'fitness-coach': fitnessCoachDefaults,
  tutor: tutorDefaults,
  salon: salonDefaults,
  restaurant: restaurantDefaults,
  general_business: generalBusinessDefaults,
};

/**
 * Get default configuration for a kit
 */
export function getKitDefaults(kitId: IndustryKitId): KitDefaultConfiguration {
  return kitDefaultsMap[kitId] || generalBusinessDefaults;
}

/**
 * Get all kit IDs that have specific defaults
 */
export function getKitsWithDefaults(): IndustryKitId[] {
  return Object.keys(kitDefaultsMap) as IndustryKitId[];
}

/**
 * Check if a kit has specific defaults defined
 */
export function hasKitDefaults(kitId: IndustryKitId): boolean {
  return kitId in kitDefaultsMap;
}
