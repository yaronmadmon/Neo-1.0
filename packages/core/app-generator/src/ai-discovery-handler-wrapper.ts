/**
 * AI Discovery Handler Wrapper
 * Wraps the AI-powered discovery handler from @neo/discovery
 * for use in the server with an AI provider
 */

import {
  AIDiscoveryHandler,
  type AIDiscoveryState,
  type AIProviderForDiscovery,
  type AppConfig,
  type ClarificationQuestion,
} from '@neo/discovery';

export interface AIDiscoveryResponse {
  needsClarification: boolean;
  questions?: ClarificationQuestion[];
  appConfig?: AppConfig;
  isHomePlaceholder?: boolean;
  action?: 'auto_build' | 'confirm' | 'clarify' | 'deep_clarify';
  state?: AIDiscoveryState;
}

export class AIDiscoveryHandlerWrapper {
  private aiHandler: AIDiscoveryHandler;

  constructor(aiProvider?: AIProviderForDiscovery) {
    this.aiHandler = new AIDiscoveryHandler(aiProvider);
  }

  /**
   * Start AI-powered discovery
   */
  async startDiscovery(input: string): Promise<AIDiscoveryResponse> {
    const result = await this.aiHandler.startDiscovery(input);
    return {
      needsClarification: result.needsClarification,
      questions: result.questions.length > 0 ? result.questions : undefined,
      appConfig: result.appConfig,
      action: result.action,
      state: result.state,
    };
  }

  /**
   * Continue discovery with answers
   */
  async continueDiscovery(
    state: AIDiscoveryState,
    answers: Record<string, unknown>
  ): Promise<AIDiscoveryResponse> {
    const result = await this.aiHandler.continueDiscovery(state, answers);
    return {
      needsClarification: result.needsClarification,
      questions: result.questions?.length > 0 ? result.questions : undefined,
      appConfig: result.appConfig,
      isHomePlaceholder: result.isHomePlaceholder,
      state: result.state,
    };
  }

  /**
   * Process all answers at once
   */
  async processAnswers(
    state: AIDiscoveryState,
    answers: Record<string, unknown>
  ): Promise<AIDiscoveryResponse> {
    return this.continueDiscovery(state, answers);
  }
}

// Re-export types
export type { AIDiscoveryState, AIProviderForDiscovery };
