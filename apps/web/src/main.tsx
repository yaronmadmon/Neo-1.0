import React from 'react';
import ReactDOM from 'react-dom/client';
import { default as AppComponent } from './App.js';
import Preview from './Preview.js';
import { Studio } from './studio/index.js';
import { AuthProvider } from './context/AuthContext.js';
import './index.css';

// Error Fallback Component
function ErrorFallback({ error, resetError }: { error: Error | null; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-lg">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
        <p className="text-gray-700 mb-4">
          The app encountered an unexpected error. This might be due to an issue with the generated app schema.
        </p>
        {error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              View error details
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-red-600 overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/' } }));
              resetError();
            }}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Neo
          </button>
        </div>
      </div>
    </div>
  );
}

// Error Boundary Class Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }
    return this.props.children;
  }
}

// Simple routing without react-router-dom
function Router() {
  const [path, setPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Listen for navigation events
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string }>;
      setPath(customEvent.detail.path);
    };
    
    window.addEventListener('navigate', handleNavigate);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('navigate', handleNavigate);
    };
  }, []);

  // Studio route: /studio/:id
  if (path.startsWith('/studio/')) {
    const id = path.split('/studio/')[1];
    return <Studio appId={id} />;
  }

  // Preview route: /preview/:id
  if (path.startsWith('/preview/')) {
    const id = path.split('/preview/')[1];
    return <Preview id={id} />;
  }

  return <AppComponent />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
    </AuthProvider>
  </React.StrictMode>
);
