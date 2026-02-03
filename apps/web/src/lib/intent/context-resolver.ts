/**
 * Context Resolver
 * Resolves contextual references ("this", selection) to concrete targets
 * Now with fuzzy matching and extensive synonym support for non-tech users
 */

import type { ParsedIntent } from './command-parser';
import { findBestMatch, normalizeForComparison } from './fuzzy-matcher';
import { resolveTargetSynonym, getAllTargetNames, TARGET_SYNONYMS } from './synonyms';
import { unknownTargetError } from './error-messages';

/**
 * Target definition type
 */
interface TargetDefinition {
  cssVar: string;
  foregroundVar?: string;
  themePath: string;
  description: string;
  category: 'color' | 'typography' | 'spacing' | 'layout' | 'mode';
}

/**
 * Canonical target map - maps canonical names to CSS variables
 */
const CANONICAL_TARGET_MAP: Record<string, TargetDefinition> = {
  // === COLORS - MAIN ===
  'background': {
    cssVar: '--background',
    themePath: 'colors.background',
    description: 'Page background color',
    category: 'color',
  },
  'primary': {
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    description: 'Primary/brand color',
    category: 'color',
  },
  'secondary': {
    cssVar: '--secondary',
    foregroundVar: '--secondary-foreground',
    themePath: 'colors.secondary',
    description: 'Secondary color',
    category: 'color',
  },
  'accent': {
    cssVar: '--accent',
    foregroundVar: '--accent-foreground',
    themePath: 'colors.accent',
    description: 'Accent color',
    category: 'color',
  },
  'text': {
    cssVar: '--foreground',
    themePath: 'colors.text',
    description: 'Text color',
    category: 'color',
  },
  
  // === COLORS - SURFACES ===
  'card': {
    cssVar: '--card',
    foregroundVar: '--card-foreground',
    themePath: 'colors.surface',
    description: 'Card/surface color',
    category: 'color',
  },
  'popover': {
    cssVar: '--popover',
    foregroundVar: '--popover-foreground',
    themePath: 'colors.popover',
    description: 'Popover/dropdown color',
    category: 'color',
  },
  
  // === COLORS - INTERACTIVE ===
  'button': {
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    description: 'Button color',
    category: 'color',
  },
  'input': {
    cssVar: '--input',
    themePath: 'colors.input',
    description: 'Input field color',
    category: 'color',
  },
  'ring': {
    cssVar: '--ring',
    themePath: 'colors.ring',
    description: 'Focus ring color',
    category: 'color',
  },
  
  // === COLORS - BORDERS ===
  'border': {
    cssVar: '--border',
    themePath: 'colors.border',
    description: 'Border color',
    category: 'color',
  },
  
  // === COLORS - SEMANTIC ===
  'error': {
    cssVar: '--destructive',
    foregroundVar: '--destructive-foreground',
    themePath: 'colors.error',
    description: 'Error/danger color',
    category: 'color',
  },
  'muted': {
    cssVar: '--muted',
    foregroundVar: '--muted-foreground',
    themePath: 'colors.muted',
    description: 'Muted/subtle color',
    category: 'color',
  },
  
  // === COLORS - SIDEBAR ===
  'sidebar': {
    cssVar: '--sidebar-background',
    foregroundVar: '--sidebar-foreground',
    themePath: 'colors.sidebar',
    description: 'Sidebar background',
    category: 'color',
  },
  'sidebar-primary': {
    cssVar: '--sidebar-primary',
    foregroundVar: '--sidebar-primary-foreground',
    themePath: 'colors.sidebarPrimary',
    description: 'Sidebar primary color',
    category: 'color',
  },
  'sidebar-accent': {
    cssVar: '--sidebar-accent',
    foregroundVar: '--sidebar-accent-foreground',
    themePath: 'colors.sidebarAccent',
    description: 'Sidebar accent color',
    category: 'color',
  },
  'sidebar-border': {
    cssVar: '--sidebar-border',
    themePath: 'colors.sidebarBorder',
    description: 'Sidebar border color',
    category: 'color',
  },
  
  // === COLORS - CHARTS ===
  'chart': {
    cssVar: '--chart-1',
    themePath: 'colors.chart1',
    description: 'Chart primary color',
    category: 'color',
  },
  'chart-1': {
    cssVar: '--chart-1',
    themePath: 'colors.chart1',
    description: 'Chart color 1',
    category: 'color',
  },
  'chart-2': {
    cssVar: '--chart-2',
    themePath: 'colors.chart2',
    description: 'Chart color 2',
    category: 'color',
  },
  'chart-3': {
    cssVar: '--chart-3',
    themePath: 'colors.chart3',
    description: 'Chart color 3',
    category: 'color',
  },
  'chart-4': {
    cssVar: '--chart-4',
    themePath: 'colors.chart4',
    description: 'Chart color 4',
    category: 'color',
  },
  'chart-5': {
    cssVar: '--chart-5',
    themePath: 'colors.chart5',
    description: 'Chart color 5',
    category: 'color',
  },
  
  // === SPACING ===
  'radius': {
    cssVar: '--radius',
    themePath: 'spacing.borderRadius',
    description: 'Border radius',
    category: 'spacing',
  },
  
  // === MODE ===
  'mode': {
    cssVar: '--mode',
    themePath: 'mode',
    description: 'Light/dark mode',
    category: 'mode',
  },
};

