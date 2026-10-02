import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OrderDetails from "@/components/orders/order-details";
import { getCurrentUser } from "@/server/auth/dal";
import { getOrderDetails, getPosCatalog } from "@/server/orders/queries";
import { cancelDenialReason, editDenialReason } from "@/server/orders/service";
import { getSettings } from "@/server/settings/queries";
import { formatOrderNumber } from "@/utils/helper";

interface PageProps {
  params: Promise<{ "order-id": string }>;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseId((await params)["order-id"]);
  const order = id ? await getOrderDetails(id) : null;
  return { title: order ? `Order ${formatOrderNumber(order.dailySeq)}` : "Order" };
}

export default async function OrderPage({ params }: PageProps) {
  const id = parseId((await params)["order-id"]);
  if (!id) notFound();

  const [order, user, settings] = await Promise.all([getOrderDetails(id), getCurrentUser(), getSettings()]);
  if (!order) notFound();

  const cancelDenied = cancelDenialReason(order, user, settings.staffCancelWindowMinutes);
  const editDenied = editDenialReason(order, user, settings.staffCancelWindowMinutes);
  // Only loaded when the order can actually be changed — the edit sheet picks from it.
  const catalog = editDenied === null ? await getPosCatalog() : [];

  return (
    <OrderDetails
      order={order}
      viewer={{ id: user.id, role: user.role }}
      canCancel={cancelDenied === null}
      cancelBlockedReason={cancelDenied}
      canEdit={editDenied === null}
      editBlockedReason={editDenied}
      catalog={catalog}
      printKitchenCopy={settings.printKitchenCopy}
    />
  );
}
