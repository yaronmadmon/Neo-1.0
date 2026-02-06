/**
 * Token Types
 * TypeScript types for the token runtime system
 */

/**
 * Valid CSS variable names that can be controlled by the token system
 */
export type TokenName =
  // Core colors
  | '--background'
  | '--foreground'
  | '--card'
  | '--card-foreground'
  | '--popover'
  | '--popover-foreground'
  | '--primary'
  | '--primary-foreground'
  | '--secondary'
  | '--secondary-foreground'
  | '--muted'
  | '--muted-foreground'
  | '--accent'
  | '--accent-foreground'
  | '--destructive'
  | '--destructive-foreground'
  | '--border'
  | '--input'
  | '--ring'
  // Chart colors
  | '--chart-1'
  | '--chart-2'
  | '--chart-3'
  | '--chart-4'
  | '--chart-5'
  // Layout
  | '--radius'
  // Surface layers (atmosphere)
  | '--surface-app'
  | '--surface-section'
  | '--surface-card'
  | '--surface-app-foreground'
  | '--surface-divider'
  // Sidebar
  | '--sidebar-background'
  | '--sidebar-foreground'
  | '--sidebar-primary'
  | '--sidebar-primary-foreground'
  | '--sidebar-accent'
  | '--sidebar-accent-foreground'
  | '--sidebar-border'
  | '--sidebar-ring';

/**
 * Mapping from UnifiedTheme colors to CSS variable names
 */
export const THEME_TO_TOKEN_MAP: Record<string, TokenName> = {
  // Colors mapping
  'colors.primary': '--primary',
  'colors.secondary': '--secondary',
  'colors.accent': '--accent',
  'colors.background': '--background',
  'colors.surface': '--card',
  'colors.text': '--foreground',
  'colors.textMuted': '--muted-foreground',
  'colors.error': '--destructive',
  'colors.border': '--border',
  'colors.info': '--ring',
  // Spacing mapping
  'spacing.borderRadius': '--radius',
} as const;

/**
 * Border radius scale values
 */
export const RADIUS_SCALE: Record<string, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

/**
 * Theme colors structure (subset of UnifiedTheme that maps to tokens)
 */
export interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
  background?: string;
  surface?: string;
  text?: string;
  textMuted?: string;
  border?: string;
}

/**
 * Theme spacing structure
 */
export interface ThemeSpacing {
  scale?: 'compact' | 'normal' | 'relaxed';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  cardPadding?: 'sm' | 'md' | 'lg';
}

/**
 * Theme typography structure
 */
export interface ThemeTypography {
  fontFamily?: string;
  headingFamily?: string;
  monoFamily?: string;
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  lineHeight?: 'tight' | 'normal' | 'relaxed';
}

/**
 * Surface intent for atmosphere control
 */
export type SurfaceIntent =
  | 'warm-artisanal'
  | 'neutral-professional'
  | 'modern-dark'
  | 'playful-light';

/**
 * Theme tokens that can be applied to CSS variables
 */
export interface ThemeTokens {
  colors?: ThemeColors;
  typography?: ThemeTypography;
  spacing?: ThemeSpacing;
  mode?: 'light' | 'dark' | 'auto';
  surfaceIntent?: SurfaceIntent;
  customVars?: Record<string, string>;
}

/**
 * Event emitted when tokens change
 */
export interface TokenChangeEvent {
  type: 'single' | 'bulk' | 'reset';
  token?: TokenName;
  value?: string;
  tokens?: Partial<Record<TokenName, string>>;
  timestamp: number;
}

/**
 * Callback type for token change subscriptions
 */
export type TokenChangeCallback = (event: TokenChangeEvent) => void;

/**
 * Token runtime interface
 */
export interface TokenRuntime {
  getToken(name: TokenName): string;
  setToken(name: TokenName, value: string): void;
  applyTheme(theme: ThemeTokens): void;
  resetTokens(): void;
  subscribe(callback: TokenChangeCallback): () => void;
  getMode(): 'light' | 'dark';
  setMode(mode: 'light' | 'dark'): void;
}
