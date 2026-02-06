/**
 * Dashboard Intent Generator
 * 
 * Generates DashboardIntent from entities and industry kit configuration.
 * This creates the semantic structure that layouts respond to.
 */

import type { EntityDef, FieldDef } from '../types.js';
import type { IndustryKit, DashboardTemplate } from '../kits/industries/types.js';
import {
  type DashboardIntent,
  type DashboardSection,
  type DomainMetric,
  type ContextualAction,
  type SectionRole,
  type SectionPriority,
  type TimeScope,
  type LayoutHint,
  validateDashboardIntent,
  sortSections,
} from './dashboard-intent.js';

// =============================================================================
// INDUSTRY SECTION CONFIGURATION
// =============================================================================

/**
 * Industry-specific dashboard section configuration.
 * Defines how each industry personalizes its dashboard narrative.
 */
export interface IndustrySectionConfig {
  /** Custom title for "today" section */
  todayTitle?: string;
  /** Custom title for "in-progress" section */
  inProgressTitle?: string;
  /** Custom title for "upcoming" section */
  upcomingTitle?: string;
  /** Custom title for "summary" section */
  summaryTitle?: string;
  /** Primary entity for this industry (hero entity) */
  primaryEntity?: string;
  /** Secondary entities to feature */
  secondaryEntities?: string[];
  /** Domain-specific action labels (actionId → label) */
  actionLabels?: Record<string, string>;
  /** Domain-specific metric labels (metricId → label) */
  metricLabels?: Record<string, string>;
}

/**
 * Default section configurations by industry type.
 * These provide domain personality without hardcoding.
 */
export const INDUSTRY_SECTION_CONFIGS: Record<string, IndustrySectionConfig> = {
  // Food & Hospitality
  bakery: {
    todayTitle: "Today at the Bakery",
    inProgressTitle: "Orders in Progress",
    upcomingTitle: "Upcoming Catering",
    summaryTitle: "Bakery Performance",
    primaryEntity: "order",
    secondaryEntities: ["product", "customer"],
    actionLabels: {
      markReady: "Mark as Baked",
      startProduction: "Start Baking",
      completeOrder: "Order Ready for Pickup",
    },
    metricLabels: {
      "orders.count": "Orders",
      "orders.total": "Sales",
      "products.count": "Products",
    },
  },
  
  restaurant: {
    todayTitle: "Today's Service",
    inProgressTitle: "Active Orders",
    upcomingTitle: "Upcoming Reservations",
    summaryTitle: "Restaurant Overview",
    primaryEntity: "order",
    secondaryEntities: ["reservation", "menuItem"],
    actionLabels: {
      markReady: "Ready to Serve",
      startPreparing: "Start Preparing",
      confirmReservation: "Confirm Reservation",
    },
    metricLabels: {
      "orders.count": "Orders",
      "tables.occupied": "Tables Occupied",
      "reservations.count": "Reservations",
    },
  },
  
  // Health & Wellness
  medical: {
    todayTitle: "Today's Schedule",
    inProgressTitle: "Patients Waiting",
    upcomingTitle: "Upcoming Appointments",
    summaryTitle: "Practice Overview",
    primaryEntity: "appointment",
    secondaryEntities: ["patient", "treatmentNote"],
    actionLabels: {
      checkIn: "Check In Patient",
      startAppointment: "Start Appointment",
      completeNote: "Complete Treatment Note",
    },
    metricLabels: {
      "appointments.count": "Appointments",
      "patients.count": "Patients",
      "treatmentNotes.pending": "Pending Notes",
    },
  },
  
  gym: {
    todayTitle: "Today at the Gym",
    inProgressTitle: "Active Classes",
    upcomingTitle: "Today's Schedule",
    summaryTitle: "Gym Performance",
    primaryEntity: "classSchedule",
    secondaryEntities: ["member", "membership"],
    actionLabels: {
      checkIn: "Check In",
      startClass: "Start Class",
      renewMembership: "Renew Membership",
    },
    metricLabels: {
      "members.active": "Active Members",
      "classes.today": "Classes Today",
      "memberships.expiring": "Expiring Soon",
    },
  },
  
  // Professional Services
  construction: {
    todayTitle: "Today's Work",
    inProgressTitle: "Active Projects",
    upcomingTitle: "Scheduled Tasks",
    summaryTitle: "Project Overview",
    primaryEntity: "project",
    secondaryEntities: ["task", "invoice"],
    actionLabels: {
      updateProgress: "Update Progress",
      markComplete: "Mark Complete",
      approveChange: "Approve Change Order",
    },
    metricLabels: {
      "projects.active": "Active Projects",
      "tasks.overdue": "Overdue Tasks",
      "invoices.outstanding": "Outstanding",
    },
  },
  
  realEstate: {
    todayTitle: "Today's Activity",
    inProgressTitle: "Active Maintenance",
    upcomingTitle: "Upcoming Leases",
    summaryTitle: "Property Overview",
    primaryEntity: "property",
    secondaryEntities: ["tenant", "maintenanceRequest"],
    actionLabels: {
      collectRent: "Record Payment",
      assignMaintenance: "Assign Technician",
      renewLease: "Renew Lease",
    },
    metricLabels: {
      "properties.occupancy": "Occupancy Rate",
      "rent.collected": "Rent Collected",
      "maintenance.open": "Open Requests",
    },
  },
  
  // Education
  tutoring: {
    todayTitle: "Today's Lessons",
    inProgressTitle: "Active Sessions",
    upcomingTitle: "Scheduled Lessons",
    summaryTitle: "Teaching Overview",
    primaryEntity: "lesson",
    secondaryEntities: ["student", "homework"],
    actionLabels: {
      startLesson: "Start Lesson",
      completeLesson: "Complete Lesson",
      assignHomework: "Assign Homework",
    },
    metricLabels: {
      "lessons.today": "Lessons Today",
      "students.active": "Active Students",
      "homework.pending": "Pending Homework",
    },
  },
  
  // Default fallback
  default: {
    todayTitle: "Today at a Glance",
    inProgressTitle: "In Progress",
    upcomingTitle: "Coming Up",
    summaryTitle: "Overall Performance",
    actionLabels: {
      markComplete: "Mark Complete",
      create: "Create New",
      edit: "Edit",
    },
  },
};

