/**
 * Schema Renderer
 * Recursively renders ComponentInstanceSchema from app schema into React components
 * This is deterministic - no AI code generation
 * Now with layout and app shell support
 */
import React, { useEffect, useMemo } from 'react';
import { getComponent, type ComponentProps } from './ComponentRegistry.js';
import { applyTheme } from '../lib/token-runtime';
import type { ThemeTokens } from '../lib/token-types';
import { 
  SingleColumn, 
  TwoColumn, 
  ThreeColumn,
  SidebarLayout,
  DashboardGrid,
  type LayoutConfig,
  type LayoutType,
} from './layouts';
import { DynamicAppSidebar, type NavItem } from './DynamicAppSidebar';

/** Section role for dashboard narrative (from Dashboard Intent System) */
export type SectionRole = 'today' | 'in-progress' | 'upcoming' | 'summary' | 'history';

/** Section priority for visual weight */
export type SectionPriority = 'primary' | 'secondary' | 'tertiary';

/** Time scope for metrics and filtering */
export type TimeScope = 'now' | 'today' | 'this-week' | 'this-month' | 'all-time';

/** Layout hint for section presentation */
export type LayoutHint = 'stats-row' | 'card-list' | 'data-table' | 'chart' | 'activity' | 'calendar' | 'kanban';

/** Intent metadata for semantic rendering */
export interface ComponentIntent {
  role?: SectionRole;
  priority?: SectionPriority;
  timeScope?: TimeScope;
  layoutHint?: LayoutHint;
  emphasis?: 'normal' | 'highlighted';
}

export interface ComponentInstance {
  id: string;
  componentId: string;
  props?: Record<string, unknown>;
  children?: ComponentInstance[];
  styles?: Record<string, unknown>;
  /** Dashboard Intent metadata for semantic rendering */
  intent?: ComponentIntent;
}

// =============================================================================
// INTENT ORDERING CONSTANTS
// =============================================================================

/** Canonical ordering of section roles (Now → Work → Context) */
const ROLE_ORDER: Record<SectionRole, number> = {
  'today': 0,
  'in-progress': 1,
  'upcoming': 2,
  'summary': 3,
  'history': 4,
};

/** Canonical ordering of priorities */
const PRIORITY_ORDER: Record<SectionPriority, number> = {
  'primary': 0,
  'secondary': 1,
  'tertiary': 2,
};

/** Roles that are allowed to have actions */
const ACTIONABLE_ROLES: SectionRole[] = ['today', 'in-progress', 'upcoming'];

/** App shell configuration for sidebar-based layouts */
export interface AppShellConfig {
  /** Enable the app shell with sidebar */
  enabled: boolean;
  /** App name shown in sidebar header */
  appName: string;
  /** App icon (emoji) */
  appIcon?: string;
  /** Navigation items from app schema */
  navItems: NavItem[];
  /** Currently active page */
  activePageId?: string;
  /** User info */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  /** Callback when navigation item is clicked */
  onNavigate?: (pageId: string, route: string) => void;
}

interface SchemaRendererProps {
  components: ComponentInstance[];
  data?: Record<string, unknown[]>;
  theme?: ThemeTokens & {
    colors?: Record<string, string>;
    typography?: Record<string, unknown>;
    spacing?: Record<string, string> & {
      scale?: 'compact' | 'normal' | 'relaxed';
      borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
      cardPadding?: 'sm' | 'md' | 'lg';
    };
  };
  /** Layout configuration for the page */
  layout?: LayoutConfig;
  /** App shell configuration (sidebar, header, etc.) */
  appShell?: AppShellConfig;
  onAction?: (componentId: string, eventType: 'button_click' | 'form_submit', formData?: Record<string, unknown>) => Promise<void>;
}

/**
 * Render a single component instance recursively
 */
