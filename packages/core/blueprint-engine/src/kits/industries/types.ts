import type { FieldType } from '../../types.js';

export type IndustryKitId =
  | 'plumber'
  | 'electrician'
  | 'contractor'
  | 'cleaning'
  | 'commercial-cleaning'
  | 'bakery'
  | 'restaurant'
  | 'salon'
  | 'real-estate'
  | 'property-management'
  | 'home-organizer'
  | 'fitness-coach'
  | 'gym'
  | 'tutor'
  | 'photographer'
  | 'ecommerce'
  | 'mechanic'
  | 'handyman'
  | 'roofing'
  | 'hvac'
  | 'landscaping'
  | 'medical'
  | 'home-health'
  | 'general_business';

export interface IndustryFieldSpec {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  enumOptions?: Array<{
    value: string;
    label: string;
    color?: string;
  }>;
  displayOptions?: {
    hidden?: boolean;
    readonly?: boolean;
    placeholder?: string;
    helpText?: string;
  };
  reference?: {
    targetEntity: string;
    displayField: string;
  };
}

/** Entity relationship definition */
export interface EntityRelationship {
  type: 'belongsTo' | 'hasMany' | 'hasOne';
  target: string;
  foreignKey: string;
  optional?: boolean;
  cascadeDelete?: boolean;
}

export interface IndustryEntitySpec {
  id: string;
  name: string;
  pluralName: string;
  fields: IndustryFieldSpec[];
  /** Entity relationships (Phase 13) */
  relationships?: EntityRelationship[];
}

/** Feature bundle configuration for a kit */
export interface FeatureBundle {
  /** Core features always included */
  core: string[];
  /** Recommended features (suggested during discovery) */
  recommended: string[];
  /** Optional features (available but not suggested) */
  optional: string[];
}

/** Suggested integration for a kit */
export interface SuggestedIntegration {
  id: string;
  name: string;
  purpose: string;
}

/** Terminology configuration for consistent naming */
export interface TerminologyConfig {
  primary: string;
  plural: string;
  action: {
    add: string;
    edit: string;
    delete: string;
    view: string;
  };
  empty: string;
  labels: {
    list: string;
    details: string;
    new: string;
  };
}

/** Complexity question for discovery flow */
export interface ComplexityQuestion {
  question: string;
  options: Array<{
    label: string;
    complexity: 'simple' | 'medium' | 'advanced';
  }>;
}

/** Workflow template for automation */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  action: string;
  enabled?: boolean;
}

/** Computed/calculated field definition */
export interface ComputedField {
  id: string;
  name: string;
  formula: string;
  type: 'number' | 'currency' | 'percentage' | 'boolean' | 'date';
}

/** Status transition definition */
export interface StatusTransition {
  from: string | string[];
  to: string;
  action?: string;
  trigger?: 'manual' | 'auto';
  condition?: string;
}

/** Status workflow state machine */
export interface StatusWorkflow {
  entity: string;
  field: string;
  states: string[];
  transitions: StatusTransition[];
}

/** Dashboard KPI widget */
export interface DashboardKPI {
  label: string;
  metric: string;
  icon?: string;
  format?: 'number' | 'currency' | 'percentage';
}

/** Dashboard chart widget */
export interface DashboardChart {
  type: 'bar' | 'line' | 'pie' | 'donut';
  title: string;
  dataQuery: string;
}

/** Dashboard list widget */
export interface DashboardList {
  title: string;
  query: string;
  limit?: number;
}

/** Dashboard template configuration */
export interface DashboardTemplate {
  kpis: DashboardKPI[];
  charts?: DashboardChart[];
  lists?: DashboardList[];
}

/** Business rule for validation and constraints */
export interface BusinessRule {
  id: string;
  entity: string;
  action: 'create' | 'update' | 'delete';
  field?: string;
  condition: string;
  message: string;
  severity?: 'error' | 'warning';
}

export interface IndustryKit {
  id: IndustryKitId;
  name: string;
  professions: string[];
  keywords: string[];
  dashboardType: 'operations' | 'sales' | 'service' | 'health';
  complexity: 'low' | 'medium' | 'high';
  uiStyle: 'light' | 'neutral' | 'bold';
  requiredModules: string[];
  optionalModules: string[];
  entities: IndustryEntitySpec[];
  pageTypes: string[];
  workflows: string[];
  automationRules: string[];
  metrics: string[];
  
  // Extended configuration (optional)
  featureBundle?: FeatureBundle;
  suggestedIntegrations?: SuggestedIntegration[];
  terminology?: Record<string, TerminologyConfig>;
  
  // Phase 11: Workflow templates
  workflowTemplates?: WorkflowTemplate[];
  
  // Phase 14: Computed fields
  computedFields?: ComputedField[];
  
  // Phase 15: Status workflows
  statusWorkflows?: StatusWorkflow[];
  
  // Phase 16: Dashboard templates
  dashboardTemplate?: DashboardTemplate;
  
  // Phase 17: Business rules
  businessRules?: BusinessRule[];
  
  // AI Discovery Intelligence (Certainty Ledger)
  /** Domain-specific AI prompt text for discovery */
  discoveryPromptFragment?: string;
  /** What can be safely assumed without asking for this industry */
  safeAssumptions?: string[];
  /** Signals that should trigger clarification questions */
  ambiguityTriggers?: string[];
}
