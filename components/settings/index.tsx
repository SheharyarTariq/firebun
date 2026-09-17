"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { updateSettingsAction } from "@/app/(app)/(admin)/settings/actions";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import Toggle from "@/components/common/Toggle";
import PageHeader from "@/components/layout/page-header";
import type { Settings } from "@/db/schema";
import { callAction } from "@/utils/call-action";
import { routes } from "@/utils/routes";
import { validateAndSetErrors } from "@/utils/validation";
import { settingsSchema, type SettingsFormInput } from "./schema";

interface SettingsScreenProps {
  settings: Settings;
}

export default function SettingsScreen({ settings }: SettingsScreenProps) {
  const [shopName, setShopName] = useState(settings.shopName);
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [phone2, setPhone2] = useState(settings.phone2 ?? "");
  const [address, setAddress] = useState(settings.address ?? "");
  const [headerLines, setHeaderLines] = useState(settings.receiptHeaderLines.join("\n"));
  const [footer, setFooter] = useState(settings.receiptFooter);
  const [charsPerLine, setCharsPerLine] = useState(String(settings.charsPerLine));
  const [deliveryCharge, setDeliveryCharge] = useState(String(settings.defaultDeliveryCharge));
  const [staffDiscount, setStaffDiscount] = useState(String(settings.staffMaxDiscountPct));
  const [staffExpenses, setStaffExpenses] = useState(settings.staffCanAddExpenses);
  const [cancelWindow, setCancelWindow] = useState(String(settings.staffCancelWindowMinutes));
  const [cutoffHour, setCutoffHour] = useState(String(settings.businessDayCutoffHour));
  const [autoPrint, setAutoPrint] = useState(settings.autoPrintOnPlace);
  const [kitchenCopy, setKitchenCopy] = useState(settings.printKitchenCopy);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    const values: SettingsFormInput = {
      shopName,
      phone: phone || null,
      phone2: phone2 || null,
      address: address || null,
      receiptHeaderLines: headerLines.split("\n").map((l) => l.trim()).filter(Boolean),
      receiptFooter: footer,
      charsPerLine: Number(charsPerLine),
      defaultDeliveryCharge: Number(deliveryCharge),
      staffMaxDiscountPct: Number(staffDiscount),
      staffCanAddExpenses: staffExpenses,
      staffCancelWindowMinutes: Number(cancelWindow),
      businessDayCutoffHour: Number(cutoffHour),
      autoPrintOnPlace: autoPrint,
      printKitchenCopy: kitchenCopy,
    };
    if (!(await validateAndSetErrors(settingsSchema, values, setErrors))) {
      toast.error("Check the highlighted fields");
      return;
    }
    startTransition(async () => {
      const result = await callAction(updateSettingsAction(values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved");
    });
  };

  return (
    <>
      <PageHeader
        title="Shop settings"
        backHref={routes.ui.more}
        actions={
          <Button size="sm" isLoading={isPending} startIcon={<Save className="h-4 w-4" />} onClick={handleSave}>
            Save
          </Button>
        }
      />

      <div className="space-y-4 p-4">
        <Card className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Shop</h2>
          <Input label="Shop name" value={shopName} onChange={(e) => { setShopName(e.target.value); clearError("shopName"); }} error={errors.shopName} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
            <Input label="Phone 2" type="tel" inputMode="tel" value={phone2} onChange={(e) => setPhone2(e.target.value)} error={errors.phone2} />
          </div>
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} hint="Printed under the shop name." />
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Receipt</h2>
          <Textarea
            label="Header lines (one per line, up to 4)"
            placeholder={"Taste that sets you on fire\nFast delivery"}
            rows={3}
            value={headerLines}
            onChange={(e) => { setHeaderLines(e.target.value); clearError("receiptHeaderLines"); }}
            error={errors.receiptHeaderLines}
          />
          <Input label="Footer" value={footer} onChange={(e) => { setFooter(e.target.value); clearError("receiptFooter"); }} error={errors.receiptFooter} />
          <Select
            label="Characters per line"
            options={[{ value: "32", label: "32 — 58 mm paper (Fire Bun printer)" }, { value: "42", label: "42 — 80 mm paper, small font" }, { value: "48", label: "48 — 80 mm paper" }]}
            value={charsPerLine}
            onChange={(e) => setCharsPerLine(e.target.value)}
            error={errors.charsPerLine}
          />
          <Toggle label="Print automatically after placing an order" checked={autoPrint} onChange={setAutoPrint} />
          <Toggle label="Also print a kitchen copy" description="A second ticket without prices, with notes and deal contents." checked={kitchenCopy} onChange={setKitchenCopy} />
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Counter rules</h2>
          <Input label="Default delivery charge (Rs)" inputMode="decimal" value={deliveryCharge} onChange={(e) => { setDeliveryCharge(e.target.value); clearError("defaultDeliveryCharge"); }} error={errors.defaultDeliveryCharge} />
          <Input label="Max discount staff can give (%)" inputMode="numeric" value={staffDiscount} onChange={(e) => { setStaffDiscount(e.target.value); clearError("staffMaxDiscountPct"); }} error={errors.staffMaxDiscountPct} hint="0 = only admins can give discounts." />
          <Input label="Staff can cancel their own orders within (minutes)" inputMode="numeric" value={cancelWindow} onChange={(e) => { setCancelWindow(e.target.value); clearError("staffCancelWindowMinutes"); }} error={errors.staffCancelWindowMinutes} />
          <Toggle label="Staff can add expenses" checked={staffExpenses} onChange={setStaffExpenses} />
          <Input label="Business day starts at (hour, 0–12)" inputMode="numeric" value={cutoffHour} onChange={(e) => { setCutoffHour(e.target.value); clearError("businessDayCutoffHour"); }} error={errors.businessDayCutoffHour} hint="Orders before this hour count towards the previous day. 4 = 4 am." />
        </Card>

        <Button size="lg" className="w-full" isLoading={isPending} startIcon={<Save className="h-5 w-5" />} onClick={handleSave}>
          Save settings
        </Button>
      </div>
    </>
  );
}
