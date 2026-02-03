/**
 * Color Palette
 * Maps natural language color names to HSL values for CSS variables
 * Format: "H S% L%" (space-separated, compatible with shadcn/ui)
 */

/**
 * Base color definitions with light/default/dark variants
 */
export interface ColorVariants {
  light: string;
  DEFAULT: string;
  dark: string;
}

/**
 * Named color palette with variants
 */
export const COLOR_PALETTE: Record<string, ColorVariants> = {
  // Primary colors
  red: {
    light: '0 85% 65%',
    DEFAULT: '0 84% 60%',
    dark: '0 84% 45%',
  },
  orange: {
    light: '25 95% 60%',
    DEFAULT: '25 95% 53%',
    dark: '25 95% 40%',
  },
  yellow: {
    light: '48 96% 60%',
    DEFAULT: '48 96% 53%',
    dark: '48 96% 40%',
  },
  green: {
    light: '142 71% 50%',
    DEFAULT: '142 71% 45%',
    dark: '142 71% 35%',
  },
  blue: {
    light: '217 91% 65%',
    DEFAULT: '217 91% 60%',
    dark: '217 91% 45%',
  },
  purple: {
    light: '263 70% 60%',
    DEFAULT: '263 70% 50%',
    dark: '263 70% 40%',
  },
  pink: {
    light: '330 81% 65%',
    DEFAULT: '330 81% 60%',
    dark: '330 81% 45%',
  },
  
  // Extended colors
  teal: {
    light: '173 80% 45%',
    DEFAULT: '173 80% 40%',
    dark: '173 80% 30%',
  },
  cyan: {
    light: '189 94% 48%',
    DEFAULT: '189 94% 43%',
    dark: '189 94% 33%',
  },
  indigo: {
    light: '239 84% 67%',
    DEFAULT: '239 84% 60%',
    dark: '239 84% 50%',
  },
  violet: {
    light: '258 90% 66%',
    DEFAULT: '258 90% 60%',
    dark: '258 90% 48%',
  },
  rose: {
    light: '350 89% 65%',
    DEFAULT: '350 89% 60%',
    dark: '350 89% 48%',
  },
  amber: {
    light: '38 92% 55%',
    DEFAULT: '38 92% 50%',
    dark: '38 92% 40%',
  },
  lime: {
    light: '84 81% 50%',
    DEFAULT: '84 81% 44%',
    dark: '84 81% 34%',
  },
  emerald: {
    light: '160 84% 44%',
    DEFAULT: '160 84% 39%',
    dark: '160 84% 29%',
  },
  sky: {
    light: '199 89% 53%',
    DEFAULT: '199 89% 48%',
    dark: '199 89% 38%',
  },
  
  // Neutrals
  gray: {
    light: '220 9% 70%',
    DEFAULT: '220 9% 46%',
    dark: '220 9% 30%',
  },
  slate: {
    light: '215 16% 57%',
    DEFAULT: '215 16% 47%',
    dark: '215 16% 27%',
  },
  zinc: {
    light: '240 5% 65%',
    DEFAULT: '240 5% 46%',
    dark: '240 5% 26%',
  },
  stone: {
    light: '25 5% 65%',
    DEFAULT: '25 5% 45%',
    dark: '25 5% 25%',
  },
  neutral: {
    light: '0 0% 64%',
    DEFAULT: '0 0% 45%',
    dark: '0 0% 25%',
  },
};

/**
 * Neutral scale (50-950) for backgrounds, borders, text
 */
export const NEUTRAL_SCALE: Record<string, string> = {
  '50': '0 0% 98%',
  '100': '0 0% 96%',
  '200': '0 0% 90%',
  '300': '0 0% 83%',
  '400': '0 0% 64%',
  '500': '0 0% 45%',
  '600': '0 0% 32%',
  '700': '0 0% 25%',
  '800': '0 0% 15%',
  '900': '0 0% 9%',
  '950': '0 0% 4%',
};

/**
 * Semantic color aliases (maps user terms to color names)
 */
export const COLOR_ALIASES: Record<string, string> = {
  // Direct mappings
  'crimson': 'red',
  'scarlet': 'red',
  'cherry': 'red',
  'coral': 'orange',
  'tangerine': 'orange',
  'peach': 'orange',
  'gold': 'yellow',
  'lemon': 'yellow',
  'sunshine': 'yellow',
  'forest': 'green',
  'mint': 'green',
  'sage': 'green',
  'olive': 'green',
  'navy': 'blue',
  'ocean': 'blue',
  'sky': 'sky',
  'azure': 'blue',
  'royal': 'indigo',
  'lavender': 'purple',
  'plum': 'purple',
  'grape': 'purple',
  'magenta': 'pink',
  'salmon': 'rose',
  'blush': 'pink',
  'turquoise': 'teal',
  'aqua': 'cyan',
  'silver': 'gray',
  'charcoal': 'slate',
  
  // Semantic mappings
  'success': 'green',
  'error': 'red',
  'danger': 'red',
  'warning': 'amber',
  'info': 'blue',
  'primary': 'blue',
  'secondary': 'slate',
  'accent': 'violet',
};

/**
 * Look up a color by name, supporting aliases and variants
 * 
 * @param name - Color name (e.g., "green", "green.light", "forest")
 * @returns HSL value string or null if not found
 * 
 * @example
 * lookupColor("green") // "142 71% 45%"
 * lookupColor("green.light") // "142 71% 50%"
 * lookupColor("forest") // "142 71% 45%" (alias)
 * lookupColor("neutral.200") // "0 0% 90%"
 */
export function lookupColor(name: string): string | null {
  if (!name) return null;
  
  const normalized = name.toLowerCase().trim();
  
  // Check for variant notation (e.g., "green.light")
  const [baseName, variant] = normalized.split('.');
  
  // Check neutral scale first
  if (baseName === 'neutral' && variant && NEUTRAL_SCALE[variant]) {
    return NEUTRAL_SCALE[variant];
  }
  
  // Resolve alias
  const resolvedName = COLOR_ALIASES[baseName] || baseName;
  
  // Look up in palette
  const colorVariants = COLOR_PALETTE[resolvedName];
  if (!colorVariants) return null;
  
  // Return requested variant or default
  if (variant === 'light') return colorVariants.light;
  if (variant === 'dark') return colorVariants.dark;
  return colorVariants.DEFAULT;
}

/**
 * Get all color names (including aliases)
 */
export function getColorNames(): string[] {
  const baseColors = Object.keys(COLOR_PALETTE);
  const aliases = Object.keys(COLOR_ALIASES);
  return [...new Set([...baseColors, ...aliases])];
}

/**
 * Check if a string is a recognized color name
 */
export function isColorName(name: string): boolean {
  const normalized = name.toLowerCase().trim().split('.')[0];
  return COLOR_PALETTE[normalized] !== undefined || COLOR_ALIASES[normalized] !== undefined;
}

/**
 * Generate a contrasting foreground color (light or dark) based on the background
 * @param hslValue - HSL value string (e.g., "217 91% 60%")
 * @returns HSL value for contrasting foreground
 */
export function getContrastingForeground(hslValue: string): string {
  const parts = hslValue.split(' ');
  if (parts.length !== 3) return '0 0% 100%'; // Default to white
  
  const lightness = parseFloat(parts[2]);
  // If background is light (>50% lightness), use dark foreground
  return lightness > 50 ? '240 5.9% 10%' : '0 0% 98%';
}
