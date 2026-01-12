/**
 * Intelligence Layer Types
 * 
 * Type definitions for the NEO natural language understanding system.
 */

// ============================================================
// INPUT TYPES
// ============================================================

/**
 * Voice input from the user
 */
export interface VoiceInput {
  /** The transcribed text from speech recognition */
  text: string;
  /** Confidence score from speech recognition (0-1) */
  speechConfidence?: number;
  /** Language code (e.g., 'en-US') */
  language?: string;
  /** Previous context (for multi-turn conversations) */
  conversationHistory?: ConversationTurn[];
  /** Any existing app context for revisions */
  appContext?: AppContext;
}

/**
 * A turn in a conversation
 */
export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Context of an existing app (for revisions)
 */
export interface AppContext {
  appId: string;
  appName: string;
  pages: Array<{ id: string; name: string; type: string }>;
  entities: Array<{ id: string; name: string; fields: string[] }>;
  workflows: Array<{ id: string; name: string }>;
  currentPageId?: string;
}

// ============================================================
// NLP OUTPUT TYPES
// ============================================================

/**
 * Parsed natural language output
 */
export interface ParsedInput {
  /** Original input text */
  original: string;
  /** Cleaned/normalized text */
  normalized: string;
  /** Detected intent type */
  intent: IntentType;
  /** Confidence in the parsing (0-1) */
  confidence: number;
  /** Tokenized words */
  tokens: Token[];
  /** Detected action verbs */
  actions: string[];
  /** Detected nouns (potential entities) */
  nouns: string[];
  /** Detected adjectives (for styling) */
  adjectives: string[];
  /** Key phrases extracted */
  phrases: string[];
  /** Semantic intents detected */
  intents: SemanticIntent[];
  /** Named entities found */
  namedEntities: NamedEntity[];
  /** Modifiers and qualifiers */
  modifiers: Modifier[];
}

/**
 * Token from NLP parsing
 */
export interface Token {
  text: string;
  lemma: string;
  pos: PartOfSpeech;
  index: number;
  importance: number;
}

/**
 * Part of speech
 */
export type PartOfSpeech = 
  | 'noun' 
  | 'verb' 
  | 'adjective' 
  | 'adverb' 
  | 'preposition' 
  | 'conjunction' 
  | 'determiner' 
  | 'pronoun'
  | 'number'
  | 'punctuation'
  | 'unknown';

/**
 * Primary intent type
 */
export type IntentType =
  | 'create_app'
  | 'modify_app'
  | 'add_feature'
  | 'remove_feature'
  | 'change_design'
  | 'add_page'
  | 'add_entity'
  | 'add_workflow'
  | 'query'
  | 'help'
  | 'unknown';

/**
 * Semantic intent (what the user conceptually wants)
 */
export type SemanticIntent =
  | 'tracking'           // Track things over time
  | 'scheduling'         // Schedule appointments/events
  | 'managing'          // Manage people/resources
  | 'organizing'        // Organize information
  | 'communicating'     // Send messages/notifications
  | 'billing'           // Handle money/invoices
  | 'reporting'         // Generate reports
  | 'collaborating'     // Work with others
  | 'automating'        // Automate tasks
  | 'monitoring';       // Watch/observe metrics

/**
 * Named entity extracted from text
 */
export interface NamedEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'time' | 'money' | 'quantity' | 'custom';
  start: number;
  end: number;
  confidence: number;
}

/**
 * Modifier/qualifier extracted
 */
export interface Modifier {
  text: string;
  type: 'quantity' | 'frequency' | 'priority' | 'status' | 'time' | 'style' | 'size';
  target?: string;
}

// ============================================================
// INDUSTRY MAPPING TYPES
// ============================================================

/**
 * Industry mapping result
 */
export interface IndustryMapping {
  /** Industry ID */
  id: IndustryId;
  /** Display name */
  name: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected profession within industry */
  profession?: ProfessionMapping;
  /** Business type/size */
  businessType: BusinessType;
  /** Alternative industry matches */
  alternatives: Array<{ id: IndustryId; confidence: number }>;
}

/**
 * Profession mapping
 */
export interface ProfessionMapping {
  id: string;
  name: string;
  confidence: number;
  specializations: string[];
}

/**
 * Industry identifiers
 */
