/**
 * Configuration Integration
 * 
 * Bridges the discovery system with the app configuration layer.
 * Converts discovery results into AppConfiguration for presentation control.
 */

import type { AIDiscoveryState, EnhancedDiscoveryResponse } from './ai-discovery-handler.js';
import type { AppConfig } from './mandatory-discovery-service.js';
import type { ConversationState } from './conversational-discovery.js';
import {
  buildConfiguration,
  type AppConfiguration,
  type DiscoveryOutput,
} from '@neo/blueprint-engine';
import type { IndustryKitId } from '@neo/blueprint-engine';

/**
 * Convert AI discovery state to DiscoveryOutput for configuration building
 */
export function convertAIDiscoveryToOutput(
  state: AIDiscoveryState,
  appConfig?: AppConfig
): DiscoveryOutput {
  // Extract scale from answers or state
  let scale: 'solo' | 'small' | 'medium' | 'large' | undefined;
  
  const teamSize = state.answers.team_size || state.answers.teamSize;
  if (teamSize) {
    const size = String(teamSize).toLowerCase();
    if (size.includes('just me') || size.includes('solo') || size === '1') {
      scale = 'solo';
    } else if (size.includes('2-5') || size.includes('small')) {
      scale = 'small';
    } else if (size.includes('6-20') || size.includes('medium')) {
      scale = 'medium';
    } else if (size.includes('20+') || size.includes('large')) {
      scale = 'large';
    }
  }
  
  // If not in answers, check original input
  if (!scale) {
    const input = state.originalInput.toLowerCase();
    if (input.includes('just me') || input.includes('solo') || input.includes('freelance')) {
      scale = 'solo';
    } else if (input.includes('team') || input.includes('employees')) {
      scale = 'small';
    }
  }

  // Extract mentioned features from input
  const mentioned: string[] = [];
  const lower = state.originalInput.toLowerCase();
  
  if (/schedul|appointment|book|calendar/i.test(lower)) mentioned.push('scheduling');
  if (/invoice|bill|payment/i.test(lower)) mentioned.push('invoicing');
  if (/quote|estimate/i.test(lower)) mentioned.push('quotes');
  if (/team|employee|staff/i.test(lower)) mentioned.push('teamManagement');
  if (/customer.*portal|online.*book/i.test(lower)) mentioned.push('customerPortal');
  if (/inventory|stock|parts/i.test(lower)) mentioned.push('inventory');

  // Extract business name from answers if available
  const businessName = state.answers.business_name as string | undefined
    || state.answers.businessName as string | undefined;

  return {
    kitId: (state.detectedIndustry || appConfig?.industryText || 'general_business') as IndustryKitId,
    originalInput: state.originalInput,
    scale,
    businessName,
    mentioned,
    confidence: state.confidence,
    answers: state.answers,
  };
}

/**
 * Convert conversational discovery state to DiscoveryOutput
 */
export function convertConversationalToOutput(
  state: ConversationState
): DiscoveryOutput {
  const collectedInfo = state.collectedInfo;
  
  // Extract scale
  let scale: 'solo' | 'small' | 'medium' | 'large' | undefined;
  if (collectedInfo.teamSize === 'solo') {
    scale = 'solo';
  } else if (collectedInfo.teamSize === 'small') {
    scale = 'small';
  } else if (collectedInfo.teamSize === 'team') {
    scale = 'small'; // Default team to small
  }
  
  // Map complexity to scale
  if (collectedInfo.complexity === 'simple') {
    scale = scale || 'solo';
  } else if (collectedInfo.complexity === 'advanced') {
    scale = 'large';
  }

  // Extract mentioned features
  const mentioned: string[] = [];
  if (collectedInfo.mainFeature === 'bookings') mentioned.push('scheduling');
  if (collectedInfo.mainFeature === 'customers') mentioned.push('crm');
  if (collectedInfo.mainFeature === 'orders') mentioned.push('orders');
  if (collectedInfo.customerFacing) mentioned.push('customerPortal');

  return {
    kitId: (collectedInfo.industry || state.detectedIndustry || 'general_business') as IndustryKitId,
    originalInput: state.originalInput,
    scale,
    mentioned,
    confidence: state.confidence,
  };
}

/**
 * Build full AppConfiguration from AI discovery result
 */
export function buildConfigurationFromAIDiscovery(
  state: AIDiscoveryState,
  appConfig?: AppConfig
): AppConfiguration {
  const output = convertAIDiscoveryToOutput(state, appConfig);
  return buildConfiguration(output);
}

/**
 * Build full AppConfiguration from conversational discovery result
 */
export function buildConfigurationFromConversation(
  state: ConversationState
): AppConfiguration {
  const output = convertConversationalToOutput(state);
  return buildConfiguration(output);
}

/**
 * Create a complete discovery result with both AppConfig and AppConfiguration
 */
export interface CompleteDiscoveryResult {
  /** Legacy app config (for backwards compatibility) */
  appConfig: AppConfig;
  /** New app configuration (for presentation control) */
  configuration: AppConfiguration;
  /** Setup summary messages */
  setupSummary: string[];
  /** Welcome message */
  welcomeMessage: string;
}

/**
 * Build complete discovery result with configuration
 */
export function buildCompleteDiscoveryResult(
  state: AIDiscoveryState,
  appConfig: AppConfig
): CompleteDiscoveryResult {
  const configuration = buildConfigurationFromAIDiscovery(state, appConfig);
  
  // Generate setup summary from configuration
  const setupSummary: string[] = [];
  
  // Industry
  setupSummary.push(`Set up as a ${configuration.kitId.replace(/-/g, ' ')} business`);
  
  // Complexity/Scale
  if (configuration.complexity === 'simple') {
    setupSummary.push('Configured for solo use');
  } else if (configuration.complexity === 'advanced') {
    setupSummary.push('Configured for team use with full features');
  }
  
  // Key features
  if (configuration.features.scheduling === 'prominent') {
    setupSummary.push('Scheduling prominently featured');
  }
  if (configuration.features.invoicing === 'prominent') {
    setupSummary.push('Invoicing ready to use');
  }
  
  // Hidden features
  const hidden: string[] = [];
  if (configuration.features.teamManagement === 'hidden') hidden.push('team features');
  if (configuration.features.inventory === 'hidden') hidden.push('inventory');
  if (configuration.features.customerPortal === 'hidden') hidden.push('customer portal');
  
  if (hidden.length > 0) {
    setupSummary.push(`Hidden: ${hidden.join(', ')} (enable in Settings)`);
  }
  
  // Welcome message
  const businessName = configuration.sampleData.businessName || 'there';
  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  if (hour >= 17) greeting = 'Good evening';
  
  const welcomeMessage = `${greeting}, ${businessName}!`;
  
  return {
    appConfig,
    configuration,
    setupSummary,
    welcomeMessage,
  };
}
