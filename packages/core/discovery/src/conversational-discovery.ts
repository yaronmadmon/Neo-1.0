/**
 * Conversational Discovery Service
 * A friendly, chat-based discovery flow that feels like talking to a helpful friend
 * Uses natural language and one question at a time
 */

import type { AIProviderForDiscovery } from './ai-discovery-handler.js';

/**
 * Conversation state for chat-based discovery
 */
export interface ConversationState {
  step: number;
  collectedInfo: Record<string, unknown>;
  originalInput: string;
  detectedIndustry?: string;
  detectedIntent?: string;
  questionsAsked: string[];
  confidence: number;
}

/**
 * Chat response from the discovery service
 */
export interface ChatResponse {
  message?: string;
  acknowledgment?: string;
  question?: string;
  options?: string[];
  quickReplies?: string[];
  complete: boolean;
  appConfig?: Record<string, unknown>;
  completionMessage?: string;
  step: number;
  collectedInfo: Record<string, unknown>;
  questionsAsked?: string[];
  confidence?: number;
}

// Context-aware responses - different responses based on what we actually learned
const RESPONSES = {
  // When we understand the industry clearly
  industryUnderstood: (industry: string) => [
    `Got it - ${industry}! I can work with that.`,
    `${industry} - perfect, I know exactly the kind of app you need.`,
    `A ${industry} app - great, that helps me understand what to build.`,
  ],
  
  // When user says "Other" or something vague - ASK FOR CLARIFICATION
  needsClarification: [
    "I'd like to understand better - can you tell me what your business actually does? What's the main service or product?",
    "Help me out - what kind of work do you do day-to-day? That'll help me build the right app.",
    "I want to make sure I build something useful - what does your business do exactly?",
  ],
  
  // When we learn team size
  teamSizeUnderstood: {
    solo: [
      "Solo operation - got it. I'll keep things simple and focused.",
      "Just you - perfect, I'll build something lean that doesn't overwhelm.",
    ],
    small: [
      "Small team - I'll include what you need to coordinate without overcomplicating things.",
      "Got it, small crew. I'll add team features that actually help.",
    ],
    team: [
      "Larger team - I'll make sure there's proper organization and permissions.",
      "Understood - I'll build in the team management features you'll need.",
    ],
  },
  
  // When we learned nothing useful
  learnedNothing: [
    "I'm not quite following - can you tell me more about what you need?",
    "Help me understand better - what kind of business is this for?",
    "I want to make sure I get this right - what does your business do?",
  ],
  
  // Neutral acknowledgment when we got partial info
  neutral: [
    "Okay.",
    "Got it.",
    "Understood.",
  ],
  
  // When ready to build
  readyToBuild: (industry: string, teamSize: string) => [
    `Got it - a ${industry} app for ${teamSize === 'solo' ? 'a solo operation' : 'a team'}. Let me build that for you.`,
    `Perfect - I understand what you need. Building your ${industry} app now.`,
    `Clear picture now. Let me create something that fits your ${industry} business.`,
  ],
  
  // Generic completion
  completion: [
    "Alright, I have what I need. Building your app now.",
    "Got enough to work with. Let me put this together for you.",
    "I think I understand what you need. Building it now.",
  ],
};

/**
 * Question bank with friendly, conversational phrasing
 */
const QUESTIONS = {
  industry: {
    question: "What kind of business or project is this for?",
    friendlyVariants: [
      "Tell me a bit about your business - what do you do?",
      "What kind of business are we building this for?",
      "I'd love to know more - what's your business about?",
    ],
    options: ['Restaurant', 'Salon/Spa', 'Fitness/Gym', 'Real Estate', 'Medical/Health', 'Retail/Shop', 'Services', 'Other'],
  },
  teamSize: {
    question: "Is it just you, or do you have a team?",
    friendlyVariants: [
      "Will you be using this solo, or with a team?",
      "Are you flying solo on this, or is there a team involved?",
      "Quick one - is this for just you, or do you have people helping you?",
    ],
    options: ['Just me', 'Small team (2-5)', 'Larger team (6+)'],
  },
  mainGoal: {
    question: "What's the main thing you want this app to help with?",
    friendlyVariants: [
      "What's the #1 problem you want this to solve?",
      "If this app could do one thing really well, what would it be?",
      "What's the biggest headache this should fix for you?",
    ],
    options: ['Manage bookings/appointments', 'Track customers/clients', 'Handle orders/sales', 'Organize my work', 'All of the above'],
  },
  customerFacing: {
    question: "Will your customers use this too, or just you/your team?",
    friendlyVariants: [
      "Should customers be able to book or order through this?",
      "Do you need a customer-facing side, or is this internal only?",
    ],
    options: ['Yes, customers will use it', 'No, just internal', 'Maybe later'],
  },
};

/**
 * Sub-vertical questions to distinguish between similar industries
 */
