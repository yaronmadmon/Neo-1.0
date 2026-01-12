/**
 * NLP Engine
 * 
 * Core natural language processing for voice-first app creation.
 * Parses user input into structured intents, entities, and semantic meaning.
 */

import type {
  ParsedInput,
  Token,
  PartOfSpeech,
  IntentType,
  SemanticIntent,
  NamedEntity,
  Modifier,
  VoiceInput,
} from './types.js';

// ============================================================
// LEXICONS & PATTERNS
// ============================================================

const ACTION_VERBS = new Set([
  'create', 'build', 'make', 'design', 'develop',
  'add', 'include', 'integrate', 'connect',
  'track', 'manage', 'organize', 'handle',
  'schedule', 'book', 'reserve', 'plan',
  'send', 'notify', 'alert', 'remind',
  'invoice', 'bill', 'charge', 'pay',
  'report', 'analyze', 'monitor', 'measure',
  'assign', 'delegate', 'share', 'collaborate',
  'automate', 'streamline', 'simplify', 'optimize',
  'change', 'modify', 'update', 'edit', 'fix',
  'remove', 'delete', 'hide', 'disable',
  'show', 'display', 'view', 'see',
]);

const STYLE_ADJECTIVES = new Set([
  'modern', 'minimal', 'clean', 'simple', 'sleek',
  'professional', 'corporate', 'business', 'formal',
  'colorful', 'vibrant', 'bold', 'bright', 'dark',
  'friendly', 'playful', 'fun', 'casual',
  'elegant', 'sophisticated', 'premium', 'luxurious',
  'compact', 'spacious', 'dense', 'airy',
]);

const QUANTITY_WORDS = new Set([
  'all', 'every', 'each', 'some', 'many', 'few',
  'multiple', 'several', 'single', 'one', 'two',
  'daily', 'weekly', 'monthly', 'yearly', 'annual',
]);

const PRIORITY_WORDS = new Set([
  'important', 'critical', 'urgent', 'priority',
  'essential', 'required', 'necessary', 'optional',
  'main', 'primary', 'secondary', 'minor',
]);

const TIME_WORDS = new Set([
  'today', 'tomorrow', 'yesterday', 'now', 'later',
  'morning', 'afternoon', 'evening', 'night',
  'before', 'after', 'during', 'while',
  'immediately', 'soon', 'eventually', 'always', 'never',
]);

const STATUS_WORDS = new Set([
  'active', 'inactive', 'pending', 'completed', 'done',
  'open', 'closed', 'new', 'old', 'archived',
  'approved', 'rejected', 'cancelled', 'draft',
]);

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'me', 'my', 'i',
  'we', 'our', 'you', 'your', 'it', 'its', 'that', 'this', 'these', 'those',
]);

// Intent detection patterns
const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: IntentType; weight: number }> = [
  // Create app
  { pattern: /^(build|create|make|design|develop)\s+(me\s+)?(an?\s+)?(app|application|system|tool)/i, intent: 'create_app', weight: 1.0 },
  { pattern: /^i\s+(want|need|would like)\s+(an?\s+)?(app|application)/i, intent: 'create_app', weight: 0.9 },
  { pattern: /(app|application|system|tool)\s+(for|to)/i, intent: 'create_app', weight: 0.7 },
  
  // Add feature
  { pattern: /^add\s+(a\s+)?(.+?)\s+(feature|functionality|capability)/i, intent: 'add_feature', weight: 1.0 },
  { pattern: /^include\s+(a\s+)?(.+)/i, intent: 'add_feature', weight: 0.8 },
  { pattern: /^i\s+also\s+(want|need)/i, intent: 'add_feature', weight: 0.7 },
  
  // Change design
  { pattern: /^(make|change|update)\s+(it|this|the\s+design|the\s+app)\s+(more\s+)?(modern|minimal|colorful|professional)/i, intent: 'change_design', weight: 1.0 },
  { pattern: /^(change|update)\s+(the\s+)?(color|theme|style|look)/i, intent: 'change_design', weight: 0.9 },
  { pattern: /(more\s+)?(modern|minimal|clean|professional|colorful)/i, intent: 'change_design', weight: 0.5 },
  
  // Add page
  { pattern: /^add\s+(a\s+)?(new\s+)?page/i, intent: 'add_page', weight: 1.0 },
  { pattern: /^(create|add)\s+(a\s+)?(.+?)\s+page/i, intent: 'add_page', weight: 0.9 },
  
  // Add entity
  { pattern: /^add\s+(a\s+)?(.+?)\s+(table|model|entity|data\s+type)/i, intent: 'add_entity', weight: 1.0 },
  { pattern: /^i\s+(want|need)\s+to\s+track\s+(.+)/i, intent: 'add_entity', weight: 0.8 },
  
  // Modify app
  { pattern: /^(change|modify|update|edit)\s+(the\s+)?(.+)/i, intent: 'modify_app', weight: 0.7 },
  { pattern: /^(rename|move|reorganize)/i, intent: 'modify_app', weight: 0.8 },
  
  // Remove feature
  { pattern: /^(remove|delete|hide|disable)\s+(the\s+)?(.+)/i, intent: 'remove_feature', weight: 0.9 },
  
  // Query/help
  { pattern: /^(what|how|why|can\s+you|show\s+me)/i, intent: 'query', weight: 0.8 },
  { pattern: /^help/i, intent: 'help', weight: 1.0 },
];

