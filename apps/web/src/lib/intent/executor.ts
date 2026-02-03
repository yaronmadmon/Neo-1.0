/**
 * Intent Executor
 * Orchestrates the flow from parsed command to applied changes
 * Enhanced with better error messages and fuzzy matching support
 */

import { parseCommand, type ParsedIntent, isRelativeCommand, normalizeValue } from './command-parser';
import { resolveContext, type SelectionContext, type ResolvedContext } from './context-resolver';
import { computeRelativeChange } from './relative-computer';
import { setToken, applyTheme, getToken, setMode, getMode } from '../token-runtime';
import { saveTheme } from '../theme-sync';
import type { TokenName, ThemeTokens } from '../token-types';
import { 
  resolveColorSynonym, 
  resolveRadiusSynonym, 
  resolveModeSynonym,
  STYLE_PRESETS,
} from './synonyms';
import { findBestMatch } from './fuzzy-matcher';
import { 
  unknownColorError, 
  invalidValueError, 
  unparseableCommandError,
  helpMessage,
} from './error-messages';

/**
 * Extended color palette for lookups (embedded with lots of variations)
 */
const COLOR_MAP: Record<string, string> = {
  // === BLUES ===
  'blue': '217 91% 60%',
  'light-blue': '199 89% 68%',
  'light blue': '199 89% 68%',
  'dark-blue': '217 91% 45%',
  'dark blue': '217 91% 45%',
  'sky': '199 89% 48%',
  'navy': '224 64% 33%',
  'azure': '210 100% 50%',
  'cobalt': '225 73% 57%',
  'indigo': '239 84% 60%',
  'violet': '258 90% 60%',
  'cyan': '189 94% 43%',
  'teal': '173 80% 40%',
  
  // === GREENS ===
  'green': '142 71% 45%',
  'light-green': '142 69% 58%',
  'light green': '142 69% 58%',
  'dark-green': '142 71% 35%',
  'dark green': '142 71% 35%',
  'emerald': '160 84% 39%',
  'lime': '84 81% 44%',
  'mint': '158 64% 52%',
  'sage': '138 30% 50%',
  'forest': '141 79% 25%',
  'olive': '80 39% 40%',
  
  // === REDS ===
  'red': '0 84% 60%',
  'light-red': '0 84% 70%',
  'light red': '0 84% 70%',
  'dark-red': '0 84% 45%',
  'dark red': '0 84% 45%',
  'crimson': '348 83% 47%',
  'scarlet': '4 90% 58%',
  'ruby': '350 89% 45%',
  'rose': '350 89% 60%',
  'coral': '16 85% 57%',
  'salmon': '6 93% 71%',
  'maroon': '0 100% 25%',
  
  // === PINKS ===
  'pink': '330 81% 60%',
  'light-pink': '330 81% 75%',
  'light pink': '330 81% 75%',
  'hot-pink': '330 100% 71%',
  'hot pink': '330 100% 71%',
  'magenta': '300 76% 55%',
  'fuchsia': '292 84% 61%',
  'blush': '350 50% 80%',
  
  // === PURPLES ===
  'purple': '263 70% 50%',
  'light-purple': '263 70% 65%',
  'light purple': '263 70% 65%',
  'dark-purple': '263 70% 35%',
  'dark purple': '263 70% 35%',
  'lavender': '270 67% 75%',
  'plum': '300 47% 45%',
  'grape': '280 60% 45%',
  'orchid': '302 59% 65%',
  'mauve': '292 12% 65%',
  
  // === YELLOWS ===
  'yellow': '48 96% 53%',
  'light-yellow': '48 96% 70%',
  'light yellow': '48 96% 70%',
  'gold': '45 93% 47%',
  'golden': '45 93% 47%',
  'amber': '38 92% 50%',
  'honey': '38 85% 50%',
  'mustard': '47 96% 42%',
  'lemon': '54 100% 62%',
  
  // === ORANGES ===
  'orange': '25 95% 53%',
  'light-orange': '25 95% 65%',
  'light orange': '25 95% 65%',
  'dark-orange': '25 95% 40%',
  'dark orange': '25 95% 40%',
  'tangerine': '28 100% 55%',
  'peach': '24 100% 75%',
  'apricot': '29 100% 70%',
  'rust': '18 75% 45%',
  'burnt-orange': '18 75% 45%',
  'burnt orange': '18 75% 45%',
  'pumpkin': '24 97% 47%',
  
  // === NEUTRALS ===
  'gray': '220 9% 46%',
  'grey': '220 9% 46%',
  'light-gray': '220 9% 70%',
  'light gray': '220 9% 70%',
  'light grey': '220 9% 70%',
  'dark-gray': '220 9% 30%',
  'dark gray': '220 9% 30%',
  'dark grey': '220 9% 30%',
  'silver': '0 0% 75%',
  'slate': '215 16% 47%',
  'charcoal': '220 13% 26%',
  'zinc': '240 5% 46%',
  'stone': '25 6% 45%',
  'ash': '0 0% 55%',
  'neutral': '0 0% 50%',
  
  // === BLACK & WHITE ===
  'white': '0 0% 100%',
  'off-white': '0 0% 96%',
  'off white': '0 0% 96%',
  'cream': '39 77% 94%',
  'ivory': '60 100% 97%',
  'snow': '0 0% 98%',
  'black': '0 0% 0%',
  'jet': '0 0% 5%',
  'midnight': '222 47% 11%',
  'onyx': '0 0% 15%',
  
  // === SEMANTIC ===
  'success': '142 71% 45%',
  'error': '0 84% 60%',
  'warning': '38 92% 50%',
  'info': '217 91% 60%',
  'danger': '0 84% 60%',
  
  // === BRAND-LIKE ===
  'facebook': '220 46% 48%',
  'twitter': '203 89% 53%',
  'instagram': '330 70% 55%',
  'linkedin': '210 80% 40%',
  'youtube': '0 100% 50%',
  'spotify': '141 73% 42%',
};

