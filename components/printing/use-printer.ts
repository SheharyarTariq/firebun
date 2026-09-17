"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import {
  connectBluetooth,
  connectedBluetoothDevice,
  disconnectBluetooth,
  isBluetoothSupported,
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

export function usePrinter() {
  const prefs = useSyncExternalStore(subscribe, readPrefs, () => EMPTY_PREFS);
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
      toast.error(error instanceof Error ? error.message : "Could not connect.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const unpairBluetooth = useCallback(async () => {
    await disconnectBluetooth();
    writePrefs({ ...readPrefs(), deviceName: null });
  }, []);

  const print = useCallback(
    async (orderId: number | "sample", options?: PrintOptions): Promise<boolean> => {
      const p = readPrefs();
      if (!p.transport) return false;
      setBusy(true);
      try {
        await printOrder(orderId, p, options);
        if (p.transport !== "browser") toast.success("Sent to printer");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Printing failed.");
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
    bluetoothSupported: isBluetoothSupported(),
    bluetoothConnected: connectedBluetoothDevice() !== null,
    android: isAndroid(),
    setTransport,
    pairBluetooth,
    unpairBluetooth,
    print,
  };
}
