/**
 * Slot Decision Logic
 * Determines the action to take for each slot based on confidence and criticality.
 * 
 * Decision tree:
 * - assume: Commit silently (high confidence)
 * - confirm: Verify inference (medium confidence)
 * - ask: Request info (low confidence on critical slot)
 * - skip: Not needed right now
 */

import type { SlotValue, SlotId, CertaintyLedger } from './certainty-ledger.js';

/**
 * Possible decisions for a slot
 */
export type SlotDecision = 'assume' | 'confirm' | 'ask' | 'skip';

/**
 * Critical slots that must be filled - only these trigger 'ask'
 */
const CRITICAL_SLOTS: SlotId[] = ['industry', 'subVertical'];

/**
 * Check if a slot is critical (must be filled to build)
 */
export function isCriticalSlot(slotId: string): boolean {
  return CRITICAL_SLOTS.includes(slotId as SlotId);
}

/**
 * Decide what action to take for a given slot
 * 
 * Decision logic:
 * 1. Explicit mention with high confidence (≥0.9) → assume
 * 2. Strong inference (≥0.75) → assume
 * 3. Medium confidence (≥0.5) → confirm (not ask)
 * 4. Low confidence on non-critical slot (≥0.3) → assume with default
 * 5. Critical slot with low confidence → ask
 * 6. Otherwise → skip
 */
export function decideForSlot(slot: SlotValue, slotId: string): SlotDecision {
  // Explicit mention with high confidence → assume
  if (slot.confidence >= 0.9 && slot.source === 'explicit') {
    return 'assume';
  }

  // Strong inference → assume
  if (slot.confidence >= 0.75) {
    return 'assume';
  }

  // Medium confidence → confirm (not ask)
  if (slot.confidence >= 0.5) {
    return 'confirm';
  }

  // Low confidence on non-critical slot → assume with default
  if (!isCriticalSlot(slotId) && slot.confidence >= 0.3) {
    return 'assume';
  }

  // Critical slot with low confidence → ask
  if (isCriticalSlot(slotId)) {
    return 'ask';
  }

  // Otherwise → skip
  return 'skip';
}

/**
 * Get all decisions for a ledger
 */
export function getAllDecisions(ledger: CertaintyLedger): Record<SlotId, SlotDecision> {
  const slotIds: SlotId[] = [
    'industry',
    'subVertical',
    'primaryEntities',
    'workflows',
    'integrations',
    'scale',
    'teamSize',
    'customerFacing',
    'complexity',
  ];

  const decisions: Record<string, SlotDecision> = {};

  for (const slotId of slotIds) {
    const slot = ledger[slotId];
    decisions[slotId] = decideForSlot(slot, slotId);
  }

  return decisions as Record<SlotId, SlotDecision>;
}

/**
 * Get slots that need confirmation (medium confidence)
 */
export function getSlotsToConfirm(ledger: CertaintyLedger): SlotId[] {
  const decisions = getAllDecisions(ledger);
  return (Object.entries(decisions) as [SlotId, SlotDecision][])
    .filter(([_, decision]) => decision === 'confirm')
    .map(([slotId]) => slotId);
}

/**
 * Get slots that need to be asked about (critical gaps)
 */
export function getSlotsToAsk(ledger: CertaintyLedger): SlotId[] {
  const decisions = getAllDecisions(ledger);
  return (Object.entries(decisions) as [SlotId, SlotDecision][])
    .filter(([_, decision]) => decision === 'ask')
    .map(([slotId]) => slotId);
}

/**
 * Get slots that were assumed (high confidence or non-critical defaults)
 */
export function getAssumedSlots(ledger: CertaintyLedger): SlotId[] {
  const decisions = getAllDecisions(ledger);
  return (Object.entries(decisions) as [SlotId, SlotDecision][])
    .filter(([_, decision]) => decision === 'assume')
    .map(([slotId]) => slotId);
}

/**
 * Summary of slot decisions for a ledger
 */
export interface SlotDecisionSummary {
  assumed: SlotId[];
  toConfirm: SlotId[];
  toAsk: SlotId[];
  skipped: SlotId[];
  canProceed: boolean;
}

/**
 * Get a summary of all slot decisions
 */
export function getDecisionSummary(ledger: CertaintyLedger): SlotDecisionSummary {
  const decisions = getAllDecisions(ledger);
  
  const summary: SlotDecisionSummary = {
    assumed: [],
    toConfirm: [],
    toAsk: [],
    skipped: [],
    canProceed: true,
  };

  for (const [slotId, decision] of Object.entries(decisions) as [SlotId, SlotDecision][]) {
    switch (decision) {
      case 'assume':
        summary.assumed.push(slotId);
        break;
      case 'confirm':
        summary.toConfirm.push(slotId);
        break;
      case 'ask':
        summary.toAsk.push(slotId);
        summary.canProceed = false; // Can't proceed if we need to ask
        break;
      case 'skip':
        summary.skipped.push(slotId);
        break;
    }
  }

  return summary;
}

/**
 * Determine if we should ask about sub-vertical based on industry
 */
export function shouldAskSubVertical(industry: string | null): boolean {
  if (!industry) return false;
  
  // Industries that have important sub-verticals that affect the app structure
  const industriesWithSubVerticals: Record<string, string[]> = {
    'real-estate': ['rentals', 'sales', 'commercial'],
    'fitness-coach': ['personal-training', 'group-training', 'online'],
    'cleaning': ['residential', 'commercial', 'specialized'],
  };

  return industry in industriesWithSubVerticals;
}

/**
 * Get sub-vertical options for an industry
 */
export function getSubVerticalOptions(industry: string): Array<{ value: string; label: string }> {
  const options: Record<string, Array<{ value: string; label: string }>> = {
    'real-estate': [
      { value: 'rentals', label: 'Rental property management' },
      { value: 'sales', label: 'Buying and selling homes' },
      { value: 'commercial', label: 'Commercial real estate' },
    ],
    'fitness-coach': [
      { value: 'personal-training', label: 'Personal training (1-on-1)' },
      { value: 'group-training', label: 'Group classes and bootcamps' },
      { value: 'online', label: 'Online/virtual coaching' },
    ],
    'cleaning': [
      { value: 'residential', label: 'Home cleaning' },
      { value: 'commercial', label: 'Office and commercial spaces' },
      { value: 'specialized', label: 'Specialized (move-out, deep clean)' },
    ],
  };

  return options[industry] || [];
}

/**
 * Format a decision for display/logging
 */
export function formatDecision(slotId: SlotId, slot: SlotValue, decision: SlotDecision): string {
  const confidence = Math.round(slot.confidence * 100);
  const value = slot.value ? JSON.stringify(slot.value) : 'null';
  return `${slotId}: ${decision} (${value}, ${confidence}% confidence, ${slot.source})`;
}
