/**
 * Neo Surface Theme System
 * 
 * Provides environment-level surface layers that control backgrounds,
 * section surfaces, and visual depth globally - styling space, not just objects.
 * 
 * This is SEPARATE from design systems (color palettes) and can be mixed:
 * - Design system controls: primary colors, typography, component styles
 * - Surface theme controls: ambient backgrounds, visual layers, atmosphere
 * 
 * The goal is apps that feel warm, intentional, and non-dry by default.
 */

import type { DesignSystemId } from './design-systems.js';

// ============================================================
// SURFACE THEME TYPES
// ============================================================

/**
 * Surface intent - declares the atmosphere without specifying colors.
 * Neo resolves intent → actual surface colors.
 */
export type SurfaceIntent =
  | 'warm-artisanal'      // Bakery, craft, hospitality - warm & cozy
  | 'neutral-professional' // Business, admin, enterprise - clean & trustworthy
  | 'modern-dark'         // Tech, dashboards, analytics - focused & immersive
  | 'playful-light';      // Retail, consumer, education - friendly & approachable

/**
 * Surface theme defines the visual layers of an app environment.
 * Creates depth by defining distinct background surfaces.
 */
export interface SurfaceTheme {
  /** Unique identifier */
  id: SurfaceIntent;
  
  /** Display name for UI */
  name: string;
  
  /** Description of the atmosphere */
  description: string;
  
  /** Ambient page background - the "canvas" everything sits on */
  appBackground: string;
  
  /** Panel/section surface - elevated areas within the page */
  sectionBackground: string;
  
  /** Card surface - the innermost content containers */
  cardBackground: string;
  
  /** Contrast level between layers */
  contrastLevel: 'low' | 'medium' | 'high';
  
  /** Color temperature */
  warmthLevel: 'cool' | 'neutral' | 'warm';
  
  /** Text color for app background */
  appForeground: string;
  
  /** Border/divider color that works with this surface */
  dividerColor: string;
}

// ============================================================
// SURFACE PRESETS (5-8% contrast between layers)
// ============================================================

/**
 * WARM ARTISANAL
 * 
 * For: Bakeries, cafés, restaurants, hospitality, artisan businesses
 * Feel: Cozy, inviting, handcrafted, authentic
 * 
 * Uses warm cream and ivory tones that stimulate appetite
 * and create a welcoming, non-corporate atmosphere.
 */
const WARM_ARTISANAL: SurfaceTheme = {
  id: 'warm-artisanal',
  name: 'Warm Artisanal',
  description: 'Cozy and inviting atmosphere for hospitality and craft businesses',
  appBackground: '#f5ebe0',      // Warm beige (~91% lightness)
  sectionBackground: '#fdf8f3',  // Soft cream (~97% lightness)
  cardBackground: '#ffffff',     // Pure white (100% lightness)
  contrastLevel: 'medium',
  warmthLevel: 'warm',
  appForeground: '#44403c',      // Warm dark gray
  dividerColor: '#e7e5e4',       // Warm stone border
};

/**
 * NEUTRAL PROFESSIONAL
 * 
 * For: Business apps, admin panels, enterprise software, SaaS
 * Feel: Clean, trustworthy, efficient, organized
 * 
 * Uses cool slate grays that feel modern and professional
 * without being sterile or boring.
 */
const NEUTRAL_PROFESSIONAL: SurfaceTheme = {
  id: 'neutral-professional',
  name: 'Neutral Professional',
  description: 'Clean and trustworthy atmosphere for business applications',
  appBackground: '#f1f5f9',      // Cool slate (~96% lightness)
  sectionBackground: '#f8fafc',  // Very light slate (~98% lightness)
  cardBackground: '#ffffff',     // Pure white (100% lightness)
  contrastLevel: 'medium',
  warmthLevel: 'neutral',
  appForeground: '#334155',      // Cool dark slate
  dividerColor: '#e2e8f0',       // Slate border
};

/**
 * MODERN DARK
 * 
 * For: Tech dashboards, analytics, data-heavy apps, developer tools
 * Feel: Focused, immersive, sophisticated, high-contrast
 * 
 * Uses deep slate tones that reduce eye strain and create
 * a focused environment for data-intensive work.
 */
const MODERN_DARK: SurfaceTheme = {
  id: 'modern-dark',
  name: 'Modern Dark',
  description: 'Focused and immersive atmosphere for tech and data applications',
  appBackground: '#0f172a',      // Dark slate (~8% lightness)
  sectionBackground: '#1e293b',  // Elevated slate (~15% lightness)
  cardBackground: '#334155',     // Card slate (~25% lightness)
  contrastLevel: 'high',
  warmthLevel: 'cool',
  appForeground: '#f1f5f9',      // Light slate text
  dividerColor: '#475569',       // Medium slate border
};

/**
 * PLAYFUL LIGHT
 * 
 * For: Retail, consumer apps, education, community platforms
 * Feel: Friendly, approachable, fun, energetic
 * 
 * Uses subtle purple/violet tints that feel modern and
 * welcoming without being too corporate.
 */
