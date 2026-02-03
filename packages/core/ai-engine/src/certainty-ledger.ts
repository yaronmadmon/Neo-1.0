/**
 * Certainty Ledger
 * Central source of truth for what the AI knows, suspects, and needs to clarify.
 * Replaces global confidence scoring with per-slot tracking.
 */

import type { IndustryKit } from '@neo/blueprint-engine';

/**
 * Source of how a slot value was determined
 */
export type SlotSource = 'explicit' | 'inferred' | 'assumed' | 'default';

/**
 * A single slot in the certainty ledger
 */
export interface SlotValue<T = unknown> {
  value: T | null;
  confidence: number;  // 0.0 - 1.0
  source: SlotSource;
  evidence?: string[]; // What triggered this inference
}

/**
 * The Certainty Ledger tracks confidence per-slot
 */
export interface CertaintyLedger {
  // Core identification
  industry: SlotValue<string>;
  subVertical: SlotValue<string>;
  
  // App structure
  primaryEntities: SlotValue<string[]>;
  workflows: SlotValue<string[]>;
  integrations: SlotValue<string[]>;
  
  // Context
  scale: SlotValue<string | number>;
  teamSize: SlotValue<'solo' | 'small' | 'medium' | 'large'>;
  customerFacing: SlotValue<boolean>;
  complexity: SlotValue<'simple' | 'medium' | 'advanced'>;
  
  // Meta
  gaps: string[];           // Slots that need resolution
  suggestions: string[];    // Features to suggest (non-blocking)
  overallReadiness: number; // Computed: can we build? (0.0 - 1.0)
}

/**
 * Critical slots that must be filled to build
 */
export const CRITICAL_SLOTS = ['industry', 'primaryEntities'] as const;

/**
 * Refinement slots that are nice to have
 */
export const REFINEMENT_SLOTS = ['scale', 'teamSize', 'integrations', 'complexity', 'subVertical'] as const;

/**
 * All slot IDs in the ledger
 */
export type SlotId = 
  | 'industry' 
  | 'subVertical' 
  | 'primaryEntities' 
  | 'workflows' 
  | 'integrations' 
  | 'scale' 
  | 'teamSize' 
  | 'customerFacing' 
  | 'complexity';

/**
 * Create an empty ledger with null values
 */
export function createEmptyLedger(): CertaintyLedger {
  const emptySlot = <T>(defaultValue: T | null = null): SlotValue<T> => ({
    value: defaultValue,
    confidence: 0,
    source: 'default',
    evidence: [],
  });

  return {
    industry: emptySlot<string>(),
    subVertical: emptySlot<string>(),
    primaryEntities: emptySlot<string[]>([]),
    workflows: emptySlot<string[]>([]),
    integrations: emptySlot<string[]>([]),
    scale: emptySlot<string | number>(),
    teamSize: emptySlot<'solo' | 'small' | 'medium' | 'large'>(),
    customerFacing: emptySlot<boolean>(),
    complexity: emptySlot<'simple' | 'medium' | 'advanced'>(),
    gaps: [...CRITICAL_SLOTS], // Start with all critical slots as gaps
    suggestions: [],
    overallReadiness: 0,
  };
}

/**
 * Update a slot in the ledger
 */
export function updateSlot<T>(
  ledger: CertaintyLedger,
  slotId: SlotId,
  value: T,
  confidence: number,
  source: SlotSource,
  evidence?: string[]
): CertaintyLedger {
  const updatedLedger = { ...ledger };
  
  (updatedLedger[slotId] as SlotValue<T>) = {
    value,
    confidence: Math.max(0, Math.min(1, confidence)),
    source,
    evidence: evidence || [],
  };
  
  // Recompute gaps and readiness
  updatedLedger.gaps = computeGaps(updatedLedger);
  updatedLedger.overallReadiness = computeReadiness(updatedLedger);
  
  return updatedLedger;
}

/**
 * Analyze input text and update ledger slots
 */
