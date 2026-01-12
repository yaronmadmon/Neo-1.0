/**
 * Theme Engine
 * 
 * Complete theme system with voice-driven control over:
 * - Visual themes (colors, typography, spacing, shadows, borders, animations)
 * - Component-level styling
 * - Layout responsiveness
 * - Light/Dark mode
 * - Industry-specific presets
 * - Voice-driven style changes
 */

import type { UnifiedTheme } from './dna/schema.js';
import type { ParsedInput } from './intelligence/types.js';
import { ThemeBuilder } from './dna/theme-builder.js';

// ============================================================
// COLOR UTILITIES
// ============================================================

/**
 * Convert color name to hex code
 */
export function colorNameToHex(colorName: string): string {
  const colors: Record<string, string> = {
    // Primary colors
    'red': '#ef4444',
    'orange': '#f97316',
    'yellow': '#eab308',
    'green': '#22c55e',
    'teal': '#14b8a6',
    'cyan': '#06b6d4',
    'blue': '#3b82f6',
    'indigo': '#6366f1',
    'purple': '#8b5cf6',
    'violet': '#8b5cf6',
    'pink': '#ec4899',
    'rose': '#f43f5e',
    'gray': '#6b7280',
    'grey': '#6b7280',
    'slate': '#64748b',
    'zinc': '#71717a',
    'neutral': '#737373',
    'stone': '#78716c',
    'amber': '#f59e0b',
    'emerald': '#10b981',
    'sky': '#0ea5e9',
    'fuchsia': '#d946ef',
    'lime': '#84cc16',
    
    // Color tones
    'navy': '#1e3a8a',
    'maroon': '#991b1b',
    'olive': '#365314',
    'turquoise': '#14b8a6',
    'coral': '#f87171',
    'salmon': '#fb7185',
    'lavender': '#a78bfa',
    'mint': '#6ee7b7',
    'peach': '#fed7aa',
    'beige': '#fef3c7',
  };
  
  const normalized = colorName.toLowerCase().trim();
  
  // If already hex, return as-is
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }
  
  // Try direct match
  if (colors[normalized]) {
    return colors[normalized];
  }
  
  // Try partial match (e.g., "blue tones" -> "blue")
  for (const [name, hex] of Object.entries(colors)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return hex;
    }
  }
  
  // Default fallback
  return '#6366f1'; // Default indigo
}

/**
 * Generate color palette from a base color
 */
export function generateColorPalette(baseColor: string, mode: 'light' | 'dark' = 'light'): Partial<UnifiedTheme['colors']> {
  const hex = colorNameToHex(baseColor);
  
  // Extract RGB values
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  
  // Generate complementary colors
  const adjustBrightness = (amount: number) => {
    const nr = Math.min(255, Math.max(0, r + amount));
    const ng = Math.min(255, Math.max(0, g + amount));
    const nb = Math.min(255, Math.max(0, b + amount));
    return `#${((nr << 16) | (ng << 8) | nb).toString(16).padStart(6, '0')}`;
  };
  
  if (mode === 'dark') {
    return {
      primary: hex,
      secondary: adjustBrightness(20),
      accent: adjustBrightness(40),
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      border: '#334155',
    };
  } else {
    return {
      primary: hex,
      secondary: adjustBrightness(-20),
      accent: adjustBrightness(-40),
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
    };
  }
}

// ============================================================
// VOICE THEME PARSER
// ============================================================

export interface VoiceThemeCommand {
  type: 'preset' | 'color' | 'mode' | 'spacing' | 'typography' | 'shadows' | 'borders' | 'animations' | 'component';
  target?: string;
  value: string | boolean | number | object;
  component?: string;
  confidence: number;
}

export interface ThemeParseResult {
  commands: VoiceThemeCommand[];
  confidence: number;
  theme?: Partial<UnifiedTheme>;
  errors?: string[];
}

export class VoiceThemeParser {
  private themeBuilder: ThemeBuilder;
  
  constructor() {
    this.themeBuilder = new ThemeBuilder();
  }

