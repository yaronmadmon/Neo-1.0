import * as React from "react";
import { Input as ShadcnInput } from "@/components/ui/input";

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  type?: string;
  name?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  required = false,
  type = 'text',
  name,
  id,
  className,
  style,
  ...props
}) => {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);
  
  return (
    <div className="mb-4" style={style}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <ShadcnInput
        id={inputId}
        name={name || inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        required={required}
        className={className}
        {...props}
      />
    </div>
  );
};

export default Input;
