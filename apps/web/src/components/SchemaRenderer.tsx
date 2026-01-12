/**
 * Schema Renderer
 * Recursively renders ComponentInstanceSchema from app schema into React components
 * This is deterministic - no AI code generation
 */
import React from 'react';
import { getComponent, type ComponentProps } from './ComponentRegistry.js';

export interface ComponentInstance {
  id: string;
  componentId: string;
  props?: Record<string, unknown>;
  children?: ComponentInstance[];
  styles?: Record<string, unknown>;
}

interface SchemaRendererProps {
  components: ComponentInstance[];
  data?: Record<string, unknown[]>;
  theme?: {
    colors?: Record<string, string>;
    typography?: Record<string, unknown>;
    spacing?: Record<string, string>;
  };
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
  
  // Pass data to data-driven components
  const dataDrivenComponents = new Set(['list', 'table', 'calendar', 'kanban']);
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
 * Schema Renderer Component
 * Renders a page's components from the app schema
 */
export const SchemaRenderer: React.FC<SchemaRendererProps> = ({ 
  components, 
  data,
  theme,
  onAction
}) => {
  // Ensure data is always an object
  const safeData = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  
  // Debug logging
  console.log('🎨 SchemaRenderer called with:', { 
    componentCount: components?.length, 
    components,
    hasData: !!safeData,
    dataKeys: Object.keys(safeData),
    dataContent: safeData,
    hasTheme: !!theme
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
  
  // Apply theme to root container
  const containerStyle: React.CSSProperties = theme?.colors ? {
    backgroundColor: theme.colors.background || 'white',
    color: theme.colors.text || '#1e293b',
  } : {};
  
  return (
    <div className="min-h-screen p-6" style={containerStyle}>
      <div className="max-w-6xl mx-auto space-y-6">
        {components.map((component) => 
          renderComponentInstance(component, safeData, theme, onAction)
        )}
      </div>
    </div>
  );
};
