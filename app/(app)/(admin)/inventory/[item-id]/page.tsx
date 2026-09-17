import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ItemDetails from "@/components/inventory/item-details";
import { getInventoryItemDetails } from "@/server/inventory/queries";

interface PageProps {
  params: Promise<{ "item-id": string }>;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseId((await params)["item-id"]);
  const details = id ? await getInventoryItemDetails(id) : null;
  return { title: details ? details.item.name : "Inventory" };
}

export default async function InventoryItemPage({ params }: PageProps) {
  const id = parseId((await params)["item-id"]);
  if (!id) notFound();

  const details = await getInventoryItemDetails(id);
  if (!details) notFound();

  return <ItemDetails details={details} />;
}