export function updateLedgerFromInput(
  ledger: CertaintyLedger,
  input: string,
  industryKit?: IndustryKit
): CertaintyLedger {
  let updatedLedger = { ...ledger };
  const lower = input.toLowerCase();
  const evidence: string[] = [input];

  // Industry detection
  const industryResult = detectIndustryFromInput(lower, industryKit);
  if (industryResult.industry) {
    updatedLedger = updateSlot(
      updatedLedger,
      'industry',
      industryResult.industry,
      industryResult.confidence,
      industryResult.source,
      evidence
    );
  }

  // Sub-vertical detection
  const subVerticalResult = detectSubVerticalFromInput(lower, industryResult.industry);
  if (subVerticalResult.subVertical) {
    updatedLedger = updateSlot(
      updatedLedger,
      'subVertical',
      subVerticalResult.subVertical,
      subVerticalResult.confidence,
      subVerticalResult.source,
      evidence
    );
  }

  // Team size detection
  const teamSizeResult = detectTeamSizeFromInput(lower);
  if (teamSizeResult.teamSize) {
    updatedLedger = updateSlot(
      updatedLedger,
      'teamSize',
      teamSizeResult.teamSize,
      teamSizeResult.confidence,
      teamSizeResult.source,
      evidence
    );
  }

  // Scale detection (numbers in input)
  const scaleResult = detectScaleFromInput(lower);
  if (scaleResult.scale !== null) {
    updatedLedger = updateSlot(
      updatedLedger,
      'scale',
      scaleResult.scale,
      scaleResult.confidence,
      scaleResult.source,
      evidence
    );
  }

  // Customer-facing detection
  const customerFacingResult = detectCustomerFacingFromInput(lower);
  if (customerFacingResult.customerFacing !== null) {
    updatedLedger = updateSlot(
      updatedLedger,
      'customerFacing',
      customerFacingResult.customerFacing,
      customerFacingResult.confidence,
      customerFacingResult.source,
      evidence
    );
  }

  // Primary entities from industry kit
  if (industryKit && industryKit.entities.length > 0) {
    updatedLedger = updateSlot(
      updatedLedger,
      'primaryEntities',
      industryKit.entities.map(e => e.name),
      industryResult.confidence * 0.9, // Slightly lower since derived
      'inferred',
      [`Derived from ${industryKit.name} kit`]
    );
  }

  // Workflows from industry kit
  if (industryKit && industryKit.workflows.length > 0) {
    updatedLedger = updateSlot(
      updatedLedger,
      'workflows',
      industryKit.workflows,
      industryResult.confidence * 0.85,
      'inferred',
      [`Derived from ${industryKit.name} kit`]
    );
  }

  // Integrations detection
  const integrationsResult = detectIntegrationsFromInput(lower);
  if (integrationsResult.integrations.length > 0) {
    updatedLedger = updateSlot(
      updatedLedger,
      'integrations',
      integrationsResult.integrations,
      integrationsResult.confidence,
      'explicit',
      evidence
    );
  } else if (industryKit?.suggestedIntegrations) {
    // Suggest integrations from kit
    updatedLedger = updateSlot(
      updatedLedger,
      'integrations',
      industryKit.suggestedIntegrations.map(i => i.id),
      0.5, // Assumed confidence
      'assumed',
      [`Suggested for ${industryKit.name}`]
    );
  }

  // Generate suggestions based on kit
  if (industryKit) {
    updatedLedger.suggestions = generateSuggestionsFromKit(industryKit, updatedLedger);
  }

  // Recompute gaps and readiness
  updatedLedger.gaps = computeGaps(updatedLedger);
  updatedLedger.overallReadiness = computeReadiness(updatedLedger);

  return updatedLedger;
}

/**
 * Compute gaps - slots that need resolution
 */
export function computeGaps(ledger: CertaintyLedger): string[] {
  const gaps: string[] = [];

  // Check critical slots
  for (const slotId of CRITICAL_SLOTS) {
    const slot = ledger[slotId];
    if (!slot.value || slot.confidence < 0.5) {
      gaps.push(slotId);
    }
  }

  // Check if sub-vertical disambiguation is needed
  if (ledger.industry.value && ledger.industry.confidence >= 0.5) {
    const needsSubVertical = requiresSubVerticalClarification(ledger.industry.value);
    if (needsSubVertical && (!ledger.subVertical.value || ledger.subVertical.confidence < 0.5)) {
      gaps.push('subVertical');
    }
  }

  return gaps;
}

/**
 * Compute overall readiness score (0.0 - 1.0)
 */
export function computeReadiness(ledger: CertaintyLedger): number {
  let score = 0;
  let maxScore = 0;

  // Critical slots contribute 70% of readiness
  const criticalWeight = 0.7 / CRITICAL_SLOTS.length;
  for (const slotId of CRITICAL_SLOTS) {
    const slot = ledger[slotId];
    maxScore += criticalWeight;
    if (slot.value) {
      score += slot.confidence * criticalWeight;
    }
  }

  // Refinement slots contribute 30% of readiness
  const refinementWeight = 0.3 / REFINEMENT_SLOTS.length;
  for (const slotId of REFINEMENT_SLOTS) {
    const slot = ledger[slotId];
    maxScore += refinementWeight;
    if (slot.value) {
      score += slot.confidence * refinementWeight;
    }
  }

  return Math.min(1, score / maxScore);
}

