/**
 * AI Understanding Service (Call 1)
 * Extracts industry, primary intent, and confidence from user input
 */

import type { AIProvider } from './providers/types.js';

/**
 * Primary intent types for app creation
 */
export type PrimaryIntent = 'operations' | 'customer-facing' | 'internal' | 'hybrid';

/**
 * Clarifying question for low-confidence scenarios
 */
export interface ClarifyingQuestion {
  id: string;
  text: string;
  options?: string[];
  type: 'single' | 'multiple' | 'freeform';
}

/**
 * Context extracted from user input
 */
export interface ExtractedContext {
  teamSize?: 'solo' | 'small' | 'medium' | 'large';
  features?: string[];
  preferences?: string[];
  businessModel?: string;
  targetAudience?: string;
  customDetails?: Record<string, unknown>;
}

/**
 * Output from AI Understanding Service (Call 1)
 */
export interface UnderstandingResult {
  /** Matched industry kit ID */
  industry: string;
  /** Primary intent type */
  primaryIntent: PrimaryIntent;
  /** Confidence score 0.0-1.0 */
  confidence: number;
  /** Extracted context details */
  context: ExtractedContext;
  /** Suggested clarifying questions (max 3) */
  suggestedQuestions: ClarifyingQuestion[];
  /** Raw interpretation for debugging */
  interpretation?: string;
}

/**
 * Industry keywords for matching
 */
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'plumber': ['plumber', 'plumbing', 'pipe', 'leak', 'drain', 'water heater', 'faucet'],
  'electrician': ['electrician', 'electrical', 'wiring', 'circuit', 'panel', 'outlet'],
  'contractor': ['contractor', 'construction', 'renovation', 'remodel', 'builder'],
  'cleaning': ['cleaning', 'cleaner', 'janitorial', 'maid', 'housekeeping'],
  'bakery': ['bakery', 'baker', 'pastry', 'bread', 'cake', 'dessert'],
  'restaurant': ['restaurant', 'cafe', 'dining', 'menu', 'reservation', 'food service'],
  'salon': ['salon', 'beauty', 'hair', 'spa', 'nail', 'barber', 'stylist'],
  'real-estate': ['real estate', 'realtor', 'property', 'listing', 'broker', 'housing'],
  'fitness-coach': ['fitness', 'trainer', 'coach', 'gym', 'workout', 'personal training'],
  'tutor': ['tutor', 'tutoring', 'lesson', 'teaching', 'education', 'student'],
  'photographer': ['photographer', 'photography', 'photo', 'shoot', 'portrait'],
  'ecommerce': ['shop', 'ecommerce', 'store', 'online', 'sell', 'product'],
  'mechanic': ['mechanic', 'auto', 'car', 'vehicle', 'repair shop', 'garage'],
  'handyman': ['handyman', 'repair', 'maintenance', 'fix', 'home repair'],
  'roofing': ['roof', 'roofing', 'shingles', 'gutter'],
  'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace'],
  'landscaping': ['landscaping', 'lawn', 'garden', 'yard', 'outdoor'],
  'medical': ['medical', 'clinic', 'doctor', 'patient', 'healthcare', 'health'],
  'home-health': ['home health', 'caregiver', 'aide', 'nursing', 'elderly care'],
  'general_business': ['business', 'company', 'service', 'management', 'general'],
};

/**
 * Intent keywords for determining primary intent
 */
const INTENT_KEYWORDS: Record<PrimaryIntent, string[]> = {
  'operations': ['manage', 'track', 'schedule', 'workflow', 'organize', 'internal', 'operations', 'backend'],
  'customer-facing': ['customer', 'client', 'booking', 'appointment', 'portal', 'public', 'website', 'storefront'],
  'internal': ['team', 'staff', 'employee', 'internal', 'private', 'admin'],
  'hybrid': ['both', 'customer and team', 'full', 'complete', 'end-to-end'],
};

export class AIUnderstandingService {
  private questionCount = 0;
  private maxQuestions = 3;

  constructor(private aiProvider: AIProvider) {}

