/**
 * AI Context Provider
 * Generates context about available kits and integrations for AI system prompts
 */

import type { IndustryKit } from '@neo/blueprint-engine';
import type { CertaintyLedger, SlotValue } from '@neo/ai-engine';

/**
 * Kit summary for AI context
 */
export interface KitSummary {
  id: string;
  name: string;
  keywords: string[];
  professions: string[];
  keyEntities: string[];
}

/**
 * Integration summary for AI context
 */
export interface IntegrationSummary {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

/**
 * Available integrations (hardcoded since they don't change frequently)
 */
const AVAILABLE_INTEGRATIONS: IntegrationSummary[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing',
    capabilities: ['charge customers', 'create invoices', 'manage subscriptions'],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'SMS and voice',
    capabilities: ['send SMS messages', 'make voice calls', 'appointment reminders'],
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Email communications',
    capabilities: ['send emails', 'email templates', 'automated notifications'],
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    description: 'HTTP webhooks',
    capabilities: ['trigger external services', 'receive external events'],
  },
  {
    id: 'rest_api',
    name: 'REST API',
    description: 'Custom API integration',
    capabilities: ['connect to any REST API', 'custom HTTP requests'],
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Spreadsheet integration',
    capabilities: ['sync data to spreadsheets', 'import from sheets'],
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Calendar integration',
    capabilities: ['sync appointments', 'calendar events', 'scheduling'],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Notion workspace integration',
    capabilities: ['sync data to Notion', 'create pages'],
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Airtable integration',
    capabilities: ['sync data to Airtable', 'import records'],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Zapier automation',
    capabilities: ['connect to 5000+ apps via Zapier', 'automated workflows'],
  },
];

/**
 * Features NOT currently available (for AI to offer alternatives)
 */
const UNAVAILABLE_FEATURES = [
  'fax',
  'document signing (DocuSign, etc.)',
  'accounting software (QuickBooks, Xero)',
  'social media posting',
  'video conferencing integration',
  'AI chatbots',
  'custom mobile apps',
  'hardware integrations (POS terminals, printers)',
];

/**
 * Available UI components
 */
const AVAILABLE_COMPONENTS = [
  'list',
  'table',
  'form',
  'card',
  'calendar',
  'kanban',
  'dashboard',
  'charts',
  'detail-view',
  'modal',
  'tabs',
  'sidebar',
];

/**
 * Available workflow actions
 */
const AVAILABLE_WORKFLOWS = [
  'create_record',
  'update_record',
  'delete_record',
  'send_notification',
  'send_email',
  'send_sms',
  'trigger_webhook',
  'schedule_reminder',
  'status_change',
  'generate_pdf',
];

/**
 * Inventory context for AI prompts
 */
export interface InventoryContext {
  components: string[];
  integrations: string[];
  workflows: string[];
  unavailable: string[];
}

/**
 * Get available inventory for AI prompts
 * This helps prevent hallucination by telling the AI what's actually available
 */
export function getAvailableInventory(): InventoryContext {
  return {
    components: AVAILABLE_COMPONENTS,
    integrations: AVAILABLE_INTEGRATIONS.map(i => i.id),
    workflows: AVAILABLE_WORKFLOWS,
    unavailable: UNAVAILABLE_FEATURES,
  };
}

/**
 * Generate inventory context for AI system prompt
 */
export function generateInventoryContextForAI(): string {
  const inventory = getAvailableInventory();
  
  return `
AVAILABLE FEATURES (suggest only from this list):
- UI Components: ${inventory.components.join(', ')}
- Integrations: ${AVAILABLE_INTEGRATIONS.map(i => i.name).join(', ')}
- Workflows: ${inventory.workflows.join(', ')}

UNAVAILABLE (do not suggest these):
${inventory.unavailable.map(f => `- ${f}`).join('\n')}

When users request unavailable features, acknowledge the limitation and suggest alternatives.
`;};

/**
 * Generate a kit summary from an IndustryKit
 */
export function summarizeKit(kit: IndustryKit): KitSummary {
  return {
    id: kit.id,
    name: kit.name,
    keywords: kit.keywords,
    professions: kit.professions,
    keyEntities: kit.entities.slice(0, 4).map(e => e.name),
  };
}

/**
 * Generate kit summaries from list of kits
 */
export function summarizeKits(kits: IndustryKit[]): KitSummary[] {
  return kits.map(summarizeKit);
}

/**
 * Generate AI context string for available industry kits
 */
