/**
 * Relative Value Computer
 * Handles "more", "less", "lighter", "darker" relative changes
 */

import { getToken } from '../token-runtime';
import type { TokenName } from '../token-types';

/**
 * Radius scale for relative changes
 */
const RADIUS_STEPS = ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const;

/**
 * Spacing scale for relative changes
 */
const SPACING_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

/**
 * Font size scale for relative changes
 */
const FONT_SIZE_STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'] as const;

/**
 * Font weight scale for relative changes
 */
const FONT_WEIGHT_STEPS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

/**
 * Result of relative computation
 */
export interface RelativeResult {
  success: boolean;
  newValue?: string;
  property?: string;
  error?: string;
}

/**
 * Parse HSL value from CSS variable format
 * Input: "217 91% 60%" -> { h: 217, s: 91, l: 60 }
 */
function parseHSL(value: string): { h: number; s: number; l: number } | null {
  const match = value.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
}

/**
 * Format HSL back to CSS variable format
 */
function formatHSL(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/**
 * Move along a scale by delta steps
 */
function moveOnScale<T extends string>(
  scale: readonly T[],
  current: T | undefined,
  delta: number
): T | null {
  if (!current) {
    // Default to middle of scale
    const middleIndex = Math.floor(scale.length / 2);
    const newIndex = Math.max(0, Math.min(scale.length - 1, middleIndex + delta));
    return scale[newIndex];
  }
  
  const currentIndex = scale.indexOf(current);
  if (currentIndex === -1) return null;
  
  const newIndex = Math.max(0, Math.min(scale.length - 1, currentIndex + delta));
  return scale[newIndex];
}

/**
 * Compute a relative color change (lighter/darker/more saturated)
 */
export function computeRelativeColor(
  currentValue: string,
  direction: 'more' | 'less',
  property: 'lightness' | 'saturation' | 'hue'
): RelativeResult {
  const hsl = parseHSL(currentValue);
  if (!hsl) {
    return { success: false, error: 'Could not parse color value' };
  }
  
  const step = direction === 'more' ? 10 : -10;
  
  switch (property) {
    case 'lightness': {
      const newL = Math.max(0, Math.min(100, hsl.l + step));
      return {
        success: true,
        newValue: formatHSL(hsl.h, hsl.s, newL),
        property: 'lightness',
      };
    }
    case 'saturation': {
      const newS = Math.max(0, Math.min(100, hsl.s + step));
      return {
        success: true,
        newValue: formatHSL(hsl.h, newS, hsl.l),
        property: 'saturation',
      };
    }
    case 'hue': {
      const newH = (hsl.h + (direction === 'more' ? 30 : -30) + 360) % 360;
      return {
        success: true,
        newValue: formatHSL(newH, hsl.s, hsl.l),
        property: 'hue',
      };
    }
    default:
      return { success: false, error: `Unknown property: ${property}` };
  }
}

/**
 * Compute a relative radius change (more/less rounded)
 */
export function computeRelativeRadius(
  direction: 'more' | 'less'
): RelativeResult {
  const currentValue = getToken('--radius' as TokenName);
  
  // Map current value to scale step
  const valueToStep: Record<string, typeof RADIUS_STEPS[number]> = {
    '0': 'none',
    '0.125rem': 'sm',
    '0.25rem': 'sm',
    '0.375rem': 'md',
    '0.5rem': 'md',
    '0.75rem': 'lg',
    '1rem': 'xl',
    '9999px': 'full',
  };
  
  const currentStep = valueToStep[currentValue] || 'md';
  const delta = direction === 'more' ? 1 : -1;
  const newStep = moveOnScale(RADIUS_STEPS, currentStep, delta);
  
  if (!newStep) {
    return { success: false, error: 'Cannot change radius further' };
  }
  
  // Map step back to CSS value
  const stepToValue: Record<string, string> = {
    'none': '0',
    'sm': '0.25rem',
    'md': '0.5rem',
    'lg': '0.75rem',
    'xl': '1rem',
    'full': '9999px',
  };
  
  return {
    success: true,
    newValue: stepToValue[newStep],
    property: 'borderRadius',
  };
}

/**
 * Compute relative change based on value term
 * Handles terms like "rounded", "bold", "large"
 */
export function computeRelativeChange(
  value: string,
  direction: 'more' | 'less',
  currentCssVar?: string
): RelativeResult {
  const normalized = value.toLowerCase().trim();
  const delta = direction === 'more' ? 1 : -1;
  
  // Rounded/corners
  if (['rounded', 'round', 'corners', 'radius'].includes(normalized)) {
    return computeRelativeRadius(direction);
  }
  
  // Light/dark (color lightness)
  if (['light', 'bright', 'lighter'].includes(normalized)) {
    if (currentCssVar) {
      const currentValue = getToken(currentCssVar as TokenName);
      if (currentValue) {
        return computeRelativeColor(currentValue, 'more', 'lightness');
      }
    }
    return { success: false, error: 'No color to adjust' };
  }
  
  if (['dark', 'darker'].includes(normalized)) {
    if (currentCssVar) {
      const currentValue = getToken(currentCssVar as TokenName);
      if (currentValue) {
        return computeRelativeColor(currentValue, 'less', 'lightness');
      }
    }
    return { success: false, error: 'No color to adjust' };
  }
  
  // Saturated/vivid
  if (['saturated', 'vivid', 'vibrant', 'colorful'].includes(normalized)) {
    if (currentCssVar) {
      const currentValue = getToken(currentCssVar as TokenName);
      if (currentValue) {
        return computeRelativeColor(currentValue, direction, 'saturation');
      }
    }
    return { success: false, error: 'No color to adjust' };
  }
  
  // Bold/font weight
  if (['bold', 'heavy', 'thick'].includes(normalized)) {
    // This would need typography token support
    return {
      success: true,
      newValue: direction === 'more' ? '700' : '400',
      property: 'fontWeight',
    };
  }
  
  // Large/size
  if (['large', 'big', 'size'].includes(normalized)) {
    const currentStep = 'base';
    const newStep = moveOnScale(FONT_SIZE_STEPS, currentStep, delta);
    if (newStep) {
      return {
        success: true,
        newValue: newStep,
        property: 'fontSize',
      };
    }
  }
  
  // Spacing
  if (['spacing', 'padding', 'space', 'gap'].includes(normalized)) {
    const currentStep = 'md';
    const newStep = moveOnScale(SPACING_STEPS, currentStep, delta);
    if (newStep) {
      return {
        success: true,
        newValue: newStep,
        property: 'spacing',
      };
    }
  }
  
  // Contrast
  if (['contrast', 'pop'].includes(normalized)) {
    // Increase contrast by making primary more saturated and lightness more extreme
    if (currentCssVar) {
      const currentValue = getToken(currentCssVar as TokenName);
      if (currentValue) {
        const hsl = parseHSL(currentValue);
        if (hsl) {
          const newS = Math.min(100, hsl.s + (direction === 'more' ? 15 : -15));
          const newL = hsl.l > 50 
            ? Math.min(100, hsl.l + (direction === 'more' ? 5 : -5))
            : Math.max(0, hsl.l + (direction === 'more' ? -5 : 5));
          return {
            success: true,
            newValue: formatHSL(hsl.h, newS, newL),
            property: 'color',
          };
        }
      }
    }
    return { success: false, error: 'No color to adjust' };
  }
  
  return {
    success: false,
    error: `Cannot compute relative change for "${value}"`,
  };
}

/**
 * Helper to make a color lighter
 */
export function makeLighter(hslValue: string, amount: number = 10): string | null {
  const hsl = parseHSL(hslValue);
  if (!hsl) return null;
  const newL = Math.min(100, hsl.l + amount);
  return formatHSL(hsl.h, hsl.s, newL);
}

/**
 * Helper to make a color darker
 */
export function makeDarker(hslValue: string, amount: number = 10): string | null {
  const hsl = parseHSL(hslValue);
  if (!hsl) return null;
  const newL = Math.max(0, hsl.l - amount);
  return formatHSL(hsl.h, hsl.s, newL);
}

/**
 * Helper to adjust saturation
 */
export function adjustSaturation(hslValue: string, delta: number): string | null {
  const hsl = parseHSL(hslValue);
  if (!hsl) return null;
  const newS = Math.max(0, Math.min(100, hsl.s + delta));
  return formatHSL(hsl.h, newS, hsl.l);
}
