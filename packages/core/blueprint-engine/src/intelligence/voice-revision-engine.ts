/**
 * Voice Revision Engine
 * 
 * Handles voice-based app modifications and edits.
 * "Make this page more modern", "Add invoicing", "Remove the calendar"
 */

import type {
  VoiceInput,
  AppContext,
  RevisionResult,
  RevisionIntent,
  RevisionChange,
  ParsedInput,
} from './types.js';
import { NLPEngine } from './nlp-engine.js';

// ============================================================
// REVISION PATTERNS
// ============================================================

interface RevisionPattern {
  intent: RevisionIntent;
  patterns: RegExp[];
  keywords: string[];
  extractTarget: (text: string, match: RegExpMatchArray | null) => string | null;
  generateChanges: (target: string, context: AppContext, parsed: ParsedInput) => RevisionChange[];
}

const REVISION_PATTERNS: RevisionPattern[] = [
  // STYLE CHANGES
  {
    intent: 'style_change',
    patterns: [
      /make\s+(it|this|the\s+\w+)\s+(more\s+)?(modern|minimal|professional|bold|playful|colorful|clean|sleek)/i,
      /change\s+(the\s+)?(style|design|look|theme)\s+to\s+(\w+)/i,
      /use\s+(a\s+)?(dark|light)\s*(mode|theme)?/i,
      /(dark|light)\s*mode/i,
    ],
    keywords: ['modern', 'minimal', 'professional', 'colorful', 'dark', 'light', 'clean', 'sleek', 'bold'],
    extractTarget: (text, match) => {
      if (match) {
        const styleWords = ['modern', 'minimal', 'professional', 'bold', 'playful', 'colorful', 'clean', 'sleek', 'dark', 'light'];
        for (const word of styleWords) {
          if (text.toLowerCase().includes(word)) return word;
        }
      }
      return null;
    },
    generateChanges: (target, context, parsed) => {
      const changes: RevisionChange[] = [];
      
      const styleMap: Record<string, object> = {
        modern: { borderRadius: 'lg', shadows: true, animations: true },
        minimal: { borderRadius: 'sm', shadows: false, dense: true },
        professional: { borderRadius: 'md', formal: true },
        bold: { colors: 'vibrant', fontSize: 'large' },
        colorful: { colors: 'vibrant', gradients: true },
        dark: { mode: 'dark' },
        light: { mode: 'light' },
        clean: { whitespace: 'generous', shadows: false },
      };
      
      const newStyle = styleMap[target.toLowerCase()] || {};
      
      changes.push({
        type: 'modify',
        target: 'style',
        targetId: 'theme',
        after: newStyle,
        description: `Update theme to ${target} style`,
      });
      
      return changes;
    },
  },

  // ADD FEATURE
  {
    intent: 'add_feature',
    patterns: [
      /add\s+(a\s+)?(invoicing|calendar|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
      /include\s+(a\s+)?(invoicing|calendar|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
      /i\s+(want|need)\s+(to\s+)?(add\s+)?(invoicing|calendar|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
      /enable\s+(invoicing|calendar|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
    ],
    keywords: ['add', 'include', 'enable', 'invoicing', 'calendar', 'scheduling', 'messaging', 'payments', 'dashboard', 'reports', 'inventory'],
    extractTarget: (text, match) => {
      const features = ['invoicing', 'calendar', 'scheduling', 'messaging', 'payments', 'payment', 'dashboard', 'reports', 'report', 'inventory'];
      for (const feature of features) {
        if (text.toLowerCase().includes(feature)) return feature;
      }
      return null;
    },
    generateChanges: (target, context, parsed) => {
      const changes: RevisionChange[] = [];
      
      // Map feature to required entities and pages
      const featureMap: Record<string, { entities: string[]; pages: string[]; workflows: string[] }> = {
        invoicing: {
          entities: ['invoice'],
          pages: ['invoices', 'invoice-form', 'invoice-detail'],
          workflows: ['create-invoice', 'send-invoice'],
        },
        calendar: {
          entities: ['event'],
          pages: ['calendar'],
          workflows: [],
        },
        scheduling: {
          entities: ['appointment'],
          pages: ['appointments', 'booking-form'],
          workflows: ['book-appointment', 'send-reminder'],
        },
        messaging: {
          entities: ['message'],
          pages: ['messages'],
          workflows: ['send-message'],
        },
        payments: {
          entities: ['payment'],
          pages: ['payments'],
          workflows: ['record-payment'],
        },
        payment: {
          entities: ['payment'],
          pages: ['payments'],
          workflows: ['record-payment'],
        },
        dashboard: {
          entities: [],
          pages: ['dashboard'],
          workflows: [],
        },
        reports: {
          entities: [],
          pages: ['reports'],
          workflows: [],
        },
        report: {
          entities: [],
          pages: ['reports'],
          workflows: [],
        },
        inventory: {
          entities: ['material', 'product'],
          pages: ['inventory'],
          workflows: ['update-stock'],
        },
      };
      
      const feature = featureMap[target.toLowerCase()];
      if (!feature) return changes;
      
      // Add entities
      for (const entityId of feature.entities) {
        changes.push({
          type: 'add',
          target: 'entity',
          targetId: entityId,
          after: { id: entityId },
          description: `Add ${entityId} entity for ${target}`,
        });
      }
      
      // Add pages
      for (const pageId of feature.pages) {
        changes.push({
          type: 'add',
          target: 'page',
          targetId: pageId,
          after: { id: pageId },
          description: `Add ${pageId} page for ${target}`,
        });
      }
      
      // Add workflows
      for (const workflowId of feature.workflows) {
        changes.push({
          type: 'add',
          target: 'workflow',
          targetId: workflowId,
          after: { id: workflowId },
          description: `Add ${workflowId} workflow for ${target}`,
        });
      }
      
      return changes;
    },
  },

  // REMOVE FEATURE
  {
    intent: 'remove_feature',
    patterns: [
      /remove\s+(the\s+)?(calendar|invoicing|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
      /delete\s+(the\s+)?(calendar|invoicing|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
      /hide\s+(the\s+)?(calendar|invoicing|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
      /i\s+don'?t\s+(need|want)\s+(the\s+)?(calendar|invoicing|scheduling|messaging|payments?|dashboard|reports?|inventory)/i,
    ],
    keywords: ['remove', 'delete', 'hide', 'dont need', 'dont want'],
    extractTarget: (text, match) => {
      const features = ['invoicing', 'calendar', 'scheduling', 'messaging', 'payments', 'dashboard', 'reports', 'inventory'];
      for (const feature of features) {
        if (text.toLowerCase().includes(feature)) return feature;
      }
      return null;
    },
    generateChanges: (target, context, parsed) => {
      const changes: RevisionChange[] = [];
      
      // Find related pages and remove them
      const relatedPages = context.pages.filter(p => 
        p.id.includes(target) || p.name.toLowerCase().includes(target)
      );
      
      for (const page of relatedPages) {
        changes.push({
          type: 'remove',
          target: 'page',
          targetId: page.id,
          before: page,
          description: `Remove ${page.name} page`,
        });
      }
      
      return changes;
    },
  },

  // MODIFY ENTITY
  {
    intent: 'modify_entity',
    patterns: [
      /add\s+(a\s+)?(\w+)\s+field\s+to\s+(\w+)/i,
      /(\w+)\s+should\s+have\s+(a\s+)?(\w+)\s+(field)?/i,
      /add\s+(\w+)\s+to\s+the\s+(\w+)\s+(form|entity|model|table)/i,
    ],
    keywords: ['add field', 'should have', 'add to'],
    extractTarget: (text, match) => {
      if (match) return match[0];
      return null;
    },
    generateChanges: (target, context, parsed) => {
      const changes: RevisionChange[] = [];
      
      // Extract field name and entity
      const addFieldMatch = target.match(/add\s+(a\s+)?(\w+)\s+field\s+to\s+(\w+)/i);
      if (addFieldMatch) {
        const fieldName = addFieldMatch[2];
        const entityName = addFieldMatch[3];
        
        const entity = context.entities.find(e => 
          e.id.toLowerCase() === entityName.toLowerCase() ||
          e.name.toLowerCase() === entityName.toLowerCase()
        );
        
        if (entity) {
          changes.push({
            type: 'add',
            target: 'field',
            targetId: `${entity.id}.${fieldName}`,
            after: { id: fieldName, name: fieldName, type: 'string' },
            description: `Add ${fieldName} field to ${entity.name}`,
          });
        }
      }
      
      return changes;
    },
  },

  // ADD PAGE
  {
    intent: 'add_page',
    patterns: [
      /add\s+(a\s+)?(new\s+)?(\w+)\s+page/i,
      /create\s+(a\s+)?(\w+)\s+page/i,
      /i\s+(need|want)\s+(a\s+)?(\w+)\s+page/i,
    ],
    keywords: ['add page', 'create page', 'new page'],
    extractTarget: (text, match) => {
      const addMatch = text.match(/(?:add|create)\s+(?:a\s+)?(?:new\s+)?(\w+)\s+page/i);
      return addMatch ? addMatch[1] : null;
    },
    generateChanges: (target, context, parsed) => {
      if (!target) return [];
      
      const pageId = target.toLowerCase().replace(/\s+/g, '-');
      const pageName = target.charAt(0).toUpperCase() + target.slice(1);
      
      return [{
        type: 'add',
        target: 'page',
        targetId: pageId,
        after: { id: pageId, name: pageName, route: `/${pageId}` },
        description: `Add ${pageName} page`,
      }];
    },
  },

  // MODIFY PAGE
  {
    intent: 'modify_page',
    patterns: [
      /rename\s+(the\s+)?(\w+)\s+(page\s+)?to\s+(\w+)/i,
      /change\s+(the\s+)?(\w+)\s+(page\s+)?name\s+to\s+(\w+)/i,
      /call\s+(the\s+)?(\w+)\s+(page\s+)?(\w+)\s+instead/i,
    ],
    keywords: ['rename', 'change name', 'call instead'],
    extractTarget: (text, match) => {
      const renameMatch = text.match(/rename\s+(?:the\s+)?(\w+)\s+(?:page\s+)?to\s+(\w+)/i);
      if (renameMatch) return `${renameMatch[1]}:${renameMatch[2]}`;
      return null;
    },
    generateChanges: (target, context, parsed) => {
      if (!target) return [];
      
      const [oldName, newName] = target.split(':');
      const page = context.pages.find(p => 
        p.id.toLowerCase() === oldName.toLowerCase() ||
        p.name.toLowerCase() === oldName.toLowerCase()
      );
      
      if (!page) return [];
      
      return [{
        type: 'modify',
        target: 'page',
        targetId: page.id,
        before: { name: page.name },
        after: { name: newName },
        description: `Rename ${page.name} to ${newName}`,
      }];
    },
  },

  // REORGANIZE
  {
    intent: 'reorganize',
    patterns: [
      /move\s+(the\s+)?(\w+)\s+to\s+(the\s+)?(main\s+menu|sidebar|top)/i,
      /put\s+(the\s+)?(\w+)\s+in\s+(the\s+)?(main\s+menu|sidebar|navigation)/i,
      /make\s+(the\s+)?(\w+)\s+(the\s+)?(first|main|default)\s+(page)?/i,
    ],
    keywords: ['move', 'put', 'reorganize', 'main menu', 'sidebar'],
    extractTarget: (text, match) => {
      return text;
    },
    generateChanges: (target, context, parsed) => {
      const changes: RevisionChange[] = [];
      
      // Move to main menu pattern
      const moveMatch = target.match(/move\s+(?:the\s+)?(\w+)\s+to\s+(?:the\s+)?(main\s+menu|sidebar)/i);
      if (moveMatch) {
        const pageName = moveMatch[1];
        const destination = moveMatch[2];
        
        const page = context.pages.find(p => 
          p.id.toLowerCase().includes(pageName.toLowerCase()) ||
          p.name.toLowerCase().includes(pageName.toLowerCase())
        );
        
        if (page) {
          changes.push({
            type: 'modify',
            target: 'page',
            targetId: page.id,
            after: { showInSidebar: true, order: 0 },
            description: `Move ${page.name} to ${destination}`,
          });
        }
      }
      
      // Make default page pattern
      const defaultMatch = target.match(/make\s+(?:the\s+)?(\w+)\s+(?:the\s+)?(first|main|default)/i);
      if (defaultMatch) {
        const pageName = defaultMatch[1];
        
        const page = context.pages.find(p => 
          p.id.toLowerCase().includes(pageName.toLowerCase()) ||
          p.name.toLowerCase().includes(pageName.toLowerCase())
        );
        
        if (page) {
          changes.push({
            type: 'modify',
            target: 'page',
            targetId: page.id,
            after: { route: '/', order: 0 },
            description: `Make ${page.name} the default page`,
          });
        }
      }
      
      return changes;
    },
  },
];

// ============================================================
// VOICE REVISION ENGINE
// ============================================================

export class VoiceRevisionEngine {
  private nlpEngine: NLPEngine;

  constructor() {
    this.nlpEngine = new NLPEngine();
  }

  /**
   * Process a voice revision request
   */
  async processRevision(input: VoiceInput, context: AppContext): Promise<RevisionResult> {
    // Parse the input
    const parsed = await this.nlpEngine.parse(input.text);
    
    // Match against revision patterns
    const matched = this.matchPattern(input.text, parsed, context);
    
    if (!matched) {
      return {
        intent: 'modify_app',
        confidence: 0.3,
        changes: [],
        affectedComponents: [],
        requiresConfirmation: true,
        confirmationMessage: "I'm not sure what change you'd like to make. Could you be more specific?",
        rollbackPossible: true,
      };
    }
    
    const { pattern, target, confidence } = matched;
    
    // Generate changes
    const changes = pattern.generateChanges(target, context, parsed);
    
    // Determine affected components
    const affectedComponents = changes.map(c => c.targetId);
    
    // Determine if confirmation is needed
    const requiresConfirmation = this.shouldConfirm(pattern.intent, changes);
    
    // Generate confirmation message
    const confirmationMessage = requiresConfirmation
      ? this.generateConfirmation(pattern.intent, changes)
      : undefined;
    
    return {
      intent: pattern.intent,
      confidence,
      changes,
      affectedComponents,
      requiresConfirmation,
      confirmationMessage,
      rollbackPossible: true,
    };
  }

  /**
   * Match input against revision patterns
   */
  private matchPattern(
    text: string,
    parsed: ParsedInput,
    context: AppContext
  ): { pattern: RevisionPattern; target: string; confidence: number } | null {
    let bestMatch: { pattern: RevisionPattern; target: string; confidence: number } | null = null;
    
    for (const pattern of REVISION_PATTERNS) {
      // Try each regex pattern
      for (const regex of pattern.patterns) {
        const match = text.match(regex);
        if (match) {
          const target = pattern.extractTarget(text, match);
          if (target) {
            const confidence = this.calculateConfidence(pattern, text, parsed);
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { pattern, target, confidence };
            }
          }
        }
      }
      
      // Also check keywords
      const keywordMatches = pattern.keywords.filter(kw => 
        text.toLowerCase().includes(kw.toLowerCase())
      );
      if (keywordMatches.length > 0) {
        const target = pattern.extractTarget(text, null);
        if (target) {
          const confidence = Math.min(keywordMatches.length * 0.2, 0.8);
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { pattern, target, confidence };
          }
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate confidence for a pattern match
   */
  private calculateConfidence(
    pattern: RevisionPattern,
    text: string,
    parsed: ParsedInput
  ): number {
    let confidence = 0.5;
    
    // Pattern match boost
    for (const regex of pattern.patterns) {
      if (regex.test(text)) {
        confidence += 0.3;
        break;
      }
    }
    
    // Keyword boost
    const keywordMatches = pattern.keywords.filter(kw => 
      text.toLowerCase().includes(kw.toLowerCase())
    );
    confidence += Math.min(keywordMatches.length * 0.1, 0.3);
    
    // Intent clarity boost
    if (parsed.intent === 'modify_app' || parsed.intent === 'change_design' || parsed.intent === 'add_feature') {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1);
  }

  /**
   * Determine if confirmation is needed
   */
  private shouldConfirm(intent: RevisionIntent, changes: RevisionChange[]): boolean {
    // Always confirm deletions
    if (intent === 'remove_feature' || intent === 'remove_page') {
      return true;
    }
    
    // Confirm if many changes
    if (changes.length > 3) {
      return true;
    }
    
    // Don't need to confirm simple style changes
    if (intent === 'style_change' && changes.length === 1) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate confirmation message
   */
  private generateConfirmation(intent: RevisionIntent, changes: RevisionChange[]): string {
    if (changes.length === 0) {
      return "I didn't find any changes to make. Could you be more specific?";
    }
    
    const descriptions = changes.slice(0, 3).map(c => c.description);
    const suffix = changes.length > 3 ? ` and ${changes.length - 3} more changes` : '';
    
    switch (intent) {
      case 'style_change':
        return `I'll update the style: ${descriptions.join(', ')}${suffix}. Sound good?`;
      case 'add_feature':
        return `I'll add the following: ${descriptions.join(', ')}${suffix}. Should I proceed?`;
      case 'remove_feature':
      case 'remove_page':
        return `⚠️ This will remove: ${descriptions.join(', ')}${suffix}. This cannot be undone. Are you sure?`;
      case 'modify_entity':
        return `I'll modify the data structure: ${descriptions.join(', ')}${suffix}. Proceed?`;
      case 'add_page':
        return `I'll add a new page: ${descriptions.join(', ')}${suffix}. Should I continue?`;
      case 'modify_page':
        return `I'll update the page: ${descriptions.join(', ')}${suffix}. Is that correct?`;
      case 'reorganize':
        return `I'll reorganize: ${descriptions.join(', ')}${suffix}. Shall I make these changes?`;
      default:
        return `I'll make the following changes: ${descriptions.join(', ')}${suffix}. Continue?`;
    }
  }

  /**
   * Apply changes to an app context (returns new context)
   */
  applyChanges(context: AppContext, changes: RevisionChange[]): AppContext {
    const newContext = { ...context };
    
    for (const change of changes) {
      switch (change.target) {
        case 'page':
          if (change.type === 'add') {
            newContext.pages = [...newContext.pages, change.after as any];
          } else if (change.type === 'remove') {
            newContext.pages = newContext.pages.filter(p => p.id !== change.targetId);
          } else if (change.type === 'modify') {
            newContext.pages = newContext.pages.map(p =>
              p.id === change.targetId ? { ...p, ...change.after as any } : p
            );
          }
          break;
          
        case 'entity':
          if (change.type === 'add') {
            newContext.entities = [...newContext.entities, change.after as any];
          } else if (change.type === 'remove') {
            newContext.entities = newContext.entities.filter(e => e.id !== change.targetId);
          }
          break;
          
        case 'workflow':
          if (change.type === 'add') {
            newContext.workflows = [...newContext.workflows, change.after as any];
          } else if (change.type === 'remove') {
            newContext.workflows = newContext.workflows.filter(w => w.id !== change.targetId);
          }
          break;
      }
    }
    
    return newContext;
  }
}
