/**
 * Command Parser
 * Parses natural language commands into structured intents
 * Enhanced for non-tech users with extensive pattern support
 */

/**
 * Parsed intent structure
 */
export interface ParsedIntent {
  /** Type of command */
  type: 'style' | 'visibility' | 'layout' | 'mode' | 'preset' | 'undo' | 'redo' | 'unknown';
  
  /** Target element (e.g., "background", "buttons", "this") */
  target?: string;
  
  /** Value to apply (e.g., "green", "bold", "lg") */
  value?: string;
  
  /** Relative change direction */
  delta?: 'more' | 'less';
  
  /** Scope of change */
  scope?: 'global' | 'selected';
  
  /** Original command text */
  raw: string;
  
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * Command patterns for matching
 */
interface CommandPattern {
  pattern: RegExp;
  type: ParsedIntent['type'];
  extractor: (match: RegExpMatchArray) => Partial<ParsedIntent>;
}

/**
 * Style preset patterns (casual phrases)
 */
const PRESET_PHRASES: Record<string, string> = {
  'make it pop': 'make it pop',
  'pop': 'make it pop',
  'tone it down': 'tone it down',
  'tone down': 'tone it down',
  'soften': 'soften',
  'soft': 'soften',
  'softer': 'soften',
  'sharpen': 'sharpen',
  'sharp': 'sharpen',
  'sharper': 'sharpen',
  'modernize': 'modernize',
  'modern': 'modernize',
  'update look': 'modernize',
  'freshen up': 'modernize',
  'freshen': 'modernize',
  'professional': 'professional',
  'business': 'professional',
  'business like': 'professional',
  'corporate': 'professional',
  'playful': 'playful',
  'fun': 'playful',
  'friendly': 'friendly',
  'minimal': 'minimal',
  'minimalist': 'minimal',
  'simple': 'minimal',
  'clean': 'minimal',
  'bold': 'bold',
  'strong': 'bold',
  'calm': 'calm',
  'relaxing': 'calm',
  'peaceful': 'calm',
  'energetic': 'energetic',
  'vibrant': 'energetic',
  'lively': 'energetic',
  'elegant': 'elegant',
  'classy': 'elegant',
  'sophisticated': 'elegant',
  'serious': 'serious',
};

/**
 * Command patterns ordered by specificity
 */
const COMMAND_PATTERNS: CommandPattern[] = [
  // === UNDO/REDO ===
  {
    pattern: /^(undo|go back|revert|take that back|oops)$/i,
    type: 'undo',
    extractor: () => ({ confidence: 1.0 }),
  },
  {
    pattern: /^(redo|redo that|do it again)$/i,
    type: 'redo',
    extractor: () => ({ confidence: 1.0 }),
  },
  
  // === MODE COMMANDS (dark/light) ===
  {
    pattern: /^(?:switch\s+to\s+|enable\s+|turn\s+on\s+|go\s+)?(dark|light|night|day)\s*(?:mode|theme)?$/i,
    type: 'mode',
    extractor: (match) => ({
      value: match[1].toLowerCase(),
      confidence: 0.95,
    }),
  },
  {
    pattern: /^(dark|light|night|day)\s+mode$/i,
    type: 'mode',
    extractor: (match) => ({
      value: match[1].toLowerCase(),
      confidence: 0.95,
    }),
  },
  {
    pattern: /^(?:toggle|switch|flip)\s+(?:the\s+)?(?:mode|theme|dark\s*mode|light\s*mode)$/i,
    type: 'mode',
    extractor: () => ({
      value: 'toggle',
      confidence: 0.95,
    }),
  },
  {
    pattern: /^(?:make\s+it\s+)?(dark|light|darker|lighter|dim|bright)$/i,
    type: 'mode',
    extractor: (match) => {
      const val = match[1].toLowerCase();
      const mappedValue = val === 'darker' || val === 'dim' ? 'dark' : 
                          val === 'lighter' || val === 'bright' ? 'light' : val;
      return {
        value: mappedValue,
        confidence: 0.85,
      };
    },
  },
  
  // === STYLE PRESETS (casual phrases) ===
  {
    pattern: /^(?:make\s+it\s+)?(?:look\s+)?(pop|modern|professional|playful|fun|friendly|minimal|clean|simple|bold|calm|elegant|serious|energetic|vibrant)(?:\s+looking)?$/i,
    type: 'preset',
    extractor: (match) => {
      const phrase = match[1].toLowerCase();
      const preset = PRESET_PHRASES[phrase] || phrase;
      return {
        value: preset,
        confidence: 0.85,
      };
    },
  },
  {
    pattern: /^(make\s+it\s+pop|tone\s+(?:it\s+)?down|soften|sharpen|modernize|freshen\s+up)$/i,
    type: 'preset',
    extractor: (match) => {
      const phrase = match[1].toLowerCase().trim();
      const preset = PRESET_PHRASES[phrase] || phrase;
      return {
        value: preset,
        confidence: 0.9,
      };
    },
  },
  
  // === STYLE COMMANDS ===
  
  // "make the [target] [value]"
  {
    pattern: /^make\s+(?:the\s+)?(.+?)\s+(more\s+)?(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[1].trim(),
      delta: match[2] ? 'more' : undefined,
      value: match[3].trim(),
      confidence: 0.9,
    }),
  },
  