// Semantic intent patterns
const SEMANTIC_PATTERNS: Array<{ pattern: RegExp; intent: SemanticIntent }> = [
  { pattern: /track(ing)?|monitor(ing)?|follow|watch|log(ging)?/i, intent: 'tracking' },
  { pattern: /schedul(e|ing)|appoint(ment)?|book(ing)?|calendar|plan(ning)?/i, intent: 'scheduling' },
  { pattern: /manag(e|ing|ement)|organiz(e|ing)|handle|control/i, intent: 'managing' },
  { pattern: /organiz(e|ing)|sort(ing)?|categor(y|ize)|group(ing)?/i, intent: 'organizing' },
  { pattern: /send|message|notify|alert|communicate|email|sms/i, intent: 'communicating' },
  { pattern: /invoice|bill(ing)?|payment|charge|price|cost|money/i, intent: 'billing' },
  { pattern: /report(ing)?|analyz(e|ing)|analytic|statistic|dashboard|metric/i, intent: 'reporting' },
  { pattern: /team|collaborat(e|ion)|share|together|assign|delegate/i, intent: 'collaborating' },
  { pattern: /automat(e|ion)|workflow|trigger|when.*then|if.*then/i, intent: 'automating' },
  { pattern: /monitor(ing)?|watch|observ(e|ing)|check|status/i, intent: 'monitoring' },
];

// Named entity patterns
const ENTITY_PATTERNS: Array<{ pattern: RegExp; type: NamedEntity['type'] }> = [
  { pattern: /\$[\d,]+(\.\d{2})?/g, type: 'money' },
  { pattern: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, type: 'date' },
  { pattern: /\d{1,2}:\d{2}\s*(am|pm)?/gi, type: 'time' },
  { pattern: /\d+\s*(hours?|days?|weeks?|months?|years?)/gi, type: 'quantity' },
  { pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, type: 'person' },
];

// ============================================================
// NLP ENGINE
// ============================================================

export class NLPEngine {
  /**
   * Parse voice input into structured representation
   */
  async parse(text: string): Promise<ParsedInput> {
    const normalized = this.normalize(text);
    const tokens = this.tokenize(normalized);
    const intent = this.detectIntent(normalized, tokens);
    const semanticIntents = this.detectSemanticIntents(normalized);
    const namedEntities = this.extractNamedEntities(text);
    const modifiers = this.extractModifiers(tokens);
    
    const actions = tokens
      .filter(t => t.pos === 'verb' && ACTION_VERBS.has(t.lemma))
      .map(t => t.lemma);
    
    const nouns = tokens
      .filter(t => t.pos === 'noun' && !STOP_WORDS.has(t.lemma))
      .map(t => t.lemma);
    
    const adjectives = tokens
      .filter(t => t.pos === 'adjective')
      .map(t => t.lemma);
    
    const phrases = this.extractPhrases(tokens);
    
    return {
      original: text,
      normalized,
      intent: intent.type,
      confidence: intent.confidence,
      tokens,
      actions,
      nouns,
      adjectives,
      phrases,
      intents: semanticIntents,
      namedEntities,
      modifiers,
    };
  }