// =============================================================================
// ENTITY ANALYSIS HELPERS
// =============================================================================

/**
 * Find entities that have a status field (can be "in progress").
 */
export function findStatusEntities(entities: EntityDef[]): EntityDef[] {
  return entities.filter((entity) =>
    entity.fields.some((field) =>
      field.id === 'status' || 
      field.name?.toLowerCase().includes('status') ||
      (field.type === 'enum' && field.enumOptions?.some((opt) =>
        ['pending', 'in_progress', 'active', 'new', 'processing'].includes(opt.value.toLowerCase())
      ))
    )
  );
}

/**
 * Find entities that have a date field (can be scheduled).
 */
export function findSchedulableEntities(entities: EntityDef[]): EntityDef[] {
  return entities.filter((entity) =>
    entity.fields.some((field) =>
      field.type === 'date' || 
      field.type === 'datetime' ||
      ['date', 'scheduledDate', 'appointmentDate', 'dueDate', 'eventDate', 'orderDate', 'startDate']
        .includes(field.id)
    )
  );
}

/**
 * Find the primary date field in an entity.
 */
export function findPrimaryDateField(entity: EntityDef): FieldDef | undefined {
  const prioritizedNames = [
    'date', 'scheduledDate', 'appointmentDate', 'dueDate', 
    'eventDate', 'orderDate', 'startDate', 'createdAt'
  ];
  
  for (const name of prioritizedNames) {
    const field = entity.fields.find((f) => f.id === name);
    if (field) return field;
  }
  
  return entity.fields.find((f) => f.type === 'date' || f.type === 'datetime');
}

/**
 * Find the status field in an entity.
 */
