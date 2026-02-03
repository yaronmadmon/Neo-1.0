/**
 * Action Mapper
 * Maps industry and entity types to appropriate card actions
 * Provides industry-aware action selection for PersonCard and ItemCard
 */

// ============================================================
// TYPES
// ============================================================

export interface CardAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
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
  | 'viewPreferences'
  | 'invoice'
  | 'addNote';

// ============================================================
// CONSTANTS
// ============================================================

const PERSON_ENTITY_KEYWORDS = [
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

const ITEM_ENTITY_KEYWORDS = [
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

// Action definitions with metadata
const ACTION_DEFINITIONS: Record<CardActionType, CardAction> = {
  view: { id: 'view', label: 'View', icon: '👁️', variant: 'secondary' },
  edit: { id: 'edit', label: 'Edit', icon: '✏️', variant: 'secondary' },
  delete: { id: 'delete', label: 'Delete', icon: '🗑️', variant: 'danger' },
  duplicate: { id: 'duplicate', label: 'Duplicate', icon: '📋', variant: 'ghost' },
  archive: { id: 'archive', label: 'Archive', icon: '📦', variant: 'ghost' },
  checkIn: { id: 'checkIn', label: 'Check In', icon: '✅', variant: 'primary' },
  message: { id: 'message', label: 'Message', icon: '💬', variant: 'secondary' },
  call: { id: 'call', label: 'Call', icon: '📞', variant: 'secondary' },
  email: { id: 'email', label: 'Email', icon: '✉️', variant: 'secondary' },
  schedule: { id: 'schedule', label: 'Schedule', icon: '📅', variant: 'primary' },
  book: { id: 'book', label: 'Book', icon: '📅', variant: 'primary' },
  viewHistory: { id: 'viewHistory', label: 'History', icon: '📜', variant: 'ghost' },
  viewPreferences: { id: 'viewPreferences', label: 'Preferences', icon: '⚙️', variant: 'ghost' },
  invoice: { id: 'invoice', label: 'Invoice', icon: '📄', variant: 'secondary' },
  addNote: { id: 'addNote', label: 'Add Note', icon: '📝', variant: 'ghost' },
};

// Industry-specific action mappings for person entities
const INDUSTRY_PERSON_ACTIONS: Record<string, CardActionType[]> = {
  // Fitness & Health
  'gym': ['view', 'edit', 'checkIn', 'message', 'viewHistory'],
  'fitness-coach': ['view', 'edit', 'schedule', 'message', 'viewHistory'],
  'medical': ['view', 'edit', 'schedule', 'viewHistory', 'addNote'],
  'home-health': ['view', 'edit', 'schedule', 'viewHistory', 'call'],
  
  // Beauty & Personal Services
  'salon': ['view', 'edit', 'book', 'viewPreferences', 'message'],
  
  // Education
  'tutor': ['view', 'edit', 'schedule', 'message', 'viewHistory'],
  
  // Real Estate & Property
  'real-estate': ['view', 'edit', 'call', 'email', 'schedule'],
  'property-management': ['view', 'edit', 'call', 'email', 'invoice'],
  
  // Service Industries
  'plumber': ['view', 'edit', 'call', 'schedule', 'invoice'],
  'electrician': ['view', 'edit', 'call', 'schedule', 'invoice'],
  'contractor': ['view', 'edit', 'call', 'schedule', 'invoice'],
  'cleaning': ['view', 'edit', 'call', 'schedule', 'invoice'],
  'handyman': ['view', 'edit', 'call', 'schedule', 'invoice'],
  'landscaping': ['view', 'edit', 'call', 'schedule', 'invoice'],
  'hvac': ['view', 'edit', 'call', 'schedule', 'invoice'],
  'roofing': ['view', 'edit', 'call', 'schedule', 'invoice'],
  
  // Retail & Food
  'bakery': ['view', 'edit', 'call', 'email', 'viewPreferences'],
  'restaurant': ['view', 'edit', 'book', 'viewPreferences'],
  'ecommerce': ['view', 'edit', 'email', 'viewHistory'],
  
  // Creative
  'photographer': ['view', 'edit', 'book', 'email', 'viewHistory'],
};

// Industry-specific action mappings for item entities
const INDUSTRY_ITEM_ACTIONS: Record<string, CardActionType[]> = {
  // Fitness & Health
  'gym': ['view', 'edit', 'duplicate', 'archive'],
  'fitness-coach': ['view', 'edit', 'duplicate', 'archive'],
  'medical': ['view', 'edit', 'archive'],
  
  // Service Industries
  'plumber': ['view', 'edit', 'invoice', 'duplicate'],
  'electrician': ['view', 'edit', 'invoice', 'duplicate'],
  'contractor': ['view', 'edit', 'invoice', 'duplicate'],
  
  // Retail & Food
  'bakery': ['view', 'edit', 'duplicate', 'archive'],
  'restaurant': ['view', 'edit', 'duplicate'],
  'ecommerce': ['view', 'edit', 'duplicate', 'archive'],
  
  // Real Estate
  'real-estate': ['view', 'edit', 'duplicate', 'archive'],
  'property-management': ['view', 'edit', 'invoice', 'archive'],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

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

// ============================================================
// MAIN FUNCTIONS
// ============================================================

/**
 * Get actions for an entity based on industry and entity type
 */
export function getEntityActions(industryId: string, entityName: string): CardAction[] {
  const actionTypes = getEntityActionTypes(industryId, entityName);
  return actionTypes.map(type => ACTION_DEFINITIONS[type]).filter(Boolean);
}

/**
 * Get action types for an entity based on industry and entity type
 */
export function getEntityActionTypes(industryId: string, entityName: string): CardActionType[] {
  const base: CardActionType[] = ['view', 'edit'];
  
  if (isPersonEntity(entityName)) {
    // Check for industry-specific person actions
    const industryActions = INDUSTRY_PERSON_ACTIONS[industryId];
    if (industryActions) {
      return industryActions;
    }
    
    // Default person actions
    return [...base, 'call', 'email'];
  }
  
  if (isItemEntity(entityName)) {
    // Check for industry-specific item actions
    const industryActions = INDUSTRY_ITEM_ACTIONS[industryId];
    if (industryActions) {
      return industryActions;
    }
    
    // Default item actions
    return [...base, 'duplicate', 'archive'];
  }
  
  // Generic entity - just view/edit
  return base;
}

/**
 * Get the primary action for an entity
 */
export function getPrimaryAction(industryId: string, entityName: string): CardAction {
  const actions = getEntityActions(industryId, entityName);
  
  // Find the first primary-variant action, or fall back to 'view'
  const primaryAction = actions.find(a => a.variant === 'primary');
  return primaryAction || ACTION_DEFINITIONS.view;
}

/**
 * Get secondary actions for an entity (all except primary)
 */
export function getSecondaryActions(industryId: string, entityName: string): CardAction[] {
  const allActions = getEntityActions(industryId, entityName);
  const primaryAction = getPrimaryAction(industryId, entityName);
  
  return allActions.filter(a => a.id !== primaryAction.id);
}

/**
 * Get an action definition by type
 */
export function getActionDefinition(actionType: CardActionType): CardAction {
  return ACTION_DEFINITIONS[actionType];
}

/**
 * Create a custom action
 */
export function createAction(
  id: string,
  label: string,
  options: Partial<Omit<CardAction, 'id' | 'label'>> = {}
): CardAction {
  return {
    id,
    label,
    variant: 'secondary',
    ...options,
  };
}