export function generateKitContextForAI(kits: IndustryKit[]): string {
  const summaries = summarizeKits(kits);
  
  const kitLines = summaries.map(kit => {
    return `- ${kit.id}: "${kit.name}" - for ${kit.professions.join(', ')}. Key entities: ${kit.keyEntities.join(', ')}`;
  });

  return `
AVAILABLE INDUSTRY KITS (${summaries.length} total):
${kitLines.join('\n')}

IMPORTANT MATCHING GUIDANCE:
- Match user requests to the most appropriate kit based on industry keywords and professions
- If no exact match exists, recommend the closest kit and explain what adaptations may be needed
- "general_business" is the fallback for industries without a specific kit
- Be transparent when recommending a kit that isn't a perfect match

COMMON MAPPINGS:
- Veterinary/Pet services → Use "medical" kit (has Patients, Appointments, Treatments)
- Consulting/Coaching → Use "fitness-coach" or "tutor" kit (has Sessions, Clients)
- Dentist/Chiropractor → Use "medical" kit
- Auto detailing → Use "cleaning" kit or "mechanic" kit
- Moving company → Use "contractor" kit (has Projects, Tasks)
- Catering → Use "bakery" or "restaurant" kit
- Florist → Use "ecommerce" kit or "bakery" kit
`;
}

/**
 * Generate AI context string for available integrations
 */
export function generateIntegrationContextForAI(): string {
  const integrationLines = AVAILABLE_INTEGRATIONS.map(int => {
    return `- ${int.name}: ${int.description} (${int.capabilities.join(', ')})`;
  });

  return `
AVAILABLE INTEGRATIONS:
${integrationLines.join('\n')}

NOT CURRENTLY AVAILABLE:
${UNAVAILABLE_FEATURES.map(f => `- ${f}`).join('\n')}

When users request unavailable features, offer alternatives:
- Fax → Suggest email or SMS notifications instead
- Document signing → Suggest PDF generation + email
- Accounting software → Suggest CSV export + Google Sheets sync
- Social media → Suggest Zapier integration as workaround
`;
}

/**
 * Generate complete AI context for discovery
 */
export function generateFullAIContext(kits: IndustryKit[]): string {
  const kitContext = generateKitContextForAI(kits);
  const integrationContext = generateIntegrationContextForAI();
  
  return `
${kitContext}

${integrationContext}

TRANSPARENCY GUIDELINES:
1. Never promise features that aren't available
2. If the requested industry doesn't have a perfect kit, explain which kit you're recommending and why
3. If a requested integration isn't available, acknowledge this and suggest alternatives
4. Be specific about what the chosen kit includes
`;
}

/**
 * Get available integrations list
 */
export function getAvailableIntegrations(): IntegrationSummary[] {
  return AVAILABLE_INTEGRATIONS;
}

/**
 * Get unavailable features list
 */
export function getUnavailableFeatures(): string[] {
  return UNAVAILABLE_FEATURES;
}

/**
 * Check if a feature/integration is available
 */
export function isFeatureAvailable(feature: string): boolean {
  const lower = feature.toLowerCase();
  
  // Check integrations
  for (const int of AVAILABLE_INTEGRATIONS) {
    if (int.id.includes(lower) || int.name.toLowerCase().includes(lower)) {
      return true;
    }
    for (const cap of int.capabilities) {
      if (cap.toLowerCase().includes(lower)) {
        return true;
      }
    }
  }
  
  // Check unavailable list
  for (const unavail of UNAVAILABLE_FEATURES) {
    if (unavail.toLowerCase().includes(lower)) {
      return false;
    }
  }
  
  // Unknown - assume available
  return true;
}

/**
 * Detect requested features from user input
 */
export function detectRequestedFeatures(input: string): {
  available: string[];
  unavailable: string[];
} {
  const lower = input.toLowerCase();
  const available: string[] = [];
  const unavailable: string[] = [];
  
  // Check for integration keywords
  const featureKeywords: Record<string, { feature: string; available: boolean }> = {
    'payment': { feature: 'payments (Stripe)', available: true },
    'stripe': { feature: 'payments (Stripe)', available: true },
    'sms': { feature: 'SMS (Twilio)', available: true },
    'text message': { feature: 'SMS (Twilio)', available: true },
    'email': { feature: 'email notifications', available: true },
    'calendar': { feature: 'Google Calendar sync', available: true },
    'scheduling': { feature: 'scheduling', available: true },
    'webhook': { feature: 'webhooks', available: true },
    'zapier': { feature: 'Zapier automation', available: true },
    'fax': { feature: 'fax', available: false },
    'docusign': { feature: 'document signing', available: false },
    'e-sign': { feature: 'document signing', available: false },
    'quickbooks': { feature: 'QuickBooks integration', available: false },
    'xero': { feature: 'Xero integration', available: false },
    'accounting': { feature: 'accounting software', available: false },
    'social media': { feature: 'social media posting', available: false },
    'instagram': { feature: 'Instagram integration', available: false },
    'facebook': { feature: 'Facebook integration', available: false },
    'zoom': { feature: 'video conferencing', available: false },
    'chatbot': { feature: 'AI chatbot', available: false },
    'mobile app': { feature: 'custom mobile app', available: false },
    'pos': { feature: 'POS terminal integration', available: false },
    'printer': { feature: 'printer integration', available: false },
  };
  
  for (const [keyword, info] of Object.entries(featureKeywords)) {
    if (lower.includes(keyword)) {
      if (info.available) {
        if (!available.includes(info.feature)) {
          available.push(info.feature);
        }
      } else {
        if (!unavailable.includes(info.feature)) {
          unavailable.push(info.feature);
        }
      }
    }
  }
  
  return { available, unavailable };
}

