/**
 * Workflow Inspector Panel
 * Displays flows, triggers, and actions
 */

import React, { useMemo } from 'react';
import type { FlowData, FlowActionData, Selection } from '../types.js';

interface WorkflowInspectorProps {
  flows: FlowData[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}

// Trigger type icons and colors
const triggerConfig: Record<string, { icon: string; label: string; color: string }> = {
  button_click: { icon: '🔘', label: 'Button Click', color: 'bg-blue-100 text-blue-700' },
  form_submit: { icon: '📋', label: 'Form Submit', color: 'bg-green-100 text-green-700' },
  data_create: { icon: '➕', label: 'Data Create', color: 'bg-primary/10 text-primary' },
  data_update: { icon: '✏️', label: 'Data Update', color: 'bg-amber-100 text-amber-700' },
  data_delete: { icon: '🗑️', label: 'Data Delete', color: 'bg-red-100 text-red-700' },
};

// Action type icons
const actionConfig: Record<string, { icon: string; label: string; color: string }> = {
  create_record: { icon: '➕', label: 'Create Record', color: 'bg-green-100 text-green-700' },
  update_record: { icon: '✏️', label: 'Update Record', color: 'bg-blue-100 text-blue-700' },
  delete_record: { icon: '🗑️', label: 'Delete Record', color: 'bg-red-100 text-red-700' },
  navigate: { icon: '🧭', label: 'Navigate', color: 'bg-primary/10 text-primary' },
  show_notification: { icon: '🔔', label: 'Show Notification', color: 'bg-amber-100 text-amber-700' },
  refresh_data: { icon: '🔄', label: 'Refresh Data', color: 'bg-cyan-100 text-cyan-700' },
};

// Trigger badge
const TriggerBadge: React.FC<{ type: string }> = ({ type }) => {
  const config = triggerConfig[type.toLowerCase()] ?? {
    icon: '⚡',
    label: type,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

// Action step component
const ActionStep: React.FC<{ action: FlowActionData; index: number }> = ({ action, index }) => {
  const config = actionConfig[action.type.toLowerCase()] ?? {
    icon: '⚡',
    label: action.type,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      {/* Step number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
        {index + 1}
      </div>

      {/* Action details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        </div>

        {/* Action-specific details */}
        <div className="text-xs text-gray-500 space-y-0.5">
          {action.modelId && (
            <div>Model: <span className="font-medium text-gray-700">{action.modelId}</span></div>
          )}
          {action.targetPageId && (
            <div>Page: <span className="font-medium text-gray-700">{action.targetPageId}</span></div>
          )}
          {action.message && (
            <div>Message: <span className="font-medium text-gray-700">"{action.message}"</span></div>
          )}
          {action.data && Object.keys(action.data).length > 0 && (
            <div>Data: <span className="font-mono text-gray-600">{JSON.stringify(action.data).substring(0, 50)}...</span></div>
          )}
        </div>
      </div>
    </div>
  );
};

// Flow card component
const FlowCard: React.FC<{
  flow: FlowData;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ flow, isSelected, onSelect }) => (
  <div
    onClick={onSelect}
    className={`
      p-4 rounded-lg border-2 cursor-pointer transition-all
      ${isSelected
        ? 'border-primary bg-accent shadow-sm'
        : 'border-border bg-card hover:border-border hover:bg-accent/50'
      }
      ${!flow.enabled ? 'opacity-60' : ''}
    `}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚡</span>
        <div>
          <h3 className="font-semibold text-gray-900">{flow.name}</h3>
          {flow.description && (
            <p className="text-xs text-gray-500 mt-0.5">{flow.description}</p>
          )}
        </div>
      </div>
      
      {/* Status badge */}
      {!flow.enabled && (
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
          Disabled
        </span>
      )}
    </div>

    {/* Trigger and actions summary */}
    <div className="flex items-center gap-2 flex-wrap">
      <TriggerBadge type={flow.trigger.type} />
      <span className="text-gray-400">→</span>
      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
        {flow.actions.length} action{flow.actions.length !== 1 ? 's' : ''}
      </span>
    </div>

    {/* Component binding */}
    {flow.trigger.componentId && (
      <div className="mt-2 text-xs text-gray-500">
        Bound to: <span className="font-medium">{flow.trigger.componentId}</span>
      </div>
    )}
  </div>
);

export const WorkflowInspector: React.FC<WorkflowInspectorProps> = ({
  flows,
  selection,
  onSelect,
}) => {
  // Get selected flow
  const selectedFlow = useMemo(() => {
    if (!selection || selection.type !== 'flow') return null;
    return flows.find(f => f.id === selection.id) || null;
  }, [flows, selection]);

  // Count active flows
  const activeFlows = flows.filter(f => f.enabled).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>⚡</span>
          Workflow Inspector
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {flows.length} workflow{flows.length !== 1 ? 's' : ''} • {activeFlows} active
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {flows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <span className="text-4xl">⚡</span>
              <p className="mt-2">No workflows in this app</p>
              <p className="text-sm">Workflows automate actions like form submissions</p>
            </div>
          </div>
        ) : selectedFlow ? (
          // Flow detail view
          <div className="p-4">
            {/* Back button */}
            <button
              onClick={() => onSelect({ type: 'flow', id: '' })}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to workflows
            </button>

            {/* Flow header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚡</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedFlow.name}</h3>
                    {selectedFlow.description && (
                      <p className="text-sm text-gray-600">{selectedFlow.description}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${selectedFlow.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {selectedFlow.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Trigger section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>🎯</span> Trigger
              </h4>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TriggerBadge type={selectedFlow.trigger.type} />
                </div>
                {selectedFlow.trigger.componentId && (
                  <div className="text-sm text-gray-600">
                    Component: <span className="font-medium">{selectedFlow.trigger.componentId}</span>
                  </div>
                )}
                {selectedFlow.trigger.modelId && (
                  <div className="text-sm text-gray-600">
                    Model: <span className="font-medium">{selectedFlow.trigger.modelId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>🎬</span> Actions
              </h4>
              <div className="space-y-2 relative">
                {/* Connecting line */}
                <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-gray-200" />
                
                {selectedFlow.actions.map((action, index) => (
                  <ActionStep key={index} action={action} index={index} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Flows list
          <div className="p-4 space-y-3">
            {flows.map(flow => (
              <FlowCard
                key={flow.id}
                flow={flow}
                isSelected={selection?.type === 'flow' && selection.id === flow.id}
                onSelect={() => onSelect({ type: 'flow', id: flow.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
