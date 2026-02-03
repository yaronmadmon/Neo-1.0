/**
 * Smart Discovery Handler
 * Uses AI-like understanding to intelligently skip questions when confidence is high
 * Implements the 4-tier confidence flow:
 * - >= 0.90: Auto-build
 * - 0.75-0.89: Show confirmation
 * - 0.50-0.74: Ask 1-2 questions
 * - < 0.50: Ask more questions
 */

import type { ClarificationQuestion } from './discovery-service.js';
import type { AppConfig } from './mandatory-discovery-service.js';

/**
 * Smart discovery state
 */
export interface SmartDiscoveryState {
  currentStep: number;
  context?: 'business' | 'home';
  answers: Record<string, unknown>;
  confidence: number;
  questionsAsked: number;
  detectedIndustry?: string;
  detectedIntent?: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
  originalInput: string;
}

/**
 * Industry detection keywords
 */
const INDUSTRY_KEYWORDS: Record<string, { keywords: string[]; context: 'business' | 'home' }> = {
  'plumber': { keywords: ['plumber', 'plumbing', 'pipe', 'leak', 'drain'], context: 'business' },
  'electrician': { keywords: ['electrician', 'electrical', 'wiring', 'circuit'], context: 'business' },
  'contractor': { keywords: ['contractor', 'construction', 'renovation', 'builder'], context: 'business' },
  'cleaning': { keywords: ['cleaning', 'cleaner', 'janitorial', 'maid'], context: 'business' },
  'bakery': { keywords: ['bakery', 'baker', 'pastry', 'bread', 'cake'], context: 'business' },
  'restaurant': { keywords: ['restaurant', 'cafe', 'dining', 'menu', 'food'], context: 'business' },
  'salon': { keywords: ['salon', 'beauty', 'hair', 'spa', 'nail', 'barber'], context: 'business' },
  'real-estate': { keywords: ['real estate', 'realtor', 'property', 'listing'], context: 'business' },
  'fitness-coach': { keywords: ['fitness', 'trainer', 'coach', 'gym', 'workout'], context: 'business' },
  'tutor': { keywords: ['tutor', 'tutoring', 'lesson', 'teaching'], context: 'business' },
  'photographer': { keywords: ['photographer', 'photography', 'photo'], context: 'business' },
  'ecommerce': { keywords: ['shop', 'ecommerce', 'store', 'online', 'sell'], context: 'business' },
  'mechanic': { keywords: ['mechanic', 'auto', 'car', 'vehicle', 'repair'], context: 'business' },
  'handyman': { keywords: ['handyman', 'repair', 'maintenance', 'fix'], context: 'business' },
  'medical': { keywords: ['medical', 'clinic', 'doctor', 'patient', 'health'], context: 'business' },
  'home-health': { keywords: ['home health', 'caregiver', 'aide', 'nursing'], context: 'business' },
  // Home contexts
  'home-organizer': { keywords: ['home organizer', 'organize', 'declutter', 'home management'], context: 'home' },
  'personal': { keywords: ['personal', 'habit', 'tracker', 'todo', 'budget', 'my'], context: 'home' },
};

/**
 * Intent detection keywords
 */
const INTENT_KEYWORDS: Record<string, string[]> = {
  'operations': ['manage', 'track', 'schedule', 'workflow', 'organize', 'operations'],
  'customer-facing': ['customer', 'client', 'booking', 'appointment', 'portal'],
  'internal': ['team', 'staff', 'employee', 'internal'],
  'hybrid': ['both', 'full', 'complete', 'end-to-end'],
};

/**
 * Team size detection
 */
const TEAM_SIZE_KEYWORDS = {
  'solo': ['solo', 'myself', 'just me', 'one person', 'freelance', 'independent'],
  'team': ['team', 'staff', 'employees', 'crew', 'workers', 'company'],
};

export class SmartDiscoveryHandler {
  private maxQuestions = 3;

