/**
 * Visual Blocks Types
 * Defines the structure for visual blocks, slots, and related interfaces
 */

// ============================================================
// SUPPORTING TYPES
// ============================================================

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  route: string;
  badge?: string | number;
  children?: NavItem[];
}

export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  icon?: string;
  color?: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string | Date;
  icon?: string;
  type?: 'create' | 'update' | 'delete' | 'comment' | 'status_change' | 'other';
  actor?: {
    name: string;
    avatar?: string;
  };
  entityType?: string;
  entityId?: string;
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  title: string;
  dataSource: string;
  xField?: string;
  yField?: string;
  groupBy?: string;
}

export interface FieldDef {
  id: string;
  name: string;
  type: string;
  required?: boolean;
}

// ============================================================
// BLOCK SLOTS
// ============================================================

export interface BlockSlots {
  // Navigation slots
  neo_app_name?: string;
  neo_blueprint_navigation?: NavItem[];
  neo_user_info?: {
    name: string;
    avatar?: string;
    email?: string;
  };
  neo_workspace_list?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;

  // Content slots for dynamic lists
  dynamic_list_title?: string;
  dynamic_list_items?: unknown[];
  dynamic_list_columns?: string[];
  dynamic_entity_name?: string;
  dynamic_entity_fields?: FieldDef[];

  // Dashboard slots
  dashboard_stats?: StatCard[];
  dashboard_charts?: ChartConfig[];
  dashboard_widgets?: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
  }>;

  // Activity/Recent items
  recent_activity_title?: string;
  recent_activity_items?: ActivityItem[];

  // Quick actions
  quick_actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    action: string;
  }>;

  // Search configuration
  search_config?: {
    placeholder?: string;
    fields?: string[];
    enabled?: boolean;
  };

  // Filter configuration
  filter_config?: Array<{
    field: string;
    type: 'select' | 'date' | 'range' | 'text';
    options?: Array<{ value: string; label: string }>;
  }>;
}

// ============================================================
// VISUAL BLOCK DEFINITION
// ============================================================

export type BlockCategory = 'shell' | 'page' | 'widget';
export type DashboardType = 'operations' | 'sales' | 'service' | 'health';

export interface BlockTriggers {
  /** Industries this block is suited for (* for all) */
  industries?: string[];
  /** Features that trigger this block */
  features?: string[];
  /** Page types this block is suited for */
  pageTypes?: string[];
  /** Dashboard type affinity */
  dashboardType?: DashboardType;
}

export interface VisualBlock {
  /** Unique block identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Block category */
  category: BlockCategory;
  /** Conditions that trigger this block selection */
  triggers: BlockTriggers;
  /** Slots required for this block to function */
  requiredSlots: (keyof BlockSlots)[];
  /** Optional slots that enhance the block */
  optionalSlots: (keyof BlockSlots)[];
  /** Description of what this block provides */
  description?: string;
  /** Preview image URL */
  previewImage?: string;
}

// ============================================================
// BLOCK SELECTION RESULT
// ============================================================

export interface BlockSelection {
  /** Selected shell block */
  shell: VisualBlock;
  /** Selected page blocks by page type */
  pageBlocks: Map<string, VisualBlock>;
  /** Selected widget blocks */
  widgets: VisualBlock[];
  /** Populated slots data */
  slots: BlockSlots;
}

// ============================================================
// CARD ACTION TYPES
// ============================================================

export interface CardAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: () => void;
  href?: string;
}

export type CardActionType = 
  | 'view' 
  | 'edit' 
  | 'delete' 
  | 'duplicate' 
  | 'archive'
  | 'checkIn'
  | 'message'
  | 'call'
  | 'email'
  | 'schedule'
  | 'book'
  | 'viewHistory'
  | 'viewPreferences';

// ============================================================
// ENTITY TYPE HELPERS
// ============================================================

export const PERSON_ENTITY_KEYWORDS = [
  'customer',
  'client',
  'member',
  'patient',
  'contact',
  'user',
  'employee',
  'staff',
  'student',
  'tenant',
  'guest',
  'visitor',
  'lead',
  'prospect',
];

export const ITEM_ENTITY_KEYWORDS = [
  'product',
  'item',
  'order',
  'service',
  'appointment',
  'booking',
  'invoice',
  'payment',
  'class',
  'equipment',
  'property',
  'listing',
  'task',
  'project',
];

/**
 * Check if an entity name represents a person-type entity
 */
export function isPersonEntity(entityName: string): boolean {
  const nameLower = entityName.toLowerCase();
  return PERSON_ENTITY_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

/**
 * Check if an entity name represents an item-type entity
 */
export function isItemEntity(entityName: string): boolean {
  const nameLower = entityName.toLowerCase();
  return ITEM_ENTITY_KEYWORDS.some(keyword => nameLower.includes(keyword));
}

/**
 * Determine the card type for an entity
 */
export function getCardTypeForEntity(entityName: string): 'personCard' | 'itemCard' | 'card' {
  if (isPersonEntity(entityName)) return 'personCard';
  if (isItemEntity(entityName)) return 'itemCard';
  return 'card';
}