  /**
   * Normalize input text
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s'"$.,!?-]/g, '')
      .trim();
  }

  /**
   * Tokenize text into words with POS tagging
   */
  private tokenize(text: string): Token[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    return words.map((word, index) => {
      const cleaned = word.replace(/[.,!?'"]/g, '');
      const lemma = this.lemmatize(cleaned);
      const pos = this.tagPOS(cleaned, lemma, words, index);
      const importance = this.calculateImportance(cleaned, lemma, pos);
      
      return {
        text: word,
        lemma,
        pos,
        index,
        importance,
      };
    });
  }

  /**
   * Simple lemmatization
   */
  private lemmatize(word: string): string {
    const lower = word.toLowerCase();
    
    // Common verb forms
    if (lower.endsWith('ing')) {
      const base = lower.slice(0, -3);
      if (base.endsWith('t') || base.endsWith('n') || base.endsWith('d')) {
        return base;
      }
      return base + 'e';
    }
    if (lower.endsWith('ed')) {
      return lower.slice(0, -2);
    }
    if (lower.endsWith('s') && !lower.endsWith('ss')) {
      return lower.slice(0, -1);
    }
    if (lower.endsWith('ies')) {
      return lower.slice(0, -3) + 'y';
    }
    
    // Irregular verbs
    const irregulars: Record<string, string> = {
      'built': 'build', 'made': 'make', 'sent': 'send',
      'paid': 'pay', 'set': 'set', 'put': 'put',
    };
    if (irregulars[lower]) return irregulars[lower];
    
    return lower;
  }

  /**
   * Part-of-speech tagging
   */
  private tagPOS(word: string, lemma: string, context: string[], index: number): PartOfSpeech {
    const lower = word.toLowerCase();
    
    // Check lexicons first
    if (ACTION_VERBS.has(lemma)) return 'verb';
    if (STYLE_ADJECTIVES.has(lemma)) return 'adjective';
    if (QUANTITY_WORDS.has(lemma) || PRIORITY_WORDS.has(lemma)) return 'adjective';
    if (TIME_WORDS.has(lemma)) return 'adverb';
    if (STATUS_WORDS.has(lemma)) return 'adjective';
    if (STOP_WORDS.has(lower)) {
      if (['a', 'an', 'the'].includes(lower)) return 'determiner';
      if (['and', 'or', 'but'].includes(lower)) return 'conjunction';
      if (['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from'].includes(lower)) return 'preposition';
      if (['i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'they'].includes(lower)) return 'pronoun';
    }
    
    // Number detection
    if (/^\d+$/.test(word) || /^\$[\d,]+/.test(word)) return 'number';
    
    // Context-based heuristics
    const prevWord = index > 0 ? context[index - 1].toLowerCase() : '';
    const nextWord = index < context.length - 1 ? context[index + 1].toLowerCase() : '';
    
    // Adjective patterns: after "more", "very", "really" or before nouns
    if (['more', 'very', 'really', 'quite', 'so'].includes(prevWord)) return 'adjective';
    
    // Verb patterns: after "to", "can", "will", "should"
    if (['to', 'can', 'will', 'would', 'should', 'could', 'must', 'please'].includes(prevWord)) return 'verb';
    
    // After determiners = likely noun
    if (['a', 'an', 'the', 'my', 'your', 'our', 'their'].includes(prevWord)) {
      if (['that', 'which', 'who'].includes(nextWord)) return 'noun';
      return 'noun';
    }
    
    // Common noun endings
    if (/tion$|ment$|ness$|ity$|er$|or$|ist$|ism$/.test(lower)) return 'noun';
    
    // Common adjective endings
    if (/ful$|less$|ous$|ive$|able$|ible$|al$|ical$/.test(lower)) return 'adjective';
    
    // Default to noun for unknown words
    return lower.length > 2 && !STOP_WORDS.has(lower) ? 'noun' : 'unknown';
  }

  /**
   * Calculate word importance
   */
  private calculateImportance(word: string, lemma: string, pos: PartOfSpeech): number {
    let score = 0.5;
    
    if (pos === 'noun') score += 0.3;
    if (pos === 'verb') score += 0.2;
    if (pos === 'adjective') score += 0.1;
    
    if (ACTION_VERBS.has(lemma)) score += 0.2;
    if (STOP_WORDS.has(lemma)) score -= 0.4;
    
    // Longer words tend to be more meaningful
    if (word.length > 6) score += 0.1;
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Detect primary intent
   */
  private detectIntent(text: string, tokens: Token[]): { type: IntentType; confidence: number } {
    let bestMatch: { type: IntentType; confidence: number } = {
      type: 'create_app',
      confidence: 0.5,
    };
    
    for (const { pattern, intent, weight } of INTENT_PATTERNS) {
      if (pattern.test(text)) {
        const confidence = weight;
        if (confidence > bestMatch.confidence) {
          bestMatch = { type: intent, confidence };
        }
      }
    }
    
    // If no strong match, infer from verbs
    if (bestMatch.confidence < 0.6) {
      const verbs = tokens.filter(t => t.pos === 'verb').map(t => t.lemma);
      
      if (verbs.some(v => ['create', 'build', 'make', 'design', 'develop'].includes(v))) {
        bestMatch = { type: 'create_app', confidence: 0.7 };
      } else if (verbs.some(v => ['add', 'include', 'integrate'].includes(v))) {
        bestMatch = { type: 'add_feature', confidence: 0.6 };
      } else if (verbs.some(v => ['change', 'modify', 'update', 'edit'].includes(v))) {
        bestMatch = { type: 'modify_app', confidence: 0.6 };
      } else if (verbs.some(v => ['remove', 'delete', 'hide'].includes(v))) {
        bestMatch = { type: 'remove_feature', confidence: 0.6 };
      }
    }
    
    return bestMatch;
  }

  /**
   * Detect semantic intents
   */
  private detectSemanticIntents(text: string): SemanticIntent[] {
    const intents: SemanticIntent[] = [];
    
    for (const { pattern, intent } of SEMANTIC_PATTERNS) {
      if (pattern.test(text)) {
        intents.push(intent);
      }
    }
    
    return [...new Set(intents)];
  }

  /**
   * Extract named entities
   */
  private extractNamedEntities(text: string): NamedEntity[] {
    const entities: NamedEntity[] = [];
    
    for (const { pattern, type } of ENTITY_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type,
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8,
        });
      }
    }
    
    return entities;
  }

  /**
   * Extract modifiers
   */
  private extractModifiers(tokens: Token[]): Modifier[] {
    const modifiers: Modifier[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      
      if (QUANTITY_WORDS.has(token.lemma)) {
        modifiers.push({
          text: token.text,
          type: 'quantity',
          target: nextToken?.text,
        });
      } else if (PRIORITY_WORDS.has(token.lemma)) {
        modifiers.push({
          text: token.text,
          type: 'priority',
          target: nextToken?.text,
        });
      } else if (TIME_WORDS.has(token.lemma)) {
        modifiers.push({
          text: token.text,
          type: 'time',
        });
      } else if (STATUS_WORDS.has(token.lemma)) {
        modifiers.push({
          text: token.text,
          type: 'status',
          target: nextToken?.text,
        });
      } else if (STYLE_ADJECTIVES.has(token.lemma)) {
        modifiers.push({
          text: token.text,
          type: 'style',
        });
      }
    }
    
    return modifiers;
  }

  /**
   * Extract meaningful phrases
   */
  private extractPhrases(tokens: Token[]): string[] {
    const phrases: string[] = [];
    let currentPhrase: string[] = [];
    
    for (const token of tokens) {
      if (token.importance > 0.5 && !STOP_WORDS.has(token.lemma)) {
        currentPhrase.push(token.text);
      } else if (currentPhrase.length > 0) {
        if (currentPhrase.length >= 2) {
          phrases.push(currentPhrase.join(' '));
        }
        currentPhrase = [];
      }
    }
    
    if (currentPhrase.length >= 2) {
      phrases.push(currentPhrase.join(' '));
    }
    
    return phrases;
  }
}