/**
 * Check if we're ready to build
 */
export function isReadyToBuild(ledger: CertaintyLedger): boolean {
  // Must have industry with decent confidence
  if (!ledger.industry.value || ledger.industry.confidence < 0.7) {
    return false;
  }

  // Must have primary entities
  if (!ledger.primaryEntities.value || ledger.primaryEntities.value.length === 0) {
    return false;
  }

  // Overall readiness should be at least 0.6
  return ledger.overallReadiness >= 0.6;
}

// ============================================================================
// Detection Helpers
// ============================================================================

interface DetectionResult<T> {
  value: T;
  confidence: number;
  source: SlotSource;
}

function detectIndustryFromInput(
  input: string,
  providedKit?: IndustryKit
): { industry: string | null; confidence: number; source: SlotSource } {
  // If a kit is provided, use it directly
  if (providedKit) {
    return {
      industry: providedKit.id,
      confidence: 0.95,
      source: 'explicit',
    };
  }

  // Industry keywords with weights
  const INDUSTRY_PATTERNS: Record<string, { patterns: RegExp[]; weight: number }> = {
    'property-management': {
      patterns: [
        /property\s*management/i,
        /landlord/i,
        /\btenant/i,
        /\blease/i,
        /rent\s*collection/i,
        /rental\s*property/i,
        /apartment\s*manager/i,
      ],
      weight: 2,
    },
    'real-estate': {
      patterns: [/real\s*estate/i, /realtor/i, /\blisting/i, /\bbroker/i, /home\s*sale/i],
      weight: 1.5,
    },
    'gym': {
      patterns: [/\bgym\b/i, /fitness\s*studio/i, /\bmembership/i, /fitness\s*class/i, /workout\s*class/i],
      weight: 2,
    },
    'fitness-coach': {
      patterns: [/personal\s*trainer/i, /fitness\s*coach/i, /1-on-1\s*training/i, /workout\s*coach/i],
      weight: 2,
    },
    'plumber': {
      patterns: [/plumber/i, /plumbing/i, /\bpipe/i, /\bleak/i, /\bdrain/i, /water\s*heater/i],
      weight: 1,
    },
    'electrician': {
      patterns: [/electrician/i, /electrical/i, /\bwiring/i, /\bcircuit/i, /\bpanel/i],
      weight: 1,
    },
    'restaurant': {
      patterns: [/restaurant/i, /\bcafe\b/i, /\bdining/i, /\bmenu\b/i, /takeout/i, /reservation/i],
      weight: 1,
    },
    'salon': {
      patterns: [/salon/i, /beauty/i, /\bhair\b/i, /\bspa\b/i, /\bnail/i, /barber/i, /stylist/i],
      weight: 1,
    },
    'cleaning': {
      patterns: [/cleaning/i, /\bcleaner/i, /\bmaid/i, /housekeeping/i, /home\s*cleaning/i],
      weight: 1,
    },
    'commercial-cleaning': {
      patterns: [/commercial\s*cleaning/i, /janitorial/i, /office\s*cleaning/i, /facility\s*cleaning/i],
      weight: 2,
    },
    'medical': {
      patterns: [/medical/i, /clinic/i, /doctor/i, /patient/i, /health/i, /dental/i, /therapy/i],
      weight: 1,
    },
    'tutor': {
      patterns: [/tutor/i, /tutoring/i, /\blesson/i, /student/i, /teaching/i, /education/i],
      weight: 1,
    },
    'ecommerce': {
      patterns: [/\bshop\b/i, /ecommerce/i, /\bstore\b/i, /online\s*store/i, /sell\s*products/i],
      weight: 1,
    },
    'mechanic': {
      patterns: [/mechanic/i, /auto\s*repair/i, /car\s*repair/i, /\bvehicle/i, /automotive/i],
      weight: 1,
    },
    'contractor': {
      patterns: [/contractor/i, /construction/i, /renovation/i, /\bbuilder/i, /remodel/i],
      weight: 1,
    },
    'bakery': {
      patterns: [/bakery/i, /\bbaker/i, /pastry/i, /\bbread/i, /\bcake/i],
      weight: 1,
    },
    'photographer': {
      patterns: [/photographer/i, /photo/i, /\bshoot/i, /photography/i],
      weight: 1,
    },
    'landscaping': {
      patterns: [/landscaping/i, /\blawn/i, /\bgarden/i, /\byard/i, /lawn\s*care/i],
      weight: 1,
    },
    'hvac': {
      patterns: [/\bhvac\b/i, /heating/i, /cooling/i, /air\s*conditioning/i, /furnace/i],
      weight: 1,
    },
    'roofing': {
      patterns: [/roofing/i, /\broof\b/i, /shingle/i, /gutter/i],
      weight: 1,
    },
    'handyman': {
      patterns: [/handyman/i, /home\s*repair/i, /odd\s*jobs/i],
      weight: 1,
    },
    'home-health': {
      patterns: [/home\s*health/i, /caregiver/i, /senior\s*care/i, /elderly\s*care/i, /home\s*aide/i],
      weight: 1.5,
    },
  };

  let bestMatch: { industry: string; score: number } | null = null;

  for (const [industry, config] of Object.entries(INDUSTRY_PATTERNS)) {
    let score = 0;
    for (const pattern of config.patterns) {
      if (pattern.test(input)) {
        score += config.weight;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { industry, score };
    }
  }

  if (bestMatch) {
    // Higher scores get higher confidence
    const confidence = Math.min(0.95, 0.6 + bestMatch.score * 0.1);
    return {
      industry: bestMatch.industry,
      confidence,
      source: bestMatch.score >= 2 ? 'explicit' : 'inferred',
    };
  }

  return { industry: null, confidence: 0, source: 'default' };
}

function detectSubVerticalFromInput(
  input: string,
  industry: string | null
): { subVertical: string | null; confidence: number; source: SlotSource } {
  if (!industry) {
    return { subVertical: null, confidence: 0, source: 'default' };
  }

  // Sub-vertical patterns based on industry
  const SUB_VERTICAL_PATTERNS: Record<string, Record<string, RegExp[]>> = {
    'real-estate': {
      'rentals': [/rental/i, /\brent/i, /lease/i, /tenant/i],
      'sales': [/\bsale/i, /\bbuy/i, /\bsell/i, /listing/i, /commission/i],
      'commercial': [/commercial/i, /office\s*space/i, /retail\s*space/i],
    },
    'fitness-coach': {
      'personal-training': [/personal/i, /1-on-1/i, /individual/i],
      'group-training': [/group/i, /class/i, /bootcamp/i],
      'online': [/online/i, /virtual/i, /remote/i],
    },
    'cleaning': {
      'residential': [/home/i, /house/i, /residential/i, /apartment/i],
      'commercial': [/commercial/i, /office/i, /business/i],
      'specialized': [/deep\s*clean/i, /move-out/i, /post-construction/i],
    },
  };

  const patterns = SUB_VERTICAL_PATTERNS[industry];
  if (!patterns) {
    return { subVertical: null, confidence: 0, source: 'default' };
  }

  for (const [subVertical, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      if (regex.test(input)) {
        return {
          subVertical,
          confidence: 0.8,
          source: 'inferred',
        };
      }
    }
  }

  return { subVertical: null, confidence: 0, source: 'default' };
}

function detectTeamSizeFromInput(
  input: string
): { teamSize: 'solo' | 'small' | 'medium' | 'large' | null; confidence: number; source: SlotSource } {
  if (/\b(solo|myself|just me|one person|freelance|independent)\b/i.test(input)) {
    return { teamSize: 'solo', confidence: 0.9, source: 'explicit' };
  }
  if (/\b(small team|2-5|few people|couple of|partner)\b/i.test(input)) {
    return { teamSize: 'small', confidence: 0.85, source: 'inferred' };
  }
  if (/\b(team|staff|employees|crew|workers)\b/i.test(input)) {
    return { teamSize: 'small', confidence: 0.6, source: 'inferred' };
  }
  if (/\b(6-20|medium|growing team|department)\b/i.test(input)) {
    return { teamSize: 'medium', confidence: 0.8, source: 'inferred' };
  }
  if (/\b(large|enterprise|20\+|company-wide|organization)\b/i.test(input)) {
    return { teamSize: 'large', confidence: 0.8, source: 'inferred' };
  }

  return { teamSize: null, confidence: 0, source: 'default' };
}

function detectScaleFromInput(
  input: string
): { scale: string | number | null; confidence: number; source: SlotSource } {
  // Look for numbers with context
  const scalePatterns = [
    { pattern: /(\d+)\s*(?:units?|properties|apartments)/i, type: 'properties' },
    { pattern: /(\d+)\s*(?:members?|clients?|customers?)/i, type: 'clients' },
    { pattern: /(\d+)\s*(?:employees?|staff|workers)/i, type: 'employees' },
    { pattern: /(\d+)\s*(?:locations?|offices?|branches)/i, type: 'locations' },
  ];

  for (const { pattern, type } of scalePatterns) {
    const match = input.match(pattern);
    if (match) {
      const number = parseInt(match[1], 10);
      return {
        scale: `${number} ${type}`,
        confidence: 0.9,
        source: 'explicit',
      };
    }
  }

  // Generic number extraction
  const genericMatch = input.match(/\b(\d+)\b/);
  if (genericMatch) {
    return {
      scale: parseInt(genericMatch[1], 10),
      confidence: 0.5,
      source: 'inferred',
    };
  }

  return { scale: null, confidence: 0, source: 'default' };
}

function detectCustomerFacingFromInput(
  input: string
): { customerFacing: boolean | null; confidence: number; source: SlotSource } {
  if (/\b(customer portal|client portal|booking|appointments?|reservations?|customer-facing)\b/i.test(input)) {
    return { customerFacing: true, confidence: 0.85, source: 'inferred' };
  }
  if (/\b(internal|back-?office|operations|admin only|staff only)\b/i.test(input)) {
    return { customerFacing: false, confidence: 0.85, source: 'inferred' };
  }
  if (/\b(both|hybrid|full|end-to-end)\b/i.test(input)) {
    return { customerFacing: true, confidence: 0.7, source: 'inferred' };
  }

  return { customerFacing: null, confidence: 0, source: 'default' };
}

function detectIntegrationsFromInput(
  input: string
): { integrations: string[]; confidence: number } {
  const integrations: string[] = [];
  
  const integrationKeywords: Record<string, string[]> = {
    'stripe': ['stripe', 'payment', 'credit card', 'charge'],
    'twilio': ['twilio', 'sms', 'text message'],
    'email': ['email', 'notification'],
    'google-calendar': ['calendar', 'scheduling', 'google calendar'],
    'zapier': ['zapier', 'automation', 'integrate'],
  };

  for (const [integration, keywords] of Object.entries(integrationKeywords)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        if (!integrations.includes(integration)) {
          integrations.push(integration);
        }
        break;
      }
    }
  }

  return {
    integrations,
    confidence: integrations.length > 0 ? 0.85 : 0,
  };
}

