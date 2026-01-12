/**
 * Discovery Service
 * Analyzes user input to determine if clarification is needed
 * and generates appropriate questions
 */

import { DomainKnowledgeBase, type DomainKnowledge } from './domain-knowledge-base.js';

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'number' | 'boolean';
  options?: string[];
  required: boolean;
  category: string;
  helpText?: string;
}

export interface DiscoveredInfo {
  domain?: string;
  category?: string;
  features: string[];
  scope?: string;
  integrations?: string[];
  customRequirements?: string[];
  answers?: Record<string, unknown>;
}

export interface DiscoveryResult {
  needsClarification: boolean;
  confidence: number; // 0-1
  detectedDomain?: string;
  missingInfo: string[];
  questions: ClarificationQuestion[];
  discoveredInfo?: DiscoveredInfo;
  suggestedFeatures?: string[];
}

export class DiscoveryService {
  private domainKnowledge: DomainKnowledgeBase;

  constructor() {
    this.domainKnowledge = new DomainKnowledgeBase();
  }

  /**
   * Analyze input and determine if clarification is needed
   */
  async analyzeInput(input: string, existingInfo?: DiscoveredInfo): Promise<DiscoveryResult> {
    const lowerInput = input.toLowerCase().trim();

    // Check if input is too vague
    const vagueIndicators = [
      input.length < 10,
      !/[a-z]{3,}/.test(input), // Less than 3 consecutive letters
      lowerInput.match(/^(build|create|make|design)\s+(me\s+)?(an?\s+)?app$/i) !== null,
      lowerInput.match(/^(i\s+want|i\s+need)\s+(an?\s+)?app$/i) !== null,
    ];

    const isVague = vagueIndicators.some(indicator => indicator === true);

    // Detect domain
    const domainMatches = this.domainKnowledge.detectDomains(input);
    const primaryDomain = domainMatches.length > 0 ? domainMatches[0].domain : undefined;
    const domainKnowledge = primaryDomain ? this.domainKnowledge.getDomain(primaryDomain) : undefined;

    // Calculate confidence
    let confidence = 0.5; // Default
    if (domainKnowledge && domainMatches.length > 0 && domainMatches[0].score >= 2) {
      confidence = 0.7; // Strong domain match
    }
    if (isVague) {
      confidence = Math.min(confidence, 0.4); // Lower confidence for vague input
    }
    if (lowerInput.length > 50 && domainKnowledge) {
      confidence = Math.min(confidence + 0.2, 0.9); // Higher confidence for detailed input
    }

    // Determine if clarification is needed
    const needsClarification: boolean = confidence < 0.7 || isVague || (domainKnowledge ? !existingInfo?.domain : false);

    // Generate questions
    const questions: ClarificationQuestion[] = [];
    const missingInfo: string[] = [];

    if (needsClarification) {
      if (isVague && !domainKnowledge) {
        // Very vague input - ask basic question
        questions.push({
          id: 'app_type',
          question: "What kind of app do you want to build?",
          type: 'text',
          required: true,
          category: 'domain',
          helpText: 'Examples: real estate management, home organization, task tracking, etc.',
        });
        missingInfo.push('domain');
      } else if (domainKnowledge) {
        // Domain detected but need more info
        missingInfo.push('features');
        missingInfo.push('scope');

        // Use domain-specific questions if available
        if (domainKnowledge.questions) {
          for (const q of domainKnowledge.questions) {
            // Skip if already answered
            if (existingInfo?.answers && q.id in existingInfo.answers) {
              continue;
            }
            questions.push(q);
          }
        } else {
          // Generic questions for detected domain
          questions.push({
            id: 'primary_use_case',
            question: `What's the main thing you want to ${domainKnowledge.displayName.toLowerCase()} for?`,
            type: 'text',
            required: true,
            category: 'scope',
          });
        }

        // Suggest features based on domain
        const suggestedFeatures = domainKnowledge.standardFeatures.map(f => f.id);
        if (domainKnowledge.optionalFeatures.length > 0) {
          suggestedFeatures.push(...domainKnowledge.optionalFeatures.slice(0, 3).map(f => f.id));
        }

        return {
          needsClarification: true,
          confidence,
          detectedDomain: primaryDomain,
          missingInfo,
          questions,
          suggestedFeatures,
          discoveredInfo: {
            domain: primaryDomain,
            features: existingInfo?.features || [],
            answers: existingInfo?.answers || {},
          },
        };
      }
    }

    // Build discovered info
    const discoveredInfo: DiscoveredInfo = {
      domain: primaryDomain,
      features: domainKnowledge ? domainKnowledge.standardFeatures.map(f => f.id) : [],
      answers: existingInfo?.answers || {},
    };

    return {
      needsClarification,
      confidence,
      detectedDomain: primaryDomain,
      missingInfo,
      questions,
      discoveredInfo,
      suggestedFeatures: domainKnowledge
        ? domainKnowledge.standardFeatures.map(f => f.id)
        : undefined,
    };
  }

  /**
   * Process answers and update discovered info
   */
  processAnswers(
    discoveredInfo: DiscoveredInfo,
    answers: Record<string, unknown>
  ): DiscoveredInfo {
    const updated: DiscoveredInfo = {
      ...discoveredInfo,
      answers: {
        ...discoveredInfo.answers,
        ...answers,
      },
    };

    // If domain is known, apply feature logic based on answers
    if (updated.domain) {
      const domainKnowledge = this.domainKnowledge.getDomain(updated.domain);
      if (domainKnowledge) {
        // Start with standard features
        updated.features = domainKnowledge.standardFeatures.map(f => f.id);

        // Add optional features based on answers
        for (const [questionId, answer] of Object.entries(answers)) {
          // Map question IDs to features (simplified - could be more sophisticated)
          if (questionId === 'payment_processing' && answer === true) {
            updated.features.push('payment_processing');
          }
          if (questionId === 'e_signing' && answer === true) {
            updated.features.push('e_signing');
          }
          if (questionId === 'has_children' && answer === true) {
            updated.features.push('kids_management');
          }
          if (questionId === 'has_pets' && answer === true) {
            updated.features.push('pet_care');
          }
          if (questionId === 'meal_planning' && answer === true) {
            updated.features.push('meal_planning');
          }
          if (questionId === 'budget_tracking' && answer === true) {
            updated.features.push('budget_tracking');
          }
        }
      }
    }

    return updated;
  }

  /**
   * Get domain knowledge for a domain
   */
  getDomainKnowledge(domainId: string): DomainKnowledge | undefined {
    return this.domainKnowledge.getDomain(domainId);
  }
}
