/**
 * App Configuration Module
 * 
 * This module controls how industry kits are presented without modifying the kits themselves.
 * 
 * Key concepts:
 * - Kits are sacred: Complete, tested structures that don't change per-user
 * - Configuration is presentation: Visibility, terminology, defaults, sample data
 * - Discovery extracts intent: Maps user input to configuration parameters
 * 
 * Usage:
 * 
 * ```typescript
 * import { buildConfiguration, generateSampleData, generateSetupSummary } from '@neo/blueprint-engine';
 * 
 * // From discovery output
 * const config = buildConfiguration({
 *   kitId: 'plumber',
 *   originalInput: 'I need an app for my plumbing business',
 *   scale: 'solo',
 *   businessName: 'Mike\'s Plumbing',
 * });
 * 
 * // Generate sample data
 * const sampleData = generateSampleData(config);
 * 
 * // Get setup summary
 * const summary = generateSetupSummary(config);
 * // => ["Set up as a plumber business", "Configured for solo use", ...]
 * ```
 */

// Types
export type {
  FeatureVisibility,
  ComplexityLevel,
  PrimaryView,
  LocationStyle,
  EntityTerminology,
  FeatureVisibilityConfig,
  ViewDefaults,
  SampleDataContext,
  DiscoveryContext,
  ConfigurationAssumptions,
  AppConfiguration,
  PartialAppConfiguration,
  KitDefaultConfiguration,
} from './types.js';

// Kit defaults
export {
  getKitDefaults,
  getKitsWithDefaults,
  hasKitDefaults,
} from './kit-defaults.js';

// Configuration builder
export type { DiscoveryOutput } from './configuration-builder.js';
export {
  buildConfiguration,
  mergeConfiguration,
  createMinimalConfiguration,
} from './configuration-builder.js';

// Sample data generator
export type {
  SampleRecord,
  GeneratedSampleData,
} from './sample-data-generator.js';
export {
  generateSampleData,
  generateWelcomeMessage,
  generateSetupSummary,
} from './sample-data-generator.js';
