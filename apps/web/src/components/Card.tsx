import * as React from "react";
import {
  Card as ShadcnCard,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export interface CardProps {
  title?: string;
  value?: string | number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  title,
  value,
  children,
  className,
  style,
  ...props
}) => {
  return (
    <ShadcnCard className={className} style={style} {...props}>
      {(title || value !== undefined) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {value !== undefined && (
            <div className="text-2xl font-bold">{value}</div>
          )}
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
    </ShadcnCard>
  );
};

export default Card;
