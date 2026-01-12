/**
 * App Explainer
 * Generates natural language explanations of apps for onboarding and Q&A
 */

import type { UnifiedAppSchema } from './dna/schema.js';

export interface AppExplanation {
  overview: string;
  pages: string[];
  entities: string[];
  workflows: string[];
  integrations: string[];
  suggestedUsage: string;
  targetAudience: string;
}

export function explainApp(app: UnifiedAppSchema): AppExplanation {
  const pages = app.pages || [];
  const entities = app.entities || [];
  const workflows = app.workflows || [];
  const integrations = app.integrations || [];

  // Generate overview
  const overview = generateOverview(app, entities, pages);

  // Generate page descriptions
  const pageDescriptions = pages.map(page => {
    const entityName = page.entity ? entities.find(e => e.id === page.entity)?.name : null;
    return `${page.name} (${page.type}${entityName ? ` for ${entityName}` : ''})`;
  });

  // Generate entity descriptions
  const entityDescriptions = entities.map(entity => {
    const fieldCount = entity.fields?.length || 0;
    return `${entity.name} with ${fieldCount} field${fieldCount !== 1 ? 's' : ''}`;
  });

  // Generate workflow descriptions
  const workflowDescriptions = workflows.map(workflow => {
    const trigger = workflow.trigger?.type || 'unknown';
    const actionCount = workflow.actions?.length || 0;
    return `${workflow.name}: triggers on ${trigger} and performs ${actionCount} action${actionCount !== 1 ? 's' : ''}`;
  });

  // Generate integration descriptions
  const integrationDescriptions = integrations
    .filter(i => i.enabled)
    .map(integration => {
      return `${integration.type} integration`;
    });

  // Generate suggested usage
  const suggestedUsage = generateSuggestedUsage(app, entities, workflows);

  // Generate target audience
  const targetAudience = generateTargetAudience(app);

  return {
    overview,
    pages: pageDescriptions,
    entities: entityDescriptions,
    workflows: workflowDescriptions,
    integrations: integrationDescriptions,
    suggestedUsage,
    targetAudience,
  };
}

function generateOverview(
  app: UnifiedAppSchema,
  entities: UnifiedAppSchema['entities'],
  pages: UnifiedAppSchema['pages']
): string {
  const parts: string[] = [];

  parts.push(`This is ${app.name || 'an app'}.`);

  if (app.description) {
    parts.push(app.description);
  }

  if (entities.length > 0) {
    const entityNames = entities.map(e => e.name).join(', ');
    parts.push(`It manages ${entities.length} type${entities.length !== 1 ? 's' : ''} of data: ${entityNames}.`);
  }

  if (pages.length > 0) {
    parts.push(`The app has ${pages.length} page${pages.length !== 1 ? 's' : ''} for viewing and managing this data.`);
  }

  if (app.industry) {
    parts.push(`It's designed for the ${app.industry} industry.`);
  }

  return parts.join(' ');
}

function generateSuggestedUsage(
  app: UnifiedAppSchema,
  entities: UnifiedAppSchema['entities'],
  workflows: UnifiedAppSchema['workflows']
): string {
  const parts: string[] = [];

  if (entities.length > 0) {
    const primaryEntity = entities[0];
    parts.push(`Start by creating ${primaryEntity.pluralName.toLowerCase()}.`);
  }

  const hasListPages = app.pages?.some(p => p.type === 'list' || p.type === 'table');
  if (hasListPages) {
    parts.push('Use the list pages to browse and search your data.');
  }

  const hasForms = app.pages?.some(p => p.type === 'form');
  if (hasForms) {
    parts.push('Use form pages to create and edit records.');
  }

  const hasWorkflows = workflows.length > 0;
  if (hasWorkflows) {
    parts.push('The app has automated workflows that will run when certain events occur.');
  }

  const hasDashboard = app.pages?.some(p => p.type === 'dashboard');
  if (hasDashboard) {
    parts.push('Check the dashboard for an overview of your data and key metrics.');
  }

  return parts.join(' ') || 'This app is ready to use. Start by exploring the pages and creating your first records.';
}

function generateTargetAudience(app: UnifiedAppSchema): string {
  if (app.industry) {
    return `This app is designed for ${app.industry} professionals and businesses.`;
  }

  if (app.behavior) {
    return `This app follows the ${app.behavior} behavior pattern.`;
  }

  return 'This app is designed for general use.';
}

/**
 * Answer a specific question about the app
 */
export function answerQuestion(app: UnifiedAppSchema, question: string): string {
  const normalized = question.toLowerCase().trim();
  const explanation = explainApp(app);

  if (normalized.includes('what can') || normalized.includes('what does')) {
    return explanation.overview;
  }

  if (normalized.includes('page')) {
    if (explanation.pages.length === 0) {
      return 'This app does not have any pages yet.';
    }
    return `This app has ${explanation.pages.length} page${explanation.pages.length !== 1 ? 's' : ''}: ${explanation.pages.join(', ')}.`;
  }

  if (normalized.includes('workflow') || normalized.includes('automation')) {
    if (explanation.workflows.length === 0) {
      return 'This app does not have any automated workflows yet.';
    }
    return `This app has ${explanation.workflows.length} workflow${explanation.workflows.length !== 1 ? 's' : ''}: ${explanation.workflows.join(', ')}.`;
  }

  if (normalized.includes('integration') || normalized.includes('connect')) {
    if (explanation.integrations.length === 0) {
      return 'This app does not have any integrations connected yet.';
    }
    return `This app has ${explanation.integrations.length} integration${explanation.integrations.length !== 1 ? 's' : ''}: ${explanation.integrations.join(', ')}.`;
  }

  if (normalized.includes('entity') || normalized.includes('data') || normalized.includes('model')) {
    if (explanation.entities.length === 0) {
      return 'This app does not have any data models yet.';
    }
    return `This app manages ${explanation.entities.length} type${explanation.entities.length !== 1 ? 's' : ''} of data: ${explanation.entities.join(', ')}.`;
  }

  if (normalized.includes('who') || normalized.includes('audience') || normalized.includes('for')) {
    return explanation.targetAudience;
  }

  if (normalized.includes('how') || normalized.includes('use') || normalized.includes('start')) {
    return explanation.suggestedUsage;
  }

  // Default: return overview
  return explanation.overview;
}
