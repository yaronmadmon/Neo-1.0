/**
 * Theme Builder
 * 
 * Generates complete theme configurations:
 * - Style presets (modern, minimal, bold, professional, playful, etc.)
 * - Color schemes with accessibility
 * - Typography settings
 * - Spacing and layout tokens
 * - Component-specific styling
 * 
 * DESIGN SYSTEM INTEGRATION:
 * The preferred way to generate themes is via design systems.
 * Design systems are research-based, cohesive visual configurations
 * that ensure consistent, intentional design across all apps.
 * 
 * Use `buildFromDesignSystem()` for new apps.
 * Legacy `build()` method is maintained for backward compatibility.
 */

import type { UnifiedTheme } from './schema.js';
import type { SelectedLayout, ThemePreference } from '../intelligence/types.js';
import {
  DESIGN_SYSTEMS,
  INDUSTRY_DESIGN_SYSTEM_MAP,
  getDesignSystem,
  getDesignSystemForIndustry,
  getDesignSystemByIntent,
  designSystemToTheme,
  type DesignSystem,
  type DesignSystemId,
} from './design-systems.js';
import { getSurfaceIntentForDesignSystem, type SurfaceIntent } from './surface-theme.js';

// ============================================================
// TYPES
// ============================================================

export interface ThemeBuildContext {
  layout?: SelectedLayout;
  industry?: string;
  userPreference?: ThemePreference;
  keywords?: string[]; // Keywords from user input for style hints
}

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

interface ThemePreset {
  id: string;
  name: string;
  colors: {
    light: ColorPalette;
    dark: ColorPalette;
  };
  typography: NonNullable<UnifiedTheme['typography']>;
  spacing: NonNullable<UnifiedTheme['spacing']>;
  shadows: NonNullable<UnifiedTheme['shadows']>;
  animations: NonNullable<UnifiedTheme['animations']>;
}

// ============================================================
// THEME PRESETS
// ============================================================