const SUB_VERTICAL_QUESTIONS: Record<string, {
  trigger: string;
  question: string;
  options: Array<{ label: string; kit: string }>;
}> = {
  real_estate: {
    trigger: 'real-estate',
    question: "Are you managing rental properties, or helping people buy/sell homes?",
    options: [
      { label: "Managing rental properties (landlord/property manager)", kit: 'property-management' },
      { label: "Helping people buy/sell homes (real estate agent)", kit: 'real-estate' },
    ],
  },
  fitness: {
    trigger: 'fitness-coach',
    question: "Are you a personal trainer working 1-on-1, or running a gym with memberships?",
    options: [
      { label: "Personal trainer (1-on-1 clients)", kit: 'fitness-coach' },
      { label: "Gym or studio with memberships", kit: 'gym' },
    ],
  },
  cleaning: {
    trigger: 'cleaning',
    question: "Are you cleaning homes, or commercial/office buildings?",
    options: [
      { label: "Residential cleaning (homes)", kit: 'cleaning' },
      { label: "Commercial cleaning (offices/buildings)", kit: 'commercial-cleaning' },
    ],
  },
};

/**
 * Complexity questions to tailor the app based on business size
 * Affects: features included, UI complexity, permissions system
 */
const COMPLEXITY_QUESTIONS: Record<string, {
  question: string;
  options: Array<{ label: string; complexity: 'simple' | 'medium' | 'advanced' }>;
}> = {
  'property-management': {
    question: "How many properties do you manage?",
    options: [
      { label: "1-5 properties (solo landlord)", complexity: 'simple' },
      { label: "6-50 properties (small company)", complexity: 'medium' },
      { label: "50+ properties (large company)", complexity: 'advanced' },
    ],
  },
  'gym': {
    question: "What's the size of your gym?",
    options: [
      { label: "Small studio (1 location)", complexity: 'simple' },
      { label: "Medium gym (1-3 locations)", complexity: 'medium' },
      { label: "Large gym chain (4+ locations)", complexity: 'advanced' },
    ],
  },
  'tutor': {
    question: "How many students do you work with?",
    options: [
      { label: "1-10 students (independent tutor)", complexity: 'simple' },
      { label: "11-50 students (small tutoring business)", complexity: 'medium' },
      { label: "50+ students (tutoring center)", complexity: 'advanced' },
    ],
  },
  'cleaning': {
    question: "How many clients do you serve?",
    options: [
      { label: "1-10 regular clients (solo cleaner)", complexity: 'simple' },
      { label: "11-50 clients (small team)", complexity: 'medium' },
      { label: "50+ clients (cleaning company)", complexity: 'advanced' },
    ],
  },
  'commercial-cleaning': {
    question: "How many buildings/contracts do you manage?",
    options: [
      { label: "1-5 buildings (small operation)", complexity: 'simple' },
      { label: "6-20 buildings (medium company)", complexity: 'medium' },
      { label: "20+ buildings (large company)", complexity: 'advanced' },
    ],
  },
  'restaurant': {
    question: "What's the size of your restaurant operation?",
    options: [
      { label: "Single small restaurant", complexity: 'simple' },
      { label: "Busy restaurant or 2-3 locations", complexity: 'medium' },
      { label: "Restaurant group (4+ locations)", complexity: 'advanced' },
    ],
  },
  'ecommerce': {
    question: "How many products do you sell?",
    options: [
      { label: "Under 50 products (small shop)", complexity: 'simple' },
      { label: "50-500 products (growing store)", complexity: 'medium' },
      { label: "500+ products (large catalog)", complexity: 'advanced' },
    ],
  },
  'mechanic': {
    question: "What's the size of your auto shop?",
    options: [
      { label: "Solo mechanic or 1-2 bays", complexity: 'simple' },
      { label: "Small shop (3-6 bays)", complexity: 'medium' },
      { label: "Large shop or multiple locations", complexity: 'advanced' },
    ],
  },
  'salon': {
    question: "What's the size of your salon?",
    options: [
      { label: "Solo stylist or small booth rental", complexity: 'simple' },
      { label: "Salon with 2-5 stylists", complexity: 'medium' },
      { label: "Large salon or multiple locations", complexity: 'advanced' },
    ],
  },
  'medical': {
    question: "What's the size of your practice?",
    options: [
      { label: "Solo practitioner", complexity: 'simple' },
      { label: "Small practice (2-5 providers)", complexity: 'medium' },
      { label: "Large practice or clinic", complexity: 'advanced' },
    ],
  },
  'plumber': {
    question: "What's the size of your plumbing business?",
    options: [
      { label: "Solo plumber", complexity: 'simple' },
      { label: "Small team (2-5 plumbers)", complexity: 'medium' },
      { label: "Large company (6+ plumbers)", complexity: 'advanced' },
    ],
  },
  'electrician': {
    question: "What's the size of your electrical business?",
    options: [
      { label: "Solo electrician", complexity: 'simple' },
      { label: "Small team (2-5 electricians)", complexity: 'medium' },
      { label: "Large company (6+ electricians)", complexity: 'advanced' },
    ],
  },
  'hvac': {
    question: "What's the size of your HVAC business?",
    options: [
      { label: "Solo technician", complexity: 'simple' },
      { label: "Small team (2-5 technicians)", complexity: 'medium' },
      { label: "Large company (6+ technicians)", complexity: 'advanced' },
    ],
  },
  'landscaping': {
    question: "What's the size of your landscaping business?",
    options: [
      { label: "Solo landscaper", complexity: 'simple' },
      { label: "Small crew (2-5 people)", complexity: 'medium' },
      { label: "Large company with multiple crews", complexity: 'advanced' },
    ],
  },
  'home-health': {
    question: "How many caregivers do you coordinate?",
    options: [
      { label: "Solo caregiver", complexity: 'simple' },
      { label: "Small team (2-10 caregivers)", complexity: 'medium' },
      { label: "Agency with 10+ caregivers", complexity: 'advanced' },
    ],
  },
  'bakery': {
    question: "What's the size of your bakery?",
    options: [
      { label: "Home bakery or small shop", complexity: 'simple' },
      { label: "Established bakery with staff", complexity: 'medium' },
      { label: "Multiple locations or wholesale", complexity: 'advanced' },
    ],
  },
};

