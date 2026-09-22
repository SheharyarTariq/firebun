"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { updateSettingsAction } from "@/app/(app)/(admin)/settings/actions";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import SectionHeading from "@/components/common/SectionHeading";
import Select from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import Toggle from "@/components/common/Toggle";
import PageHeader from "@/components/layout/page-header";
import FloatingBar from "@/components/layout/floating-bar";
import PageBody from "@/components/layout/page-body";
import type { Settings } from "@/db/schema";
import { callAction } from "@/utils/call-action";
import { parseNumberInput } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { validateAndSetErrors } from "@/utils/validation";
import { settingsSchema, type SettingsFormInput } from "./schema";

interface SettingsScreenProps {
  settings: Settings;
}

/** The form holds strings for typed fields; this is what the server gets. */
function toInput(f: FormState): SettingsFormInput {
  return {
    shopName: f.shopName,
    phone: f.phone || null,
    phone2: f.phone2 || null,
    address: f.address || null,
    receiptHeaderLines: f.headerLines.split("\n").map((l) => l.trim()).filter(Boolean),
    receiptFooter: f.footer,
    charsPerLine: Number(f.charsPerLine),
    defaultDeliveryCharge: parseNumberInput(f.deliveryCharge),
    staffMaxDiscountPct: parseNumberInput(f.staffDiscount),
    staffCanAddExpenses: f.staffExpenses,
    staffCancelWindowMinutes: parseNumberInput(f.cancelWindow),
    businessDayCutoffHour: parseNumberInput(f.cutoffHour),
    autoPrintOnPlace: f.autoPrint,
    printKitchenCopy: f.kitchenCopy,
  };
}

function fromSettings(s: Settings): FormState {
  return {
    shopName: s.shopName,
    phone: s.phone ?? "",
    phone2: s.phone2 ?? "",
    address: s.address ?? "",
    headerLines: s.receiptHeaderLines.join("\n"),
    footer: s.receiptFooter,
    charsPerLine: String(s.charsPerLine),
    deliveryCharge: String(s.defaultDeliveryCharge),
    staffDiscount: String(s.staffMaxDiscountPct),
    staffExpenses: s.staffCanAddExpenses,
    cancelWindow: String(s.staffCancelWindowMinutes),
    cutoffHour: String(s.businessDayCutoffHour),
    autoPrint: s.autoPrintOnPlace,
    kitchenCopy: s.printKitchenCopy,
  };
}

interface FormState {
  shopName: string;
  phone: string;
  phone2: string;
  address: string;
  headerLines: string;
  footer: string;
  charsPerLine: string;
  deliveryCharge: string;
  staffDiscount: string;
  staffExpenses: boolean;
  cancelWindow: string;
  cutoffHour: string;
  autoPrint: boolean;
  kitchenCopy: boolean;
}

const PAPER_OPTIONS = [
  { value: "32", label: "58 mm paper (32 characters) — the shop's printer" },
  { value: "42", label: "80 mm paper, small font (42 characters)" },
  { value: "48", label: "80 mm paper (48 characters)" },
];

/** 12 am … 12 pm: a late-night order before this hour belongs to the previous day. */
const CUTOFF_OPTIONS = Array.from({ length: 13 }, (_, h) => ({
  value: String(h),
  label: h === 0 ? "Midnight (no late-night shift)" : `${h === 12 ? 12 : h} ${h < 12 ? "am" : "pm"}`,
}));

