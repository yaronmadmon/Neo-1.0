/**
 * Publishing Types
 * 
 * Types for the publishing and versioning system.
 */

import type { UnifiedAppSchema } from '@neo/blueprint-engine';

// ============================================================
// ENVIRONMENTS
// ============================================================

export type Environment = 'draft' | 'staging' | 'production';

export interface EnvironmentConfig {
  id: Environment;
  name: string;
  url?: string;
  enabled: boolean;
}

// ============================================================
// APP VERSION
// ============================================================

export interface AppVersion {
  id: string;
  appId: string;
  version: string; // Semantic version: 1.0.0, 1.1.0, etc.
  environment: Environment;
  
  // Frozen bundle
  bundle: PublishedBundle;
  
  // Metadata
  description?: string;
  createdBy?: string;
  createdAt: string;
  publishedAt?: string;
  
  // Status
  isCurrent: boolean; // Is this the current version for this environment?
  isActive: boolean; // Is this version currently deployed?
}

// ============================================================
// PUBLISHED BUNDLE
// ============================================================

export interface PublishedBundle {
  // Frozen schema
  schema: UnifiedAppSchema;
  
  // Runtime config
  runtimeConfig: {
    apiBaseUrl?: string;
    enableDevTools?: boolean;
  };
  
  // Build artifacts (paths or content)
  buildArtifacts?: {
    html?: string;
    css?: string;
    js?: string;
    assets?: Record<string, string>;
  };
  
  // Metadata
  buildTimestamp: string;
  buildVersion: string;
}

// ============================================================
// PUBLISH OPTIONS
// ============================================================

export interface PublishOptions {
  environment: Environment;
  version?: string; // Auto-increment if not provided
  description?: string;
  createdBy?: string;
  
  // Bundle options
  includeData?: boolean; // Include sample data (default: false)
  minify?: boolean; // Minify bundle (default: true)
  optimize?: boolean; // Optimize bundle (default: true)
}

// ============================================================
// PUBLISH RESULT
// ============================================================

export interface PublishResult {
  success: boolean;
  version: AppVersion;
  message?: string;
  error?: string;
}

// ============================================================
// ROLLBACK RESULT
// ============================================================

export interface RollbackResult {
  success: boolean;
  version: AppVersion;
  previousVersion?: AppVersion;
  message?: string;
  error?: string;
}

// ============================================================
// VERSION HISTORY
// ============================================================

export interface VersionHistory {
  appId: string;
  versions: AppVersion[];
  currentProduction?: AppVersion;
  currentStaging?: AppVersion;
}
