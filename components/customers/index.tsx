"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import ListRow from "@/components/common/ListRow";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";
import type { CustomerRow } from "@/server/customers/queries";
import { customerLabel, formatMoney, formatPhone, normalisePhone } from "@/utils/helper";
import { routes } from "@/utils/routes";
import CustomerFormSheet from "./customer-form-sheet";

interface CustomersScreenProps {
  rows: CustomerRow[];
  totalOwed: number;
  isAdmin: boolean;
}

/** The customer book, whoever owes money first — that is what it is for. */
export default function CustomersScreen({ rows, totalOwed, isAdmin }: CustomersScreenProps) {
  const [search, setSearch] = useState("");
  const [sheetKey, setSheetKey] = useState(0);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return rows;
    const digits = normalisePhone(text);
    return rows.filter(
      (r) => customerLabel(r).toLowerCase().includes(text) || (digits.length >= 3 && r.phone.includes(digits))
    );
  }, [rows, search]);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={totalOwed > 0 ? `${formatMoney(totalOwed)} owed in total` : `${rows.length} on file`}
        backHref={routes.ui.more}
        actions={
          <Button
            size="sm"
            variant="header"
            startIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setSheetKey((k) => k + 1);
              setAdding(true);
            }}
          >
            Add
          </Button>
        }
      />

      <PageBody gap={4}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Anyone who takes food on credit goes on file automatically. You can also add a regular here."
          />
        ) : (
          <>
            <Input
              placeholder="Search by name or number"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No match" description="Try part of the name or the number." />
            ) : (
              <Card className="divide-y divide-border p-0">
                {filtered.map((c) => (
                  <ListRow key={c.id} href={routes.ui.customerDetails(c.id)} trailing="chevron">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{customerLabel(c)}</span>
                      <span className="block truncate text-xs text-muted">
                        {c.name ? formatPhone(c.phone) : "No name yet"}
                        {c.orderCount > 0 ? ` · ${c.orderCount} order${c.orderCount === 1 ? "" : "s"}` : ""}
                      </span>
                    </span>
                    {c.owed > 0 && <Badge variant="warning">{formatMoney(c.owed)} owed</Badge>}
                  </ListRow>
                ))}
              </Card>
            )}
          </>
        )}
      </PageBody>

      <CustomerFormSheet
        key={`new-${sheetKey}`}
        open={adding}
        onOpenChange={setAdding}
        canEdit={isAdmin}
      />
    </>
  );
}
