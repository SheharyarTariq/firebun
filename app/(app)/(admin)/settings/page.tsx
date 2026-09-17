import type { Metadata } from "next";
import SettingsScreen from "@/components/settings";
import { getSettings } from "@/server/settings/queries";

export const metadata: Metadata = { title: "Shop settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsScreen settings={settings} />;
}
