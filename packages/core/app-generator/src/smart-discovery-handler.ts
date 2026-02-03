/**
 * Smart Discovery Handler
 * Uses AI-like understanding to intelligently skip questions when confidence is high
 * Wraps SmartDiscoveryHandler from @neo/discovery
 */

import {
  SmartDiscoveryHandler as SmartDiscoveryService,
  type SmartDiscoveryState,
  type AppConfig,
  type ClarificationQuestion,
} from '@neo/discovery';

export interface SmartDiscoveryResponse {
  needsClarification: boolean;
  questions?: ClarificationQuestion[];
  appConfig?: AppConfig;
  isHomePlaceholder?: boolean;
  action?: 'auto_build' | 'confirm' | 'clarify' | 'deep_clarify';
  state?: SmartDiscoveryState;
}

export class SmartDiscoveryHandlerWrapper {
  private smartService: SmartDiscoveryService;

  constructor() {
    this.smartService = new SmartDiscoveryService();
  }

  /**
   * Start smart discovery - analyzes input and may skip questions if confidence is high
   */
  startDiscovery(input: string): SmartDiscoveryResponse {
    const result = this.smartService.startDiscovery(input);

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
  continueDiscovery(
    state: SmartDiscoveryState,
    answers: Record<string, unknown>
  ): SmartDiscoveryResponse {
    const result = this.smartService.continueDiscovery(state, answers);

    return {
      needsClarification: result.needsClarification,
      questions: result.questions?.length > 0 ? result.questions : undefined,
      appConfig: result.appConfig,
      isHomePlaceholder: result.isHomePlaceholder,
      state: result.state,
    };
  }

  /**
   * Process all answers at once (for batch submission)
   */
  processAnswers(
    state: SmartDiscoveryState,
    answers: Record<string, unknown>
  ): SmartDiscoveryResponse {
    return this.continueDiscovery(state, answers);
  }

  /**
   * Get AppConfig from state
   */
  getAppConfig(state: SmartDiscoveryState): AppConfig | null {
    // If state has enough info, generate config
    if (state.context && (state.detectedIndustry || state.answers.industry_text)) {
      const teamSizeValue = state.answers.team_size;
      const teamSize = teamSizeValue === 'Team' || teamSizeValue === 'team' ? 'team' : 'solo';
      
      const offerTypeValue = String(state.answers.offer_type || '').toLowerCase();
      const offerType = offerTypeValue === 'products' ? 'products' : 
                        offerTypeValue === 'both' ? 'both' : 'services';

      return {
        context: state.context,
        industryText: state.detectedIndustry || String(state.answers.industry_text || 'general_business'),
        teamSize,
        offerType,
        onlineAcceptance: Boolean(state.answers.online_acceptance),
      };
    }
    return null;
  }
}
