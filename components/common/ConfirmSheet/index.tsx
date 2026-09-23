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
  /**
   * The way forward when the action itself is impossible — a delete that history blocks
   * offering "Archive instead". It takes the primary slot and `onConfirm` is not rendered,
   * so the sheet never shows a button that cannot do anything.
   */
  alternative?: {
    label: string;
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
  };
  /**
   * Drops the confirm button entirely, leaving cancel across the full width — for a sheet
   * whose only real actions live in `children` (e.g. "Remove" on each blocking row), where
   * a confirm button could do nothing but close.
   */
  confirmHidden?: boolean;
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
  alternative,
  confirmHidden = false,
  children,
}: ConfirmSheetProps) {
  const showConfirm = !confirmHidden || Boolean(alternative);
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className={showConfirm ? "grid grid-cols-2 gap-3" : "grid grid-cols-1"}>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || alternative?.isLoading}
          >
            {cancelLabel}
          </Button>
          {alternative ? (
            // Reversible, so it is the plain primary rather than the red one.
            <Button size="lg" isLoading={alternative.isLoading} onClick={() => void alternative.onConfirm()}>
              {alternative.label}
            </Button>
          ) : showConfirm ? (
            <Button
              variant={destructive ? "danger" : "primary"}
              size="lg"
              isLoading={isLoading}
              disabled={confirmDisabled}
              onClick={() => void onConfirm()}
            >
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      }
    >
      {children}
    </BottomSheet>
  );
}
