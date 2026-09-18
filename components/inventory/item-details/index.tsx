"use client";

import { useState } from "react";
import { ClipboardCheck, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Chips from "@/components/common/Chips";
import PageHeader from "@/components/layout/page-header";
import type { InventoryItemDetails } from "@/server/inventory/queries";
import { cn } from "@/utils/cn";
import {
  describePack,
  formatCostPerUnit,
  formatMoney,
  formatMoneyExact,
  formatQty,
  packLabelOf,
} from "@/utils/helper";
import { routes } from "@/utils/routes";
import ItemFormSheet from "../item-form-sheet";
import PurchaseSheet from "../purchase-sheet";
import StockCountSheet from "../stock-count-sheet";
import WastageSheet from "../wastage-sheet";
import MovementList from "./movement-list";
import PurchaseList from "./purchase-list";

type Sheet = "edit" | "purchase" | "count" | "wastage" | null;
type Tab = "ledger" | "purchases";

interface ItemDetailsProps {
  details: InventoryItemDetails;
}

export default function ItemDetails({ details }: ItemDetailsProps) {
  const { item, movements, purchases } = details;
  const [sheet, setSheet] = useState<Sheet>(null);
  // Incremented on every open so the sheet remounts with a fresh form.
  const [sheetKey, setSheetKey] = useState(0);
  const [tab, setTab] = useState<Tab>("ledger");

  const openSheet = (next: Exclude<Sheet, null>) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };

  const needed = item.lowStockThreshold !== null && item.currentQty <= item.lowStockThreshold;
  const stockValue = item.avgCost === null ? null : item.currentQty * item.avgCost;
  const activePurchases = purchases.filter((p) => !p.voidedAt).length;
  const pack = describePack(item);
  const packCost =
    item.packSize && item.avgCost !== null ? item.avgCost * item.packSize : null;

  return (
    <>
      <PageHeader
        title={item.name}
        subtitle={[item.isActive ? null : "Archived", pack].filter(Boolean).join(" · ") || undefined}
        backHref={routes.ui.inventory}
        actions={
          <Button
            size="sm"
            variant="header"
            startIcon={<Pencil className="h-4 w-4" />}
            onClick={() => openSheet("edit")}
          >
            Edit
          </Button>
        }
      />

      <div className="space-y-4 p-4">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">In stock</p>
              <p
                className={cn(
                  "mt-1 text-3xl font-bold tabular-nums",
                  item.currentQty < 0 && "text-danger",
                  item.currentQty >= 0 && needed && "text-warning"
                )}
              >
                {formatQty(item.currentQty, item.baseUnit)}
              </p>
            </div>
            {item.currentQty < 0 ? (
              <Badge variant="danger">Negative — do a count</Badge>
            ) : needed ? (
              <Badge variant="warning">Needed</Badge>
            ) : item.lowStockThreshold !== null ? (
              <Badge variant="success">OK</Badge>
            ) : null}
          </div>

          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Low-stock limit</dt>
              <dd className="font-medium tabular-nums">
                {item.lowStockThreshold === null
                  ? "—"
                  : formatQty(item.lowStockThreshold, item.baseUnit)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Avg cost</dt>
              <dd className="font-medium tabular-nums">
                {formatCostPerUnit(item.avgCost, item.displayUnit)}
              </dd>
              {packCost !== null && (
                <dd className="text-xs text-muted tabular-nums">
                  {formatMoneyExact(packCost)} / {packLabelOf(item)}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-muted">Stock value</dt>
              <dd className="font-medium tabular-nums">
                {stockValue === null ? "—" : formatMoney(Math.max(stockValue, 0))}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Button
            size="lg"
            startIcon={<ShoppingCart className="h-5 w-5" />}
            onClick={() => openSheet("purchase")}
          >
            Purchase
          </Button>
          <Button
            size="lg"
            variant="outline"
            startIcon={<ClipboardCheck className="h-5 w-5" />}
            onClick={() => openSheet("count")}
          >
            Count
          </Button>
          <Button
            size="lg"
            variant="outline"
            startIcon={<Trash2 className="h-5 w-5" />}
            onClick={() => openSheet("wastage")}
          >
            Wastage
          </Button>
        </div>

        <Chips<Tab>
          aria-label="History"
          value={tab}
          onChange={setTab}
          options={[
            { value: "ledger", label: "Ledger", count: movements.length },
            { value: "purchases", label: "Purchases", count: activePurchases },
          ]}
        />

        {tab === "ledger" ? (
          <MovementList movements={movements} baseUnit={item.baseUnit} />
        ) : (
          <PurchaseList purchases={purchases} item={item} />
        )}
      </div>

      <ItemFormSheet
        key={`edit-${sheetKey}`}
        open={sheet === "edit"}
        onOpenChange={(open) => setSheet(open ? "edit" : null)}
        item={item}
        canChangeBaseUnit={movements.length === 0}
      />
      <PurchaseSheet
        key={`purchase-${sheetKey}`}
        open={sheet === "purchase"}
        onOpenChange={(open) => setSheet(open ? "purchase" : null)}
        item={item}
      />
      <StockCountSheet
        key={`count-${sheetKey}`}
        open={sheet === "count"}
        onOpenChange={(open) => setSheet(open ? "count" : null)}
        item={item}
      />
      <WastageSheet
        key={`wastage-${sheetKey}`}
        open={sheet === "wastage"}
        onOpenChange={(open) => setSheet(open ? "wastage" : null)}
        item={item}
      />
    </>
  );
}
