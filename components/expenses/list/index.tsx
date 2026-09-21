"use client";

import { useState } from "react";
import { Pencil, Wallet } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import type { ExpenseRow } from "@/server/expenses/queries";
import { formatBusinessDate, formatMoney } from "@/utils/helper";
import ExpenseSheet from "../expense-sheet";

interface ExpensesListProps {
  rows: ExpenseRow[];
  total: number;
  categories: string[];
  today: string;
  canAdd: boolean;
  canEdit: boolean;
}

export default function ExpensesList({ rows, total, categories, today, canAdd, canEdit }: ExpensesListProps) {
  const [editing, setEditing] = useState<{ open: boolean; expense?: ExpenseRow }>({ open: false });
  const [sheetKey, setSheetKey] = useState(0);

  const openEdit = (expense: ExpenseRow) => {
    setSheetKey((k) => k + 1);
    setEditing({ open: true, expense });
  };

  // Group by date for scanning
  const groups = new Map<string, ExpenseRow[]>();
  for (const row of rows) groups.set(row.expenseDate, [...(groups.get(row.expenseDate) ?? []), row]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No expenses in this period"
        description={canAdd ? "Rent, electricity, gas, salaries, rider payments — anything the shop pays for." : "Ask an admin to record expenses."}
      />
    );
  }

  return (
    <>
      <p className="flex items-baseline justify-between px-1 text-sm">
        <span className="text-muted">
          {rows.length} entr{rows.length === 1 ? "y" : "ies"}
        </span>
        <span className="text-base font-bold tabular-nums">{formatMoney(total)}</span>
      </p>

      {[...groups.entries()].map(([date, items]) => (
        <section key={date} className="space-y-2">
          <h2 className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            <span>{formatBusinessDate(date)}</span>
            <span className="tabular-nums">{formatMoney(items.reduce((n, e) => n + e.amount, 0))}</span>
          </h2>
          <Card className="divide-y divide-border p-0">
            {items.map((expense) => (
              <button
                key={expense.id}
                type="button"
                disabled={!canEdit}
                onClick={() => openEdit(expense)}
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
                {canEdit && <Pencil aria-hidden className="h-4 w-4 shrink-0 text-muted" />}
              </button>
            ))}
          </Card>
        </section>
      ))}

      {canEdit && (
        <ExpenseSheet
          key={sheetKey}
          open={editing.open}
          onOpenChange={(open) => setEditing((s) => ({ ...s, open }))}
          expense={editing.expense}
          categories={categories}
          today={today}
          canDelete
        />
      )}
    </>
  );
}
