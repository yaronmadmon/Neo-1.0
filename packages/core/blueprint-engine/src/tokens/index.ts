/**
 * Token Vocabulary System
 * Exports all vocabulary modules for mapping natural language to design tokens
 */

// Color palette
export {
  COLOR_PALETTE,
  NEUTRAL_SCALE,
  COLOR_ALIASES,
  lookupColor,
  getColorNames,
  isColorName,
  getContrastingForeground,
  type ColorVariants,
} from './color-palette.js';

// Typography vocabulary
export {
  FONT_WEIGHT_MAP,
  FONT_SIZE_SCALE,
  FONT_SIZE_MAP,
  LINE_HEIGHT_MAP,
  LETTER_SPACING_MAP,
  FONT_FAMILY_MAP,
  TEXT_TRANSFORM_MAP,
  TEXT_DECORATION_MAP,
  resolveTypographyTerm,
  isTypographyTerm,
  getTypographyTerms,
  type TypographyProperty,
} from './typography-vocab.js';

// Spacing vocabulary
export {
  RADIUS_SCALE,
  RADIUS_MAP,
  SPACING_SCALE,
  SPACING_NAMES,
  SPACING_MAP,
  SHADOW_SCALE,
  SHADOW_MAP,
  resolveRadiusTerm,
  resolveSpacingTerm,
  resolveShadowTerm,
  getNextRadius,
  getPreviousRadius,
  isSpacingTerm,
  getSpacingPropertyType,
  type SpacingProperty,
} from './spacing-vocab.js';

// Target vocabulary
export {
  TARGET_MAP,
  TARGET_ALIASES,
  resolveTarget,
  getTargetTerms,
  isTargetTerm,
  getTargetsByCategory,
  type TargetDefinition,
} from './target-vocab.js';

/**
 * Unified vocabulary lookup
 * Attempts to identify what type of term the user provided
 */
export interface VocabularyMatch {
  type: 'color' | 'typography' | 'spacing' | 'target' | 'unknown';
  value?: string;
  property?: string;
  cssVar?: string;
  themePath?: string;
}

import { lookupColor, isColorName } from './color-palette.js';
import { resolveTypographyTerm, isTypographyTerm } from './typography-vocab.js';
import { resolveRadiusTerm, resolveSpacingTerm, isSpacingTerm } from './spacing-vocab.js';
import { resolveTarget, isTargetTerm } from './target-vocab.js';

/**
 * Identify what type of vocabulary term this is
 */
export function identifyTerm(term: string): VocabularyMatch {
  if (!term) return { type: 'unknown' };
  
  const normalized = term.toLowerCase().trim();
  
  // Check if it's a target (e.g., "background", "buttons")
  if (isTargetTerm(normalized)) {
    const target = resolveTarget(normalized);
    if (target) {
      return {
        type: 'target',
        cssVar: target.cssVar,
        themePath: target.themePath,
      };
    }
  }
  
  // Check if it's a color name (e.g., "green", "blue.light")
  if (isColorName(normalized)) {
    const colorValue = lookupColor(normalized);
    if (colorValue) {
      return {
        type: 'color',
        value: colorValue,
      };
    }
  }
  
  // Check if it's a typography term (e.g., "bold", "large")
  if (isTypographyTerm(normalized)) {
    const typo = resolveTypographyTerm(normalized);
    if (typo) {
      return {
        type: 'typography',
        value: typo.value,
        property: typo.property,
      };
    }
  }
  
  // Check if it's a spacing term (e.g., "rounded", "tight")
  if (isSpacingTerm(normalized)) {
    const radius = resolveRadiusTerm(normalized);
    if (radius) {
      return {
        type: 'spacing',
        value: radius,
        property: 'borderRadius',
      };
    }
    
    const spacing = resolveSpacingTerm(normalized);
    if (spacing) {
      return {
        type: 'spacing',
        value: spacing,
        property: 'spacing',
      };
    }
  }
  
  return { type: 'unknown' };
}

/**
 * Check if a term is any recognized vocabulary term
 */
export function isRecognizedTerm(term: string): boolean {
  return identifyTerm(term).type !== 'unknown';
}