/**
 * Resolve a target term to its definition using fuzzy matching
 */
function resolveTarget(term: string): { target: TargetDefinition | null; suggestion?: string; error?: string } {
  if (!term) return { target: null };
  
  // Normalize the input
  const normalized = normalizeForComparison(term);
  
  // Step 1: Direct synonym lookup (fast path)
  const synonymResult = resolveTargetSynonym(normalized);
  if (synonymResult && CANONICAL_TARGET_MAP[synonymResult]) {
    return { target: CANONICAL_TARGET_MAP[synonymResult] };
  }
  
  // Step 2: Direct canonical lookup
  if (CANONICAL_TARGET_MAP[normalized]) {
    return { target: CANONICAL_TARGET_MAP[normalized] };
  }
  
  // Step 3: Try without trailing "color"
  if (normalized.endsWith(' color')) {
    const withoutColor = normalized.slice(0, -6).trim();
    const synonymResult2 = resolveTargetSynonym(withoutColor);
    if (synonymResult2 && CANONICAL_TARGET_MAP[synonymResult2]) {
      return { target: CANONICAL_TARGET_MAP[synonymResult2] };
    }
    if (CANONICAL_TARGET_MAP[withoutColor]) {
      return { target: CANONICAL_TARGET_MAP[withoutColor] };
    }
  }
  
  // Step 4: Fuzzy match against all known target names
  const allTargets = getAllTargetNames();
  const fuzzyResult = findBestMatch(normalized, allTargets, {
    maxDistance: 2,
    minSimilarity: 0.6,
    usePhonetic: true,
  });
  
  if (fuzzyResult) {
    // Resolve the fuzzy match through synonyms
    const canonicalName = resolveTargetSynonym(fuzzyResult.match) || fuzzyResult.match;
    if (CANONICAL_TARGET_MAP[canonicalName]) {
      // If it wasn't exact, include a helpful note
      const suggestion = !fuzzyResult.exact ? `Interpreted "${term}" as "${canonicalName}"` : undefined;
      return { target: CANONICAL_TARGET_MAP[canonicalName], suggestion };
    }
  }
  
  // Step 5: No match found - return helpful error
  return {
    target: null,
    error: unknownTargetError(term),
  };
}

/**
 * Selection context from Studio
 */
export interface SelectionContext {
  type: 'page' | 'component' | 'dataModel' | 'flow' | null;
  id: string | null;
  componentType?: string; // e.g., "card", "button", "list"
  name?: string;
}

/**
 * Resolved context with target information
 */
export interface ResolvedContext {
  /** Whether resolution was successful */
  success: boolean;
  
  /** CSS variable to target */
  cssVar?: string;
  
  /** Optional foreground variable */
  foregroundVar?: string;
  
  /** Theme path for persistence */
  themePath?: string;
  
  /** Scope of the change */
  scope: 'global' | 'component' | 'element';
  
  /** Component ID if targeting a specific component */
  componentId?: string;
  
  /** Interpretation message (shown when fuzzy matched) */
  interpretation?: string;
  
  /** Error message if resolution failed */
  error?: string;
  
  /** Category of the target */
  category?: 'color' | 'typography' | 'spacing' | 'layout' | 'mode';
}

/**
 * Map component types to their relevant tokens
 */
const COMPONENT_TOKEN_MAP: Record<string, string[]> = {
  'card': ['--card', '--card-foreground', '--radius'],
  'button': ['--primary', '--primary-foreground', '--radius'],
  'input': ['--input', '--border', '--radius'],
  'container': ['--background', '--foreground'],
  'text': ['--foreground', '--muted-foreground'],
  'heading': ['--foreground'],
  'list': ['--card', '--border'],
  'table': ['--card', '--border', '--muted'],
  'form': ['--card', '--input', '--border'],
  'calendar': ['--card', '--primary', '--muted'],
  'chart': ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'],
  'sidebar': ['--sidebar-background', '--sidebar-foreground', '--sidebar-border'],
  'popover': ['--popover', '--popover-foreground'],
  'dropdown': ['--popover', '--popover-foreground'],
  'modal': ['--card', '--card-foreground'],
  'dialog': ['--card', '--card-foreground'],
};

