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
  const [savedApps, setSavedApps] = useState<App[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Discovery state (mandatory flow)
  const [discoveryQuestions, setDiscoveryQuestions] = useState<DiscoveryQuestion[]>([]);
  const [discoveryState, setDiscoveryState] = useState<{ currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> } | null>(null);
  const [appConfig, setAppConfig] = useState<Record<string, unknown> | null>(null);
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [isHomePlaceholder, setIsHomePlaceholder] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem('neo.savedApps');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedApps(parsed as App[]);
        }
      } catch {
        // Ignore invalid storage data
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('neo.savedApps', JSON.stringify(savedApps));
  }, [savedApps]);

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

  // Mandatory discovery flow: Always runs
  const handleDiscovery = async (userInput: string, state?: { currentStep: number; context?: 'business' | 'home'; answers: Record<string, unknown> }, answers?: Record<string, unknown>) => {
    setDiscoveryLoading(true);
    setError(null);
    setIsHomePlaceholder(false);

    try {
      console.log('Starting discovery with input:', userInput.trim(), 'state:', state, 'answers:', answers);
      const response = await fetch('/api/apps/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: userInput.trim(),
          state: state,
          answers: answers,
        }),
      });
      
      console.log('Discovery response status:', response.status, 'ok:', response.ok);

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
      
      // Handle Home placeholder
      if (data.isHomePlaceholder) {
        setIsHomePlaceholder(true);
        setDiscoveryState(data.state || null);
        setDiscoveryQuestions([]);
        setIsDiscoveryMode(true);
        setDiscoveryLoading(false);
        return { needsMoreInfo: true, isHomePlaceholder: true, state: data.state };
      }
      
      // If complete, return AppConfig
      if (!data.needsClarification && data.appConfig) {
        setAppConfig(data.appConfig);
        setDiscoveryLoading(false);
        return { needsMoreInfo: false, appConfig: data.appConfig, state: data.state || null };
      }
      
      // More questions needed
      if (data.needsClarification && data.questions && data.questions.length > 0) {
        setDiscoveryQuestions(data.questions);
        setDiscoveryState(data.state);
        setIsDiscoveryMode(true);
        setDiscoveryLoading(false);
        return { needsMoreInfo: true, state: data.state };
      }
      
      // Should not reach here, but handle gracefully
      setDiscoveryLoading(false);
      return { needsMoreInfo: false, appConfig: data.appConfig, state: data.state };
    } catch (err: any) {
      setDiscoveryLoading(false);
      setError(err.message || 'Discovery failed');
      throw err; // Re-throw - discovery is mandatory
    }
  };

  // Handle discovery answers (mandatory flow - no skip)
  const handleDiscoveryAnswer = async (answers: Record<string, unknown>) => {
    if (!input.trim()) {
      setError('Please enter a description of the app you want to create');
      setIsDiscoveryMode(false);
      return;
    }
    
    if (!discoveryState) {
      console.error('Discovery state is null when trying to submit answers');
      setError('Discovery session expired. Please start over.');
      setIsDiscoveryMode(false);
      setDiscoveryQuestions([]);
      return;
    }

    try {
      // Send answers and get next set of questions or proceed
      const result = await handleDiscovery(input.trim(), discoveryState, answers);
      
      if (result.isHomePlaceholder) {
        // Home discovery placeholder - show message, don't create app
        setIsHomePlaceholder(true);
        setDiscoveryState(result.state);
        return;
      }
      
      if (!result.needsMoreInfo && result.appConfig) {
        // Discovery complete, create the app
        setIsDiscoveryMode(false);
        await handleCreateApp(result.appConfig);
      }
      // If more questions, DiscoveryDialog will update automatically via state
    } catch (err: any) {
      setError(err.message || 'Discovery failed');
      setIsDiscoveryMode(false);
    }
  };

  // Main create handler - MANDATORY discovery always runs first
  const handleCreate = async () => {
    if (!input.trim()) {
      setError('Please enter a description of the app you want to create');
      return;
    }

    // Clear any previous errors and reset discovery state
    setError(null);
    setDiscoveryState(null);
    setIsDiscoveryMode(false);

    try {
      // MANDATORY: Discovery always runs first
      const discoveryResult = await handleDiscovery(input.trim());
      
      if (discoveryResult.isHomePlaceholder) {
        // Home discovery placeholder - show message
        setIsHomePlaceholder(true);
        return;
      }
      
      if (!discoveryResult.needsMoreInfo && discoveryResult.appConfig) {
        // Discovery complete, create app
        await handleCreateApp(discoveryResult.appConfig);
      }
      // If needsMoreInfo is true, DiscoveryDialog will be shown and handleCreateApp will be called after answers
    } catch (err: any) {
      setError(err.message || 'Discovery failed');
    }
  };

  // Create app (with AppConfig from discovery)
  const handleCreateApp = async (appConfig?: Record<string, unknown> | null) => {
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
          appConfig: appConfig,
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
      setSavedApps((prev) => {
        const next = prev.filter((item) => item.id !== newApp.id);
        return [newApp, ...next];
      });
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f5f3ff,transparent_50%),radial-gradient(circle_at_top_right,#e0f2fe,transparent_45%),linear-gradient(180deg,#ffffff,rgba(238,242,255,0.7))]">
      {/* Discovery Dialog - Mandatory (no skip) */}
      {isDiscoveryMode && (
        <>
          {isHomePlaceholder ? (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Home Discovery Coming Next</h2>
                <p className="text-gray-600 mb-6">
                  Home discovery questions are currently being developed. Please check back soon!
                </p>
                <button
                  onClick={() => {
                    setIsDiscoveryMode(false);
                    setIsHomePlaceholder(false);
                    setDiscoveryState(null);
                    setDiscoveryQuestions([]);
                  }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <DiscoveryDialog
              questions={discoveryQuestions}
              onAnswer={handleDiscoveryAnswer}
              onCancel={() => {
                setIsDiscoveryMode(false);
                setDiscoveryQuestions([]);
                setDiscoveryState(null);
                setAppConfig(null);
              }}
              isLoading={discoveryLoading || loading}
            />
          )}
        </>
      )}

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-4">
            Neo
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-2">
            Create fully functional apps in seconds with AI
          </p>
          <p className="text-gray-500">
            Just describe what you want (type or speak), and we'll build it for you
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-[0_20px_60px_-25px_rgba(79,70,229,0.45)] border border-white/60 p-8 mb-10">
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
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
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
                Voice input is available in Chrome, Edge, and Safari. Type your request above or use a supported browser.
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
            className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-200"
          >
            {loading ? 'Creating your app...' : 'Create App'}
          </button>
        </div>

        {app && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your app is ready!
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
                    className="inline-block bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
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
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-colors"
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

        {savedApps.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.5)] p-8 mb-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your apps</h2>
                <p className="text-sm text-gray-500">{savedApps.length} saved</p>
              </div>
              <div className="w-full md:w-80">
                <label className="sr-only" htmlFor="global-search">
                  Search apps
                </label>
                <div className="relative">
                  <input
                    id="global-search"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search your apps"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-gray-400">Global</span>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {savedApps
                .filter((saved) => {
                  const q = globalSearch.trim().toLowerCase();
                  if (!q) return true;
                  const name = saved.name?.toLowerCase() || '';
                  const desc = saved.description?.toLowerCase() || '';
                  const category = saved.category?.toLowerCase() || '';
                  return name.includes(q) || desc.includes(q) || category.includes(q);
                })
                .map((saved) => (
                <div key={saved.id} className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{saved.name}</h3>
                      {saved.description && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{saved.description}</p>
                      )}
                      <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">{saved.category}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      Ready
                    </span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <a
                      href={saved.previewUrl || `/preview/${saved.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        window.history.pushState({}, '', saved.previewUrl || `/preview/${saved.id}`);
                        window.dispatchEvent(new CustomEvent('navigate', { detail: { path: saved.previewUrl || `/preview/${saved.id}` } }));
                      }}
                    >
                      Preview
                    </a>
                    <a
                      href={`/studio/${saved.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        window.history.pushState({}, '', `/studio/${saved.id}`);
                        window.dispatchEvent(new CustomEvent('navigate', { detail: { path: `/studio/${saved.id}` } }));
                      }}
                    >
                      Open Studio
                    </a>
                  </div>
                </div>
              ))}
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
