/**
 * Typography Vocabulary
 * Maps natural language typography terms to CSS values
 */

/**
 * Font weight mappings
 */
export const FONT_WEIGHT_MAP: Record<string, string> = {
  // Direct weight names
  'thin': '100',
  'extralight': '200',
  'extra-light': '200',
  'light': '300',
  'normal': '400',
  'regular': '400',
  'medium': '500',
  'semibold': '600',
  'semi-bold': '600',
  'bold': '700',
  'extrabold': '800',
  'extra-bold': '800',
  'black': '900',
  'heavy': '900',
  
  // Semantic/relative terms
  'lighter': '300',
  'bolder': '700',
  'strong': '700',
  'thick': '700',
  'chunky': '800',
  'delicate': '300',
  'subtle': '300',
};

/**
 * Font size scale (relative to base)
 */
export const FONT_SIZE_SCALE: Record<string, string> = {
  'xs': '0.75rem',
  'sm': '0.875rem',
  'base': '1rem',
  'lg': '1.125rem',
  'xl': '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
};

/**
 * Natural language font size mappings
 */
export const FONT_SIZE_MAP: Record<string, string> = {
  // Size names
  'tiny': 'xs',
  'small': 'sm',
  'medium': 'base',
  'normal': 'base',
  'large': 'lg',
  'big': 'lg',
  'extra-large': 'xl',
  'huge': '2xl',
  'giant': '3xl',
  'massive': '4xl',
  
  // Relative terms
  'smaller': 'sm',
  'bigger': 'lg',
  'larger': 'lg',
};

/**
 * Line height mappings
 */
export const LINE_HEIGHT_MAP: Record<string, string> = {
  'none': '1',
  'tight': '1.25',
  'snug': '1.375',
  'normal': '1.5',
  'relaxed': '1.625',
  'loose': '2',
  
  // Semantic terms
  'compact': '1.25',
  'dense': '1.25',
  'comfortable': '1.5',
  'spacious': '1.625',
  'airy': '2',
  'breathable': '1.625',
};

/**
 * Letter spacing mappings
 */
export const LETTER_SPACING_MAP: Record<string, string> = {
  'tighter': '-0.05em',
  'tight': '-0.025em',
  'normal': '0',
  'wide': '0.025em',
  'wider': '0.05em',
  'widest': '0.1em',
  
  // Semantic terms
  'condensed': '-0.025em',
  'expanded': '0.05em',
  'spaced': '0.025em',
  'tracked': '0.05em',
};

/**
 * Font family categories
 */
export const FONT_FAMILY_MAP: Record<string, string> = {
  // Sans-serif
  'sans': 'ui-sans-serif, system-ui, sans-serif',
  'sans-serif': 'ui-sans-serif, system-ui, sans-serif',
  'clean': 'ui-sans-serif, system-ui, sans-serif',
  'modern': 'ui-sans-serif, system-ui, sans-serif',
  
  // Serif
  'serif': 'ui-serif, Georgia, serif',
  'classic': 'ui-serif, Georgia, serif',
  'traditional': 'ui-serif, Georgia, serif',
  'elegant': 'ui-serif, Georgia, serif',
  
  // Monospace
  'mono': 'ui-monospace, monospace',
  'monospace': 'ui-monospace, monospace',
  'code': 'ui-monospace, monospace',
  'terminal': 'ui-monospace, monospace',
  
  // Display/special
  'display': 'ui-sans-serif, system-ui, sans-serif',
  'heading': 'ui-sans-serif, system-ui, sans-serif',
};

/**
 * Text transform mappings
 */
export const TEXT_TRANSFORM_MAP: Record<string, string> = {
  'uppercase': 'uppercase',
  'caps': 'uppercase',
  'all-caps': 'uppercase',
  'lowercase': 'lowercase',
  'capitalize': 'capitalize',
  'title-case': 'capitalize',
  'normal-case': 'none',
  'no-transform': 'none',
};

/**
 * Text decoration mappings
 */
export const TEXT_DECORATION_MAP: Record<string, string> = {
  'underline': 'underline',
  'underlined': 'underline',
  'line-through': 'line-through',
  'strikethrough': 'line-through',
  'crossed-out': 'line-through',
  'no-underline': 'none',
  'none': 'none',
};

/**
 * Typography term type
 */
export type TypographyProperty = 
  | 'fontWeight'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontFamily'
  | 'textTransform'
  | 'textDecoration';

/**
 * Resolve a typography term to its CSS value
 * 
 * @param term - Natural language term (e.g., "bold", "large", "tight")
 * @returns Object with property and value, or null if not found
 */
export function resolveTypographyTerm(term: string): { property: TypographyProperty; value: string } | null {
  const normalized = term.toLowerCase().trim();
  
  // Check font weight
  if (FONT_WEIGHT_MAP[normalized]) {
    return { property: 'fontWeight', value: FONT_WEIGHT_MAP[normalized] };
  }
  
  // Check font size (map to scale value)
  if (FONT_SIZE_MAP[normalized]) {
    const scaleKey = FONT_SIZE_MAP[normalized];
    return { property: 'fontSize', value: FONT_SIZE_SCALE[scaleKey] || scaleKey };
  }
  
  // Check if it's a direct scale value
  if (FONT_SIZE_SCALE[normalized]) {
    return { property: 'fontSize', value: FONT_SIZE_SCALE[normalized] };
  }
  
  // Check line height
  if (LINE_HEIGHT_MAP[normalized]) {
    return { property: 'lineHeight', value: LINE_HEIGHT_MAP[normalized] };
  }
  
  // Check letter spacing
  if (LETTER_SPACING_MAP[normalized]) {
    return { property: 'letterSpacing', value: LETTER_SPACING_MAP[normalized] };
  }
  
  // Check font family
  if (FONT_FAMILY_MAP[normalized]) {
    return { property: 'fontFamily', value: FONT_FAMILY_MAP[normalized] };
  }
  
  // Check text transform
  if (TEXT_TRANSFORM_MAP[normalized]) {
    return { property: 'textTransform', value: TEXT_TRANSFORM_MAP[normalized] };
  }
  
  // Check text decoration
  if (TEXT_DECORATION_MAP[normalized]) {
    return { property: 'textDecoration', value: TEXT_DECORATION_MAP[normalized] };
  }
  
  return null;
}

/**
 * Check if a term is a typography-related term
 */
export function isTypographyTerm(term: string): boolean {
  return resolveTypographyTerm(term) !== null;
}

/**
 * Get all recognized typography terms
 */
export function getTypographyTerms(): string[] {
  return [
    ...Object.keys(FONT_WEIGHT_MAP),
    ...Object.keys(FONT_SIZE_MAP),
    ...Object.keys(FONT_SIZE_SCALE),
    ...Object.keys(LINE_HEIGHT_MAP),
    ...Object.keys(LETTER_SPACING_MAP),
    ...Object.keys(FONT_FAMILY_MAP),
    ...Object.keys(TEXT_TRANSFORM_MAP),
    ...Object.keys(TEXT_DECORATION_MAP),
  ];
}
