/**
 * Mandatory Discovery Handler
 * Wraps MandatoryDiscoveryService and provides the interface expected by the API
 */

import {
  MandatoryDiscoveryService,
  type AppConfig,
  type ClarificationQuestion,
} from '@neo/discovery';

export interface MandatoryDiscoveryResponse {
  needsClarification: boolean;
  questions?: ClarificationQuestion[];
  appConfig?: AppConfig;
  isHomePlaceholder?: boolean;
  state?: {
    currentStep: number;
    context?: 'business' | 'home';
    answers: Record<string, unknown>;
  };
}

export class MandatoryDiscoveryHandler {
  private mandatoryService: MandatoryDiscoveryService;

  constructor() {
    this.mandatoryService = new MandatoryDiscoveryService();
  }

  /**
   * Start mandatory discovery - always returns questions (gate question)
   */
  startDiscovery(input: string): MandatoryDiscoveryResponse {
    const { state, questions } = this.mandatoryService.startDiscovery();

    return {
      needsClarification: true,
      questions,
      state,
    };
  }

  /**
   * Continue discovery with answers
   */
  continueDiscovery(
    state: { currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> },
    answers: Record<string, unknown>
  ): MandatoryDiscoveryResponse {
    // Convert state to DiscoveryState format
    let currentState: { currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> } = {
      currentStep: state.currentStep,
      context: state.context,
      answers: { ...state.answers },
    };

    // Process each answer sequentially
    for (const [questionId, answer] of Object.entries(answers)) {
      const result = this.mandatoryService.continueDiscovery(currentState, questionId, answer);
      currentState = result.state;

      // If Home selected, return placeholder state
      if (this.mandatoryService.isHomePlaceholder(result.state)) {
        return {
          needsClarification: true,
          questions: [],
          isHomePlaceholder: true,
          state: {
            currentStep: result.state.currentStep,
            context: result.state.context,
            answers: result.state.answers,
          },
        };
      }

      // If complete, return AppConfig
      if (result.isComplete) {
        const appConfig = this.mandatoryService.generateAppConfig(result.state);
        return {
          needsClarification: false,
          appConfig: appConfig || undefined,
          state: {
            currentStep: result.state.currentStep,
            context: result.state.context,
            answers: result.state.answers,
          },
        };
      }
    }

    // Get next questions
    const questions = this.mandatoryService.getQuestions(currentState);

    return {
      needsClarification: questions.length > 0,
      questions: questions.length > 0 ? questions : undefined,
      state: {
        currentStep: currentState.currentStep,
        context: currentState.context,
        answers: currentState.answers,
      },
    };
  }

  /**
   * Process all answers at once (for batch submission)
   */
  processAnswers(
    state: { currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> },
    answers: Record<string, unknown>
  ): MandatoryDiscoveryResponse {
    return this.continueDiscovery(state, answers);
  }

  /**
   * Get AppConfig from state (if complete)
   */
  getAppConfig(state: { currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> }): AppConfig | null {
    const discoveryState = {
      currentStep: state.currentStep,
      context: state.context,
      answers: state.answers,
    };
    
    return this.mandatoryService.generateAppConfig(discoveryState);
  }
}
