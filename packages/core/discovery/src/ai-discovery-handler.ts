/**
 * AI-Powered Discovery Handler
 * Uses actual AI to generate contextual, dynamic questions based on user input
 * Falls back to keyword-based analysis when AI is unavailable
 * 
 * Now integrated with Certainty Ledger for gap-driven question generation.
 */

import type { ClarificationQuestion } from './discovery-service.js';
import type { AppConfig } from './mandatory-discovery-service.js';
import type { IndustryKit } from '@neo/blueprint-engine';
import {
  generateFullAIContext,
  detectRequestedFeatures,
  generateIndustryAwarePrompt,
  getIndustryKit,
  formatAssumptions,
  generateSuggestions,
  generateAcknowledgment,
} from './ai-context-provider.js';
import {
  type CertaintyLedger,
  type SlotId,
  createEmptyLedger,
  updateLedgerFromInput,
  isReadyToBuild,
} from '@neo/ai-engine';
import {
  decideForSlot,
  getSlotsToAsk,
  getDecisionSummary,
  getSubVerticalOptions,
  shouldAskSubVertical,
} from '@neo/ai-engine';
import type { TelemetryLogger } from '@neo/ai-engine';

/**
 * AI Provider interface (minimal for discovery)
 */
export interface AIProviderForDiscovery {
  complete(options: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  }): Promise<string>;
}

/**
 * AI discovery state
 */
export interface AIDiscoveryState {
  currentStep: number;
  context?: 'business' | 'home';
  answers: Record<string, unknown>;
  confidence: number;
  questionsAsked: number;
  detectedIndustry?: string;
  detectedIntent?: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
  originalInput: string;
  aiInterpretation?: string;
  /** Certainty Ledger for gap-driven discovery */
  ledger?: CertaintyLedger;
}

/**
 * Enhanced discovery response with assumptions and suggestions
 */
export interface EnhancedDiscoveryResponse {
  acknowledgment: string;
  assumptions: string[];
  suggestions: string[];
  question?: ClarificationQuestion;
  canBuild: boolean;
  ledger: CertaintyLedger;
}

/**
 * AI-generated question
 */
interface AIGeneratedQuestion {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'boolean';
  options?: string[];
  required: boolean;
  category: string;
}

export class AIDiscoveryHandler {
  private maxQuestions = 3;
  private aiProvider?: AIProviderForDiscovery;
  private industryKits: IndustryKit[] = [];
  private telemetryLogger?: TelemetryLogger;

  constructor(
    aiProvider?: AIProviderForDiscovery,
    options?: {
      industryKits?: IndustryKit[];
      telemetryLogger?: TelemetryLogger;
    }
  ) {
    this.aiProvider = aiProvider;
    this.industryKits = options?.industryKits || [];
    this.telemetryLogger = options?.telemetryLogger;
  }

  /**
   * Set the industry kits for AI context
   */
  setIndustryKits(kits: IndustryKit[]): void {
    this.industryKits = kits;
  }

  /**
   * Set the telemetry logger for unmet request tracking
   */
  setTelemetryLogger(logger: TelemetryLogger): void {
    this.telemetryLogger = logger;
  }

  // ============================================================================
  // Gap-Driven Discovery (Certainty Ledger Integration)
  // ============================================================================

  /**
   * Start discovery using the Certainty Ledger for gap-driven questions
   */
  async startDiscoveryWithLedger(input: string): Promise<{
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: AIDiscoveryState;
    appConfig?: AppConfig;
    action: 'auto_build' | 'confirm' | 'clarify' | 'deep_clarify';
    enhanced?: EnhancedDiscoveryResponse;
  }> {
    // Initialize ledger
    let ledger = createEmptyLedger();
    
    // Find matching industry kit
    const kit = this.findBestMatchingKit(input);
    
    // Update ledger from input
    ledger = updateLedgerFromInput(ledger, input, kit);
    
    // Detect unavailable features
    const featureAnalysis = detectRequestedFeatures(input);
    if (featureAnalysis.unavailable.length > 0 && this.telemetryLogger) {
      for (const unavailFeature of featureAnalysis.unavailable) {
        this.telemetryLogger.logUnmetRequest(
          'feature_unavailable',
          input,
          unavailFeature,
          this.suggestAlternative(unavailFeature),
          { requestedFeatures: featureAnalysis }
        );
      }
    }
    
    // Build state
    const state: AIDiscoveryState = {
      currentStep: 0,
      context: 'business',
      answers: {},
      confidence: ledger.overallReadiness,
      questionsAsked: 0,
      detectedIndustry: ledger.industry.value || undefined,
      detectedIntent: 'operations',
      originalInput: input,
      ledger,
    };
    
    // Get decision summary
    const decisionSummary = getDecisionSummary(ledger);
    
    // Build enhanced response
    const matchedKit = getIndustryKit(ledger.industry.value, this.industryKits);
    const enhanced: EnhancedDiscoveryResponse = {
      acknowledgment: generateAcknowledgment(ledger, matchedKit),
      assumptions: formatAssumptions(ledger, matchedKit),
      suggestions: generateSuggestions(matchedKit, ledger),
      canBuild: isReadyToBuild(ledger),
      ledger,
    };
    
    // Determine action based on ledger readiness
    if (isReadyToBuild(ledger) && decisionSummary.toAsk.length === 0) {
      return {
        needsClarification: false,
        questions: [],
        state,
        appConfig: this.generateAppConfigFromState(state),
        action: 'auto_build',
        enhanced,
      };
    }
    
    // Generate questions from gaps
    const questions = this.generateQuestionsFromGaps(ledger);
    
    if (questions.length === 0 && ledger.overallReadiness >= 0.6) {
      // No critical questions, can build with confirmation
      const confirmQuestion: ClarificationQuestion = {
        id: 'confirm_build',
        question: `${enhanced.acknowledgment} ${enhanced.assumptions.length > 0 ? `I've assumed: ${enhanced.assumptions.join(', ')}.` : ''} Ready to build?`,
        type: 'boolean',
        required: true,
        category: 'confirmation',
      };
      enhanced.question = confirmQuestion;
      
      return {
        needsClarification: true,
        questions: [confirmQuestion],
        state,
        appConfig: this.generateAppConfigFromState(state),
        action: 'confirm',
        enhanced,
      };
    }
    
    if (questions.length > 0) {
      enhanced.question = questions[0];
    }
    
    return {
      needsClarification: true,
      questions,
      state,
      action: ledger.overallReadiness >= 0.5 ? 'clarify' : 'deep_clarify',
      enhanced,
    };
  }

