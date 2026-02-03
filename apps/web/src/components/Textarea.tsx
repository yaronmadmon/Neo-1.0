import * as React from "react";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface TextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  required?: boolean;
  name?: string;
  id?: string;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  required = false,
  name,
  id,
  rows = 4,
  className,
  style,
  disabled = false,
  ...props
}) => {
  const textareaId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);
  
  return (
    <div className="mb-4" style={style}>
      {label && (
        <Label htmlFor={textareaId} className="mb-2">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <ShadcnTextarea
        id={textareaId}
        name={name || textareaId}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        required={required}
        rows={rows}
        className={className}
        disabled={disabled}
        {...props}
      />
    </div>
  );
};

export default Textarea;
