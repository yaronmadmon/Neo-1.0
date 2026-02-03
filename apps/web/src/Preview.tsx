/**
 * Preview Page Component
 * Fetches app data and renders it using SchemaRenderer
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { SchemaRenderer } from './components/SchemaRenderer.js';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './components/ui/sidebar.js';
import { AppSidebar } from './components/AppSidebar.js';
import { Separator } from './components/ui/separator.js';
import { AppConfigurationProvider, type AppConfiguration } from './context/AppConfigurationContext.js';
import { SetupSummary } from './components/SetupSummary.js';
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
  const [showSetupSummary, setShowSetupSummary] = useState(false);

  // Extract app configuration from schema if available
  const appConfiguration = useMemo<Partial<AppConfiguration> | undefined>(() => {
    if (!app?.schema) return undefined;
    
    const extSchema = app.schema as any;
    
    // Check if we have configuration in the schema
    if (extSchema.configuration) {
      return extSchema.configuration;
    }
    
    // Build basic configuration from schema metadata
    const config: Partial<AppConfiguration> = {};
    
    // Extract kit/industry info
    if (extSchema.industry?.id) {
      config.kitId = extSchema.industry.id;
    }
    
    // Extract complexity from schema
    if (extSchema.complexity) {
      config.complexity = extSchema.complexity;
    }
    
    // Extract terminology if available
    if (extSchema.terminology) {
      config.terminology = extSchema.terminology;
    }
    
    // Build sample data context
    config.sampleData = {
      businessName: cleanText(app.name) || 'Your Business',
      serviceTypes: [],
      locationStyle: 'mixed',
      includeSampleData: true,
    };
    
    // Check for setup summary
    if (extSchema.setupSummary) {
      config.setupSummary = extSchema.setupSummary;
      // Show setup summary on first load if we have one
      setShowSetupSummary(true);
    }
    
    return Object.keys(config).length > 0 ? config : undefined;
  }, [app]);

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
      config?: Record<string, unknown>; // For navigate and other actions with config
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
          // Get pageId from either location (flows use config.pageId)
          const pageId = action.targetPageId || (action.config as any)?.pageId;
          if (pageId) {
            console.log('🧭 Navigate to page:', pageId);
            setCurrentPageId(pageId);
          } else {
            console.warn('⚠️ Navigate action missing pageId');
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
    
    // Find flows that match this trigger
    const flows = app?.schema?.flows || [];
    const matchingFlows = flows.filter((flow: any) => {
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

    // Execute matching flows if found
    if (matchingFlows.length > 0) {
      for (const flow of matchingFlows as Array<{ id: string; name?: string; actions?: Array<{ type: string; modelId?: string; model?: string; recordId?: string; data?: Record<string, unknown>; targetPageId?: string; message?: string; componentId?: string; config?: Record<string, unknown> }> }>) {
        console.log('▶️ Executing flow:', flow.id, flow.name);
        if (flow.actions && Array.isArray(flow.actions)) {
          for (const action of flow.actions) {
            await dispatchAction(action, formData);
          }
        }
      }
      return;
    }

    // ============================================================
    // FALLBACK: Handle common button patterns without explicit flows
    // This ensures buttons work even if flows weren't generated correctly
    // ============================================================
    console.log('🔄 No matching flows, trying fallback handlers for:', componentId);
    
    const componentIdLower = componentId.toLowerCase();
    
    // Helper to find entity from current page or button ID
    const inferEntityFromContext = (): string | null => {
      // Try to get entity from current page
      const currentPageData = app?.schema?.pages?.find((p: any) => p.id === currentPageId) as { entity?: string } | undefined;
      if (currentPageData?.entity) return currentPageData.entity;
      
      // Try to extract from data models
      const dataModels = (app?.schema?.dataModels || []) as Array<{ id: string; name: string }>;
      if (dataModels.length === 1) return dataModels[0].id;
      
      // Try to extract from component ID patterns
      for (const model of dataModels) {
        if (componentIdLower.includes(model.id.toLowerCase())) {
          return model.id;
        }
      }
      
      return dataModels[0]?.id || 'item';
    };
    
    // Handle "Add" buttons - navigate to form page
    // Matches: "add-btn", "customer-add-btn", "quick-add", "add-guest", "addCustomer", etc.
    const isAddButton = componentIdLower.includes('-add-btn') || 
                        componentIdLower.includes('add-') || 
                        componentIdLower.includes('-add') ||
                        componentIdLower === 'add' ||
                        /^(quick[-_]?)?add/i.test(componentId);
    
    if (isAddButton) {
      // Get list of valid entity IDs from data models
      const dataModels = (app?.schema?.dataModels || []) as Array<{ id: string; name: string }>;
      const validEntityIds = new Set(dataModels.map(m => m.id.toLowerCase()));
      
      // Try to extract entity from button ID
      let entityId = componentId
        .replace(/-add-btn$/i, '')
        .replace(/^add-/i, '')
        .replace(/-add$/i, '')
        .replace(/^quick[-_]?add[-_]?/i, '')
        .replace(/add$/i, '')
        .trim();
      
      // Check if extracted entity is valid, otherwise infer from context
      // Also handle generic names like "quick", "new", "create", etc.
      const genericNames = ['quick', 'new', 'create', 'fast', ''];
      if (!entityId || genericNames.includes(entityId.toLowerCase()) || !validEntityIds.has(entityId.toLowerCase())) {
        entityId = inferEntityFromContext() || 'item';
        console.log('🔄 Entity inferred from context:', entityId);
      }
      
      const formPageId = `${entityId}-form`;
      console.log('🔄 Fallback: Add button → looking for form page:', formPageId, 'entity:', entityId);
      
      // Check if form page exists - try multiple patterns
      const formPage = app?.schema?.pages?.find((p: any) => 
        p.id === formPageId || 
        p.id === `${entityId}s-form` ||
        p.id === `add-${entityId}` ||
        (p.type === 'form' && p.entity === entityId) ||
        (p.type === 'form' && p.id.includes(entityId))
      ) || app?.schema?.pages?.find((p: any) => p.type === 'form');  // Final fallback to any form page
      
      if (formPage) {
        console.log('🔄 Found form page:', formPage.id);
        setCurrentPageId(formPage.id);
        const entityName = entityId.charAt(0).toUpperCase() + entityId.slice(1);
        setNotification({ message: `Opening ${entityName} form...`, type: 'success' });
        setTimeout(() => setNotification(null), 2000);
      } else {
        // Show notification that we're trying to add
        const entityName = entityId.charAt(0).toUpperCase() + entityId.slice(1);
        setNotification({ message: `Add ${entityName} (form page not found)`, type: 'success' });
        setTimeout(() => setNotification(null), 2000);
      }
      return;
    }
    
    // Handle "Edit" buttons - navigate to form page in edit mode
    if (componentIdLower.includes('-edit-btn') || componentIdLower.includes('edit-')) {
      const entityId = componentId.replace(/-edit-btn$/i, '').replace(/^edit-/i, '');
      console.log('🔄 Fallback: Edit button for:', entityId);
      setNotification({ message: `Edit ${entityId}`, type: 'success' });
      setTimeout(() => setNotification(null), 2000);
      return;
    }
    
    // Handle "View" buttons - navigate to detail page
    if (componentIdLower.includes('-view-btn') || componentIdLower.includes('view-')) {
      const entityId = componentId.replace(/-view-btn$/i, '').replace(/^view-/i, '');
      const detailPageId = `${entityId}-detail`;
      console.log('🔄 Fallback: View button → navigating to detail:', detailPageId);
      
      const detailPage = app?.schema?.pages?.find((p: any) => 
        p.id === detailPageId || p.type === 'detail' && p.id.includes(entityId)
      );
      
      if (detailPage) {
        setCurrentPageId(detailPage.id);
      } else {
        setNotification({ message: `View ${entityId} details`, type: 'success' });
        setTimeout(() => setNotification(null), 2000);
      }
      return;
    }
    
    // Handle "Delete" buttons
    if (componentIdLower.includes('-delete-btn') || componentIdLower.includes('delete-')) {
      const entityId = componentId.replace(/-delete-btn$/i, '').replace(/^delete-/i, '');
      console.log('🔄 Fallback: Delete button for:', entityId);
      setNotification({ message: `Delete ${entityId}? (Not implemented in preview)`, type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Handle navigation buttons (back, nav-)
    if (componentIdLower.includes('nav-') && componentIdLower.includes('-list')) {
      const entityId = componentId.replace(/^nav-/i, '').replace(/-list$/i, '');
      const listPageId = `${entityId}-list`;
      console.log('🔄 Fallback: Nav button → navigating to list:', listPageId);
      
      const listPage = app?.schema?.pages?.find((p: any) => 
        p.id === listPageId || p.id === `${entityId}s-list` || (p.type === 'list' && p.id.includes(entityId))
      );
      
      if (listPage) {
        setCurrentPageId(listPage.id);
      }
      return;
    }
    
    // Handle form submissions with fallback
    if (eventType === 'form_submit' && formData) {
      // Extract entity from form ID (e.g., "customer-form" → "customer")
      const entityId = componentId.replace(/-form$/i, '');
      console.log('🔄 Fallback: Form submit for entity:', entityId, 'with data:', formData);
      
      // Try to create record
      await dispatchAction({
        type: 'create_record',
        modelId: entityId,
        model: entityId,
        data: formData,
        message: 'Record saved successfully',
      }, formData);
      return;
    }
    
    // Generic fallback - just log the action
    console.warn('⚠️ No handler found for:', { componentId, eventType });
    setNotification({ message: `Button "${componentId}" clicked`, type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  }, [app, dispatchAction, currentPageId]);

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

  // Derive pages and search query early so they can be used in hooks
  const pages = useMemo(() => {
    return Array.isArray(app?.schema?.pages) ? app.schema.pages : [];
  }, [app?.schema?.pages]);
  
  const normalizedQuery = globalSearch.trim().toLowerCase();

  // Helper functions for filtering (defined as callbacks to be stable)
  const valueMatchesQuery = useCallback((value: unknown, depth: number = 0): boolean => {
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
  }, [normalizedQuery]);

  const filterComponentsByQuery = useCallback((components: Array<any>): Array<any> => {
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
  }, [normalizedQuery, valueMatchesQuery]);

  const filterDataByQuery = useCallback((data: Record<string, unknown[]>): Record<string, unknown[]> => {
    if (!normalizedQuery) return data;
    const filtered: Record<string, unknown[]> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        filtered[key] = value.filter((row) => valueMatchesQuery(row));
      }
    });
    return filtered;
  }, [normalizedQuery, valueMatchesQuery]);

  // Calculate filteredPages BEFORE the useEffect that uses it
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
      .filter((page): page is NonNullable<typeof page> => page !== null);
  }, [normalizedQuery, pages, filterComponentsByQuery, valueMatchesQuery]);

  // Calculate filteredData - must be before early returns to maintain hook order
  const filteredData = useMemo(() => {
    return filterDataByQuery((app?.data || {}) as Record<string, unknown[]>);
  }, [app?.data, filterDataByQuery]);

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
    if (!hasCurrent && filteredPages[0]) {
      setCurrentPageId(filteredPages[0].id);
    }
  }, [filteredPages, currentPageId]);

  // Handle card action events for internal navigation
  useEffect(() => {
    const handleCardAction = (e: Event) => {
      const customEvent = e as CustomEvent<{
        action: string;
        itemId: string;
        entityId: string;
        targetPage?: string;
        targetPageParams?: Record<string, unknown>;
      }>;
      
      const { action, itemId, entityId, targetPage } = customEvent.detail;
      console.log('📋 Card action received in Preview:', { action, itemId, entityId, targetPage });
      
      // Handle View/Edit actions by navigating to detail page (if it exists)
      if (action.toLowerCase() === 'view' || action.toLowerCase() === 'edit') {
        // Try to find a detail page for this entity
        const detailPageId = targetPage || `${entityId}-detail`;
        const detailPage = app?.schema?.pages?.find(p => 
          p.id === detailPageId || 
          p.id === `${entityId}s-detail` ||
          ((p as any).type === 'detail' && p.id.includes(entityId))
        );
        
        if (detailPage) {
          console.log('📄 Navigating to detail page:', detailPage.id);
          setCurrentPageId(detailPage.id);
          // Store the selected item ID for the detail page to use
          // This would typically be passed via context or URL params
        } else {
          // No detail page found - show a notification or modal instead
          console.log('ℹ️ No detail page found for', entityId, '- showing item info');
          setNotification({ 
            message: `Viewing ${entityId} #${itemId}`, 
            type: 'success' 
          });
          setTimeout(() => setNotification(null), 2000);
        }
      }
    };
    
    window.addEventListener('neo-card-action', handleCardAction);
    
    return () => {
      window.removeEventListener('neo-card-action', handleCardAction);
    };
  }, [app?.schema?.pages]);

  // Early returns must come AFTER all hooks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading app preview...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center bg-card p-8 rounded-lg border max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-muted-foreground mb-6">{error || 'App not found'}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            ← Back to Neo
          </button>
        </div>
      </div>
    );
  }

  // Find current page with safe fallback for empty arrays
  const currentPage =
    filteredPages.find((page) => page.id === currentPageId) || filteredPages[0] || null;
  
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

  // Debug: Log component instances
  console.log('🔧 Current page:', currentPage);
  console.log('🎨 Component instances:', componentInstances);
  console.log('📈 Component count:', componentInstances.length);

  // If no components, show helpful message
  if (componentInstances.length === 0 && currentPage) {
    console.warn('⚠️ No components found in page:', currentPage);
  }

  // Get shell configuration for dynamic layout (with type assertion for extended schema)
  const extendedSchema = app.schema as any;
  const shell = extendedSchema?.shell || {
    id: 'dashboard-02',
    name: 'Standard Business Shell',
    dashboardType: 'operations',
    layout: {
      sidebarPosition: 'left',
      sidebarStyle: 'full',
      headerStyle: 'standard',
      contentWidth: 'contained',
    },
    features: {
      showQuickActions: true,
      showRecentActivity: true,
      showSearch: true,
      showUserMenu: true,
      showNotifications: false,
    },
  };

  const industry = extendedSchema?.industry as { id: string; name: string; dashboardType: string } | undefined;

  // Dynamic layout classes based on shell configuration
  const getSidebarClasses = () => {
    const base = 'hidden md:block border-gray-200 bg-white min-h-screen';
    const width = shell.layout?.sidebarStyle === 'compact' ? 'w-56' : 
                  shell.layout?.sidebarStyle === 'icons-only' ? 'w-16' : 'w-64';
    const border = shell.layout?.sidebarPosition === 'right' ? 'border-l' : 'border-r';
    return `${base} ${width} ${border}`;
  };

  const getContentWidthClasses = () => {
    switch (shell.layout?.contentWidth) {
      case 'full': return 'w-full';
      case 'narrow': return 'max-w-4xl mx-auto';
      default: return 'max-w-6xl mx-auto';
    }
  };

  const getHeaderClasses = () => {
    const base = 'bg-white border-b border-gray-200';
    switch (shell.layout?.headerStyle) {
      case 'minimal': return `${base} px-4 py-2`;
      case 'prominent': return `${base} px-6 py-5 shadow-sm`;
      default: return `${base} px-6 py-4`;
    }
  };

  // Transform pages for AppSidebar
  const sidebarPages = filteredPages.map(page => ({
    id: page.id,
    name: page.name,
    route: page.route,
    type: (page as any).type || 'list',
  }));

  return (
    <AppConfigurationProvider configuration={appConfiguration}>
      {/* Setup Summary Overlay (shown on first load if configured) */}
      {showSetupSummary && appConfiguration?.setupSummary && (
        <SetupSummary
          summary={appConfiguration.setupSummary}
          overlay
          onProceed={() => setShowSetupSummary(false)}
          onAdjust={() => {
            setShowSetupSummary(false);
            navigate(`/studio/${id}`);
          }}
        />
      )}
      
      <SidebarProvider>
        <AppSidebar
          appName={cleanText(app.name)}
          pages={sidebarPages}
          currentPageId={currentPageId}
          onPageSelect={setCurrentPageId}
          onNavigateHome={() => navigate('/')}
          showUserMenu={shell.features?.showUserMenu}
        />
        <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-foreground text-sm">
                {currentPage?.name || cleanText(app.name)}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              {shell.features?.showSearch && (
                <div className="hidden md:block w-64">
                  <label className="sr-only" htmlFor="preview-global-search">
                    Search app
                  </label>
                  <div className="relative">
                    <input
                      id="preview-global-search"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <svg className="absolute right-3 top-2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              )}
              
              {/* Notifications */}
              {shell.features?.showNotifications && (
                <button 
                  type="button"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(`/studio/${id}`)}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 bg-muted/40 min-h-[calc(100vh-3.5rem)]">
          {/* Mobile page selector */}
          <div className="md:hidden px-4 py-3 bg-background border-b">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Page</label>
            <select
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={currentPage?.id || ''}
              onChange={(e) => setCurrentPageId(e.target.value)}
            >
              {filteredPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground uppercase tracking-wide" htmlFor="preview-global-search-mobile">
              Global Search
            </label>
            <input
              id="preview-global-search-mobile"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search this app"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

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

          {/* Render the app schema */}
          <SchemaRenderer
            components={componentInstances}
            data={filteredData}
            theme={app.theme}
            onAction={handleComponentAction}
          />
        </div>
        </SidebarInset>
      </SidebarProvider>
    </AppConfigurationProvider>
  );
}