  /**
   * Start discovery with intelligent analysis
   */
  startDiscovery(input: string): {
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: SmartDiscoveryState;
    appConfig?: AppConfig;
    action: 'auto_build' | 'confirm' | 'clarify' | 'deep_clarify';
  } {
    const analysis = this.analyzeInput(input);
    
    const state: SmartDiscoveryState = {
      currentStep: 0,
      context: analysis.context,
      answers: {},
      confidence: analysis.confidence,
      questionsAsked: 0,
      detectedIndustry: analysis.industry,
      detectedIntent: analysis.intent,
      originalInput: input,
    };

    // 4-tier confidence flow
    if (analysis.confidence >= 0.90) {
      // Auto-build - high confidence
      const appConfig = this.generateAppConfig(state, analysis);
      return {
        needsClarification: false,
        questions: [],
        state,
        appConfig,
        action: 'auto_build',
      };
    }

    if (analysis.confidence >= 0.75) {
      // Confirmation - medium-high confidence
      const appConfig = this.generateAppConfig(state, analysis);
      return {
        needsClarification: true,
        questions: this.getConfirmationQuestion(analysis),
        state,
        appConfig,
        action: 'confirm',
      };
    }

    if (analysis.confidence >= 0.50) {
      // Clarify - medium confidence, ask 1-2 targeted questions
      return {
        needsClarification: true,
        questions: this.getTargetedQuestions(analysis, 2),
        state,
        action: 'clarify',
      };
    }

    // Deep clarify - low confidence, start with context gate
    return {
      needsClarification: true,
      questions: this.getInitialQuestions(analysis),
      state,
      action: 'deep_clarify',
    };
  }

  /**
   * Continue discovery with answers
   */
  continueDiscovery(
    state: SmartDiscoveryState,
    answers: Record<string, unknown>
  ): {
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: SmartDiscoveryState;
    appConfig?: AppConfig;
    isHomePlaceholder?: boolean;
  } {
    // Update state with new answers
    const updatedState: SmartDiscoveryState = {
      ...state,
      answers: { ...state.answers, ...answers },
      questionsAsked: state.questionsAsked + Object.keys(answers).length,
    };

    // Process context gate answer
    if (answers.context_gate) {
      const contextValue = String(answers.context_gate).toLowerCase();
      updatedState.context = contextValue === 'business' ? 'business' : 'home';
      
      // Home placeholder
      if (updatedState.context === 'home') {
        return {
          needsClarification: true,
          questions: [],
          state: updatedState,
          isHomePlaceholder: true,
        };
      }
    }

    // Process confirmation
    if (answers.confirm_build !== undefined) {
      const confirmValue = String(answers.confirm_build).toLowerCase();
      if (answers.confirm_build === true || confirmValue === 'yes' || confirmValue === 'true') {
        // User confirmed, proceed to build
        const appConfig = this.generateAppConfigFromState(updatedState);
        return {
          needsClarification: false,
          questions: [],
          state: updatedState,
          appConfig,
        };
      }
      // User wants changes, ask more questions
      updatedState.confidence = 0.60; // Lower confidence to trigger more questions
    }

    // Update industry from answer if provided
    if (answers.industry_text) {
      updatedState.detectedIndustry = this.detectIndustry(String(answers.industry_text)).industry;
    }

    // Update team size
    if (answers.team_size) {
      updatedState.answers.team_size = answers.team_size;
    }

    // Update offer type
    if (answers.offer_type) {
      updatedState.answers.offer_type = answers.offer_type;
    }

    // Recalculate confidence
    updatedState.confidence = this.recalculateConfidence(updatedState);

    // Check if we've hit max questions
    if (updatedState.questionsAsked >= this.maxQuestions) {
      // Force build with what we have
      const appConfig = this.generateAppConfigFromState(updatedState);
      return {
        needsClarification: false,
        questions: [],
        state: updatedState,
        appConfig,
      };
    }

    // Check if we have enough info now
    if (updatedState.confidence >= 0.75) {
      const appConfig = this.generateAppConfigFromState(updatedState);
      return {
        needsClarification: false,
        questions: [],
        state: updatedState,
        appConfig,
      };
    }

    // Need more questions
    const remainingQuestions = this.maxQuestions - updatedState.questionsAsked;
    const questions = this.getNextQuestions(updatedState, Math.min(remainingQuestions, 2));

    return {
      needsClarification: true,
      questions,
      state: updatedState,
    };
  }

