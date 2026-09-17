"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import PeriodPicker from "@/components/common/PeriodPicker";
import PageHeader from "@/components/layout/page-header";
import type { ExpenseRow } from "@/server/expenses/queries";
import { formatDate, formatMoney, type DateRange, type PeriodPreset } from "@/utils/helper";
import { routes } from "@/utils/routes";
import ExpenseSheet from "./expense-sheet";

interface ExpensesScreenProps {
  rows: ExpenseRow[];
  total: number;
  range: DateRange;
  preset: PeriodPreset;
  today: string;
  categories: string[];
  canAdd: boolean;
  canEdit: boolean;
}

export default function ExpensesScreen({ rows, total, range, preset, today, categories, canAdd, canEdit }: ExpensesScreenProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState<{ open: boolean; expense?: ExpenseRow }>({ open: false });
  const [sheetKey, setSheetKey] = useState(0);

  const openSheet = (expense?: ExpenseRow) => {
    setSheetKey((k) => k + 1);
    setSheet({ open: true, expense });
  };

  const navigate = (next: { preset: PeriodPreset; range?: DateRange }) => {
    const params = new URLSearchParams({ period: next.preset });
    if (next.preset === "custom" && next.range) {
      params.set("from", next.range.from);
      params.set("to", next.range.to);
    }
    router.push(`${routes.ui.expenses}?${params.toString()}`);
  };

  // Group by date for scanning
  const groups = new Map<string, ExpenseRow[]>();
  for (const row of rows) groups.set(row.expenseDate, [...(groups.get(row.expenseDate) ?? []), row]);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={`${formatMoney(total)} · ${rows.length} entr${rows.length === 1 ? "y" : "ies"}`}
        actions={
          canAdd ? (
            <Button size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={() => openSheet()}>
              Add
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 p-4">
        <PeriodPicker
          preset={preset}
          range={range}
          today={today}
          presets={["today", "last7", "thisMonth", "lastMonth", "custom"]}
          onChange={navigate}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses in this period"
            description={canAdd ? "Rent, electricity, gas, salaries, rider payments — anything the shop pays for." : "Ask an admin to record expenses."}
            action={canAdd ? <Button startIcon={<Plus className="h-4 w-4" />} onClick={() => openSheet()}>Add expense</Button> : undefined}
          />
        ) : (
          [...groups.entries()].map(([date, items]) => (
            <section key={date} className="space-y-2">
              <h2 className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                <span>{formatDate(`${date}T12:00:00+05:00`)}</span>
                <span className="tabular-nums">{formatMoney(items.reduce((n, e) => n + e.amount, 0))}</span>
              </h2>
              <Card className="divide-y divide-border p-0">
                {items.map((expense) => (
                  <button
                    key={expense.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => openSheet(expense)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors enabled:active:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <Badge>{expense.category}</Badge>
                        <span className="truncate text-xs text-muted">{expense.createdByUser.name}</span>
                      </span>
                      <span className="mt-1 block truncate text-sm">{expense.description}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatMoney(expense.amount)}</span>
                  </button>
                ))}
              </Card>
            </section>
          ))
        )}
      </div>

      <ExpenseSheet
        key={sheetKey}
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        expense={sheet.expense}
        categories={categories}
        today={today}
        canDelete={canEdit}
      />
    </>
  );
}
