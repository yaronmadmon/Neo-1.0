import * as React from "react";
import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface CheckboxProps {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  defaultChecked,
  onChange,
  name,
  id,
  className,
  style,
  disabled = false,
  ...props
}) => {
  const checkboxId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);
  
  return (
    <div className="flex items-center space-x-2" style={style}>
      <ShadcnCheckbox
        id={checkboxId}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={className}
        {...props}
      />
      {label && (
        <Label
          htmlFor={checkboxId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </Label>
      )}
    </div>
  );
};

export default Checkbox;
