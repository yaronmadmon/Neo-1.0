/**
 * Block Selector
 * Selects appropriate visual blocks based on industry, features, and entities
 */

import type { VisualBlock, BlockSelection, BlockSlots, DashboardType } from './types.js';
import { SHELL_BLOCKS } from './shells/index.js';
import { PAGE_BLOCKS } from './pages/index.js';
import { WIDGET_BLOCKS } from './widgets/index.js';

// ============================================================
// TYPES
// ============================================================

export interface IndustryContext {
  id: string;
  dashboardType: DashboardType;
  features?: string[];
}

export interface SelectionContext {
  industry?: IndustryContext;
  features: string[];
  entities: Array<{
    id: string;
    name: string;
    type?: string;
  }>;
  pageTypes: string[];
}

// ============================================================
// BLOCK SELECTOR
// ============================================================

export class BlockSelector {
  private shellBlocks: VisualBlock[];
  private pageBlocks: VisualBlock[];
  private widgetBlocks: VisualBlock[];

  constructor() {
    this.shellBlocks = SHELL_BLOCKS;
    this.pageBlocks = PAGE_BLOCKS;
    this.widgetBlocks = WIDGET_BLOCKS;
  }

  /**
   * Select blocks for an app based on context
   */
  selectBlocksForApp(context: SelectionContext): BlockSelection {
    const shell = this.selectShell(context);
    const pageBlocks = this.selectPageBlocks(context);
    const widgets = this.selectWidgets(context);

    return {
      shell,
      pageBlocks,
      widgets,
      slots: {} as BlockSlots, // Slots will be populated by SlotMapper
    };
  }

  /**
   * Select the best shell block
   */
  private selectShell(context: SelectionContext): VisualBlock {
    const { industry, features } = context;

    // Priority 1: Feature-based selection
    if (this.hasInvoiceFeatures(features)) {
      const dataShell = this.shellBlocks.find(b => b.id === 'dashboard-05');
      if (dataShell) return dataShell;
    }

    if (this.hasInventoryFeatures(features)) {
      const inventoryShell = this.shellBlocks.find(b => b.id === 'dashboard-07');
      if (inventoryShell) return inventoryShell;
    }

    // Priority 2: Industry dashboard type
    if (industry?.dashboardType) {
      const typeMatch = this.shellBlocks.find(
        b => b.triggers.dashboardType === industry.dashboardType
      );
      if (typeMatch) return typeMatch;
    }

    // Priority 3: Industry-specific shell
    if (industry?.id) {
      const industryMatch = this.shellBlocks.find(
        b => b.triggers.industries?.includes(industry.id)
      );
      if (industryMatch) return industryMatch;
    }

    // Default: Standard business shell
    return this.shellBlocks.find(b => b.id === 'dashboard-02') || this.shellBlocks[0];
  }

  /**
   * Select page blocks for each page type
   */
  private selectPageBlocks(context: SelectionContext): Map<string, VisualBlock> {
    const result = new Map<string, VisualBlock>();
    const { pageTypes, industry, features } = context;

    for (const pageType of pageTypes) {
      // Find blocks that match this page type
      const candidates = this.pageBlocks.filter(
        b => b.triggers.pageTypes?.includes(pageType)
      );

      if (candidates.length === 0) continue;

      // Score candidates based on context match
      const scored = candidates.map(block => ({
        block,
        score: this.scoreBlock(block, context),
      }));

      // Select highest scoring block
      scored.sort((a, b) => b.score - a.score);
      if (scored[0]) {
        result.set(pageType, scored[0].block);
      }
    }

    return result;
  }

  /**
   * Select widget blocks based on features
   */
  private selectWidgets(context: SelectionContext): VisualBlock[] {
    const { features, industry } = context;
    const selected: VisualBlock[] = [];

    for (const widget of this.widgetBlocks) {
      // Check if widget is triggered by any feature
      const featureMatch = widget.triggers.features?.some(f => features.includes(f));
      
      // Check if widget matches industry
      const industryMatch = widget.triggers.industries?.includes(industry?.id || '') ||
        widget.triggers.industries?.includes('*');

      if (featureMatch || industryMatch) {
        selected.push(widget);
      }
    }

    return selected;
  }

  /**
   * Score a block based on how well it matches the context
   */
  private scoreBlock(block: VisualBlock, context: SelectionContext): number {
    let score = 0;
    const { industry, features } = context;

    // Industry match
    if (industry?.id && block.triggers.industries?.includes(industry.id)) {
      score += 10;
    }
    if (block.triggers.industries?.includes('*')) {
      score += 1; // Universal blocks get a small boost
    }

    // Dashboard type match
    if (industry?.dashboardType && block.triggers.dashboardType === industry.dashboardType) {
      score += 5;
    }

    // Feature matches
    if (block.triggers.features) {
      const matchedFeatures = block.triggers.features.filter(f => features.includes(f));
      score += matchedFeatures.length * 3;
    }

    return score;
  }

  /**
   * Check if features indicate invoice/payment functionality
   */
  private hasInvoiceFeatures(features: string[]): boolean {
    const invoiceKeywords = ['invoices', 'payments', 'billing', 'transactions', 'accounting'];
    return features.some(f => invoiceKeywords.includes(f.toLowerCase()));
  }

  /**
   * Check if features indicate inventory functionality
   */
  private hasInventoryFeatures(features: string[]): boolean {
    const inventoryKeywords = ['inventory', 'products', 'catalog', 'stock', 'warehouse'];
    return features.some(f => inventoryKeywords.includes(f.toLowerCase()));
  }
}

// ============================================================
// CONVENIENCE FUNCTION
// ============================================================

/**
 * Select blocks for an app (convenience function)
 */
export function selectBlocksForApp(context: SelectionContext): BlockSelection {
  const selector = new BlockSelector();
  return selector.selectBlocksForApp(context);
}
