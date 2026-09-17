import type { Metadata } from "next";
import PrinterScreen from "@/components/printing";
import { getCurrentUser } from "@/server/auth/dal";
import { getSettings } from "@/server/settings/queries";

export const metadata: Metadata = { title: "Printer" };

export default async function PrinterPage() {
  const [, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  return (
    <PrinterScreen
      printKitchenCopy={settings.printKitchenCopy}
      autoPrintOnPlace={settings.autoPrintOnPlace}
    />
  );
}