  /**
   * Analyze user input and extract understanding
   */
  async understand(
    input: string,
    previousAnswers?: Record<string, unknown>
  ): Promise<UnderstandingResult> {
    // Track question count to enforce max 3 questions
    if (previousAnswers) {
      this.questionCount++;
    }

    // Try AI-powered analysis first
    try {
      const aiResult = await this.analyzeWithAI(input, previousAnswers);
      return this.validateAndNormalize(aiResult, input);
    } catch (error) {
      // Fallback to keyword-based analysis
      return this.fallbackAnalysis(input, previousAnswers);
    }
  }

  /**
   * Reset question counter (for new sessions)
   */
  resetQuestionCount(): void {
    this.questionCount = 0;
  }

  /**
   * Get remaining questions allowed
   */
  getRemainingQuestions(): number {
    return Math.max(0, this.maxQuestions - this.questionCount);
  }

  private async analyzeWithAI(
    input: string,
    previousAnswers?: Record<string, unknown>
  ): Promise<UnderstandingResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, previousAnswers);

    const response = await this.aiProvider.complete({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 1500,
      temperature: 0.3,
      timeout: 20000,
      schema: {
        type: 'object',
        properties: {
          industry: { type: 'string' },
          primaryIntent: { type: 'string', enum: ['operations', 'customer-facing', 'internal', 'hybrid'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          context: {
            type: 'object',
            properties: {
              teamSize: { type: 'string', enum: ['solo', 'small', 'medium', 'large'] },
              features: { type: 'array', items: { type: 'string' } },
              preferences: { type: 'array', items: { type: 'string' } },
              businessModel: { type: 'string' },
              targetAudience: { type: 'string' },
            },
          },
          suggestedQuestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                type: { type: 'string', enum: ['single', 'multiple', 'freeform'] },
              },
            },
            maxItems: 3,
          },
          interpretation: { type: 'string' },
        },
        required: ['industry', 'primaryIntent', 'confidence', 'context', 'suggestedQuestions'],
      },
    });

    return response as UnderstandingResult;
  }

  private buildSystemPrompt(): string {
    const industries = Object.keys(INDUSTRY_KEYWORDS).join(', ');
    
    return `You are an intelligent app builder assistant. Your task is to understand what kind of business app the user wants to create.

AVAILABLE INDUSTRIES:
${industries}

PRIMARY INTENT TYPES:
- operations: Internal business operations (scheduling, inventory, workflow management)
- customer-facing: Customer/client interaction (booking portals, storefronts, client portals)
- internal: Team/staff management only (employee tracking, internal tools)
- hybrid: Both operations and customer-facing features

CONFIDENCE SCORING:
- 0.90-1.0: Very clear, specific request with industry and features mentioned
- 0.75-0.89: Clear industry but missing some details
- 0.50-0.74: Vague request, needs 1-2 clarifications
- 0.0-0.49: Very unclear, needs deeper clarification

QUESTION GUIDELINES:
- Only suggest questions if confidence < 0.90
- Questions should be specific and actionable
- Maximum 3 questions total across all interactions
- Prioritize questions that increase confidence the most

Return a JSON object with:
- industry: Best matching industry ID from the list
- primaryIntent: One of the intent types
- confidence: Score from 0 to 1
- context: Extracted details about team size, features, preferences
- suggestedQuestions: Array of clarifying questions (max 3)
- interpretation: Brief explanation of your understanding`;
  }

  private buildUserPrompt(input: string, previousAnswers?: Record<string, unknown>): string {
    let prompt = `User Input: "${input}"`;
    
    if (previousAnswers && Object.keys(previousAnswers).length > 0) {
      prompt += `\n\nPrevious Answers:\n${JSON.stringify(previousAnswers, null, 2)}`;
    }

    prompt += `\n\nAnalyze this request and return the understanding result.`;
    
    return prompt;
  }

  private validateAndNormalize(result: UnderstandingResult, originalInput: string): UnderstandingResult {
    // Ensure industry is valid
    const validIndustries = Object.keys(INDUSTRY_KEYWORDS);
    if (!validIndustries.includes(result.industry)) {
      result.industry = this.detectIndustryFromKeywords(originalInput);
    }

    // Ensure primaryIntent is valid
    const validIntents: PrimaryIntent[] = ['operations', 'customer-facing', 'internal', 'hybrid'];
    if (!validIntents.includes(result.primaryIntent)) {
      result.primaryIntent = this.detectIntentFromKeywords(originalInput);
    }

    // Clamp confidence
    result.confidence = Math.max(0, Math.min(1, result.confidence));

    // Limit questions based on remaining allowance
    const remainingQuestions = this.getRemainingQuestions();
    if (result.suggestedQuestions.length > remainingQuestions) {
      result.suggestedQuestions = result.suggestedQuestions.slice(0, remainingQuestions);
    }

    // If we've hit max questions, clear suggestions and bump confidence
    if (remainingQuestions === 0) {
      result.suggestedQuestions = [];
      result.confidence = Math.max(result.confidence, 0.75); // Ensure we proceed with build
    }

    // Ensure context object exists
    if (!result.context) {
      result.context = {};
    }

    return result;
  }

  private fallbackAnalysis(input: string, previousAnswers?: Record<string, unknown>): UnderstandingResult {
    const industry = this.detectIndustryFromKeywords(input);
    const primaryIntent = this.detectIntentFromKeywords(input);
    const teamSize = this.detectTeamSize(input);
    const features = this.detectFeatures(input);

    // Calculate confidence based on specificity
    let confidence = 0.5;
    if (industry !== 'general_business') confidence += 0.2;
    if (features.length > 0) confidence += 0.1;
    if (previousAnswers && Object.keys(previousAnswers).length > 0) confidence += 0.1;

    // Generate questions if confidence is low
    const suggestedQuestions: ClarifyingQuestion[] = [];
    if (confidence < 0.75 && this.getRemainingQuestions() > 0) {
      if (industry === 'general_business') {
        suggestedQuestions.push({
          id: 'industry',
          text: 'What type of business is this app for?',
          type: 'freeform',
        });
      }
      if (!teamSize) {
        suggestedQuestions.push({
          id: 'teamSize',
          text: 'How many people will use this app?',
          options: ['Just me', '2-5 people', '6-20 people', '20+ people'],
          type: 'single',
        });
      }
    }

    return {
      industry,
      primaryIntent,
      confidence: Math.min(confidence, 1),
      context: {
        teamSize,
        features,
        preferences: [],
      },
      suggestedQuestions: suggestedQuestions.slice(0, this.getRemainingQuestions()),
    };
  }

  private detectIndustryFromKeywords(input: string): string {
    const lower = input.toLowerCase();
    let bestMatch = 'general_business';
    let bestScore = 0;

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          score += keyword.split(' ').length; // Multi-word matches score higher
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = industry;
      }
    }

    return bestMatch;
  }

  private detectIntentFromKeywords(input: string): PrimaryIntent {
    const lower = input.toLowerCase();
    let bestIntent: PrimaryIntent = 'operations'; // Default
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as PrimaryIntent;
      }
    }

    return bestIntent;
  }

  private detectTeamSize(input: string): ExtractedContext['teamSize'] | undefined {
    const lower = input.toLowerCase();
    
    if (/\b(solo|myself|just me|one person|single|freelance)\b/.test(lower)) return 'solo';
    if (/\b(small team|few people|2-5|small business)\b/.test(lower)) return 'small';
    if (/\b(medium|10-20|growing team)\b/.test(lower)) return 'medium';
    if (/\b(large|enterprise|20\+|big team|many employees)\b/.test(lower)) return 'large';
    
    return undefined;
  }

  private detectFeatures(input: string): string[] {
    const lower = input.toLowerCase();
    const features: string[] = [];

    if (/\b(schedule|calendar|appointment|booking)\b/.test(lower)) features.push('scheduling');
    if (/\b(invoice|billing|payment)\b/.test(lower)) features.push('invoicing');
    if (/\b(quote|estimate|proposal)\b/.test(lower)) features.push('quotes');
    if (/\b(inventory|stock|materials|supplies)\b/.test(lower)) features.push('inventory');
    if (/\b(staff|team|employee|technician)\b/.test(lower)) features.push('staff-management');
    if (/\b(customer|client|crm)\b/.test(lower)) features.push('crm');
    if (/\b(message|chat|sms|email|communicate)\b/.test(lower)) features.push('messaging');
    if (/\b(report|analytics|dashboard)\b/.test(lower)) features.push('reporting');

    return features;
  }
}