  // "make it [value]" (contextual target)
  {
    pattern: /^make\s+(?:it|this)\s+(more\s+)?(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: 'this',
      delta: match[1] ? 'more' : undefined,
      value: match[2].trim(),
      scope: 'selected',
      confidence: 0.85,
    }),
  },
  
  // "change [target] to [value]"
  {
    pattern: /^change\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[1].trim(),
      value: match[2].trim(),
      confidence: 0.9,
    }),
  },
  
  // "set [target] to [value]"
  {
    pattern: /^set\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[1].trim(),
      value: match[2].trim(),
      confidence: 0.9,
    }),
  },
  
  // "I want [target] [value]" / "I'd like [target] [value]"
  {
    pattern: /^i(?:'d|\s+would)?\s+(?:want|like|prefer)\s+(?:the\s+)?(.+?)\s+(?:to\s+be\s+)?(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[1].trim(),
      value: match[2].trim(),
      confidence: 0.85,
    }),
  },
  
  // "can you make [target] [value]"
  {
    pattern: /^(?:can\s+you|could\s+you|please)\s+(?:make|change|set)\s+(?:the\s+)?(.+?)\s+(?:to\s+)?(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[1].trim(),
      value: match[2].trim(),
      confidence: 0.85,
    }),
  },
  
  // "[target] should be [value]"
  {
    pattern: /^(?:the\s+)?(.+?)\s+should\s+be\s+(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[1].trim(),
      value: match[2].trim(),
      confidence: 0.8,
    }),
  },
  
  // "use [value] for [target]"
  {
    pattern: /^use\s+(.+?)\s+(?:for|on|as)\s+(?:the\s+)?(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[2].trim(),
      value: match[1].trim(),
      confidence: 0.85,
    }),
  },
  
  // "[target] = [value]" shorthand
  {
    pattern: /^(.+?)\s*=\s*(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: match[1].trim(),
      value: match[2].trim(),
      confidence: 0.8,
    }),
  },
  
  // "more [property]" (relative increase)
  {
    pattern: /^more\s+(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: 'this',
      value: match[1].trim(),
      delta: 'more',
      scope: 'selected',
      confidence: 0.85,
    }),
  },
  
  // "less [property]" (relative decrease)
  {
    pattern: /^less\s+(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: 'this',
      value: match[1].trim(),
      delta: 'less',
      scope: 'selected',
      confidence: 0.85,
    }),
  },
  
  // "a bit more/less [property]"
  {
    pattern: /^(?:a\s+)?(?:bit|little|tad)\s+(more|less)\s+(.+)$/i,
    type: 'style',
    extractor: (match) => ({
      target: 'this',
      value: match[2].trim(),
      delta: match[1].toLowerCase() as 'more' | 'less',
      scope: 'selected',
      confidence: 0.8,
    }),
  },
  
  // "[value]er" (comparative - rounder, bigger, smaller)
  {
    pattern: /^(\w+)er$/i,
    type: 'style',
    extractor: (match) => {
      const base = match[1].toLowerCase();
      // Map comparatives to base + delta
      const comparativeMap: Record<string, { value: string; delta: 'more' | 'less' }> = {
        'round': { value: 'rounded', delta: 'more' },
        'bigg': { value: 'large', delta: 'more' },
        'small': { value: 'small', delta: 'more' },
        'larg': { value: 'large', delta: 'more' },
        'bold': { value: 'bold', delta: 'more' },
        'light': { value: 'light', delta: 'more' },
        'dark': { value: 'dark', delta: 'more' },
        'bright': { value: 'bright', delta: 'more' },
        'soft': { value: 'soft', delta: 'more' },
        'sharp': { value: 'sharp', delta: 'more' },
      };
      
      const mapped = comparativeMap[base];
      if (mapped) {
        return {
          target: 'this',
          value: mapped.value,
          delta: mapped.delta,
          scope: 'selected',
          confidence: 0.75,
        };
      }
      return { confidence: 0.3 };
    },
  },
  
  // === VISIBILITY COMMANDS ===
  
  // "hide [target]"
  {
    pattern: /^(?:hide|remove|delete|get\s+rid\s+of)\s+(?:the\s+)?(.+)$/i,
    type: 'visibility',
    extractor: (match) => ({
      target: match[1].trim(),
      value: 'hidden',
      confidence: 0.9,
    }),
  },
  
  // "show [target]"
  {
    pattern: /^(?:show|add|display|bring\s+back)\s+(?:the\s+)?(.+)$/i,
    type: 'visibility',
    extractor: (match) => ({
      target: match[1].trim(),
      value: 'visible',
      confidence: 0.9,
    }),
  },
  
  // "I don't need [target]"
  {
    pattern: /^i\s+don'?t\s+(?:need|want|like)\s+(?:the\s+)?(.+)$/i,
    type: 'visibility',
    extractor: (match) => ({
      target: match[1].trim(),
      value: 'hidden',
      confidence: 0.85,
    }),
  },
  
  // "I need [target]" / "I want [target]"
  {
    pattern: /^i\s+(?:need|want)\s+(?:a\s+)?(.+)$/i,
    type: 'visibility',
    extractor: (match) => ({
      target: match[1].trim(),
      value: 'visible',
      confidence: 0.8,
    }),
  },
  
  // === LAYOUT COMMANDS ===
  
  // "make it [columns] columns"
  {
    pattern: /^(?:make\s+(?:it\s+)?)?(\d+|one|two|three|four|single)\s+columns?$/i,
    type: 'layout',
    extractor: (match) => {
      const numMap: Record<string, string> = { 
        'one': '1', 'single': '1', 'two': '2', 'three': '3', 'four': '4' 
      };
      const num = numMap[match[1].toLowerCase()] || match[1];
      return {
        target: 'layout',
        value: `${num}_column`,
        confidence: 0.9,
      };
    },
  },
  
  // "sidebar on [side]"
  {
    pattern: /^(?:add\s+)?(?:a\s+)?sidebar\s+(?:on\s+(?:the\s+)?)?(left|right)$/i,
    type: 'layout',
    extractor: (match) => ({
      target: 'layout',
      value: `sidebar_${match[1].toLowerCase()}`,
      confidence: 0.9,
    }),
  },
  
  // "[side] sidebar"
  {
    pattern: /^(left|right)\s+sidebar$/i,
    type: 'layout',
    extractor: (match) => ({
      target: 'layout',
      value: `sidebar_${match[1].toLowerCase()}`,
      confidence: 0.9,
    }),
  },
  
  // "side by side" / "stacked"
  {
    pattern: /^(?:make\s+(?:it\s+)?)?side\s+by\s+side$/i,
    type: 'layout',
    extractor: () => ({
      target: 'layout',
      value: '2_column',
      confidence: 0.85,
    }),
  },
  {
    pattern: /^(?:make\s+(?:it\s+)?)?stacked$/i,
    type: 'layout',
    extractor: () => ({
      target: 'layout',
      value: '1_column',
      confidence: 0.85,
    }),
  },
  
  // "grid layout" / "dashboard layout"
  {
    pattern: /^(?:make\s+(?:it\s+)?)?(?:a\s+)?(grid|dashboard)\s*(?:layout)?$/i,
    type: 'layout',
    extractor: (match) => ({
      target: 'layout',
      value: match[1].toLowerCase() === 'grid' ? 'grid' : 'dashboard',
      confidence: 0.85,
    }),
  },
  
  // === SIMPLE COLOR ASSIGNMENT ===
  
  // Simple color assignment: "[color]" (when context suggests target)
  {
    pattern: /^(red|orange|yellow|green|blue|purple|pink|teal|cyan|indigo|violet|gray|grey|white|black|navy|emerald|rose|amber|lime|sky|slate)$/i,
    type: 'style',
    extractor: (match) => ({
      target: 'this',
      value: match[1].toLowerCase(),
      scope: 'selected',
      confidence: 0.6,
    }),
  },
  
  // "[light/dark] [color]"
  {
    pattern: /^(light|dark)\s+(red|orange|yellow|green|blue|purple|pink|teal|cyan|indigo|violet|gray|grey)$/i,
    type: 'style',
    extractor: (match) => ({
      target: 'this',
      value: `${match[1].toLowerCase()}-${match[2].toLowerCase()}`,
      scope: 'selected',
      confidence: 0.65,
    }),
  },
];