// ============================================================================
// Certainty Ledger Integration - Industry-Aware Prompts
// ============================================================================

/**
 * Format terminology from a kit for AI context
 */
function formatTerminology(terminology?: Record<string, { primary: string; plural: string }>): string {
  if (!terminology) return 'Standard business terminology';
  
  const terms = Object.entries(terminology)
    .slice(0, 5)
    .map(([entity, config]) => `${entity} → ${config.primary}`)
    .join(', ');
  
  return terms || 'Standard business terminology';
}

/**
 * Format ledger slot for context display
 */
function formatSlotForContext(name: string, slot: SlotValue): string {
  if (!slot.value) return '';
  const confidence = Math.round(slot.confidence * 100);
  const value = Array.isArray(slot.value) ? slot.value.join(', ') : String(slot.value);
  return `- ${name}: ${value} (${confidence}% certain)`;
}

/**
 * Format the ledger as context for AI prompts
 */
export function formatLedgerForPrompt(ledger: CertaintyLedger): string {
  const lines: string[] = [];
  
  if (ledger.industry.value) {
    lines.push(formatSlotForContext('Industry', ledger.industry));
  }
  if (ledger.subVertical.value) {
    lines.push(formatSlotForContext('Sub-vertical', ledger.subVertical));
  }
  if (ledger.primaryEntities.value && ledger.primaryEntities.value.length > 0) {
    lines.push(formatSlotForContext('Primary entities', ledger.primaryEntities));
  }
  if (ledger.teamSize.value) {
    lines.push(formatSlotForContext('Team size', ledger.teamSize));
  }
  if (ledger.scale.value) {
    lines.push(formatSlotForContext('Scale', ledger.scale));
  }
  if (ledger.customerFacing.value !== null) {
    lines.push(formatSlotForContext('Customer-facing', ledger.customerFacing));
  }
  if (ledger.integrations.value && ledger.integrations.value.length > 0) {
    lines.push(formatSlotForContext('Integrations', ledger.integrations));
  }
  
  return lines.filter(l => l).join('\n');
}

/**
 * Get industry kit by ID
 */
export function getIndustryKit(industryId: string | null, kits: IndustryKit[]): IndustryKit | undefined {
  if (!industryId) return undefined;
  return kits.find(k => k.id === industryId);
}

/**
 * Generate industry-aware AI prompt based on the Certainty Ledger
 * This creates a context-rich prompt that uses domain vocabulary
 */
