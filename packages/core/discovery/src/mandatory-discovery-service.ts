/**
 * Mandatory Discovery Service
 * Implements a structured, mandatory discovery flow that always runs before app creation.
 * Discovery is NOT creative AI - it's a configuration step that outputs structured AppConfig.
 */

import type { ClarificationQuestion } from './discovery-service.js';

/**
 * AppConfig - Structured output from discovery
 * This is passed to the Materialization Engine deterministically
 */
export interface AppConfig {
  context: 'business' | 'home';
  // Business-specific fields
  offerType?: 'products' | 'services' | 'both';
  industryText?: string;
  teamSize?: 'solo' | 'team';
  onlineAcceptance?: boolean; // payments/orders online
  // Home-specific fields (to be added later)
  // ...
}

/**
 * Discovery state tracking
 */
interface DiscoveryState {
  currentStep: number;
  context?: 'business' | 'home';
  answers: Record<string, unknown>;
}

/**
 * Mandatory Discovery Service
 * Always runs discovery, starting with HOME vs BUSINESS gate
 */
export class MandatoryDiscoveryService {
  /**
   * Get the initial gate question (HOME vs BUSINESS)
   */
  getGateQuestion(): ClarificationQuestion {
    return {
      id: 'context_gate',
      question: 'Is this for your home or for a business?',
      type: 'choice',
      options: ['Home', 'Business'],
      required: true,
      category: 'context',
    };
  }

  /**
   * Get Business Discovery questions (5 total including gate)
   * Questions 2-5 (after gate)
   */
  getBusinessQuestions(): ClarificationQuestion[] {
    return [
      {
        id: 'offer_type',
        question: 'Do you mainly sell products, offer services, or a bit of both?',
        type: 'choice',
        options: ['Products', 'Services', 'Both'],
        required: true,
        category: 'business',
      },
      {
        id: 'industry_text',
        question: 'What kind of business is it?',
        type: 'text',
        required: true,
        category: 'business',
      },
      {
        id: 'team_size',
        question: 'Are you working solo right now, or do you have a team?',
        type: 'choice',
        options: ['Solo', 'Team'],
        required: true,
        category: 'business',
      },
      {
        id: 'online_acceptance',
        question: 'Will you be accepting payments or orders online?',
        type: 'boolean',
        required: true,
        category: 'business',
      },
    ];
  }

  /**
   * Get all questions for current state
   */
  getQuestions(state: DiscoveryState): ClarificationQuestion[] {
    // Always start with gate question if context not set
    if (!state.context) {
      return [this.getGateQuestion()];
    }

    // If Home selected, return placeholder (empty for now, will show message in UI)
    if (state.context === 'home') {
      return [];
    }

    // If Business selected, return business questions based on step
    if (state.context === 'business') {
      const businessQuestions = this.getBusinessQuestions();
      const answeredCount = Object.keys(state.answers).filter(
        (key) => key !== 'context_gate'
      ).length;
      
      // Return questions that haven't been answered yet
      return businessQuestions.slice(answeredCount);
    }

    return [];
  }

  /**
   * Check if discovery is complete
   */
  isComplete(state: DiscoveryState): boolean {
    if (!state.context) {
      return false;
    }

    if (state.context === 'home') {
      // Home discovery not implemented yet - not complete
      return false;
    }

    if (state.context === 'business') {
      // Business discovery is complete when all 5 questions are answered
      const businessQuestions = this.getBusinessQuestions();
      const requiredAnswers = businessQuestions.map((q) => q.id);
      requiredAnswers.push('context_gate'); // Include gate answer
      
      return requiredAnswers.every((id) => state.answers[id] !== undefined);
    }

    return false;
  }

  /**
   * Process answer and update state
   */
  processAnswer(state: DiscoveryState, questionId: string, answer: unknown): DiscoveryState {
    const updatedState: DiscoveryState = {
      ...state,
      answers: {
        ...state.answers,
        [questionId]: answer,
      },
    };

    // If gate question answered, set context
    if (questionId === 'context_gate') {
      const contextValue = String(answer).toLowerCase();
      updatedState.context = contextValue === 'business' ? 'business' : 'home';
    }

    return updatedState;
  }

  /**
   * Generate AppConfig from completed discovery state
   */
  generateAppConfig(state: DiscoveryState): AppConfig | null {
    if (!this.isComplete(state)) {
      return null;
    }

    const config: AppConfig = {
      context: state.context!,
    };

    if (state.context === 'business') {
      // Normalize offer_type
      const offerTypeAnswer = String(state.answers.offer_type || '').toLowerCase();
      if (offerTypeAnswer === 'products' || offerTypeAnswer === 'services' || offerTypeAnswer === 'both') {
        config.offerType = offerTypeAnswer as 'products' | 'services' | 'both';
      } else {
        config.offerType = 'both'; // Default fallback
      }

      // Industry text
      config.industryText = String(state.answers.industry_text || '').trim();

      // Normalize team_size
      const teamSizeAnswer = String(state.answers.team_size || '').toLowerCase();
      config.teamSize = teamSizeAnswer === 'team' ? 'team' : 'solo';

      // Online acceptance
      config.onlineAcceptance = Boolean(state.answers.online_acceptance);
    }

    return config;
  }

  /**
   * Start discovery - returns initial state with gate question
   */
  startDiscovery(): { state: DiscoveryState; questions: ClarificationQuestion[] } {
    const state: DiscoveryState = {
      currentStep: 0,
      answers: {},
    };

    return {
      state,
      questions: this.getQuestions(state),
    };
  }

  /**
   * Continue discovery with answer - returns updated state and next questions
   */
  continueDiscovery(
    state: DiscoveryState,
    questionId: string,
    answer: unknown
  ): { state: DiscoveryState; questions: ClarificationQuestion[]; isComplete: boolean } {
    const updatedState = this.processAnswer(state, questionId, answer);
    const questions = this.getQuestions(updatedState);
    const isComplete = this.isComplete(updatedState);

    return {
      state: updatedState,
      questions,
      isComplete,
    };
  }

  /**
   * Check if Home discovery is selected (placeholder state)
   */
  isHomePlaceholder(state: DiscoveryState): boolean {
    return state.context === 'home';
  }
}
