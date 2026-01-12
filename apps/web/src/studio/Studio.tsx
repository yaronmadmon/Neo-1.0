/**
 * Neo Studio - Main Component
 * Visual shell for inspecting and viewing generated apps
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppData, Selection, InspectorPanel, StudioState } from './types.js';
import { useHistory } from './hooks/useHistory.js';
import { useVoice } from './hooks/useVoice.js';
import { Toolbar } from './components/Toolbar.js';
import { VoiceButton } from './components/VoiceButton.js';
import { PageTree } from './panels/PageTree.js';
import { ComponentInspector } from './panels/ComponentInspector.js';
import { AppInspector } from './panels/AppInspector.js';
import { DataInspector } from './panels/DataInspector.js';
import { WorkflowInspector } from './panels/WorkflowInspector.js';
import { PublishPanel } from './panels/PublishPanel.js';
import { IntegrationsPanel } from './panels/IntegrationsPanel.js';
import { AISuggestionsPanel } from './panels/AISuggestionsPanel.js';
import { SchemaRenderer } from '../components/SchemaRenderer.js';

interface StudioProps {
  appId: string;
}

export const Studio: React.FC<StudioProps> = ({ appId }) => {
  // Core state
  const [app, setApp] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [activePanel, setActivePanel] = useState<InspectorPanel>('pages');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [previewPage, setPreviewPage] = useState<string | null>(null);

  // History (undo/redo)
  const history = useHistory();

  // Voice commands
  const voice = useVoice({
    currentApp: app,
    currentSelection: selection,
    onSelect: handleSelect,
    onInspect: setActivePanel,
    onCommand: (command, transcript) => {
      console.log('Voice command:', command, transcript);
      // Handle undo/redo commands
      if (command === 'undo' && history.canUndo) {
        history.undo();
      } else if (command === 'redo' && history.canRedo) {
        history.redo();
      }
    },
  });

  // Fetch app data
  useEffect(() => {
    const fetchApp = async () => {
      if (!appId) {
        setError('No app ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/apps/${appId}`);
        const text = await response.text();
        
        if (!text) {
          throw new Error('Empty response from server');
        }

        const data = JSON.parse(text);
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to load app');
        }

        if (!data.app) {
          throw new Error('Invalid app data');
        }

        // Transform to AppData format
        const appData: AppData = {
          id: data.app.id,
          name: data.app.name,
          description: data.app.description,
          category: data.app.category,
          version: data.app.version || 1,
          createdAt: data.app.createdAt,
          updatedAt: data.app.updatedAt,
          schema: {
            pages: data.app.schema?.pages || [],
            components: data.app.schema?.components || [],
            dataModels: data.app.schema?.dataModels || [],
            flows: data.app.schema?.flows || [],
          },
          theme: data.app.theme || { colors: {}, typography: {}, spacing: {} },
          data: data.app.data || {},
        };

        setApp(appData);
        
        // Set initial preview page
        if (appData.schema.pages.length > 0) {
          setPreviewPage(appData.schema.pages[0].id);
          // Expand first page by default
          setExpandedNodes(new Set([appData.schema.pages[0].id]));
        }

        // Record in history
        history.push({
          type: 'navigate',
          description: `Opened ${appData.name}`,
          target: { type: 'page', id: 'studio', name: appData.name },
        });

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [appId]);

  // Selection handler
  function handleSelect(newSelection: Selection) {
    setSelection(newSelection);
    
    // Record in history
    if (app) {
      history.push({
        type: 'navigate',
        description: `Selected ${newSelection.type}: ${newSelection.id}`,
        target: newSelection,
        before: selection,
        after: newSelection,
      });
    }

    // Auto-switch panel based on selection
    if (newSelection.type === 'page' || newSelection.type === 'component') {
      setActivePanel('components');
    } else if (newSelection.type === 'dataModel') {
      setActivePanel('data');
    } else if (newSelection.type === 'flow') {
      setActivePanel('workflows');
    }
  }

  // Toggle node expansion
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Navigate back
  const handleBack = useCallback(() => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/' } }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (history.canUndo) history.undo();
      }
      // Ctrl+Shift+Z or Ctrl+Y for redo
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        if (history.canRedo) history.redo();
      }
      // V for voice
      if (e.key === 'v' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        voice.toggleListening();
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelection(null);
      }
      // Number keys for panel switching
      if (e.key >= '1' && e.key <= '5' && !e.ctrlKey) {
        const panels: InspectorPanel[] = ['pages', 'components', 'app', 'data', 'workflows'];
        const index = parseInt(e.key) - 1;
        if (panels[index]) {
          setActivePanel(panels[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, voice]);

  // Get current preview page data
  const currentPageData = useMemo(() => {
    if (!app || !previewPage) return null;
    return app.schema.pages.find(p => p.id === previewPage);
  }, [app, previewPage]);

  // Transform components for SchemaRenderer
  const previewComponents = useMemo(() => {
    if (!currentPageData) return [];
    return currentPageData.components || [];
  }, [currentPageData]);

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Neo Studio...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !app) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <span className="text-4xl mb-4 block">❌</span>
          <h2 className="text-xl font-bold text-red-600 mb-2">Failed to Load</h2>
          <p className="text-gray-700 mb-6">{error || 'App not found'}</p>
          <button
            onClick={handleBack}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            ← Back to Neo
          </button>
        </div>
      </div>
    );
  }

  // Render active panel
  const renderPanel = () => {
    switch (activePanel) {
      case 'pages':
        return (
          <PageTree
            pages={app.schema.pages}
            selection={selection}
            expandedNodes={expandedNodes}
            onSelect={handleSelect}
            onToggleExpand={handleToggleExpand}
          />
        );
      case 'components':
        return (
          <ComponentInspector
            pages={app.schema.pages}
            selection={selection}
          />
        );
      case 'app':
        return <AppInspector app={app} />;
      case 'data':
        return (
          <DataInspector
            dataModels={app.schema.dataModels}
            data={app.data}
            selection={selection}
            onSelect={handleSelect}
          />
        );
      case 'workflows':
        return (
          <WorkflowInspector
            flows={app.schema.flows}
            selection={selection}
            onSelect={handleSelect}
          />
        );
      case 'publish':
        return <PublishPanel appId={app.id} />;
      case 'integrations':
        return <IntegrationsPanel appId={app.id} />;
      case 'ai-suggestions':
        return <AISuggestionsPanel appId={app.id} app={app} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        app={app}
        activePanel={activePanel}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undoDescription={history.getUndoDescription()}
        redoDescription={history.getRedoDescription()}
        onUndo={history.undo}
        onRedo={history.redo}
        onPanelChange={setActivePanel}
        onBack={handleBack}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Page Tree (always visible) */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <PageTree
            pages={app.schema.pages}
            selection={selection}
            expandedNodes={expandedNodes}
            onSelect={handleSelect}
            onToggleExpand={handleToggleExpand}
          />
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page tabs */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
            {app.schema.pages.map(page => (
              <button
                key={page.id}
                onClick={() => setPreviewPage(page.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${previewPage === page.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                {page.name}
              </button>
            ))}
          </div>

          {/* Preview area */}
          <div className="flex-1 overflow-auto bg-gray-50 p-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-5xl mx-auto min-h-full">
              {/* Preview header */}
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4 text-white">
                <h2 className="text-lg font-semibold">{app.name}</h2>
                <p className="text-sm text-white/70">
                  {currentPageData?.name || 'Select a page'} • {currentPageData?.route || ''}
                </p>
              </div>

              {/* App preview */}
              <div className="p-0">
                {previewComponents.length > 0 ? (
                  <SchemaRenderer
                    components={previewComponents}
                    data={app.data}
                    theme={app.theme}
                  />
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <span className="text-4xl">📄</span>
                    <p className="mt-2">This page has no components</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar - Inspector */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
          {renderPanel()}
        </div>
      </div>

      {/* Voice button */}
      <VoiceButton
        isListening={voice.isListening}
        isSupported={voice.isSupported}
        transcript={voice.transcript}
        error={voice.error}
        onClick={voice.toggleListening}
      />

      {/* Keyboard shortcuts modal hint */}
      <div className="fixed bottom-6 left-6 text-xs text-gray-400 hidden lg:block">
        Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">?</kbd> for keyboard shortcuts
      </div>
    </div>
  );
};

export default Studio;
