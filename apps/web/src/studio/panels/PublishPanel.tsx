/**
 * Publish Panel
 * 
 * Manages app publishing, versioning, and rollback.
 */

import React, { useState, useEffect } from 'react';

interface AppVersion {
  id: string;
  version: string;
  environment: 'draft' | 'staging' | 'production';
  description?: string;
  createdAt: string;
  publishedAt?: string;
  isCurrent: boolean;
  isActive: boolean;
}

interface PublishPanelProps {
  appId: string;
}

export const PublishPanel: React.FC<PublishPanelProps> = ({ appId }) => {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishEnvironment, setPublishEnvironment] = useState<'staging' | 'production'>('staging');
  const [publishDescription, setPublishDescription] = useState('');
  const [currentProduction, setCurrentProduction] = useState<AppVersion | null>(null);
  const [currentStaging, setCurrentStaging] = useState<AppVersion | null>(null);

  // Fetch versions
  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/apps/${appId}/versions`);
      const data = await response.json();
      
      if (data.success) {
        setVersions(data.versions || []);
        setCurrentProduction(data.versions?.find((v: AppVersion) => v.environment === 'production' && v.isCurrent) || null);
        setCurrentStaging(data.versions?.find((v: AppVersion) => v.environment === 'staging' && v.isCurrent) || null);
      } else {
        setError(data.error || 'Failed to fetch versions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appId) {
      fetchVersions();
    }
  }, [appId]);

  // Publish app
  const handlePublish = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/apps/${appId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment: publishEnvironment,
          description: publishDescription || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPublishDescription('');
        await fetchVersions();
      } else {
        setError(data.error || 'Publish failed');
      }
    } catch (err: any) {
      setError(err.message || 'Publish failed');
    } finally {
      setLoading(false);
    }
  };

  // Rollback to previous version
  const handleRollback = async () => {
    if (!confirm('Rollback to previous version?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/apps/${appId}/rollback/previous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment: publishEnvironment,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchVersions();
      } else {
        setError(data.error || 'Rollback failed');
      }
    } catch (err: any) {
      setError(err.message || 'Rollback failed');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>🚀</span>
          Publish & Deploy
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Current Versions */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Versions</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-600 font-medium uppercase">Production</div>
              {currentProduction ? (
                <>
                  <div className="text-lg font-bold text-gray-900 mt-1">v{currentProduction.version}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatDate(currentProduction.publishedAt || currentProduction.createdAt)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 mt-1">Not published</div>
              )}
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-xs text-purple-600 font-medium uppercase">Staging</div>
              {currentStaging ? (
                <>
                  <div className="text-lg font-bold text-gray-900 mt-1">v{currentStaging.version}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatDate(currentStaging.publishedAt || currentStaging.createdAt)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 mt-1">Not published</div>
              )}
            </div>
          </div>
        </div>

        {/* Publish Form */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Publish New Version</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Environment
              </label>
              <select
                value={publishEnvironment}
                onChange={(e) => setPublishEnvironment(e.target.value as 'staging' | 'production')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                placeholder="What's new in this version?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <button
              onClick={handlePublish}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Publishing...' : `Publish to ${publishEnvironment}`}
            </button>
          </div>
        </div>

        {/* Rollback */}
        {currentProduction && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Rollback</h3>
            <p className="text-xs text-gray-600 mb-3">
              Rollback to the previous version of {publishEnvironment}.
            </p>
            <button
              onClick={handleRollback}
              disabled={loading}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Rolling back...' : 'Rollback to Previous Version'}
            </button>
          </div>
        )}

        {/* Version History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
            <button
              onClick={fetchVersions}
              disabled={loading}
              className="text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          
          {loading && versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No versions yet</div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border ${
                    version.isCurrent
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">v{version.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          version.environment === 'production'
                            ? 'bg-red-100 text-red-700'
                            : version.environment === 'staging'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {version.environment}
                        </span>
                        {version.isCurrent && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      {version.description && (
                        <div className="text-xs text-gray-600 mt-1">{version.description}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(version.publishedAt || version.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
