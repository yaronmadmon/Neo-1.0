/**
 * Configuration Builder
 * 
 * Takes discovery output and builds an AppConfiguration.
 * Merges kit defaults with user-specific overrides from discovery.
 */

import type { IndustryKitId } from '../kits/industries/types.js';
import type {
  AppConfiguration,
  ComplexityLevel,
  FeatureVisibilityConfig,
  ViewDefaults,
  SampleDataContext,
  DiscoveryContext,
  ConfigurationAssumptions,
} from './types.js';
import { getKitDefaults } from './kit-defaults.js';

/**
 * Input from discovery process
 */
export interface DiscoveryOutput {
  /** Detected industry/kit */
  kitId: IndustryKitId;
  /** Original user input */
  originalInput: string;
  /** Detected scale (solo, small team, etc.) */
  scale?: 'solo' | 'small' | 'medium' | 'large';
  /** Business name if mentioned */
  businessName?: string;
  /** Things they explicitly mentioned */
  mentioned?: string[];
  /** Service types they mentioned */
  serviceTypes?: string[];
  /** Confidence from discovery */
  confidence?: number;
  /** Answers to discovery questions */
  answers?: Record<string, unknown>;
}

/**
 * Default feature visibility
 */
const defaultFeatureVisibility: FeatureVisibilityConfig = {
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
 * Default view settings
 */
const defaultViewSettings: ViewDefaults = {
  primaryView: 'list',
  homePage: 'dashboard',
  calendarStartHour: 8,
  defaultDuration: 60,
  businessDays: [1, 2, 3, 4, 5],
  businessStartHour: 9,
  businessEndHour: 17,
};

/**
 * Determine complexity level from discovery
 */
function determineComplexity(discovery: DiscoveryOutput): ComplexityLevel {
  // Check scale
  if (discovery.scale === 'solo') return 'simple';
  if (discovery.scale === 'large') return 'advanced';
  if (discovery.scale === 'medium') return 'standard';
  
  // Check answers
  const teamSize = discovery.answers?.team_size || discovery.answers?.teamSize;
  if (teamSize) {
    const size = String(teamSize).toLowerCase();
    if (size.includes('just me') || size.includes('solo') || size === '1') {
      return 'simple';
    }
    if (size.includes('20+') || size.includes('large')) {
      return 'advanced';
    }
  }
  
  // Check for team-related keywords in original input
  const input = discovery.originalInput.toLowerCase();
  if (input.includes('just me') || input.includes('solo') || input.includes('freelance')) {
    return 'simple';
  }
  if (input.includes('team') || input.includes('employees') || input.includes('staff')) {
    return 'standard';
  }
  if (input.includes('company') || input.includes('multiple locations')) {
    return 'advanced';
  }
  
  // Default based on kit defaults
  return getKitDefaults(discovery.kitId).complexity;
}

/**
 * Extract mentioned features from input
 */
function extractMentionedFeatures(input: string): string[] {
  const mentioned: string[] = [];
  const lower = input.toLowerCase();
  
  if (/schedul|appointment|book|calendar/i.test(lower)) mentioned.push('scheduling');
  if (/invoice|bill|payment/i.test(lower)) mentioned.push('invoicing');
  if (/quote|estimate|proposal/i.test(lower)) mentioned.push('quotes');
  if (/team|employee|staff|worker/i.test(lower)) mentioned.push('teamManagement');
  if (/customer.*portal|online.*book|client.*access/i.test(lower)) mentioned.push('customerPortal');
  if (/inventory|stock|materials|parts|supplies/i.test(lower)) mentioned.push('inventory');
  if (/photo|gallery|image|picture/i.test(lower)) mentioned.push('gallery');
  if (/document|contract|file/i.test(lower)) mentioned.push('documents');
  if (/report|analytics|metric/i.test(lower)) mentioned.push('reports');
  
  return mentioned;
}

/**
 * Build feature visibility based on discovery
 */
function buildFeatureVisibility(
  discovery: DiscoveryOutput,
  kitDefaults: Partial<FeatureVisibilityConfig>,
  complexity: ComplexityLevel
): FeatureVisibilityConfig {
  const mentioned = discovery.mentioned || extractMentionedFeatures(discovery.originalInput);
  
  // Start with defaults
  const features: FeatureVisibilityConfig = {
    ...defaultFeatureVisibility,
    ...kitDefaults,
  };
  
  // Apply complexity-based adjustments
  if (complexity === 'simple') {
    features.teamManagement = 'hidden';
    features.staffScheduling = 'hidden';
    features.permissions = 'hidden';
  } else if (complexity === 'advanced') {
    features.teamManagement = 'visible';
    features.staffScheduling = 'visible';
    features.permissions = 'visible';
    features.reports = 'prominent';
  }
  
  // Make mentioned features prominent
  for (const feature of mentioned) {
    if (feature in features) {
      // Type-safe assignment to known features
      const featureKey = feature as keyof FeatureVisibilityConfig;
      features[featureKey] = 'prominent';
    }
  }
  
  return features;
}

/**
 * Build view defaults
 */
function buildViewDefaults(
  discovery: DiscoveryOutput,
  kitDefaults: Partial<ViewDefaults>
): ViewDefaults {
  const defaults: ViewDefaults = {
    ...defaultViewSettings,
    ...kitDefaults,
  };
  
  const input = discovery.originalInput.toLowerCase();
  
  // Detect preferred view from input
  if (/calendar|schedul|appointment/i.test(input)) {
    defaults.primaryView = 'calendar';
    defaults.homePage = 'today';
  } else if (/kanban|board|pipeline/i.test(input)) {
    defaults.primaryView = 'kanban';
  } else if (/dashboard|overview/i.test(input)) {
    defaults.primaryView = 'dashboard';
    defaults.homePage = 'dashboard';
  }
  
  // Detect time preferences
  if (/morning|early/i.test(input)) {
    defaults.calendarStartHour = 6;
    defaults.businessStartHour = 6;
  }
  if (/evening|late/i.test(input)) {
    defaults.businessEndHour = 21;
  }
  if (/24.?hour|overnight/i.test(input)) {
    defaults.businessStartHour = 0;
    defaults.businessEndHour = 24;
  }
  
  // Detect business days
  if (/7 days|everyday|weekends/i.test(input)) {
    defaults.businessDays = [0, 1, 2, 3, 4, 5, 6];
  }
  if (/no weekends|weekdays only/i.test(input)) {
    defaults.businessDays = [1, 2, 3, 4, 5];
  }
  
  return defaults;
}

/**
 * Build sample data context
 */
function buildSampleDataContext(
  discovery: DiscoveryOutput,
  kitDefaults: ReturnType<typeof getKitDefaults>
): SampleDataContext {
  return {
    businessName: discovery.businessName || 'Your Business',
    serviceTypes: discovery.serviceTypes || kitDefaults.sampleDataTemplates.serviceTypes.slice(0, 3),
    locationStyle: kitDefaults.sampleDataTemplates.locationStyle,
    region: 'en-US',
    includeSampleData: true,
  };
}

/**
 * Build discovery context
 */
function buildDiscoveryContext(discovery: DiscoveryOutput): DiscoveryContext {
  const mentioned = discovery.mentioned || extractMentionedFeatures(discovery.originalInput);
  
  // Determine what wasn't mentioned (safe to hide)
  const allFeatures = ['scheduling', 'invoicing', 'quotes', 'teamManagement', 'customerPortal', 'inventory', 'gallery', 'documents', 'reports'];
  const notMentioned = allFeatures.filter(f => !mentioned.includes(f));
  
  return {
    originalInput: discovery.originalInput,
    mentionedKeywords: mentioned,
    explicitRequests: mentioned,
    notMentioned,
    inferredScale: discovery.scale || 'solo',
    confidence: discovery.confidence || 0.7,
  };
}

/**
 * Build assumptions list
 */
function buildAssumptions(
  discovery: DiscoveryOutput,
  config: Partial<AppConfiguration>
): ConfigurationAssumptions {
  const assumptions: ConfigurationAssumptions['assumptions'] = [];
  const uncertainties: ConfigurationAssumptions['uncertainties'] = [];
  
  // Complexity assumption
  if (!discovery.scale) {
    if (config.complexity === 'simple') {
      assumptions.push({
        what: 'Solo use mode',
        why: 'No team size mentioned, defaulting to solo',
        adjustPath: 'Settings > Team',
      });
    }
  }
  
  // Industry assumption if confidence is medium
  if ((discovery.confidence || 0.7) < 0.85) {
    assumptions.push({
      what: `${discovery.kitId.replace(/-/g, ' ')} industry template`,
      why: 'Best match for your description',
      adjustPath: 'Settings > Industry',
    });
  }
  
  // Feature visibility assumptions
  if (config.features?.inventory === 'hidden') {
    assumptions.push({
      what: 'Inventory tracking hidden',
      why: 'Not mentioned in your description',
      adjustPath: 'Settings > Features > Inventory',
    });
  }
  
  if (config.features?.customerPortal === 'hidden') {
    assumptions.push({
      what: 'Customer portal hidden',
      why: 'Not mentioned in your description',
      adjustPath: 'Settings > Features > Customer Portal',
    });
  }
  
  // Uncertainties
  if (!discovery.serviceTypes || discovery.serviceTypes.length === 0) {
    uncertainties.push({
      what: 'Service types',
      defaultChoice: 'Common services for your industry',
      adjustPath: 'Settings > Services',
    });
  }
  
  return { assumptions, uncertainties };
}

/**
 * Build complete AppConfiguration from discovery output
 */
export function buildConfiguration(discovery: DiscoveryOutput): AppConfiguration {
  const kitDefaults = getKitDefaults(discovery.kitId);
  const complexity = determineComplexity(discovery);
  
  const features = buildFeatureVisibility(discovery, kitDefaults.features, complexity);
  const defaults = buildViewDefaults(discovery, kitDefaults.defaults);
  const sampleData = buildSampleDataContext(discovery, kitDefaults);
  const discoveryContext = buildDiscoveryContext(discovery);
  
  const partialConfig: Partial<AppConfiguration> = {
    kitId: discovery.kitId,
    complexity,
    features,
    defaults,
    sampleData,
    discoveryContext,
  };
  
  const assumptions = buildAssumptions(discovery, partialConfig);
  
  const config: AppConfiguration = {
    kitId: discovery.kitId,
    complexity,
    terminology: kitDefaults.terminology,
    features,
    defaults,
    sampleData,
    discoveryContext,
    assumptions,
    createdAt: new Date().toISOString(),
  };
  
  return config;
}

/**
 * Merge user overrides into configuration
 */
export function mergeConfiguration(
  base: AppConfiguration,
  overrides: Partial<AppConfiguration>
): AppConfiguration {
  return {
    ...base,
    ...overrides,
    features: {
      ...base.features,
      ...(overrides.features || {}),
    },
    defaults: {
      ...base.defaults,
      ...(overrides.defaults || {}),
    },
    terminology: {
      ...base.terminology,
      ...(overrides.terminology || {}),
    },
    sampleData: {
      ...base.sampleData,
      ...(overrides.sampleData || {}),
    },
  };
}

/**
 * Create a minimal configuration for testing
 */
export function createMinimalConfiguration(kitId: IndustryKitId): AppConfiguration {
  return buildConfiguration({
    kitId,
    originalInput: '',
    confidence: 1,
  });
}
