/**
 * Target Vocabulary
 * Maps user-friendly terms to CSS variable names and theme properties
 */

/**
 * CSS variable target for styling
 */
export interface TargetDefinition {
  /** CSS variable name (e.g., "--primary") */
  cssVar: string;
  /** Optional foreground variable */
  foregroundVar?: string;
  /** Theme schema path (e.g., "colors.primary") */
  themePath: string;
  /** Human-readable description */
  description: string;
  /** Category for grouping */
  category: 'color' | 'typography' | 'spacing' | 'layout';
}

/**
 * Map of user terms to target definitions
 */
export const TARGET_MAP: Record<string, TargetDefinition> = {
  // === PRIMARY/BRAND COLORS ===
  'primary': {
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    description: 'Main brand/accent color used for buttons, links, and highlights',
    category: 'color',
  },
  'main color': {
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    description: 'Main brand/accent color',
    category: 'color',
  },
  'brand color': {
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    description: 'Main brand/accent color',
    category: 'color',
  },
  'accent': {
    cssVar: '--accent',
    foregroundVar: '--accent-foreground',
    themePath: 'colors.accent',
    description: 'Accent color for subtle highlights',
    category: 'color',
  },
  
  // === SECONDARY COLORS ===
  'secondary': {
    cssVar: '--secondary',
    foregroundVar: '--secondary-foreground',
    themePath: 'colors.secondary',
    description: 'Secondary color for less prominent elements',
    category: 'color',
  },
  
  // === BACKGROUND ===
  'background': {
    cssVar: '--background',
    themePath: 'colors.background',
    description: 'Page/app background color',
    category: 'color',
  },
  'page background': {
    cssVar: '--background',
    themePath: 'colors.background',
    description: 'Page/app background color',
    category: 'color',
  },
  'bg': {
    cssVar: '--background',
    themePath: 'colors.background',
    description: 'Page/app background color',
    category: 'color',
  },
  
  // === TEXT/FOREGROUND ===
  'text': {
    cssVar: '--foreground',
    themePath: 'colors.text',
    description: 'Main text color',
    category: 'color',
  },
  'font color': {
    cssVar: '--foreground',
    themePath: 'colors.text',
    description: 'Main text color',
    category: 'color',
  },
  'text color': {
    cssVar: '--foreground',
    themePath: 'colors.text',
    description: 'Main text color',
    category: 'color',
  },
  'foreground': {
    cssVar: '--foreground',
    themePath: 'colors.text',
    description: 'Main text/foreground color',
    category: 'color',
  },
  
  // === MUTED TEXT ===
  'muted text': {
    cssVar: '--muted-foreground',
    themePath: 'colors.textMuted',
    description: 'Secondary/muted text color',
    category: 'color',
  },
  'secondary text': {
    cssVar: '--muted-foreground',
    themePath: 'colors.textMuted',
    description: 'Secondary/muted text color',
    category: 'color',
  },
  'subtle text': {
    cssVar: '--muted-foreground',
    themePath: 'colors.textMuted',
    description: 'Secondary/muted text color',
    category: 'color',
  },
  
  // === CARDS/SURFACES ===
  'cards': {
    cssVar: '--card',
    foregroundVar: '--card-foreground',
    themePath: 'colors.surface',
    description: 'Card/surface background color',
    category: 'color',
  },
  'card': {
    cssVar: '--card',
    foregroundVar: '--card-foreground',
    themePath: 'colors.surface',
    description: 'Card/surface background color',
    category: 'color',
  },
  'surface': {
    cssVar: '--card',
    foregroundVar: '--card-foreground',
    themePath: 'colors.surface',
    description: 'Surface/card background color',
    category: 'color',
  },
  'panels': {
    cssVar: '--card',
    foregroundVar: '--card-foreground',
    themePath: 'colors.surface',
    description: 'Panel background color',
    category: 'color',
  },
  
  // === BUTTONS ===
  'buttons': {
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    description: 'Button color (uses primary)',
    category: 'color',
  },
  'button': {
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    description: 'Button color (uses primary)',
    category: 'color',
  },
  
  // === BORDERS ===
  'borders': {
    cssVar: '--border',
    themePath: 'colors.border',
    description: 'Border color',
    category: 'color',
  },
  'border': {
    cssVar: '--border',
    themePath: 'colors.border',
    description: 'Border color',
    category: 'color',
  },
  'dividers': {
    cssVar: '--border',
    themePath: 'colors.border',
    description: 'Divider/separator color',
    category: 'color',
  },
  
  // === INPUT ===
  'inputs': {
    cssVar: '--input',
    themePath: 'colors.border',
    description: 'Input field border color',
    category: 'color',
  },
  'input': {
    cssVar: '--input',
    themePath: 'colors.border',
    description: 'Input field border color',
    category: 'color',
  },
  'form fields': {
    cssVar: '--input',
    themePath: 'colors.border',
    description: 'Form field border color',
    category: 'color',
  },
  
  // === DESTRUCTIVE/ERROR ===
  'error': {
    cssVar: '--destructive',
    foregroundVar: '--destructive-foreground',
    themePath: 'colors.error',
    description: 'Error/danger color',
    category: 'color',
  },
  'danger': {
    cssVar: '--destructive',
    foregroundVar: '--destructive-foreground',
    themePath: 'colors.error',
    description: 'Error/danger color',
    category: 'color',
  },
  'destructive': {
    cssVar: '--destructive',
    foregroundVar: '--destructive-foreground',
    themePath: 'colors.error',
    description: 'Destructive action color',
    category: 'color',
  },
  
  // === RING/FOCUS ===
  'focus': {
    cssVar: '--ring',
    themePath: 'colors.info',
    description: 'Focus ring color',
    category: 'color',
  },
  'focus ring': {
    cssVar: '--ring',
    themePath: 'colors.info',
    description: 'Focus ring color',
    category: 'color',
  },
  
  // === SPACING/RADIUS ===
  'corners': {
    cssVar: '--radius',
    themePath: 'spacing.borderRadius',
    description: 'Border radius/corner rounding',
    category: 'spacing',
  },
  'radius': {
    cssVar: '--radius',
    themePath: 'spacing.borderRadius',
    description: 'Border radius',
    category: 'spacing',
  },
  'border radius': {
    cssVar: '--radius',
    themePath: 'spacing.borderRadius',
    description: 'Border radius',
    category: 'spacing',
  },
  'rounding': {
    cssVar: '--radius',
    themePath: 'spacing.borderRadius',
    description: 'Corner rounding',
    category: 'spacing',
  },
};

