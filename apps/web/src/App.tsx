import { useState, useEffect, useRef } from 'react';
import type { App } from './types.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChatDiscovery } from '@/components/ChatDiscovery';
import { AuthModal } from '@/components/AuthModal';
import { SettingsModal } from '@/components/SettingsModal';
import { useAuth } from '@/context/AuthContext';

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
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Chat discovery state
  const [showChatDiscovery, setShowChatDiscovery] = useState(false);
  const [pendingInput, setPendingInput] = useState('');
  
  // Auth state
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Track if we've loaded from localStorage yet
  const hasLoadedFromStorage = useRef(false);
  
  // Ref to always have current savedApps value
  const savedAppsRef = useRef<App[]>([]);
  useEffect(() => {
    savedAppsRef.current = savedApps;
  }, [savedApps]);
  
  // Load apps from localStorage on mount
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
    hasLoadedFromStorage.current = true;
  }, []);

  // Save apps to localStorage whenever they change
  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    window.localStorage.setItem('neo.savedApps', JSON.stringify(savedApps));
  }, [savedApps]);

  // Fetch apps from server and merge with localStorage
  useEffect(() => {
    const fetchServerApps = async () => {
      try {
        const response = await fetch('/api/apps');
        const data = await response.json();
        if (data.success && data.apps?.length > 0) {
          setSavedApps(prev => {
            // Merge: server apps + local-only apps (avoid duplicates)
            const serverAppIds = new Set(data.apps.map((a: App) => a.id));
            const localOnlyApps = prev.filter(a => !serverAppIds.has(a.id));
            // Server apps come first, then any local-only apps
            const mergedApps = [...data.apps, ...localOnlyApps];
            return mergedApps;
          });
        }
      } catch (e) {
        console.error('Failed to fetch server apps:', e);
      }
    };
    
    // Fetch after localStorage is loaded
    if (hasLoadedFromStorage.current) {
      fetchServerApps();
    }
  }, []);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognitionAPI);
    
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        let transcript = '';
        for (let i = 0; i < results.length; i++) {
          transcript += results[i][0].transcript;
        }
        setInput(transcript);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleCreate = () => {
    if (!input.trim()) return;
    setError(null);
    setPendingInput(input.trim());
    setShowChatDiscovery(true);
  };

  const handleChatDiscoveryComplete = async (appConfig: Record<string, unknown>) => {
    setShowChatDiscovery(false);
    await handleCreateApp(appConfig);
  };

  const handleCreateApp = async (appConfig?: Record<string, unknown> | null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/apps/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.trim(),
          appConfig: appConfig,
        }),
      });

      const responseText = await response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }

      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create app');
      }

      if (!data.app || !data.app.id) {
        throw new Error('Invalid response from server');
      }

      const newApp: App = {
        id: String(data.app.id),
        name: String(data.app.name || 'Untitled App'),
        category: String(data.app.category || 'personal'),
        description: data.app.description ? String(data.app.description) : undefined,
        previewUrl: `/preview/${data.app.id}`,
        schema: data.app.schema || undefined,
        data: data.app.data || undefined,
        theme: data.app.theme || undefined,
      };

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

  const handleDeleteApp = (appId: string) => {
    setSavedApps((prev) => prev.filter((a) => a.id !== appId));
    if (app?.id === appId) {
      setApp(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        savedApps={savedApps}
        onDeleteApp={handleDeleteApp}
      />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-bold">Neo</span>
          </div>
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
            ) : isAuthenticated && user ? (
              <Button
                variant="ghost"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">
                  {user.name || user.email.split('@')[0]}
                </span>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettingsModal(true)}
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
                <Button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2" size="sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Chat Discovery */}
      <ChatDiscovery
        isOpen={showChatDiscovery}
        onClose={() => setShowChatDiscovery(false)}
        onComplete={handleChatDiscoveryComplete}
        initialInput={pendingInput}
        isLoading={loading}
      />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Sign in banner for guests with apps */}
        {!isAuthenticated && savedApps.length > 0 && (
          <Alert className="mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <AlertDescription className="flex items-center justify-between w-full">
              <div>
                <span className="font-medium">Your apps are stored locally.</span>{' '}
                <span className="text-muted-foreground">Sign in to sync across devices.</span>
              </div>
              <Button onClick={() => setShowAuthModal(true)} size="sm" variant="outline">
                Sign in
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Neo
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-1">
            Create fully functional apps in seconds with AI
          </p>
          <p className="text-sm text-muted-foreground">
            Just describe what you want (type or speak), and we'll build it for you
          </p>
        </div>

        {/* Create Card */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="app-input" className="text-base font-medium">
                What app would you like to create?
              </Label>
              {isSpeechSupported && (
                <Button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading}
                  variant={isListening ? 'destructive' : 'outline'}
                  size="sm"
                  className={isListening ? 'animate-pulse' : ''}
                >
                  {isListening ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 9a1 1 0 10-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
                      </svg>
                      Listening...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      Voice Input
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                id="app-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., A habit tracker app to track my daily routines and build better habits..."
                className="min-h-[140px] resize-none"
                disabled={loading || isListening}
              />
              {isListening && (
                <Badge variant="destructive" className="absolute top-2 right-2 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  Listening...
                </Badge>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleCreate}
              disabled={loading || !input.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? 'Creating your app...' : 'Create App'}
            </Button>
          </CardContent>
        </Card>

        {/* App Created Card */}
        {app && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your app is ready!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">App Name</Label>
                  <p className="font-medium">{app.name}</p>
                </div>
                {app.description && (
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <p className="text-sm">{app.description}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Category</Label>
                  <Badge variant="secondary" className="capitalize">{app.category}</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <a href={app.previewUrl}>Open App</a>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={`/studio/${app.id}`}>Edit in Studio</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Apps */}
        {savedApps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Apps</h2>
            <div className="grid gap-4">
              {savedApps.map((savedApp) => (
                <Card key={savedApp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{savedApp.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {savedApp.description || savedApp.category}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button asChild size="sm" variant="outline">
                          <a href={savedApp.previewUrl}>Open</a>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <a href={`/studio/${savedApp.id}`}>Edit</a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 max-w-5xl text-center text-sm text-muted-foreground">
          Neo - AI-Powered App Creation Platform
        </div>
      </footer>
    </div>
  );
}

export default App;
