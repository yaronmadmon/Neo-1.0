/**
 * AI Suggestions Panel
 * Shows app analysis, insights, and improvement suggestions
 */

import React, { useState, useEffect } from 'react';
import type { AppData } from '../types.js';

interface AppInsight {
  id: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  suggestion?: string;
  autoFixable?: boolean;
}

interface ProposedChange {
  id: string;
  type: string;
  description: string;
  insightId: string;
  estimatedImpact?: 'low' | 'medium' | 'high';
  requiresConfirmation?: boolean;
}

interface AppImprovementPlan {
  id: string;
  summary: string;
  insights: AppInsight[];
  proposedChanges: ProposedChange[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'critical';
  healthScore: number;
}

interface AISuggestionsPanelProps {
  appId: string;
  app: AppData | null;
  onApplyChanges?: (changeIds: string[]) => Promise<void>;
}

export const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({
  appId,
  app,
  onApplyChanges,
}) => {
  const [plan, setPlan] = useState<AppImprovementPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (app) {
      analyzeApp();
    }
  }, [app]);

  const analyzeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert AppData to UnifiedAppSchema format
      const schema = convertAppDataToSchema(app!);

      // Call analysis API (or use client-side analysis)
      const response = await fetch('/api/apps/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema }),
      });

      if (!response.ok) {
        // Fallback to client-side analysis
        const { appInsightsEngine } = await import('@neo/blueprint-engine');
        const analysisPlan = appInsightsEngine.analyzeApp(schema);
        setPlan(analysisPlan);
      } else {
        const data = await response.json();
        setPlan(data.plan);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze app');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const convertAppDataToSchema = (appData: AppData): any => {
    return {
      id: appData.id,
      name: appData.name,
      description: appData.description,
      entities: appData.schema.dataModels.map(model => ({
        id: model.id,
        name: model.name,
        pluralName: model.name + 's',
        fields: model.fields.map(field => ({
          id: field.id,
          name: field.name,
          type: field.type,
          required: field.required,
        })),
      })),
      pages: appData.schema.pages,
      workflows: appData.schema.flows.map(flow => ({
        id: flow.id,
        name: flow.name,
        description: flow.description,
        enabled: flow.enabled,
        trigger: flow.trigger,
        actions: flow.actions,
      })),
      theme: appData.theme,
      permissions: undefined, // Add if available
    };
  };

  const handleToggleChange = (changeId: string) => {
    const newSelected = new Set(selectedChanges);
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId);
    } else {
      newSelected.add(changeId);
    }
    setSelectedChanges(newSelected);
  };

  const handleSelectAllAutoFixable = () => {
    if (!plan) return;
    const autoFixable = plan.proposedChanges.filter(c => !c.requiresConfirmation);
    setSelectedChanges(new Set(autoFixable.map(c => c.id)));
  };

  const handleApplyChanges = async () => {
    if (selectedChanges.size === 0) return;

    try {
      setApplying(true);
      
      if (onApplyChanges) {
        await onApplyChanges(Array.from(selectedChanges));
      } else {
        // Default: call API
        const response = await fetch(`/api/apps/${appId}/improve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            changeIds: Array.from(selectedChanges),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to apply changes');
        }
      }

      // Refresh analysis
      await analyzeApp();
      setSelectedChanges(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'needs_improvement': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-300';
      case 'warning': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'info': return 'text-blue-700 bg-blue-100 border-blue-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Analyzing app...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
        <button
          onClick={analyzeApp}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6">
        <div className="text-gray-500">No analysis available</div>
      </div>
    );
  }

  const autoFixableCount = plan.proposedChanges.filter(c => !c.requiresConfirmation).length;
  const criticalInsights = plan.insights.filter(i => i.severity === 'critical');
  const warningInsights = plan.insights.filter(i => i.severity === 'warning');
  const infoInsights = plan.insights.filter(i => i.severity === 'info');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Suggestions</h2>
        <button
          onClick={analyzeApp}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Refresh Analysis
        </button>
      </div>

      {/* Health Summary */}
      <div className="p-4 bg-white border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">App Health</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(plan.overallHealth)}`}>
            {plan.overallHealth.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          Score: {plan.healthScore}/100
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              plan.healthScore >= 75 ? 'bg-green-500' :
              plan.healthScore >= 50 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${plan.healthScore}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-700">{plan.summary}</p>
      </div>

      {/* Insights by Severity */}
      <div className="space-y-4">
        {criticalInsights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-red-700">Critical Issues ({criticalInsights.length})</h3>
            <div className="space-y-2">
              {criticalInsights.map(insight => (
                <div
                  key={insight.id}
                  className={`p-4 border rounded-lg ${getSeverityColor(insight.severity)}`}
                >
                  <div className="font-semibold">{insight.title}</div>
                  <div className="text-sm mt-1">{insight.description}</div>
                  {insight.suggestion && (
                    <div className="text-sm mt-2 italic">{insight.suggestion}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {warningInsights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-yellow-700">Warnings ({warningInsights.length})</h3>
            <div className="space-y-2">
              {warningInsights.map(insight => (
                <div
                  key={insight.id}
                  className={`p-4 border rounded-lg ${getSeverityColor(insight.severity)}`}
                >
                  <div className="font-semibold">{insight.title}</div>
                  <div className="text-sm mt-1">{insight.description}</div>
                  {insight.suggestion && (
                    <div className="text-sm mt-2 italic">{insight.suggestion}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {infoInsights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-blue-700">Suggestions ({infoInsights.length})</h3>
            <div className="space-y-2">
              {infoInsights.map(insight => (
                <div
                  key={insight.id}
                  className={`p-4 border rounded-lg ${getSeverityColor(insight.severity)}`}
                >
                  <div className="font-semibold">{insight.title}</div>
                  <div className="text-sm mt-1">{insight.description}</div>
                  {insight.suggestion && (
                    <div className="text-sm mt-2 italic">{insight.suggestion}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Proposed Changes */}
      {plan.proposedChanges.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Proposed Changes ({plan.proposedChanges.length})</h3>
            {autoFixableCount > 0 && (
              <button
                onClick={handleSelectAllAutoFixable}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
              >
                Select All Auto-Fixable ({autoFixableCount})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {plan.proposedChanges.map(change => (
              <div
                key={change.id}
                className="p-4 bg-white border rounded-lg flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  checked={selectedChanges.has(change.id)}
                  onChange={() => handleToggleChange(change.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold">{change.description}</div>
                  {change.estimatedImpact && (
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                      change.estimatedImpact === 'high' ? 'bg-red-100 text-red-700' :
                      change.estimatedImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {change.estimatedImpact} impact
                    </span>
                  )}
                  {change.requiresConfirmation && (
                    <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                      Requires confirmation
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {selectedChanges.size > 0 && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleApplyChanges}
                disabled={applying}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {applying ? 'Applying...' : `Apply ${selectedChanges.size} Change${selectedChanges.size !== 1 ? 's' : ''}`}
              </button>
              <button
                onClick={() => setSelectedChanges(new Set())}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}

      {plan.proposedChanges.length === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
          🎉 Great! No improvements needed. Your app is in excellent shape!
        </div>
      )}
    </div>
  );
};
