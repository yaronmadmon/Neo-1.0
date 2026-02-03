import * as React from "react";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  required?: boolean;
  name?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Select an option',
  value,
  defaultValue,
  onChange,
  options = [],
  required = false,
  name,
  id,
  className,
  style,
  disabled = false,
  ...props
}) => {
  const selectId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);
  
  return (
    <div className="mb-4" style={style}>
      {label && (
        <Label htmlFor={selectId} className="mb-2">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <ShadcnSelect
        value={value}
        defaultValue={defaultValue}
        onValueChange={onChange}
        disabled={disabled}
        name={name}
        {...props}
      >
        <SelectTrigger id={selectId} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
    </div>
  );
};

export default Select;