/**
 * Domain signal keywords for smart detection
 */
const DOMAIN_SIGNALS: Record<string, {
  triggers: string[];
  suggestedKit: string;
  clarifyingQuestion?: string;
  addModule?: string;
}> = {
  property_management: {
    triggers: ['rent', 'rental', 'tenant', 'lease', 'landlord', 'property manager', 'unit', 'apartment'],
    suggestedKit: 'property-management',
    clarifyingQuestion: "Sounds like property management! Should I set up tenant tracking and rent collection?",
  },
  gym: {
    triggers: ['member', 'membership', 'gym', 'fitness class', 'class schedule', 'workout class'],
    suggestedKit: 'gym',
    clarifyingQuestion: "Are you running a gym with memberships?",
  },
  student: {
    triggers: ['student', 'lesson', 'tutoring', 'curriculum', 'homework', 'grade'],
    suggestedKit: 'tutor',
    clarifyingQuestion: "Should I set this up for tutoring with student tracking?",
  },
  payments: {
    triggers: ['stripe', 'payment processing', 'subscription billing', 'online payment', 'checkout'],
    addModule: 'payments',
    suggestedKit: '',
    clarifyingQuestion: "Should I add payment processing with Stripe?",
  },
  scheduling: {
    triggers: ['booking', 'appointment', 'schedule', 'calendar', 'availability'],
    addModule: 'scheduling',
    suggestedKit: '',
  },
  commercial_cleaning: {
    triggers: ['office cleaning', 'janitorial', 'commercial cleaning', 'facility', 'building maintenance'],
    suggestedKit: 'commercial-cleaning',
    clarifyingQuestion: "This sounds like commercial cleaning - should I set it up for business clients?",
  },
};

/**
 * Get a random item from an array
 */
function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Conversational Discovery Handler
 */
export class ConversationalDiscoveryHandler {
  private aiProvider?: AIProviderForDiscovery;

  constructor(aiProvider?: AIProviderForDiscovery) {
    this.aiProvider = aiProvider;
  }

