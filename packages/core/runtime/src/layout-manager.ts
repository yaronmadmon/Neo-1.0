/**
 * Layout Manager - Handles sections, rows, grids, and responsive layouts
 * Manages component positioning and layout structure
 */

import { StateManager } from './state-manager.js';

// CSS Properties type (compatible with CSSProperties)
export type CSSProperties = Record<string, string | number | undefined>;

// Window check for SSR compatibility
const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;

export interface LayoutConfig {
  type: LayoutType;
  direction?: 'row' | 'column';
  gap?: string | number;
  padding?: string | number;
  margin?: string | number;
  align?: AlignValue;
  justify?: JustifyValue;
  wrap?: boolean;
  columns?: number | string | ColumnConfig[];
  rows?: number | string | RowConfig[];
  areas?: string[][];
  responsive?: ResponsiveLayout;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
}

export type LayoutType = 
  | 'stack'      // Flexbox column
  | 'row'        // Flexbox row
  | 'grid'       // CSS Grid
  | 'masonry'    // Masonry layout
  | 'split'      // Two-pane split
  | 'sidebar'    // Sidebar + content
  | 'tabs'       // Tabbed content
  | 'accordion'  // Collapsible sections
  | 'carousel'   // Sliding carousel
  | 'absolute'   // Absolute positioning
  | 'fixed'      // Fixed positioning
  | 'sticky';    // Sticky positioning

export type AlignValue = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type JustifyValue = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface ColumnConfig {
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  flex?: number;
}

export interface RowConfig {
  height?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  flex?: number;
}

export interface ResponsiveLayout {
  sm?: Partial<LayoutConfig>;
  md?: Partial<LayoutConfig>;
  lg?: Partial<LayoutConfig>;
  xl?: Partial<LayoutConfig>;
}

export interface SectionConfig {
  id: string;
  name?: string;
  layout: LayoutConfig;
  order?: number;
  visible?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  sticky?: boolean;
  fullWidth?: boolean;
}

export interface LayoutSlot {
  id: string;
  area?: string;
  column?: number | string;
  row?: number | string;
  colSpan?: number;
  rowSpan?: number;
  order?: number;
  position?: PositionConfig;
}

export interface PositionConfig {
  type: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number;
}

/**
 * LayoutManager - Manages page layouts and component positioning
 */
