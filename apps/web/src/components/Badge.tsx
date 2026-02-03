import * as React from "react";
import { Badge as ShadcnBadge } from "@/components/ui/badge";

export interface BadgeProps {
  text?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'destructive' | 'outline';
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  children,
  variant = 'default',
  className,
  style,
  ...props
}) => {
  // Map our variants to shadcn variants
  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    default: 'default',
    primary: 'default',
    secondary: 'secondary',
    success: 'default',
    warning: 'secondary',
    error: 'destructive',
    info: 'secondary',
    destructive: 'destructive',
    outline: 'outline',
  };

  // Add color classes based on variant for custom colors
  const colorClasses: Record<string, string> = {
    success: 'bg-green-100 text-green-800 hover:bg-green-100/80',
    warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80',
    info: 'bg-blue-100 text-blue-800 hover:bg-blue-100/80',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/80',
  };

  const shadcnVariant = variantMap[variant] || 'default';
  const extraClasses = colorClasses[variant] || '';

  const content = text ?? children;

  return (
    <ShadcnBadge
      variant={shadcnVariant}
      className={`${extraClasses} ${className || ''}`}
      style={style}
      {...props}
    >
      {content || ''}
    </ShadcnBadge>
  );
};

export default Badge;
