"use client";

import { Bluetooth, Check, ExternalLink, Printer, Smartphone } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { RAWBT_PLAY_URL } from "@/utils/printing/adapters/rawbt";
import type { PrinterTransport } from "@/utils/printing/prefs";
import { cn } from "@/utils/cn";
import { usePrinter } from "../use-printer";

interface PrinterPanelProps {
  /** Called once printing can work: a non-Bluetooth transport chosen, or a printer paired. */
  onReady?: () => void;
  /** Hide the test-print button (the first-use sheet prints the real order instead). */
  hideTestPrint?: boolean;
}

interface Option {
  value: PrinterTransport;
  title: string;
  description: string;
  icon: typeof Bluetooth;
}

const OPTIONS: Option[] = [
  {
    value: "bluetooth",
    title: "Bluetooth (direct)",
    description: "Prints straight from Chrome. Pair the printer once per session.",
    icon: Bluetooth,
  },
  {
    value: "rawbt",
    title: "RawBT app",
    description: "Free Android app that talks to almost any Bluetooth thermal printer.",
    icon: Smartphone,
  },
  {
    value: "browser",
    title: "Phone print dialog",
    description: "The normal print screen. Works with any printer the phone can see; slower.",
    icon: Printer,
  },
];

/** Transport choice + pairing + test print. Used on /printer and in the first-use sheet. */
export default function PrinterPanel({ onReady, hideTestPrint = false }: PrinterPanelProps) {
  const printer = usePrinter();
  const { prefs } = printer;

  const choose = (value: PrinterTransport) => {
    printer.setTransport(value);
    if (value !== "bluetooth") onReady?.();
  };

  const pair = async () => {
    if (await printer.pairBluetooth()) onReady?.();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const active = prefs.transport === option.value;
          const unsupported = option.value === "bluetooth" && !printer.bluetoothSupported;
          return (
            <button
              key={option.value}
              type="button"
              disabled={unsupported}
              onClick={() => choose(option.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-card border p-3 text-left transition-colors active:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50",
                active ? "border-brand bg-brand/10" : "border-border bg-surface"
              )}
            >
              <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", active ? "bg-brand/30 text-brand-text" : "bg-muted-bg text-muted")}>
                <option.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {option.title}
                  {active && <Check className="h-4 w-4 text-brand-text" />}
                  {unsupported && <Badge variant="warning">Not in this browser</Badge>}
                </span>
                <span className="block text-xs text-muted">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {prefs.transport === "bluetooth" && (
        <div className="space-y-2 rounded-field border border-border p-3">
          <p className="text-sm">
            {printer.bluetoothConnected
              ? `Connected to ${prefs.deviceName ?? "printer"}`
              : prefs.deviceName
                ? `Last printer: ${prefs.deviceName} — pair again to print`
                : "No printer paired yet."}
          </p>
          <div className="flex gap-2">
            <Button
              startIcon={<Bluetooth className="h-4 w-4" />}
              isLoading={printer.busy}
              disabled={!printer.bluetoothSupported}
              onClick={pair}
            >
              {printer.bluetoothConnected ? "Pair a different printer" : "Pair printer"}
            </Button>
            {printer.bluetoothConnected && (
              <Button variant="outline" onClick={printer.unpairBluetooth}>
                Disconnect
              </Button>
            )}
          </div>
          <p className="text-xs text-muted">
            If the printer never shows up in the list, it does not support Bluetooth LE — use RawBT instead.
          </p>
        </div>
      )}

      {prefs.transport === "rawbt" && (
        <div className="space-y-2 rounded-field border border-border p-3 text-sm">
          <p>Install RawBT, open it once and select the Fire Bun printer under Settings → Connection.</p>
          <a
            href={RAWBT_PLAY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand-text underline"
          >
            Get RawBT on Google Play <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {!hideTestPrint && (
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          startIcon={<Printer className="h-5 w-5" />}
          disabled={!printer.isConfigured || printer.needsPairing}
          isLoading={printer.busy}
          onClick={() => printer.print("sample")}
        >
          Test print
        </Button>
      )}
    </div>
  );
}
