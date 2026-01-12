/**
 * Integrations Panel
 * Manage app integrations
 */

import React, { useState, useEffect } from 'react';
import type { AppData } from '../types.js';

interface Integration {
  id: string;
  displayName: string;
  description: string;
  enabled: boolean;
  settings: Record<string, any>;
  provider?: {
    id: string;
    displayName: string;
    description: string;
    requiredSettings: string[];
    optionalSettings?: string[];
  };
}

interface AvailableProvider {
  id: string;
  displayName: string;
  description: string;
  requiredSettings: string[];
  optionalSettings?: string[];
}

interface IntegrationsPanelProps {
  appId: string;
}

export const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({ appId }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, [appId]);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/apps/${appId}/integrations`);
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      setIntegrations(data.integrations || []);
      setAvailableProviders(data.availableProviders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = availableProviders.find(p => p.id === providerId);
    if (provider) {
      const initialForm: Record<string, string> = {};
      provider.requiredSettings.forEach(setting => {
        initialForm[setting] = '';
      });
      setConfigForm(initialForm);
    }
  };

  const handleSave = async () => {
    if (!selectedProvider) return;

    try {
      const provider = availableProviders.find(p => p.id === selectedProvider);
      if (!provider) return;

      // Validate required fields
      const missing = provider.requiredSettings.filter(s => !configForm[s]);
      if (missing.length > 0) {
        setError(`Missing required fields: ${missing.join(', ')}`);
        return;
      }

      const response = await fetch(`/api/apps/${appId}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProvider,
          settings: configForm,
          enabled: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to save integration');

      await fetchIntegrations();
      setSelectedProvider(null);
      setConfigForm({});
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDisable = async (providerId: string) => {
    try {
      const response = await fetch(`/api/apps/${appId}/integrations/${providerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to disable integration');

      await fetchIntegrations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTest = async (providerId: string) => {
    try {
      setTesting(providerId);
      const response = await fetch(`/api/apps/${appId}/integrations/${providerId}/test`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Test failed');
      const data = await response.json();

      if (data.test?.success) {
        alert('Connection test successful!');
      } else {
        alert('Connection test failed');
      }
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading integrations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Integrations</h2>
        <button
          onClick={() => setSelectedProvider(null)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Integration
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Configure Integration Form */}
      {selectedProvider && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">
            Configure {availableProviders.find(p => p.id === selectedProvider)?.displayName}
          </h3>
          <div className="space-y-4">
            {availableProviders
              .find(p => p.id === selectedProvider)
              ?.requiredSettings.map(setting => (
                <div key={setting}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {setting.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <input
                    type={setting.toLowerCase().includes('password') || setting.toLowerCase().includes('token') || setting.toLowerCase().includes('key') ? 'password' : 'text'}
                    value={configForm[setting] || ''}
                    onChange={e => setConfigForm({ ...configForm, [setting]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${setting}`}
                  />
                </div>
              ))}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setSelectedProvider(null);
                  setConfigForm({});
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enabled Integrations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Enabled Integrations</h3>
        {integrations.filter(i => i.enabled).length === 0 ? (
          <div className="text-gray-500 p-4 bg-gray-50 rounded">
            No integrations enabled. Click "Add Integration" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {integrations
              .filter(i => i.enabled)
              .map(integration => (
                <div key={integration.id} className="p-4 bg-white border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{integration.provider?.displayName || integration.displayName}</h4>
                      <p className="text-sm text-gray-600">{integration.provider?.description || integration.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTest(integration.id)}
                        disabled={testing === integration.id}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
                      >
                        {testing === integration.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleDisable(integration.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        Disable
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Available Providers */}
      {!selectedProvider && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableProviders.map(provider => {
              const isEnabled = integrations.some(i => i.id === provider.id && i.enabled);
              return (
                <div
                  key={provider.id}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    isEnabled
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}
                  onClick={() => !isEnabled && handleConnect(provider.id)}
                >
                  <h4 className="font-semibold">{provider.displayName}</h4>
                  <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                  {isEnabled && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Enabled
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
