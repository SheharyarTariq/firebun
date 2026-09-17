"use client";

import BottomSheet from "@/components/common/BottomSheet";
import PrinterPanel from "../printer-panel";

interface PrinterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What happens once printing can work — usually "print the bill that was just tapped". */
  onReady?: () => void;
  /** Shown under the title, e.g. "Order #012 will print as soon as a printer is paired." */
  description?: string;
}

/** Printer setup, opened when Print is tapped with no printer chosen or paired. */
export default function PrinterSheet({ open, onOpenChange, onReady, description }: PrinterSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Set up the printer"
      description={description ?? "Remembered on this phone. Change it later under More → Printer."}
    >
      <PrinterPanel
        hideTestPrint
        onReady={() => {
          onOpenChange(false);
          onReady?.();
        }}
      />
    </BottomSheet>
  );
}
