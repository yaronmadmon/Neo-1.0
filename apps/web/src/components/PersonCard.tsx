/**
 * PersonCard Component
 * A flexible card component for displaying person-type entities
 * with configurable fields and industry-specific actions.
 */

import * as React from 'react';
import {
  Card as ShadcnCard,
  CardHeader,
  CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================
// TYPES
// ============================================================

export type FieldType = 'email' | 'phone' | 'text' | 'date' | 'badge';
export type StatusColor = 'green' | 'yellow' | 'red' | 'gray';
export type ActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface PersonCardField {
  icon?: string;
  label?: string;
  value: string;
  type?: FieldType;
}

export interface PersonCardAction {
  label: string;
  icon?: string;
  variant?: ActionVariant;
  onClick?: () => void;
}

export interface PersonCardStatus {
  label: string;
  color: StatusColor;
}

export interface PersonCardProps {
  /** Person's display name */
  name: string;
  /** Avatar image URL */
  avatar?: string;
  /** Secondary text under the name */
  subtitle?: string;
  /** Array of field data to display */
  fields?: PersonCardField[];
  /** Primary action button */
  primaryAction?: PersonCardAction;
  /** Secondary action buttons */
  secondaryActions?: PersonCardAction[];
  /** Status badge */
  status?: PersonCardStatus;
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
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get status color classes
 */
function getStatusColorClasses(color: StatusColor): string {
  const colorMap: Record<StatusColor, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };
  return colorMap[color] || colorMap.gray;
}

/**
 * Get field icon
 */
function getFieldIcon(field: PersonCardField): string {
  if (field.icon) return field.icon;
  
  // Default icons based on type
  const typeIcons: Record<FieldType, string> = {
    email: '✉️',
    phone: '📞',
    text: '📝',
    date: '📅',
    badge: '🏷️',
  };
  
  return typeIcons[field.type || 'text'] || '📝';
}

/**
 * Format field value based on type
 */
function formatFieldValue(field: PersonCardField): React.ReactNode {
  const { value, type } = field;
  
  switch (type) {
    case 'email':
      return (
        <a 
          href={`mailto:${value}`} 
          className="text-blue-600 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    case 'phone':
      return (
        <a 
          href={`tel:${value}`} 
          className="text-blue-600 hover:underline dark:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    case 'date':
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    case 'badge':
      return (
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      );
    default:
      return value;
  }
}

/**
 * Get button variant
 */
function getButtonVariant(variant?: ActionVariant): 'default' | 'secondary' | 'ghost' | 'destructive' {
  switch (variant) {
    case 'primary': return 'default';
    case 'secondary': return 'secondary';
    case 'ghost': return 'ghost';
    case 'danger': return 'destructive';
    default: return 'secondary';
  }
}

// ============================================================
// COMPONENT
// ============================================================

export const PersonCard: React.FC<PersonCardProps> = ({
  name,
  avatar,
  subtitle,
  fields = [],
  primaryAction,
  secondaryActions = [],
  status,
  tags = [],
  className = '',
  style,
  onClick,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on a button or link
    if ((e.target as HTMLElement).closest('button, a')) {
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
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            {avatar && <AvatarImage src={avatar} alt={name} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          {/* Name and subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight line-clamp-2">{name}</h3>
              {status && (
                <Badge className={`text-xs flex-shrink-0 ${getStatusColorClasses(status.color)}`}>
                  {status.label}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Fields */}
        {fields.length > 0 && (
          <div className="space-y-2 mb-4">
            {fields.map((field, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="flex-shrink-0">{getFieldIcon(field)}</span>
                {field.label && (
                  <span className="text-muted-foreground">{field.label}:</span>
                )}
                <span className="truncate">{formatFieldValue(field)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        {(primaryAction || secondaryActions.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {primaryAction && (
              <Button
                variant={getButtonVariant(primaryAction.variant)}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  primaryAction.onClick?.();
                }}
              >
                {primaryAction.icon && <span className="mr-1">{primaryAction.icon}</span>}
                {primaryAction.label}
              </Button>
            )}
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                variant={getButtonVariant(action.variant)}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                }}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </ShadcnCard>
  );
};

export default PersonCard;