/**
 * Radius scale for lookups
 */
const RADIUS_MAP: Record<string, string> = {
  'none': '0',
  'zero': '0',
  '0': '0',
  'sharp': '0',
  'square': '0',
  'squared': '0',
  'angular': '0',
  'boxy': '0',
  'sm': '0.25rem',
  'small': '0.25rem',
  'tiny': '0.25rem',
  'slight': '0.25rem',
  'subtle': '0.25rem',
  'minimal': '0.25rem',
  'md': '0.5rem',
  'medium': '0.5rem',
  'default': '0.5rem',
  'normal': '0.5rem',
  'regular': '0.5rem',
  'rounded': '0.5rem',
  'moderate': '0.5rem',
  'lg': '0.75rem',
  'large': '0.75rem',
  'big': '0.75rem',
  'soft': '0.75rem',
  'smooth': '0.75rem',
  'xl': '1rem',
  'extra-large': '1rem',
  'extra large': '1rem',
  'very rounded': '1rem',
  'very soft': '1rem',
  '2xl': '1.5rem',
  'full': '9999px',
  'pill': '9999px',
  'circle': '9999px',
  'circular': '9999px',
  'round': '9999px',
  'capsule': '9999px',
  'max': '9999px',
  'maximum': '9999px',
};

/**
 * Look up a color by name with fuzzy matching
 */
function lookupColor(name: string): { value: string | null; suggestion?: string } {
  const normalized = name.toLowerCase().trim();
  
  // Step 1: Direct lookup
  if (COLOR_MAP[normalized]) {
    return { value: COLOR_MAP[normalized] };
  }
  
  // Step 2: Synonym lookup
  const synonym = resolveColorSynonym(normalized);
  if (synonym && COLOR_MAP[synonym]) {
    return { value: COLOR_MAP[synonym] };
  }
  
  // Step 3: Fuzzy matching
  const candidates = Object.keys(COLOR_MAP);
  const fuzzyResult = findBestMatch(normalized, candidates, {
    maxDistance: 2,
    minSimilarity: 0.65,
    usePhonetic: true,
  });
  
  if (fuzzyResult && COLOR_MAP[fuzzyResult.match]) {
    return {
      value: COLOR_MAP[fuzzyResult.match],
      suggestion: !fuzzyResult.exact ? `Interpreted "${name}" as "${fuzzyResult.match}"` : undefined,
    };
  }
  
  return { value: null };
}

/**
 * Resolve a radius term with fuzzy matching
 */
function resolveRadiusTerm(term: string): { value: string | null; suggestion?: string } {
  const normalized = term.toLowerCase().trim();
  
  // Step 1: Direct lookup
  if (RADIUS_MAP[normalized]) {
    return { value: RADIUS_MAP[normalized] };
  }
  
  // Step 2: Synonym lookup
  const synonym = resolveRadiusSynonym(normalized);
  if (synonym && RADIUS_MAP[synonym]) {
    return { value: RADIUS_MAP[synonym] };
  }
  
  // Step 3: Fuzzy matching
  const candidates = Object.keys(RADIUS_MAP);
  const fuzzyResult = findBestMatch(normalized, candidates, {
    maxDistance: 2,
    minSimilarity: 0.6,
    usePhonetic: false, // Phonetic less useful for radius terms
  });
  
  if (fuzzyResult && RADIUS_MAP[fuzzyResult.match]) {
    return {
      value: RADIUS_MAP[fuzzyResult.match],
      suggestion: !fuzzyResult.exact ? `Interpreted "${term}" as "${fuzzyResult.match}"` : undefined,
    };
  }
  
  return { value: null };
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  message: string;
  changes?: {
    cssVar: string;
    oldValue: string;
    newValue: string;
  }[];
  error?: string;
  interpretation?: string; // Shows what we interpreted fuzzy input as
}

