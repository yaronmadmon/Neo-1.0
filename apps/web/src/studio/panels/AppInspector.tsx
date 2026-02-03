/**
 * App Inspector Panel
 * Displays app-level information, settings, and metadata
 */

import React from 'react';
import type { AppData, ThemeData } from '../types.js';

interface AppInspectorProps {
  app: AppData | null;
}

// Color swatch component
const ColorSwatch: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <div className="flex items-center gap-2">
    <div
      className="w-6 h-6 rounded border border-gray-200 shadow-sm"
      style={{ backgroundColor: color }}
      title={color}
    />
    <div>
      <span className="text-sm font-medium text-gray-700 capitalize">{name}</span>
      <span className="text-xs text-gray-400 ml-2">{color}</span>
    </div>
  </div>
);

// Stats card component
const StatCard: React.FC<{ icon: string; label: string; value: number | string; color?: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="bg-muted rounded-lg p-3 text-center">
    <span className="text-2xl">{icon}</span>
    <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

export const AppInspector: React.FC<AppInspectorProps> = ({ app }) => {
  if (!app) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>📱</span>
            App Inspector
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
          <div className="text-center">
            <span className="text-4xl">📱</span>
            <p className="mt-2">No app loaded</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const pageCount = app.schema.pages.length;
  const componentCount = app.schema.components.length;
  const dataModelCount = app.schema.dataModels.length;
  const flowCount = app.schema.flows.length;
  
  // Count total records
  const recordCount = Object.values(app.data || {}).reduce(
    (sum, records) => sum + (Array.isArray(records) ? records.length : 0),
    0
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📱</span>
          App Inspector
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* App Header */}
        <div className="p-4 bg-primary text-primary-foreground">
          <h3 className="text-2xl font-bold">{app.name}</h3>
          {app.description && (
            <p className="text-white/80 mt-1 text-sm">{app.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
            <span className="capitalize">📁 {app.category}</span>
            <span>v{app.version}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-4">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
            Statistics
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-3 text-center">
              <span className="text-2xl">📄</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{pageCount}</div>
              <div className="text-xs text-gray-600">Pages</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <span className="text-2xl">🧩</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{componentCount}</div>
              <div className="text-xs text-gray-600">Components</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <span className="text-2xl">📊</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{dataModelCount}</div>
              <div className="text-xs text-gray-600">Data Models</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <span className="text-2xl">⚡</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{flowCount}</div>
              <div className="text-xs text-gray-600">Workflows</div>
            </div>
          </div>
          <div className="mt-3 bg-gray-50 rounded-lg p-3 text-center">
            <span className="text-2xl">💾</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{recordCount}</div>
            <div className="text-xs text-gray-600">Data Records</div>
          </div>
        </div>

        {/* Metadata */}
        <div className="p-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
            Metadata
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">App ID</span>
              <span className="text-sm font-mono text-gray-900">{app.id.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Version</span>
              <span className="text-sm text-gray-900">{app.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Category</span>
              <span className="text-sm text-gray-900 capitalize">{app.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created</span>
              <span className="text-sm text-gray-900">
                {new Date(app.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Updated</span>
              <span className="text-sm text-gray-900">
                {new Date(app.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        {app.theme?.colors && (
          <div className="p-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Theme Colors
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(app.theme.colors).map(([name, color]) => (
                <ColorSwatch key={name} name={name} color={color} />
              ))}
            </div>
          </div>
        )}

        {/* Pages List */}
        <div className="p-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
            Pages
          </h4>
          <div className="space-y-2">
            {app.schema.pages.map(page => (
              <div
                key={page.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>📄</span>
                <span className="text-sm font-medium text-gray-900">{page.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{page.route}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Models List */}
        {app.schema.dataModels.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Data Models
            </h4>
            <div className="space-y-2">
              {app.schema.dataModels.map(model => (
                <div
                  key={model.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span>📊</span>
                  <span className="text-sm font-medium text-gray-900">{model.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {model.fields.length} fields
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
