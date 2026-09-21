"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Check, ChevronRight, Printer, TriangleAlert, X } from "lucide-react";
import Loader from "@/components/common/Loader";
import { cn } from "@/utils/cn";
import { formatMoney, formatOrderNumber } from "@/utils/helper";
import { routes } from "@/utils/routes";

export interface PlacedOrder {
  orderId: number;
  dailySeq: number;
  total: number;
  warnings: string[];
  duplicate: boolean;
}

/** How the last print of this order went, so the bar can say so instead of always offering "Print". */
export type PrintOutcome = "printed" | "failed" | null;

interface PlacedBarProps {
  placed: PlacedOrder;
  printing: boolean;
  printOutcome?: PrintOutcome;
  onPrint: () => void;
  onDismiss: () => void;
}

const SHORT_MS = 8_000;
const WITH_WARNINGS_MS = 20_000;

/** Confirmation strip above the tab bar after an order is placed; the counter stays put. */
export default function PlacedBar({ placed, printing, printOutcome = null, onPrint, onDismiss }: PlacedBarProps) {
  const hasWarnings = placed.warnings.length > 0;
  // A failed print stays up long enough to be noticed and retried.
  const lingers = hasWarnings || printOutcome === "failed";

  useEffect(() => {
    // Restarts on every print attempt so the bar never vanishes mid-print.
    if (printing) return;
    const timer = setTimeout(onDismiss, lingers ? WITH_WARNINGS_MS : SHORT_MS);
    return () => clearTimeout(timer);
  }, [placed.orderId, lingers, printing, printOutcome, onDismiss]);

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2">
      <div
        role="status"
        className="mx-auto w-full max-w-lg animate-fade-up rounded-card bg-ink text-ink-foreground shadow-lg"
      >
        <div className="flex h-14 items-center gap-2 pl-4 pr-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">Order {formatOrderNumber(placed.dailySeq)}</span>
            {placed.duplicate ? " was already placed" : " placed"}
            <span className="text-ink-muted"> · {formatMoney(placed.total)}</span>
          </span>
          <button
            type="button"
            onClick={onPrint}
            disabled={printing}
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-field px-2.5 text-sm font-semibold transition-colors active:bg-white/10 disabled:opacity-60",
              printOutcome === "failed" ? "text-warning-bg" : "text-brand"
            )}
          >
            {printing ? (
              <Loader size="sm" />
            ) : printOutcome === "printed" ? (
              <Check className="h-4 w-4" />
            ) : printOutcome === "failed" ? (
              <TriangleAlert className="h-4 w-4" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {printOutcome === "printed" ? "Printed" : printOutcome === "failed" ? "Retry" : "Print"}
          </button>
          <Link
            href={routes.ui.orderDetails(placed.orderId)}
            className="ml-1 flex h-11 items-center gap-0.5 rounded-field px-2 text-sm font-semibold transition-colors active:bg-white/10"
          >
            Open
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="flex h-11 w-10 items-center justify-center rounded-field text-ink-muted transition-colors active:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {hasWarnings && (
          <ul className="space-y-0.5 border-t border-white/10 px-4 py-2 text-xs text-warning-bg">
            {placed.warnings.slice(0, 3).map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
            {placed.warnings.length > 3 && <li className="pl-5 text-ink-muted">+{placed.warnings.length - 3} more under Inventory</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