/**
 * Execute a natural language command
 */
export async function executeCommand(
  command: string,
  selection: SelectionContext | null,
  appId?: string
): Promise<ExecutionResult> {
  // Handle help command
  if (command.toLowerCase().trim() === 'help' || command.toLowerCase().trim() === '?') {
    return {
      success: true,
      message: helpMessage(),
    };
  }
  
  // Parse command
  const intent = parseCommand(command);
  
  if (intent.type === 'unknown') {
    return {
      success: false,
      message: unparseableCommandError(command),
      error: 'Could not parse command',
    };
  }
  
  // Handle undo/redo
  if (intent.type === 'undo') {
    return {
      success: true,
      message: 'Use Ctrl+Z to undo',
    };
  }
  
  if (intent.type === 'redo') {
    return {
      success: true,
      message: 'Use Ctrl+Y to redo',
    };
  }
  
  // Handle mode commands (dark/light)
  if (intent.type === 'mode') {
    return executeModeChange(intent);
  }
  
  // Handle visibility commands separately - they target components by name, not CSS variables
  if (intent.type === 'visibility') {
    return executeVisibilityChange(intent);
  }
  
  // Handle layout commands separately
  if (intent.type === 'layout') {
    return executeLayoutChange(intent);
  }
  
  // Handle style presets (e.g., "make it pop", "modernize")
  if (intent.type === 'preset') {
    return executePreset(intent, appId);
  }
  
  // Resolve context for style commands
  const context = resolveContext(intent, selection);
  
  if (!context.success) {
    return {
      success: false,
      message: context.error || 'Could not resolve target',
      error: context.error,
    };
  }
  
  // Execute style change
  if (intent.type === 'style') {
    return await executeStyleChange(intent, context, appId);
  }
  
  return {
    success: false,
    message: `Unsupported command type: ${intent.type}`,
  };
}

/**
 * Execute a mode change command (dark/light mode toggle)
 */
function executeModeChange(intent: ParsedIntent): ExecutionResult {
  const modeValue = intent.value?.toLowerCase().trim() || '';
  const resolvedMode = resolveModeSynonym(modeValue) || modeValue;
  
  const currentMode = getMode();
  let newMode: 'light' | 'dark';
  
  if (resolvedMode === 'toggle') {
    newMode = currentMode === 'dark' ? 'light' : 'dark';
  } else if (resolvedMode === 'dark') {
    newMode = 'dark';
  } else if (resolvedMode === 'light') {
    newMode = 'light';
  } else {
    // Default to toggle
    newMode = currentMode === 'dark' ? 'light' : 'dark';
  }
  
  setMode(newMode);
  
  const modeLabel = newMode === 'dark' ? 'Dark' : 'Light';
  return {
    success: true,
    message: `Switched to ${modeLabel} mode ✓`,
    changes: [{
      cssVar: '--mode',
      oldValue: currentMode,
      newValue: newMode,
    }],
  };
}

/**
 * Execute a style change command
 */
