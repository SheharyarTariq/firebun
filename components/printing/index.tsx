"use client";

import Card from "@/components/common/Card";
import PageHeader from "@/components/layout/page-header";
import { routes } from "@/utils/routes";
import PrinterPanel from "./printer-panel";

interface PrinterScreenProps {
  /** Whether the admin enabled the kitchen copy (informational). */
  printKitchenCopy: boolean;
  autoPrintOnPlace: boolean;
}

export default function PrinterScreen({ printKitchenCopy, autoPrintOnPlace }: PrinterScreenProps) {
  return (
    <>
      <PageHeader title="Printer" subtitle="Set up once per phone" backHref={routes.ui.more} />
      <div className="space-y-4 p-4">
        <PrinterPanel />
        <Card className="space-y-1 text-sm text-muted">
          <p>Bills print automatically after an order is placed: {autoPrintOnPlace ? "on" : "off"}.</p>
          <p>Kitchen copy: {printKitchenCopy ? "on" : "off"}.</p>
          <p>Admins change these and the receipt text under More → Shop settings.</p>
        </Card>
      </div>
    </>
  );
}
