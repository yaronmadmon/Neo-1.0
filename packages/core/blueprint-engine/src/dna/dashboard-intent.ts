/**
 * Dashboard Intent System
 * 
 * Encodes story, hierarchy, KPIs, and actions in a structured way
 * that layouts can respond to. This is about MEANING, not styling.
 * 
 * The Surface/Atmosphere system handles visual depth.
 * This system handles semantic priority and narrative flow.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Section roles define the narrative position in the dashboard story.
 * Order: Now → Work → Context
 */
export type SectionRole =
  | "today"        // What's happening right now / today
  | "in-progress"  // Active work that needs attention
  | "upcoming"     // What's coming next
  | "summary"      // Aggregate context / totals
  | "history";     // Past records / archive

/**
 * Priority determines visual weight and position within a role.
 * Layouts can use this to adjust spacing, density, and emphasis.
 */
export type SectionPriority =
  | "primary"      // Hero section - max 1-2 per dashboard
  | "secondary"    // Supporting sections
  | "tertiary";    // Contextual / background info

/**
 * Time scope for metrics and data filtering.
 * Used both for display labels and actual data filtering.
 */
export type TimeScope =
  | "now"          // Within the last hour
  | "today"        // Current calendar day
  | "this-week"    // Current ISO week
  | "this-month"   // Current calendar month
  | "all-time";    // No time filter

/**
 * Layout hints allow sections to suggest their preferred presentation
 * without dictating specific components. Layouts remain dumb but informed.
 */
export type LayoutHint =
  | "stats-row"    // KPI cards in a horizontal row
  | "card-list"    // Vertical list of action cards
  | "data-table"   // Tabular data display
  | "chart"        // Visualization (bar, line, area)
  | "activity"     // Activity feed / timeline
  | "calendar"     // Calendar/schedule view
  | "kanban";      // Status-based columns

/**
 * Emphasis level for metrics and sections.
 * Layouts interpret this as visual weight (larger text, accent border, etc.)
 */
export type EmphasisLevel = "normal" | "highlighted";

// =============================================================================
// DOMAIN METRIC
// =============================================================================

/**
 * A metric with domain-specific labeling and time awareness.
 * Replaces generic "orders.count" with "Orders Today".
 */
export interface DomainMetric {
  /** Source metric path (e.g., "orders.count", "revenue.total") */
  sourceMetric: string;
  
  /** Human-readable, domain-specific label (e.g., "Orders Today") */
  label: string;
  
  /** Time scope for filtering and display */
  timeScope: TimeScope;
  
  /** Whether to visually emphasize this metric */
  emphasize?: boolean;
  
  /** Icon identifier (optional) */
  icon?: string;
  
  /** Display format */
  format?: "number" | "currency" | "percentage" | "duration";
}

// =============================================================================
// CONTEXTUAL ACTION
// =============================================================================

/**
 * Visibility rules determine when an action should appear.
 */
export type ActionVisibilityRule =
  | "always"       // Always visible
  | "if-active"    // Only if there are active items
  | "if-pending"   // Only if there are pending items
  | "if-empty"     // Only if no items exist (e.g., "Add First Order")
  | "if-overdue";  // Only if there are overdue items

/**
 * An action that appears contextually within a dashboard section.
 * Actions are attached to entities, not global toolbars.
 */
export interface ContextualAction {
  /** Unique action identifier */
  actionId: string;
  
  /** Human-readable label (domain-specific) */
  label: string;
  
  /** Entity this action operates on */
  entity: string;
  
  /** When to show this action */
  visibilityRule: ActionVisibilityRule;
  
  /** Action variant for styling hints */
  variant?: "primary" | "secondary" | "destructive";
  
  /** Icon identifier (optional) */
  icon?: string;
}

// =============================================================================
// DASHBOARD SECTION
// =============================================================================

/**
 * A semantic section of a dashboard with role, priority, and content.
 * This is the core unit of the Dashboard Intent system.
 */
export interface DashboardSection {
  /** Unique section identifier */
  id: string;
  
  /** Narrative role in the dashboard story */
  role: SectionRole;
  
  /** Visual priority / weight */
  priority: SectionPriority;
  
  /** Section title (domain-specific) */
  title: string;
  
  /** Optional subtitle for context */
  subtitle?: string;
  
  /** Time scope for this section's data */
  timeScope?: TimeScope;
  
  /** Layout hint for preferred presentation */
  layoutHint?: LayoutHint;
  
  /** KPI metrics to display (for summary/today sections) */
  metrics?: DomainMetric[];
  