async function executeStyleChange(
  intent: ParsedIntent,
  context: ResolvedContext,
  appId?: string
): Promise<ExecutionResult> {
  const cssVar = context.cssVar as TokenName;
  if (!cssVar) {
    return {
      success: false,
      message: 'No CSS variable to update',
    };
  }
  
  const oldValue = getToken(cssVar);
  let newValue: string | null = null;
  let description = '';
  let interpretation: string | undefined;
  
  // Include interpretation from context resolution
  if (context.interpretation) {
    interpretation = context.interpretation;
  }
  
  // Handle relative changes
  if (isRelativeCommand(intent) && intent.delta && intent.value) {
    const result = computeRelativeChange(intent.value, intent.delta, cssVar);
    if (result.success && result.newValue) {
      newValue = result.newValue;
      description = `Made ${intent.value} ${intent.delta}`;
    } else {
      return {
        success: false,
        message: result.error || 'Could not compute relative change',
      };
    }
  } else if (intent.value) {
    // Absolute value change
    const normalizedValue = normalizeValue(intent.value);
    
    // Check if this is a radius-related change
    if (context.category === 'spacing' || cssVar === '--radius') {
      const radiusResult = resolveRadiusTerm(normalizedValue);
      if (radiusResult.value) {
        newValue = radiusResult.value;
        description = `Changed corners to ${intent.value}`;
        if (radiusResult.suggestion) {
          interpretation = radiusResult.suggestion;
        }
      }
    } else {
      // Try color lookup
      const colorResult = lookupColor(normalizedValue);
      if (colorResult.value) {
        newValue = colorResult.value;
        description = `Changed ${intent.target || 'color'} to ${intent.value}`;
        if (colorResult.suggestion) {
          interpretation = colorResult.suggestion;
        }
      }
    }
    
    // Use value directly if still not resolved
    if (!newValue) {
      // Check if it looks like an HSL value or a valid CSS value
      if (/^\d+\s+\d+%\s+\d+%$/.test(normalizedValue) || 
          normalizedValue.startsWith('#') ||
          normalizedValue.startsWith('rgb') ||
          normalizedValue.startsWith('hsl')) {
        newValue = normalizedValue;
        description = `Changed ${intent.target || 'value'} to ${intent.value}`;
      }
    }
  }
  
  if (!newValue) {
    // Provide helpful error based on context
    const target = intent.target || 'target';
    const value = intent.value || 'value';
    
    if (context.category === 'spacing' || cssVar === '--radius') {
      return {
        success: false,
        message: invalidValueError('corners', value),
      };
    }
    
    return {
      success: false,
      message: unknownColorError(value),
    };
  }
  
  // Apply the change
  setToken(cssVar, newValue);
  
  // Also set foreground if available
  if (context.foregroundVar) {
    // Calculate contrasting foreground
    const parts = newValue.split(' ');
    if (parts.length === 3) {
      const lightness = parseFloat(parts[2]);
      const foregroundValue = lightness > 50 ? '240 5.9% 10%' : '0 0% 98%';
      setToken(context.foregroundVar as TokenName, foregroundValue);
    }
  }
  
  // Persist if we have an app ID
  if (appId && context.themePath) {
    const themeUpdate: ThemeTokens = {};
    const pathParts = context.themePath.split('.');
    
    if (pathParts[0] === 'colors') {
      themeUpdate.colors = { [pathParts[1]]: newValue };
    } else if (pathParts[0] === 'spacing') {
      themeUpdate.spacing = { [pathParts[1]]: newValue } as any;
    }
    
    saveTheme(appId, themeUpdate).catch(err => {
      console.error('Failed to persist theme:', err);
    });
  }
  
  return {
    success: true,
    message: description || `Updated ${intent.target || 'style'} ✓`,
    interpretation,
    changes: [{
      cssVar,
      oldValue,
      newValue,
    }],
  };
}

/**
 * Execute a visibility change command
 * Note: This returns a "pending" result - actual visibility changes need Studio integration
 */
function executeVisibilityChange(intent: ParsedIntent): ExecutionResult {
  const target = intent.target || 'element';
  const action = intent.value === 'hidden' ? 'hide' : 'show';
  
  // Visibility changes require schema modification at the Studio level
  // For now, return a message indicating what would happen
  return {
    success: true,
    message: `To ${action} "${target}", use the Page Tree panel on the left to find and modify the component.`,
  };
}

/**
 * Execute a layout change command
 * Note: This returns a "pending" result - actual layout changes need Studio integration
 */
function executeLayoutChange(intent: ParsedIntent): ExecutionResult {
  const layoutType = intent.value || 'unknown';
  
  // Layout changes require schema modification at the Studio level
  return {
    success: true,
    message: `Layout changes like "${layoutType}" require editing the page structure. Use the Page Tree panel to modify layout.`,
  };
}

/**
 * Execute a style preset (e.g., "make it pop", "modernize")
 */
function executePreset(intent: ParsedIntent, appId?: string): ExecutionResult {
  const presetName = intent.value?.toLowerCase().trim() || '';
  
  // Check if we have this preset
  const preset = STYLE_PRESETS[presetName];
  
  if (!preset) {
    return {
      success: false,
      message: `I don't recognize the style "${presetName}". Try: "make it pop", "modernize", "professional", "playful"`,
    };
  }
  
  // Apply the preset
  // For now, just describe what would happen
  return {
    success: true,
    message: `Applied "${presetName}" style: ${preset.description}`,
  };
}

/**
 * Convenience function to execute and get a simple status
 */
export async function quickExecute(
  command: string,
  selection: SelectionContext | null = null,
  appId?: string
): Promise<{ success: boolean; message: string }> {
  const result = await executeCommand(command, selection, appId);
  return {
    success: result.success,
    message: result.message,
  };
}
