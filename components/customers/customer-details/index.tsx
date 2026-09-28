"use client";

import { useState } from "react";
import { Pencil, Receipt } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import ListRow from "@/components/common/ListRow";
import SectionHeading from "@/components/common/SectionHeading";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";
import type { CustomerDetails as CustomerDetailsData } from "@/server/customers/queries";
import { customerLabel, formatBusinessDate, formatMoney, formatOrderNumber, formatPhone } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { ORDER_TYPE_LABELS, STATUS_BADGE, STATUS_LABELS } from "@/components/orders/format";
import CustomerFormSheet from "../customer-form-sheet";

interface CustomerDetailsProps {
  details: CustomerDetailsData;
  isAdmin: boolean;
}

export default function CustomerDetails({ details, isAdmin }: CustomerDetailsProps) {
  const { customer, history, owed, spent, orderCount } = details;
  const [editing, setEditing] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);

  const unpaid = history.filter((o) => o.status === "pending");

  return (
    <>
      <PageHeader
        title={customerLabel(customer)}
        subtitle={customer.name ? formatPhone(customer.phone) : undefined}
        backHref={routes.ui.customers}
        actions={
          isAdmin ? (
            <Button
              size="sm"
              variant="header"
              startIcon={<Pencil className="h-4 w-4" />}
              onClick={() => {
                setSheetKey((k) => k + 1);
                setEditing(true);
              }}
            >
              Edit
            </Button>
          ) : undefined
        }
      />

      <PageBody gap={4}>
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Owed now</p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${owed > 0 ? "text-warning" : ""}`}>
              {formatMoney(owed)}
            </p>
            {unpaid.length > 0 && (
              <p className="text-xs text-muted">
                across {unpaid.length} unpaid order{unpaid.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Spent with the shop</dt>
              <dd className="font-medium tabular-nums">{formatMoney(spent)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Orders</dt>
              <dd className="font-medium tabular-nums">{orderCount}</dd>
            </div>
          </dl>
          {customer.note && <p className="text-sm italic text-muted">“{customer.note}”</p>}
        </Card>

        <div className="space-y-1">
          <SectionHeading>Orders</SectionHeading>
          {history.length === 0 ? (
            <EmptyState icon={Receipt} title="No orders yet" description="Their first order will show here." />
          ) : (
            <Card className="divide-y divide-border p-0">
              {history.map((o) => (
                <ListRow key={o.id} href={routes.ui.orderDetails(o.id)} trailing="chevron">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {formatOrderNumber(o.dailySeq)}
                      <span className="ml-2 font-normal text-muted">{ORDER_TYPE_LABELS[o.orderType]}</span>
                    </span>
                    <span className="block text-xs text-muted">{formatBusinessDate(o.businessDate)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {o.status !== "completed" && (
                      <Badge variant={STATUS_BADGE[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                    )}
                    <span className="font-semibold tabular-nums">{formatMoney(o.total)}</span>
                  </span>
                </ListRow>
              ))}
            </Card>
          )}
        </div>
      </PageBody>

      <CustomerFormSheet
        key={`edit-${sheetKey}`}
        open={editing}
        onOpenChange={setEditing}
        customer={customer}
        canEdit={isAdmin}
        owed={owed}
      />
    </>
  );
}