export function findStatusField(entity: EntityDef): FieldDef | undefined {
  return entity.fields.find((f) => f.id === 'status' || f.name?.toLowerCase() === 'status');
}

/**
 * Find currency/numeric fields for metrics.
 */
export function findMetricFields(entity: EntityDef): FieldDef[] {
  return entity.fields.filter((f) => 
    f.type === 'currency' || 
    f.type === 'number' ||
    f.type === 'percentage'
  );
}

/**
 * Get pending status values from a status field.
 */
export function getPendingStatuses(statusField: FieldDef): string[] {
  if (!statusField.enumOptions) return ['pending', 'new'];
  
  return statusField.enumOptions
    .filter((opt) => 
      ['pending', 'new', 'waiting', 'queued', 'scheduled', 'draft', 'confirmed']
        .includes(opt.value.toLowerCase())
    )
    .map((opt) => opt.value);
}

/**
 * Get active status values from a status field.
 */
export function getActiveStatuses(statusField: FieldDef): string[] {
  if (!statusField.enumOptions) return ['active', 'in_progress'];
  
  return statusField.enumOptions
    .filter((opt) => 
      ['active', 'in_progress', 'in-progress', 'processing', 'started', 'running']
        .includes(opt.value.toLowerCase())
    )
    .map((opt) => opt.value);
}

// =============================================================================
// SECTION BUILDERS
// =============================================================================

/**
 * Build the "today" section - what's happening right now.
 */
function buildTodaySection(
  entities: EntityDef[],
  config: IndustrySectionConfig,
  dashboardTemplate?: DashboardTemplate
): DashboardSection {
  const metrics: DomainMetric[] = [];
  
  // Use kit KPIs if available
  if (dashboardTemplate?.kpis) {
    dashboardTemplate.kpis.slice(0, 4).forEach((kpi, index) => {
      metrics.push({
        sourceMetric: kpi.metric,
        label: config.metricLabels?.[kpi.metric] || kpi.label,
        timeScope: kpi.label.toLowerCase().includes('today') ? 'today' : 
                   kpi.label.toLowerCase().includes('week') ? 'this-week' :
                   kpi.label.toLowerCase().includes('month') ? 'this-month' : 'today',
        emphasize: index === 0, // First KPI is emphasized
        icon: kpi.icon,
        format: kpi.format,
      });
    });
  } else {
    // Generate metrics from entities
    const schedulable = findSchedulableEntities(entities);
    if (schedulable.length > 0) {
      metrics.push({
        sourceMetric: `${schedulable[0].id}.count`,
        label: config.metricLabels?.[`${schedulable[0].id}.count`] || 
               `${schedulable[0].pluralName || schedulable[0].name + 's'} Today`,
        timeScope: 'today',
        emphasize: true,
        format: 'number',
      });
    }
    
    // Find revenue metric
    for (const entity of entities) {
      const currencyField = entity.fields.find((f) => f.type === 'currency');
      if (currencyField) {
        metrics.push({
          sourceMetric: `${entity.id}.${currencyField.id}`,
          label: config.metricLabels?.[`${entity.id}.${currencyField.id}`] || 'Revenue Today',
          timeScope: 'today',
          format: 'currency',
        });
        break;
      }
    }
  }
  
  return {
    id: 'today',
    role: 'today',
    priority: 'primary',
    title: config.todayTitle || 'Today at a Glance',
    timeScope: 'today',
    layoutHint: 'stats-row',
    metrics,
  };
}

/**
 * Build the "in-progress" section - work that needs attention.
 */