function requiresSubVerticalClarification(industry: string): boolean {
  // Industries that have important sub-verticals
  const industriesWithSubVerticals = [
    'real-estate',
    'fitness-coach',
    'cleaning',
  ];
  return industriesWithSubVerticals.includes(industry);
}

function generateSuggestionsFromKit(kit: IndustryKit, ledger: CertaintyLedger): string[] {
  const suggestions: string[] = [];

  // Suggest integrations not already detected
  if (kit.suggestedIntegrations) {
    const currentIntegrations = ledger.integrations.value || [];
    for (const integration of kit.suggestedIntegrations) {
      if (!currentIntegrations.includes(integration.id)) {
        suggestions.push(`${integration.name}: ${integration.purpose}`);
      }
    }
  }

  // Suggest features based on kit
  if (kit.featureBundle?.recommended) {
    for (const feature of kit.featureBundle.recommended) {
      suggestions.push(feature);
    }
  }

  return suggestions.slice(0, 5); // Max 5 suggestions
}

/**
 * Format ledger state for debugging or display
 */
export function formatLedgerAsContext(ledger: CertaintyLedger): string {
  const lines: string[] = [];

  const formatSlot = (name: string, slot: SlotValue): string => {
    if (!slot.value) return `- ${name}: Unknown`;
    const confidence = Math.round(slot.confidence * 100);
    return `- ${name}: ${JSON.stringify(slot.value)} (${confidence}% confidence, ${slot.source})`;
  };

  lines.push(formatSlot('Industry', ledger.industry));
  if (ledger.subVertical.value) {
    lines.push(formatSlot('Sub-vertical', ledger.subVertical));
  }
  lines.push(formatSlot('Primary Entities', ledger.primaryEntities));
  if (ledger.teamSize.value) {
    lines.push(formatSlot('Team Size', ledger.teamSize));
  }
  if (ledger.scale.value) {
    lines.push(formatSlot('Scale', ledger.scale));
  }
  if (ledger.customerFacing.value !== null) {
    lines.push(formatSlot('Customer Facing', ledger.customerFacing));
  }
  if (ledger.integrations.value && ledger.integrations.value.length > 0) {
    lines.push(formatSlot('Integrations', ledger.integrations));
  }

  return lines.join('\n');
}
