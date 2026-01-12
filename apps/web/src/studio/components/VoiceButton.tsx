/**
 * Voice Button Component
 * Floating button for voice activation with visual feedback
 */

import React from 'react';

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  onClick: () => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isSupported,
  transcript,
  error,
  onClick,
}) => {
  if (!isSupported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Transcript bubble */}
      {isListening && transcript && (
        <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-xs animate-fade-in">
          <div className="text-xs text-gray-500 mb-1">Listening...</div>
          <div className="text-sm text-gray-900">{transcript}</div>
        </div>
      )}

      {/* Error bubble */}
      {error && (
        <div className="absolute bottom-20 right-0 bg-red-50 border border-red-200 rounded-lg shadow-xl p-4 max-w-xs animate-fade-in">
          <div className="text-xs text-red-500 mb-1">Error</div>
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={onClick}
        className={`
          relative w-16 h-16 rounded-full shadow-lg transition-all duration-300
          flex items-center justify-center
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          }
        `}
        title={isListening ? 'Stop listening (or say "stop")' : 'Start voice commands'}
      >
        {/* Ripple effect when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
            <span className="absolute inset-2 rounded-full bg-red-400 animate-ping opacity-20 animation-delay-75" />
          </>
        )}

        {/* Microphone icon */}
        <svg
          className={`w-7 h-7 text-white relative z-10 ${isListening ? 'animate-bounce' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          {isListening ? (
            // Stop icon
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1V7z"
              clipRule="evenodd"
            />
          ) : (
            // Microphone icon
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          )}
        </svg>
      </button>

      {/* Help tooltip */}
      {!isListening && (
        <div className="absolute -top-2 right-0 transform translate-x-2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Click or press V for voice commands
        </div>
      )}
    </div>
  );
};