  /** Entity to list (for in-progress/upcoming sections) */
  listEntity?: string;
  
  /** Filter for list entity (e.g., "status:pending") */
  listFilter?: string;
  
  /** Contextual actions available in this section */
  actions?: ContextualAction[];
  
  /** Maximum items to show (for lists) */
  limit?: number;
}

/**
 * Complete dashboard intent - the semantic structure of a dashboard.
 */
export interface DashboardIntent {
  /** Ordered list of sections */
  sections: DashboardSection[];
  
  /** Dashboard-level title */
  title?: string;
  
  /** Dashboard-level subtitle */
  subtitle?: string;
  
  /** Refresh interval in seconds */
  refreshInterval?: number;
}

// =============================================================================
// ORDERING CONSTANTS
// =============================================================================

/**
 * Canonical ordering of section roles.
 * Enforces the "Now → Work → Context" narrative.
 */
export const ROLE_ORDER: Record<SectionRole, number> = {
  "today": 0,
  "in-progress": 1,
  "upcoming": 2,
  "summary": 3,
  "history": 4,
};

/**
 * Canonical ordering of priorities within a role.
 */
export const PRIORITY_ORDER: Record<SectionPriority, number> = {
  "primary": 0,
  "secondary": 1,
  "tertiary": 2,
};

/**
 * Roles that are allowed to have actions.
 * Summary and history sections should NOT have actions.
 */
export const ACTIONABLE_ROLES: SectionRole[] = [
  "today",
  "in-progress",
  "upcoming",
];

// =============================================================================
// TIME SCOPE HELPERS
// =============================================================================

/**
 * Human-readable labels for time scopes.
 */
export const TIME_SCOPE_LABELS: Record<TimeScope, string> = {
  "now": "Right Now",
  "today": "Today",
  "this-week": "This Week",
  "this-month": "This Month",
  "all-time": "All Time",
};

/**
 * Short labels for compact displays.
 */
export const TIME_SCOPE_SHORT_LABELS: Record<TimeScope, string> = {
  "now": "Now",
  "today": "Today",
  "this-week": "Week",
  "this-month": "Month",
  "all-time": "Total",
};

/**
 * Filter functions for each time scope.
 * Use these to filter data arrays based on a date field.
 */
export const TIME_SCOPE_FILTERS: Record<TimeScope, (date: Date) => boolean> = {
  "now": (date: Date) => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return date >= hourAgo && date <= now;
  },
  
  "today": (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  },
  
  "this-week": (date: Date) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return date >= startOfWeek && date < endOfWeek;
  },
  
  "this-month": (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  },
  
  "all-time": () => true,
};

/**
 * Filter an array of items by time scope.
 * @param items Array of items with a date field
 * @param timeScope Time scope to filter by
 * @param dateField Name of the date field (default: "createdAt")
 */
export function filterByTimeScope<T extends Record<string, unknown>>(
  items: T[],
  timeScope: TimeScope,
  dateField: string = "createdAt"
): T[] {
  const filter = TIME_SCOPE_FILTERS[timeScope];
  return items.filter((item) => {
    const dateValue = item[dateField];
    if (!dateValue) return timeScope === "all-time";
    
    const date = dateValue instanceof Date 
      ? dateValue 
      : new Date(dateValue as string | number);
    
    return !isNaN(date.getTime()) && filter(date);
  });
}

// =============================================================================
// ACTION VISIBILITY HELPERS
// =============================================================================

/**
 * Common status values that indicate "active" state.
 */
const ACTIVE_STATUSES = ["active", "in_progress", "in-progress", "started", "running", "open"];

/**
 * Common status values that indicate "pending" state.
 */
const PENDING_STATUSES = ["pending", "waiting", "queued", "scheduled", "new", "draft"];

/**
 * Common status values that indicate "overdue" state.
 */
const OVERDUE_STATUSES = ["overdue", "late", "expired", "past_due", "past-due"];

/**
 * Check if an item has a status matching the given status list.
 */
function hasStatus(item: Record<string, unknown>, statusList: string[]): boolean {
  const status = item.status || item.state;
  if (typeof status !== "string") return false;
  return statusList.includes(status.toLowerCase());
}

/**
 * Evaluate whether an action should be visible based on entity data.
 * @param action The contextual action to evaluate
 * @param entityData Array of entity records
 * @returns Whether the action should be displayed
 */