const PLAYFUL_LIGHT: SurfaceTheme = {
  id: 'playful-light',
  name: 'Playful Light',
  description: 'Friendly and approachable atmosphere for consumer applications',
  appBackground: '#faf5ff',      // Light purple tint (~98% lightness)
  sectionBackground: '#f5f3ff',  // Soft violet (~96% lightness)
  cardBackground: '#ffffff',     // Pure white (100% lightness)
  contrastLevel: 'low',
  warmthLevel: 'neutral',
  appForeground: '#3b0764',      // Deep purple text
  dividerColor: '#e9d5ff',       // Light purple border
};

// ============================================================
// SURFACE PRESETS REGISTRY
// ============================================================

export const SURFACE_PRESETS: Record<SurfaceIntent, SurfaceTheme> = {
  'warm-artisanal': WARM_ARTISANAL,
  'neutral-professional': NEUTRAL_PROFESSIONAL,
  'modern-dark': MODERN_DARK,
  'playful-light': PLAYFUL_LIGHT,
};

// ============================================================
// DESIGN SYSTEM → SURFACE INTENT MAPPING
// ============================================================

/**
 * Maps design systems to their recommended surface intents.
 * This provides sensible defaults while allowing override.
 */
export const DESIGN_SYSTEM_SURFACE_MAP: Record<DesignSystemId, SurfaceIntent> = {
  'trust-stability': 'neutral-professional',
  'calm-care': 'neutral-professional',
  'operational-strength': 'neutral-professional',
  'warm-craft': 'warm-artisanal',
  'modern-saas': 'neutral-professional',
  'luxury-refinement': 'neutral-professional',
  'friendly-approachable': 'playful-light',
  'data-precision': 'modern-dark',
  'creative-expressive': 'playful-light',
  'energetic-dynamic': 'playful-light',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get surface theme for a given intent.
 */
export function getSurfaceTheme(intent: SurfaceIntent): SurfaceTheme {
  return SURFACE_PRESETS[intent];
}

/**
 * Get recommended surface intent for a design system.
 */
export function getSurfaceIntentForDesignSystem(designSystemId: DesignSystemId): SurfaceIntent {
  return DESIGN_SYSTEM_SURFACE_MAP[designSystemId] || 'neutral-professional';
}

/**
 * List all available surface intents.
 */
export function listSurfaceIntents(): SurfaceIntent[] {
  return Object.keys(SURFACE_PRESETS) as SurfaceIntent[];
}

/**
 * List all surface presets with their metadata.
 */
export function listSurfacePresets(): SurfaceTheme[] {
  return Object.values(SURFACE_PRESETS);
}

// ============================================================
// WHITE BUDGET VALIDATION
// ============================================================

/**
 * Validates that a surface theme doesn't violate the "white budget" rule.
 * 
 * Rules:
 * 1. App background should NOT be pure white (#ffffff)
 * 2. At least one surface layer should have a visible tint
 * 3. There should be noticeable contrast between layers
 * 
 * @returns Validation result with any warnings
 */
export function validateWhiteBudget(theme: SurfaceTheme): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check if app background is pure white
  if (theme.appBackground.toLowerCase() === '#ffffff' || 
      theme.appBackground.toLowerCase() === '#fff') {
    warnings.push(
      'App background is pure white. Consider using a tinted background ' +
      'to create atmosphere and visual depth.'
    );
  }
  
  // Check if all layers are the same (no depth)
  if (theme.appBackground === theme.sectionBackground && 
      theme.sectionBackground === theme.cardBackground) {
    warnings.push(
      'All surface layers are identical. Apps need distinct layers ' +
      'to create visual hierarchy and depth.'
    );
  }
  
  // Check contrast between app and section (should be noticeable)
  const appLightness = hexToLightness(theme.appBackground);
  const sectionLightness = hexToLightness(theme.sectionBackground);
  const cardLightness = hexToLightness(theme.cardBackground);
  
  if (Math.abs(appLightness - sectionLightness) < 2) {
    warnings.push(
      `Low contrast between app (${appLightness.toFixed(1)}%) and section ` +
      `(${sectionLightness.toFixed(1)}%) backgrounds. Aim for 5-8% difference.`
    );
  }
  
  if (Math.abs(sectionLightness - cardLightness) < 1) {
    warnings.push(
      `Low contrast between section (${sectionLightness.toFixed(1)}%) and card ` +
      `(${cardLightness.toFixed(1)}%) backgrounds. Cards should visually "float" on sections.`
    );
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Log white budget warnings in development.
 */
export function warnIfWhiteBudgetExceeded(theme: SurfaceTheme): void {
  if (process.env.NODE_ENV === 'development') {
    const { valid, warnings } = validateWhiteBudget(theme);
    if (!valid) {
      console.warn(
        `⚠️ Surface Theme "${theme.name}" white budget warnings:\n` +
        warnings.map(w => `  • ${w}`).join('\n')
      );
    }
  }
}

// ============================================================
// COLOR UTILITIES
// ============================================================

/**
 * Convert hex color to HSL lightness percentage.
 */
function hexToLightness(hex: string): number {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  return l * 100;
}

/**
 * Convert hex color to HSL space-separated format for CSS variables.
 * Example: "#f5ebe0" → "30 37% 92%"
 */
export function hexToHSLString(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
