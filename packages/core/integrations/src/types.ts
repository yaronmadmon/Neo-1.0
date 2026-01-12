/**
 * Integrations Engine Types
 * Type definitions for the integrations system
 */

export type IntegrationProviderId =
  | "stripe"
  | "twilio"
  | "email"
  | "webhook"
  | "rest_api"
  | "google_sheets"
  | "google_calendar"
  | "notion"
  | "airtable"
  | "zapier";

export interface IntegrationConfig {
  providerId: IntegrationProviderId;
  appId: string;
  displayName?: string;
  settings: Record<string, any>; // apiKey, baseUrl, etc.
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationActionContext {
  appId: string;
  userId?: string;
  payload: any;
  variables?: Record<string, any>;
}

export interface IntegrationActionResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export type IntegrationActionHandler = (
  actionId: string,
  ctx: IntegrationActionContext,
  config: IntegrationConfig
) => Promise<IntegrationActionResult>;

export interface IntegrationProvider {
  id: IntegrationProviderId;
  displayName: string;
  description: string;
  actions: IntegrationAction[];
  requiredSettings: string[];
  optionalSettings?: string[];
}

export interface IntegrationAction {
  id: string;
  displayName: string;
  description: string;
  handler: IntegrationActionHandler;
  requiredParams?: string[];
  optionalParams?: string[];
}