/**
 * Parse a command string into a structured intent
 */
export function parseCommand(command: string): ParsedIntent {
  const trimmed = command.trim();
  
  if (!trimmed) {
    return {
      type: 'unknown',
      raw: command,
      confidence: 0,
    };
  }
  
  // Check for preset phrases first (exact match)
  const lowerTrimmed = trimmed.toLowerCase();
  if (PRESET_PHRASES[lowerTrimmed]) {
    return {
      type: 'preset',
      value: PRESET_PHRASES[lowerTrimmed],
      raw: command,
      confidence: 0.95,
    };
  }
  
  // Try each pattern
  for (const { pattern, type, extractor } of COMMAND_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const extracted = extractor(match);
      // Skip low confidence extractions
      if (extracted.confidence && extracted.confidence < 0.3) {
        continue;
      }
      return {
        type,
        raw: command,
        ...extracted,
      } as ParsedIntent;
    }
  }
  
  // No pattern matched - try to extract target and value heuristically
  const words = trimmed.split(/\s+/);
  
  // Two word format: "target value" 
  if (words.length === 2) {
    return {
      type: 'style',
      target: words[0],
      value: words[1],
      raw: command,
      confidence: 0.4,
    };
  }
  
  // Three word format: "target to value" or "target is value"
  if (words.length === 3 && (words[1] === 'to' || words[1] === 'is')) {
    return {
      type: 'style',
      target: words[0],
      value: words[2],
      raw: command,
      confidence: 0.5,
    };
  }
  
  return {
    type: 'unknown',
    raw: command,
    confidence: 0,
  };
}

/**
 * Check if a command is a relative change (more/less)
 */
export function isRelativeCommand(intent: ParsedIntent): boolean {
  return intent.delta !== undefined;
}

/**
 * Check if a command targets a selected element
 */
export function isContextualCommand(intent: ParsedIntent): boolean {
  return intent.target === 'this' || intent.scope === 'selected';
}

/**
 * Normalize a target term for lookup
 */
export function normalizeTarget(target: string): string {
  return target.toLowerCase().trim().replace(/^the\s+/, '');
}

/**
 * Normalize a value term for lookup
 */
export function normalizeValue(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Check if a command is a mode-related command
 */
export function isModeCommand(intent: ParsedIntent): boolean {
  return intent.type === 'mode';
}

/**
 * Check if a command is a style preset
 */
export function isPresetCommand(intent: ParsedIntent): boolean {
  return intent.type === 'preset';
}
