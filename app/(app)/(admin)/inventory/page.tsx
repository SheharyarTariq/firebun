import type { Metadata } from "next";
import InventoryScreen from "@/components/inventory";
import { listInventoryItems } from "@/server/inventory/queries";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const items = await listInventoryItems();
  return <InventoryScreen items={items} />;
}