const THEME_PRESETS: Record<string, ThemePreset> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    colors: {
      light: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#0f172a',
        textMuted: '#64748b',
        border: '#e2e8f0',
      },
      dark: {
        primary: '#818cf8',
        secondary: '#a78bfa',
        accent: '#f472b6',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textMuted: '#94a3b8',
        border: '#334155',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      headingFamily: '"Inter", sans-serif',
      monoFamily: '"JetBrains Mono", monospace',
      fontSize: 'base',
      lineHeight: 'normal',
    },
    spacing: {
      scale: 'normal',
      borderRadius: 'lg',
      cardPadding: 'md',
    },
    shadows: {
      enabled: true,
      intensity: 'subtle',
    },
    animations: {
      enabled: true,
      duration: 'fast',
      easing: 'ease-out',
    },
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      light: {
        primary: '#18181b',
        secondary: '#3f3f46',
        accent: '#71717a',
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        info: '#0ea5e9',
        background: '#ffffff',
        surface: '#fafafa',
        text: '#18181b',
        textMuted: '#71717a',
        border: '#e4e4e7',
      },
      dark: {
        primary: '#fafafa',
        secondary: '#d4d4d8',
        accent: '#a1a1aa',
        success: '#4ade80',
        warning: '#facc15',
        error: '#f87171',
        info: '#38bdf8',
        background: '#09090b',
        surface: '#18181b',
        text: '#fafafa',
        textMuted: '#a1a1aa',
        border: '#27272a',
      },
    },
    typography: {
      fontFamily: '"Söhne", -apple-system, sans-serif',
      headingFamily: '"Söhne", sans-serif',
      monoFamily: '"SF Mono", monospace',
      fontSize: 'base',
      lineHeight: 'relaxed',
    },
    spacing: {
      scale: 'relaxed',
      borderRadius: 'sm',
      cardPadding: 'lg',
    },
    shadows: {
      enabled: false,
      intensity: 'subtle',
    },
    animations: {
      enabled: true,
      duration: 'normal',
      easing: 'ease',
    },
  },

  bold: {
    id: 'bold',
    name: 'Bold',
    colors: {
      light: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#f97316',
        success: '#22c55e',
        warning: '#eab308',
        error: '#dc2626',
        info: '#0284c7',
        background: '#ffffff',
        surface: '#f1f5f9',
        text: '#0f172a',
        textMuted: '#475569',
        border: '#cbd5e1',
      },
      dark: {
        primary: '#f8fafc',
        secondary: '#e2e8f0',
        accent: '#fb923c',
        success: '#4ade80',
        warning: '#facc15',
        error: '#f87171',
        info: '#38bdf8',
        background: '#020617',
        surface: '#0f172a',
        text: '#f8fafc',
        textMuted: '#94a3b8',
        border: '#1e293b',
      },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      headingFamily: '"Plus Jakarta Sans", sans-serif',
      monoFamily: '"Fira Code", monospace',
      fontSize: 'lg',
      lineHeight: 'tight',
    },
    spacing: {
      scale: 'compact',
      borderRadius: 'md',
      cardPadding: 'md',
    },
    shadows: {
      enabled: true,
      intensity: 'strong',
    },
    animations: {
      enabled: true,
      duration: 'fast',
      easing: 'spring',
    },
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    colors: {
      light: {
        primary: '#1e40af',
        secondary: '#1d4ed8',
        accent: '#0891b2',
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        info: '#0284c7',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#1e293b',
        textMuted: '#64748b',
        border: '#e2e8f0',
      },
      dark: {
        primary: '#60a5fa',
        secondary: '#3b82f6',
        accent: '#22d3ee',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#38bdf8',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textMuted: '#94a3b8',
        border: '#334155',
      },
    },
    typography: {
      fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
      headingFamily: '"IBM Plex Sans", sans-serif',
      monoFamily: '"IBM Plex Mono", monospace',
      fontSize: 'base',
      lineHeight: 'normal',
    },
    spacing: {
      scale: 'normal',
      borderRadius: 'md',
      cardPadding: 'md',
    },
    shadows: {
      enabled: true,
      intensity: 'medium',
    },
    animations: {
      enabled: true,
      duration: 'normal',
      easing: 'ease-in-out',
    },
  },

  playful: {
    id: 'playful',
    name: 'Playful',
    colors: {
      light: {
        primary: '#8b5cf6',
        secondary: '#a855f7',
        accent: '#f472b6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#f43f5e',
        info: '#06b6d4',
        background: '#faf5ff',
        surface: '#ffffff',
        text: '#1e1b4b',
        textMuted: '#6b7280',
        border: '#e9d5ff',
      },
      dark: {
        primary: '#a78bfa',
        secondary: '#c084fc',
        accent: '#f9a8d4',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#fb7185',
        info: '#22d3ee',
        background: '#1e1b4b',
        surface: '#312e81',
        text: '#f5f3ff',
        textMuted: '#a5b4fc',
        border: '#4c1d95',
      },
    },
    typography: {
      fontFamily: '"Nunito", -apple-system, sans-serif',
      headingFamily: '"Fredoka", sans-serif',
      monoFamily: '"Fira Code", monospace',
      fontSize: 'base',
      lineHeight: 'relaxed',
    },
    spacing: {
      scale: 'relaxed',
      borderRadius: 'xl',
      cardPadding: 'lg',
    },
    shadows: {
      enabled: true,
      intensity: 'medium',
    },
    animations: {
      enabled: true,
      duration: 'normal',
      easing: 'spring',
    },
  },

  elegant: {
    id: 'elegant',
    name: 'Elegant',
    colors: {
      light: {
        primary: '#78716c',
        secondary: '#57534e',
        accent: '#a8a29e',
        success: '#65a30d',
        warning: '#ca8a04',
        error: '#b91c1c',
        info: '#0369a1',
        background: '#fafaf9',
        surface: '#ffffff',
        text: '#292524',
        textMuted: '#78716c',
        border: '#e7e5e4',
      },
      dark: {
        primary: '#d6d3d1',
        secondary: '#a8a29e',
        accent: '#78716c',
        success: '#84cc16',
        warning: '#eab308',
        error: '#ef4444',
        info: '#0ea5e9',
        background: '#1c1917',
        surface: '#292524',
        text: '#fafaf9',
        textMuted: '#a8a29e',
        border: '#44403c',
      },
    },
    typography: {
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      headingFamily: '"Playfair Display", serif',
      monoFamily: '"DM Mono", monospace',
      fontSize: 'lg',
      lineHeight: 'relaxed',
    },
    spacing: {
      scale: 'relaxed',
      borderRadius: 'none',
      cardPadding: 'lg',
    },
    shadows: {
      enabled: false,
      intensity: 'subtle',
    },
    animations: {
      enabled: true,
      duration: 'slow',
      easing: 'ease',
    },
  },

  tech: {
    id: 'tech',
    name: 'Tech',
    colors: {
      light: {
        primary: '#0ea5e9',
        secondary: '#06b6d4',
        accent: '#22d3ee',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#6366f1',
        background: '#f0f9ff',
        surface: '#ffffff',
        text: '#0c4a6e',
        textMuted: '#64748b',
        border: '#bae6fd',
      },
      dark: {
        primary: '#38bdf8',
        secondary: '#22d3ee',
        accent: '#67e8f9',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#818cf8',
        background: '#0c4a6e',
        surface: '#0369a1',
        text: '#f0f9ff',
        textMuted: '#7dd3fc',
        border: '#0284c7',
      },
    },
    typography: {
      fontFamily: '"Space Grotesk", sans-serif',
      headingFamily: '"Orbitron", sans-serif',
      monoFamily: '"Fira Code", monospace',
      fontSize: 'sm',
      lineHeight: 'normal',
    },
    spacing: {
      scale: 'compact',
      borderRadius: 'md',
      cardPadding: 'sm',
    },
    shadows: {
      enabled: true,
      intensity: 'subtle',
    },
    animations: {
      enabled: true,
      duration: 'fast',
      easing: 'linear',
    },
  },

  nature: {
    id: 'nature',
    name: 'Nature',
    colors: {
      light: {
        primary: '#059669',
        secondary: '#10b981',
        accent: '#84cc16',
        success: '#22c55e',
        warning: '#eab308',
        error: '#dc2626',
        info: '#0891b2',
        background: '#f0fdf4',
        surface: '#ffffff',
        text: '#14532d',
        textMuted: '#6b7280',
        border: '#bbf7d0',
      },
      dark: {
        primary: '#34d399',
        secondary: '#6ee7b7',
        accent: '#a3e635',
        success: '#4ade80',
        warning: '#facc15',
        error: '#f87171',
        info: '#22d3ee',
        background: '#14532d',
        surface: '#166534',
        text: '#f0fdf4',
        textMuted: '#86efac',
        border: '#15803d',
      },
    },
    typography: {
      fontFamily: '"Lora", Georgia, serif',
      headingFamily: '"Bitter", serif',
      monoFamily: '"Source Code Pro", monospace',
      fontSize: 'base',
      lineHeight: 'relaxed',
    },
    spacing: {
      scale: 'relaxed',
      borderRadius: 'lg',
      cardPadding: 'lg',
    },
    shadows: {
      enabled: true,
      intensity: 'subtle',
    },
    animations: {
      enabled: true,
      duration: 'slow',
      easing: 'ease',
    },
  },
};

