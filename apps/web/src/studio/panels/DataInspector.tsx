/**
 * Data Inspector Panel
 * Displays data models, fields, and records
 */

import React, { useState, useMemo } from 'react';
import type { DataModelData, FieldData, Selection } from '../types.js';

interface DataInspectorProps {
  dataModels: DataModelData[];
  data: Record<string, unknown[]>;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
}

// Field type icons and colors
const fieldTypeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  string: { icon: 'Aa', color: 'text-blue-600', bg: 'bg-blue-100' },
  number: { icon: '#', color: 'text-green-600', bg: 'bg-green-100' },
  boolean: { icon: '✓', color: 'text-primary', bg: 'bg-primary/10' },
  date: { icon: '📅', color: 'text-amber-600', bg: 'bg-amber-100' },
  email: { icon: '@', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  url: { icon: '🔗', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  phone: { icon: '📞', color: 'text-teal-600', bg: 'bg-teal-100' },
  image: { icon: '🖼️', color: 'text-pink-600', bg: 'bg-pink-100' },
  file: { icon: '📁', color: 'text-orange-600', bg: 'bg-orange-100' },
  reference: { icon: '↗️', color: 'text-red-600', bg: 'bg-red-100' },
};

// Field type badge
const FieldTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config = fieldTypeConfig[type.toLowerCase()] ?? {
    icon: '?',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color} ${config.bg}`}
    >
      <span>{config.icon}</span>
      <span className="capitalize">{type}</span>
    </span>
  );
};

// Model card component
const ModelCard: React.FC<{
  model: DataModelData;
  recordCount: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ model, recordCount, isSelected, onSelect }) => (
  <div
    onClick={onSelect}
    className={`
      p-4 rounded-lg border-2 cursor-pointer transition-all
      ${isSelected
        ? 'border-primary bg-accent shadow-sm'
        : 'border-border bg-card hover:border-border hover:bg-accent/50'
      }
    `}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📊</span>
        <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
          {model.fields.length} fields
        </span>
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
          {recordCount} records
        </span>
      </div>
    </div>

    {/* Fields preview */}
    <div className="flex flex-wrap gap-1.5">
      {model.fields.slice(0, 5).map(field => (
        <span
          key={field.id}
          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600"
          title={`${field.name} (${field.type})${field.required ? ' - required' : ''}`}
        >
          {field.name}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      ))}
      {model.fields.length > 5 && (
        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-400">
          +{model.fields.length - 5} more
        </span>
      )}
    </div>
  </div>
);

// Field detail component
const FieldDetail: React.FC<{ field: FieldData }> = ({ field }) => (
  <div className="p-3 bg-gray-50 rounded-lg">
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{field.name}</span>
        {field.required && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">Required</span>
        )}
        {field.unique && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">Unique</span>
        )}
      </div>
      <FieldTypeBadge type={field.type} />
    </div>
    
    {/* Reference info */}
    {field.reference && (
      <div className="text-xs text-gray-500 mt-1">
        <span className="text-gray-400">→</span> References {field.reference.targetModel}
        <span className="text-gray-400"> (display: {field.reference.displayField})</span>
      </div>
    )}
    
    {/* Default value */}
    {field.defaultValue !== undefined && (
      <div className="text-xs text-gray-500 mt-1">
        Default: <span className="font-mono">{JSON.stringify(field.defaultValue)}</span>
      </div>
    )}
  </div>
);

// Record table component
const RecordTable: React.FC<{ fields: FieldData[]; records: unknown[] }> = ({ fields, records }) => {
  const displayFields = fields.slice(0, 5);
  const displayRecords = records.slice(0, 10);

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-3xl">📭</span>
        <p className="mt-2">No records in this model</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {displayFields.map(field => (
              <th
                key={field.id}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {field.name}
              </th>
            ))}
            {fields.length > 5 && (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                +{fields.length - 5} more
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayRecords.map((record: any, i) => (
            <tr key={record?.id || i} className="hover:bg-gray-50">
              {displayFields.map(field => (
                <td key={field.id} className="px-3 py-2 text-sm text-gray-900 max-w-32 truncate">
                  {formatValue(record?.[field.id] ?? record?.[field.name])}
                </td>
              ))}
              {fields.length > 5 && (
                <td className="px-3 py-2 text-sm text-gray-400">...</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > 10 && (
        <div className="text-center py-2 text-xs text-gray-500 bg-gray-50">
          Showing 10 of {records.length} records
        </div>
      )}
    </div>
  );
};

// Format cell value
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 30);
  if (typeof value === 'string' && value.length > 30) return value.substring(0, 27) + '...';
  return String(value);
}

export const DataInspector: React.FC<DataInspectorProps> = ({
  dataModels,
  data,
  selection,
  onSelect,
}) => {
  const [viewMode, setViewMode] = useState<'models' | 'detail'>('models');

  // Get selected model
  const selectedModel = useMemo(() => {
    if (!selection || selection.type !== 'dataModel') return null;
    return dataModels.find(m => m.id === selection.id) || null;
  }, [dataModels, selection]);

  // Get records for selected model
  const selectedRecords = useMemo(() => {
    if (!selectedModel) return [];
    // Try both model id and name as keys
    return (data[selectedModel.id] || data[selectedModel.name] || []) as unknown[];
  }, [data, selectedModel]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📊</span>
          Data Inspector
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {dataModels.length} model{dataModels.length !== 1 ? 's' : ''} • {' '}
          {Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)} total records
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {dataModels.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <span className="text-4xl">📊</span>
              <p className="mt-2">No data models in this app</p>
            </div>
          </div>
        ) : selectedModel ? (
          // Model detail view
          <div className="p-4">
            {/* Back button */}
            <button
              onClick={() => onSelect({ type: 'dataModel', id: '' })}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to models
            </button>

            {/* Model header */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedModel.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedModel.fields.length} fields • {selectedRecords.length} records
                  </p>
                </div>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewMode('models')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${viewMode === 'models'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                📋 Schema
              </button>
              <button
                onClick={() => setViewMode('detail')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${viewMode === 'detail'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                💾 Data
              </button>
            </div>

            {viewMode === 'models' ? (
              // Schema view
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Fields
                </h4>
                {selectedModel.fields.map(field => (
                  <FieldDetail key={field.id} field={field} />
                ))}
              </div>
            ) : (
              // Data view
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                  Records
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <RecordTable fields={selectedModel.fields} records={selectedRecords} />
                </div>
              </div>
            )}
          </div>
        ) : (
          // Models list
          <div className="p-4 space-y-3">
            {dataModels.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                recordCount={(data[model.id] || data[model.name] || []).length}
                isSelected={selection?.type === 'dataModel' && selection.id === model.id}
                onSelect={() => onSelect({ type: 'dataModel', id: model.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
