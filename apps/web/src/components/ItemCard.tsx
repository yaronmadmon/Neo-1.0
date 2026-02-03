/**
 * ItemCard Component
 * A flexible card component for displaying non-person entities
 * like products, orders, appointments, and services.
 */

import * as React from 'react';
import {
  Card as ShadcnCard,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================
// TYPES
// ============================================================

export type ItemCardStatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';
export type ItemCardActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ItemCardField {
  label: string;
  value: string | number;
  format?: 'text' | 'currency' | 'date' | 'number' | 'percentage';
}

export interface ItemCardStatus {
  label: string;
  color: ItemCardStatusColor;
}

export interface ItemCardAction {
  label: string;
  icon?: string;
  variant?: ItemCardActionVariant;
  onClick?: () => void;
}

export interface ItemCardProps {
  /** Item title */
  title: string;
  /** Image URL */
  image?: string;
  /** Secondary text under the title */
  subtitle?: string;
  /** Price or main value */
  price?: number | string;
  /** Currency symbol for price */
  currency?: string;
  /** Array of field data to display */
  fields?: ItemCardField[];
  /** Status badge */
  status?: ItemCardStatus;
  /** Action buttons */
  actions?: ItemCardAction[];
  /** Tags to display */
  tags?: string[];
  /** Additional className */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Click handler for the card itself */
  onClick?: () => void;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get status color classes
 */
function getStatusColorClasses(color: ItemCardStatusColor): string {
  const colorMap: Record<ItemCardStatusColor, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };
  return colorMap[color] || colorMap.gray;
}

/**
 * Format field value based on format type
 */
function formatFieldValue(field: ItemCardField, currency = '$'): string {
  const { value, format = 'text' } = field;
  
  switch (format) {
    case 'currency':
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(numValue) ? String(value) : `${currency}${numValue.toFixed(2)}`;
    case 'date':
      try {
        return new Date(String(value)).toLocaleDateString();
      } catch {
        return String(value);
      }
    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? String(value) : num.toLocaleString();
    case 'percentage':
      const pct = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(pct) ? String(value) : `${pct}%`;
    default:
      return String(value);
  }
}

/**
 * Format price display
 */
function formatPrice(price: number | string, currency = '$'): string {
  const numValue = typeof price === 'number' ? price : parseFloat(String(price));
  if (isNaN(numValue)) return String(price);
  return `${currency}${numValue.toFixed(2)}`;
}

/**
 * Get button variant
 */
function getButtonVariant(variant?: ItemCardActionVariant): 'default' | 'secondary' | 'ghost' | 'destructive' {
  switch (variant) {
    case 'primary': return 'default';
    case 'secondary': return 'secondary';
    case 'ghost': return 'ghost';
    case 'danger': return 'destructive';
    default: return 'secondary';
  }
}

/**
 * Get placeholder image
 */
function getPlaceholderImage(title: string): React.ReactNode {
  return (
    <div className="w-full h-32 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
      <span className="text-4xl opacity-50">
        {title.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export const ItemCard: React.FC<ItemCardProps> = ({
  title,
  image,
  subtitle,
  price,
  currency = '$',
  fields = [],
  status,
  actions = [],
  tags = [],
  className = '',
  style,
  onClick,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on a button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  return (
    <ShadcnCard 
      className={`overflow-hidden transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={style}
      onClick={onClick ? handleCardClick : undefined}
    >
      {/* Image */}
      {image ? (
        <div className="w-full h-32 overflow-hidden">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        getPlaceholderImage(title)
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg truncate">{title}</h3>
              {status && (
                <Badge className={`text-xs flex-shrink-0 ${getStatusColorClasses(status.color)}`}>
                  {status.label}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          
          {/* Price */}
          {price !== undefined && (
            <div className="text-lg font-bold text-primary flex-shrink-0">
              {formatPrice(price, currency)}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Fields */}
        {fields.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
            {fields.map((field, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-muted-foreground">{field.label}:</span>
                <span className="font-medium truncate ml-2">
                  {formatFieldValue(field, currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      {/* Actions */}
      {actions.length > 0 && (
        <CardFooter className="pt-0 pb-3">
          <div className="flex flex-wrap gap-2 w-full">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={getButtonVariant(action.variant)}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                }}
                className={index === 0 ? 'flex-1' : ''}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        </CardFooter>
      )}
    </ShadcnCard>
  );
};

export default ItemCard;