// ============================================================
// INDUSTRY COLOR PALETTES
// ============================================================

const INDUSTRY_COLORS: Record<string, Partial<ColorPalette>> = {
  trades: {
    primary: '#0ea5e9',
    secondary: '#0284c7',
    accent: '#f97316',
  },
  services: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#ec4899',
  },
  healthcare: {
    primary: '#14b8a6',
    secondary: '#0d9488',
    accent: '#3b82f6',
  },
  retail: {
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#10b981',
  },
  hospitality: {
    primary: '#ec4899',
    secondary: '#db2777',
    accent: '#8b5cf6',
  },
  professional: {
    primary: '#1e40af',
    secondary: '#1d4ed8',
    accent: '#0891b2',
  },
  creative: {
    primary: '#7c3aed',
    secondary: '#6d28d9',
    accent: '#f472b6',
  },
  fitness: {
    primary: '#ef4444',
    secondary: '#dc2626',
    accent: '#f97316',
  },
  real_estate: {
    primary: '#0891b2',
    secondary: '#0e7490',
    accent: '#14b8a6',
  },
  technology: {
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#22d3ee',
  },
  home: {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#8b5cf6',
  },
  personal: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#ec4899',
  },
};

// ============================================================
// THEME BUILDER
// ============================================================

export class ThemeBuilder {
  /**
   * Build a complete theme from context.
   * 
   * IMPORTANT: This method now prefers design systems when an industry is specified.
   * For full design system support, use buildFromDesignSystem() directly.
   * 
   * The method will:
   * 1. If industry is specified, use the mapped design system
   * 2. If keywords suggest intent, use intent-based design system
   * 3. Otherwise, fall back to legacy preset behavior
   */
  build(ctx: ThemeBuildContext = {}): UnifiedTheme {
    // Get mode
    const mode = ctx.userPreference?.mode || ctx.layout?.theme.mode || 'light';

    // PREFERRED PATH: Use design system if industry is specified
    if (ctx.industry && INDUSTRY_DESIGN_SYSTEM_MAP[ctx.industry]) {
      const designSystem = getDesignSystemForIndustry(ctx.industry);
      const theme = designSystemToTheme(designSystem, mode);
      const surfaceIntent = getSurfaceIntentForDesignSystem(designSystem.id);
      
      // Apply user preference overrides (if explicitly specified)
      if (ctx.userPreference?.primaryColor || ctx.userPreference?.accentColor) {
        return {
          ...theme,
          surfaceIntent,
          colors: {
            ...theme.colors,
            ...(ctx.userPreference.primaryColor ? { primary: ctx.userPreference.primaryColor } : {}),
            ...(ctx.userPreference.accentColor ? { accent: ctx.userPreference.accentColor } : {}),
          },
          customVars: {
            ...theme.customVars,
            '--neo-design-system-override': 'true',
          },
        };
      }
      
      return { ...theme, surfaceIntent };
    }

    // Check if keywords suggest a design system
    if (ctx.keywords && ctx.keywords.length > 0) {
      const designSystemId = getDesignSystemByIntent(ctx.keywords);
      if (designSystemId) {
        const designSystem = getDesignSystem(designSystemId);
        const theme = designSystemToTheme(designSystem, mode);
        const surfaceIntent = getSurfaceIntentForDesignSystem(designSystem.id);
        return { ...theme, surfaceIntent };
      }
    }

    // FALLBACK: Legacy preset behavior for backward compatibility
    const presetId = this.determinePreset(ctx);
    const preset = THEME_PRESETS[presetId] || THEME_PRESETS.modern;

    // Get base colors and override with industry colors
    const baseColors = mode === 'dark' ? preset.colors.dark : preset.colors.light;
    const industryOverrides = ctx.industry ? INDUSTRY_COLORS[ctx.industry] : {};

    const colors = {
      ...baseColors,
      ...industryOverrides,
      ...(ctx.userPreference?.primaryColor ? { primary: ctx.userPreference.primaryColor } : {}),
      ...(ctx.userPreference?.accentColor ? { accent: ctx.userPreference.accentColor } : {}),
    };

    // Default to neutral-professional for legacy preset path
    return {
      preset: presetId as UnifiedTheme['preset'],
      colors,
      mode,
      surfaceIntent: 'neutral-professional' as SurfaceIntent,
      typography: preset.typography,
      spacing: preset.spacing,
      shadows: preset.shadows,
      animations: preset.animations,
      customVars: this.generateCustomVars(colors, preset),
    };
  }

