/**
 * useTokenRuntime Hook
 * React hook for accessing the token runtime system
 * Provides reactive access to CSS variable tokens with change subscriptions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getToken,
  setToken,
  applyTheme,
  resetTokens,
  subscribe,
  getMode,
  setMode,
} from '../lib/token-runtime';
import type {
  TokenName,
  ThemeTokens,
  TokenChangeEvent,
} from '../lib/token-types';

/**
 * Hook options
 */
interface UseTokenRuntimeOptions {
  /**
   * Whether to re-render on token changes
   * @default true
   */
  reactive?: boolean;
}

/**
 * Hook return type
 */
interface UseTokenRuntimeReturn {
  /**
   * Get current value of a token
   */
  getToken: (name: TokenName) => string;
  
  /**
   * Set a single token value
   */
  setToken: (name: TokenName, value: string) => void;
  
  /**
   * Apply a theme object to tokens
   */
  applyTheme: (theme: ThemeTokens) => void;
  
  /**
   * Reset all tokens to defaults
   */
  resetTokens: () => void;
  
  /**
   * Current color mode
   */
  mode: 'light' | 'dark';
  
  /**
   * Set color mode
   */
  setMode: (mode: 'light' | 'dark') => void;
  
  /**
   * Toggle between light and dark mode
   */
  toggleMode: () => void;
  
  /**
   * Last change event (for debugging/tracking)
   */
  lastChange: TokenChangeEvent | null;
}

/**
 * React hook for the token runtime system
 * 
 * @example
 * ```tsx
 * const { applyTheme, mode, toggleMode } = useTokenRuntime();
 * 
 * // Apply theme from app schema
 * useEffect(() => {
 *   if (app?.theme) {
 *     applyTheme(app.theme);
 *   }
 * }, [app?.theme, applyTheme]);
 * 
 * // Toggle dark mode
 * <button onClick={toggleMode}>
 *   {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
 * </button>
 * ```
 */
export function useTokenRuntime(options: UseTokenRuntimeOptions = {}): UseTokenRuntimeReturn {
  const { reactive = true } = options;
  
  // Track last change event for reactivity
  const [lastChange, setLastChange] = useState<TokenChangeEvent | null>(null);
  
  // Track current mode
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>(() => {
    // Initialize on client side only
    if (typeof window !== 'undefined') {
      return getMode();
    }
    return 'light';
  });
  
  // Subscribe to token changes
  useEffect(() => {
    if (!reactive) return;
    
    const unsubscribe = subscribe((event) => {
      setLastChange(event);
      // Update mode if it might have changed
      setCurrentMode(getMode());
    });
    
    return unsubscribe;
  }, [reactive]);
  
  // Memoized setMode that also updates local state
  const handleSetMode = useCallback((mode: 'light' | 'dark') => {
    setMode(mode);
    setCurrentMode(mode);
  }, []);
  
  // Toggle mode helper
  const toggleMode = useCallback(() => {
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    handleSetMode(newMode);
  }, [currentMode, handleSetMode]);
  
  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    getToken,
    setToken,
    applyTheme,
    resetTokens,
    mode: currentMode,
    setMode: handleSetMode,
    toggleMode,
    lastChange,
  }), [currentMode, handleSetMode, toggleMode, lastChange]);
}

/**
 * Hook to apply a theme when it changes
 * Convenience wrapper for common use case
 * 
 * @example
 * ```tsx
 * // In SchemaRenderer or Preview component
 * useApplyTheme(app?.theme);
 * ```
 */
export function useApplyTheme(theme: ThemeTokens | undefined | null): void {
  useEffect(() => {
    if (theme) {
      applyTheme(theme);
    }
  }, [theme]);
}

/**
 * Hook to track a specific token value
 * 
 * @example
 * ```tsx
 * const primaryColor = useTokenValue('--primary');
 * // primaryColor updates when the token changes
 * ```
 */
export function useTokenValue(name: TokenName): string {
  const [value, setValue] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getToken(name);
    }
    return '';
  });
  
  useEffect(() => {
    // Get initial value
    setValue(getToken(name));
    
    // Subscribe to changes
    const unsubscribe = subscribe((event) => {
      if (event.type === 'reset' || event.type === 'bulk' || event.token === name) {
        setValue(getToken(name));
      }
    });
    
    return unsubscribe;
  }, [name]);
  
  return value;
}

export default useTokenRuntime;
