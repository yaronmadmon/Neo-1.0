/**
 * Preview Page Component
 * Fetches app data and renders it using SchemaRenderer
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { SchemaRenderer } from './components/SchemaRenderer.js';
import type { App } from './types.js';

interface PreviewProps {
  id?: string;
}

// Clean text to remove system prompts and AI artifacts
function cleanText(text: string | undefined | null): string {
  if (!text) return '';
  
  let cleaned = String(text)
    .replace(/User Input:\s*/gi, '')
    .replace(/Context:\s*\{[^}]*\}/gi, '')
    .replace(/Analyze the intent and return.*$/i, '')
    .replace(/Return the JSON response.*$/i, '')
    .replace(/as specified in the system prompt.*$/i, '')
    .replace(/Build me app.*$/i, '')
    .replace(/Create.*app.*$/i, '')
    .trim();
  
  // If it's mostly system prompt text, return empty
  if (cleaned.length < 10 || cleaned.toLowerCase().includes('system prompt') || cleaned.toLowerCase().includes('json response')) {
    return '';
  }
  
  return cleaned.length > 200 ? cleaned.substring(0, 197) + '...' : cleaned;
}

export default function Preview({ id: propId }: PreviewProps) {
  // Get ID from props or URL
  const getIdFromUrl = () => {
    if (propId) return propId;
    const match = window.location.pathname.match(/\/preview\/([^/]+)/);
    return match ? match[1] : null;
  };

  const [id, setId] = useState<string | null>(propId || getIdFromUrl());
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('navigate', { detail: { path } }));
  };

  // Refresh app data from server
  const refreshAppData = useCallback(async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/apps/${id}`);
      const responseText = await response.text();
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }
      
      const data = JSON.parse(responseText);
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to refresh app');
      }

      if (data.app) {
        setApp(data.app);
      }
    } catch (err: any) {
      console.error('Error refreshing app data:', err);
    }
  }, [id]);

  // Action dispatcher - handles flows/actions
  const dispatchAction = useCallback(async (
    action: {
      type: string;
      modelId?: string;
      model?: string; // AI sometimes generates 'model' instead of 'modelId'
      recordId?: string;
      data?: Record<string, unknown>;
      targetPageId?: string;
      message?: string;
      componentId?: string; // For refresh_list
    },
    formData?: Record<string, unknown>
  ) => {
    if (!id) return;

    try {
      console.log('🚀 Dispatching action:', action);
      
      // Normalize action type to lowercase for consistent matching
      const actionType = action.type?.toLowerCase();

      switch (actionType) {
        case 'create_record': {
          // Handle both modelId and model (AI generates both formats)
          const modelId = action.modelId || action.model;
          if (!modelId) {
            setNotification({ message: 'modelId is required for create_record action', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
          }
          
          const dataToSend = { ...action.data, ...formData };
          console.log('📤 Creating record in model:', modelId, 'with data:', dataToSend);
          
          const response = await fetch(`/api/apps/${id}/data/${modelId}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
          });
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to create record');
          }
          
          console.log('✅ Record created:', result);
          
          // Refresh app data
          await refreshAppData();
          
          if (action.message) {
            setNotification({ message: action.message, type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          } else {
            setNotification({ message: 'Record created successfully', type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          }
          break;
        }

        case 'update_record': {
          // Handle both modelId and model
          const modelId = action.modelId || action.model;
          if (!modelId || !action.recordId) {
            setNotification({ message: 'modelId and recordId are required for update_record action', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
          }
          
          const dataToSend = { ...action.data, ...formData };
          console.log('📤 Updating record:', action.recordId, 'in model:', modelId);
          
          const response = await fetch(`/api/apps/${id}/data/${modelId}/${action.recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
          });
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to update record');
          }
          
          // Refresh app data
          await refreshAppData();
          
          if (action.message) {
            setNotification({ message: action.message, type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          }
          break;
        }

        case 'delete_record': {
          // Handle both modelId and model
          const modelId = action.modelId || action.model;
          if (!modelId || !action.recordId) {
            setNotification({ message: 'modelId and recordId are required for delete_record action', type: 'error' });
            setTimeout(() => setNotification(null), 3000);
            return;
          }
          
          console.log('🗑️ Deleting record:', action.recordId, 'from model:', modelId);
          
          const response = await fetch(`/api/apps/${id}/data/${modelId}/${action.recordId}`, {
            method: 'DELETE',
          });
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || result.error || 'Failed to delete record');
          }
          
          // Refresh app data
          await refreshAppData();
          
          if (action.message) {
            setNotification({ message: action.message, type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          }
          break;
        }

        case 'navigate': {
          if (action.targetPageId) {
            // For now, just log - page navigation can be enhanced later
            console.log('🧭 Navigate to page:', action.targetPageId);
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

        case 'refresh_data': {
          console.log('🔄 Refreshing app data');
          await refreshAppData();
          break;
        }

        case 'refresh_list': {
          console.log('🔄 Refreshing list', action.componentId ? `for component: ${action.componentId}` : '');
          await refreshAppData();
          break;
        }

        default:
          console.warn('⚠️ Unknown action type:', action.type, '(normalized:', actionType, ')');
      }
    } catch (err: any) {
      console.error('❌ Error executing action:', err);
      setNotification({ message: err.message || 'Action failed', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [id, refreshAppData]);

  // Handler for button clicks and form submits
  const handleComponentAction = useCallback(async (
    componentId: string,
    eventType: 'button_click' | 'form_submit',
    formData?: Record<string, unknown>
  ) => {
    console.log('🎯 Action received:', { componentId, eventType, formData });
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

  useEffect(() => {
    const currentId = propId || getIdFromUrl();
    if (currentId) {
      setId(currentId);
    }
  }, [propId]);

  useEffect(() => {
    if (!id) {
      setError('Invalid app ID');
      setLoading(false);
      return;
    }

    const fetchApp = async () => {
      try {
        const response = await fetch(`/api/apps/${id}`);
        
        // Get response as text first to handle empty responses
        const responseText = await response.text();
        
        if (!responseText || responseText.trim().length === 0) {
          throw new Error('Empty response from server');
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', responseText);
          throw new Error(`Invalid JSON response: ${parseError}`);
        }
        
        if (!response.ok) {
          throw new Error(data.message || data.error || 'App not found');
        }

        if (!data.app) {
          throw new Error('Invalid app data: app object missing');
        }

        // Debug: Log app schema structure
        console.log('📦 App data received:', data.app);
        console.log('📄 Schema pages:', data.app.schema?.pages);
        console.log('🧩 First page components:', data.app.schema?.pages?.[0]?.components);
        console.log('📊 Data models:', data.app.schema?.dataModels);
        console.log('🔄 Flows:', data.app.schema?.flows);
        console.log('💾 App data structure:', { 
          hasData: !!data.app.data, 
          dataType: typeof data.app.data,
          dataKeys: data.app.data && typeof data.app.data === 'object' ? Object.keys(data.app.data) : [],
          dataContent: data.app.data,
          dataIsArray: Array.isArray(data.app.data)
        });
        
        // Log flows specifically for debugging
        if (data.app.schema?.flows && data.app.schema.flows.length > 0) {
          console.log('✅ Flows found:', data.app.schema.flows.length);
          data.app.schema.flows.forEach((flow: any, i: number) => {
            console.log(`  Flow ${i + 1}:`, {
              id: flow.id,
              name: flow.name,
              enabled: flow.enabled,
              trigger: flow.trigger,
              actionsCount: flow.actions?.length
            });
          });
        } else {
          console.warn('⚠️ No flows in schema - forms and buttons will not trigger actions');
        }

        setApp(data.app);
      } catch (err: any) {
        setError(err.message || 'Failed to load app');
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [id]);

  useEffect(() => {
    if (app?.schema?.pages?.length) {
      setCurrentPageId(app.schema.pages[0].id);
    }
  }, [app?.schema?.pages]);

  useEffect(() => {
    if (filteredPages.length === 0) {
      return;
    }
    const hasCurrent = filteredPages.some((page) => page.id === currentPageId);
    if (!hasCurrent) {
      setCurrentPageId(filteredPages[0].id);
    }
  }, [filteredPages, currentPageId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading app preview...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error || 'App not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            ← Back to Neo
          </button>
        </div>
      </div>
    );
  }

  const pages = Array.isArray(app.schema?.pages) ? app.schema.pages : [];
  const normalizedQuery = globalSearch.trim().toLowerCase();

  const valueMatchesQuery = (value: unknown, depth: number = 0): boolean => {
    if (!normalizedQuery) return true;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value).toLowerCase().includes(normalizedQuery);
    }
    if (Array.isArray(value)) {
      return value.some((entry) => valueMatchesQuery(entry, depth + 1));
    }
    if (typeof value === 'object' && depth < 3) {
      return Object.values(value as Record<string, unknown>).some((entry) =>
        valueMatchesQuery(entry, depth + 1)
      );
    }
    return false;
  };

  const filterComponentsByQuery = (components: Array<any>): Array<any> => {
    if (!normalizedQuery) return components;
    return components
      .map((component) => {
        const children = Array.isArray(component.children)
          ? filterComponentsByQuery(component.children)
          : undefined;
        const propsMatch = valueMatchesQuery(component.props);
        const hasMatchingChildren = Array.isArray(children) && children.length > 0;
        if (propsMatch || hasMatchingChildren) {
          return { ...component, children };
        }
        return null;
      })
      .filter((component) => component !== null);
  };

  const filterDataByQuery = (data: Record<string, unknown>): Record<string, unknown> => {
    if (!normalizedQuery) return data;
    const filtered: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        filtered[key] = value.filter((row) => valueMatchesQuery(row));
      } else if (valueMatchesQuery(value)) {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  const filteredPages = useMemo(() => {
    if (!normalizedQuery) return pages;
    return pages
      .map((page) => {
        const components = Array.isArray(page.components) ? page.components : [];
        const filteredComponents = filterComponentsByQuery(components);
        const pageMatches = valueMatchesQuery(page.name);
        const hasComponents = filteredComponents.length > 0;
        return pageMatches || hasComponents
          ? { ...page, components: filteredComponents }
          : null;
      })
      .filter((page) => page !== null);
  }, [normalizedQuery, pages]);

  const currentPage =
    filteredPages.find((page) => page.id === currentPageId) || filteredPages[0];
  
  // Transform components to ComponentInstance format with proper typing
  const transformComponent = (comp: any): {
    id: string;
    componentId: string;
    props?: Record<string, unknown>;
    children?: Array<any>;
    styles?: Record<string, unknown>;
  } => ({
    id: String(comp.id || ''),
    componentId: String(comp.componentId || 'container'),
    props: comp.props && typeof comp.props === 'object' ? comp.props : {},
    styles: comp.styles && typeof comp.styles === 'object' ? comp.styles : undefined,
    children: Array.isArray(comp.children) 
      ? comp.children.map(transformComponent)
      : undefined,
  });
  
  const componentInstances = Array.isArray(currentPage?.components)
    ? currentPage.components.map(transformComponent)
    : [];

  const filteredData = useMemo(() => {
    return filterDataByQuery((app.data || {}) as Record<string, unknown>);
  }, [app.data, normalizedQuery]);

  // Debug: Log component instances
  console.log('🔧 Current page:', currentPage);
  console.log('🎨 Component instances:', componentInstances);
  console.log('📈 Component count:', componentInstances.length);

  // If no components, show helpful message
  if (componentInstances.length === 0 && currentPage) {
    console.warn('⚠️ No components found in page:', currentPage);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cleanText(app.name)}</h1>
            {app.description && cleanText(app.description) && (
              <p className="text-sm text-gray-600 mt-1">{cleanText(app.description)}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block w-64">
              <label className="sr-only" htmlFor="preview-global-search">
                Search app
              </label>
              <div className="relative">
                <input
                  id="preview-global-search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search this app"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <span className="pointer-events-none absolute right-2 top-2 text-[10px] uppercase tracking-wide text-gray-400">Global</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/studio/${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Open in Studio
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Back to Neo
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 border-r border-gray-200 bg-white min-h-screen">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pages</h2>
            <nav className="space-y-1">
              {filteredPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageId(page.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    page.id === currentPage?.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page.name}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1">
          {/* Mobile page selector */}
          <div className="md:hidden px-6 py-4 bg-white border-b border-gray-200">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Page</label>
            <select
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={currentPage?.id || ''}
              onChange={(e) => setCurrentPageId(e.target.value)}
            >
              {filteredPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-semibold text-gray-500 uppercase tracking-wide" htmlFor="preview-global-search-mobile">
              Global Search
            </label>
            <input
              id="preview-global-search-mobile"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search this app"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white max-w-md`}>
          {notification.message}
        </div>
      )}

      {/* Render the app schema */}
            <SchemaRenderer
            components={componentInstances}
            data={filteredData}
            theme={app.theme}
            onAction={handleComponentAction}
          />
        </main>
      </div>
    </div>
  );
}
