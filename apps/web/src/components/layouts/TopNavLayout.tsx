/**
 * TopNavLayout
 * Layout with a fixed top navigation bar and main content area
 * Supports theme tokens and density variants
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface TopNavLayoutProps {
  /** Main content area */
  children: React.ReactNode;
  /** Navigation bar content */
  nav: React.ReactNode;
  /** Optional secondary nav (e.g., breadcrumbs) */
  secondaryNav?: React.ReactNode;
  className?: string;
  /** Navigation height */
  navHeight?: 'sm' | 'md' | 'lg';
  /** Whether navigation is sticky */
  sticky?: boolean;
  /** Content max width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Content padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Background style for navigation */
  navStyle?: 'solid' | 'transparent' | 'blur';
}

const navHeightClasses = {
  sm: 'h-12',
  md: 'h-14',
  lg: 'h-16',
};

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-2 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const navStyleClasses = {
  solid: 'bg-surface-section border-b border-border',
  transparent: 'bg-transparent',
  blur: 'bg-surface-section/80 backdrop-blur-md border-b border-border/50',
};

export function TopNavLayout({
  children,
  nav,
  secondaryNav,
  className,
  navHeight = 'md',
  sticky = true,
  maxWidth = 'xl',
  padding = 'md',
  navStyle = 'solid',
}: TopNavLayoutProps) {
  return (
    <div className={cn('flex flex-col min-h-screen w-full', className)}>
      {/* Primary Navigation */}
      <header
        className={cn(
          'z-40 w-full transition-colors duration-200',
          navHeightClasses[navHeight],
          navStyleClasses[navStyle],
          sticky && 'sticky top-0'
        )}
      >
        <div className={cn(
          'h-full mx-auto px-4 flex items-center',
          maxWidthClasses[maxWidth]
        )}>
          {nav}
        </div>
      </header>

      {/* Secondary Navigation (breadcrumbs, tabs, etc.) */}
      {secondaryNav && (
        <div className="w-full border-b border-border bg-muted/30">
          <div className={cn(
            'mx-auto px-4 py-2',
            maxWidthClasses[maxWidth]
          )}>
            {secondaryNav}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        'flex-1 w-full mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding]
      )}>
        {children}
      </main>
    </div>
  );
}

TopNavLayout.displayName = 'TopNavLayout';

/**
 * TopNavItem - Helper component for navigation items
 */
export interface TopNavItemProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TopNavItem({ children, active, onClick, className }: TopNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-accent text-accent-foreground',
        !active && 'text-muted-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

TopNavItem.displayName = 'TopNavItem';

export default TopNavLayout;
