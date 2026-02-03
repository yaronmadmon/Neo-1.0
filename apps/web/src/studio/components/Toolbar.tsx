/**
 * Studio Toolbar Component
 * Top toolbar with undo/redo, navigation, and app info
 */

import React from 'react';
import type { AppData, InspectorPanel } from '../types.js';

interface ToolbarProps {
  app: AppData | null;
  activePanel: InspectorPanel;
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onPanelChange: (panel: InspectorPanel) => void;
  onBack: () => void;
}

const panelConfig: Record<InspectorPanel, { icon: string; label: string }> = {
  pages: { icon: '📄', label: 'Pages' },
  components: { icon: '🧩', label: 'Components' },
  app: { icon: '📱', label: 'App' },
  data: { icon: '📊', label: 'Data' },
  workflows: { icon: '⚡', label: 'Workflows' },
  integrations: { icon: '🔌', label: 'Integrations' },
  'ai-suggestions': { icon: '🤖', label: 'AI Suggestions' },
  publish: { icon: '🚀', label: 'Publish' },
};

export const Toolbar: React.FC<ToolbarProps> = ({
  app,
  activePanel,
  canUndo,
  canRedo,
  undoDescription,
  redoDescription,
  onUndo,
  onRedo,
  onPanelChange,
  onBack,
}) => {
  return (
    <div className="h-14 bg-gray-900 text-white flex items-center px-4 gap-4 shrink-0">
      {/* Back button and logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          title="Back to Neo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">
            Neo Studio
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700" />

      {/* App name */}
      {app && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Inspecting:</span>
          <span className="font-medium">{app.name}</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Panel tabs */}
      <div className="flex items-center bg-gray-800 rounded-lg p-1">
        {(Object.keys(panelConfig) as InspectorPanel[]).map(panel => (
          <button
            key={panel}
            onClick={() => onPanelChange(panel)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${activePanel === panel
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }
            `}
          >
            <span>{panelConfig[panel].icon}</span>
            <span className="hidden lg:inline">{panelConfig[panel].label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            p-2 rounded-lg transition-colors
            ${canUndo
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-600 cursor-not-allowed'
            }
          `}
          title={undoDescription ? `Undo: ${undoDescription}` : 'Undo'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`
            p-2 rounded-lg transition-colors
            ${canRedo
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-600 cursor-not-allowed'
            }
          `}
          title={redoDescription ? `Redo: ${redoDescription}` : 'Redo'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="hidden xl:flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Ctrl+Z</kbd>
          <span>Undo</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">V</kbd>
          <span>Voice</span>
        </span>
      </div>
    </div>
  );
};
