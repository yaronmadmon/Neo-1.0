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
import { CommandInput } from './components/CommandInput.js';
import { PageTree } from './panels/PageTree.js';
import { ComponentInspector } from './panels/ComponentInspector.js';
import { AppInspector } from './panels/AppInspector.js';
import { DataInspector } from './panels/DataInspector.js';
import { WorkflowInspector } from './panels/WorkflowInspector.js';
import { PublishPanel } from './panels/PublishPanel.js';
import { IntegrationsPanel } from './panels/IntegrationsPanel.js';
import { AISuggestionsPanel } from './panels/AISuggestionsPanel.js';
import { SchemaRenderer } from '../components/SchemaRenderer.js';
import type { SelectionContext, ExecutionResult } from '../lib/intent';

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
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

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

  // Refresh app data from server
  const refreshAppData = useCallback(async () => {
    if (!appId) return;
    
    try {
      const response = await fetch(`/api/apps/${appId}`);
      const responseText = await response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }
      
      const data = JSON.parse(responseText);
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to refresh app');
      }

      if (data.app) {
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
      }
    } catch (err: any) {
      console.error('Error refreshing app data:', err);
    }
  }, [appId]);

  // Action dispatcher - handles flows/actions
  const dispatchAction = useCallback(async (
    action: {
      type: string;
      modelId?: string;
      model?: string;
      recordId?: string;
      data?: Record<string, unknown>;
      targetPageId?: string;
      message?: string;
      componentId?: string;
    },
    formData?: Record<string, unknown>
  ) => {
    if (!appId) return;

    try {
      console.log('🚀 Studio dispatching action:', action);
      const actionType = action.type?.toLowerCase();

      switch (actionType) {
        case 'create_record': {
          const modelId = action.modelId || action.model;
          if (!modelId) {
            setNotification({ message: 'modelId is required for create_record action', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
          }
          
          const dataToSend = { ...action.data, ...formData };
          console.log('📤 Creating record in model:', modelId, 'with data:', dataToSend);
          
          const response = await fetch(`/api/apps/${appId}/data/${modelId}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
          });
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to create record');
          }
          
          console.log('✅ Record created:', result);
          await refreshAppData();
          
          setNotification({ message: action.message || 'Record created successfully', type: 'success' });
          setTimeout(() => setNotification(null), 3000);
          break;
        }

        case 'update_record': {
          const modelId = action.modelId || action.model;
          if (!modelId || !action.recordId) {
            setNotification({ message: 'modelId and recordId are required for update_record action', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
          }
          
          const dataToSend = { ...action.data, ...formData };
          console.log('📤 Updating record:', action.recordId, 'in model:', modelId);
          
          const response = await fetch(`/api/apps/${appId}/data/${modelId}/${action.recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
          });
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to update record');
          }
          
          await refreshAppData();
          
          if (action.message) {
            setNotification({ message: action.message, type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          }
          break;
        }

        case 'delete_record': {
          const modelId = action.modelId || action.model;
          if (!modelId || !action.recordId) {
            setNotification({ message: 'modelId and recordId are required for delete_record action', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
          }
          
          console.log('🗑️ Deleting record:', action.recordId, 'from model:', modelId);
          
          const response = await fetch(`/api/apps/${appId}/data/${modelId}/${action.recordId}`, {
            method: 'DELETE',
          });
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to delete record');
          }
          
          await refreshAppData();
          
          if (action.message) {
            setNotification({ message: action.message, type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          }
          break;
        }

        case 'navigate': {
          if (action.targetPageId) {
            console.log('🧭 Navigate to page:', action.targetPageId);
            setPreviewPage(action.targetPageId);
          }
          break;
        }

        case 'show_notification': {
          if (action.message) {
            setNotification({ message: action.message, type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          }
          break;
        }

        case 'refresh_data':
        case 'refresh_list': {
          console.log('🔄 Refreshing app data');
          await refreshAppData();
          break;
        }

        default:
          console.warn('⚠️ Unknown action type:', action.type);
      }
    } catch (err: any) {
      console.error('❌ Error executing action:', err);
      setNotification({ message: err.message || 'Action failed', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [appId, refreshAppData]);

  // Handler for button clicks and form submits from SchemaRenderer
  const handleComponentAction = useCallback(async (
    componentId: string,
    eventType: 'button_click' | 'form_submit',
    formData?: Record<string, unknown>
  ) => {
    console.log('🎯 Studio action received:', { componentId, eventType, formData });
    console.log('🔍 Available flows:', app?.schema?.flows);
    
    if (!app?.schema?.flows) {
      console.warn('⚠️ No flows defined in app schema');
      return;
    }

    // Find flows that match this trigger
    const matchingFlows = app.schema.flows.filter((flow: any) => {
      const matches = flow.enabled !== false && 
        flow.trigger.type === eventType && 
        (!flow.trigger.componentId || flow.trigger.componentId === componentId);
      
      console.log(`🔄 Flow "${flow.id}" match check:`, {
        flowEnabled: flow.enabled !== false,
        triggerType: flow.trigger.type,
        expectedType: eventType,
        triggerComponentId: flow.trigger.componentId,
        actualComponentId: componentId,
        matches
      });
      
      return matches;
    });

    console.log('✅ Matching flows:', matchingFlows.length, matchingFlows);

    if (matchingFlows.length === 0) {
      console.warn('⚠️ No matching flows found for:', { componentId, eventType });
    }

    // Execute all matching flows
    for (const flow of matchingFlows as Array<{ id: string; name?: string; actions?: Array<{ type: string; modelId?: string; model?: string; recordId?: string; data?: Record<string, unknown>; targetPageId?: string; message?: string; componentId?: string }> }>) {
      console.log('▶️ Executing flow:', flow.id, flow.name);
      if (flow.actions && Array.isArray(flow.actions)) {
        for (const action of flow.actions) {
          await dispatchAction(action, formData);
        }
      }
    }
  }, [app, dispatchAction]);

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

  // Expand all nodes
  const handleExpandAll = useCallback((nodeIds: Set<string>) => {
    setExpandedNodes(nodeIds);
  }, []);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
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

  // Get shell and industry info for dynamic styling
  const extendedSchema = app?.schema as any;
  const shell = extendedSchema?.shell;
  const industry = extendedSchema?.industry as { id: string; name: string; dashboardType: string } | undefined;

  // Get industry icon
  const getIndustryIcon = () => {
    if (!industry?.id) return '📱';
    switch (industry.id) {
      case 'gym': return '🏋️';
      case 'salon': return '💇';
      case 'medical': return '🏥';
      case 'restaurant': return '🍽️';
      case 'ecommerce': return '🛒';
      case 'fitness-coach': return '💪';
      case 'tutor': return '📚';
      case 'plumber': case 'electrician': case 'contractor': return '🔧';
      case 'real-estate': return '🏠';
      default: return '📱';
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Neo Studio...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !app) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center bg-card p-8 rounded-lg border max-w-md">
          <span className="text-4xl mb-4 block">❌</span>
          <h2 className="text-xl font-bold text-destructive mb-2">Failed to Load</h2>
          <p className="text-muted-foreground mb-6">{error || 'App not found'}</p>
          <button
            onClick={handleBack}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
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
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
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
      {/* Notification */}
      {notification && (
        <div className={`fixed top-16 right-4 z-50 p-4 rounded-md border shadow-sm max-w-md ${
          notification.type === 'error' 
            ? 'bg-destructive text-destructive-foreground border-destructive' 
            : 'bg-background text-foreground border-border'
        }`}>
          {notification.message}
        </div>
      )}

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
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />
        </div>

        {/* Center - Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Command Input */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <CommandInput
              selection={selection ? {
                type: selection.type as SelectionContext['type'],
                id: selection.id,
                componentType: selection.type === 'component' ? (selection as any).componentId : undefined,
                name: selection.name,
              } : null}
              appId={app.id}
              isListening={voice.isListening}
              voiceTranscript={voice.transcript}
              onExecute={(result: ExecutionResult) => {
                if (result.success) {
                  setNotification({ message: result.message, type: 'success' });
                } else {
                  setNotification({ message: result.message, type: 'error' });
                }
                setTimeout(() => setNotification(null), 3000);
              }}
              onUndo={() => history.canUndo && history.undo()}
              onRedo={() => history.canRedo && history.redo()}
              placeholder="Type a command... (e.g., 'make the background blue', 'more rounded')"
            />
          </div>
          
          {/* Page tabs */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
            {app.schema.pages.map(page => {
              const pageType = (page as any).type || 'list';
              const pageIcon = pageType === 'dashboard' ? '📊' :
                               pageType === 'list' ? '📋' :
                               pageType === 'form' ? '📝' :
                               pageType === 'calendar' ? '📅' :
                               pageType === 'kanban' ? '📌' : '📄';
              return (
                <button
                  key={page.id}
                  onClick={() => setPreviewPage(page.id)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5
                    ${previewPage === page.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <span>{pageIcon}</span>
                  {page.name}
                </button>
              );
            })}
          </div>

          {/* Preview area */}
          <div className="flex-1 overflow-auto bg-muted/40 p-6">
            <div className="bg-card rounded-lg border overflow-hidden max-w-5xl mx-auto min-h-full">
              {/* Preview header - clean shadcn style */}
              <div className="border-b bg-muted/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <span className="text-lg">{getIndustryIcon()}</span>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{app.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {currentPageData?.name || 'Select a page'} • {currentPageData?.route || ''}
                      {industry && <span className="ml-2">• {industry.name}</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* App preview */}
              <div className="p-0">
                {previewComponents.length > 0 ? (
                  <SchemaRenderer
                    components={previewComponents}
                    data={app.data}
                    theme={app.theme}
                    onAction={handleComponentAction}
                  />
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
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
