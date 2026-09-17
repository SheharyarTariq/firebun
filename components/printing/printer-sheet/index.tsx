"use client";

import BottomSheet from "@/components/common/BottomSheet";
import PrinterPanel from "../printer-panel";

interface PrinterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** First-use printer setup, opened when a Print button is tapped with no printer chosen. */
export default function PrinterSheet({ open, onOpenChange }: PrinterSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Choose a printer"
      description="This is remembered on this phone. You can change it later under More → Printer."
    >
      <PrinterPanel onConfigured={() => onOpenChange(false)} />
    </BottomSheet>
  );
}
