/**
 * Visual Blocks Module
 * 
 * Provides infrastructure for selecting and composing visual blocks
 * based on industry, features, and entity types.
 */

// Types
export * from './types.js';

// Block definitions
export { SHELL_BLOCKS, getShellBlock, getDefaultShell } from './shells/index.js';
export { PAGE_BLOCKS, getPageBlock, getPageBlocksForType } from './pages/index.js';
export { WIDGET_BLOCKS, getWidgetBlock, getWidgetsForFeatures } from './widgets/index.js';

// Block selection
export { BlockSelector, selectBlocksForApp } from './block-selector.js';
export type { IndustryContext, SelectionContext } from './block-selector.js';

// Slot mapping
export { SlotMapper, mapBlueprintToSlots, mapEntityToListSlots } from './slot-mapper.js';
export type { BlueprintPage, BlueprintEntity, AppBlueprint } from './slot-mapper.js';
