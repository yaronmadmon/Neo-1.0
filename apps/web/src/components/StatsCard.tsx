/**
 * StatsCard Component
 * Reusable KPI/statistics card with trend indicator
 * Based on shadcn section-cards but with dynamic props
 */

import React from 'react';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  /** Title/label for the stat */
  title: string;
  /** The main value to display */
  value: string | number;
  /** Percentage change (positive or negative) */
  change?: number;
  /** Description text shown in footer */
  description?: string;
  /** Sub-description text */
  subDescription?: string;
  /** Icon to display (emoji or component) */
  icon?: React.ReactNode;
  /** Format the value as currency */
  currency?: boolean;
  /** Currency symbol (default: $) */
  currencySymbol?: string;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  change,
  description,
  subDescription,
  icon,
  currency = false,
  currencySymbol = '$',
  className,
  onClick,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;
  
  // Format value
  let displayValue = String(value);
  if (currency && typeof value === 'number') {
    displayValue = `${currencySymbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (typeof value === 'number') {
    displayValue = value.toLocaleString();
  }

  return (
    <Card 
      className={cn(
        '@container/card cursor-default',
        'bg-gradient-to-t from-primary/5 to-card dark:bg-card',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
      data-slot="card"
    >
      <CardHeader className="relative pb-2">
        {/* Badge positioned absolutely - rendered first so it's in the DOM flow */}
        {change !== undefined && (
          <div className="absolute right-4 top-4 z-10">
            <Badge 
              variant="outline" 
              className={cn(
                'flex gap-1 rounded-lg text-xs whitespace-nowrap',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              <TrendIcon className="size-3" />
              {isPositive ? '+' : ''}{change}%
            </Badge>
          </div>
        )}
        <CardDescription className={cn("flex items-center gap-2", change !== undefined && "pr-16")}>
          {icon && <span className="text-base flex-shrink-0">{icon}</span>}
          <span className="text-sm font-medium leading-tight">{title}</span>
        </CardDescription>
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {displayValue}
        </CardTitle>
      </CardHeader>
      {(description || subDescription) && (
        <CardFooter className="flex-col items-start gap-1 text-sm">
          {description && (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {description}
              {change !== undefined && <TrendIcon className="size-4" />}
            </div>
          )}
          {subDescription && (
            <div className="text-muted-foreground">
              {subDescription}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * StatsCardGrid - Container for multiple stats cards
 */
export interface StatsCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function StatsCardGrid({ 
  children, 
  columns = 4,
  className 
}: StatsCardGridProps) {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn(
      'grid gap-4',
      colClass[columns],
      className
    )}>
      {children}
    </div>
  );
}

export default StatsCard;
