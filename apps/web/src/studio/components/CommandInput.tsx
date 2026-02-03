/**
 * CommandInput Component
 * Unified text input for natural language commands in Studio
 * Accepts typed commands and displays voice transcript
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { executeCommand, type SelectionContext, type ExecutionResult } from '../../lib/intent';

interface CommandInputProps {
  /** Current selection context */
  selection: SelectionContext | null;
  
  /** App ID for persistence */
  appId?: string;
  
  /** Whether voice is currently listening */
  isListening?: boolean;
  
  /** Current voice transcript */
  voiceTranscript?: string;
  
  /** Callback when command is executed */
  onExecute?: (result: ExecutionResult) => void;
  
  /** Callback for undo command */
  onUndo?: () => void;
  
  /** Callback for redo command */
  onRedo?: () => void;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Additional class names */
  className?: string;
}

/**
 * Recent command for history
 */
interface CommandHistoryItem {
  command: string;
  result: ExecutionResult;
  timestamp: number;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  selection,
  appId,
  isListening = false,
  voiceTranscript = '',
  onExecute,
  onUndo,
  onRedo,
  placeholder = 'Type a command... (e.g., "make the background blue")',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Suggestions based on input
  const suggestions = [
    'make the background blue',
    'make the primary color green',
    'make it more rounded',
    'change text to dark',
    'make buttons purple',
  ];
  
  // Update input when voice transcript changes
  useEffect(() => {
    if (voiceTranscript && isListening) {
      setInputValue(voiceTranscript);
    }
  }, [voiceTranscript, isListening]);
  
  // Auto-execute when voice stops with a transcript
  useEffect(() => {
    if (!isListening && voiceTranscript && voiceTranscript.trim()) {
      handleSubmit();
    }
  }, [isListening]);
  
  // Clear feedback after delay
  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    setFeedback({ message, type });
    
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 3000);
  }, []);
  
  // Handle command submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const command = inputValue.trim();
    if (!command) return;
    
    setIsProcessing(true);
    
    try {
      // Check for undo/redo
      if (command.toLowerCase() === 'undo') {
        onUndo?.();
        showFeedback('Undone', 'success');
        setInputValue('');
        setIsProcessing(false);
        return;
      }
      
      if (command.toLowerCase() === 'redo') {
        onRedo?.();
        showFeedback('Redone', 'success');
        setInputValue('');
        setIsProcessing(false);
        return;
      }
      
      // Execute the command
      const result = await executeCommand(command, selection, appId);
      
      // Add to history
      setHistory(prev => [
        { command, result, timestamp: Date.now() },
        ...prev.slice(0, 19), // Keep last 20
      ]);
      setHistoryIndex(-1);
      
      // Show feedback
      showFeedback(result.message, result.success ? 'success' : 'error');
      
      // Notify parent
      onExecute?.(result);
      
      // Clear input on success
      if (result.success) {
        setInputValue('');
      }
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : 'Command failed',
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, selection, appId, onExecute, onUndo, onRedo, showFeedback]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Arrow up - previous command
    if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      setInputValue(history[newIndex].command);
    }
    
    // Arrow down - next command
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex].command);
      } else {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
    
    // Escape - clear
    if (e.key === 'Escape') {
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
    
    // Tab - autocomplete
    if (e.key === 'Tab' && showSuggestions) {
      e.preventDefault();
      const matchingSuggestion = suggestions.find(s => 
        s.toLowerCase().startsWith(inputValue.toLowerCase())
      );
      if (matchingSuggestion) {
        setInputValue(matchingSuggestion);
      }
    }
  }, [history, historyIndex, showSuggestions, inputValue, suggestions]);
  
  // Focus input on keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // "/" to focus (when not in an input)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Cmd/Ctrl+K to focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  
  // Filter suggestions based on input
  const filteredSuggestions = inputValue.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()))
    : [];
  
  return (
    <div className={`relative ${className}`}>
      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          {/* Command icon or listening indicator */}
          <div className="absolute left-3 text-muted-foreground">
            {isListening ? (
              <span className="flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
            )}
          </div>
          
          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : placeholder}
            disabled={isProcessing}
            className={`
              w-full pl-10 pr-20 py-2 
              bg-background border border-input rounded-md
              text-sm text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isListening ? 'border-red-300 ring-1 ring-red-200' : ''}
            `}
          />
          
          {/* Submit button and shortcut hint */}
          <div className="absolute right-2 flex items-center gap-2">
            {inputValue && (
              <button
                type="submit"
                disabled={isProcessing}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? '...' : 'Run'}
              </button>
            )}
            {!inputValue && !isListening && (
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground bg-muted rounded">
                <span className="text-[10px]">/</span>
              </kbd>
            )}
          </div>
        </div>
      </form>
      
      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-popover border border-border rounded-md shadow-md z-50">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setInputValue(suggestion);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {/* Feedback toast */}
      {feedback && (
        <div
          className={`
            absolute top-full left-0 right-0 mt-2 px-3 py-2 rounded-md text-sm
            ${feedback.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
            }
          `}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default CommandInput;
