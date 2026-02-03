/**
 * App Configuration Context
 * 
 * Provides access to the app configuration throughout the component tree.
 * Used for terminology mapping, feature visibility, and customization.
 */
import React, { createContext, useContext, useMemo, ReactNode } from 'react';

/**
 * Feature visibility levels
 */
export type FeatureVisibility = 'hidden' | 'visible' | 'prominent';

/**
 * Entity terminology mapping
 */
export interface EntityTerminology {
  singular: string;
  plural: string;
  actions: {
    create: string;
    edit: string;
    delete: string;
    view: string;
    complete: string;
  };
  statuses?: Record<string, string>;
  emptyMessage: string;
}

/**
 * Feature visibility configuration
 */
export interface FeatureVisibilityConfig {
  scheduling: FeatureVisibility;
  invoicing: FeatureVisibility;
  quotes: FeatureVisibility;
  teamManagement: FeatureVisibility;
  staffScheduling: FeatureVisibility;
  permissions: FeatureVisibility;
  customerPortal: FeatureVisibility;
  customerCommunication: FeatureVisibility;
  inventory: FeatureVisibility;
  gallery: FeatureVisibility;
  documents: FeatureVisibility;
  reports: FeatureVisibility;
  integrations: FeatureVisibility;
}

/**
 * Sample data context
 */
export interface SampleDataContext {
  businessName: string;
  serviceTypes: string[];
  locationStyle: 'residential' | 'commercial' | 'mixed';
  includeSampleData: boolean;
}

/**
 * App Configuration (client-side subset)
 */
export interface AppConfiguration {
  kitId: string;
  complexity: 'simple' | 'standard' | 'advanced';
  terminology: Record<string, EntityTerminology>;
  features: FeatureVisibilityConfig;
  sampleData: SampleDataContext;
  setupSummary?: string[];
  welcomeMessage?: string;
}

/**
 * Default configuration (general business)
 */
const defaultConfiguration: AppConfiguration = {
  kitId: 'general_business',
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
    scheduling: 'visible',
    invoicing: 'visible',
    quotes: 'visible',
    teamManagement: 'hidden',
    staffScheduling: 'hidden',
    permissions: 'hidden',
    customerPortal: 'hidden',
    customerCommunication: 'visible',
    inventory: 'hidden',
    gallery: 'hidden',
    documents: 'hidden',
    reports: 'visible',
    integrations: 'hidden',
  },
  sampleData: {
    businessName: 'Your Business',
    serviceTypes: [],
    locationStyle: 'mixed',
    includeSampleData: true,
  },
};

/**
 * Context value interface
 */
interface AppConfigurationContextValue {
  configuration: AppConfiguration;
  /** Get terminology for an entity type */
  getTerminology: (entityType: string) => EntityTerminology | undefined;
  /** Get the label for an entity (singular or plural) */
  getEntityLabel: (entityType: string, plural?: boolean) => string;
  /** Get action label for an entity */
  getActionLabel: (entityType: string, action: keyof EntityTerminology['actions']) => string;
  /** Get status label for an entity */
  getStatusLabel: (entityType: string, status: string) => string;
  /** Get empty message for an entity */
  getEmptyMessage: (entityType: string) => string;
  /** Check if a feature is visible */
  isFeatureVisible: (feature: keyof FeatureVisibilityConfig) => boolean;
  /** Check if a feature is prominent */
  isFeatureProminent: (feature: keyof FeatureVisibilityConfig) => boolean;
  /** Check if a feature is hidden */
  isFeatureHidden: (feature: keyof FeatureVisibilityConfig) => boolean;
  /** Get complexity level */
  complexity: 'simple' | 'standard' | 'advanced';
  /** Business name */
  businessName: string;
}

const AppConfigurationContext = createContext<AppConfigurationContextValue | null>(null);

/**
 * Provider props
 */
interface AppConfigurationProviderProps {
  configuration?: Partial<AppConfiguration>;
  children: ReactNode;
}

/**
 * App Configuration Provider
 */
