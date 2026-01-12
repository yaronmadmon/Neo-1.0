/**
 * Component Migration Engine
 * Handles component-level migrations (UPDATE_COMPONENT_PROP, UPDATE_COMPONENT_STYLE)
 */

import type { App, Page, ComponentInstance } from '@neo/contracts';
import type { Migration } from './types.js';

/**
 * Component migration engine
 */
export class ComponentMigrationEngine {
  /**
   * Apply migration to app (component-level)
   */
  applyMigration(
    app: App,
    migration: Migration
  ): { app: App } {
    switch (migration.type) {
      case 'UPDATE_COMPONENT_PROP':
        return this.applyUpdateComponentProp(app, migration);
        
      case 'UPDATE_COMPONENT_STYLE':
        return this.applyUpdateComponentStyle(app, migration);
        
      case 'ADD_COMPONENT':
        return this.applyAddComponent(app, migration);
        
      case 'REMOVE_COMPONENT':
        return this.applyRemoveComponent(app, migration);
        
      default:
        throw new Error(`Unsupported migration type: ${migration.type}`);
    }
  }
  
  /**
   * Apply UPDATE_COMPONENT_PROP migration
   */
  private applyUpdateComponentProp(
    app: App,
    migration: Migration
  ): { app: App } {
    const { pageId, componentId, propName, propValue } = migration.params;
    
    if (!pageId || !componentId || !propName) {
      throw new Error('UPDATE_COMPONENT_PROP migration requires pageId, componentId, and propName');
    }
    
    const pageIdStr = pageId as string;
    const componentIdStr = componentId as string;
    const propNameStr = propName as string;
    
    // Find page
    const pageIndex = app.schema.pages.findIndex(p => p.id === pageIdStr);
    if (pageIndex === -1) {
      throw new Error(`Page ${pageIdStr} not found`);
    }
    
    const page = app.schema.pages[pageIndex];
    
    // Find and update component
    const updatedComponents = this.updateComponentInTree(
      page.components,
      componentIdStr,
      (component) => {
        return {
          ...component,
          props: {
            ...component.props,
            [propNameStr]: propValue,
          },
        };
      }
    );
    
    const updatedPage: Page = {
      ...page,
      components: updatedComponents,
    };
    
    const updatedPages = [...app.schema.pages];
    updatedPages[pageIndex] = updatedPage;
    
    const updatedApp: App = {
      ...app,
      schema: {
        ...app.schema,
        pages: updatedPages,
      },
    };
    
    return { app: updatedApp };
  }
  
  /**
   * Apply UPDATE_COMPONENT_STYLE migration
   * Example: "Make the header blue"
   */
  private applyUpdateComponentStyle(
    app: App,
    migration: Migration
  ): { app: App } {
    const { pageId, componentId, styleUpdates } = migration.params;
    
    if (!pageId || !componentId || !styleUpdates) {
      throw new Error('UPDATE_COMPONENT_STYLE migration requires pageId, componentId, and styleUpdates');
    }
    
    const pageIdStr = pageId as string;
    const componentIdStr = componentId as string;
    
    // Find page
    const pageIndex = app.schema.pages.findIndex(p => p.id === pageIdStr);
    if (pageIndex === -1) {
      throw new Error(`Page ${pageIdStr} not found`);
    }
    
    const page = app.schema.pages[pageIndex];
    
    // Find and update component
    const updatedComponents = this.updateComponentInTree(
      page.components,
      componentIdStr,
      (component) => {
        return {
          ...component,
          styles: {
            ...(component.styles || {}),
            ...(styleUpdates as Record<string, unknown>),
          },
        };
      }
    );
    
    const updatedPage: Page = {
      ...page,
      components: updatedComponents,
    };
    
    const updatedPages = [...app.schema.pages];
    updatedPages[pageIndex] = updatedPage;
    
    const updatedApp: App = {
      ...app,
      schema: {
        ...app.schema,
        pages: updatedPages,
      },
    };
    
    return { app: updatedApp };
  }
  
