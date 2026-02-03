/**
 * TwoColumn Layout
 * Side-by-side two column layout with customizable proportions
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface TwoColumnProps {
  /** Left column content */
  left: React.ReactNode;
  /** Right column content */
  right: React.ReactNode;
  className?: string;
  /** Column ratio - how to divide the space */
  ratio?: '1:1' | '1:2' | '2:1' | '1:3' | '3:1';
  /** Gap between columns */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Stack columns on mobile */
  stackOnMobile?: boolean;
  /** Reverse stack order on mobile */
  reverseOnMobile?: boolean;
  /** Padding around the layout */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const ratioClasses = {
  '1:1': 'grid-cols-1 md:grid-cols-2',
  '1:2': 'grid-cols-1 md:grid-cols-3',
  '2:1': 'grid-cols-1 md:grid-cols-3',
  '1:3': 'grid-cols-1 md:grid-cols-4',
  '3:1': 'grid-cols-1 md:grid-cols-4',
};

const leftColClasses = {
  '1:1': 'md:col-span-1',
  '1:2': 'md:col-span-1',
  '2:1': 'md:col-span-2',
  '1:3': 'md:col-span-1',
  '3:1': 'md:col-span-3',
};

const rightColClasses = {
  '1:1': 'md:col-span-1',
  '1:2': 'md:col-span-2',
  '2:1': 'md:col-span-1',
  '1:3': 'md:col-span-3',
  '3:1': 'md:col-span-1',
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

export function TwoColumn({
  left,
  right,
  className,
  ratio = '1:1',
  gap = 'md',
  stackOnMobile = true,
  reverseOnMobile = false,
  padding = 'md',
}: TwoColumnProps) {
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
      <div
        className={cn(
          leftColClasses[ratio],
          reverseOnMobile && stackOnMobile && 'order-2 md:order-1'
        )}
      >
        {left}
      </div>
      <div
        className={cn(
          rightColClasses[ratio],
          reverseOnMobile && stackOnMobile && 'order-1 md:order-2'
        )}
      >
        {right}
      </div>
    </div>
  );
}

TwoColumn.displayName = 'TwoColumn';

export default TwoColumn;