function buildInProgressSection(
  statusEntities: EntityDef[],
  config: IndustrySectionConfig,
  dashboardTemplate?: DashboardTemplate
): DashboardSection {
  // Prefer primary entity if set
  const primaryEntity = config.primaryEntity 
    ? statusEntities.find((e) => e.id === config.primaryEntity) || statusEntities[0]
    : statusEntities[0];
  
  const statusField = findStatusField(primaryEntity);
  const pendingStatuses = statusField ? getPendingStatuses(statusField) : ['pending'];
  
  // Build actions
  const actions: ContextualAction[] = [];
  
  // Add mark complete action
  actions.push({
    actionId: 'markComplete',
    label: config.actionLabels?.markComplete || 'Mark Complete',
    entity: primaryEntity.id,
    visibilityRule: 'if-pending',
    variant: 'primary',
  });
  
  // Add start action if there are pending items
  if (pendingStatuses.length > 0) {
    actions.push({
      actionId: 'startProcessing',
      label: config.actionLabels?.startProcessing || 'Start',
      entity: primaryEntity.id,
      visibilityRule: 'if-pending',
      variant: 'secondary',
    });
  }
  
  return {
    id: 'in-progress',
    role: 'in-progress',
    priority: 'secondary',
    title: config.inProgressTitle || `${primaryEntity.pluralName || primaryEntity.name + 's'} in Progress`,
    listEntity: primaryEntity.id,
    listFilter: pendingStatuses.length > 0 
      ? `status:${pendingStatuses.join(',')}` 
      : undefined,
    layoutHint: 'card-list',
    actions,
    limit: 5,
  };
}

/**
 * Build the "upcoming" section - what's coming next.
 */
function buildUpcomingSection(
  schedulableEntities: EntityDef[],
  config: IndustrySectionConfig,
  dashboardTemplate?: DashboardTemplate
): DashboardSection {
  const primaryEntity = config.primaryEntity
    ? schedulableEntities.find((e) => e.id === config.primaryEntity) || schedulableEntities[0]
    : schedulableEntities[0];
  
  const dateField = findPrimaryDateField(primaryEntity);
  
  // Build actions - upcoming items might need confirmation
  const actions: ContextualAction[] = [];
  
  const statusField = findStatusField(primaryEntity);
  if (statusField) {
    actions.push({
      actionId: 'confirm',
      label: config.actionLabels?.confirm || 'Confirm',
      entity: primaryEntity.id,
      visibilityRule: 'if-pending',
      variant: 'primary',
    });
  }
  
  return {
    id: 'upcoming',
    role: 'upcoming',
    priority: 'secondary',
    title: config.upcomingTitle || `Upcoming ${primaryEntity.pluralName || primaryEntity.name + 's'}`,
    timeScope: 'this-week',
    listEntity: primaryEntity.id,
    listFilter: dateField ? `${dateField.id}:>today` : undefined,
    layoutHint: schedulableEntities.length > 1 ? 'calendar' : 'card-list',
    actions: actions.length > 0 ? actions : undefined,
    limit: 5,
  };
}

/**
 * Build the "summary" section - aggregate context.
 */
function buildSummarySection(
  entities: EntityDef[],
  config: IndustrySectionConfig,
  dashboardTemplate?: DashboardTemplate
): DashboardSection {
  const metrics: DomainMetric[] = [];
  
  // Add total counts for main entities
  entities.slice(0, 3).forEach((entity) => {
    metrics.push({
      sourceMetric: `${entity.id}.count`,
      label: config.metricLabels?.[`${entity.id}.count`] || 
             `Total ${entity.pluralName || entity.name + 's'}`,
      timeScope: 'all-time',
      format: 'number',
    });
  });
  
  // Add total revenue if any entity has currency field
  for (const entity of entities) {
    const currencyField = entity.fields.find((f) => 
      f.type === 'currency' && 
      ['total', 'amount', 'price', 'revenue'].includes(f.id.toLowerCase())
    );
    if (currencyField) {
      metrics.push({
        sourceMetric: `${entity.id}.${currencyField.id}.sum`,
        label: config.metricLabels?.['revenue.total'] || 'Total Revenue',
        timeScope: 'all-time',
        format: 'currency',
      });
      break;
    }
  }
  
  return {
    id: 'summary',
    role: 'summary',
    priority: 'tertiary',
    title: config.summaryTitle || 'Overall Performance',
    timeScope: 'all-time',
    layoutHint: 'stats-row',
    metrics,
    // Note: no actions - summary sections never have actions
  };
}

