/**
 * App Configuration Types
 * 
 * This layer sits between discovery and the kit, controlling HOW the kit
 * is presented without modifying the kit itself.
 * 
 * Key principle: Kits are sacred. Configuration controls presentation.
 */

import type { IndustryKitId } from '../kits/industries/types.js';

/**
 * Feature visibility levels
 * - hidden: Not shown in UI (but available if enabled later)
 * - visible: Shown in secondary locations
 * - prominent: Shown in primary navigation/dashboard
 */
export type FeatureVisibility = 'hidden' | 'visible' | 'prominent';

/**
 * Complexity level affects UI density and feature exposure
 */
export type ComplexityLevel = 'simple' | 'standard' | 'advanced';

/**
 * Primary view preference for the main workflow
 */
export type PrimaryView = 'calendar' | 'list' | 'kanban' | 'dashboard' | 'table';

/**
 * Location style for sample data generation
 */
export type LocationStyle = 'residential' | 'commercial' | 'mixed';

/**
 * Terminology mapping for a single entity
 */
export interface EntityTerminology {
  /** Singular name (e.g., "Service Call" instead of "Job") */
  singular: string;
  /** Plural name (e.g., "Service Calls") */
  plural: string;
  /** Action verbs */
  actions: {
    create: string;   // e.g., "Schedule a Service Call"
    edit: string;     // e.g., "Edit Service Call"
    delete: string;   // e.g., "Cancel Service Call"
    view: string;     // e.g., "View Service Call"
    complete: string; // e.g., "Complete Service Call"
  };
  /** Status labels for this entity type */
  statuses?: Record<string, string>;
  /** Empty state message */
  emptyMessage: string;
}

/**
 * Feature visibility configuration
 */
export interface FeatureVisibilityConfig {
  // Core modules
  scheduling: FeatureVisibility;
  invoicing: FeatureVisibility;
  quotes: FeatureVisibility;
  
  // Team features
  teamManagement: FeatureVisibility;
  staffScheduling: FeatureVisibility;
  permissions: FeatureVisibility;
  
  // Customer features
  customerPortal: FeatureVisibility;
  customerCommunication: FeatureVisibility;
  
  // Inventory/materials
  inventory: FeatureVisibility;
  
  // Extras
  gallery: FeatureVisibility;
  documents: FeatureVisibility;
  reports: FeatureVisibility;
  
  // Integrations visibility
  integrations: FeatureVisibility;
}

/**
 * Default view and UI configuration
 */
export interface ViewDefaults {
  /** Primary view type */
  primaryView: PrimaryView;
  /** Home page destination */
  homePage: 'dashboard' | 'today' | 'list' | 'calendar';
  /** Calendar start hour (7 = 7am) */
  calendarStartHour: number;
  /** Default job/appointment duration in minutes */
  defaultDuration: number;
  /** Business days (0 = Sunday, 6 = Saturday) */
  businessDays: number[];
  /** Business start hour */
  businessStartHour: number;
  /** Business end hour */
  businessEndHour: number;
}

/**
 * Sample data context for generating relevant sample data
 */
export interface SampleDataContext {
  /** Business name (from discovery or default) */
  businessName: string;
  /** Service types mentioned (e.g., ["leak repair", "water heater install"]) */
  serviceTypes: string[];
  /** Location style for addresses */
  locationStyle: LocationStyle;
  /** Region/locale for formatting */
  region: string;
  /** Include sample data on first load */
  includeSampleData: boolean;
}

/**
 * What we extracted from discovery that we can reference
 */
export interface DiscoveryContext {
  /** Original user input */
  originalInput: string;
  /** Keywords they mentioned */
  mentionedKeywords: string[];
  /** Things they explicitly requested */
  explicitRequests: string[];
  /** Things they did NOT mention (safe to hide) */
  notMentioned: string[];
  /** Inferred scale */
  inferredScale: 'solo' | 'small' | 'medium' | 'large';
  /** Confidence level from discovery */
  confidence: number;
}

/**
 * What the system assumed (for transparency)
 */
export interface ConfigurationAssumptions {
  /** List of assumptions made */
  assumptions: Array<{
    what: string;
    why: string;
    adjustPath: string;
  }>;
  /** What we're uncertain about */
  uncertainties: Array<{
    what: string;
    defaultChoice: string;
    adjustPath: string;
  }>;
}

/**
 * Complete App Configuration
 * This controls how a kit is presented without modifying the kit itself.
 */
export interface AppConfiguration {
  /** Which kit to use */
  kitId: IndustryKitId;
  
  /** Complexity level (affects UI density) */
  complexity: ComplexityLevel;
  
  /** Terminology overrides */
  terminology: Record<string, EntityTerminology>;
  
  /** Feature visibility */
  features: FeatureVisibilityConfig;
  
  /** View defaults */
  defaults: ViewDefaults;
  
  /** Sample data context */
  sampleData: SampleDataContext;
  
  /** Discovery context (what user said) */
  discoveryContext: DiscoveryContext;
  
  /** What the system assumed */
  assumptions: ConfigurationAssumptions;
  
  /** Timestamp of configuration creation */
  createdAt: string;
}

/**
 * Partial configuration for merging with defaults
 */
export type PartialAppConfiguration = Partial<Omit<AppConfiguration, 'kitId'>> & {
  kitId: IndustryKitId;
};

/**
 * Kit-specific default configuration
 */
export interface KitDefaultConfiguration {
  /** Default complexity for this industry */
  complexity: ComplexityLevel;
  
  /** Default terminology */
  terminology: Record<string, EntityTerminology>;
  
  /** Default feature visibility */
  features: Partial<FeatureVisibilityConfig>;
  
  /** Default view settings */
  defaults: Partial<ViewDefaults>;
  
  /** Sample data templates */
  sampleDataTemplates: {
    serviceTypes: string[];
    sampleNames: string[];
    sampleAddresses: string[];
    locationStyle: LocationStyle;
  };
}