export class LayoutManager {
  private stateManager: StateManager;
  private sections: Map<string, SectionConfig>;
  private slots: Map<string, LayoutSlot>;
  private breakpoints: Record<string, number>;
  private currentBreakpoint: string;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.sections = new Map();
    this.slots = new Map();
    this.breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    };
    this.currentBreakpoint = 'lg';

    // Listen for window resize in browser
    if (isBrowser) {
      this.updateBreakpoint();
      (globalThis as any).window?.addEventListener('resize', () => this.updateBreakpoint());
    }
  }

  /**
   * Update current breakpoint based on window width
   */
  private updateBreakpoint(): void {
    if (!isBrowser) return;

    const width = (globalThis as any).window?.innerWidth ?? 1024;
    let newBreakpoint = 'sm';

    for (const [bp, minWidth] of Object.entries(this.breakpoints)) {
      if (width >= minWidth) {
        newBreakpoint = bp;
      }
    }

    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.stateManager.setCustomState('breakpoint', newBreakpoint);
    }
  }

  /**
   * Get current breakpoint
   */
  getBreakpoint(): string {
    return this.currentBreakpoint;
  }

  /**
   * Register a section
   */
  registerSection(config: SectionConfig): void {
    this.sections.set(config.id, config);
  }

  /**
   * Get section config
   */
  getSection(sectionId: string): SectionConfig | undefined {
    return this.sections.get(sectionId);
  }

  /**
   * Register a slot for a component
   */
  registerSlot(componentId: string, slot: LayoutSlot): void {
    this.slots.set(componentId, slot);
  }

  /**
   * Get slot for a component
   */
  getSlot(componentId: string): LayoutSlot | undefined {
    return this.slots.get(componentId);
  }

  /**
   * Generate CSS styles for a layout config
   */
  getLayoutStyles(config: LayoutConfig): CSSProperties {
    const styles: CSSProperties = {};

    // Apply responsive overrides
    const responsiveConfig = this.getResponsiveConfig(config);

    switch (responsiveConfig.type) {
      case 'stack':
        Object.assign(styles, this.getStackStyles(responsiveConfig));
        break;
      case 'row':
        Object.assign(styles, this.getRowStyles(responsiveConfig));
        break;
      case 'grid':
        Object.assign(styles, this.getGridStyles(responsiveConfig));
        break;
      case 'split':
        Object.assign(styles, this.getSplitStyles(responsiveConfig));
        break;
      case 'sidebar':
        Object.assign(styles, this.getSidebarStyles(responsiveConfig));
        break;
      case 'absolute':
      case 'fixed':
      case 'sticky':
        styles.position = responsiveConfig.type;
        break;
    }

    // Common properties
    if (responsiveConfig.gap) {
      styles.gap = this.toPixels(responsiveConfig.gap);
    }
    if (responsiveConfig.padding) {
      styles.padding = this.toPixels(responsiveConfig.padding);
    }
    if (responsiveConfig.margin) {
      styles.margin = this.toPixels(responsiveConfig.margin);
    }
    if (responsiveConfig.minWidth) {
      styles.minWidth = responsiveConfig.minWidth;
    }
    if (responsiveConfig.maxWidth) {
      styles.maxWidth = responsiveConfig.maxWidth;
    }
    if (responsiveConfig.minHeight) {
      styles.minHeight = responsiveConfig.minHeight;
    }
    if (responsiveConfig.maxHeight) {
      styles.maxHeight = responsiveConfig.maxHeight;
    }
    if (responsiveConfig.overflow) {
      styles.overflow = responsiveConfig.overflow;
    }

    return styles;
  }

  /**
   * Get responsive config based on current breakpoint
   */
  private getResponsiveConfig(config: LayoutConfig): LayoutConfig {
    if (!config.responsive) return config;

    let result = { ...config };
    const breakpointOrder = ['sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(this.currentBreakpoint);

    // Apply responsive overrides in order
    for (let i = 0; i <= currentIndex; i++) {
      const bp = breakpointOrder[i];
      if (config.responsive[bp as keyof ResponsiveLayout]) {
        result = { ...result, ...config.responsive[bp as keyof ResponsiveLayout] };
      }
    }

    return result;
  }

  /**
   * Get styles for stack layout (vertical flex)
   */
  private getStackStyles(config: LayoutConfig): CSSProperties {
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: this.mapAlignValue(config.align || 'stretch'),
      justifyContent: this.mapJustifyValue(config.justify || 'start'),
      flexWrap: config.wrap ? 'wrap' : 'nowrap',
    };
  }

  /**
   * Get styles for row layout (horizontal flex)
   */
  private getRowStyles(config: LayoutConfig): CSSProperties {
    return {
      display: 'flex',
      flexDirection: 'row',
      alignItems: this.mapAlignValue(config.align || 'center'),
      justifyContent: this.mapJustifyValue(config.justify || 'start'),
      flexWrap: config.wrap ? 'wrap' : 'nowrap',
    };
  }

  /**
   * Get styles for grid layout
   */
  private getGridStyles(config: LayoutConfig): CSSProperties {
    const styles: CSSProperties = {
      display: 'grid',
    };

    // Columns
    if (config.columns) {
      if (typeof config.columns === 'number') {
        styles.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;
      } else if (typeof config.columns === 'string') {
        styles.gridTemplateColumns = config.columns;
      } else if (Array.isArray(config.columns)) {
        styles.gridTemplateColumns = config.columns
          .map(col => this.columnConfigToCSS(col))
          .join(' ');
      }
    }

    // Rows
    if (config.rows) {
      if (typeof config.rows === 'number') {
        styles.gridTemplateRows = `repeat(${config.rows}, auto)`;
      } else if (typeof config.rows === 'string') {
        styles.gridTemplateRows = config.rows;
      } else if (Array.isArray(config.rows)) {
        styles.gridTemplateRows = config.rows
          .map(row => this.rowConfigToCSS(row))
          .join(' ');
      }
    }

    // Grid areas
    if (config.areas) {
      styles.gridTemplateAreas = config.areas
        .map(row => `"${row.join(' ')}"`)
        .join(' ');
    }

    // Alignment
    if (config.align) {
      styles.alignItems = this.mapAlignValue(config.align);
    }
    if (config.justify) {
      styles.justifyItems = this.mapJustifyValue(config.justify);
    }

    return styles;
  }

  /**
   * Get styles for split layout
   */
  private getSplitStyles(config: LayoutConfig): CSSProperties {
    const direction = config.direction || 'row';
    return {
      display: 'flex',
      flexDirection: direction,
      height: '100%',
    };
  }

  /**
   * Get styles for sidebar layout
   */
  private getSidebarStyles(config: LayoutConfig): CSSProperties {
    return {
      display: 'grid',
      gridTemplateColumns: '250px 1fr',
      minHeight: '100%',
    };
  }

  /**
   * Get styles for a slot
   */
  getSlotStyles(slot: LayoutSlot): CSSProperties {
    const styles: CSSProperties = {};

    if (slot.area) {
      styles.gridArea = slot.area;
    }
    if (slot.column !== undefined) {
      styles.gridColumn = String(slot.column);
    }
    if (slot.row !== undefined) {
      styles.gridRow = String(slot.row);
    }
    if (slot.colSpan) {
      styles.gridColumn = `span ${slot.colSpan}`;
    }
    if (slot.rowSpan) {
      styles.gridRow = `span ${slot.rowSpan}`;
    }
    if (slot.order !== undefined) {
      styles.order = slot.order;
    }

    if (slot.position) {
      styles.position = slot.position.type;
      if (slot.position.top !== undefined) styles.top = this.toPixels(slot.position.top);
      if (slot.position.right !== undefined) styles.right = this.toPixels(slot.position.right);
      if (slot.position.bottom !== undefined) styles.bottom = this.toPixels(slot.position.bottom);
      if (slot.position.left !== undefined) styles.left = this.toPixels(slot.position.left);
      if (slot.position.zIndex !== undefined) styles.zIndex = slot.position.zIndex;
    }

    return styles;
  }

  /**
   * Convert column config to CSS
   */
  private columnConfigToCSS(config: ColumnConfig): string {
    if (config.flex) return `${config.flex}fr`;
    if (config.width) return this.toPixelString(config.width);
    if (config.minWidth && config.maxWidth) {
      return `minmax(${this.toPixelString(config.minWidth)}, ${this.toPixelString(config.maxWidth)})`;
    }
    return '1fr';
  }

  /**
   * Convert row config to CSS
   */
  private rowConfigToCSS(config: RowConfig): string {
    if (config.flex) return `${config.flex}fr`;
    if (config.height) return this.toPixelString(config.height);
    if (config.minHeight && config.maxHeight) {
      return `minmax(${this.toPixelString(config.minHeight)}, ${this.toPixelString(config.maxHeight)})`;
    }
    return 'auto';
  }

  /**
   * Map align value to CSS
   */
  private mapAlignValue(value: AlignValue): string {
    const map: Record<AlignValue, string> = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
      baseline: 'baseline',
    };
    return map[value] || value;
  }

  /**
   * Map justify value to CSS
   */
  private mapJustifyValue(value: JustifyValue): string {
    const map: Record<JustifyValue, string> = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly',
    };
    return map[value] || value;
  }

  /**
   * Convert value to pixels
   */
  private toPixels(value: string | number): string {
    if (typeof value === 'number') return `${value}px`;
    return value;
  }

  /**
   * Convert value to pixel string
   */
  private toPixelString(value: string | number): string {
    if (typeof value === 'number') return `${value}px`;
    return value;
  }

  /**
   * Create a responsive grid helper
   */
  createResponsiveGrid(baseColumns: number): LayoutConfig {
    return {
      type: 'grid',
      columns: baseColumns,
      gap: '1rem',
      responsive: {
        sm: { columns: 1 },
        md: { columns: Math.min(2, baseColumns) },
        lg: { columns: Math.min(3, baseColumns) },
        xl: { columns: baseColumns },
      },
    };
  }

  /**
   * Create a sidebar layout config
   */
  createSidebarLayout(sidebarWidth: string = '250px'): LayoutConfig {
    return {
      type: 'grid',
      columns: `${sidebarWidth} 1fr`,
      gap: '0',
      responsive: {
        sm: { type: 'stack', columns: 1 },
        md: { type: 'grid', columns: `${sidebarWidth} 1fr` },
      },
    };
  }

  /**
   * Create a card grid layout
   */
  createCardGrid(minCardWidth: string = '300px'): LayoutConfig {
    return {
      type: 'grid',
      columns: `repeat(auto-fill, minmax(${minCardWidth}, 1fr))`,
      gap: '1.5rem',
    };
  }

  /**
   * Create a masonry-like layout using CSS columns
   */
  createMasonryLayout(columnCount: number = 3): CSSProperties {
    return {
      columnCount,
      columnGap: '1.5rem',
    };
  }

  /**
   * Toggle section collapse state
   */
  toggleSection(sectionId: string): void {
    const section = this.sections.get(sectionId);
    if (section && section.collapsible) {
      section.collapsed = !section.collapsed;
      this.stateManager.setCustomState(`section:${sectionId}:collapsed`, section.collapsed);
    }
  }

  /**
   * Get section collapsed state
   */
  isSectionCollapsed(sectionId: string): boolean {
    const section = this.sections.get(sectionId);
    return section?.collapsed ?? false;
  }

  /**
   * Get all sections sorted by order
   */
  getSections(): SectionConfig[] {
    return Array.from(this.sections.values())
      .filter(s => s.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Clear all sections and slots
   */
  clear(): void {
    this.sections.clear();
    this.slots.clear();
  }
}

/**
 * Layout preset helpers
 */
export const LayoutPresets = {
  // Dashboard layout with sidebar
  dashboard: (): LayoutConfig => ({
    type: 'grid',
    columns: '250px 1fr',
    rows: '64px 1fr',
    areas: [
      ['header', 'header'],
      ['sidebar', 'content'],
    ],
    gap: '0',
    minHeight: '100vh',
  }),

  // Simple centered content
  centered: (): LayoutConfig => ({
    type: 'stack',
    align: 'center',
    justify: 'center',
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
  }),

  // Form layout
  form: (): LayoutConfig => ({
    type: 'stack',
    gap: '1rem',
    maxWidth: '600px',
  }),

  // Card grid
  cardGrid: (columns: number = 3): LayoutConfig => ({
    type: 'grid',
    columns,
    gap: '1.5rem',
    responsive: {
      sm: { columns: 1 },
      md: { columns: 2 },
      lg: { columns },
    },
  }),

  // Hero section
  hero: (): LayoutConfig => ({
    type: 'stack',
    align: 'center',
    justify: 'center',
    padding: '4rem 2rem',
    minHeight: '60vh',
  }),

  // Two-column split
  split: (ratio: string = '1fr 1fr'): LayoutConfig => ({
    type: 'grid',
    columns: ratio,
    gap: '2rem',
    responsive: {
      sm: { type: 'stack', columns: 1 },
    },
  }),
};
