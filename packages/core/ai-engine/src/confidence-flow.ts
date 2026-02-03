/**
 * Confidence Flow Controller
 * Manages confidence flow for app creation
 * 
 * Supports both:
 * - Legacy 4-tier confidence system (for backward compatibility)
 * - New ledger-based readiness system (recommended)
 */

import type { UnderstandingResult, ClarifyingQuestion } from './ai-understanding-service.js';
import type { CertaintyLedger, SlotId } from './certainty-ledger.js';
import { isReadyToBuild, computeGaps } from './certainty-ledger.js';
import { isCriticalSlot, getSlotsToAsk } from './slot-decision.js';

/**
 * Legacy Flow action types (4-tier system)
 */
export type FlowAction = 
  | { type: 'auto_build'; data: UnderstandingResult }
  | { type: 'confirm'; data: ConfirmationData }
  | { type: 'clarify'; data: ClarificationData }
  | { type: 'deep_clarify'; data: DeepClarificationData };

/**
 * New ledger-based flow action types
 */
export type LedgerFlowAction =
  | { type: 'ready_to_build'; message: string; ledger: CertaintyLedger }
  | { type: 'clarify'; gap: SlotId; ledger: CertaintyLedger }
  | { type: 'force_build'; message: string; ledger: CertaintyLedger };

/**
 * Confirmation screen data (confidence 0.75-0.89)
 */
export interface ConfirmationData {
  understanding: UnderstandingResult;
  summary: string;
  highlights: string[];
  canProceed: boolean;
}

/**
 * Clarification data (confidence 0.50-0.74)
 */
export interface ClarificationData {
  understanding: UnderstandingResult;
  questions: ClarifyingQuestion[];
  questionsAsked: number;
  questionsRemaining: number;
}

/**
 * Deep clarification data (confidence < 0.50)
 */
export interface DeepClarificationData {
  understanding: UnderstandingResult;
  questions: ClarifyingQuestion[];
  message: string;
  questionsAsked: number;
  questionsRemaining: number;
}

/**
 * Flow state for tracking session
 */
export interface FlowState {
  totalQuestionsAsked: number;
  maxQuestions: number;
  answers: Record<string, unknown>;
  originalInput: string;
  iterations: number;
}

/**
 * Confidence thresholds
 */
const CONFIDENCE_THRESHOLDS = {
  AUTO_BUILD: 0.90,
  CONFIRM: 0.75,
  CLARIFY: 0.50,
} as const;

/**
 * Max questions before forcing build
 */
const MAX_QUESTIONS = 3;

/**
 * Max iterations before forcing build
 */
const MAX_ITERATIONS = 5;

export class ConfidenceFlowController {
  private state: FlowState;

  constructor(originalInput: string) {
    this.state = {
      totalQuestionsAsked: 0,
      maxQuestions: MAX_QUESTIONS,
      answers: {},
      originalInput,
      iterations: 0,
    };
  }

  /**
   * Determine the next action based on understanding result
   */
  determineAction(understanding: UnderstandingResult): FlowAction {
    this.state.iterations++;

    // Force build after max iterations to prevent infinite loops
    if (this.state.iterations > MAX_ITERATIONS) {
      return this.createAutoBuildAction(understanding);
    }

    // Force build after max questions
    if (this.state.totalQuestionsAsked >= this.state.maxQuestions) {
      // Bump confidence to at least confirm level since we're done asking
      understanding.confidence = Math.max(understanding.confidence, CONFIDENCE_THRESHOLDS.CONFIRM);
      return this.createConfirmAction(understanding);
    }

    const confidence = understanding.confidence;

    // Tier 1: Auto-build (confidence >= 0.90)
    if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_BUILD) {
      return this.createAutoBuildAction(understanding);
    }

    // Tier 2: Confirm (confidence 0.75-0.89)
    if (confidence >= CONFIDENCE_THRESHOLDS.CONFIRM) {
      return this.createConfirmAction(understanding);
    }

    // Tier 3: Clarify (confidence 0.50-0.74)
    if (confidence >= CONFIDENCE_THRESHOLDS.CLARIFY) {
      return this.createClarifyAction(understanding);
    }

