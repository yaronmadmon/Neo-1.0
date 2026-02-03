import * as React from "react";
import { Switch as ShadcnSwitch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface SwitchProps {
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

export const Switch: React.FC<SwitchProps> = ({
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
  const switchId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '_') : undefined);
  
  return (
    <div className="flex items-center space-x-2" style={style}>
      <ShadcnSwitch
        id={switchId}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={className}
        {...props}
      />
      {label && (
        <Label htmlFor={switchId}>
          {label}
        </Label>
      )}
    </div>
  );
};

export default Switch;
