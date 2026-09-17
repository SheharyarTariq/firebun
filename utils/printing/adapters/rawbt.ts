/**
 * RawBT transport: hands ESC/POS bytes to the RawBT Android app (Bluetooth Classic, USB,
 * Wi-Fi printers). The app must be installed and configured with the printer once.
 * The intent must be fired inside (or shortly after) a user gesture.
 */
import { bytesToBase64 } from "@/utils/printing/receipt";

export const RAWBT_PLAY_URL = "https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter";

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

export function printRawBt(bytes: Uint8Array): void {
  const b64 = bytesToBase64(bytes);
  const href = isAndroid()
    ? `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`
    : `rawbt:base64,${b64}`;
  window.location.href = href;
}