/**
 * Common target aliases (normalized forms)
 */
export const TARGET_ALIASES: Record<string, string> = {
  'colour': 'color',
  'colours': 'colors',
  'the background': 'background',
  'the text': 'text',
  'the buttons': 'buttons',
  'the cards': 'cards',
  'the primary': 'primary',
  'main': 'primary',
  'everything': 'primary', // When user says "make everything green"
};

/**
 * Resolve a user term to a target definition
 */
export function resolveTarget(term: string): TargetDefinition | null {
  if (!term) return null;
  
  let normalized = term.toLowerCase().trim();
  
  // Apply aliases
  if (TARGET_ALIASES[normalized]) {
    normalized = TARGET_ALIASES[normalized];
  }
  
  // Direct lookup
  if (TARGET_MAP[normalized]) {
    return TARGET_MAP[normalized];
  }
  
  // Try without "the" prefix
  if (normalized.startsWith('the ')) {
    const withoutThe = normalized.slice(4);
    if (TARGET_MAP[withoutThe]) {
      return TARGET_MAP[withoutThe];
    }
  }
  
  return null;
}

/**
 * Get all recognized target terms
 */
export function getTargetTerms(): string[] {
  return [...new Set([
    ...Object.keys(TARGET_MAP),
    ...Object.keys(TARGET_ALIASES),
  ])];
}

/**
 * Check if a term is a recognized target
 */
export function isTargetTerm(term: string): boolean {
  return resolveTarget(term) !== null;
}

/**
 * Get targets by category
 */
export function getTargetsByCategory(category: TargetDefinition['category']): Record<string, TargetDefinition> {
  const result: Record<string, TargetDefinition> = {};
  for (const [key, def] of Object.entries(TARGET_MAP)) {
    if (def.category === category) {
      result[key] = def;
    }
  }
  return result;
}
