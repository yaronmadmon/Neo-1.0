/**
 * Discovery Handler
 * Handles the discovery flow and integrates with UnifiedAppGenerator
 */

import { DiscoveryService, type DiscoveredInfo, type DiscoveryResult } from '@neo/discovery';

export interface DiscoveryResponse {
  needsClarification: boolean;
  questions?: Array<{
    id: string;
    question: string;
    type: 'choice' | 'text' | 'number' | 'boolean';
    options?: string[];
    required: boolean;
    category: string;
    helpText?: string;
  }>;
  discoveredInfo?: DiscoveredInfo;
  confidence?: number;
  suggestedFeatures?: string[];
}

export class DiscoveryHandler {
  private discoveryService: DiscoveryService;

  constructor() {
    this.discoveryService = new DiscoveryService();
  }

  /**
   * Analyze input for discovery needs
   */
  async analyzeInput(input: string, existingInfo?: DiscoveredInfo): Promise<DiscoveryResponse> {
    const result = await this.discoveryService.analyzeInput(input, existingInfo);

    return {
      needsClarification: result.needsClarification,
      questions: result.questions.length > 0 ? result.questions : undefined,
      discoveredInfo: result.discoveredInfo,
      confidence: result.confidence,
      suggestedFeatures: result.suggestedFeatures,
    };
  }

  /**
   * Process answers and update discovered info
   */
  processAnswers(discoveredInfo: DiscoveredInfo, answers: Record<string, unknown>): DiscoveredInfo {
    return this.discoveryService.processAnswers(discoveredInfo, answers);
  }

  /**
   * Get domain knowledge for a domain
   */
  getDomainKnowledge(domainId: string) {
    return this.discoveryService.getDomainKnowledge(domainId);
  }
}