/**
 * Get the primary token for a component type
 */
function getPrimaryTokenForComponent(componentType: string): string {
  const tokens = COMPONENT_TOKEN_MAP[componentType.toLowerCase()];
  return tokens?.[0] || '--primary';
}

/**
 * Resolve a parsed intent to concrete target information
 */
export function resolveContext(
  intent: ParsedIntent,
  selection: SelectionContext | null
): ResolvedContext {
  const target = intent.target?.toLowerCase().trim();
  
  // Handle "this" or contextual targets
  if (target === 'this' || intent.scope === 'selected') {
    if (!selection || !selection.id) {
      // No selection - default to global/primary
      return {
        success: true,
        cssVar: '--primary',
        foregroundVar: '--primary-foreground',
        themePath: 'colors.primary',
        scope: 'global',
        category: 'color',
      };
    }
    
    // Resolve based on selected component type
    if (selection.type === 'component' && selection.componentType) {
      const primaryToken = getPrimaryTokenForComponent(selection.componentType);
      const targetDef = getTargetForCssVar(primaryToken);
      
      return {
        success: true,
        cssVar: primaryToken,
        foregroundVar: primaryToken.includes('foreground') ? undefined : `${primaryToken}-foreground`,
        themePath: targetDef?.themePath || 'colors.primary',
        scope: 'component',
        componentId: selection.id,
        category: targetDef?.category || 'color',
      };
    }
    
    // Page-level selection defaults to background
    if (selection.type === 'page') {
      return {
        success: true,
        cssVar: '--background',
        themePath: 'colors.background',
        scope: 'global',
        category: 'color',
      };
    }
    
    // Default for other selections
    return {
      success: true,
      cssVar: '--primary',
      foregroundVar: '--primary-foreground',
      themePath: 'colors.primary',
      scope: 'global',
      category: 'color',
    };
  }
  
  // Direct target lookup with fuzzy matching
  if (target) {
    const result = resolveTarget(target);
    
    if (result.target) {
      return {
        success: true,
        cssVar: result.target.cssVar,
        foregroundVar: result.target.foregroundVar,
        themePath: result.target.themePath,
        scope: 'global',
        interpretation: result.suggestion,
        category: result.target.category,
      };
    }
    
    // Target not recognized - return helpful error
    return {
      success: false,
      scope: 'global',
      error: result.error || `Unknown target: "${target}"`,
    };
  }
  
  // No target specified - use selection or default
  if (selection?.id && selection.type === 'component' && selection.componentType) {
    const primaryToken = getPrimaryTokenForComponent(selection.componentType);
    const targetDef = getTargetForCssVar(primaryToken);
    
    return {
      success: true,
      cssVar: primaryToken,
      scope: 'component',
      componentId: selection.id,
      category: targetDef?.category || 'color',
    };
  }
  
  // Default to primary
  return {
    success: true,
    cssVar: '--primary',
    foregroundVar: '--primary-foreground',
    themePath: 'colors.primary',
    scope: 'global',
    category: 'color',
  };
}

/**
 * Get target definition for a CSS variable
 */
function getTargetForCssVar(cssVar: string): TargetDefinition | undefined {
  for (const [, def] of Object.entries(CANONICAL_TARGET_MAP)) {
    if (def.cssVar === cssVar) {
      return def;
    }
  }
  return undefined;
}

/**
 * Get all tokens relevant to a component type
 */
export function getComponentTokens(componentType: string): string[] {
  return COMPONENT_TOKEN_MAP[componentType.toLowerCase()] || ['--primary'];
}

/**
 * Check if a component type supports a specific property
 */
export function componentSupportsProperty(
  componentType: string,
  property: 'color' | 'radius' | 'spacing'
): boolean {
  const tokens = COMPONENT_TOKEN_MAP[componentType.toLowerCase()] || [];
  
  switch (property) {
    case 'color':
      return tokens.some(t => !t.includes('radius'));
    case 'radius':
      return tokens.includes('--radius');
    case 'spacing':
      return true; // All components support spacing
    default:
      return false;
  }
}

/**
 * Get all canonical target names
 */
export function getAllCanonicalTargets(): string[] {
  return Object.keys(CANONICAL_TARGET_MAP);
}

/**
 * Check if a target is a mode-related target
 */
export function isModeTarget(target: string): boolean {
  const result = resolveTarget(target);
  return result.target?.category === 'mode';
}
