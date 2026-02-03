/**
 * Page Tree Panel
 * Displays the hierarchical structure of pages and their components
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { PageData, ComponentData, Selection, TreeNode } from '../types.js';

interface PageTreeProps {
  pages: PageData[];
  selection: Selection | null;
  expandedNodes: Set<string>;
  onSelect: (selection: Selection) => void;
  onToggleExpand: (nodeId: string) => void;
  onExpandAll?: (nodeIds: Set<string>) => void;
  onCollapseAll?: () => void;
}

// Icons for different component types
const componentIcons: Record<string, string> = {
  container: '📦',
  text: '📝',
  button: '🔘',
  input: '✏️',
  form: '📋',
  list: '📃',
  table: '📊',
  card: '🃏',
  image: '🖼️',
  chart: '📈',
  calendar: '📅',
  kanban: '📌',
  gallery: '🖼️',
  chat: '💬',
  map: '🗺️',
  navigation: '🧭',
  modal: '🪟',
  dashboard: '📊',
  section: '🔲',
  row: '➡️',
  grid: '⊞',
  default: '🧩',
};

function getComponentIcon(componentId: string): string {
  return componentIcons[componentId.toLowerCase()] || componentIcons.default;
}

// Build tree structure from page and components
function buildComponentTree(component: ComponentData, parentPath: string[]): TreeNode {
  const path = [...parentPath, component.id];
  const icon = getComponentIcon(component.componentId);
  
  return {
    id: component.id,
    label: `${component.componentId}`,
    icon,
    type: 'component',
    data: component,
    children: component.children?.map(child => buildComponentTree(child, path)),
  };
}

function buildPageTree(page: PageData): TreeNode {
  return {
    id: page.id,
    label: page.name,
    icon: '📄',
    type: 'page',
    data: page,
    children: page.components?.map(comp => buildComponentTree(comp, [page.id])),
  };
}

// Tree Node Component
interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  selection: Selection | null;
  expandedNodes: Set<string>;
  onSelectNode: (selection: Selection) => void;
  onToggleNode: (nodeId: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  isExpanded,
  isSelected,
  onSelect,
  onToggle,
  selection,
  expandedNodes,
  onSelectNode,
  onToggleNode,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = depth * 16 + 8;

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-colors
          ${isSelected 
            ? 'bg-accent text-accent-foreground border-l-2 border-primary' 
            : 'hover:bg-muted text-muted-foreground'
          }
        `}
        style={{ paddingLeft }}
        onClick={onSelect}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        <span className="text-sm">{node.icon}</span>

        {/* Label */}
        <span className="text-sm font-medium truncate flex-1">{node.label}</span>

        {/* Type badge */}
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">
          {node.type}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              isExpanded={expandedNodes.has(child.id)}
              isSelected={selection?.id === child.id}
              onSelect={() => onSelectNode({ type: child.type, id: child.id })}
              onToggle={() => onToggleNode(child.id)}
              selection={selection}
              expandedNodes={expandedNodes}
              onSelectNode={onSelectNode}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PageTree: React.FC<PageTreeProps> = ({
  pages,
  selection,
  expandedNodes,
  onSelect,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
}) => {
  // Build tree structure
  const tree = useMemo(() => pages.map(buildPageTree), [pages]);

  // Count components recursively
  const countComponents = useCallback((page: PageData): number => {
    const countInComponents = (components: ComponentData[]): number => {
      return components.reduce((sum, comp) => {
        return sum + 1 + (comp.children ? countInComponents(comp.children) : 0);
      }, 0);
    };
    return page.components ? countInComponents(page.components) : 0;
  }, []);

  const totalComponents = useMemo(() => 
    pages.reduce((sum, page) => sum + countComponents(page), 0),
    [pages, countComponents]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📄</span>
          Page Tree
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {pages.length} page{pages.length !== 1 ? 's' : ''} • {totalComponents} component{totalComponents !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {pages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-3xl">📄</span>
            <p className="mt-2">No pages in this app</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map(pageNode => (
              <TreeNodeItem
                key={pageNode.id}
                node={pageNode}
                depth={0}
                isExpanded={expandedNodes.has(pageNode.id)}
                isSelected={selection?.id === pageNode.id && selection?.type === 'page'}
                onSelect={() => onSelect({ type: 'page', id: pageNode.id })}
                onToggle={() => onToggleExpand(pageNode.id)}
                selection={selection}
                expandedNodes={expandedNodes}
                onSelectNode={onSelect}
                onToggleNode={onToggleExpand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              // Collect all node IDs to expand
              const allIds = new Set<string>();
              const collectIds = (components: ComponentData[] | undefined) => {
                components?.forEach(c => {
                  allIds.add(c.id);
                  if (c.children) collectIds(c.children);
                });
              };
              pages.forEach(p => {
                allIds.add(p.id);
                collectIds(p.components);
              });
              
              // Use onExpandAll if available, otherwise fallback to toggling
              if (onExpandAll) {
                onExpandAll(allIds);
              } else {
                allIds.forEach(id => {
                  if (!expandedNodes.has(id)) onToggleExpand(id);
                });
              }
            }}
            className="flex-1 text-xs px-2 py-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => {
              // Use onCollapseAll if available, otherwise fallback to toggling
              if (onCollapseAll) {
                onCollapseAll();
              } else {
                Array.from(expandedNodes).forEach(id => onToggleExpand(id));
              }
            }}
            className="flex-1 text-xs px-2 py-1.5 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            Collapse All
          </button>
        </div>
      </div>
    </div>
  );
};
