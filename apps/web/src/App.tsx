import { useState, useEffect, useRef } from 'react';
import type { App } from './types.js';
import { DiscoveryDialog, type DiscoveryQuestion } from './components/DiscoveryDialog.js';

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [app, setApp] = useState<App | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Discovery state
  const [discoveryQuestions, setDiscoveryQuestions] = useState<DiscoveryQuestion[]>([]);
  const [discoveredInfo, setDiscoveredInfo] = useState<Record<string, unknown> | null>(null);
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Initialize speech recognition on component mount
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please enable microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSpeechSupported(false);
      console.warn('Speech recognition not supported in this browser');
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (!isSpeechSupported || !recognitionRef.current) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      setError(null);
      setIsListening(true);
      recognitionRef.current.start();
    } catch (error: any) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start voice input. Please try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Discovery flow: Check if clarification is needed
  const handleDiscovery = async (userInput: string, existingInfo?: Record<string, unknown>, answers?: Record<string, unknown>) => {
    setDiscoveryLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/apps/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: userInput.trim(),
          discoveredInfo: existingInfo,
          answers: answers,
        }),
      });

      // Get response as text first to handle empty responses
      const responseText = await response.text();
      
      // Check for empty response before parsing
      if (!responseText || responseText.trim().length === 0) {
        console.error('=== FRONTEND ERROR: Empty response from discover endpoint ===');
        console.error('Response status:', response.status);
        console.error('Response ok:', response.ok);
        throw new Error('Empty response from discovery endpoint. The server may have crashed or failed to send a response.');
      }

      // Parse JSON from text
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('=== FRONTEND ERROR: Failed to parse JSON from discover endpoint ===');
        console.error('Parse error:', parseError);
        console.error('Response text:', responseText);
        console.error('Response status:', response.status);
        throw new Error('Invalid JSON response from discovery endpoint: ' + String(parseError));
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Discovery request failed');
      }
      
      if (data.needsClarification && data.questions && data.questions.length > 0) {
        // Show questions
        setDiscoveryQuestions(data.questions);
        setDiscoveredInfo(data.discoveredInfo || null);
        setIsDiscoveryMode(true);
        setDiscoveryLoading(false);
        return { needsMoreInfo: true, discoveredInfo: data.discoveredInfo };
      } else {
        // No questions needed, proceed to create
        setDiscoveryLoading(false);
        return { needsMoreInfo: false, discoveredInfo: data.discoveredInfo };
      }
    } catch (err: any) {
      setDiscoveryLoading(false);
      setError(err.message || 'Discovery failed');
      // On discovery error, proceed to create anyway
      return { needsMoreInfo: false, discoveredInfo: null };
    }
  };

  // Handle discovery answers
  const handleDiscoveryAnswer = async (answers: Record<string, unknown>) => {
    if (!input.trim() || !discoveredInfo) {
      setError('Invalid discovery state');
      setIsDiscoveryMode(false);
      return;
    }

    // Send answers and get next set of questions or proceed
    const result = await handleDiscovery(input.trim(), discoveredInfo, answers);
    
    if (!result.needsMoreInfo) {
      // No more questions, create the app
      setIsDiscoveryMode(false);
      await handleCreateApp(result.discoveredInfo || discoveredInfo);
    }
    // If more questions, DiscoveryDialog will update automatically via state
  };

  // Handle skip discovery
  const handleSkipDiscovery = async () => {
    setIsDiscoveryMode(false);
    setDiscoveryQuestions([]);
    // Proceed to create with whatever we have
    await handleCreateApp(discoveredInfo);
  };

  // Main create handler - checks discovery first
  const handleCreate = async () => {
    if (!input.trim()) {
      setError('Please enter a description of the app you want to create');
      return;
    }

    // First, check if discovery is needed
    const discoveryResult = await handleDiscovery(input.trim());
    
    if (!discoveryResult.needsMoreInfo) {
      // No questions, create directly
      await handleCreateApp(discoveryResult.discoveredInfo || undefined);
    }
    // If questions exist, DiscoveryDialog will be shown and handleCreateApp will be called after answers
  };

  // Create app (with optional discovered info)
  const handleCreateApp = async (info?: Record<string, unknown> | null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/apps/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input.trim(),
          discoveredInfo: info,
        }),
      });

      // Get response as text first (can only read once!)
      const responseText = await response.text();
      
      console.log('=== FRONTEND DEBUG: Raw response ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response text length:', responseText.length);
      console.log('Response text:', responseText);

      // Check for empty response before parsing
      if (!responseText || responseText.trim().length === 0) {
        console.error('=== FRONTEND ERROR: Empty response from server ===');
        console.error('Response status:', response.status);
        console.error('Response ok:', response.ok);
        throw new Error('Empty response from server. The server may have crashed or failed to send a response.');
      }

      // Parse JSON from text
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('=== FRONTEND ERROR: Failed to parse JSON ===');
        console.error('Parse error:', parseError);
        console.error('Response text:', responseText);
        console.error('Response text length:', responseText.length);
        console.error('Response status:', response.status);
        throw new Error('Invalid JSON response from server: ' + String(parseError));
      }

      // Check for errors AFTER parsing
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create app');
      }

      // Debug: Log the response to see structure
      console.log('=== FRONTEND DEBUG: Parsed response ===');
      console.log('Response object:', data);
      console.log('Has success:', 'success' in data);
      console.log('Has app:', 'app' in data);
      console.log('App value:', data.app);
      console.log('App type:', typeof data.app);
      console.log('App is object:', typeof data.app === 'object' && !Array.isArray(data.app));
      console.log('App keys:', data.app && typeof data.app === 'object' ? Object.keys(data.app) : 'NOT AN OBJECT');
      console.log('App ID:', data.app?.id);
      console.log('Full response JSON:', JSON.stringify(data, null, 2));

      // Ensure app object has required fields
      if (!data || typeof data !== 'object') {
        console.error('=== FRONTEND ERROR: Invalid response structure ===');
        console.error('Data:', data);
        throw new Error('Invalid response format from server');
      }

      if (!data.app || typeof data.app !== 'object' || Array.isArray(data.app)) {
        console.error('=== FRONTEND ERROR: No valid app object ===');
        console.error('App value:', data.app);
        console.error('App type:', typeof data.app);
        console.error('Is array:', Array.isArray(data.app));
        console.error('Full response:', JSON.stringify(data, null, 2));
        throw new Error('No app object in response. Server may have failed to create the app. Response: ' + JSON.stringify(data, null, 2));
      }

      if (!data.app.id || data.app.id === 'undefined' || data.app.id === 'null' || data.app.id === '') {
        console.error('=== FRONTEND ERROR: App missing valid ID ===');
        console.error('App object:', data.app);
        console.error('App ID value:', data.app.id);
        console.error('App ID type:', typeof data.app.id);
        console.error('Full response:', JSON.stringify(data, null, 2));
        throw new Error('App is missing ID field. This is a server error. Response: ' + JSON.stringify(data, null, 2));
      }

      const newApp: App = {
        id: String(data.app.id), // Ensure it's a string
        name: String(data.app.name || 'Untitled App'),
        category: String(data.app.category || 'personal'),
        description: data.app.description ? String(data.app.description) : undefined,
        // Use frontend route for preview (not backend API route)
        previewUrl: `/preview/${data.app.id}`,
      };

      console.log('=== FRONTEND DEBUG: Creating app state ===');
      console.log('New app object:', newApp);
      console.log('App ID:', newApp.id);
      console.log('App name:', newApp.name);
      console.log('App category:', newApp.category);
      setApp(newApp);
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Discovery Dialog */}
      {isDiscoveryMode && (
        <DiscoveryDialog
          questions={discoveryQuestions}
          onAnswer={handleDiscoveryAnswer}
          onSkip={handleSkipDiscovery}
          onCancel={() => {
            setIsDiscoveryMode(false);
            setDiscoveryQuestions([]);
            setDiscoveredInfo(null);
          }}
          isLoading={discoveryLoading || loading}
        />
      )}

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Neo
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Create fully functional apps in seconds with AI
          </p>
          <p className="text-gray-500">
            Just describe what you want (type or speak), and we'll build it for you
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="app-input"
                className="block text-sm font-medium text-gray-700"
              >
                What app would you like to create?
              </label>
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 9a1 1 0 10-2 0v2a1 1 0 102 0V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Listening...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Voice Input
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                id="app-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., A habit tracker app to track my daily routines and build better habits... Or click the microphone button to speak!"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={6}
                disabled={loading || isListening}
              />
              {isListening && (
                <div className="absolute top-2 right-2 flex items-center gap-2 text-red-500">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Listening...</span>
                </div>
              )}
            </div>
            {!isSpeechSupported && (
              <p className="mt-2 text-xs text-gray-500">
                💡 Voice input is available in Chrome, Edge, and Safari. Type your request above or use a supported browser.
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !input.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Creating your app...' : 'Create App'}
          </button>
        </div>

        {app && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ✨ Your app is ready!
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">App Name</h3>
                <p className="text-gray-900">{app.name}</p>
              </div>
              {app.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700">Description</h3>
                  <p className="text-gray-600">{app.description}</p>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-700">Category</h3>
                <p className="text-gray-600 capitalize">{app.category}</p>
              </div>
              {app.id ? (
                <div className="pt-4 flex gap-4">
                  <a
                    href={app.previewUrl || `/preview/${app.id}`}
                    className="inline-block bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, '', app.previewUrl || `/preview/${app.id}`);
                      window.dispatchEvent(new CustomEvent('navigate', { detail: { path: app.previewUrl || `/preview/${app.id}` } }));
                    }}
                  >
                    View App Preview
                  </a>
                  <a
                    href={`/studio/${app.id}`}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, '', `/studio/${app.id}`);
                      window.dispatchEvent(new CustomEvent('navigate', { detail: { path: `/studio/${app.id}` } }));
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Open in Studio
                  </a>
                </div>
              ) : (
                <div className="pt-4 text-red-600">
                  Error: App ID is missing. Please try creating the app again.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Neo - AI-Powered App Creation Platform</p>
        </div>
      </div>
    </div>
  );
}

export default App;
