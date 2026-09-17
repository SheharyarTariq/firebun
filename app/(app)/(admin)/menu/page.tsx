import type { Metadata } from "next";
import MenuScreen from "@/components/menu";
import { listMenu } from "@/server/menu/queries";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const categories = await listMenu();
  return <MenuScreen categories={categories} />;
}
