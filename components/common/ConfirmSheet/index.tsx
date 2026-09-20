"use client";

import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for cancel/void/delete flows. */
  destructive?: boolean;
  isLoading?: boolean;
  /** Blocks the confirm button, e.g. until a confirmation word has been typed. */
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Optional extra fields (e.g. a reason input) rendered above the buttons. */
  children?: React.ReactNode;
}

export default function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isLoading = false,
  confirmDisabled = false,
  onConfirm,
  children,
}: ConfirmSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            size="lg"
            isLoading={isLoading}
            disabled={confirmDisabled}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children}
    </BottomSheet>
  );
}
