/**
 * Component Inspector Panel
 * Displays detailed information about the selected component
 */

import React, { useMemo } from 'react';
import type { ComponentData, PageData, Selection } from '../types.js';

interface ComponentInspectorProps {
  pages: PageData[];
  selection: Selection | null;
}

// Find component by ID in the tree
function findComponent(components: ComponentData[], id: string): ComponentData | null {
  for (const comp of components) {
    if (comp.id === id) return comp;
    if (comp.children) {
      const found = findComponent(comp.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Find component's parent page
function findComponentPage(pages: PageData[], componentId: string): PageData | null {
  for (const page of pages) {
    if (page.components && findComponent(page.components, componentId)) {
      return page;
    }
  }
  return null;
}

// Property value renderer
const PropertyValue: React.FC<{ value: unknown; depth?: number }> = ({ value, depth = 0 }) => {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600' : 'text-red-600'}>
        {value.toString()}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="text-blue-600">{value}</span>;
  }

  if (typeof value === 'string') {
    if (value.length > 50) {
      return (
        <span className="text-amber-700" title={value}>
          "{value.substring(0, 47)}..."
        </span>
      );
    }
    return <span className="text-amber-700">"{value}"</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-500">[]</span>;
    }
    if (depth > 1) {
      return <span className="text-gray-500">[{value.length} items]</span>;
    }
    return (
      <div className="pl-4 border-l-2 border-gray-200 ml-1 space-y-1">
        {value.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-gray-400 text-xs">{i}:</span>
            <PropertyValue value={item} depth={depth + 1} />
          </div>
        ))}
        {value.length > 5 && (
          <span className="text-gray-400 text-xs">...and {value.length - 5} more</span>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className="text-gray-500">{'{}'}</span>;
    }
    if (depth > 1) {
      return <span className="text-gray-500">{`{${entries.length} props}`}</span>;
    }
    return (
      <div className="pl-4 border-l-2 border-gray-200 ml-1 space-y-1">
        {entries.slice(0, 8).map(([key, val]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="text-primary text-xs font-medium">{key}:</span>
            <PropertyValue value={val} depth={depth + 1} />
          </div>
        ))}
        {entries.length > 8 && (
          <span className="text-gray-400 text-xs">...and {entries.length - 8} more</span>
        )}
      </div>
    );
  }

  return <span className="text-gray-600">{String(value)}</span>;
};

// Property row component
const PropertyRow: React.FC<{ label: string; value: unknown; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className={`py-2 ${highlight ? 'bg-accent -mx-4 px-4' : ''}`}>
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm font-medium text-gray-700 shrink-0">{label}</span>
      <div className="text-sm text-right overflow-hidden">
        <PropertyValue value={value} />
      </div>
    </div>
  </div>
);

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  pages,
  selection,
}) => {
  // Get selected component
  const selectedComponent = useMemo(() => {
    if (!selection || selection.type !== 'component') return null;
    for (const page of pages) {
      if (page.components) {
        const comp = findComponent(page.components, selection.id);
        if (comp) return comp;
      }
    }
    return null;
  }, [pages, selection]);

  // Get selected page
  const selectedPage = useMemo(() => {
    if (!selection) return null;
    if (selection.type === 'page') {
      return pages.find(p => p.id === selection.id) || null;
    }
    if (selection.type === 'component' && selectedComponent) {
      return findComponentPage(pages, selection.id);
    }
    return null;
  }, [pages, selection, selectedComponent]);

  // Component types info
  const componentInfo: Record<string, { name: string; description: string }> = {
    container: { name: 'Container', description: 'Layout container for grouping components' },
    text: { name: 'Text', description: 'Display text content with styling' },
    button: { name: 'Button', description: 'Clickable button with actions' },
    input: { name: 'Input', description: 'Text input field' },
    form: { name: 'Form', description: 'Form container with submission handling' },
    list: { name: 'List', description: 'Display list of data items' },
    table: { name: 'Table', description: 'Tabular data display' },
    card: { name: 'Card', description: 'Content card container' },
    image: { name: 'Image', description: 'Image display' },
    chart: { name: 'Chart', description: 'Data visualization chart' },
    calendar: { name: 'Calendar', description: 'Date-based event display' },
    kanban: { name: 'Kanban', description: 'Kanban board for tasks' },
    gallery: { name: 'Gallery', description: 'Image gallery with lightbox' },
    chat: { name: 'Chat', description: 'Chat message interface' },
    map: { name: 'Map', description: 'Location map with markers' },
    navigation: { name: 'Navigation', description: 'Navigation menu' },
    modal: { name: 'Modal', description: 'Modal dialog overlay' },
    dashboard: { name: 'Dashboard', description: 'Dashboard grid layout' },
    section: { name: 'Section', description: 'Content section container' },
    row: { name: 'Row', description: 'Horizontal flex layout' },
    grid: { name: 'Grid', description: 'CSS grid layout' },
    divider: { name: 'Divider', description: 'Visual separator' },
    badge: { name: 'Badge', description: 'Status badge indicator' },
  };

  // No selection
  if (!selection) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>🔍</span>
            Component Inspector
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
          <div className="text-center">
            <span className="text-4xl">👆</span>
            <p className="mt-2">Select a component to inspect</p>
            <p className="text-sm">Click on any component in the Page Tree</p>
          </div>
        </div>
      </div>
    );
  }

  // Page selected
  if (selection.type === 'page' && selectedPage) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>📄</span>
            Page Inspector
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* Page info */}
          <div className="bg-muted rounded-lg p-4 mb-4">
            <h3 className="text-xl font-bold text-gray-900">{selectedPage.name}</h3>
            <p className="text-sm text-gray-600 mt-1">Route: {selectedPage.route}</p>
          </div>

          {/* Properties */}
          <div className="space-y-2 divide-y divide-gray-100">
            <PropertyRow label="ID" value={selectedPage.id} highlight />
            <PropertyRow label="Name" value={selectedPage.name} />
            <PropertyRow label="Route" value={selectedPage.route} />
            <PropertyRow label="Components" value={selectedPage.components?.length ?? 0} />
            <PropertyRow label="Layout" value={selectedPage.layout} />
          </div>
        </div>
      </div>
    );
  }

  // Component selected
  if (selection.type === 'component' && selectedComponent) {
    const info = componentInfo[selectedComponent.componentId.toLowerCase()] ?? {
      name: selectedComponent.componentId,
      description: 'Custom component',
    };

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>🧩</span>
            Component Inspector
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* Component info header */}
          <div className="bg-muted rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">
                {selectedComponent.componentId === 'text' ? '📝' :
                 selectedComponent.componentId === 'button' ? '🔘' :
                 selectedComponent.componentId === 'form' ? '📋' :
                 selectedComponent.componentId === 'list' ? '📃' : '🧩'}
              </span>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{info.name}</h3>
                <p className="text-sm text-gray-600">{info.description}</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
              Basic Info
            </h4>
            <div className="space-y-2 divide-y divide-gray-100">
              <PropertyRow label="ID" value={selectedComponent.id} highlight />
              <PropertyRow label="Type" value={selectedComponent.componentId} />
              <PropertyRow label="Page" value={selectedPage?.name ?? 'Unknown'} />
              <PropertyRow label="Children" value={selectedComponent.children?.length ?? 0} />
            </div>
          </div>

          {/* Props */}
          {selectedComponent.props && Object.keys(selectedComponent.props).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                Properties
              </h4>
              <div className="space-y-2 divide-y divide-gray-100">
                {Object.entries(selectedComponent.props).map(([key, value]) => (
                  <PropertyRow key={key} label={key} value={value} />
                ))}
              </div>
            </div>
          )}

          {/* Styles */}
          {selectedComponent.styles && Object.keys(selectedComponent.styles).length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                Styles
              </h4>
              <div className="space-y-2 divide-y divide-gray-100">
                {Object.entries(selectedComponent.styles).map(([key, value]) => (
                  <PropertyRow key={key} label={key} value={value} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Other selection types
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>🔍</span>
          Inspector
        </h2>
      </div>
      <div className="flex-1 p-4">
        <PropertyRow label="Type" value={selection.type} />
        <PropertyRow label="ID" value={selection.id} />
      </div>
    </div>
  );
};
