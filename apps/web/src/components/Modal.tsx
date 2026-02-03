import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen = false,
  onClose,
  title,
  children,
  className,
  style,
  ...props
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose?.()}>
      <DialogContent className={className} style={style} {...props}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