const renderComponentInstance = (
  instance: ComponentInstance,
  data?: Record<string, unknown[]>,
  theme?: SchemaRendererProps['theme'],
  onAction?: SchemaRendererProps['onAction'],
  depth: number = 0
): React.ReactElement => {
  // Ensure data is always an object
  const safeData = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  
  console.log(`🔧 Rendering component: ${instance.componentId} (depth: ${depth})`, instance);
  const Component = getComponent(instance.componentId);
  
  if (!Component) {
    console.error(`❌ Component not found in registry: ${instance.componentId}`);
  }
  
  // Apply theme styles if available
  const style: React.CSSProperties = {
    ...instance.styles,
    ...(theme?.colors && instance.componentId === 'container' ? {
      backgroundColor: theme.colors.background || 'white',
      color: theme.colors.text || '#1e293b',
    } : {}),
  };
  
  // Process props - handle data binding for list components
  const processedProps: ComponentProps = {
    id: instance.id,
    ...instance.props,
    style,
  };
  
  // Pass intent metadata to components for semantic rendering
  // This allows layouts to adjust spacing, density, and emphasis
  if (instance.intent) {
    processedProps['data-section-role'] = instance.intent.role;
    processedProps['data-section-priority'] = instance.intent.priority;
    processedProps['data-time-scope'] = instance.intent.timeScope;
    processedProps['data-layout-hint'] = instance.intent.layoutHint;
    processedProps['data-emphasis'] = instance.intent.emphasis;
    
    // Also pass as a structured prop for components that want to use it
    processedProps.intent = instance.intent;
    
    // Check if this section can have actions (based on role)
    const canHaveActions = instance.intent.role && ACTIONABLE_ROLES.includes(instance.intent.role);
    processedProps['data-can-have-actions'] = canHaveActions;
  }
  
  // Pass data to data-driven components
  // FIXED: Added all components that consume data via source prop
  // These components extract items as data[source] in their render logic
  const dataDrivenComponents = new Set([
    'list',           // ListComponent - displays items in cards
    'table',          // TableComponent - basic table
    'dataTable',      // DataTableComponent - enhanced table with search/pagination
    'calendar',       // CalendarComponent - date-based events
    'kanban',         // KanbanComponent - status-based columns
    'gallery',        // GalleryComponent - image grid
    'chat',           // ChatComponent - message list
    'map',            // MapComponent - location markers
    'areaChart',      // AreaChartComponent - trend charts
    'lineChart',      // Alias for areaChart
    'statsCard',      // StatsCardComponent - KPI with aggregation
    'kpiCard',        // Alias for statsCard
    'activityFeed',   // ActivityFeedComponent - recent changes across entities
    'recentActivity', // Alias for activityFeed
  ]);
  
  if (dataDrivenComponents.has(instance.componentId)) {
    const source = instance.props?.source;
    console.log('SchemaRenderer processing data component:', {
      componentId: instance.componentId,
      source,
      hasData: !!safeData,
      dataKeys: Object.keys(safeData),
      dataContent: safeData
    });

    processedProps.data = safeData;
    if (source) {
      processedProps.source = source;
    }
    
    // Debug safeguard: warn if data resolution will likely fail
    if (source && (!safeData || Object.keys(safeData).length === 0)) {
      console.warn(`⚠️ Data resolution warning: Component "${instance.id}" (${instance.componentId}) expects data from source "${source}" but no data was provided`);
    } else if (source && safeData && !safeData[String(source)]) {
      console.warn(`⚠️ Data resolution warning: Component "${instance.id}" (${instance.componentId}) expects source "${source}" but available keys are: [${Object.keys(safeData).join(', ')}]`);
    }
  }

  // Render children recursively
  const renderedChildren = instance.children
    ? instance.children.map((child) => 
        renderComponentInstance(child, safeData, theme, onAction, depth + 1)
      )
    : undefined;
  
  // Add action handler for button and form components
  if (instance.componentId === 'button' && onAction) {
    processedProps.onClick = async () => {
      console.log('🔘 Button clicked:', instance.id);
      await onAction(instance.id, 'button_click');
    };
  } else if (instance.componentId === 'form' && onAction) {
    processedProps.onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log('📝 Form submitted:', instance.id);
      
      const form = e.currentTarget;
      const formData: Record<string, unknown> = {};
      
      // Extract form data
      const inputs = form.querySelectorAll('input, textarea, select');
      console.log('📋 Found form inputs:', inputs.length);
      
      inputs.forEach((input) => {
        const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        console.log('  📥 Input:', { name: element.name, value: element.value, type: element.type });
        if (element.name) {
          if (element.type === 'checkbox') {
            formData[element.name] = (element as HTMLInputElement).checked;
          } else {
            formData[element.name] = element.value;
          }
        }
      });
      
      console.log('📦 Extracted form data:', formData);
      await onAction(instance.id, 'form_submit', formData);
    };
  }
  
  return (
    <Component key={instance.id} {...processedProps}>
      {renderedChildren as React.ReactNode}
    </Component>
  );
};