export function generateIndustryAwarePrompt(
  ledger: CertaintyLedger,
  kits: IndustryKit[]
): string {
  const kit = getIndustryKit(ledger.industry.value, kits);
  
  // Determine the industry context
  const industryName = kit?.name || 'business';
  const entities = kit?.entities.map(e => e.name).join(', ') || 'records';
  const workflows = kit?.workflows?.join(', ') || 'standard workflows';
  
  // Build domain vocabulary section
  let domainVocabulary = '';
  if (kit) {
    domainVocabulary = `
DOMAIN VOCABULARY (use these terms instead of generic ones):
- Primary entities: ${entities}
- Terminology: ${formatTerminology(kit.terminology)}
- Typical workflows: ${workflows}`;

    // Add discovery prompt fragment if available
    if (kit.discoveryPromptFragment) {
      domainVocabulary += `\n- Industry context: ${kit.discoveryPromptFragment}`;
    }
  }
  
  // Build what we know section
  const knownContext = formatLedgerForPrompt(ledger);
  const whatWeKnow = knownContext 
    ? `WHAT WE KNOW:\n${knownContext}`
    : 'WHAT WE KNOW:\nNot much yet - need to understand the user\'s needs.';
  
  // Build what we don't know section
  const whatWeDontKnow = ledger.gaps.length > 0
    ? `WHAT WE DON'T KNOW:\n${ledger.gaps.join(', ')}`
    : 'WHAT WE DON\'T KNOW:\nNothing critical - ready to build!';
  
  // Build suggestions section
  let suggestionsSection = '';
  if (kit?.suggestedIntegrations && kit.suggestedIntegrations.length > 0) {
    const suggestions = kit.suggestedIntegrations
      .map(i => `${i.name} (${i.purpose})`)
      .join(', ');
    suggestionsSection = `\nSUGGESTED FEATURES (mention freely):\n${suggestions}`;
  }
  if (ledger.suggestions.length > 0) {
    suggestionsSection += `\n${ledger.suggestions.join(', ')}`;
  }
  
  // Build safe assumptions section
  let safeAssumptions = '';
  if (kit?.safeAssumptions && kit.safeAssumptions.length > 0) {
    safeAssumptions = `\nSAFE ASSUMPTIONS FOR ${kit.name.toUpperCase()}:\n${kit.safeAssumptions.map(a => `- ${a}`).join('\n')}`;
  }
  
  // Build ambiguity triggers section
  let ambiguityTriggers = '';
  if (kit?.ambiguityTriggers && kit.ambiguityTriggers.length > 0) {
    ambiguityTriggers = `\nASK FOR CLARIFICATION IF:\n${kit.ambiguityTriggers.map(t => `- ${t}`).join('\n')}`;
  }

  return `You are helping build a ${industryName} app.
${domainVocabulary}

${whatWeKnow}

${whatWeDontKnow}
${suggestionsSection}
${safeAssumptions}
${ambiguityTriggers}

YOUR TASK:
- Acknowledge what you understand
- Suggest relevant features (even with partial confidence)
- Ask at most ONE question IF uncertainty would cause wrong wiring
- Use domain-specific language (not generic terms like "items" or "records")
- Be confident and helpful, don't over-ask`;
}

/**
 * Generate a response acknowledgment based on ledger
 */
export function generateAcknowledgment(ledger: CertaintyLedger, kit?: IndustryKit): string {
  if (!ledger.industry.value) {
    return "I'd like to understand more about what you're building.";
  }
  
  const industryName = kit?.name || ledger.industry.value;
  const confidence = ledger.industry.confidence;
  
  if (confidence >= 0.9) {
    return `Got it — a ${industryName} app! I know this domain well.`;
  } else if (confidence >= 0.7) {
    return `A ${industryName} app — I can definitely help with that!`;
  } else {
    return `Sounds like a ${industryName} app. Let me make sure I understand correctly.`;
  }
}

/**
 * Format assumptions for display to user
 */
export function formatAssumptions(ledger: CertaintyLedger, kit?: IndustryKit): string[] {
  const assumptions: string[] = [];
  
  // Industry assumption
  if (ledger.industry.value && ledger.industry.source === 'inferred') {
    assumptions.push(`Using ${kit?.name || ledger.industry.value} industry template`);
  }
  
  // Integration assumptions
  if (ledger.integrations.value && ledger.integrations.value.length > 0 && ledger.integrations.source !== 'explicit') {
    const integrations = ledger.integrations.value.slice(0, 3).join(', ');
    assumptions.push(`Set up with ${integrations}`);
  }
  
  // Team size assumption
  if (ledger.teamSize.value && ledger.teamSize.source !== 'explicit') {
    const teamDesc = ledger.teamSize.value === 'solo' ? 'solo use' : `${ledger.teamSize.value} team`;
    assumptions.push(`Configured for ${teamDesc}`);
  }
  
  // Terminology assumption
  if (kit?.terminology) {
    const primaryEntity = Object.values(kit.terminology)[0];
    if (primaryEntity) {
      assumptions.push(`Using "${primaryEntity.primary}" terminology`);
    }
  }
  
  return assumptions;
}

/**
 * Generate suggestions based on kit and ledger
 */
export function generateSuggestions(kit: IndustryKit | undefined, ledger: CertaintyLedger): string[] {
  const suggestions: string[] = [];
  
  if (!kit) return suggestions;
  
  // Suggest integrations
  if (kit.suggestedIntegrations) {
    const currentIntegrations = ledger.integrations.value || [];
    for (const integration of kit.suggestedIntegrations) {
      if (!currentIntegrations.includes(integration.id)) {
        suggestions.push(`Most ${kit.professions[0] || 'businesses'} also want ${integration.name} for ${integration.purpose}`);
      }
    }
  }
  
  // Suggest recommended features
  if (kit.featureBundle?.recommended) {
    for (const feature of kit.featureBundle.recommended.slice(0, 2)) {
      suggestions.push(`You might want ${feature}`);
    }
  }
  
  // Suggest workflows
  if (kit.workflowTemplates && kit.workflowTemplates.length > 0) {
    const workflow = kit.workflowTemplates[0];
    suggestions.push(`I can set up automated ${workflow.name}`);
  }
  
  return suggestions.slice(0, 3);
}
