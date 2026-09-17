"use client";

import { Drawer } from "vaul";
import { cn } from "@/utils/cn";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Sticky footer (e.g. the primary button) rendered outside the scroll area. */
  footer?: React.ReactNode;
  className?: string;
}

/** Native-feeling bottom sheet (vaul). Used for pickers, forms and confirmations. */
export default function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[24px] bg-surface shadow-sheet outline-none",
            className
          )}
        >
          <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />

          <div className="shrink-0 px-5 pt-4">
            {title ? (
              <Drawer.Title className="text-lg font-semibold">{title}</Drawer.Title>
            ) : (
              <Drawer.Title className="sr-only">Sheet</Drawer.Title>
            )}
            {description ? (
              <Drawer.Description className="mt-0.5 text-sm text-muted">
                {description}
              </Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title ?? "Sheet"}</Drawer.Description>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="shrink-0 border-t border-border bg-surface px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
          {!footer && <div className="pb-safe" />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