  /**
   * Start a new conversation
   */
  async startConversation(input: string): Promise<ChatResponse> {
    // Analyze the initial input
    const analysis = this.analyzeInput(input);
    
    const state: ConversationState = {
      step: 1,
      collectedInfo: {
        originalDescription: input,
        ...analysis.extracted,
      },
      originalInput: input,
      detectedIndustry: analysis.industry,
      detectedIntent: analysis.intent,
      questionsAsked: [],
      confidence: analysis.confidence,
    };

    // Smart completion: skip questions if we have what we need
    // Key info = industry + (complexity OR teamSize)
    const hasKeyInfo = analysis.extracted.industry && 
                       (analysis.extracted.complexity || analysis.extracted.teamSize);
    
    // Auto-complete if:
    // 1. Very confident (0.85+) and no sub-vertical question needed, OR
    // 2. We have key info (industry + scale) with good confidence (0.65+)
    if (analysis.subVerticalQuestion) {
      // Need to ask sub-vertical - fall through to question flow
    } else if (analysis.confidence >= 0.85 || (hasKeyInfo && analysis.confidence >= 0.65)) {
      return this.createCompletionResponse(state);
    }

    // CONTEXT-AWARE opening - only be enthusiastic if we actually understand something
    let openingMessage: string;
    
    if (analysis.industry && analysis.confidence >= 0.5) {
      // We understood something - acknowledge it specifically
      const industryName = this.formatIndustryName(analysis.industry);
      openingMessage = `Got it - a ${industryName} app.`;
    } else {
      // We don't understand much - be helpful, not fake-enthusiastic
      openingMessage = "Let's figure out what you need.";
    }

    // Check if we need to ask a sub-vertical question first
    if (analysis.subVerticalQuestion) {
      state.questionsAsked.push('subVertical');
      const fullMessage = `${openingMessage} ${analysis.subVerticalQuestion.question}`;
      return {
        message: fullMessage,
        options: analysis.subVerticalQuestion.options.map(o => o.label),
        quickReplies: analysis.subVerticalQuestion.options.map(o => o.label),
        complete: false,
        step: state.step,
        collectedInfo: {
          ...state.collectedInfo,
          _subVerticalOptions: analysis.subVerticalQuestion.options, // Store for processing
        },
        questionsAsked: state.questionsAsked,
        confidence: state.confidence,
      };
    }
    
    // Determine what to ask first
    const firstQuestion = this.getNextQuestion(state);
    
    if (!firstQuestion) {
      return this.createCompletionResponse(state);
    }

    state.questionsAsked.push(firstQuestion.id);

    // Simple, direct question - no fake transitions
    const fullMessage = `${openingMessage}\n\n${firstQuestion.question}`;

    return {
      message: fullMessage,
      options: firstQuestion.options,
      quickReplies: firstQuestion.options,
      complete: false,
      step: state.step,
      collectedInfo: state.collectedInfo,
      questionsAsked: state.questionsAsked,
      confidence: state.confidence,
    };
  }

  /**
   * Continue the conversation with a user response
   * NOW CONTEXT-AWARE: responses match what we actually learned
   */
  async continueConversation(
    userMessage: string,
    state: ConversationState
  ): Promise<ChatResponse> {
    // Process the user's response
    const processed = this.processUserResponse(userMessage, state);
    
    // Update state with new info
    const updatedState: ConversationState = {
      ...state,
      step: state.step + 1,
      collectedInfo: { ...state.collectedInfo, ...processed.extracted },
      confidence: Math.min(1, state.confidence + processed.confidenceBoost),
    };

    // CONTEXT-AWARE: Generate appropriate acknowledgment based on what we learned
    const acknowledgment = this.generateContextAwareAcknowledgment(processed, state, userMessage);

    // Check if user gave a vague answer that needs clarification
    if (processed.needsClarification) {
      // Don't move forward - ask for clarification
      return {
        message: random(RESPONSES.needsClarification),
        complete: false,
        step: updatedState.step,
        collectedInfo: updatedState.collectedInfo,
        questionsAsked: updatedState.questionsAsked,
        confidence: updatedState.confidence,
      };
    }

    // Check if we have enough info - smart completion
    const hasKeyInfo = updatedState.collectedInfo.industry && 
                       (updatedState.collectedInfo.complexity || updatedState.collectedInfo.teamSize);
    
    // Complete if we have high confidence, have key info with medium confidence, or asked enough questions
    if (updatedState.confidence >= 0.80 || 
        (hasKeyInfo && updatedState.confidence >= 0.60) || 
        updatedState.step >= 5) {
      return {
        acknowledgment,
        ...this.createCompletionResponse(updatedState),
      };
    }

    // Get next question
    const nextQuestion = this.getNextQuestion(updatedState);
    
    if (!nextQuestion) {
      return {
        acknowledgment,
        ...this.createCompletionResponse(updatedState),
      };
    }

    updatedState.questionsAsked.push(nextQuestion.id);

    return {
      acknowledgment,
      message: nextQuestion.question,
      options: nextQuestion.options,
      quickReplies: nextQuestion.options,
      complete: false,
      step: updatedState.step,
      collectedInfo: updatedState.collectedInfo,
      questionsAsked: updatedState.questionsAsked,
      confidence: updatedState.confidence,
    };
  }

  /**
   * Generate context-aware acknowledgment based on what we actually learned
   */
  private generateContextAwareAcknowledgment(
    processed: { extracted: Record<string, unknown>; confidenceBoost: number; needsClarification?: boolean },
    previousState: ConversationState,
    userMessage: string
  ): string {
    // If we learned a specific industry
    if (processed.extracted.industry && !previousState.collectedInfo.industry) {
      const industry = this.formatIndustryName(processed.extracted.industry as string);
      return random(RESPONSES.industryUnderstood(industry));
    }

    // If we learned team size
    if (processed.extracted.teamSize && !previousState.collectedInfo.teamSize) {
      const size = processed.extracted.teamSize as string;
      if (size === 'solo') return random(RESPONSES.teamSizeUnderstood.solo);
      if (size === 'small') return random(RESPONSES.teamSizeUnderstood.small);
      return random(RESPONSES.teamSizeUnderstood.team);
    }

    // If we learned complexity
    if (processed.extracted.complexity && !previousState.collectedInfo.complexity) {
      return random(RESPONSES.neutral);
    }

    // If confidence boost is low, we didn't learn much
    if (processed.confidenceBoost <= 0.1) {
      return random(RESPONSES.neutral);
    }

    return random(RESPONSES.neutral);
  }