export function AppConfigurationProvider({
  configuration: configOverrides,
  children,
}: AppConfigurationProviderProps) {
  // Merge provided configuration with defaults
  const configuration = useMemo<AppConfiguration>(() => {
    if (!configOverrides) return defaultConfiguration;
    
    return {
      ...defaultConfiguration,
      ...configOverrides,
      terminology: {
        ...defaultConfiguration.terminology,
        ...(configOverrides.terminology || {}),
      },
      features: {
        ...defaultConfiguration.features,
        ...(configOverrides.features || {}),
      },
      sampleData: {
        ...defaultConfiguration.sampleData,
        ...(configOverrides.sampleData || {}),
      },
    };
  }, [configOverrides]);

  const value = useMemo<AppConfigurationContextValue>(() => ({
    configuration,
    
    getTerminology: (entityType: string) => {
      return configuration.terminology[entityType];
    },
    
    getEntityLabel: (entityType: string, plural = false) => {
      const term = configuration.terminology[entityType];
      if (term) {
        return plural ? term.plural : term.singular;
      }
      // Fallback: capitalize and pluralize
      const label = entityType.replace(/([A-Z])/g, ' $1').trim();
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
      return plural ? `${capitalized}s` : capitalized;
    },
    
    getActionLabel: (entityType: string, action: keyof EntityTerminology['actions']) => {
      const term = configuration.terminology[entityType];
      if (term?.actions[action]) {
        return term.actions[action];
      }
      // Fallback
      const actionLabels: Record<string, string> = {
        create: 'Create',
        edit: 'Edit',
        delete: 'Delete',
        view: 'View',
        complete: 'Complete',
      };
      return actionLabels[action] || action;
    },
    
    getStatusLabel: (entityType: string, status: string) => {
      const term = configuration.terminology[entityType];
      if (term?.statuses?.[status]) {
        return term.statuses[status];
      }
      // Fallback: format status
      return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },
    
    getEmptyMessage: (entityType: string) => {
      const term = configuration.terminology[entityType];
      return term?.emptyMessage || `No ${entityType}s yet`;
    },
    
    isFeatureVisible: (feature: keyof FeatureVisibilityConfig) => {
      const visibility = configuration.features[feature];
      return visibility === 'visible' || visibility === 'prominent';
    },
    
    isFeatureProminent: (feature: keyof FeatureVisibilityConfig) => {
      return configuration.features[feature] === 'prominent';
    },
    
    isFeatureHidden: (feature: keyof FeatureVisibilityConfig) => {
      return configuration.features[feature] === 'hidden';
    },
    
    complexity: configuration.complexity,
    businessName: configuration.sampleData.businessName,
  }), [configuration]);

  return (
    <AppConfigurationContext.Provider value={value}>
      {children}
    </AppConfigurationContext.Provider>
  );
}

/**
 * Hook to use app configuration
 */
export function useAppConfiguration(): AppConfigurationContextValue {
  const context = useContext(AppConfigurationContext);
  if (!context) {
    // Return default context if not in provider
    return {
      configuration: defaultConfiguration,
      getTerminology: () => undefined,
      getEntityLabel: (entityType, plural) => {
        const label = entityType.replace(/([A-Z])/g, ' $1').trim();
        const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
        return plural ? `${capitalized}s` : capitalized;
      },
      getActionLabel: (_, action) => action.charAt(0).toUpperCase() + action.slice(1),
      getStatusLabel: (_, status) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      getEmptyMessage: (entityType) => `No ${entityType}s yet`,
      isFeatureVisible: () => true,
      isFeatureProminent: () => false,
      isFeatureHidden: () => false,
      complexity: 'simple',
      businessName: 'Your Business',
    };
  }
  return context;
}

/**
 * Hook to check feature visibility
 */
export function useFeatureVisibility(feature: keyof FeatureVisibilityConfig) {
  const { configuration } = useAppConfiguration();
  return configuration.features[feature];
}

/**
 * Hook to get terminology for an entity
 */
export function useTerminology(entityType: string) {
  const { getTerminology, getEntityLabel, getActionLabel, getStatusLabel, getEmptyMessage } = useAppConfiguration();
  
  return {
    terminology: getTerminology(entityType),
    label: getEntityLabel(entityType),
    pluralLabel: getEntityLabel(entityType, true),
    getAction: (action: keyof EntityTerminology['actions']) => getActionLabel(entityType, action),
    getStatus: (status: string) => getStatusLabel(entityType, status),
    emptyMessage: getEmptyMessage(entityType),
  };
}
