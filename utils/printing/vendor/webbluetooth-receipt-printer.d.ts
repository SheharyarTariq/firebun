export interface WebBluetoothPrinterDevice {
  id: string;
  name: string;
  type: "bluetooth";
  language: "esc-pos" | "star-prnt" | "star-line" | "meow";
  codepageMapping?: string | Record<string, number>;
  columns?: number;
}

export default class WebBluetoothReceiptPrinter {
  constructor(options?: Record<string, unknown>);
  /** Must be called from a user gesture. Resolves without connecting if the user cancels. */
  connect(): Promise<void>;
  reconnect(device: WebBluetoothPrinterDevice): Promise<void>;
  disconnect(): Promise<void>;
  print(data: Uint8Array | number[]): Promise<void>;
  addEventListener(type: "connected", listener: (device: WebBluetoothPrinterDevice) => void): void;
  addEventListener(type: "disconnected", listener: () => void): void;
}
