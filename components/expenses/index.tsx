"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import Button from "@/components/common/Button";
import PeriodPicker from "@/components/common/PeriodPicker";
import PageHeader from "@/components/layout/page-header";
import { EXPENSE_PRESETS, resolvePeriod, type DateRange, type PeriodPreset } from "@/utils/helper";
import { routes } from "@/utils/routes";
import ExpenseSheet from "./expense-sheet";

interface ExpensesShellProps {
  today: string;
  categories: string[];
  canAdd: boolean;
  /** The list page, swapped (with its own loading state) when the period changes. */
  children: React.ReactNode;
}

/** Lives in the route layout: header, Add button and period chips stay put between periods. */
export default function ExpensesShell({ today, categories, canAdd, children }: ExpensesShellProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { preset, range } = resolvePeriod(
    { period: params.get("period"), from: params.get("from"), to: params.get("to") },
    today,
    EXPENSE_PRESETS,
    "thisMonth"
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);

  const openAdd = () => {
    setAddKey((k) => k + 1);
    setAddOpen(true);
  };

  const navigate = (next: { preset: PeriodPreset; range?: DateRange }) => {
    const query = new URLSearchParams({ period: next.preset });
    if (next.preset === "custom" && next.range) {
      query.set("from", next.range.from);
      query.set("to", next.range.to);
    }
    router.push(`${routes.ui.expenses}?${query.toString()}`);
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        actions={
          canAdd ? (
            <Button size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
              Add
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 p-4">
        <PeriodPicker key={preset} preset={preset} range={range} today={today} presets={EXPENSE_PRESETS} onChange={navigate} />
        {children}
      </div>

      {canAdd && (
        <ExpenseSheet key={addKey} open={addOpen} onOpenChange={setAddOpen} categories={categories} today={today} canDelete={false} />
      )}
    </>
  );
}
