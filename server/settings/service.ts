import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings, type Settings } from "@/db/schema";
import { ServiceError } from "@/server/errors";
import { roundMoney } from "@/utils/helper";

export interface SettingsInput {
  shopName: string;
  phone: string | null;
  phone2: string | null;
  address: string | null;
  receiptHeaderLines: string[];
  receiptFooter: string;
  charsPerLine: number;
  defaultDeliveryCharge: number;
  staffMaxDiscountPct: number;
  staffCanAddExpenses: boolean;
  staffCancelWindowMinutes: number;
  businessDayCutoffHour: number;
  autoPrintOnPlace: boolean;
  printKitchenCopy: boolean;
}

const clean = (value: string | null | undefined): string | null => {
  const v = value?.trim();
  return v ? v : null;
};

export async function updateSettings(input: SettingsInput, actorId: number): Promise<Settings> {
  if (![32, 42, 48].includes(input.charsPerLine)) {
    throw new ServiceError("Characters per line must be 32, 42 or 48.", { charsPerLine: "Invalid" });
  }
  const [row] = await getDb()
    .update(settings)
    .set({
      shopName: input.shopName.trim() || "Fire Bun",
      phone: clean(input.phone),
      phone2: clean(input.phone2),
      address: clean(input.address),
      receiptHeaderLines: input.receiptHeaderLines.map((l) => l.trim()).filter(Boolean).slice(0, 4),
      receiptFooter: input.receiptFooter.trim(),
      charsPerLine: input.charsPerLine,
      defaultDeliveryCharge: roundMoney(Math.max(0, input.defaultDeliveryCharge)),
      staffMaxDiscountPct: Math.min(100, Math.max(0, Math.round(input.staffMaxDiscountPct))),
      staffCanAddExpenses: input.staffCanAddExpenses,
      staffCancelWindowMinutes: Math.max(0, Math.round(input.staffCancelWindowMinutes)),
      businessDayCutoffHour: Math.min(12, Math.max(0, Math.round(input.businessDayCutoffHour))),
      autoPrintOnPlace: input.autoPrintOnPlace,
      printKitchenCopy: input.printKitchenCopy,
      updatedAt: new Date(),
      updatedBy: actorId,
    })
    .where(eq(settings.id, 1))
    .returning();
  if (!row) throw new ServiceError("Settings row is missing.");
  return row;
}
