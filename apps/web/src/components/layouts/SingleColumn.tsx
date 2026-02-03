/**
 * SingleColumn Layout
 * Full-width single column layout for content-focused pages
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SingleColumnProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum width of the content area */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Padding around the content */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Center the content horizontally */
  centered?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-2 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function SingleColumn({
  children,
  className,
  maxWidth = 'xl',
  padding = 'md',
  centered = true,
}: SingleColumnProps) {
  return (
    <div
      className={cn(
        'min-h-full w-full',
        centered && 'mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

SingleColumn.displayName = 'SingleColumn';

export default SingleColumn;
