export * from './domain-knowledge-base.js';
export * from './discovery-service.js';
export * from './mandatory-discovery-service.js';
export * from './smart-discovery-handler.js';
export * from './ai-discovery-handler.js';
export * from './ai-context-provider.js';
export * from './conversational-discovery.js';

// Configuration integration
export {
  convertAIDiscoveryToOutput,
  convertConversationalToOutput,
  buildConfigurationFromAIDiscovery,
  buildConfigurationFromConversation,
  buildCompleteDiscoveryResult,
  type CompleteDiscoveryResult,
} from './configuration-integration.js';