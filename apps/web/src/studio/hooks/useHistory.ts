/**
 * Undo/Redo History Hook
 * Manages application state history for undo/redo functionality
 */

import { useState, useCallback, useMemo } from 'react';
import type { HistoryEntry, HistoryState, SelectionType } from '../types.js';

const MAX_HISTORY_SIZE = 100;

function generateId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface UseHistoryReturn {
  // State
  canUndo: boolean;
  canRedo: boolean;
  currentEntry: HistoryEntry | null;
  entries: HistoryEntry[];
  
  // Actions
  push: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clear: () => void;
  
  // Utilities
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

export function useHistory(): UseHistoryReturn {
  const [state, setState] = useState<HistoryState>({
    entries: [],
    currentIndex: -1,
    maxSize: MAX_HISTORY_SIZE,
  });

  // Push a new entry
  const push = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setState(prev => {
      // Remove any entries after current index (when adding new after undo)
      const newEntries = prev.entries.slice(0, prev.currentIndex + 1);
      
      // Add new entry
      const newEntry: HistoryEntry = {
        ...entry,
        id: generateId(),
        timestamp: Date.now(),
      };
      newEntries.push(newEntry);
      
      // Trim if exceeds max size
      while (newEntries.length > prev.maxSize) {
        newEntries.shift();
      }
      
      return {
        ...prev,
        entries: newEntries,
        currentIndex: newEntries.length - 1,
      };
    });
  }, []);

  // Undo
  const undo = useCallback((): HistoryEntry | null => {
    let undoneEntry: HistoryEntry | null = null;
    
    setState(prev => {
      if (prev.currentIndex < 0) return prev;
      
      undoneEntry = prev.entries[prev.currentIndex];
      return {
        ...prev,
        currentIndex: prev.currentIndex - 1,
      };
    });
    
    return undoneEntry;
  }, []);

  // Redo
  const redo = useCallback((): HistoryEntry | null => {
    let redoneEntry: HistoryEntry | null = null;
    
    setState(prev => {
      if (prev.currentIndex >= prev.entries.length - 1) return prev;
      
      const newIndex = prev.currentIndex + 1;
      redoneEntry = prev.entries[newIndex];
      return {
        ...prev,
        currentIndex: newIndex,
      };
    });
    
    return redoneEntry;
  }, []);

  // Clear history
  const clear = useCallback(() => {
    setState({
      entries: [],
      currentIndex: -1,
      maxSize: MAX_HISTORY_SIZE,
    });
  }, []);

  // Derived state
  const canUndo = state.currentIndex >= 0;
  const canRedo = state.currentIndex < state.entries.length - 1;
  const currentEntry = state.currentIndex >= 0 ? state.entries[state.currentIndex] : null;

  const getUndoDescription = useCallback((): string | null => {
    if (state.currentIndex < 0) return null;
    return state.entries[state.currentIndex].description;
  }, [state.currentIndex, state.entries]);

  const getRedoDescription = useCallback((): string | null => {
    if (state.currentIndex >= state.entries.length - 1) return null;
    return state.entries[state.currentIndex + 1].description;
  }, [state.currentIndex, state.entries]);

  return {
    canUndo,
    canRedo,
    currentEntry,
    entries: state.entries,
    push,
    undo,
    redo,
    clear,
    getUndoDescription,
    getRedoDescription,
  };
}