  /**
   * Apply ADD_COMPONENT migration
   */
  private applyAddComponent(
    app: App,
    migration: Migration
  ): { app: App } {
    const { pageId, component, parentId, index } = migration.params;
    
    if (!pageId || !component) {
      throw new Error('ADD_COMPONENT migration requires pageId and component');
    }
    
    const pageIdStr = pageId as string;
    const componentInstance = component as ComponentInstance;
    const parentIdStr = parentId as string | undefined;
    const indexNum = index as number | undefined;
    
    // Find page
    const pageIndex = app.schema.pages.findIndex(p => p.id === pageIdStr);
    if (pageIndex === -1) {
      throw new Error(`Page ${pageIdStr} not found`);
    }
    
    const page = app.schema.pages[pageIndex];
    
    // Add component to tree
    const updatedComponents = this.addComponentToTree(
      page.components,
      componentInstance,
      parentIdStr,
      indexNum
    );
    
    const updatedPage: Page = {
      ...page,
      components: updatedComponents,
    };
    
    const updatedPages = [...app.schema.pages];
    updatedPages[pageIndex] = updatedPage;
    
    const updatedApp: App = {
      ...app,
      schema: {
        ...app.schema,
        pages: updatedPages,
      },
    };
    
    return { app: updatedApp };
  }
  
  /**
   * Apply REMOVE_COMPONENT migration
   */
  private applyRemoveComponent(
    app: App,
    migration: Migration
  ): { app: App } {
    const { pageId, componentId } = migration.params;
    
    if (!pageId || !componentId) {
      throw new Error('REMOVE_COMPONENT migration requires pageId and componentId');
    }
    
    const pageIdStr = pageId as string;
    const componentIdStr = componentId as string;
    
    // Find page
    const pageIndex = app.schema.pages.findIndex(p => p.id === pageIdStr);
    if (pageIndex === -1) {
      throw new Error(`Page ${pageIdStr} not found`);
    }
    
    const page = app.schema.pages[pageIndex];
    
    // Remove component from tree
    const updatedComponents = this.removeComponentFromTree(
      page.components,
      componentIdStr
    );
    
    const updatedPage: Page = {
      ...page,
      components: updatedComponents,
    };
    
    const updatedPages = [...app.schema.pages];
    updatedPages[pageIndex] = updatedPage;
    
    const updatedApp: App = {
      ...app,
      schema: {
        ...app.schema,
        pages: updatedPages,
      },
    };
    
    return { app: updatedApp };
  }
  
  /**
   * Update component in tree recursively
   */
  private updateComponentInTree(
    components: ComponentInstance[],
    componentId: string,
    updateFn: (component: ComponentInstance) => ComponentInstance
  ): ComponentInstance[] {
    return components.map(component => {
      if (component.id === componentId) {
        return updateFn(component);
      }
      
      if (component.children && component.children.length > 0) {
        return {
          ...component,
          children: this.updateComponentInTree(component.children, componentId, updateFn),
        };
      }
      
      return component;
    });
  }
  
  /**
   * Add component to tree
   */
  private addComponentToTree(
    components: ComponentInstance[],
    newComponent: ComponentInstance,
    parentId?: string,
    index?: number
  ): ComponentInstance[] {
    if (!parentId) {
      // Add to root level
      if (index !== undefined) {
        const updated = [...components];
        updated.splice(index, 0, newComponent);
        return updated;
      }
      return [...components, newComponent];
    }
    
    // Find parent and add to its children
    return components.map(component => {
      if (component.id === parentId) {
        const children = component.children || [];
        const updatedChildren = index !== undefined
          ? [...children.slice(0, index), newComponent, ...children.slice(index)]
          : [...children, newComponent];
        
        return {
          ...component,
          children: updatedChildren,
        };
      }
      
      if (component.children && component.children.length > 0) {
        return {
          ...component,
          children: this.addComponentToTree(component.children, newComponent, parentId, index),
        };
      }
      
      return component;
    });
  }
  
  /**
   * Remove component from tree
   */
  private removeComponentFromTree(
    components: ComponentInstance[],
    componentId: string
  ): ComponentInstance[] {
    return components
      .filter(component => component.id !== componentId)
      .map(component => {
        if (component.children && component.children.length > 0) {
          return {
            ...component,
            children: this.removeComponentFromTree(component.children, componentId),
          };
        }
        return component;
      });
  }
}