/**
 * Build the "history" section - past records.
 */
function buildHistorySection(
  entities: EntityDef[],
  config: IndustrySectionConfig
): DashboardSection {
  // Find the entity most likely to have history
  const historyEntity = entities.find((e) => 
    e.id.includes('order') || 
    e.id.includes('transaction') || 
    e.id.includes('appointment') ||
    e.id.includes('booking')
  ) || entities[0];
  
  return {
    id: 'history',
    role: 'history',
    priority: 'tertiary',
    title: `Recent ${historyEntity.pluralName || historyEntity.name + 's'}`,
    timeScope: 'this-month',
    listEntity: historyEntity.id,
    layoutHint: 'data-table',
    limit: 10,
    // Note: no actions - history sections never have actions
  };
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate dashboard intent from entities and industry configuration.
 * 
 * @param entities - Entity definitions from the blueprint
 * @param industryKit - Optional industry kit for domain personality
 * @returns Validated and sorted dashboard intent
 */
export function generateDashboardIntent(
  entities: EntityDef[],
  industryKit?: IndustryKit
): DashboardIntent {
  if (entities.length === 0) {
    return {
      sections: [],
      title: 'Dashboard',
    };
  }
  
  // Get industry-specific configuration
  const industryId = industryKit?.id || 'default';
  const config = INDUSTRY_SECTION_CONFIGS[industryId] || INDUSTRY_SECTION_CONFIGS.default;
  const dashboardTemplate = industryKit?.dashboardTemplate;
  
  const sections: DashboardSection[] = [];
  
  // 1. Always generate "today" section (primary) - most important
  sections.push(buildTodaySection(entities, config, dashboardTemplate));
  
  // 2. Generate "in-progress" for entities with status fields
  const statusEntities = findStatusEntities(entities);
  if (statusEntities.length > 0) {
    sections.push(buildInProgressSection(statusEntities, config, dashboardTemplate));
  }
  
  // 3. Generate "upcoming" for schedulable entities
  const schedulableEntities = findSchedulableEntities(entities);
  if (schedulableEntities.length > 0) {
    sections.push(buildUpcomingSection(schedulableEntities, config, dashboardTemplate));
  }
  
  // 4. Always generate "summary" section (tertiary) - context
  sections.push(buildSummarySection(entities, config, dashboardTemplate));
  
  // 5. Optionally add history for apps with transactional entities
  const hasTransactionalEntity = entities.some((e) =>
    ['order', 'booking', 'appointment', 'transaction', 'invoice', 'payment']
      .some((term) => e.id.toLowerCase().includes(term))
  );
  if (hasTransactionalEntity && entities.length > 2) {
    sections.push(buildHistorySection(entities, config));
  }
  
  // Build the intent
  const intent: DashboardIntent = {
    sections: sortSections(sections),
    title: config.todayTitle?.replace('Today at ', '').replace("Today's ", '') || 'Dashboard',
    refreshInterval: 60, // Default: refresh every 60 seconds
  };
  
  // Validate and return
  return validateDashboardIntent(intent);
}

/**
 * Get the section configuration for an industry.
 */
export function getIndustrySectionConfig(industryId: string): IndustrySectionConfig {
  return INDUSTRY_SECTION_CONFIGS[industryId] || INDUSTRY_SECTION_CONFIGS.default;
}

/**
 * Extend or override section configuration for an industry.
 */
export function extendIndustrySectionConfig(
  industryId: string,
  overrides: Partial<IndustrySectionConfig>
): void {
  const existing = INDUSTRY_SECTION_CONFIGS[industryId] || INDUSTRY_SECTION_CONFIGS.default;
  INDUSTRY_SECTION_CONFIGS[industryId] = {
    ...existing,
    ...overrides,
    actionLabels: { ...existing.actionLabels, ...overrides.actionLabels },
    metricLabels: { ...existing.metricLabels, ...overrides.metricLabels },
  };
}
