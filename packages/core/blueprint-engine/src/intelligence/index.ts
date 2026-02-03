/**
 * NEO Intelligence Layer
 * 
 * The brain of the audio-first app builder.
 * Converts natural language voice input into structured app requirements.
 * 
 * @module @neo/intelligence
 */

// Export classes from each module
export { NLPEngine } from './nlp-engine.js';
export { IndustryMapper } from './industry-mapper.js';
export { FeatureDetector } from './feature-detector.js';
export { EntityInferenceEngine } from './entity-inference.js';
export { WorkflowInferenceEngine } from './workflow-inference.js';
export { UILayoutSelector } from './ui-layout-selector.js';
export { BehaviorMatcher } from './behavior-matcher.js';
export { VoiceRevisionEngine } from './voice-revision-engine.js';

// Export action mapper for industry-aware card actions
export {
  getEntityActions,
  getEntityActionTypes,
  getPrimaryAction,
  getSecondaryActions,
  getActionDefinition,
  createAction,
  isPersonEntity,
  isItemEntity,
  getCardTypeForEntity,
} from './action-mapper.js';
export type { CardAction, CardActionType } from './action-mapper.js';

// Export types selectively to avoid conflicts with core types
export type {
  VoiceInput,
  AppContext,
  ParsedInput,
  IndustryMapping,
  DetectedFeature,
  InferredEntity,
  InferredWorkflow,
  SelectedLayout,
  MatchedBehavior,
  RevisionResult,
  IntelligenceResult,
  RevisionIntent,
} from './types.js';

// Re-export the unified intelligence orchestrator
import { NLPEngine } from './nlp-engine.js';
import { IndustryMapper } from './industry-mapper.js';
import { FeatureDetector } from './feature-detector.js';
import { EntityInferenceEngine } from './entity-inference.js';
import { WorkflowInferenceEngine } from './workflow-inference.js';
import { UILayoutSelector } from './ui-layout-selector.js';
import { BehaviorMatcher } from './behavior-matcher.js';
import { VoiceRevisionEngine } from './voice-revision-engine.js';
import type { 
  IntelligenceResult, 
  VoiceInput, 
  AppContext,
  RevisionResult 
} from './types.js';

/**
 * NeoIntelligence - The unified intelligence orchestrator
 * 
 * Processes voice input and produces a complete understanding
 * of what the user wants to build.
 */
export class NeoIntelligence {
  private nlp: NLPEngine;
  private industryMapper: IndustryMapper;
  private featureDetector: FeatureDetector;
  private entityInference: EntityInferenceEngine;
  private workflowInference: WorkflowInferenceEngine;
  private layoutSelector: UILayoutSelector;
  private behaviorMatcher: BehaviorMatcher;
  private revisionEngine: VoiceRevisionEngine;

  constructor() {
    this.nlp = new NLPEngine();
    this.industryMapper = new IndustryMapper();
    this.featureDetector = new FeatureDetector();
    this.entityInference = new EntityInferenceEngine();
    this.workflowInference = new WorkflowInferenceEngine();
    this.layoutSelector = new UILayoutSelector();
    this.behaviorMatcher = new BehaviorMatcher();
    this.revisionEngine = new VoiceRevisionEngine();
  }

  /**
   * Process voice input and understand what the user wants
   */
  async understand(input: VoiceInput): Promise<IntelligenceResult> {
    // Step 1: Parse natural language
    const parsed = await this.nlp.parse(input.text);
    
    // Step 2: Map to industry/profession
    const industry = await this.industryMapper.map(parsed);
    
    // Step 3: Detect features
    const features = await this.featureDetector.detect(parsed, industry);
    
    // Step 4: Infer entities
    const entities = await this.entityInference.infer(parsed, industry, features);
    
    // Step 5: Infer workflows
    const workflows = await this.workflowInference.infer(parsed, entities, features);
    
    // Step 6: Select layout
    const layout = await this.layoutSelector.select(parsed, industry, features);
    
    // Step 7: Match behavior bundle
    const behavior = await this.behaviorMatcher.match(parsed, industry, features);
    
    return {
      parsed,
      industry,
      features,
      entities,
      workflows,
      layout,
      behavior,
      confidence: this.calculateConfidence(parsed, industry, features),
      suggestedQuestions: this.generateFollowUpQuestions(parsed, industry, features),
    };
  }

  /**
   * Process a voice revision request on an existing app
   */
  async revise(input: VoiceInput, context: AppContext): Promise<RevisionResult> {
    return this.revisionEngine.processRevision(input, context);
  }

  /**
   * Calculate overall confidence in the understanding
   */
  private calculateConfidence(
    parsed: any,
    industry: any,
    features: any
  ): number {
    const weights = {
      nlp: 0.25,
      industry: 0.25,
      features: 0.25,
      specificity: 0.25,
    };

    const nlpScore = parsed.confidence || 0.5;
    const industryScore = industry.confidence || 0.5;
    const featureScore = features.length > 0 ? Math.min(features.length / 5, 1) : 0.3;
    const specificityScore = parsed.tokens?.length > 5 ? 0.8 : 0.5;

    return (
      nlpScore * weights.nlp +
      industryScore * weights.industry +
      featureScore * weights.features +
      specificityScore * weights.specificity
    );
  }

  /**
   * Generate follow-up questions if understanding is incomplete
   */
  private generateFollowUpQuestions(
    parsed: any,
    industry: any,
    features: any
  ): string[] {
    const questions: string[] = [];

    if (!industry.id || industry.confidence < 0.5) {
      questions.push("What type of business or activity is this app for?");
    }

    if (features.length < 2) {
      questions.push("What are the main things you want to track or manage?");
    }

    if (!parsed.intents?.includes('scheduling') && !parsed.intents?.includes('tracking')) {
      questions.push("Do you need to schedule appointments or track items over time?");
    }

    return questions;
  }
}

// Export singleton for convenience
export const neoIntelligence = new NeoIntelligence();
