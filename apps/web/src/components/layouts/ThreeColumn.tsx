/**
 * ThreeColumn Layout
 * Three column layout with customizable proportions
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ThreeColumnProps {
  /** Left column content */
  left: React.ReactNode;
  /** Center column content */
  center: React.ReactNode;
  /** Right column content */
  right: React.ReactNode;
  className?: string;
  /** Column ratio - how to divide the space */
  ratio?: '1:1:1' | '1:2:1' | '1:3:1' | '2:1:1' | '1:1:2';
  /** Gap between columns */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Padding around the layout */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const ratioClasses = {
  '1:1:1': 'grid-cols-1 md:grid-cols-3',
  '1:2:1': 'grid-cols-1 md:grid-cols-4',
  '1:3:1': 'grid-cols-1 md:grid-cols-5',
  '2:1:1': 'grid-cols-1 md:grid-cols-4',
  '1:1:2': 'grid-cols-1 md:grid-cols-4',
};

const leftColClasses = {
  '1:1:1': 'md:col-span-1',
  '1:2:1': 'md:col-span-1',
  '1:3:1': 'md:col-span-1',
  '2:1:1': 'md:col-span-2',
  '1:1:2': 'md:col-span-1',
};

const centerColClasses = {
  '1:1:1': 'md:col-span-1',
  '1:2:1': 'md:col-span-2',
  '1:3:1': 'md:col-span-3',
  '2:1:1': 'md:col-span-1',
  '1:1:2': 'md:col-span-1',
};

const rightColClasses = {
  '1:1:1': 'md:col-span-1',
  '1:2:1': 'md:col-span-1',
  '1:3:1': 'md:col-span-1',
  '2:1:1': 'md:col-span-1',
  '1:1:2': 'md:col-span-2',
};

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2 md:gap-4',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-2 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function ThreeColumn({
  left,
  center,
  right,
  className,
  ratio = '1:1:1',
  gap = 'md',
  padding = 'md',
}: ThreeColumnProps) {
  return (
    <div
      className={cn(
        'grid min-h-full w-full',
        ratioClasses[ratio],
        gapClasses[gap],
        paddingClasses[padding],
        className
      )}
    >
      <div className={leftColClasses[ratio]}>
        {left}
      </div>
      <div className={centerColClasses[ratio]}>
        {center}
      </div>
      <div className={rightColClasses[ratio]}>
        {right}
      </div>
    </div>
  );
}

ThreeColumn.displayName = 'ThreeColumn';

export default ThreeColumn;
