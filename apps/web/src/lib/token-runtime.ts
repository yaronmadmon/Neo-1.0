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
} from './token-types';
import { THEME_TO_TOKEN_MAP, RADIUS_SCALE } from './token-types';

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
    });
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