export default function SettingsScreen({ settings }: SettingsScreenProps) {
  const router = useRouter();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saved, setSaved] = useState(() => fromSettings(settings));
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const set = <K extends keyof FormState>(key: K, value: FormState[K], errorKey?: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    const field = errorKey ?? key;
    // Also clears per-item errors such as `receiptHeaderLines[2]`.
    const mine = (k: string) => k === field || k.startsWith(`${field}[`);
    if (Object.entries(errors).some(([k, v]) => v && mine(k))) {
      setErrors((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, mine(k) ? "" : v])));
    }
  };

  // Header lines are validated one by one (`receiptHeaderLines[1]`); show the first message on the field.
  const headerLinesError =
    errors.receiptHeaderLines ||
    Object.entries(errors).find(([k, v]) => v && k.startsWith("receiptHeaderLines["))?.[1];

  const handleSave = async () => {
    const values = toInput(form);
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
      setSaved(form);
      toast.success("Settings saved");
    });
  };

  return (
    <>
      <PageHeader
        title="Shop settings"
        subtitle={dirty ? "Unsaved changes" : undefined}
        backHref={routes.ui.more}
        onBack={dirty ? () => setLeaveOpen(true) : undefined}
      />

      {/*
        * Sections sit two-up on a monitor, and each card keeps its fields to a readable measure.
        * Full width is right for a list; a 1900px-wide text input is not — you lose the start of
        * the line you are typing on.
        */}
      <PageBody gap={4} className="pb-28 xl:columns-2 xl:gap-4 xl:space-y-0 xl:[&>*]:mb-4 xl:[&>*]:break-inside-avoid">
        <Card className="space-y-4 [&>*]:max-w-xl">
          <SectionHeading>Shop</SectionHeading>
          <Input label="Shop name" value={form.shopName} onChange={(e) => set("shopName", e.target.value)} error={errors.shopName} />
          <div className="grid grid-cols-2 gap-3 lg:max-w-md">
            <Input label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
            <Input label="Phone 2" type="tel" inputMode="tel" value={form.phone2} onChange={(e) => set("phone2", e.target.value)} error={errors.phone2} />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} error={errors.address} hint="Printed under the shop name." />
        </Card>

        <Card className="space-y-4 [&>*]:max-w-xl">
          <SectionHeading>Receipt</SectionHeading>
          <Textarea
            label="Header lines (one per line, up to 4)"
            placeholder={"Taste that sets you on fire\nFast delivery"}
            rows={3}
            value={form.headerLines}
            onChange={(e) => set("headerLines", e.target.value, "receiptHeaderLines")}
            error={headerLinesError}
          />
          <Input label="Footer" value={form.footer} onChange={(e) => set("footer", e.target.value, "receiptFooter")} error={errors.receiptFooter} />
          <Select
            label="Paper width"
            options={PAPER_OPTIONS}
            value={form.charsPerLine}
            onChange={(e) => set("charsPerLine", e.target.value)}
            error={errors.charsPerLine}
          />
          <Toggle label="Print automatically after placing an order" checked={form.autoPrint} onChange={(v) => set("autoPrint", v)} />
          <Toggle
            label="Also print a kitchen copy"
            description="A second ticket without prices, with notes and deal contents."
            checked={form.kitchenCopy}
            onChange={(v) => set("kitchenCopy", v)}
          />
        </Card>

        <Card className="space-y-4 [&>*]:max-w-xl">
          <SectionHeading>Counter rules</SectionHeading>
          <Input
            label="Default delivery charge (Rs)"
            inputMode="decimal"
            value={form.deliveryCharge}
            onChange={(e) => set("deliveryCharge", e.target.value, "defaultDeliveryCharge")}
            error={errors.defaultDeliveryCharge}
          />
          <Input
            label="Max discount staff can give (%)"
            inputMode="numeric"
            value={form.staffDiscount}
            onChange={(e) => set("staffDiscount", e.target.value, "staffMaxDiscountPct")}
            error={errors.staffMaxDiscountPct}
            hint="0 = only admins can give discounts."
          />
          <Input
            label="Staff can cancel their own orders within (minutes)"
            inputMode="numeric"
            value={form.cancelWindow}
            onChange={(e) => set("cancelWindow", e.target.value, "staffCancelWindowMinutes")}
            error={errors.staffCancelWindowMinutes}
            hint="0 = only admins can cancel orders."
          />
          <Toggle label="Staff can add expenses" description="They only see what they added themselves." checked={form.staffExpenses} onChange={(v) => set("staffExpenses", v)} />
          <Select
            label="Business day starts at"
            options={CUTOFF_OPTIONS}
            value={form.cutoffHour}
            onChange={(e) => set("cutoffHour", e.target.value, "businessDayCutoffHour")}
            error={errors.businessDayCutoffHour}
            hint="Orders before this time count towards the previous day's numbers."
          />
        </Card>
      </PageBody>

      <ConfirmSheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave without saving?"
        description="Your changes to the shop settings have not been saved."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => router.push(routes.ui.more)}
      />

      <FloatingBar>
        <Button
          size="lg"
          className="mx-auto flex w-full shadow-2 lg:max-w-md"
          isLoading={isPending}
          disabled={!dirty}
          startIcon={<Save className="h-5 w-5" />}
          onClick={handleSave}
        >
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </FloatingBar>
    </>
  );
}
