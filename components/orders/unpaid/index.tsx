import { Wallet } from "lucide-react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import ListRow from "@/components/common/ListRow";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";
import type { UnpaidOrderRow } from "@/server/orders/queries";
import { formatBusinessDate, formatMoney, formatOrderNumber, formatPhone } from "@/utils/helper";
import { routes } from "@/utils/routes";
import { ORDER_TYPE_LABELS } from "../format";

interface UnpaidOrdersProps {
  rows: UnpaidOrderRow[];
  total: number;
  /** Shop-local today, for working out how long a debt has been sitting. */
  todayBusinessDate: string;
}

/** Whole days between two shop dates — "3 days ago" reads better than a date on an old tab. */
function daysOld(businessDate: string, today: string): number {
  const ms = new Date(`${today}T00:00:00Z`).getTime() - new Date(`${businessDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export default function UnpaidOrders({ rows, total, todayBusinessDate }: UnpaidOrdersProps) {
  return (
    <>
      <PageHeader
        title="Unpaid"
        subtitle={rows.length === 0 ? "Nothing outstanding" : `${rows.length} order${rows.length === 1 ? "" : "s"} · ${formatMoney(total)} owed`}
        backHref={routes.ui.orders}
      />

      <PageBody gap={4}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Everyone is square"
            description="Orders taken on credit, and deliveries waiting on the rider, collect here until they are paid."
          />
        ) : (
          <Card className="divide-y divide-border p-0">
            {rows.map((row) => {
              const age = daysOld(row.businessDate, todayBusinessDate);
              return (
                <ListRow key={row.id} href={routes.ui.orderDetails(row.id)} trailing="chevron">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {row.customerName ?? "No name"}
                      <span className="ml-2 font-normal text-muted">{formatOrderNumber(row.dailySeq)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {ORDER_TYPE_LABELS[row.orderType]}
                      {row.customerPhone ? ` · ${formatPhone(row.customerPhone)}` : ""}
                      {` · ${formatBusinessDate(row.businessDate)}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {age >= 2 && <Badge variant="warning">{age} days</Badge>}
                    <span className="font-semibold tabular-nums">{formatMoney(row.total)}</span>
                  </span>
                </ListRow>
              );
            })}
          </Card>
        )}
      </PageBody>
    </>
  );
}
