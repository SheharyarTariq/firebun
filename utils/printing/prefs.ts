/** Per-device printer choice, kept in localStorage (each phone picks its own printer). */

export type PrinterTransport = "bluetooth" | "rawbt" | "browser";

export interface PrinterPrefs {
  transport: PrinterTransport | null;
  /** Name of the last Bluetooth printer, for display only. */
  deviceName: string | null;
}

const KEY = "firebun-printer";

export const EMPTY_PREFS: PrinterPrefs = { transport: null, deviceName: null };

export function loadPrinterPrefs(): PrinterPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PREFS;
    const parsed = JSON.parse(raw) as Partial<PrinterPrefs>;
    const transport = parsed.transport;
    return {
      transport: transport === "bluetooth" || transport === "rawbt" || transport === "browser" ? transport : null,
      deviceName: typeof parsed.deviceName === "string" ? parsed.deviceName : null,
    };
  } catch {
    return EMPTY_PREFS;
  }
}

export function savePrinterPrefs(prefs: PrinterPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or storage blocked: printing still works for this page load.
  }
}

export const TRANSPORT_LABELS: Record<PrinterTransport, string> = {
  bluetooth: "Bluetooth (direct)",
  rawbt: "RawBT app",
  browser: "Phone print dialog",
};
