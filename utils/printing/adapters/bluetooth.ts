/**
 * Web Bluetooth transport (Chrome/Edge on Android and desktop, HTTPS only).
 * Keeps one connected printer for the life of the page; Android cannot re-pair silently,
 * so the cashier taps "Pair printer" once per session.
 */
import type { WebBluetoothPrinterDevice } from "@/utils/printing/vendor/webbluetooth-receipt-printer";

type Printer = InstanceType<typeof import("@/utils/printing/vendor/webbluetooth-receipt-printer").default>;

let printer: Printer | null = null;
let device: WebBluetoothPrinterDevice | null = null;

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function connectedBluetoothDevice(): WebBluetoothPrinterDevice | null {
  return device;
}

/** Opens the browser's device chooser. Must be called from a tap. */
export async function connectBluetooth(timeoutMs = 45_000): Promise<WebBluetoothPrinterDevice> {
  if (!isBluetoothSupported()) {
    throw new Error("This browser cannot use Bluetooth. Use Chrome on Android, or choose RawBT.");
  }
  const { default: WebBluetoothReceiptPrinter } = await import("@/utils/printing/vendor/webbluetooth-receipt-printer");

  if (printer && device) {
    try {
      await printer.disconnect();
    } catch {
      // ignore
    }
  }
  const instance = new WebBluetoothReceiptPrinter();
  printer = instance;
  device = null;

  return new Promise<WebBluetoothPrinterDevice>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("No printer was selected.")), timeoutMs);
    instance.addEventListener("connected", (d) => {
      clearTimeout(timer);
      device = d;
      resolve(d);
    });
    instance.addEventListener("disconnected", () => {
      device = null;
    });
    // connect() never rejects on cancel; the timeout above covers that.
    void instance.connect();
  });
}

export async function printBluetooth(bytes: Uint8Array): Promise<void> {
  if (!printer || !device) {
    throw new Error("Printer not connected. Open Printer settings and tap “Pair printer”.");
  }
  await printer.print(bytes);
}

export async function disconnectBluetooth(): Promise<void> {
  if (printer) {
    try {
      await printer.disconnect();
    } catch {
      // ignore
    }
  }
  printer = null;
  device = null;
}