    // Tier 4: Deep clarification (confidence < 0.50)
    return this.createDeepClarifyAction(understanding);
  }

  /**
   * Record answer and update state
   */
  recordAnswer(questionId: string, answer: unknown): void {
    this.state.answers[questionId] = answer;
    this.state.totalQuestionsAsked++;
  }

  /**
   * Record multiple answers
   */
  recordAnswers(answers: Record<string, unknown>): void {
    for (const [questionId, answer] of Object.entries(answers)) {
      this.recordAnswer(questionId, answer);
    }
  }

  /**
   * Get all recorded answers
   */
  getAnswers(): Record<string, unknown> {
    return { ...this.state.answers };
  }

  /**
   * Get remaining questions count
   */
  getRemainingQuestions(): number {
    return Math.max(0, this.state.maxQuestions - this.state.totalQuestionsAsked);
  }

  /**
   * Check if we should force build
   */
  shouldForceBuild(): boolean {
    return (
      this.state.totalQuestionsAsked >= this.state.maxQuestions ||
      this.state.iterations > MAX_ITERATIONS
    );
  }

  /**
   * Get current flow state
   */
  getState(): FlowState {
    return { ...this.state };
  }

  /**
   * Reset flow state (for new session)
   */
  reset(originalInput: string): void {
    this.state = {
      totalQuestionsAsked: 0,
      maxQuestions: MAX_QUESTIONS,
      answers: {},
      originalInput,
      iterations: 0,
    };
  }

  private createAutoBuildAction(understanding: UnderstandingResult): FlowAction {
    return {
      type: 'auto_build',
      data: understanding,
    };
  }

  private createConfirmAction(understanding: UnderstandingResult): FlowAction {
    const summary = this.generateSummary(understanding);
    const highlights = this.generateHighlights(understanding);

    return {
      type: 'confirm',
      data: {
        understanding,
        summary,
        highlights,
        canProceed: true,
      },
    };
  }

  private createClarifyAction(understanding: UnderstandingResult): FlowAction {
    const remaining = this.getRemainingQuestions();
    const questions = understanding.suggestedQuestions.slice(0, Math.min(2, remaining));

    // If no questions available but confidence is low, generate default questions
    if (questions.length === 0 && remaining > 0) {
      questions.push(...this.generateDefaultQuestions(understanding, remaining));
    }

    return {
      type: 'clarify',
      data: {
        understanding,
        questions,
        questionsAsked: this.state.totalQuestionsAsked,
        questionsRemaining: remaining,
      },
    };
  }

  private createDeepClarifyAction(understanding: UnderstandingResult): FlowAction {
    const remaining = this.getRemainingQuestions();
    const questions = understanding.suggestedQuestions.slice(0, remaining);

    // Add fundamental questions if none provided
    if (questions.length === 0 && remaining > 0) {
      questions.push(...this.generateFundamentalQuestions(remaining));
    }

    return {
      type: 'deep_clarify',
      data: {
        understanding,
        questions,
        message: "I'd like to understand your needs better to create the perfect app.",
        questionsAsked: this.state.totalQuestionsAsked,
        questionsRemaining: remaining,
      },
    };
  }

  private generateSummary(understanding: UnderstandingResult): string {
    const industry = this.formatIndustryName(understanding.industry);
    const intent = this.formatIntentName(understanding.primaryIntent);
    
    let summary = `I'll create a ${industry} app focused on ${intent}.`;

    if (understanding.context.teamSize) {
      const teamDesc = this.formatTeamSize(understanding.context.teamSize);
      summary += ` Designed for ${teamDesc}.`;
    }

    if (understanding.context.features && understanding.context.features.length > 0) {
      const features = understanding.context.features.slice(0, 3).join(', ');
      summary += ` Including ${features}.`;
    }

    return summary;
  }

  private generateHighlights(understanding: UnderstandingResult): string[] {
    const highlights: string[] = [];

    highlights.push(`Industry: ${this.formatIndustryName(understanding.industry)}`);
    highlights.push(`Focus: ${this.formatIntentName(understanding.primaryIntent)}`);

    if (understanding.context.teamSize) {
      highlights.push(`Team Size: ${this.formatTeamSize(understanding.context.teamSize)}`);
    }

    if (understanding.context.features && understanding.context.features.length > 0) {
      highlights.push(`Key Features: ${understanding.context.features.slice(0, 4).join(', ')}`);
    }

    return highlights;
  }

  private generateDefaultQuestions(understanding: UnderstandingResult, maxCount: number): ClarifyingQuestion[] {
    const questions: ClarifyingQuestion[] = [];

    // If we don't know team size, ask
    if (!understanding.context.teamSize && maxCount > questions.length) {
      questions.push({
        id: 'teamSize',
        text: 'How many people will use this app?',
        options: ['Just me', '2-5 people', '6-20 people', '20+ people'],
        type: 'single',
      });
    }

    // If features are unclear, ask about main goal
    if ((!understanding.context.features || understanding.context.features.length === 0) && maxCount > questions.length) {
      questions.push({
        id: 'mainGoal',
        text: "What's the main thing you want this app to help you with?",
        type: 'freeform',
      });
    }

    return questions.slice(0, maxCount);
  }

  private generateFundamentalQuestions(maxCount: number): ClarifyingQuestion[] {
    const questions: ClarifyingQuestion[] = [
      {
        id: 'businessType',
        text: 'What type of business or activity is this app for?',
        type: 'freeform',
      },
      {
        id: 'mainProblem',
        text: 'What problem are you trying to solve with this app?',
        type: 'freeform',
      },
      {
        id: 'users',
        text: 'Who will be using this app?',
        options: ['Just me', 'My team', 'My customers', 'Both team and customers'],
        type: 'single',
      },
    ];

    return questions.slice(0, maxCount);
  }

  private formatIndustryName(industry: string): string {
    const names: Record<string, string> = {
      'plumber': 'Plumbing',
      'electrician': 'Electrical Services',
      'contractor': 'Construction/Contracting',
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
      'handyman': 'Handyman Services',
      'roofing': 'Roofing',
      'hvac': 'HVAC',
      'landscaping': 'Landscaping',
      'medical': 'Medical/Healthcare',
      'home-health': 'Home Health',
      'general_business': 'General Business',
    };

    return names[industry] || industry.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private formatIntentName(intent: string): string {
    const names: Record<string, string> = {
      'operations': 'internal operations',
      'customer-facing': 'customer interaction',
      'internal': 'team management',
      'hybrid': 'full business operations',
    };

    return names[intent] || intent;
  }

  private formatTeamSize(size: string): string {
    const sizes: Record<string, string> = {
      'solo': 'a solo operator',
      'small': 'a small team (2-5 people)',
      'medium': 'a medium team (6-20 people)',
      'large': 'a large team (20+ people)',
    };

    return sizes[size] || size;
  }
}

