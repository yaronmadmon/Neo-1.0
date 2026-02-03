/**
 * DashboardGrid Layout
 * Flexible grid layout for dashboard-style pages with widgets/cards
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
  /** Number of columns */
  columns?: 1 | 2 | 3 | 4 | 6;
  /** Gap between grid items */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Padding around the grid */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2 md:gap-3',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-2 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function DashboardGrid({
  children,
  className,
  columns = 3,
  gap = 'md',
  padding = 'md',
}: DashboardGridProps) {
  return (
    <div
      className={cn(
        'grid min-h-full w-full',
        columnClasses[columns],
        gapClasses[gap],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

DashboardGrid.displayName = 'DashboardGrid';

/**
 * Dashboard grid item with optional spanning
 */
export interface DashboardGridItemProps {
  children: React.ReactNode;
  className?: string;
  /** Column span */
  colSpan?: 1 | 2 | 3 | 4 | 'full';
  /** Row span */
  rowSpan?: 1 | 2 | 3;
}

const colSpanClasses = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-2 lg:col-span-3',
  4: 'col-span-1 md:col-span-2 lg:col-span-4',
  full: 'col-span-full',
};

const rowSpanClasses = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};

export function DashboardGridItem({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
}: DashboardGridItemProps) {
  return (
    <div
      className={cn(
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {children}
    </div>
  );
}

DashboardGridItem.displayName = 'DashboardGridItem';

export default DashboardGrid;
