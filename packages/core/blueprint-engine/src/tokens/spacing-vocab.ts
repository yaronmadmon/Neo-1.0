/**
 * Spacing Vocabulary
 * Maps natural language spacing and layout terms to CSS values
 */

/**
 * Border radius scale
 */
export const RADIUS_SCALE: Record<string, string> = {
  'none': '0',
  'sm': '0.125rem',
  'md': '0.375rem',
  'lg': '0.5rem',
  'xl': '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  'full': '9999px',
};

/**
 * Natural language border radius mappings
 */
export const RADIUS_MAP: Record<string, string> = {
  // Sharp/square
  'sharp': 'none',
  'square': 'none',
  'angular': 'none',
  'no-radius': 'none',
  'corners': 'none',
  
  // Slight rounding
  'slightly-rounded': 'sm',
  'subtle': 'sm',
  
  // Medium rounding (default)
  'rounded': 'md',
  'soft': 'md',
  'normal': 'md',
  
  // More rounded
  'more-rounded': 'lg',
  'rounder': 'lg',
  'softer': 'lg',
  
  // Very rounded
  'very-rounded': 'xl',
  'extra-rounded': 'xl',
  'smooth': 'xl',
  
  // Maximum rounding
  'pill': 'full',
  'circular': 'full',
  'round': 'full',
  'circle': 'full',
  'fully-rounded': 'full',
};

/**
 * Spacing scale (for padding/margin/gap)
 */
export const SPACING_SCALE: Record<string, string> = {
  '0': '0',
  'px': '1px',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '3.5': '0.875rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
  '11': '2.75rem',
  '12': '3rem',
  '14': '3.5rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
  '28': '7rem',
  '32': '8rem',
};

/**
 * Named spacing values
 */
export const SPACING_NAMES: Record<string, string> = {
  'none': '0',
  'xs': '0.25rem',
  'sm': '0.5rem',
  'md': '1rem',
  'lg': '1.5rem',
  'xl': '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

/**
 * Natural language spacing mappings
 */
export const SPACING_MAP: Record<string, string> = {
  // Tight/compact
  'tight': 'xs',
  'compact': 'xs',
  'dense': 'xs',
  'cramped': 'xs',
  'minimal': 'xs',
  
  // Small
  'small': 'sm',
  'snug': 'sm',
  'cozy': 'sm',
  
  // Normal/medium
  'normal': 'md',
  'medium': 'md',
  'default': 'md',
  'comfortable': 'md',
  
  // Large/relaxed
  'relaxed': 'lg',
  'large': 'lg',
  'spacious': 'lg',
  'roomy': 'lg',
  'breathable': 'lg',
  
  // Extra large
  'extra-large': 'xl',
  'very-spacious': 'xl',
  'generous': 'xl',
  'airy': 'xl',
  
  // Maximum
  'huge': '2xl',
  'massive': '3xl',
};

/**
 * Shadow scale
 */
export const SHADOW_SCALE: Record<string, string> = {
  'none': 'none',
  'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};

/**
 * Natural language shadow mappings
 */
export const SHADOW_MAP: Record<string, string> = {
  'no-shadow': 'none',
  'flat': 'none',
  'subtle': 'sm',
  'light': 'sm',
  'soft': 'md',
  'medium': 'md',
  'normal': 'md',
  'elevated': 'lg',
  'raised': 'lg',
  'floating': 'xl',
  'dramatic': '2xl',
  'deep': '2xl',
  'heavy': '2xl',
};

/**
 * Spacing property type
 */
export type SpacingProperty = 
  | 'borderRadius'
  | 'padding'
  | 'margin'
  | 'gap'
  | 'boxShadow';

/**
 * Resolve a radius term to its CSS value
 */
export function resolveRadiusTerm(term: string): string | null {
  const normalized = term.toLowerCase().trim();
  
  // Check direct scale value
  if (RADIUS_SCALE[normalized]) {
    return RADIUS_SCALE[normalized];
  }
  
  // Check natural language mapping
  const scaleKey = RADIUS_MAP[normalized];
  if (scaleKey && RADIUS_SCALE[scaleKey]) {
    return RADIUS_SCALE[scaleKey];
  }
  
  return null;
}

/**
 * Resolve a spacing term to its CSS value
 */
export function resolveSpacingTerm(term: string): string | null {
  const normalized = term.toLowerCase().trim();
  
  // Check direct scale value
  if (SPACING_SCALE[normalized]) {
    return SPACING_SCALE[normalized];
  }
  
  // Check named values
  if (SPACING_NAMES[normalized]) {
    return SPACING_NAMES[normalized];
  }
  
  // Check natural language mapping
  const nameKey = SPACING_MAP[normalized];
  if (nameKey && SPACING_NAMES[nameKey]) {
    return SPACING_NAMES[nameKey];
  }
  
  return null;
}

/**
 * Resolve a shadow term to its CSS value
 */
export function resolveShadowTerm(term: string): string | null {
  const normalized = term.toLowerCase().trim();
  
  // Check direct scale value
  if (SHADOW_SCALE[normalized]) {
    return SHADOW_SCALE[normalized];
  }
  
  // Check natural language mapping
  const scaleKey = SHADOW_MAP[normalized];
  if (scaleKey && SHADOW_SCALE[scaleKey]) {
    return SHADOW_SCALE[scaleKey];
  }
  
  return null;
}

/**
 * Get the next larger radius value
 */
export function getNextRadius(current: string): string | null {
  const scaleKeys = Object.keys(RADIUS_SCALE);
  const currentIndex = scaleKeys.indexOf(current);
  if (currentIndex === -1 || currentIndex >= scaleKeys.length - 1) return null;
  return scaleKeys[currentIndex + 1];
}

/**
 * Get the next smaller radius value
 */
export function getPreviousRadius(current: string): string | null {
  const scaleKeys = Object.keys(RADIUS_SCALE);
  const currentIndex = scaleKeys.indexOf(current);
  if (currentIndex <= 0) return null;
  return scaleKeys[currentIndex - 1];
}

/**
 * Check if a term is a spacing-related term
 */
export function isSpacingTerm(term: string): boolean {
  const normalized = term.toLowerCase().trim();
  return (
    RADIUS_SCALE[normalized] !== undefined ||
    RADIUS_MAP[normalized] !== undefined ||
    SPACING_SCALE[normalized] !== undefined ||
    SPACING_NAMES[normalized] !== undefined ||
    SPACING_MAP[normalized] !== undefined ||
    SHADOW_SCALE[normalized] !== undefined ||
    SHADOW_MAP[normalized] !== undefined
  );
}

/**
 * Determine what type of spacing property a term refers to
 */
export function getSpacingPropertyType(term: string): SpacingProperty | null {
  const normalized = term.toLowerCase().trim();
  
  if (RADIUS_SCALE[normalized] || RADIUS_MAP[normalized]) {
    return 'borderRadius';
  }
  
  if (SHADOW_SCALE[normalized] || SHADOW_MAP[normalized]) {
    return 'boxShadow';
  }
  
  // Generic spacing terms default to padding/margin/gap context
  if (SPACING_SCALE[normalized] || SPACING_NAMES[normalized] || SPACING_MAP[normalized]) {
    return 'padding'; // Caller should determine from context
  }
  
  return null;
}
