/**
 * Token Runtime Service
 * Manages CSS variable updates on document.documentElement.style
 * Enables instant theme updates without page reload
 */

import type {
  TokenName,
  ThemeTokens,
  TokenChangeEvent,
  TokenChangeCallback,
  TokenRuntime,
  SurfaceIntent,
} from './token-types';
import { THEME_TO_TOKEN_MAP, RADIUS_SCALE } from './token-types';

// ============================================================
// SURFACE THEME PRESETS
// ============================================================

/**
 * Surface theme preset definitions for atmosphere control.
 * Each preset defines the visual layers that create depth in the app.
 */
const SURFACE_PRESETS: Record<SurfaceIntent, {
  appBackground: string;
  sectionBackground: string;
  cardBackground: string;
  appForeground: string;
  dividerColor: string;
}> = {
  'warm-artisanal': {
    appBackground: '#f5ebe0',      // Warm beige (~91% lightness)
    sectionBackground: '#fdf8f3',  // Soft cream (~97% lightness)
    cardBackground: '#ffffff',     // Pure white (100% lightness)
    appForeground: '#44403c',      // Warm dark gray
    dividerColor: '#e7e5e4',       // Warm stone border
  },
  'neutral-professional': {
    appBackground: '#f1f5f9',      // Cool slate (~96% lightness)
    sectionBackground: '#f8fafc',  // Very light slate (~98% lightness)
    cardBackground: '#ffffff',     // Pure white (100% lightness)
    appForeground: '#334155',      // Cool dark slate
    dividerColor: '#e2e8f0',       // Slate border
  },
  'modern-dark': {
    appBackground: '#0f172a',      // Dark slate (~8% lightness)
    sectionBackground: '#1e293b',  // Elevated slate (~15% lightness)
    cardBackground: '#334155',     // Card slate (~25% lightness)
    appForeground: '#f1f5f9',      // Light slate text
    dividerColor: '#475569',       // Medium slate border
  },
  'playful-light': {
    appBackground: '#faf5ff',      // Light purple tint (~98% lightness)
    sectionBackground: '#f5f3ff',  // Soft violet (~96% lightness)
    cardBackground: '#ffffff',     // Pure white (100% lightness)
    appForeground: '#3b0764',      // Deep purple text
    dividerColor: '#e9d5ff',       // Light purple border
  },
};

/**
 * Store for default token values (captured on first load)
 */
const defaultTokens: Map<TokenName, string> = new Map();

/**
 * Set of subscribed callbacks
 */
const subscribers: Set<TokenChangeCallback> = new Set();

/**
 * Track if defaults have been captured
 */
let defaultsCaptured = false;

/**
 * Get the root element for CSS variable manipulation
 */
function getRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

/**
 * Capture default token values from computed styles
 */
function captureDefaults(): void {
  if (defaultsCaptured) return;
  
  const root = getRoot();
  if (!root) return;
  
  const computed = getComputedStyle(root);
  const tokenNames: TokenName[] = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring', '--radius',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    '--surface-app', '--surface-section', '--surface-card', 
    '--surface-app-foreground', '--surface-divider',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring',
  ];
  
  tokenNames.forEach((name) => {
    const value = computed.getPropertyValue(name).trim();
    if (value) {
      defaultTokens.set(name, value);
    }
  });
  
  defaultsCaptured = true;
}

/**
 * Emit a change event to all subscribers
 */
function emitChange(event: TokenChangeEvent): void {
  subscribers.forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.error('Token change callback error:', error);
    }
  });
}

/**
 * Convert a color value to HSL format for CSS variables
 * Supports: hex (#RRGGBB, #RGB), rgb(r,g,b), hsl(h,s%,l%), or raw HSL values
 */