export function shouldShowAction(
  action: ContextualAction,
  entityData: Record<string, unknown>[]
): boolean {
  switch (action.visibilityRule) {
    case "always":
      return true;
      
    case "if-active":
      return entityData.some((item) => hasStatus(item, ACTIVE_STATUSES));
      
    case "if-pending":
      return entityData.some((item) => hasStatus(item, PENDING_STATUSES));
      
    case "if-overdue":
      return entityData.some((item) => hasStatus(item, OVERDUE_STATUSES));
      
    case "if-empty":
      return entityData.length === 0;
      
    default:
      return true;
  }
}

/**
 * Filter actions based on entity data visibility rules.
 */
export function filterVisibleActions(
  actions: ContextualAction[],
  entityData: Record<string, unknown>[]
): ContextualAction[] {
  return actions.filter((action) => shouldShowAction(action, entityData));
}

// =============================================================================
// SECTION VALIDATION
// =============================================================================

/**
 * Validate and normalize a dashboard section.
 * Enforces rules like "history sections cannot have actions".
 */
export function validateSection(section: DashboardSection): DashboardSection {
  const normalized = { ...section };
  
  // Rule: history and summary sections cannot have actions
  if (section.role === "history" || section.role === "summary") {
    normalized.actions = undefined;
  }
  
  // Rule: if role is not actionable, remove actions
  if (!ACTIONABLE_ROLES.includes(section.role) && normalized.actions) {
    normalized.actions = undefined;
  }
  
  return normalized;
}

/**
 * Validate an entire dashboard intent structure.
 * Enforces ordering and constraint rules.
 */
export function validateDashboardIntent(intent: DashboardIntent): DashboardIntent {
  const validatedSections = intent.sections.map(validateSection);
  
  // Rule: "today" section should be first if present
  const todaySection = validatedSections.find((s) => s.role === "today");
  const otherSections = validatedSections.filter((s) => s.role !== "today");
  
  // Rule: "summary" section should never be first
  if (otherSections[0]?.role === "summary" && !todaySection) {
    // Find a non-summary section to swap with
    const nonSummaryIndex = otherSections.findIndex((s) => s.role !== "summary");
    if (nonSummaryIndex > 0) {
      const temp = otherSections[0];
      otherSections[0] = otherSections[nonSummaryIndex];
      otherSections[nonSummaryIndex] = temp;
    }
  }
  
  // Rule: max 2 primary sections
  let primaryCount = 0;
  const constrainedSections = (todaySection ? [todaySection, ...otherSections] : otherSections)
    .map((section) => {
      if (section.priority === "primary") {
        primaryCount++;
        if (primaryCount > 2) {
          return { ...section, priority: "secondary" as SectionPriority };
        }
      }
      return section;
    });
  
  return {
    ...intent,
    sections: constrainedSections,
  };
}

// =============================================================================
// SORTING HELPERS
// =============================================================================

/**
 * Sort dashboard sections by role and priority.
 * Enforces the canonical ordering: role first, then priority within role.
 */
export function sortSections(sections: DashboardSection[]): DashboardSection[] {
  return [...sections].sort((a, b) => {
    // First sort by role
    const roleA = ROLE_ORDER[a.role] ?? 99;
    const roleB = ROLE_ORDER[b.role] ?? 99;
    if (roleA !== roleB) return roleA - roleB;
    
    // Then by priority within the same role
    const prioA = PRIORITY_ORDER[a.priority] ?? 99;
    const prioB = PRIORITY_ORDER[b.priority] ?? 99;
    return prioA - prioB;
  });
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Format a metric label with its time scope.
 * @param metric The domain metric
 * @param includeTimeScope Whether to append the time scope label
 */
export function formatMetricLabel(
  metric: DomainMetric,
  includeTimeScope: boolean = false
): string {
  if (!includeTimeScope || metric.timeScope === "all-time") {
    return metric.label;
  }
  return `${metric.label} (${TIME_SCOPE_SHORT_LABELS[metric.timeScope]})`;
}

/**
 * Check if a section can have actions based on its role.
 */
export function canHaveActions(role: SectionRole): boolean {
  return ACTIONABLE_ROLES.includes(role);
}

/**
 * Get the appropriate layout hint for a section based on its content.
 */
export function inferLayoutHint(section: DashboardSection): LayoutHint {
  // If explicitly set, use it
  if (section.layoutHint) return section.layoutHint;
  
  // Infer from content
  if (section.metrics && section.metrics.length > 0) {
    return "stats-row";
  }
  
  if (section.listEntity) {
    if (section.role === "history") return "data-table";
    return "card-list";
  }
  
  return "card-list";
}
