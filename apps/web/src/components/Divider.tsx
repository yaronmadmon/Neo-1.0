import * as React from "react";
import { Separator } from "@/components/ui/separator";

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className,
  style,
  ...props
}) => {
  // Extract only the props that Separator accepts
  const { id, children, ...rest } = props;
  
  return (
    <Separator
      orientation={orientation}
      className={className}
      style={style}
    />
  );
};

export default Divider;
