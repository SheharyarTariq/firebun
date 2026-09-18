"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/(app)/expenses/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import type { ExpenseRow } from "@/server/expenses/queries";
import { callAction } from "@/utils/call-action";
import { formatMoney } from "@/utils/helper";
import { validateAndSetErrors } from "@/utils/validation";
import { expenseSchema, type ExpenseFormInput } from "../schema";

interface ExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseRow;
  categories: string[];
  today: string;
  canDelete: boolean;
}

const OTHER = "__other__";

/** Parents remount this with a new `key` per open so the form starts fresh. */
export default function ExpenseSheet({ open, onOpenChange, expense, categories, today, canDelete }: ExpenseSheetProps) {
  const isEdit = Boolean(expense);
  const initialCategory = expense?.category ?? "";
  const [categoryChip, setCategoryChip] = useState<string>(
    initialCategory === "" ? "" : categories.includes(initialCategory) ? initialCategory : OTHER
  );
  const [customCategory, setCustomCategory] = useState(
    initialCategory && !categories.includes(initialCategory) ? initialCategory : ""
  );
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [date, setDate] = useState(expense?.expenseDate ?? today);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const category = categoryChip === OTHER ? customCategory : categoryChip;

  const handleSubmit = async () => {
    const values: ExpenseFormInput = { category, amount: Number(amount), description, expenseDate: date };
    if (!(await validateAndSetErrors(expenseSchema, values, setErrors))) return;
    startTransition(async () => {
      const result = expense ? await callAction(updateExpenseAction(expense.id, values)) : await callAction(createExpenseAction(values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(expense ? "Expense updated" : `Expense of ${formatMoney(values.amount)} added`);
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    if (!expense) return;
    startTransition(async () => {
      const result = await callAction(deleteExpenseAction(expense.id));
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success("Expense deleted");
      onOpenChange(false);
    });
  };

  return (
    <>
    {expense && (
      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(false)}
        title="Delete this expense?"
        description={`${expense.category} · ${formatMoney(expense.amount)} · ${expense.description}`}
        confirmLabel="Delete"
        destructive
        isLoading={isPending}
        onConfirm={handleDelete}
      />
    )}
    <BottomSheet
      open={open && !confirmDelete}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit expense" : "New expense"}
      footer={
        <div className="flex gap-2">
          {isEdit && canDelete && (
            <Button variant="outline" size="lg" aria-label="Delete" className="px-4 text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button size="lg" className="flex-1" isLoading={isPending} onClick={handleSubmit}>
            {isEdit ? "Save" : "Add expense"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="block text-sm font-medium">Category</span>
          <Chips
            aria-label="Category"
            value={categoryChip}
            onChange={(v) => {
              setCategoryChip(v);
              clearError("category");
            }}
            options={[...categories.map((c) => ({ value: c, label: c })), { value: OTHER, label: "Other…" }]}
          />
          {categoryChip === OTHER && (
            <Input
              placeholder="Type a category"
              autoComplete="off"
              autoFocus
              value={customCategory}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                clearError("category");
              }}
            />
          )}
          {errors.category && <p className="text-xs text-danger">{errors.category}</p>}
        </div>

        <Input
          label="Amount (Rs)"
          inputMode="decimal"
          placeholder="0"
          data-autofocus={isEdit ? undefined : "true"}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            clearError("amount");
          }}
          error={errors.amount}
        />
        <Input
          label="Description"
          placeholder="e.g. Electricity bill for August"
          autoComplete="off"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            clearError("description");
          }}
          error={errors.description}
        />
        <Input
          label="Date"
          type="date"
          max={today}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            clearError("expenseDate");
          }}
          error={errors.expenseDate}
        />
      </div>
    </BottomSheet>
    </>
  );
}