  /**
   * Generate questions only from ledger gaps
   * Key principle: Only ask about critical slots, max 1 question per turn
   */
  private generateQuestionsFromGaps(ledger: CertaintyLedger): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];
    const slotsToAsk = getSlotsToAsk(ledger);
    
    for (const slotId of slotsToAsk) {
      const question = this.getQuestionForGap(slotId, ledger);
      if (question) {
        questions.push(question);
      }
    }
    
    // Maximum 1 question per turn (key principle from the plan)
    return questions.slice(0, 1);
  }

  /**
   * Generate a contextual question for a specific gap
   */
  private getQuestionForGap(slotId: SlotId, ledger: CertaintyLedger): ClarificationQuestion | null {
    const industry = ledger.industry.value;
    const matchedKit = getIndustryKit(industry, this.industryKits);
    
    switch (slotId) {
      case 'industry':
        return {
          id: 'industry',
          question: 'What type of business or activity is this app for?',
          type: 'text',
          required: true,
          category: 'business',
        };
      
      case 'subVertical':
        if (industry && shouldAskSubVertical(industry)) {
          const options = getSubVerticalOptions(industry);
          if (options.length > 0) {
            // Generate industry-specific sub-vertical question
            const questionText = this.getSubVerticalQuestion(industry);
            return {
              id: 'subVertical',
              question: questionText,
              type: 'choice',
              options: options.map(o => o.label),
              required: true,
              category: 'business',
            };
          }
        }
        return null;
      
      case 'primaryEntities':
        // This usually comes from the kit, but if missing, ask
        return {
          id: 'primaryEntities',
          question: 'What are the main things you need to track? (e.g., customers, jobs, appointments)',
          type: 'text',
          required: true,
          category: 'business',
        };
      
      case 'teamSize':
        return {
          id: 'teamSize',
          question: 'How many people will use this app?',
          type: 'choice',
          options: ['Just me', '2-5 people', '6-20 people', '20+ people'],
          required: false,
          category: 'business',
        };
      
      case 'scale':
        // Generate industry-specific scale question
        if (matchedKit) {
          const scaleQuestion = this.getScaleQuestion(industry || '');
          if (scaleQuestion) {
            return {
              id: 'scale',
              question: scaleQuestion,
              type: 'text',
              required: false,
              category: 'business',
            };
          }
        }
        return null;
      
      default:
        return null;
    }
  }

  /**
   * Get industry-specific sub-vertical question
   */
  private getSubVerticalQuestion(industry: string): string {
    const questions: Record<string, string> = {
      'real-estate': 'Are you an agent managing listings, or a property manager tracking rentals?',
      'fitness-coach': 'Do you work with clients 1-on-1, run group classes, or coach online?',
      'cleaning': 'Do you focus on home cleaning, commercial spaces, or specialized cleaning?',
    };
    return questions[industry] || 'What type of work do you focus on?';
  }

  /**
   * Get industry-specific scale question
   */
  private getScaleQuestion(industry: string): string | null {
    const questions: Record<string, string> = {
      'property-management': 'How many properties or units do you manage?',
      'gym': 'How many members does your gym have?',
      'restaurant': 'How many tables or daily covers do you typically handle?',
      'salon': 'How many stylists or service providers work at your location?',
      'medical': 'How many patients do you see per week?',
      'tutor': 'How many students do you work with?',
    };
    return questions[industry] || null;
  }

  /**
   * Find the best matching industry kit for the input
   */
  private findBestMatchingKit(input: string): IndustryKit | undefined {
    const lower = input.toLowerCase();
    let bestMatch: { kit: IndustryKit; score: number } | undefined;
    
    for (const kit of this.industryKits) {
      let score = 0;
      
      // Check keywords
      for (const keyword of kit.keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          score += keyword.split(' ').length; // Multi-word phrases score higher
        }
      }
      
      // Check professions
      for (const profession of kit.professions) {
        if (lower.includes(profession.toLowerCase())) {
          score += 2;
        }
      }
      
      // Check kit ID
      if (lower.includes(kit.id.replace(/-/g, ' '))) {
        score += 3;
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { kit, score };
      }
    }
    
    return bestMatch?.kit;
  }

  /**
   * Continue discovery with ledger updates
   */
  async continueDiscoveryWithLedger(
    state: AIDiscoveryState,
    answers: Record<string, unknown>
  ): Promise<{
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: AIDiscoveryState;
    appConfig?: AppConfig;
    enhanced?: EnhancedDiscoveryResponse;
  }> {
    // Get or create ledger
    let ledger = state.ledger || createEmptyLedger();
    
    // Process answers and update ledger
    for (const [key, value] of Object.entries(answers)) {
      const strValue = String(value);
      
      // Update ledger based on answer type
      if (key === 'industry' || key === 'industry_text') {
        const kit = this.findBestMatchingKit(strValue);
        ledger = updateLedgerFromInput(ledger, strValue, kit);
      } else if (key === 'subVertical') {
        ledger = updateLedgerFromInput(ledger, strValue, undefined);
      } else if (key === 'teamSize' || key === 'team_size') {
        const teamSize = this.parseTeamSize(strValue);
        if (teamSize) {
          ledger = {
            ...ledger,
            teamSize: {
              value: teamSize,
              confidence: 0.9,
              source: 'explicit',
              evidence: [strValue],
            },
          };
        }
      } else if (key === 'confirm_build' || key === 'skip_questions') {
        const confirmed = value === true || strValue.toLowerCase() === 'yes' || strValue.toLowerCase() === 'true';
        if (confirmed) {
          // User confirmed, ready to build
          const updatedState: AIDiscoveryState = {
            ...state,
            answers: { ...state.answers, ...answers },
            questionsAsked: state.questionsAsked + Object.keys(answers).length,
            ledger,
          };
          return {
            needsClarification: false,
            questions: [],
            state: updatedState,
            appConfig: this.generateAppConfigFromState(updatedState),
          };
        }
      }
    }
    
    // Update state
    const updatedState: AIDiscoveryState = {
      ...state,
      answers: { ...state.answers, ...answers },
      questionsAsked: state.questionsAsked + Object.keys(answers).length,
      confidence: ledger.overallReadiness,
      detectedIndustry: ledger.industry.value || state.detectedIndustry,
      ledger,
    };
    
    // Check if we've hit max questions
    if (updatedState.questionsAsked >= this.maxQuestions) {
      return {
        needsClarification: false,
        questions: [],
        state: updatedState,
        appConfig: this.generateAppConfigFromState(updatedState),
      };
    }
    
    // Check if ready to build
    if (isReadyToBuild(ledger)) {
      const matchedKit = getIndustryKit(ledger.industry.value, this.industryKits);
      const enhanced: EnhancedDiscoveryResponse = {
        acknowledgment: generateAcknowledgment(ledger, matchedKit),
        assumptions: formatAssumptions(ledger, matchedKit),
        suggestions: generateSuggestions(matchedKit, ledger),
        canBuild: true,
        ledger,
      };
      
      return {
        needsClarification: false,
        questions: [],
        state: updatedState,
        appConfig: this.generateAppConfigFromState(updatedState),
        enhanced,
      };
    }
    
    // Generate more questions from gaps
    const questions = this.generateQuestionsFromGaps(ledger);
    
    const matchedKit = getIndustryKit(ledger.industry.value, this.industryKits);
    const enhanced: EnhancedDiscoveryResponse = {
      acknowledgment: generateAcknowledgment(ledger, matchedKit),
      assumptions: formatAssumptions(ledger, matchedKit),
      suggestions: generateSuggestions(matchedKit, ledger),
      question: questions[0],
      canBuild: isReadyToBuild(ledger),
      ledger,
    };
    
    return {
      needsClarification: questions.length > 0,
      questions,
      state: updatedState,
      enhanced,
    };
  }

  /**
   * Parse team size answer to standard format
   */
  private parseTeamSize(answer: string): 'solo' | 'small' | 'medium' | 'large' | null {
    const lower = answer.toLowerCase();
    if (lower.includes('just me') || lower.includes('solo') || lower === '1') {
      return 'solo';
    }
    if (lower.includes('2-5') || lower.includes('small') || lower.includes('team')) {
      return 'small';
    }
    if (lower.includes('6-20') || lower.includes('medium')) {
      return 'medium';
    }
    if (lower.includes('20+') || lower.includes('large')) {
      return 'large';
    }
    return null;
  }

  /**
   * Start discovery with AI-powered analysis
   */
  async startDiscovery(input: string): Promise<{
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: AIDiscoveryState;
    appConfig?: AppConfig;
    action: 'auto_build' | 'confirm' | 'clarify' | 'deep_clarify';
  }> {
    // Try AI-powered analysis first
    if (this.aiProvider) {
      try {
        return await this.aiPoweredDiscovery(input);
      } catch (error: any) {
        console.error('AI discovery failed, falling back to keyword analysis:', error?.message || error);
      }
    }

    // Fallback to keyword-based analysis
    return this.keywordBasedDiscovery(input);
  }

  /**
   * Continue discovery with answers
   */
  async continueDiscovery(
    state: AIDiscoveryState,
    answers: Record<string, unknown>
  ): Promise<{
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: AIDiscoveryState;
    appConfig?: AppConfig;
    isHomePlaceholder?: boolean;
  }> {
    // Update state with new answers
    const updatedState: AIDiscoveryState = {
      ...state,
      answers: { ...state.answers, ...answers },
      questionsAsked: state.questionsAsked + Object.keys(answers).length,
    };

    // Handle confirmation response
    if (answers.confirm_build !== undefined) {
      const confirmValue = String(answers.confirm_build).toLowerCase();
      if (answers.confirm_build === true || confirmValue === 'yes' || confirmValue === 'true') {
        const appConfig = this.generateAppConfigFromState(updatedState);
        return {
          needsClarification: false,
          questions: [],
          state: updatedState,
          appConfig,
        };
      }
      // User wants changes - ask more questions
      updatedState.confidence = 0.60;
    }

    // Check if we've hit max questions - force build
    if (updatedState.questionsAsked >= this.maxQuestions) {
      const appConfig = this.generateAppConfigFromState(updatedState);
      return {
        needsClarification: false,
        questions: [],
        state: updatedState,
        appConfig,
      };
    }

    // Try AI-powered follow-up
    if (this.aiProvider) {
      try {
        const result = await this.aiPoweredFollowUp(updatedState, answers);
        return result;
      } catch (error) {
        console.error('AI follow-up failed:', error);
      }
    }

    // Fallback: Calculate if we have enough info
    const appConfig = this.generateAppConfigFromState(updatedState);
    return {
      needsClarification: false,
      questions: [],
      state: updatedState,
      appConfig,
    };
  }

  /**
   * AI-powered discovery analysis
   */
  private async aiPoweredDiscovery(input: string): Promise<{
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: AIDiscoveryState;
    appConfig?: AppConfig;
    action: 'auto_build' | 'confirm' | 'clarify' | 'deep_clarify';
  }> {
    // Detect any requested features that aren't available
    const featureAnalysis = detectRequestedFeatures(input);
    if (featureAnalysis.unavailable.length > 0 && this.telemetryLogger) {
      for (const unavailFeature of featureAnalysis.unavailable) {
        this.telemetryLogger.logUnmetRequest(
          'feature_unavailable',
          input,
          unavailFeature,
          this.suggestAlternative(unavailFeature),
          { requestedFeatures: featureAnalysis }
        );
      }
    }

    // Generate context-aware system prompt
    const kitContext = this.industryKits.length > 0
      ? generateFullAIContext(this.industryKits)
      : '';

    const systemPrompt = `You are an intelligent app builder assistant. Analyze the user's request and determine:
1. What type of business/industry they're describing
2. What they want the app to do (operations, customer-facing, internal tools, or hybrid)
3. How confident you are in your understanding (0.0 to 1.0)
4. What clarifying questions would help you understand better (if needed)
${kitContext}

IMPORTANT: Generate questions that are SPECIFIC to what the user said, not generic.
For example:
- If they say "real estate app" ask "Are you an agent managing listings, or a property manager tracking rentals?"
- If they say "restaurant" ask "Is this for table reservations, online ordering, or kitchen management?"
- If they say "fitness" ask "Are you a personal trainer managing clients, or running a gym with memberships?"

CONFIDENCE SCORING:
- 0.90+: Very clear request, you understand exactly what they need
- 0.75-0.89: Clear enough to proceed with confirmation
- 0.50-0.74: Need 1-2 clarifying questions
- Below 0.50: Very unclear, need more information

RESPOND IN JSON FORMAT:
{
  "industry": "detected industry name (use kit ID if matching available kit)",
  "matchedKit": "the ID of the matched kit, or null if no good match",
  "kitMatchConfidence": "exact|close|fallback",
  "primaryIntent": "operations|customer-facing|internal|hybrid",
  "confidence": 0.0-1.0,
  "interpretation": "brief explanation of what you understood",
  "unavailableFeatures": ["list of requested features that aren't available"],
  "suggestedAlternatives": {"feature": "alternative"},
  "questions": [
    {
      "id": "unique_id",
      "question": "Your specific, contextual question",
      "type": "choice|text|boolean",
      "options": ["Option 1", "Option 2"] // only for choice type
    }
  ]
}

Only include questions if confidence < 0.90. Maximum 2 questions.
Be transparent about kit matching - if using a kit that isn't a perfect match, mention this in interpretation.`;

    const userPrompt = `User wants to build: "${input}"

Analyze this and respond with JSON.`;

    const response = await this.aiProvider!.complete({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.3,
      timeout: 15000,
    });

    // Parse AI response
    const parsed = this.parseAIResponse(response);
    
    const state: AIDiscoveryState = {
      currentStep: 0,
      context: 'business', // AI analysis assumes business context for now
      answers: {},
      confidence: parsed.confidence,
      questionsAsked: 0,
      detectedIndustry: parsed.industry,
      detectedIntent: parsed.primaryIntent,
      originalInput: input,
      aiInterpretation: parsed.interpretation,
    };

    // Determine action based on confidence
    if (parsed.confidence >= 0.90) {
      return {
        needsClarification: false,
        questions: [],
        state,
        appConfig: this.generateAppConfigFromState(state),
        action: 'auto_build',
      };
    }

    if (parsed.confidence >= 0.75) {
      // If AI generated good questions, use those instead of generic confirmation
      if (parsed.questions && parsed.questions.length > 0) {
        const questions = this.convertAIQuestions(parsed.questions);
        // Add a confirmation option at the end
        questions.push({
          id: 'skip_questions',
          question: `Or skip these questions and build a ${this.formatIndustryName(parsed.industry)} app now?`,
          type: 'boolean',
          required: false,
          category: 'confirmation',
        });
        return {
          needsClarification: true,
          questions,
          state,
          appConfig: this.generateAppConfigFromState(state),
          action: 'clarify', // Use clarify to show the AI questions
        };
      }
      
      // Fallback to simple confirmation if no AI questions
      const confirmQuestion: ClarificationQuestion = {
        id: 'confirm_build',
        question: `I'll create a ${this.formatIndustryName(parsed.industry)} app ${parsed.interpretation ? `focused on ${parsed.interpretation}` : 'for your business'}. Does this look right?`,
        type: 'boolean',
        required: true,
        category: 'confirmation',
      };
      return {
        needsClarification: true,
        questions: [confirmQuestion],
        state,
        appConfig: this.generateAppConfigFromState(state),
        action: 'confirm',
      };
    }

    // Convert AI questions to ClarificationQuestion format
    const questions = this.convertAIQuestions(parsed.questions);
    
    return {
      needsClarification: true,
      questions,
      state,
      action: parsed.confidence >= 0.50 ? 'clarify' : 'deep_clarify',
    };
  }

  /**
   * AI-powered follow-up after receiving answers
   */
  private async aiPoweredFollowUp(
    state: AIDiscoveryState,
    newAnswers: Record<string, unknown>
  ): Promise<{
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: AIDiscoveryState;
    appConfig?: AppConfig;
    isHomePlaceholder?: boolean;
  }> {
    const systemPrompt = `You are helping build an app. The user already provided some information.
Based on their original request and answers, determine if you have enough information to proceed.

RESPOND IN JSON FORMAT:
{
  "readyToBuild": true/false,
  "updatedIndustry": "industry name if changed",
  "updatedIntent": "operations|customer-facing|internal|hybrid",
  "confidence": 0.0-1.0,
  "interpretation": "updated understanding",
  "questions": [] // only if readyToBuild is false, max 1-2 questions
}`;

    const userPrompt = `Original request: "${state.originalInput}"
Previous understanding: ${state.aiInterpretation || 'None'}
Detected industry: ${state.detectedIndustry}

User's answers: ${JSON.stringify(newAnswers, null, 2)}

Should we proceed to build, or do you need more information?`;

    const response = await this.aiProvider!.complete({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 800,
      temperature: 0.3,
      timeout: 15000,
    });

    const parsed = this.parseFollowUpResponse(response);
    
    const updatedState: AIDiscoveryState = {
      ...state,
      confidence: parsed.confidence,
      detectedIndustry: parsed.updatedIndustry || state.detectedIndustry,
      detectedIntent: parsed.updatedIntent || state.detectedIntent,
      aiInterpretation: parsed.interpretation || state.aiInterpretation,
    };

    if (parsed.readyToBuild || state.questionsAsked >= this.maxQuestions) {
      return {
        needsClarification: false,
        questions: [],
        state: updatedState,
        appConfig: this.generateAppConfigFromState(updatedState),
      };
    }

    const questions = this.convertAIQuestions(parsed.questions || []);
    return {
      needsClarification: true,
      questions,
      state: updatedState,
    };
  }

  /**
   * Parse AI response JSON
   */
  private parseAIResponse(response: string): {
    industry: string;
    matchedKit?: string;
    kitMatchConfidence?: 'exact' | 'close' | 'fallback';
    primaryIntent: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
    confidence: number;
    interpretation?: string;
    unavailableFeatures?: string[];
    suggestedAlternatives?: Record<string, string>;
    questions: AIGeneratedQuestion[];
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        const result = {
          industry: parsed.industry || 'general_business',
          matchedKit: parsed.matchedKit,
          kitMatchConfidence: parsed.kitMatchConfidence,
          primaryIntent: parsed.primaryIntent || 'operations',
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
          interpretation: parsed.interpretation,
          unavailableFeatures: parsed.unavailableFeatures,
          suggestedAlternatives: parsed.suggestedAlternatives,
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        };

        // Log unmet requests from AI analysis
        this.processAIUnmetRequests(result);

        return result;
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback defaults
    return {
      industry: 'general_business',
      primaryIntent: 'operations',
      confidence: 0.5,
      questions: [],
    };
  }

  /**
   * Process and log unmet requests identified by AI
   */
  private processAIUnmetRequests(result: {
    industry: string;
    matchedKit?: string;
    kitMatchConfidence?: string;
    unavailableFeatures?: string[];
    suggestedAlternatives?: Record<string, string>;
  }): void {
    if (!this.telemetryLogger) return;

    // Log if industry doesn't have an exact kit match
    if (result.kitMatchConfidence === 'fallback' || result.kitMatchConfidence === 'close') {
      const fallbackKit = result.matchedKit || 'general_business';
      this.logUnmetIndustryRequest(
        '', // Will be filled by caller if needed
        result.industry,
        fallbackKit
      );
    }

    // Log unavailable features from AI analysis
    if (result.unavailableFeatures && result.unavailableFeatures.length > 0) {
      for (const feature of result.unavailableFeatures) {
        const alternative = result.suggestedAlternatives?.[feature] 
          || this.suggestAlternative(feature);
        
        this.telemetryLogger.logUnmetRequest(
          'feature_unavailable',
          '', // Original input not available here
          feature,
          alternative
        );
      }
    }
  }

  /**
   * Parse follow-up AI response
   */
  private parseFollowUpResponse(response: string): {
    readyToBuild: boolean;
    updatedIndustry?: string;
    updatedIntent?: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
    confidence: number;
    interpretation?: string;
    questions?: AIGeneratedQuestion[];
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          readyToBuild: parsed.readyToBuild ?? true,
          updatedIndustry: parsed.updatedIndustry,
          updatedIntent: parsed.updatedIntent,
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0.75)),
          interpretation: parsed.interpretation,
          questions: parsed.questions,
        };
      }
    } catch (error) {
      console.error('Failed to parse follow-up response:', error);
    }

    return { readyToBuild: true, confidence: 0.75 };
  }

  /**
   * Convert AI questions to ClarificationQuestion format
   */
  private convertAIQuestions(aiQuestions: AIGeneratedQuestion[]): ClarificationQuestion[] {
    return aiQuestions.slice(0, 2).map((q, index) => ({
      id: q.id || `ai_question_${index}`,
      question: q.question,
      type: q.type === 'choice' ? 'choice' : q.type === 'boolean' ? 'boolean' : 'text',
      options: q.options,
      required: true,
      category: 'ai_generated',
    }));
  }

  /**
   * Keyword-based discovery fallback
   */
  private keywordBasedDiscovery(input: string): {
    needsClarification: boolean;
    questions: ClarificationQuestion[];
    state: AIDiscoveryState;
    appConfig?: AppConfig;
    action: 'auto_build' | 'confirm' | 'clarify' | 'deep_clarify';
  } {
    const analysis = this.analyzeInput(input);
    
    const state: AIDiscoveryState = {
      currentStep: 0,
      context: analysis.context,
      answers: {},
      confidence: analysis.confidence,
      questionsAsked: 0,
      detectedIndustry: analysis.industry,
      detectedIntent: analysis.intent,
      originalInput: input,
    };

    if (analysis.confidence >= 0.90) {
      return {
        needsClarification: false,
        questions: [],
        state,
        appConfig: this.generateAppConfigFromState(state),
        action: 'auto_build',
      };
    }

    if (analysis.confidence >= 0.75) {
      const confirmQuestion: ClarificationQuestion = {
        id: 'confirm_build',
        question: `I'll create a ${this.formatIndustryName(analysis.industry)} app focused on business operations. Does this look right?`,
        type: 'boolean',
        required: true,
        category: 'confirmation',
      };
      return {
        needsClarification: true,
        questions: [confirmQuestion],
        state,
        appConfig: this.generateAppConfigFromState(state),
        action: 'confirm',
      };
    }

    // Generate contextual fallback questions
    const questions = this.generateFallbackQuestions(analysis);
    return {
      needsClarification: true,
      questions,
      state,
      action: analysis.confidence >= 0.50 ? 'clarify' : 'deep_clarify',
    };
  }

  /**
   * Generate fallback questions based on what's missing
   */
  private generateFallbackQuestions(analysis: ReturnType<typeof this.analyzeInput>): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    if (analysis.industry === 'general_business') {
      questions.push({
        id: 'industry_text',
        question: 'What type of business or industry is this for?',
        type: 'text',
        required: true,
        category: 'business',
      });
    }

    if (!analysis.teamSize && questions.length < 2) {
      questions.push({
        id: 'team_size',
        question: 'Will this be used by just you, or a team?',
        type: 'choice',
        options: ['Just me', 'Team'],
        required: true,
        category: 'business',
      });
    }

    return questions.slice(0, 2);
  }

  /**
   * Analyze input using keywords
   */
  private analyzeInput(input: string): {
    industry: string;
    context: 'business' | 'home';
    intent: 'operations' | 'customer-facing' | 'internal' | 'hybrid';
    teamSize?: 'solo' | 'team';
    confidence: number;
  } {
    const lower = input.toLowerCase();
    
    // Industry detection
    const industryResult = this.detectIndustry(lower);
    
    // Intent detection
    const intent = this.detectIntent(lower);
    
    // Team size
    const teamSize = this.detectTeamSize(lower);
    
    // Confidence calculation
    let confidence = 0.40;
    if (industryResult.industry !== 'general_business') confidence += 0.25;
    if (industryResult.context) confidence += 0.10;
    if (teamSize) confidence += 0.10;
    if (/\b(my business|our company|for work|professional)\b/i.test(input)) confidence += 0.10;

    return {
      industry: industryResult.industry,
      context: industryResult.context,
      intent,
      teamSize,
      confidence: Math.min(1, confidence),
    };
  }

  private detectIndustry(input: string): { industry: string; context: 'business' | 'home' } {
    // Expanded keywords including new sub-vertical kits
    const INDUSTRY_KEYWORDS: Record<string, { keywords: string[]; context: 'business' | 'home'; weight?: number }> = {
      // Sub-verticals with higher weights (more specific matches first)
      'property-management': { keywords: ['property management', 'landlord', 'tenant', 'lease', 'rent collection', 'rental property', 'apartment manager'], context: 'business', weight: 2 },
      'gym': { keywords: ['gym', 'fitness studio', 'membership', 'fitness class', 'member signup', 'workout class'], context: 'business', weight: 2 },
      'commercial-cleaning': { keywords: ['commercial cleaning', 'janitorial', 'office cleaning', 'facility cleaning', 'building maintenance'], context: 'business', weight: 2 },
      
      // Home service trades
      'plumber': { keywords: ['plumber', 'plumbing', 'pipe', 'leak', 'drain', 'water heater'], context: 'business' },
      'electrician': { keywords: ['electrician', 'electrical', 'wiring', 'circuit', 'panel'], context: 'business' },
      'hvac': { keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace'], context: 'business' },
      'roofing': { keywords: ['roofing', 'roof', 'shingle', 'gutter'], context: 'business' },
      'handyman': { keywords: ['handyman', 'home repair', 'odd jobs'], context: 'business' },
      'contractor': { keywords: ['contractor', 'construction', 'renovation', 'builder', 'remodel'], context: 'business' },
      
      // Service businesses
      'restaurant': { keywords: ['restaurant', 'cafe', 'dining', 'menu', 'food', 'takeout', 'table', 'reservation'], context: 'business' },
      'real-estate': { keywords: ['real estate', 'realtor', 'listing', 'broker', 'home sale', 'buy sell'], context: 'business' },
      'salon': { keywords: ['salon', 'beauty', 'hair', 'spa', 'nail', 'barber', 'stylist'], context: 'business' },
      'fitness-coach': { keywords: ['personal trainer', 'fitness coach', '1-on-1 training', 'workout coach'], context: 'business' },
      'cleaning': { keywords: ['cleaning', 'cleaner', 'maid', 'housekeeping', 'home cleaning'], context: 'business' },
      'landscaping': { keywords: ['landscaping', 'lawn', 'garden', 'yard', 'lawn care'], context: 'business' },
      
      // Health & education
      'medical': { keywords: ['medical', 'clinic', 'doctor', 'patient', 'health', 'dental', 'therapy'], context: 'business' },
      'home-health': { keywords: ['home health', 'caregiver', 'senior care', 'elderly care', 'home aide'], context: 'business' },
      'tutor': { keywords: ['tutor', 'tutoring', 'lesson', 'student', 'teaching', 'education'], context: 'business' },
      
      // Retail & commerce
      'ecommerce': { keywords: ['shop', 'ecommerce', 'store', 'online store', 'sell products'], context: 'business' },
      'bakery': { keywords: ['bakery', 'baker', 'pastry', 'bread', 'cake'], context: 'business' },
      
      // Auto & photo
      'mechanic': { keywords: ['mechanic', 'auto repair', 'car repair', 'vehicle', 'automotive'], context: 'business' },
      'photographer': { keywords: ['photographer', 'photo', 'shoot', 'photography'], context: 'business' },
    };

    let bestMatch: { industry: string; context: 'business' | 'home'; score: number } = { 
      industry: 'general_business', context: 'business', score: 0 
    };

    for (const [industry, config] of Object.entries(INDUSTRY_KEYWORDS)) {
      let score = 0;
      const weight = config.weight || 1;
      
      for (const keyword of config.keywords) {
        if (input.includes(keyword)) {
          // Multi-word phrases get higher scores
          score += keyword.split(' ').length * weight;
        }
      }
      
      if (score > bestMatch.score) {
        bestMatch = { industry, context: config.context, score };
      }
    }

    return { industry: bestMatch.industry, context: bestMatch.context };
  }

  private detectIntent(input: string): 'operations' | 'customer-facing' | 'internal' | 'hybrid' {
    if (/\b(customer|client|booking|appointment|portal)\b/i.test(input)) return 'customer-facing';
    if (/\b(team|staff|employee|internal)\b/i.test(input)) return 'internal';
    if (/\b(both|full|complete|end-to-end)\b/i.test(input)) return 'hybrid';
    return 'operations';
  }

  private detectTeamSize(input: string): 'solo' | 'team' | undefined {
    if (/\b(solo|myself|just me|one person|freelance)\b/i.test(input)) return 'solo';
    if (/\b(team|staff|employees|crew|workers)\b/i.test(input)) return 'team';
    return undefined;
  }

  private formatIndustryName(industry: string): string {
    const names: Record<string, string> = {
      'plumber': 'Plumbing',
      'electrician': 'Electrical Services',
      'hvac': 'HVAC Services',
      'roofing': 'Roofing',
      'handyman': 'Handyman Services',
      'contractor': 'Construction',
      'restaurant': 'Restaurant',
      'real-estate': 'Real Estate',
      'property-management': 'Property Management',
      'salon': 'Beauty Salon',
      'fitness-coach': 'Personal Training',
      'gym': 'Gym/Fitness Studio',
      'cleaning': 'Cleaning Services',
      'commercial-cleaning': 'Commercial Cleaning',
      'landscaping': 'Landscaping',
      'medical': 'Healthcare',
      'home-health': 'Home Health Care',
      'tutor': 'Tutoring',
      'ecommerce': 'E-commerce',
      'bakery': 'Bakery',
      'mechanic': 'Auto Repair',
      'photographer': 'Photography',
      'general_business': 'Business',
    };
    return names[industry] || industry.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private generateAppConfigFromState(state: AIDiscoveryState): AppConfig {
    return {
      context: state.context || 'business',
      industryText: state.detectedIndustry || 'general_business',
      teamSize: (state.answers.team_size === 'Team' || state.answers.team_size === 'team') ? 'team' : 'solo',
      offerType: 'services',
      onlineAcceptance: false,
    } as AppConfig;
  }

  /**
   * Suggest an alternative for an unavailable feature
   */
  private suggestAlternative(unavailableFeature: string): string {
    const alternatives: Record<string, string> = {
      'fax': 'email or SMS notifications',
      'document signing': 'PDF generation + email',
      'QuickBooks integration': 'CSV export + Google Sheets sync',
      'Xero integration': 'CSV export + Google Sheets sync',
      'accounting software': 'CSV export + Google Sheets sync',
      'social media posting': 'Zapier integration',
      'Instagram integration': 'Zapier integration',
      'Facebook integration': 'Zapier integration',
      'video conferencing': 'external link to Zoom/Meet',
      'AI chatbot': 'webhook integration',
      'custom mobile app': 'responsive web app',
      'POS terminal integration': 'manual entry + Stripe payments',
      'printer integration': 'PDF export',
    };

    const lower = unavailableFeature.toLowerCase();
    for (const [key, value] of Object.entries(alternatives)) {
      if (lower.includes(key.toLowerCase())) {
        return value;
      }
    }
    return 'contact support for custom solutions';
  }

  /**
   * Log an unmet industry request (no matching kit)
   */
  private logUnmetIndustryRequest(
    originalInput: string,
    requestedIndustry: string,
    fallbackKit: string
  ): void {
    if (this.telemetryLogger) {
      this.telemetryLogger.logUnmetRequest(
        'industry_no_kit',
        originalInput,
        requestedIndustry,
        fallbackKit,
        { industryKitsAvailable: this.industryKits.map(k => k.id) }
      );
    }
  }

  /**
   * Check if an industry has a matching kit
   */
  private hasMatchingKit(industry: string): boolean {
    const lower = industry.toLowerCase();
    return this.industryKits.some(kit =>
      kit.id === lower ||
      kit.name.toLowerCase() === lower ||
      kit.keywords.some(k => k.toLowerCase() === lower) ||
      kit.professions.some(p => p.toLowerCase().includes(lower))
    );
  }

  /**
   * Find the best fallback kit for an industry
   */
  private findFallbackKit(industry: string): string {
    const lower = industry.toLowerCase();
    
    // Industry mapping to fallbacks
    const fallbackMap: Record<string, string> = {
      'veterinary': 'medical',
      'vet': 'medical',
      'pet': 'medical',
      'dentist': 'medical',
      'chiropractor': 'medical',
      'consulting': 'fitness-coach',
      'coaching': 'fitness-coach',
      'therapy': 'medical',
      'auto detailing': 'cleaning',
      'car wash': 'cleaning',
      'moving': 'contractor',
      'catering': 'bakery',
      'florist': 'ecommerce',
      'flower shop': 'ecommerce',
      'retail': 'ecommerce',
    };

    for (const [key, value] of Object.entries(fallbackMap)) {
      if (lower.includes(key)) {
        return value;
      }
    }

    return 'general_business';
  }
}
