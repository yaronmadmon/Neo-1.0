/**
 * SidebarLayout
 * Layout with a fixed sidebar and main content area
 * Supports both left and right sidebar positions
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SidebarLayoutProps {
  /** Main content area */
  children: React.ReactNode;
  /** Sidebar content */
  sidebar: React.ReactNode;
  className?: string;
  /** Sidebar position */
  position?: 'left' | 'right';
  /** Sidebar width */
  sidebarWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether sidebar collapses on mobile */
  collapsible?: boolean;
  /** Initial collapsed state (only if collapsible) */
  defaultCollapsed?: boolean;
  /** Gap between sidebar and content */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Padding around the layout */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const sidebarWidthClasses = {
  sm: 'w-48 md:w-56',
  md: 'w-56 md:w-64',
  lg: 'w-64 md:w-72',
  xl: 'w-72 md:w-80',
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

export function SidebarLayout({
  children,
  sidebar,
  className,
  position = 'left',
  sidebarWidth = 'md',
  collapsible = true,
  gap = 'md',
  padding = 'none',
}: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  const sidebarElement = (
    <aside
      className={cn(
        'flex-shrink-0 bg-sidebar text-sidebar-foreground',
        'transition-all duration-300 ease-in-out',
        sidebarWidthClasses[sidebarWidth],
        collapsible && isCollapsed && 'w-0 md:w-16 overflow-hidden',
        'hidden md:block' // Hidden on mobile by default
      )}
    >
      <div className={cn('h-full', isCollapsed && 'md:hidden')}>
        {sidebar}
      </div>
    </aside>
  );
  
  const mainContent = (
    <main className="flex-1 min-w-0 overflow-auto">
      {children}
    </main>
  );
  
  return (
    <div
      className={cn(
        'flex min-h-full w-full',
        gapClasses[gap],
        paddingClasses[padding],
        className
      )}
    >
      {position === 'left' ? (
        <>
          {sidebarElement}
          {mainContent}
        </>
      ) : (
        <>
          {mainContent}
          {sidebarElement}
        </>
      )}
    </div>
  );
}

SidebarLayout.displayName = 'SidebarLayout';

/**
 * Convenience components for left/right sidebar
 */
export function SidebarLeft(props: Omit<SidebarLayoutProps, 'position'>) {
  return <SidebarLayout {...props} position="left" />;
}

export function SidebarRight(props: Omit<SidebarLayoutProps, 'position'>) {
  return <SidebarLayout {...props} position="right" />;
}

SidebarLeft.displayName = 'SidebarLeft';
SidebarRight.displayName = 'SidebarRight';

export default SidebarLayout;
