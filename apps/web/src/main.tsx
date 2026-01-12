import React from 'react';
import ReactDOM from 'react-dom/client';
import { default as AppComponent } from './App.js';
import Preview from './Preview.js';
import { Studio } from './studio/index.js';
import './index.css';

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
    <Router />
  </React.StrictMode>
);
