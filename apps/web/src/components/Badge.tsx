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
    success: 'secondary', // Will be overridden by color classes
    warning: 'secondary', // Will be overridden by color classes
    error: 'destructive',
    info: 'secondary', // Will be overridden by color classes
    destructive: 'destructive',
    outline: 'outline',
  };

  // Add theme-aware color classes based on variant (uses CSS variable tokens)
  const colorClasses: Record<string, string> = {
    success: 'bg-[hsl(var(--success-bg,142_76%_95%))] text-[hsl(var(--success,142_71%_45%))] hover:bg-[hsl(var(--success-bg,142_76%_95%)/0.8)] dark:bg-[hsl(var(--success)/0.2)] dark:text-[hsl(var(--success))] border-transparent',
    warning: 'bg-[hsl(var(--warning-bg,45_93%_95%))] text-[hsl(var(--warning,45_93%_47%))] hover:bg-[hsl(var(--warning-bg,45_93%_95%)/0.8)] dark:bg-[hsl(var(--warning)/0.2)] dark:text-[hsl(var(--warning))] border-transparent',
    info: 'bg-[hsl(var(--info-bg,201_96%_95%))] text-[hsl(var(--info,201_96%_32%))] hover:bg-[hsl(var(--info-bg,201_96%_95%)/0.8)] dark:bg-[hsl(var(--info)/0.2)] dark:text-[hsl(var(--info))] border-transparent',
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
