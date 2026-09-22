"use client";

import { useRef, useState } from "react";
import { Drawer } from "vaul";
import Button from "@/components/common/Button";
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
  /**
   * Form sheets: once the user has typed or picked something, a swipe-down, tap outside or
   * Escape asks "Discard changes?" instead of silently throwing the input away. Closing from
   * the parent (after a save) is never intercepted. Only for sheets the parent remounts with
   * a new `key` on each open (the "edited" flag is not reset otherwise).
   */
  guardUnsaved?: boolean;
}

interface SheetProps extends Omit<BottomSheetProps, "guardUnsaved"> {
  /** Fires when something inside the scroll area is edited (used by `guardUnsaved`). */
  onEdit?: () => void;
}

/** The plain vaul sheet; `BottomSheet` wraps it with the unsaved-changes guard. */
function Sheet({ open, onOpenChange, title, description, children, footer, className, onEdit }: SheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(isOpen) => {
        if (isOpen) contentRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]')?.focus();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content
          ref={contentRef}
          className={cn(
            // On a pointer device this lifts off the bottom edge and rounds all four corners, so it
            // reads as a dialog. It stays bottom-anchored rather than centred: vaul animates the
            // open/close with its own transform, and a centring translate fights it.
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-sheet bg-surface shadow-sheet outline-none",
            "lg:bottom-6 lg:max-h-[80dvh] lg:max-w-xl lg:rounded-sheet",
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

          {/* Search boxes filter a list; typing in one is not an edit worth guarding. */}
          <div
            className="flex-1 overflow-y-auto px-5 py-4"
            onInput={(e) => (e.target as HTMLInputElement).type !== "search" && onEdit?.()}
            onChange={(e) => (e.target as HTMLInputElement).type !== "search" && onEdit?.()}
          >
            {children}
          </div>

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

/**
 * Native-feeling bottom sheet (vaul). Used for pickers, forms and confirmations.
 * Mark the field to focus with `data-autofocus="true"`: it is focused once the sheet has
 * finished sliding in, so the keyboard does not fight the animation.
 */
export default function BottomSheet({ guardUnsaved = false, open, onOpenChange, ...sheet }: BottomSheetProps) {
  // Parents remount form sheets with a new `key` on each open, so this starts clean every time.
  const [edited, setEdited] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!guardUnsaved) return <Sheet {...sheet} open={open} onOpenChange={onOpenChange} />;

  const handleOpenChange = (next: boolean) => {
    if (!next && edited) {
      setConfirming(true);
      return;
    }
    onOpenChange(next);
  };

  return (
    <>
      <Sheet
        {...sheet}
        open={open && !confirming}
        onOpenChange={handleOpenChange}
        onEdit={() => setEdited(true)}
      />
      <Sheet
        open={open && confirming}
        onOpenChange={(next) => !next && setConfirming(false)}
        title="Discard changes?"
        description="What you entered here has not been saved."
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" onClick={() => setConfirming(false)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => {
                setConfirming(false);
                setEdited(false);
                onOpenChange(false);
              }}
            >
              Discard
            </Button>
          </div>
        }
      >
        {null}
      </Sheet>
    </>
  );
}
