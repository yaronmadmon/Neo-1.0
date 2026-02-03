/**
 * Theme Sync Utility
 * Persists theme changes to the backend API
 * Uses debouncing to avoid excessive API calls during rapid changes
 */

import type { ThemeTokens } from './token-types';

/**
 * Debounce timers for each app
 */
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Default debounce delay in milliseconds
 */
const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Pending theme updates for optimistic batching
 */
const pendingUpdates: Map<string, ThemeTokens> = new Map();

/**
 * Callbacks for sync status updates
 */
type SyncStatusCallback = (status: 'saving' | 'saved' | 'error', error?: Error) => void;
const statusCallbacks: Set<SyncStatusCallback> = new Set();

/**
 * Notify status callbacks
 */
function notifyStatus(status: 'saving' | 'saved' | 'error', error?: Error): void {
  statusCallbacks.forEach((callback) => {
    try {
      callback(status, error);
    } catch (e) {
      console.error('Theme sync status callback error:', e);
    }
  });
}

/**
 * Subscribe to sync status updates
 * @returns Unsubscribe function
 */
export function onSyncStatus(callback: SyncStatusCallback): () => void {
  statusCallbacks.add(callback);
  return () => {
    statusCallbacks.delete(callback);
  };
}

/**
 * Perform the actual API call to sync theme
 */
async function performSync(appId: string, theme: ThemeTokens): Promise<void> {
  notifyStatus('saving');
  
  try {
    const response = await fetch(`/api/apps/${appId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ theme }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to sync theme: ${response.status} ${errorText}`);
    }
    
    notifyStatus('saved');
    console.log('✅ Theme synced successfully for app:', appId);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    notifyStatus('error', err);
    console.error('❌ Failed to sync theme:', err);
    throw err;
  }
}

/**
 * Save theme changes with debouncing
 * 
 * @param appId - The app ID to save theme for
 * @param theme - The theme tokens to save
 * @param options - Optional configuration
 * @returns Promise that resolves when the save is scheduled (not completed)
 * 
 * @example
 * ```tsx
 * // Save theme changes (debounced)
 * await saveTheme('app-123', {
 *   colors: { primary: '#3b82f6' },
 *   spacing: { borderRadius: 'lg' }
 * });
 * ```
 */
export function saveTheme(
  appId: string,
  theme: ThemeTokens,
  options: { debounceMs?: number; immediate?: boolean } = {}
): Promise<void> {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, immediate = false } = options;
  
  // Clear existing timer for this app
  const existingTimer = debounceTimers.get(appId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  // Merge with any pending updates
  const existing = pendingUpdates.get(appId) || {};
  const merged: ThemeTokens = {
    ...existing,
    ...theme,
    colors: { ...existing.colors, ...theme.colors },
    spacing: { ...existing.spacing, ...theme.spacing },
    customVars: { ...existing.customVars, ...theme.customVars },
  };
  pendingUpdates.set(appId, merged);
  
  // If immediate, skip debouncing
  if (immediate) {
    pendingUpdates.delete(appId);
    return performSync(appId, merged);
  }
  
  // Set up debounced save
  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      debounceTimers.delete(appId);
      const themeToSave = pendingUpdates.get(appId);
      pendingUpdates.delete(appId);
      
      if (themeToSave) {
        try {
          await performSync(appId, themeToSave);
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        resolve();
      }
    }, debounceMs);
    
    debounceTimers.set(appId, timer);
  });
}

/**
 * Cancel any pending theme saves for an app
 */
export function cancelPendingSave(appId: string): void {
  const timer = debounceTimers.get(appId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(appId);
  }
  pendingUpdates.delete(appId);
}

/**
 * Flush all pending saves immediately
 * Useful before navigation or when app is closing
 */
export async function flushPendingSaves(): Promise<void> {
  const savePromises: Promise<void>[] = [];
  
  // Clear all timers
  debounceTimers.forEach((timer) => clearTimeout(timer));
  debounceTimers.clear();
  
  // Save all pending updates
  pendingUpdates.forEach((theme, appId) => {
    savePromises.push(performSync(appId, theme));
  });
  pendingUpdates.clear();
  
  await Promise.allSettled(savePromises);
}

/**
 * Check if there are pending saves for an app
 */
export function hasPendingSave(appId: string): boolean {
  return pendingUpdates.has(appId);
}