/**
 * Render components within a layout wrapper
 */
const renderWithLayout = (
  layout: LayoutConfig | undefined,
  renderedComponents: React.ReactElement[]
): React.ReactElement => {
  // Default to single column if no layout specified
  if (!layout || layout.type === 'single_column') {
    return (
      <SingleColumn 
        maxWidth={layout?.maxWidth || 'xl'}
        padding={layout?.padding || 'md'}
      >
        <div className="space-y-6">
          {renderedComponents}
        </div>
      </SingleColumn>
    );
  }
  
  if (layout.type === 'full_width') {
    return (
      <div className="w-full p-6 space-y-6">
        {renderedComponents}
      </div>
    );
  }
  
  if (layout.type === 'two_column') {
    // Split components between columns (can be enhanced with explicit assignment)
    const midpoint = Math.ceil(renderedComponents.length / 2);
    const leftComponents = renderedComponents.slice(0, midpoint);
    const rightComponents = renderedComponents.slice(midpoint);
    
    const ratio = (layout.ratio as '1:1' | '1:2' | '2:1' | '1:3' | '3:1') || '1:1';
    
    return (
      <TwoColumn
        left={<div className="space-y-6">{leftComponents}</div>}
        right={<div className="space-y-6">{rightComponents}</div>}
        ratio={ratio}
        gap={layout.gap || 'md'}
        padding={layout.padding || 'md'}
      />
    );
  }
  
  if (layout.type === 'three_column') {
    // Split components between three columns
    const third = Math.ceil(renderedComponents.length / 3);
    const leftComponents = renderedComponents.slice(0, third);
    const centerComponents = renderedComponents.slice(third, third * 2);
    const rightComponents = renderedComponents.slice(third * 2);
    
    const ratio = (layout.ratio as '1:1:1' | '1:2:1' | '1:3:1' | '2:1:1' | '1:1:2') || '1:1:1';
    
    return (
      <ThreeColumn
        left={<div className="space-y-6">{leftComponents}</div>}
        center={<div className="space-y-6">{centerComponents}</div>}
        right={<div className="space-y-6">{rightComponents}</div>}
        ratio={ratio}
        gap={layout.gap || 'md'}
        padding={layout.padding || 'md'}
      />
    );
  }
  
  if (layout.type === 'sidebar_left' || layout.type === 'sidebar_right') {
    // First component goes in sidebar, rest in main
    const sidebarContent = renderedComponents.slice(0, 1);
    const mainContent = renderedComponents.slice(1);
    
    return (
      <SidebarLayout
        position={layout.type === 'sidebar_left' ? 'left' : 'right'}
        sidebar={<div className="space-y-4">{sidebarContent}</div>}
        sidebarWidth={layout.sidebarWidth || 'md'}
        gap={layout.gap || 'md'}
        padding={layout.padding || 'none'}
      >
        <div className="space-y-6 p-6">
          {mainContent}
        </div>
      </SidebarLayout>
    );
  }
  
  if (layout.type === 'dashboard_grid') {
    return (
      <DashboardGrid
        columns={layout.columns || 3}
        gap={layout.gap || 'md'}
        padding={layout.padding || 'md'}
      >
        {renderedComponents}
      </DashboardGrid>
    );
  }
  
  // Fallback to simple rendering
  return (
    <div className="p-6 space-y-6">
      {renderedComponents}
    </div>
  );
};