  // ============================================================
  // DESIGN SYSTEM METHODS (PREFERRED)
  // ============================================================

  /**
   * Build a theme from a design system (PREFERRED METHOD).
   * 
   * This is the recommended way to generate themes. Design systems
   * are research-based, cohesive configurations that ensure
   * professional, intentional design.
   * 
   * @param industryId - The industry ID to select a design system for
   * @param mode - Light or dark mode
   * @returns A complete UnifiedTheme based on the design system
   */
  buildFromDesignSystem(
    industryId: string,
    mode: 'light' | 'dark' | 'auto' = 'light'
  ): UnifiedTheme {
    const designSystem = getDesignSystemForIndustry(industryId);
    return designSystemToTheme(designSystem, mode);
  }

  /**
   * Build a theme from a specific design system ID.
   * 
   * Use this when you want to explicitly choose a design system
   * rather than relying on industry mapping.
   * 
   * @param designSystemId - The design system ID
   * @param mode - Light or dark mode
   * @returns A complete UnifiedTheme based on the design system
   */
  buildFromDesignSystemId(
    designSystemId: DesignSystemId,
    mode: 'light' | 'dark' | 'auto' = 'light'
  ): UnifiedTheme {
    const designSystem = getDesignSystem(designSystemId);
    return designSystemToTheme(designSystem, mode);
  }