  /**
   * Parse a voice command into theme changes
   * 
   * Examples:
   * - "Make it modern"
   * - "Use blue tones"
   * - "Make it more professional"
   * - "Increase spacing"
   * - "Use rounded corners"
   * - "Make buttons bold and dark"
   * - "Switch to dark mode"
   */
  parse(input: string | ParsedInput): ThemeParseResult {
    const text = typeof input === 'string' ? input : input.normalized;
    const normalized = text.toLowerCase().trim();
    const commands: VoiceThemeCommand[] = [];
    const errors: string[] = [];
    
    // Pattern: "make it [preset]"
    const presetPattern = /make\s+(?:it|this|the\s+app)\s+(?:more\s+)?(modern|minimal|professional|bold|playful|elegant|tech|nature|clean|sleek|simple|colorful|fun|serious|corporate|business|fancy|luxurious|techy|futuristic|organic|green|eco|dark|light|strong|powerful)/i;
    const presetMatch = normalized.match(presetPattern);
    if (presetMatch) {
      const preset = this.normalizePreset(presetMatch[1]);
      commands.push({
        type: 'preset',
        value: preset,
        confidence: 0.9,
      });
    }
    
    // Pattern: "use [color] [tones|color]"
    const colorPattern = /use\s+(\w+)\s*(?:tones?|colors?)?/i;
    const colorMatch = normalized.match(colorPattern);
    if (colorMatch) {
      const color = colorMatch[1];
      commands.push({
        type: 'color',
        target: 'primary',
        value: colorNameToHex(color),
        confidence: 0.85,
      });
    }
    
    // Pattern: "make [component] [style]"
    const componentPattern = /make\s+(\w+)\s+(?:more\s+)?(bold|dark|light|larger|smaller|rounded|sharp|bright|muted)/i;
    const componentMatch = normalized.match(componentPattern);
    if (componentMatch) {
      const component = componentMatch[1];
      const style = componentMatch[2];
      commands.push({
        type: 'component',
        component,
        value: this.parseComponentStyle(style),
        confidence: 0.8,
      });
    }
    
    // Pattern: "[increase|decrease] spacing"
    const spacingPattern = /(increase|decrease|more|less)\s+spacing/i;
    const spacingMatch = normalized.match(spacingPattern);
    if (spacingMatch) {
      const direction = spacingMatch[1];
      commands.push({
        type: 'spacing',
        value: direction.includes('increase') || direction === 'more' ? 'relaxed' : 'compact',
        confidence: 0.85,
      });
    }
    
    // Pattern: "[use|with] rounded [corners]"
    const roundedPattern = /(?:use|with|make\s+it)\s+rounded\s*(?:corners?)?/i;
    if (roundedPattern.test(normalized)) {
      commands.push({
        type: 'borders',
        target: 'borderRadius',
        value: 'lg',
        confidence: 0.9,
      });
    }
    
    // Pattern: "dark mode" or "light mode"
    const modePattern = /(dark|light)\s*(?:mode|theme)?/i;
    const modeMatch = normalized.match(modePattern);
    if (modeMatch) {
      commands.push({
        type: 'mode',
        value: modeMatch[1] as 'light' | 'dark',
        confidence: 0.95,
      });
    }
    
    // Pattern: "make buttons [style]"
    const buttonPattern = /make\s+buttons?\s+(?:more\s+)?(bold|dark|light|rounded|sharp|bright|prominent)/i;
    const buttonMatch = normalized.match(buttonPattern);
    if (buttonMatch) {
      const style = buttonMatch[1];
      commands.push({
        type: 'component',
        component: 'button',
        value: this.parseComponentStyle(style),
        confidence: 0.85,
      });
    }
    
    // Pattern: "increase font size" or "make text larger"
    const fontSizePattern = /(increase|decrease|larger|smaller)\s+(?:font\s+)?(?:size|text)/i;
    const fontSizeMatch = normalized.match(fontSizePattern);
    if (fontSizeMatch) {
      const direction = fontSizeMatch[1];
      commands.push({
        type: 'typography',
        target: 'fontSize',
        value: direction.includes('increase') || direction === 'larger' ? 'lg' : 'sm',
        confidence: 0.8,
      });
    }
    
    // Pattern: "enable shadows" or "disable shadows"
    const shadowPattern = /(enable|disable|add|remove)\s+shadows?/i;
    const shadowMatch = normalized.match(shadowPattern);
    if (shadowMatch) {
      const enabled = shadowMatch[1] === 'enable' || shadowMatch[1] === 'add';
      commands.push({
        type: 'shadows',
        value: enabled,
        confidence: 0.9,
      });
    }
    
    // If no commands found, try to extract any style keywords
    if (commands.length === 0) {
      const styleKeywords = ['modern', 'minimal', 'professional', 'bold', 'playful', 'blue', 'dark', 'light'];
      for (const keyword of styleKeywords) {
        if (normalized.includes(keyword)) {
          if (['dark', 'light'].includes(keyword)) {
            commands.push({
              type: 'mode',
              value: keyword as 'light' | 'dark',
              confidence: 0.7,
            });
          } else if (colorNameToHex(keyword) !== '#6366f1') {
            commands.push({
              type: 'color',
              target: 'primary',
              value: colorNameToHex(keyword),
              confidence: 0.6,
            });
          } else {
            commands.push({
              type: 'preset',
              value: this.normalizePreset(keyword),
              confidence: 0.6,
            });
          }
          break;
        }
      }
    }
    
    // Generate theme from commands
    let theme: Partial<UnifiedTheme> | undefined;
    if (commands.length > 0) {
      theme = this.commandsToTheme(commands);
    }
    
    return {
      commands,
      confidence: commands.length > 0 ? Math.max(...commands.map(c => c.confidence)) : 0,
      theme,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * Convert commands to theme object
   */
  private commandsToTheme(commands: VoiceThemeCommand[]): Partial<UnifiedTheme> {
    const theme: Partial<UnifiedTheme> = {};
    let presetApplied = false;
    
    for (const command of commands) {
      switch (command.type) {
        case 'preset':
          if (!presetApplied) {
            const presetTheme = this.themeBuilder.buildFromKeyword(command.value as string);
            Object.assign(theme, presetTheme);
            presetApplied = true;
          }
          break;
          
        case 'color':
          if (!theme.colors) {
            theme.colors = { primary: command.value as string };
          } else {
            (theme.colors as any)[command.target || 'primary'] = command.value as string;
          }
          // Generate palette if it's primary
          if (command.target === 'primary' || !command.target) {
            const mode = theme.mode === 'auto' ? 'light' : (theme.mode || 'light');
            const palette = generateColorPalette(command.value as string, mode as 'light' | 'dark');
            theme.colors = {
              ...theme.colors,
              ...palette,
              primary: command.value as string,
            };
          }
          break;
          
        case 'mode':
          const modeValue = command.value as 'light' | 'dark' | 'auto';
          theme.mode = modeValue;
          break;
          
        case 'spacing':
          if (!theme.spacing) theme.spacing = {};
          theme.spacing.scale = command.value as 'compact' | 'normal' | 'relaxed';
          break;
          
        case 'borders':
          if (!theme.spacing) theme.spacing = {};
          if (command.target === 'borderRadius') {
            theme.spacing.borderRadius = command.value as any;
          }
          break;
          
        case 'typography':
          if (!theme.typography) theme.typography = {};
          if (command.target) {
            (theme.typography as any)[command.target] = command.value;
          }
          break;
          
        case 'shadows':
          theme.shadows = {
            enabled: command.value as boolean,
            intensity: 'medium',
          };
          break;
          
        case 'component':
          if (!theme.components) theme.components = {};
          if (command.component) {
            theme.components[command.component as keyof typeof theme.components] = command.value as any;
          }
          break;
      }
    }
    
    // Ensure colors.primary is set
    if (!theme.colors || !theme.colors.primary) {
      theme.colors = {
        primary: '#6366f1',
        ...(theme.colors || {}),
      };
    }
    
    return theme;
  }

  /**
   * Normalize preset name
   */
  private normalizePreset(keyword: string): string {
    const map: Record<string, string> = {
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
      'techy': 'tech',
      'futuristic': 'tech',
      'organic': 'nature',
      'green': 'nature',
      'eco': 'nature',
      'strong': 'bold',
      'powerful': 'bold',
    };
    
    return map[keyword.toLowerCase()] || keyword.toLowerCase();
  }

  /**
   * Parse component style
   */
  private parseComponentStyle(style: string): Record<string, unknown> {
    const lower = style.toLowerCase();
    const result: Record<string, unknown> = {};
    
    if (lower.includes('bold')) {
      result.fontWeight = 'bold';
    }
    if (lower.includes('dark')) {
      result.backgroundColor = '#1e293b';
      result.color = '#ffffff';
    }
    if (lower.includes('light')) {
      result.backgroundColor = '#f8fafc';
      result.color = '#0f172a';
    }
    if (lower.includes('rounded')) {
      result.borderRadius = '0.5rem';
    }
    if (lower.includes('sharp')) {
      result.borderRadius = '0';
    }
    if (lower.includes('bright')) {
      result.opacity = '1';
      result.fontWeight = '600';
    }
    if (lower.includes('muted')) {
      result.opacity = '0.7';
    }
    
    return result;
  }
}

// Export singleton
export const voiceThemeParser = new VoiceThemeParser();