/**
 * Schema Renderer Component
 * Renders a page's components from the app schema
 */
export const SchemaRenderer: React.FC<SchemaRendererProps> = ({ 
  components, 
  data,
  theme,
  layout,
  appShell,
  onAction
}) => {
  // Ensure data is always an object
  const safeData = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  
  // Apply theme to CSS variables when theme changes
  useEffect(() => {
    if (theme) {
      console.log('🎨 SchemaRenderer: Applying theme to CSS variables', theme);
      applyTheme(theme as ThemeTokens);
    }
  }, [theme]);
  
  // Sort components by intent (role then priority) when intent metadata is present
  // This enforces the "Now → Work → Context" narrative order
  const sortedComponents = useMemo(() => {
    if (!components || components.length === 0) {
      return [];
    }
    
    // Check if any components have intent metadata
    const hasIntentMetadata = components.some(c => c.intent?.role);
    
    if (!hasIntentMetadata) {
      // No intent metadata - return in original order (graceful fallback)
      return components;
    }
    
    // Sort by role first, then by priority within the same role
    return [...components].sort((a, b) => {
      const roleA = ROLE_ORDER[a.intent?.role ?? 'summary'] ?? 99;
      const roleB = ROLE_ORDER[b.intent?.role ?? 'summary'] ?? 99;
      if (roleA !== roleB) return roleA - roleB;
      
      const prioA = PRIORITY_ORDER[a.intent?.priority ?? 'tertiary'] ?? 99;
      const prioB = PRIORITY_ORDER[b.intent?.priority ?? 'tertiary'] ?? 99;
      return prioA - prioB;
    });
  }, [components]);
  
  // Memoize rendered components to avoid unnecessary re-renders
  const renderedComponents = useMemo(() => {
    if (sortedComponents.length === 0) {
      return [];
    }
    
    return sortedComponents.map((component) => 
      renderComponentInstance(component, safeData, theme, onAction)
    );
  }, [sortedComponents, safeData, theme, onAction]);
  
  // Check if components use intent system
  const hasIntentMetadata = components?.some(c => c.intent?.role);
  
  // Debug logging
  console.log('🎨 SchemaRenderer called with:', { 
    componentCount: components?.length, 
    hasIntentMetadata,
    sortedByIntent: hasIntentMetadata ? 'yes' : 'no (fallback order)',
    hasData: !!safeData,
    dataKeys: Object.keys(safeData),
    hasTheme: !!theme,
    layout: layout?.type || 'default',
    hasAppShell: !!appShell?.enabled
  });

  if (!components || components.length === 0) {
    console.warn('⚠️ SchemaRenderer: No components provided');
    return (
      <div className="text-center py-12 text-gray-500 bg-yellow-50 border border-solid border-yellow-200 rounded-lg p-6">
        <p className="font-semibold mb-2">No components to display</p>
        <p className="text-sm">The app schema does not contain any components. This may be a generation issue.</p>
      </div>
    );
  }
  
  // Content with layout
  const contentWithLayout = renderWithLayout(layout, renderedComponents);
  
  // Wrap in app shell if enabled
  if (appShell?.enabled) {
    return (
      <DynamicAppSidebar
        appName={appShell.appName}
        appIcon={appShell.appIcon ? <span className="text-xl">{appShell.appIcon}</span> : undefined}
        navItems={appShell.navItems}
        activePageId={appShell.activePageId}
        user={appShell.user}
        onNavigate={appShell.onNavigate}
      >
        {/* Use surface-app for the ambient page background */}
        <div className="min-h-full bg-surface-app text-foreground">
          {contentWithLayout}
        </div>
      </DynamicAppSidebar>
    );
  }
  
  // Use surface-app for the ambient page background
  // This creates visual depth with content sitting on a tinted surface
  return (
    <div className="min-h-screen bg-surface-app text-foreground">
      {contentWithLayout}
    </div>
  );
};