function toHSLValue(color: string): string {
  if (!color) return color;
  
  // Already in HSL space-separated format (e.g., "240 10% 3.9%")
  if (/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(color.trim())) {
    return color.trim();
  }
  
  // HSL function format: hsl(h, s%, l%)
  const hslMatch = color.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)/i);
  if (hslMatch) {
    return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`;
  }
  
  // Hex format: #RRGGBB or #RGB
  if (color.startsWith('#')) {
    let hex = color.slice(1);
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
  
  // RGB format: rgb(r, g, b)
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255;
    const g = parseInt(rgbMatch[2], 10) / 255;
    const b = parseInt(rgbMatch[3], 10) / 255;
    
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
  
  // Return as-is if format not recognized
  return color;
}

/**
 * Get the current value of a CSS variable token
 */
export function getToken(name: TokenName): string {
  const root = getRoot();
  if (!root) return '';
  
  captureDefaults();
  
  // First check inline style (overrides)
  const inlineValue = root.style.getPropertyValue(name).trim();
  if (inlineValue) return inlineValue;
  
  // Fall back to computed style
  return getComputedStyle(root).getPropertyValue(name).trim();
}

/**
 * Set a single CSS variable token
 */
export function setToken(name: TokenName, value: string): void {
  const root = getRoot();
  if (!root) return;
  
  captureDefaults();
  
  // Convert color values to HSL format
  const hslValue = name !== '--radius' ? toHSLValue(value) : value;
  
  root.style.setProperty(name, hslValue);
  
  emitChange({
    type: 'single',
    token: name,
    value: hslValue,
    timestamp: Date.now(),
  });
}

/**
 * Apply a theme object to CSS variables
 */
export function applyTheme(theme: ThemeTokens): void {
  const root = getRoot();
  if (!root) return;
  
  captureDefaults();
  
  const appliedTokens: Partial<Record<TokenName, string>> = {};
  
  // Apply color tokens
  if (theme.colors) {
    Object.entries(theme.colors).forEach(([colorKey, colorValue]) => {
      if (!colorValue) return;
      
      const tokenName = THEME_TO_TOKEN_MAP[`colors.${colorKey}`];
      if (tokenName) {
        const hslValue = toHSLValue(colorValue);
        root.style.setProperty(tokenName, hslValue);
        appliedTokens[tokenName] = hslValue;
        
        // Also set foreground variant for primary/secondary/accent/destructive
        if (['primary', 'secondary', 'accent'].includes(colorKey)) {
          // Use a contrasting foreground color
          const foregroundToken = `${tokenName}-foreground` as TokenName;
          // Simple contrast: if lightness > 50%, use dark foreground, else light
          const parts = hslValue.split(' ');
          if (parts.length === 3) {
            const lightness = parseFloat(parts[2]);
            const foregroundValue = lightness > 50 ? '240 5.9% 10%' : '0 0% 98%';
            root.style.setProperty(foregroundToken, foregroundValue);
            appliedTokens[foregroundToken] = foregroundValue;
          }
        }
      }
      
      // Apply semantic status colors directly as CSS variables
      // These are used for status badges, alerts, and other semantic UI
      const semanticColors = ['success', 'warning', 'error', 'info'];
      if (semanticColors.includes(colorKey)) {
        const hslValue = toHSLValue(colorValue);
        root.style.setProperty(`--${colorKey}`, hslValue);
        // Also create lighter variants for backgrounds
        const parts = hslValue.split(' ');
        if (parts.length === 3) {
          const h = parseFloat(parts[0]);
          const s = parseFloat(parts[1]);
          const l = parseFloat(parts[2]);
          // Light background variant: same hue, lower saturation, higher lightness
          const bgValue = `${h} ${Math.min(s, 30)}% 95%`;
          root.style.setProperty(`--${colorKey}-bg`, bgValue);
          // Foreground variant for dark mode
          const fgValue = l > 50 ? '240 5.9% 10%' : '0 0% 98%';
          root.style.setProperty(`--${colorKey}-foreground`, fgValue);
        }
      }
    });
  }
  
  // Apply typography tokens
  if (theme.typography) {
    if (theme.typography.fontFamily) {
      root.style.setProperty('--font-sans', theme.typography.fontFamily);
    }
    if (theme.typography.headingFamily) {
      root.style.setProperty('--font-heading', theme.typography.headingFamily);
    }
    if (theme.typography.monoFamily) {
      root.style.setProperty('--font-mono', theme.typography.monoFamily);
    }
    // Font size scale
    const fontSizeScale: Record<string, string> = {
      'xs': '0.75rem',
      'sm': '0.875rem',
      'base': '1rem',
      'lg': '1.125rem',
      'xl': '1.25rem',
    };
    if (theme.typography.fontSize && fontSizeScale[theme.typography.fontSize]) {
      root.style.setProperty('--font-size-base', fontSizeScale[theme.typography.fontSize]);
    }
    // Line height
    const lineHeightScale: Record<string, string> = {
      'tight': '1.25',
      'normal': '1.5',
      'relaxed': '1.75',
    };
    if (theme.typography.lineHeight && lineHeightScale[theme.typography.lineHeight]) {
      root.style.setProperty('--line-height-base', lineHeightScale[theme.typography.lineHeight]);
    }
  }
  
  // Apply spacing/density tokens
  if (theme.spacing) {
    // Spacing scale affects padding and margins
    const spacingScale: Record<string, { base: string; tight: string; loose: string }> = {
      'compact': { base: '0.75rem', tight: '0.5rem', loose: '1rem' },
      'normal': { base: '1rem', tight: '0.75rem', loose: '1.5rem' },
      'relaxed': { base: '1.5rem', tight: '1rem', loose: '2rem' },
    };
    if (theme.spacing.scale && spacingScale[theme.spacing.scale]) {
      const scale = spacingScale[theme.spacing.scale];
      root.style.setProperty('--spacing-base', scale.base);
      root.style.setProperty('--spacing-tight', scale.tight);
      root.style.setProperty('--spacing-loose', scale.loose);
      root.style.setProperty('--density', theme.spacing.scale);
    }
    // Card padding
    const cardPaddingScale: Record<string, string> = {
      'sm': '0.75rem',
      'md': '1rem',
      'lg': '1.5rem',
    };
    if (theme.spacing.cardPadding && cardPaddingScale[theme.spacing.cardPadding]) {
      root.style.setProperty('--card-padding', cardPaddingScale[theme.spacing.cardPadding]);
    }
  }
  
  // Apply spacing tokens
  if (theme.spacing?.borderRadius) {
    const radiusValue = RADIUS_SCALE[theme.spacing.borderRadius];
    if (radiusValue) {
      root.style.setProperty('--radius', radiusValue);
      appliedTokens['--radius'] = radiusValue;
    }
  }
  
  // Apply custom variables
  if (theme.customVars) {
    Object.entries(theme.customVars).forEach(([varName, value]) => {
      const cssVarName = varName.startsWith('--') ? varName : `--${varName}`;
      root.style.setProperty(cssVarName, value);
    });
  }
  
  // Handle dark/light mode
  if (theme.mode) {
    setMode(theme.mode === 'dark' ? 'dark' : 'light');
  }
  
  // Apply surface theme if specified
  if (theme.surfaceIntent) {
    applySurfaceTheme(theme.surfaceIntent);
  }
  
  emitChange({
    type: 'bulk',
    tokens: appliedTokens,
    timestamp: Date.now(),
  });
}

/**
 * Reset all tokens to their default values
 */
export function resetTokens(): void {
  const root = getRoot();
  if (!root) return;
  
  // Clear all inline styles on root (token overrides)
  const tokenNames: TokenName[] = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring', '--radius',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    '--surface-app', '--surface-section', '--surface-card',
    '--surface-app-foreground', '--surface-divider',
    '--sidebar-background', '--sidebar-foreground', '--sidebar-primary',
    '--sidebar-primary-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring',
  ];
  
  tokenNames.forEach((name) => {
    root.style.removeProperty(name);
  });
  
  emitChange({
    type: 'reset',
    timestamp: Date.now(),
  });
}

/**
 * Subscribe to token changes
 * @returns Unsubscribe function
 */
export function subscribe(callback: TokenChangeCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Get current color mode
 */
export function getMode(): 'light' | 'dark' {
  const root = getRoot();
  if (!root) return 'light';
  return root.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Set color mode (light/dark)
 */
export function setMode(mode: 'light' | 'dark'): void {
  const root = getRoot();
  if (!root) return;
  
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// ============================================================
// SURFACE THEME APPLICATION
// ============================================================

/**
 * Apply a surface theme preset to CSS variables.
 * This controls the atmosphere/environment of the app.
 * 
 * @param intent - The surface intent preset to apply
 */
export function applySurfaceTheme(intent: SurfaceIntent): void {
  const root = getRoot();
  if (!root) return;
  
  const preset = SURFACE_PRESETS[intent];
  if (!preset) {
    console.warn(`Unknown surface intent: ${intent}, falling back to neutral-professional`);
    return applySurfaceTheme('neutral-professional');
  }
  
  // Apply surface layer CSS variables
  root.style.setProperty('--surface-app', toHSLValue(preset.appBackground));
  root.style.setProperty('--surface-section', toHSLValue(preset.sectionBackground));
  root.style.setProperty('--surface-card', toHSLValue(preset.cardBackground));
  root.style.setProperty('--surface-app-foreground', toHSLValue(preset.appForeground));
  root.style.setProperty('--surface-divider', toHSLValue(preset.dividerColor));
  
  // Also update sidebar to match the surface theme for consistency
  root.style.setProperty('--sidebar-background', toHSLValue(preset.sectionBackground));
  root.style.setProperty('--sidebar-border', toHSLValue(preset.dividerColor));
  
  // Log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎨 Applied surface theme: ${intent}`);
  }
  
  emitChange({
    type: 'bulk',
    tokens: {
      '--surface-app': toHSLValue(preset.appBackground),
      '--surface-section': toHSLValue(preset.sectionBackground),
      '--surface-card': toHSLValue(preset.cardBackground),
    } as Partial<Record<TokenName, string>>,
    timestamp: Date.now(),
  });
}

/**
 * Get the current surface intent from CSS variables (if set).
 * Returns null if no surface theme has been explicitly applied.
 */
export function getCurrentSurfaceIntent(): SurfaceIntent | null {
  const root = getRoot();
  if (!root) return null;
  
  const currentAppBg = root.style.getPropertyValue('--surface-app').trim();
  if (!currentAppBg) return null;
  
  // Try to match current values to a preset
  for (const [intent, preset] of Object.entries(SURFACE_PRESETS)) {
    if (toHSLValue(preset.appBackground) === currentAppBg) {
      return intent as SurfaceIntent;
    }
  }
  
  return null;
}

/**
 * Reset surface theme to defaults (neutral-professional)
 */
export function resetSurfaceTheme(): void {
  applySurfaceTheme('neutral-professional');
}

/**
 * Create a token runtime instance (for use as an object)
 */
export function createTokenRuntime(): TokenRuntime {
  return {
    getToken,
    setToken,
    applyTheme,
    resetTokens,
    subscribe,
    getMode,
    setMode,
  };
}

// Export default runtime instance
export const tokenRuntime = createTokenRuntime();