  /**
   * Analyze user input
   */
  private analyzeInput(input: string): {
    industry: string;
    context: 'business' | 'home';
    intent: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
    teamSize?: 'solo' | 'team';
    confidence: number;
    features: string[];
  } {
    const lower = input.toLowerCase();
    
    // Detect industry
    const industryResult = this.detectIndustry(lower);
    
    // Detect intent
    const intent = this.detectIntent(lower);
    
    // Detect team size
    const teamSize = this.detectTeamSize(lower);
    
    // Detect features
    const features = this.detectFeatures(lower);
    
    // Calculate confidence
    let confidence = 0.40; // Base confidence
    
    if (industryResult.industry !== 'general_business') {
      confidence += 0.25; // Known industry detected
    }
    
    if (industryResult.context) {
      confidence += 0.10; // Context detected
    }
    
    if (teamSize) {
      confidence += 0.10; // Team size mentioned
    }
    
    if (features.length > 0) {
      confidence += Math.min(0.15, features.length * 0.05); // Features mentioned
    }
    
    // Check for explicit business/home indicators
    if (/\b(my business|our company|for work|professional|commercial)\b/i.test(input)) {
      confidence += 0.10;
    }
    
    if (/\b(personal|my home|family|household)\b/i.test(input)) {
      confidence += 0.05;
    }

    return {
      industry: industryResult.industry,
      context: industryResult.context,
      intent,
      teamSize,
      confidence: Math.min(1, confidence),
      features,
    };
  }

  private detectIndustry(input: string): { industry: string; context: 'business' | 'home' } {
    let bestMatch: { industry: string; context: 'business' | 'home'; score: number } = { 
      industry: 'general_business', 
      context: 'business', 
      score: 0 
    };

    for (const [industry, config] of Object.entries(INDUSTRY_KEYWORDS)) {
      let score = 0;
      for (const keyword of config.keywords) {
        if (input.includes(keyword)) {
          score += keyword.split(' ').length; // Multi-word matches score higher
        }
      }
      if (score > bestMatch.score) {
        bestMatch = { industry, context: config.context, score };
      }
    }

    return { industry: bestMatch.industry, context: bestMatch.context };
  }

  private detectIntent(input: string): 'operations' | 'customer-facing' | 'internal' | 'hybrid' {
    let bestIntent: 'operations' | 'customer-facing' | 'internal' | 'hybrid' = 'operations';
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (input.includes(keyword)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as typeof bestIntent;
      }
    }