export type IndustryId =
  | 'services'           // General services
  | 'trades'             // Plumbers, electricians, HVAC
  | 'healthcare'         // Medical, dental, wellness
  | 'retail'             // Shops, stores
  | 'hospitality'        // Restaurants, hotels
  | 'professional'       // Legal, accounting, consulting
  | 'creative'           // Design, art, media
  | 'education'          // Schools, tutoring
  | 'fitness'            // Gyms, trainers
  | 'real_estate'        // Property management
  | 'construction'       // Contractors, builders
  | 'technology'         // Software, IT services
  | 'personal'           // Personal productivity
  | 'home'               // Home management
  | 'nonprofit';         // Charities, organizations

/**
 * Business type/size
 */
export type BusinessType = 
  | 'solo'       // One-person operation
  | 'small_team' // 2-10 people
  | 'team'       // 10-50 people
  | 'company'    // 50+ people
  | 'enterprise' // Large organization
  | 'personal';  // Personal use

// ============================================================
// FEATURE DETECTION TYPES
// ============================================================

/**
 * Detected feature
 */
export interface DetectedFeature {
  id: FeatureId;
  name: string;
  confidence: number;
  priority: 'essential' | 'important' | 'nice_to_have';
  reasoning: string;
  dependencies?: FeatureId[];
  suggestedImplementation?: string;
}

/**
 * Feature identifiers
 */
export type FeatureId =
  // Data Management
  | 'crud'               // Basic create/read/update/delete
  | 'search'             // Search functionality
  | 'filtering'          // Filter data
  | 'sorting'            // Sort data
  | 'bulk_actions'       // Bulk operations
  
  // Scheduling
  | 'calendar'           // Calendar view
  | 'appointments'       // Appointment booking
  | 'scheduling'         // General scheduling
  | 'reminders'          // Reminder notifications
  | 'recurring_events'   // Recurring schedules
  
  // Communication
  | 'messaging'          // In-app messaging
  | 'notifications'      // Push/email notifications
  | 'sms'                // SMS integration
  | 'email'              // Email integration
  
  // Billing & Payments
  | 'invoicing'          // Create invoices
  | 'payments'           // Accept payments
  | 'quotes'             // Create quotes/estimates
  | 'subscriptions'      // Subscription billing
  
  // Documents
  | 'documents'          // Document storage
  | 'file_upload'        // File uploads
  | 'signatures'         // E-signatures
  | 'templates'          // Document templates
  
  // Team & Collaboration
  | 'user_management'    // Multi-user support
  | 'roles'              // Role-based access
  | 'assignments'        // Task assignments
  | 'comments'           // Commenting system
  
  // Reporting
  | 'dashboard'          // Dashboard view
  | 'reports'            // Generate reports
  | 'analytics'          // Analytics tracking
  | 'exports'            // Export data
  
  // Workflow
  | 'workflow'           // Workflow automation
  | 'approvals'          // Approval workflows
  | 'status_tracking'    // Status progression
  | 'pipelines'          // Pipeline/kanban view
  
  // Industry-Specific
  | 'inventory'          // Inventory tracking
  | 'job_tracking'       // Job/project tracking
  | 'client_portal'      // Client-facing portal
  | 'booking_widget'     // Public booking widget
  
  // Additional features
  | 'memberships'        // Membership management
  | 'progress_tracking'  // Progress tracking
  | 'maintenance_contracts'; // Maintenance contracts

// ============================================================
// ENTITY INFERENCE TYPES
// ============================================================

/**
 * Inferred entity
 */
export interface InferredEntity {
  id: string;
  name: string;
  pluralName: string;
  confidence: number;
  fields: InferredField[];
  relationships: InferredRelationship[];
  behaviors: EntityBehavior[];
  suggestedIcon?: string;
}

/**
 * Inferred field for an entity
 */
export interface InferredField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  defaultValue?: unknown;
  validation?: FieldValidation;
  reasoning: string;
}

/**
 * Field types
 */
export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'percentage'
  | 'enum'
  | 'reference'
  | 'image'
  | 'file'
  | 'address'
  | 'geolocation';

/**
 * Field validation rules
 */
export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

/**
 * Inferred relationship between entities
 */
export interface InferredRelationship {
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  targetEntity: string;
  fieldName: string;
  required: boolean;
  cascadeDelete: boolean;
}

/**
 * Entity behavior patterns
 */
