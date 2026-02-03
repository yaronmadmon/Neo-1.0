import * as React from "react";
import { Button as ShadcnButton } from "@/components/ui/button";

export interface ButtonProps {
  label?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  id?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className,
  type = 'button',
  style,
  id,
  ...props
}) => {
  // Map our variant names to shadcn variant names
  const shadcnVariant = 
    variant === 'primary' ? 'default' : 
    variant === 'danger' ? 'destructive' :
    variant === 'ghost' ? 'ghost' :
    'secondary';
  
  // Handle click with logging for debugging
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    console.log('🔘 Button component clicked:', { id, label, hasOnClick: !!onClick });
    if (onClick) {
      onClick(e);
    }
  };
  
  return (
    <ShadcnButton
      variant={shadcnVariant}
      onClick={handleClick}
      disabled={disabled}
      className={className}
      type={type}
      style={style}
      {...props}
    >
      {label || children || 'Button'}
    </ShadcnButton>
  );
};

export default Button;
