/**
 * Layout Components
 * Pre-built layout wrappers for common page structures
 */

export { SingleColumn, type SingleColumnProps } from './SingleColumn';
export { TwoColumn, type TwoColumnProps } from './TwoColumn';
export { ThreeColumn, type ThreeColumnProps } from './ThreeColumn';
export { 
  SidebarLayout, 
  SidebarLeft, 
  SidebarRight, 
  type SidebarLayoutProps 
} from './SidebarLayout';
export { 
  DashboardGrid, 
  DashboardGridItem, 
  type DashboardGridProps,
  type DashboardGridItemProps,
} from './DashboardGrid';
export {
  TopNavLayout,
  TopNavItem,
  type TopNavLayoutProps,
  type TopNavItemProps,
} from './TopNavLayout';
export {
  MasterDetailLayout,
  MasterListItem,
  type MasterDetailLayoutProps,
  type MasterListItemProps,
} from './MasterDetailLayout';

/**
 * Layout type definitions for schema
 */
export type LayoutType = 
  | 'single_column'
  | 'two_column'
  | 'three_column'
  | 'sidebar_left'
  | 'sidebar_right'
  | 'dashboard_grid'
  | 'full_width'
  | 'top_nav'
  | 'master_detail';

/**
 * Layout configuration from schema
 */
export interface LayoutConfig {
  type: LayoutType;
  /** For two/three column: ratio like '1:2' or '1:2:1' */
  ratio?: string;
  /** Sidebar width for sidebar layouts */
  sidebarWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Number of columns for grid */
  columns?: 1 | 2 | 3 | 4 | 6;
  /** Gap between sections */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Padding around the layout */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Max width for single column */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Master panel width for master_detail */
  masterWidth?: 'narrow' | 'medium' | 'wide';
  /** Nav height for top_nav */
  navHeight?: 'sm' | 'md' | 'lg';
}

/**
 * Get friendly layout names for UI
 */
export const LAYOUT_DISPLAY_NAMES: Record<LayoutType, string> = {
  'single_column': 'Single Column',
  'two_column': 'Two Columns',
  'three_column': 'Three Columns',
  'sidebar_left': 'Left Sidebar',
  'sidebar_right': 'Right Sidebar',
  'dashboard_grid': 'Dashboard Grid',
  'full_width': 'Full Width',
  'top_nav': 'Top Navigation',
  'master_detail': 'Master-Detail (List + Panel)',
};

/**
 * Layout descriptions for user help
 */
export const LAYOUT_DESCRIPTIONS: Record<LayoutType, string> = {
  'single_column': 'Content in one centered column',
  'two_column': 'Content split into two columns',
  'three_column': 'Content split into three columns',
  'sidebar_left': 'Sidebar on the left, main content on right',
  'sidebar_right': 'Main content on left, sidebar on right',
  'dashboard_grid': 'Grid of cards/widgets',
  'full_width': 'Full width, no max-width constraint',
  'top_nav': 'Top navigation bar with centered content',
  'master_detail': 'List panel with side-by-side detail view',
};