export type EntityBehavior =
  | 'trackable'      // Has status progression
  | 'assignable'     // Can be assigned to users
  | 'schedulable'    // Has date/time component
  | 'billable'       // Has monetary value
  | 'archivable'     // Can be archived
  | 'commentable'    // Supports comments
  | 'attachable';    // Supports file attachments

// ============================================================
// WORKFLOW INFERENCE TYPES
// ============================================================

/**
 * Inferred workflow
 */
export interface InferredWorkflow {
  id: string;
  name: string;
  description: string;
  confidence: number;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  conditions?: WorkflowCondition[];
}

/**
 * Workflow trigger
 */
export interface WorkflowTrigger {
  type: 'form_submit' | 'button_click' | 'record_create' | 'record_update' | 'record_delete' | 'schedule' | 'webhook';
  entityId?: string;
  componentId?: string;
  schedule?: string; // cron expression
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  type: 'create' | 'update' | 'delete' | 'notify' | 'email' | 'navigate' | 'condition' | 'wait' | 'webhook';
  config: Record<string, unknown>;
  nextStep?: string;
}

/**
 * Workflow condition
 */
export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: unknown;
  thenStep: string;
  elseStep?: string;
}

// ============================================================
// UI LAYOUT TYPES
// ============================================================

/**
 * Selected UI layout
 */
export interface SelectedLayout {
  primaryLayout: LayoutType;
  secondaryLayouts: LayoutType[];
  density: 'compact' | 'comfortable' | 'spacious';
  theme: ThemePreference;
  navigation: NavigationStyle;
  confidence: number;
  reasoning: string;
}

/**
 * Layout types
 */
export type LayoutType =
  | 'list'           // Simple list view
  | 'table'          // Data table
  | 'cards'          // Card grid
  | 'kanban'         // Kanban board
  | 'calendar'       // Calendar view
  | 'timeline'       // Timeline view
  | 'dashboard'      // Dashboard with widgets
  | 'form'           // Form-centric
  | 'split'          // Split view (list + detail)
  | 'master_detail'  // Master-detail pattern
  | 'wizard';        // Step-by-step wizard

/**
 * Theme preference
 */
export interface ThemePreference {
  mode: 'light' | 'dark' | 'auto';
  style: 'modern' | 'minimal' | 'bold' | 'professional' | 'playful';
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Navigation style
 */
export interface NavigationStyle {
  type: 'sidebar' | 'topbar' | 'bottom_tabs' | 'hamburger';
  position: 'left' | 'right' | 'top' | 'bottom';
  collapsible: boolean;
}

// ============================================================
// BEHAVIOR BUNDLE TYPES
// ============================================================

/**
 * Matched behavior bundle
 */
export interface MatchedBehavior {
  id: string;
  name: string;
  confidence: number;
  features: FeatureId[];
  entities: string[];
  workflows: string[];
  theme: ThemePreference;
  reasoning: string;
}

// ============================================================
// REVISION TYPES
// ============================================================

/**
 * Revision intent types
 */
export type RevisionIntent =
  | 'style_change'      // "make it more modern"
  | 'add_feature'       // "add invoicing"
  | 'remove_feature'    // "remove the calendar"
  | 'modify_entity'     // "add a status field to jobs"
  | 'modify_page'       // "rename the dashboard"
  | 'modify_workflow'   // "when a job is completed, send an email"
  | 'add_page'          // "add a reports page"
  | 'remove_page'       // "remove the settings page"
  | 'reorganize'        // "move invoicing to the main menu"
  | 'modify_app';       // General app modification

/**
 * Result of processing a revision request
 */
export interface RevisionResult {
  intent: RevisionIntent;
  confidence: number;
  changes: RevisionChange[];
  affectedComponents: string[];
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  rollbackPossible: boolean;
}

/**
 * A single revision change
 */
export interface RevisionChange {
  type: 'add' | 'modify' | 'remove' | 'reorder';
  target: 'entity' | 'field' | 'page' | 'component' | 'workflow' | 'style';
  targetId: string;
  before?: unknown;
  after?: unknown;
  description: string;
}

// ============================================================
// INTELLIGENCE RESULT
// ============================================================

/**
 * Complete result from the intelligence layer
 */
export interface IntelligenceResult {
  parsed: ParsedInput;
  industry: IndustryMapping;
  features: DetectedFeature[];
  entities: InferredEntity[];
  workflows: InferredWorkflow[];
  layout: SelectedLayout;
  behavior: MatchedBehavior | null;
  confidence: number;
  suggestedQuestions: string[];
}