  /**
   * Build a theme based on keywords/intent.
   * 
   * Use this when you have keywords describing the desired feel
   * but not a specific industry.
   * 
   * @param keywords - Keywords describing the intent
   * @param mode - Light or dark mode
   * @returns A complete UnifiedTheme based on matched design system
   */
  buildFromIntent(
    keywords: string[],
    mode: 'light' | 'dark' | 'auto' = 'light'
  ): UnifiedTheme {
    const designSystemId = getDesignSystemByIntent(keywords);
    const designSystem = getDesignSystem(designSystemId);
    return designSystemToTheme(designSystem, mode);
  }

  /**
   * Get the design system that would be used for an industry.
   * Useful for previewing or explaining design choices.
   */
  getDesignSystemForIndustry(industryId: string): DesignSystem {
    return getDesignSystemForIndustry(industryId);
  }

  /**
   * List all available design systems.
   */
  listDesignSystems(): DesignSystem[] {
    return Object.values(DESIGN_SYSTEMS);
  }

  /**
   * Get design system by ID.
   */
  getDesignSystem(id: DesignSystemId): DesignSystem {
    return getDesignSystem(id);
  }

  // ============================================================
  // LEGACY METHODS (BACKWARD COMPATIBILITY)
  // ============================================================

  /**
   * Build theme from a style keyword (e.g., "modern", "make it playful")
   * @deprecated Use buildFromDesignSystem() for new code
   */
  buildFromKeyword(keyword: string, ctx: ThemeBuildContext = {}): UnifiedTheme {
    const normalizedKeyword = keyword.toLowerCase();
    
    // Direct preset match
    if (THEME_PRESETS[normalizedKeyword]) {
      return this.build({ ...ctx, keywords: [normalizedKeyword] });
    }

    // Keyword mapping
    const keywordMap: Record<string, string> = {
      'clean': 'minimal',
      'simple': 'minimal',
      'sleek': 'modern',
      'colorful': 'playful',
      'fun': 'playful',
      'serious': 'professional',
      'corporate': 'professional',
      'business': 'professional',
      'fancy': 'elegant',
      'luxurious': 'elegant',
      'luxury': 'elegant',
      'techy': 'tech',
      'futuristic': 'tech',
      'cyber': 'tech',
      'organic': 'nature',
      'green': 'nature',
      'eco': 'nature',
      'dark': 'dark',
      'light': 'light',
      'strong': 'bold',
      'powerful': 'bold',
    };

    const mappedPreset = keywordMap[normalizedKeyword] || 'modern';
    return this.build({ ...ctx, keywords: [mappedPreset] });
  }

  /**
   * Generate a theme variation (lighter/darker primary)
   */
  generateVariation(base: UnifiedTheme, variation: 'lighter' | 'darker'): UnifiedTheme {
    const adjustColor = (hex: string, amount: number): string => {
      const num = parseInt(hex.slice(1), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + amount));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
      const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    };