  /**
   * Analyze initial input for industry, intent, etc.
   */
  private analyzeInput(input: string): {
    industry?: string;
    intent?: string;
    confidence: number;
    extracted: Record<string, unknown>;
    subVerticalQuestion?: {
      question: string;
      options: Array<{ label: string; kit: string }>;
    };
    detectedSignals?: string[];
    suggestedModules?: string[];
  } {
    const lower = input.toLowerCase();
    const extracted: Record<string, unknown> = {};
    let confidence = 0.3;
    const detectedSignals: string[] = [];
    const suggestedModules: string[] = [];

    // Check for domain signals first (high priority)
    for (const [signalId, signal] of Object.entries(DOMAIN_SIGNALS)) {
      for (const trigger of signal.triggers) {
        if (lower.includes(trigger)) {
          detectedSignals.push(signalId);
          if (signal.suggestedKit) {
            extracted.suggestedKit = signal.suggestedKit;
            confidence += 0.2;
          }
          if (signal.addModule) {
            suggestedModules.push(signal.addModule);
          }
          break;
        }
      }
    }

    // Industry detection with expanded keywords
    const industryMap: Record<string, string[]> = {
      restaurant: ['restaurant', 'cafe', 'dining', 'menu', 'takeout', 'delivery', 'kitchen', 'diner'],
      bakery: ['bakery', 'bake', 'baker', 'pastry', 'bread', 'cake', 'cupcake', 'donut', 'pastries', 'baked goods'],
      salon: ['salon', 'beauty', 'hair', 'spa', 'nail', 'barber', 'stylist'],
      'fitness-coach': ['fitness', 'trainer', 'workout', 'coach', 'exercise', 'yoga', 'pilates', 'personal training'],
      gym: ['gym', 'fitness studio', 'membership', 'fitness class', 'workout class'],
      'real-estate': ['real estate', 'realtor', 'listing', 'broker', 'home sale', 'buy sell home'],
      'property-management': ['property management', 'landlord', 'tenant', 'rental property', 'lease', 'rent collection'],
      medical: ['medical', 'clinic', 'doctor', 'patient', 'health', 'dental', 'therapy'],
      retail: ['shop', 'store', 'retail', 'ecommerce', 'sell', 'products'],
      'food-service': ['food', 'catering', 'food truck', 'meal prep', 'food delivery'],
      plumber: ['plumber', 'plumbing', 'pipe', 'water', 'leak', 'drain'],
      electrician: ['electrician', 'electrical', 'wiring', 'circuit'],
      contractor: ['contractor', 'construction', 'renovation', 'builder', 'remodel'],
      cleaning: ['cleaning', 'cleaner', 'maid', 'housekeeping', 'home cleaning'],
      'commercial-cleaning': ['janitorial', 'commercial cleaning', 'office cleaning', 'facility cleaning'],
      tutor: ['tutor', 'tutoring', 'lesson', 'teaching', 'student'],
      mechanic: ['mechanic', 'auto repair', 'car repair', 'vehicle', 'automotive'],
      landscaping: ['landscaping', 'lawn', 'garden', 'yard', 'lawn care'],
      'home-health': ['home health', 'caregiver', 'senior care', 'elderly care'],
      photography: ['photographer', 'photography', 'photo studio', 'portraits', 'wedding photography'],
      'pet-services': ['pet', 'dog', 'grooming', 'pet sitting', 'dog walking', 'veterinary', 'vet'],
    };

    let detectedIndustry: string | undefined;
    let bestMatchScore = 0;
    
    for (const [industry, keywords] of Object.entries(industryMap)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          score += keyword.split(' ').length; // Multi-word matches score higher
        }
      }
      if (score > bestMatchScore) {
        bestMatchScore = score;
        detectedIndustry = industry;
      }
    }

    if (detectedIndustry) {
      extracted.industry = detectedIndustry;
      
      // Boost confidence based on how clear the match is
      // Multi-word matches or "I am a X" patterns get higher confidence
      const explicitPattern = /\b(i am a|i'm a|we are|we're|i run a|my|our)\s+\w*\s*(plumb|salon|gym|restaurant|clean|tutor|mechanic|electric)/i;
      if (explicitPattern.test(input)) {
        confidence += 0.35; // Strong explicit statement
      } else if (bestMatchScore >= 2) {
        confidence += 0.30; // Multi-word match
      } else {
        confidence += 0.25; // Single keyword match
      }
      
      // Override with signal-detected kit if available and more specific
      if (extracted.suggestedKit) {
        detectedIndustry = extracted.suggestedKit as string;
        extracted.industry = detectedIndustry;
      }
    }

    // Check if we need a sub-vertical question
    let subVerticalQuestion: { question: string; options: Array<{ label: string; kit: string }> } | undefined;
    
    if (detectedIndustry) {
      // Check if this industry has ambiguous sub-verticals
      const subVertical = Object.values(SUB_VERTICAL_QUESTIONS).find(sv => sv.trigger === detectedIndustry);
      if (subVertical && !extracted.suggestedKit) {
        subVerticalQuestion = {
          question: subVertical.question,
          options: subVertical.options,
        };
        // Don't auto-increase confidence if we need clarification
        confidence = Math.min(confidence, 0.7);
      }
    }

    // Team size detection - also infer complexity from team size
    if (/\b(just me|solo|myself|one person|freelance|individual|i am a|i'm a)\b/i.test(input)) {
      extracted.teamSize = 'solo';
      extracted.complexity = 'simple'; // Solo = simple complexity
      confidence += 0.2; // Higher boost - we know a lot from this
    } else if (/\b(small team|2-5|few people|couple of)\b/i.test(input)) {
      extracted.teamSize = 'small';
      extracted.complexity = 'medium';
      confidence += 0.15;
    } else if (/\b(team|staff|employees|we have|our team|large|big company)\b/i.test(input)) {
      extracted.teamSize = 'team';
      extracted.complexity = 'medium'; // Default team to medium, can be refined
      confidence += 0.1;
    }

    // Intent detection
    if (/\b(booking|appointment|schedule|reservation)\b/i.test(input)) {
      extracted.mainFeature = 'bookings';
      confidence += 0.15;
    } else if (/\b(order|sale|sell|payment|checkout)\b/i.test(input)) {
      extracted.mainFeature = 'orders';
      confidence += 0.15;
    } else if (/\b(customer|client|crm|contact)\b/i.test(input)) {
      extracted.mainFeature = 'customers';
      confidence += 0.15;
    }

    // Customer-facing detection
    if (/\b(customer portal|online booking|customers can|client access)\b/i.test(input)) {
      extracted.customerFacing = true;
      confidence += 0.1;
    }

    // Store suggested modules
    if (suggestedModules.length > 0) {
      extracted.suggestedModules = suggestedModules;
    }

    return {
      industry: detectedIndustry,
      confidence: Math.min(confidence, 1),
      extracted,
      subVerticalQuestion,
      detectedSignals: detectedSignals.length > 0 ? detectedSignals : undefined,
      suggestedModules: suggestedModules.length > 0 ? suggestedModules : undefined,
    };
  }

  /**
   * Process user response and extract information
   * NOW DETECTS VAGUE ANSWERS and flags need for clarification
   */
  private processUserResponse(
    message: string,
    state: ConversationState
  ): { extracted: Record<string, unknown>; confidenceBoost: number; needsClarification?: boolean } {
    const lower = message.toLowerCase();
    const extracted: Record<string, unknown> = {};
    let confidenceBoost = 0.15;
    let needsClarification = false;

    // CHECK FOR VAGUE ANSWERS that need clarification
    // If we just asked about industry and user said "Other" or "Services" - we need more info
    const lastQuestion = state.questionsAsked[state.questionsAsked.length - 1];
    if (lastQuestion === 'industry') {
      const vagueAnswers = ['other', 'services', 'something else', 'not listed', 'different'];
      if (vagueAnswers.some(v => lower.includes(v)) || lower === 'other') {
        // User gave vague answer - need clarification
        needsClarification = true;
        confidenceBoost = 0; // We learned nothing
        return { extracted, confidenceBoost, needsClarification };
      }
    }

    // Check if this is a sub-vertical response
    const subVerticalOptions = state.collectedInfo._subVerticalOptions as Array<{ label: string; kit: string }> | undefined;
    if (subVerticalOptions && state.questionsAsked.includes('subVertical')) {
      // Find matching option
      for (const option of subVerticalOptions) {
        if (lower.includes(option.label.toLowerCase().substring(0, 20)) || 
            message.includes(option.label)) {
          extracted.industry = option.kit;
          extracted.resolvedSubVertical = true;
          confidenceBoost += 0.25;
          break;
        }
      }
      // Clean up the temp storage
      extracted._subVerticalOptions = undefined;
    }

    // Check for industry in response (expanded to include sub-verticals)
    if (!state.collectedInfo.industry && !extracted.industry) {
      const industryKeywords: Record<string, string[]> = {
        restaurant: ['restaurant', 'cafe', 'diner'],
        bakery: ['bakery', 'bake', 'baker', 'pastry', 'bread', 'cake'],
        salon: ['salon', 'beauty', 'hair', 'spa'],
        'fitness-coach': ['personal trainer', 'trainer', '1-on-1', 'one-on-one', 'fitness'],
        gym: ['gym', 'membership', 'fitness studio', 'memberships'],
        'real-estate': ['real estate', 'realtor', 'buying', 'selling', 'agent'],
        'property-management': ['property management', 'landlord', 'rental', 'tenant', 'lease'],
        medical: ['medical', 'clinic', 'doctor', 'health'],
        retail: ['retail', 'shop', 'store'],
        'food-service': ['food', 'catering', 'food truck'],
        cleaning: ['home cleaning', 'residential', 'houses', 'cleaning'],
        'commercial-cleaning': ['commercial', 'office', 'building', 'janitorial'],
        tutor: ['tutor', 'teaching', 'student'],
        services: ['service', 'consulting', 'freelance', 'other'],
        photography: ['photography', 'photographer'],
        'pet-services': ['pet', 'dog', 'grooming'],
      };

      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(k => lower.includes(k))) {
          extracted.industry = industry;
          confidenceBoost += 0.15;
          break;
        }
      }
    }

    // Check for team size
    if (!state.collectedInfo.teamSize) {
      if (/\b(just me|solo|alone|myself)\b/i.test(lower)) {
        extracted.teamSize = 'solo';
        confidenceBoost += 0.1;
      } else if (/\b(small team|2-5|few people)\b/i.test(lower)) {
        extracted.teamSize = 'small';
        confidenceBoost += 0.1;
      } else if (/\b(team|larger|6\+|big)\b/i.test(lower)) {
        extracted.teamSize = 'team';
        confidenceBoost += 0.1;
      }
    }

    // Check for main goal
    if (/\b(booking|appointment|schedule)\b/i.test(lower)) {
      extracted.mainFeature = 'bookings';
      confidenceBoost += 0.1;
    } else if (/\b(customer|client|crm)\b/i.test(lower)) {
      extracted.mainFeature = 'customers';
      confidenceBoost += 0.1;
    } else if (/\b(order|sale|inventory)\b/i.test(lower)) {
      extracted.mainFeature = 'orders';
      confidenceBoost += 0.1;
    } else if (/\b(organize|manage|track)\b/i.test(lower)) {
      extracted.mainFeature = 'management';
      confidenceBoost += 0.1;
    }

    // Check for domain-specific entities mentioned
    if (/\b(tenant|rent|lease)\b/i.test(lower)) {
      extracted.industry = extracted.industry || 'property-management';
      confidenceBoost += 0.15;
    } else if (/\b(member|membership|class)\b/i.test(lower)) {
      extracted.industry = extracted.industry || 'gym';
      confidenceBoost += 0.15;
    } else if (/\b(student|lesson|homework)\b/i.test(lower)) {
      extracted.industry = extracted.industry || 'tutor';
      confidenceBoost += 0.15;
    }

    // Customer facing
    if (/\b(yes|customer|client|they can|public)\b/i.test(lower) && !state.collectedInfo.customerFacing) {
      extracted.customerFacing = true;
      confidenceBoost += 0.1;
    } else if (/\b(no|internal|just us|private)\b/i.test(lower)) {
      extracted.customerFacing = false;
      confidenceBoost += 0.1;
    }

    // Check for complexity response
    if (!state.collectedInfo.complexity && state.questionsAsked.includes('complexity')) {
      const industry = state.collectedInfo.industry as string | undefined;
      if (industry && COMPLEXITY_QUESTIONS[industry]) {
        const complexityQ = COMPLEXITY_QUESTIONS[industry];
        for (const option of complexityQ.options) {
          // Match if user response contains key parts of the option label
          if (lower.includes(option.label.toLowerCase().substring(0, 15)) ||
              message.includes(option.label)) {
            extracted.complexity = option.complexity;
            confidenceBoost += 0.15;
            break;
          }
        }
        // Fallback: detect complexity keywords
        if (!extracted.complexity) {
          if (/\b(solo|just me|small|1-5|1-10|under 50|single)\b/i.test(lower)) {
            extracted.complexity = 'simple';
            confidenceBoost += 0.1;
          } else if (/\b(medium|growing|2-5|6-50|11-50|50-500)\b/i.test(lower)) {
            extracted.complexity = 'medium';
            confidenceBoost += 0.1;
          } else if (/\b(large|big|multiple|50\+|500\+|chain|agency)\b/i.test(lower)) {
            extracted.complexity = 'advanced';
            confidenceBoost += 0.1;
          }
        }
      }
    }

    return { extracted, confidenceBoost, needsClarification };
  }

  /**
   * Get the next question to ask
   * Uses smart skipping: only ask questions we can't infer from what we already know
   */
  private getNextQuestion(state: ConversationState): { id: string; question: string; options: string[] } | null {
    // Priority: industry > complexity (if not inferrable) > team size > main goal
    // Skip questions we already have answers to or can infer
    
    // 1. Industry is critical - ask if we don't have it
    if (!state.collectedInfo.industry && !state.questionsAsked.includes('industry')) {
      return {
        id: 'industry',
        question: random(QUESTIONS.industry.friendlyVariants),
        options: QUESTIONS.industry.options,
      };
    }

    // 2. Complexity - ONLY ask if we couldn't infer it from teamSize
    // If teamSize is already known, we've already set complexity
    const industry = state.collectedInfo.industry as string | undefined;
    const hasInferredComplexity = state.collectedInfo.complexity || state.collectedInfo.teamSize;
    
    if (industry && !hasInferredComplexity && !state.questionsAsked.includes('complexity')) {
      const complexityQ = COMPLEXITY_QUESTIONS[industry];
      if (complexityQ) {
        return {
          id: 'complexity',
          question: complexityQ.question,
          options: complexityQ.options.map(o => o.label),
        };
      }
    }

    // 3. Team size - skip if we already have it or already have complexity
    // (Having complexity implies we know team size level)
    if (!state.collectedInfo.teamSize && !state.collectedInfo.complexity && !state.questionsAsked.includes('teamSize')) {
      return {
        id: 'teamSize',
        question: random(QUESTIONS.teamSize.friendlyVariants),
        options: QUESTIONS.teamSize.options,
      };
    }

    // 4. Main feature - helpful but not critical, skip if we have good confidence
    // Don't ask if we already have mainFeature or confidence is high enough
    if (!state.collectedInfo.mainFeature && state.confidence < 0.7 && !state.questionsAsked.includes('mainGoal')) {
      return {
        id: 'mainGoal',
        question: random(QUESTIONS.mainGoal.friendlyVariants),
        options: QUESTIONS.mainGoal.options,
      };
    }

    // 5. Customer facing - often not critical, skip for simpler apps
    // Only ask for service businesses where it matters
    const serviceIndustries = ['salon', 'gym', 'restaurant', 'medical', 'fitness-coach', 'cleaning'];
    const isServiceBusiness = industry && serviceIndustries.includes(industry);
    
    if (isServiceBusiness && state.collectedInfo.customerFacing === undefined && !state.questionsAsked.includes('customerFacing')) {
      return {
        id: 'customerFacing',
        question: random(QUESTIONS.customerFacing.friendlyVariants),
        options: QUESTIONS.customerFacing.options,
      };
    }

    return null;
  }

  /**
   * Create completion response with app config
   * NOW USES CONTEXT-AWARE completion messages
   */
  private createCompletionResponse(state: ConversationState): ChatResponse {
    const industry = state.collectedInfo.industry || state.detectedIndustry || 'general_business';
    const teamSize = (state.collectedInfo.teamSize as string) || 'team';
    
    const appConfig = {
      context: 'business',
      industryText: industry,
      teamSize: teamSize === 'solo' ? 'solo' : 'team',
      offerType: 'services',
      customerFacing: state.collectedInfo.customerFacing ?? false,
      mainFeature: state.collectedInfo.mainFeature || 'management',
      originalDescription: state.originalInput,
      // Complexity level affects features, UI complexity, and permissions
      complexity: (state.collectedInfo.complexity as 'simple' | 'medium' | 'advanced') || 'medium',
    };

    // Context-aware completion message
    let completionMessage: string;
    if (industry && industry !== 'general_business') {
      const formattedIndustry = this.formatIndustryName(industry as string);
      completionMessage = random(RESPONSES.readyToBuild(formattedIndustry, teamSize));
    } else {
      completionMessage = random(RESPONSES.completion);
    }

    return {
      complete: true,
      appConfig,
      completionMessage,
      step: state.step,
      collectedInfo: state.collectedInfo,
    };
  }

  /**
   * Format industry name for display
   */
  private formatIndustryName(industry: string): string {
    const names: Record<string, string> = {
      restaurant: 'restaurant',
      bakery: 'bakery',
      salon: 'salon',
      'fitness-coach': 'personal training',
      gym: 'gym/fitness studio',
      'real-estate': 'real estate',
      'property-management': 'property management',
      medical: 'healthcare',
      retail: 'retail',
      'food-service': 'food service',
      plumber: 'plumbing',
      electrician: 'electrical services',
      contractor: 'contracting',
      cleaning: 'cleaning services',
      'commercial-cleaning': 'commercial cleaning',
      tutor: 'tutoring',
      mechanic: 'auto repair',
      landscaping: 'landscaping',
      'home-health': 'home health care',
      photography: 'photography',
      'pet-services': 'pet services',
    };
    return names[industry] || industry.replace(/-/g, ' ');
  }
}
