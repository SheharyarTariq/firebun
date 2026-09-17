"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import {
  connectBluetooth,
  connectedBluetoothDevice,
  disconnectBluetooth,
  isBluetoothSupported,
  subscribeBluetooth,
} from "@/utils/printing/adapters/bluetooth";
import { isAndroid } from "@/utils/printing/adapters/rawbt";
import {
  EMPTY_PREFS,
  loadPrinterPrefs,
  savePrinterPrefs,
  type PrinterPrefs,
  type PrinterTransport,
} from "@/utils/printing/prefs";
import { printOrder, type PrintOptions } from "@/utils/printing/print-order";

// A tiny external store so every component sees the same prefs without a provider.
let current: PrinterPrefs | null = null;
const listeners = new Set<() => void>();

function readPrefs(): PrinterPrefs {
  if (current === null) current = loadPrinterPrefs();
  return current;
}

function writePrefs(next: PrinterPrefs) {
  current = next;
  savePrinterPrefs(next);
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const noop = () => () => {};
const serverFalse = () => false;

export interface HookPrintOptions extends PrintOptions {
  /** Skip the "Sent to printer" toast (the caller shows its own progress). */
  quiet?: boolean;
}

/**
 * Printer preferences + connection state for client components. Everything that only
 * exists in the browser (Bluetooth support, the paired device) is read through
 * useSyncExternalStore with a `false` server snapshot, so SSR and hydration agree.
 */
export function usePrinter() {
  const prefs = useSyncExternalStore(subscribe, readPrefs, () => EMPTY_PREFS);
  const bluetoothSupported = useSyncExternalStore(noop, isBluetoothSupported, serverFalse);
  const bluetoothConnected = useSyncExternalStore(subscribeBluetooth, () => connectedBluetoothDevice() !== null, serverFalse);
  const android = useSyncExternalStore(noop, isAndroid, serverFalse);
  const [busy, setBusy] = useState(false);

  const setTransport = useCallback((transport: PrinterTransport | null) => {
    writePrefs({ ...readPrefs(), transport });
  }, []);

  const pairBluetooth = useCallback(async () => {
    setBusy(true);
    try {
      const device = await connectBluetooth();
      writePrefs({ transport: "bluetooth", deviceName: device.name || "Bluetooth printer" });
      toast.success(`Connected to ${device.name || "printer"}`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const unpairBluetooth = useCallback(async () => {
    await disconnectBluetooth();
    writePrefs({ ...readPrefs(), deviceName: null });
  }, []);

  /** Live check (not the render snapshot) — safe to call right after pairing resolves. */
  const canPrintNow = useCallback(() => {
    const p = readPrefs();
    return p.transport !== null && (p.transport !== "bluetooth" || connectedBluetoothDevice() !== null);
  }, []);

  const print = useCallback(
    async (orderId: number | "sample", options: HookPrintOptions = {}): Promise<boolean> => {
      const p = readPrefs();
      if (!p.transport) return false;
      setBusy(true);
      try {
        await printOrder(orderId, p, options);
        if (p.transport !== "browser" && !options.quiet) toast.success("Sent to printer");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Printing failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return {
    prefs,
    busy,
    isConfigured: prefs.transport !== null,
    /** Bluetooth chosen but not paired in this page session — printing would fail. */
    needsPairing: prefs.transport === "bluetooth" && !bluetoothConnected,
    bluetoothSupported,
    bluetoothConnected,
    android,
    setTransport,
    pairBluetooth,
    unpairBluetooth,
    canPrintNow,
    print,
  };
}
