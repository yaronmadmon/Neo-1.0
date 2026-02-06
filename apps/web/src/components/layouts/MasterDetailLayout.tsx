/**
 * MasterDetailLayout
 * Layout with a list panel (master) and detail panel side-by-side
 * Supports responsive collapse on mobile, theme tokens, and density variants
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MasterDetailLayoutProps {
  /** Master panel content (list) */
  master: React.ReactNode;
  /** Detail panel content (selected item) */
  detail: React.ReactNode;
  /** Whether an item is selected (shows detail on mobile) */
  hasSelection?: boolean;
  /** Callback when back button is clicked on mobile detail view */
  onBack?: () => void;
  className?: string;
  /** Master panel width ratio */
  masterWidth?: 'narrow' | 'medium' | 'wide';
  /** Gap between panels */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** Padding around the layout */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Show divider between panels */
  showDivider?: boolean;
  /** Empty state for detail panel */
  emptyDetail?: React.ReactNode;
  /** Master panel header */
  masterHeader?: React.ReactNode;
  /** Detail panel header */
  detailHeader?: React.ReactNode;
}

const masterWidthClasses = {
  narrow: 'w-64 md:w-72 lg:w-80',
  medium: 'w-72 md:w-80 lg:w-96',
  wide: 'w-80 md:w-96 lg:w-[28rem]',
};

const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2 md:gap-3',
  md: 'gap-3 md:gap-4',
  lg: 'gap-4 md:gap-6',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-2 sm:p-3',
  md: 'p-3 sm:p-4',
  lg: 'p-4 sm:p-6',
};

export function MasterDetailLayout({
  master,
  detail,
  hasSelection = false,
  onBack,
  className,
  masterWidth = 'medium',
  gap = 'md',
  padding = 'none',
  showDivider = true,
  emptyDetail,
  masterHeader,
  detailHeader,
}: MasterDetailLayoutProps) {
  const defaultEmptyDetail = (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <div className="text-center p-8">
        <ChevronLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Select an item</p>
        <p className="text-sm">Choose from the list to view details</p>
      </div>
    </div>
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
      {/* Master Panel (List) - uses surface-section for visual depth */}
      <div
        className={cn(
          'flex-shrink-0 flex flex-col',
          'bg-surface-section',
          masterWidthClasses[masterWidth],
          // Hide on mobile when selection exists
          hasSelection && 'hidden md:flex',
          // Mobile: full width when no selection
          !hasSelection && 'flex w-full md:w-auto'
        )}
      >
        {masterHeader && (
          <div className="flex-shrink-0 border-b border-border p-3 bg-muted/30">
            {masterHeader}
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {master}
        </div>
      </div>

      {/* Divider */}
      {showDivider && (
        <div className="hidden md:block w-px bg-border flex-shrink-0" />
      )}

      {/* Detail Panel - uses surface-section for visual depth */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0',
          'bg-surface-section',
          // Hide on mobile when no selection
          !hasSelection && 'hidden md:flex'
        )}
      >
        {/* Mobile back button + optional detail header */}
        {(hasSelection || detailHeader) && (
          <div className="flex-shrink-0 border-b border-border p-3 bg-muted/30 md:hidden">
            <div className="flex items-center gap-2">
              {hasSelection && onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {detailHeader && <div className="flex-1">{detailHeader}</div>}
            </div>
          </div>
        )}
        
        {/* Desktop detail header */}
        {detailHeader && (
          <div className="hidden md:block flex-shrink-0 border-b border-border p-3 bg-muted/30">
            {detailHeader}
          </div>
        )}

        {/* Detail content */}
        <div className="flex-1 overflow-auto">
          {hasSelection ? detail : (emptyDetail || defaultEmptyDetail)}
        </div>
      </div>
    </div>
  );
}

MasterDetailLayout.displayName = 'MasterDetailLayout';

/**
 * MasterListItem - Helper component for master list items
 */
export interface MasterListItemProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  /** Density variant */
  density?: 'compact' | 'normal' | 'relaxed';
}

const densityPadding = {
  compact: 'px-3 py-2',
  normal: 'px-4 py-3',
  relaxed: 'px-4 py-4',
};

export function MasterListItem({
  children,
  selected,
  onClick,
  className,
  density = 'normal',
}: MasterListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left transition-colors',
        densityPadding[density],
        'hover:bg-accent/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        'border-b border-border/50 last:border-b-0',
        selected && 'bg-accent text-accent-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

MasterListItem.displayName = 'MasterListItem';

export default MasterDetailLayout;