    const amount = variation === 'lighter' ? 30 : -30;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: adjustColor(base.colors.primary, amount),
        secondary: base.colors.secondary ? adjustColor(base.colors.secondary, amount) : undefined,
      },
    };
  }

  /**
   * Check if a theme passes accessibility contrast requirements
   */
  checkAccessibility(theme: UnifiedTheme): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check text contrast against background
    const textContrast = this.getContrastRatio(theme.colors.text || '#000', theme.colors.background || '#fff');
    if (textContrast < 4.5) {
      issues.push(`Text contrast ratio (${textContrast.toFixed(2)}) is below WCAG AA standard (4.5)`);
    }

    // Check primary color against background
    const primaryContrast = this.getContrastRatio(theme.colors.primary, theme.colors.surface || theme.colors.background || '#fff');
    if (primaryContrast < 3) {
      issues.push(`Primary color contrast ratio (${primaryContrast.toFixed(2)}) may be too low`);
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private determinePreset(ctx: ThemeBuildContext): string {
    // Check user preference style
    if (ctx.userPreference?.style) {
      const styleMap: Record<string, string> = {
        'modern': 'modern',
        'minimal': 'minimal',
        'bold': 'bold',
        'professional': 'professional',
        'playful': 'playful',
      };
      if (styleMap[ctx.userPreference.style]) {
        return styleMap[ctx.userPreference.style];
      }
    }

    // Check keywords from user input
    if (ctx.keywords) {
      for (const keyword of ctx.keywords) {
        const lower = keyword.toLowerCase();
        if (THEME_PRESETS[lower]) return lower;
      }
    }

    // Default by industry
    if (ctx.industry) {
      const industryPresets: Record<string, string> = {
        'healthcare': 'professional',
        'professional': 'professional',
        'technology': 'tech',
        'creative': 'playful',
        'fitness': 'bold',
        'home': 'nature',
        'retail': 'modern',
      };
      if (industryPresets[ctx.industry]) {
        return industryPresets[ctx.industry];
      }
    }

    return 'modern';
  }

  private generateCustomVars(colors: ColorPalette, preset: ThemePreset): Record<string, string> {
    return {
      '--neo-primary': colors.primary,
      '--neo-secondary': colors.secondary,
      '--neo-accent': colors.accent,
      '--neo-success': colors.success,
      '--neo-warning': colors.warning,
      '--neo-error': colors.error,
      '--neo-info': colors.info,
      '--neo-background': colors.background,
      '--neo-surface': colors.surface,
      '--neo-text': colors.text,
      '--neo-text-muted': colors.textMuted,
      '--neo-border': colors.border,
      '--neo-font-family': preset.typography.fontFamily || 'system-ui',
      '--neo-font-heading': preset.typography.headingFamily || 'system-ui',
      '--neo-border-radius': this.getBorderRadiusValue(preset.spacing.borderRadius || 'md'),
      '--neo-shadow': preset.shadows?.enabled ? this.getShadowValue(preset.shadows.intensity || 'medium') : 'none',
      '--neo-transition': preset.animations?.enabled 
        ? `${this.getDurationValue(preset.animations.duration || 'normal')} ${preset.animations.easing || 'ease'}`
        : 'none',
    };
  }

  private getBorderRadiusValue(size: string): string {
    const sizes: Record<string, string> = {
      'none': '0',
      'sm': '0.25rem',
      'md': '0.5rem',
      'lg': '0.75rem',
      'xl': '1rem',
      'full': '9999px',
    };
    return sizes[size] || sizes.md;
  }

  private getShadowValue(intensity: string): string {
    const shadows: Record<string, string> = {
      'subtle': '0 1px 2px rgba(0, 0, 0, 0.05)',
      'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      'strong': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    };
    return shadows[intensity] || shadows.medium;
  }

  private getDurationValue(speed: string): string {
    const durations: Record<string, string> = {
      'fast': '150ms',
      'normal': '200ms',
      'slow': '300ms',
    };
    return durations[speed] || durations.normal;
  }

  private getContrastRatio(color1: string, color2: string): number {
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = rgb & 0xff;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
}