/**
 * Create a new confidence flow controller
 */
export function createConfidenceFlow(originalInput: string): ConfidenceFlowController {
  return new ConfidenceFlowController(originalInput);
}

// ============================================================================
// Ledger-Based Flow (New System)
// ============================================================================

/**
 * Determine the next action based on Certainty Ledger
 * This replaces the 4-tier confidence system with ledger-based readiness.
 * 
 * Decision logic:
 * 1. If critical slots are filled → ready_to_build
 * 2. If max questions reached → force_build
 * 3. If critical gaps exist → clarify
 * 4. Otherwise → ready_to_build
 */
export function determineActionFromLedger(
  ledger: CertaintyLedger,
  questionsAsked: number = 0
): LedgerFlowAction {
  // Check if ready to build
  // Industry with decent confidence + primary entities = ready
  if (
    ledger.industry.value &&
    ledger.industry.confidence >= 0.7 &&
    ledger.primaryEntities.value &&
    ledger.primaryEntities.value.length > 0
  ) {
    return {
      type: 'ready_to_build',
      message: "I have enough to build a solid first version. We'll refine after you see it.",
      ledger,
    };
  }

  // Force build after max questions
  if (questionsAsked >= MAX_QUESTIONS) {
    return {
      type: 'force_build',
      message: "Let me build what I understand - you can refine it after.",
      ledger,
    };
  }

  // Check for critical gaps that need resolution
  const slotsToAsk = getSlotsToAsk(ledger);
  const criticalGap = slotsToAsk.find(slot => isCriticalSlot(slot));
  
  if (criticalGap) {
    return {
      type: 'clarify',
      gap: criticalGap,
      ledger,
    };
  }

  // No critical gaps - ready to build
  return {
    type: 'ready_to_build',
    message: "Ready to build! I'll use smart defaults for anything not specified.",
    ledger,
  };
}

/**
 * Check if we can proceed to build based on ledger state
 */
export function canProceedToBuild(ledger: CertaintyLedger): boolean {
  return isReadyToBuild(ledger);
}

/**
 * Get the most critical gap to resolve
 */
export function getMostCriticalGap(ledger: CertaintyLedger): SlotId | null {
  const slotsToAsk = getSlotsToAsk(ledger);
  
  // Priority: industry first, then subVertical, then others
  const priorityOrder: SlotId[] = ['industry', 'subVertical', 'primaryEntities'];
  
  for (const slot of priorityOrder) {
    if (slotsToAsk.includes(slot)) {
      return slot;
    }
  }
  
  return slotsToAsk[0] || null;
}

/**
 * Generate a human-readable status message based on ledger
 */
export function getLedgerStatusMessage(ledger: CertaintyLedger): string {
  const readiness = Math.round(ledger.overallReadiness * 100);
  const gaps = ledger.gaps;
  
  if (readiness >= 80) {
    return `Ready to build! (${readiness}% confidence)`;
  }
  
  if (readiness >= 60) {
    return `Almost ready (${readiness}% confidence). Need to clarify: ${gaps.join(', ')}`;
  }
  
  if (readiness >= 40) {
    return `Getting there (${readiness}% confidence). Missing: ${gaps.join(', ')}`;
  }
  
  return `Need more information (${readiness}% confidence). Please tell me more about: ${gaps.join(', ')}`;
}
