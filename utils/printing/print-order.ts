/**
 * One entry point for printing: fetches the receipt model(s) for an order (or the sample),
 * encodes them in the browser and dispatches to the chosen transport.
 */
import { routes } from "@/utils/routes";
import { printBluetooth } from "./adapters/bluetooth";
import { printViaBrowser } from "./adapters/browser";
import { printRawBt } from "./adapters/rawbt";
import type { PrinterPrefs } from "./prefs";
import { concatBytes, encodeReceipt, type ReceiptCopy, type ReceiptModel } from "./receipt";

export interface PrintOptions {
  /** Also print a kitchen ticket (no prices). */
  kitchenCopy?: boolean;
}

function receiptUrl(orderId: number | "sample", copy: ReceiptCopy, format: "json" | "html"): string {
  const params = new URLSearchParams({ format, copy });
  if (format === "html") params.set("print", "1");
  return `${routes.api.orderReceipt(orderId)}?${params.toString()}`;
}

async function fetchModel(orderId: number | "sample", copy: ReceiptCopy): Promise<ReceiptModel> {
  const res = await fetch(receiptUrl(orderId, copy, "json"), { cache: "no-store" });
  if (!res.ok) throw new Error(res.status === 401 ? "Please sign in again." : "Could not load the receipt.");
  return (await res.json()) as ReceiptModel;
}

export async function printOrder(
  orderId: number | "sample",
  prefs: PrinterPrefs,
  options: PrintOptions = {}
): Promise<void> {
  if (!prefs.transport) throw new Error("Choose a printer first.");
  const copies: ReceiptCopy[] = options.kitchenCopy ? ["customer", "kitchen"] : ["customer"];

  if (prefs.transport === "browser") {
    // One dialog per copy; the second opens after the first is dismissed.
    for (const copy of copies) printViaBrowser(receiptUrl(orderId, copy, "html"));
    return;
  }

  const models = await Promise.all(copies.map((copy) => fetchModel(orderId, copy)));
  const bytes = concatBytes(models.map(encodeReceipt));

  if (prefs.transport === "bluetooth") {
    await printBluetooth(bytes);
    return;
  }
  printRawBt(bytes);
}
