/**
 * REST API Integration Provider
 */

import type { IntegrationActionHandler, IntegrationActionContext, IntegrationActionResult, IntegrationConfig } from '../types.js';
import { integrationRegistry } from '../registry.js';
import type { IntegrationProvider } from '../types.js';

async function restGet(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { path, headers = {} } = ctx.payload;
  const baseUrl = config.settings.baseUrl;
  const url = `${baseUrl}${path || ''}`;

  // Mock implementation
  // const response = await fetch(url, {
  //   method: 'GET',
  //   headers: {
  //     'Authorization': `Bearer ${config.settings.apiKey}`,
  //     ...headers,
  //   },
  // });

  return {
    success: true,
    data: {
      url,
      method: 'GET',
      statusCode: 200,
    },
  };
}

async function restPost(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { path, body, headers = {} } = ctx.payload;
  const baseUrl = config.settings.baseUrl;
  const url = `${baseUrl}${path || ''}`;

  // Mock implementation
  // const response = await fetch(url, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${config.settings.apiKey}`,
  //     ...headers,
  //   },
  //   body: JSON.stringify(body),
  // });

  return {
    success: true,
    data: {
      url,
      method: 'POST',
      statusCode: 200,
    },
  };
}

async function restPut(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { path, body, headers = {} } = ctx.payload;
  const baseUrl = config.settings.baseUrl;
  const url = `${baseUrl}${path || ''}`;

  // Mock implementation
  return {
    success: true,
    data: {
      url,
      method: 'PUT',
      statusCode: 200,
    },
  };
}

async function restDelete(
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
): Promise<IntegrationActionResult> {
  const { path, headers = {} } = ctx.payload;
  const baseUrl = config.settings.baseUrl;
  const url = `${baseUrl}${path || ''}`;

  // Mock implementation
  return {
    success: true,
    data: {
      url,
      method: 'DELETE',
      statusCode: 200,
    },
  };
}

export function registerRestProvider(): void {
  const provider: IntegrationProvider = {
    id: 'rest_api',
    displayName: 'REST API',
    description: 'Generic REST API connector',
    requiredSettings: ['baseUrl'],
    optionalSettings: ['apiKey', 'authType', 'headers'],
    actions: [
      {
        id: 'get',
        displayName: 'GET Request',
        description: 'Make a GET request',
        handler: restGet,
        optionalParams: ['path', 'headers'],
      },
      {
        id: 'post',
        displayName: 'POST Request',
        description: 'Make a POST request',
        handler: restPost,
        optionalParams: ['path', 'body', 'headers'],
      },
      {
        id: 'put',
        displayName: 'PUT Request',
        description: 'Make a PUT request',
        handler: restPut,
        optionalParams: ['path', 'body', 'headers'],
      },
      {
        id: 'delete',
        displayName: 'DELETE Request',
        description: 'Make a DELETE request',
        handler: restDelete,
        optionalParams: ['path', 'headers'],
      },
    ],
  };

  integrationRegistry.registerProvider(provider);
}
