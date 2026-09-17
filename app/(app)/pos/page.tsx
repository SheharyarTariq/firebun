import type { Metadata } from "next";
import PosScreen from "@/components/pos";
import { getCurrentUser } from "@/server/auth/dal";
import { getPosCatalog } from "@/server/orders/queries";
import { getSettings, getTodayBusinessDate } from "@/server/settings/queries";
import { formatDate } from "@/utils/helper";

export const metadata: Metadata = { title: "Counter" };

export default async function PosPage() {
  const [user, catalog, settings, businessDate] = await Promise.all([
    getCurrentUser(),
    getPosCatalog(),
    getSettings(),
    getTodayBusinessDate(),
  ]);

  return (
    <PosScreen
      catalog={catalog}
      settings={{
        defaultDeliveryCharge: settings.defaultDeliveryCharge,
        staffMaxDiscountPct: settings.staffMaxDiscountPct,
        autoPrintOnPlace: settings.autoPrintOnPlace,
        printKitchenCopy: settings.printKitchenCopy,
      }}
      user={{ name: user.name, role: user.role }}
      businessDateLabel={formatDate(`${businessDate}T12:00:00+05:00`)}
    />
  );
}
