import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MenuItemDetails from "@/components/menu/item-details";
import { getMenuItemDetails } from "@/server/menu/queries";

interface PageProps {
  params: Promise<{ "item-id": string }>;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseId((await params)["item-id"]);
  const details = id ? await getMenuItemDetails(id) : null;
  return { title: details ? details.item.name : "Menu" };
}

export default async function MenuItemPage({ params }: PageProps) {
  const id = parseId((await params)["item-id"]);
  if (!id) notFound();

  const details = await getMenuItemDetails(id);
  if (!details) notFound();

  return <MenuItemDetails details={details} />;
}