    return bestIntent;
  }

  private detectTeamSize(input: string): 'solo' | 'team' | undefined {
    for (const keyword of TEAM_SIZE_KEYWORDS.solo) {
      if (input.includes(keyword)) return 'solo';
    }
    for (const keyword of TEAM_SIZE_KEYWORDS.team) {
      if (input.includes(keyword)) return 'team';
    }
    return undefined;
  }

  private detectFeatures(input: string): string[] {
    const features: string[] = [];
    if (/\b(schedule|calendar|appointment|booking)\b/i.test(input)) features.push('scheduling');
    if (/\b(invoice|billing|payment)\b/i.test(input)) features.push('invoicing');
    if (/\b(quote|estimate)\b/i.test(input)) features.push('quotes');
    if (/\b(inventory|stock|materials)\b/i.test(input)) features.push('inventory');
    if (/\b(customer|client|crm)\b/i.test(input)) features.push('crm');
    return features;
  }

  private recalculateConfidence(state: SmartDiscoveryState): number {
    let confidence = 0.50;
    
    if (state.context) confidence += 0.15;
    if (state.detectedIndustry && state.detectedIndustry !== 'general_business') confidence += 0.15;
    if (state.answers.team_size) confidence += 0.10;
    if (state.answers.offer_type) confidence += 0.10;
    if (state.answers.industry_text) confidence += 0.10;
    
    return Math.min(1, confidence);
  }

  private getConfirmationQuestion(analysis: ReturnType<typeof this.analyzeInput>): ClarificationQuestion[] {
    const industryName = this.formatIndustryName(analysis.industry);
    const intentName = analysis.intent === 'customer-facing' ? 'customer interaction' : 'business operations';
    
    return [{
      id: 'confirm_build',
      question: `I'll create a ${industryName} app focused on ${intentName}. Does this look right?`,
      type: 'boolean',
      required: true,
      category: 'confirmation',
    }];
  }

  private getTargetedQuestions(analysis: ReturnType<typeof this.analyzeInput>, max: number): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // If industry is general, ask for more detail
    if (analysis.industry === 'general_business' && questions.length < max) {
      questions.push({
        id: 'industry_text',
        question: 'What type of business or industry is this for?',
        type: 'text',
        required: true,
        category: 'business',
      });
    }

    // If team size unknown, ask
    if (!analysis.teamSize && questions.length < max) {
      questions.push({
        id: 'team_size',
        question: 'Will this be used by just you, or a team?',
        type: 'choice',
        options: ['Just me', 'Team'],
        required: true,
        category: 'business',
      });
    }

    return questions.slice(0, max);
  }

  private getInitialQuestions(analysis: ReturnType<typeof this.analyzeInput>): ClarificationQuestion[] {
    // Start with context gate if not clear
    return [{
      id: 'context_gate',
      question: 'Is this for your home or for a business?',
      type: 'choice',
      options: ['Home', 'Business'],
      required: true,
      category: 'context',
    }];
  }

  private getNextQuestions(state: SmartDiscoveryState, max: number): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    // If context is business and we need more info
    if (state.context === 'business') {
      if (!state.answers.industry_text && !state.detectedIndustry && questions.length < max) {
        questions.push({
          id: 'industry_text',
          question: 'What kind of business is it?',
          type: 'text',
          required: true,
          category: 'business',
        });
      }

      if (!state.answers.team_size && questions.length < max) {
        questions.push({
          id: 'team_size',
          question: 'Are you working solo or with a team?',
          type: 'choice',
          options: ['Solo', 'Team'],
          required: true,
          category: 'business',
        });
      }

      if (!state.answers.offer_type && questions.length < max) {
        questions.push({
          id: 'offer_type',
          question: 'Do you mainly sell products, offer services, or both?',
          type: 'choice',
          options: ['Products', 'Services', 'Both'],
          required: true,
          category: 'business',
        });
      }
    }

    return questions.slice(0, max);
  }

  private generateAppConfig(state: SmartDiscoveryState, analysis: ReturnType<typeof this.analyzeInput>): AppConfig {
    return {
      context: analysis.context,
      industryText: analysis.industry,
      teamSize: analysis.teamSize || 'solo',
      offerType: 'services', // Default
      onlineAcceptance: false,
      // Pass through to blueprint engine
      primaryIntent: analysis.intent,
    } as AppConfig & { primaryIntent: string };
  }

  private generateAppConfigFromState(state: SmartDiscoveryState): AppConfig {
    const teamSizeValue = state.answers.team_size;
    const teamSize = teamSizeValue === 'Team' || teamSizeValue === 'team' ? 'team' : 'solo';
    
    const offerTypeValue = String(state.answers.offer_type || '').toLowerCase();
    const offerType = offerTypeValue === 'products' ? 'products' : 
                      offerTypeValue === 'both' ? 'both' : 'services';

    return {
      context: state.context || 'business',
      industryText: state.detectedIndustry || String(state.answers.industry_text || 'general_business'),
      teamSize,
      offerType,
      onlineAcceptance: Boolean(state.answers.online_acceptance),
      primaryIntent: state.detectedIntent || 'operations',
    } as AppConfig & { primaryIntent: string };
  }

  private formatIndustryName(industry: string): string {
    const names: Record<string, string> = {
      'plumber': 'Plumbing',
      'electrician': 'Electrical Services',
      'contractor': 'Construction',
      'cleaning': 'Cleaning Services',
      'bakery': 'Bakery',
      'restaurant': 'Restaurant',
      'salon': 'Beauty Salon',
      'real-estate': 'Real Estate',
      'fitness-coach': 'Fitness Coaching',
      'tutor': 'Tutoring',
      'photographer': 'Photography',
      'ecommerce': 'E-commerce',
      'mechanic': 'Auto Repair',
      'handyman': 'Handyman',
      'medical': 'Healthcare',
      'general_business': 'Business',
    };
    return names[industry] || industry.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
