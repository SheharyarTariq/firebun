"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/app/(app)/customers/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import type { Customer } from "@/db/schema";
import { callAction } from "@/utils/call-action";
import { customerLabel, formatMoney } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { validateAndSetErrors } from "@/utils/validation";
import { customerSchema, type CustomerFormInput } from "../schema";

interface CustomerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  customer?: Customer;
  /** Editing and deleting are admin-only; staff may still add someone mid-order. */
  canEdit: boolean;
  /** Editing only: what they still owe, which blocks a delete. */
  owed?: number;
}

export default function CustomerFormSheet({
  open,
  onOpenChange,
  customer,
  canEdit,
  owed = 0,
}: CustomerFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(customer);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async () => {
    const values: CustomerFormInput = { name: name.trim() || null, phone, note: note.trim() || null };
    if (!(await validateAndSetErrors(customerSchema, values, setErrors))) return;

    startTransition(async () => {
      const result = customer
        ? await callAction(updateCustomerAction(customer.id, values))
        : await callAction(createCustomerAction(values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(`${customerLabel({ name: values.name, phone: values.phone })} ${customer ? "saved" : "added"}`);
      onOpenChange(false);
      if (!customer && result.data) router.push(routes.ui.customerDetails(result.data.id));
    });
  };

  const handleDelete = () => {
    if (!customer) return;
    startTransition(async () => {
      const result = await callAction(deleteCustomerAction(customer.id));
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success(`${customerLabel(customer)} removed`);
      setConfirmDelete(false);
      onOpenChange(false);
      router.push(routes.ui.customers);
    });
  };

  // A debt must not be able to disappear, so the sheet says so instead of offering the tap.
  const blockedReason =
    owed > 0
      ? `They still owe ${formatMoney(owed)}. Settle those orders first — removing them here would hide the balance.`
      : null;

  return (
    <>
      {customer && (
        <ConfirmSheet
          open={confirmDelete}
          onOpenChange={(next) => !next && setConfirmDelete(false)}
          title={blockedReason ? `${customerLabel(customer)} can’t be removed` : `Remove ${customerLabel(customer)}?`}
          description={
            blockedReason ??
            "Their past orders keep the name and number that were on them, so no history is lost."
          }
          confirmLabel="Remove"
          cancelLabel={blockedReason ? "Not now" : "Cancel"}
          destructive={!blockedReason}
          confirmHidden={Boolean(blockedReason)}
          isLoading={isPending}
          onConfirm={handleDelete}
        />
      )}

      <BottomSheet
        onSubmit={handleSubmit}
        open={open && !confirmDelete}
        onOpenChange={onOpenChange}
        guardUnsaved
        title={isEdit ? "Edit customer" : "New customer"}
        description={isEdit ? undefined : "The number is how the shop finds them again, so it is required."}
        footer={
          <div className="flex gap-2">
            {isEdit && canEdit && (
              <Button
                variant="outline"
                size="lg"
                aria-label="Remove customer"
                className="px-4 text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button size="lg" className="flex-1" isLoading={isPending} type="submit">
              {isEdit ? "Save" : "Add customer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name (optional)"
            placeholder="e.g. Ali Khan"
            autoComplete="off"
            autoCapitalize="words"
            data-autofocus="true"
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            error={errors.name}
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            placeholder="03xx xxxxxxx"
            autoComplete="off"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError("phone");
            }}
            error={errors.phone}
            hint="Spacing and +92 do not matter — the same number is always the same customer."
          />
          <Textarea
            label="Note (optional)"
            placeholder="e.g. shop next door"
            rows={2}
            maxLength={200}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              clearError("note");
            }}
            error={errors.note}
          />
        </div>
      </BottomSheet>
    </>
  );
}
