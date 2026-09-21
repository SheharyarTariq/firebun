"use client";

import { useMemo, useState } from "react";
import { BellRing, Boxes, Plus, Search } from "lucide-react";
import Badge from "@/components/common/Badge";
import Banner from "@/components/common/Banner";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Chips from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import ListRow from "@/components/common/ListRow";
import PageHeader from "@/components/layout/page-header";
import type { InventoryListItem } from "@/server/inventory/queries";
import { cn } from "@/utils/cn";
import { describePack, formatQty } from "@/utils/helper";
import { routes } from "@/utils/routes";
import ItemFormSheet from "./item-form-sheet";
import LimitsSheet from "./limits-sheet";

type Filter = "all" | "needed" | "inactive";

interface InventoryScreenProps {
  items: InventoryListItem[];
}

export default function InventoryScreen({ items }: InventoryScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  // Incremented on every open so the create form remounts empty.
  const [createKey, setCreateKey] = useState(0);
  const [limitsKey, setLimitsKey] = useState(0);

  const openLimits = () => {
    setLimitsKey((k) => k + 1);
    setLimitsOpen(true);
  };

  const openCreate = () => {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  };

  const activeItems = items.filter((i) => i.isActive);
  const activeCount = activeItems.length;
  const neededCount = activeItems.filter((i) => i.needed).length;
  const inactiveCount = items.length - activeCount;
  const withLimit = activeItems.filter((i) => i.lowStockThreshold !== null).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "needed" && !(item.isActive && item.needed)) return false;
      if (filter === "inactive" && item.isActive) return false;
      if (filter === "all" && !item.isActive) return false;
      return q === "" || item.name.toLowerCase().includes(q);
    });
  }, [items, filter, query]);

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${activeCount} items · ${neededCount} needed`}
        actions={
          <>
            {activeCount > 0 && (
              <Button size="icon" variant="header" aria-label="Low-stock limits" onClick={openLimits}>
                <BellRing className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add
            </Button>
          </>
        }
      />

      <div className="space-y-3 p-4">
        <Input
          type="search"
          placeholder="Search items"
          startIcon={<Search className="h-5 w-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Chips<Filter>
          aria-label="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: activeCount },
            { value: "needed", label: "Needed", count: neededCount },
            { value: "inactive", label: "Archived", count: inactiveCount },
          ]}
        />

        {activeCount > 0 && withLimit === 0 && filter === "all" && query === "" && (
          <Banner tone="brand" icon={<BellRing className="h-5 w-5" />} title="Set low-stock limits" onClick={openLimits}>
            Nothing is flagged as “Needed” yet. Give each item a level and the tab badge tells you what to buy.
          </Banner>
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={items.length === 0 ? "No inventory yet" : "Nothing matches"}
            description={
              items.length === 0
                ? "Add ingredients, packaging and drinks. Each item tracks its own stock and low-stock limit."
                : "Try a different search or filter."
            }
            action={
              items.length === 0 ? (
                <Button startIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  Add first item
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card className="divide-y divide-border p-0">
            {visible.map((item) => (
              <InventoryRow key={item.id} item={item} />
            ))}
          </Card>
        )}
      </div>

      <ItemFormSheet key={`create-${createKey}`} open={createOpen} onOpenChange={setCreateOpen} />
      <LimitsSheet key={`limits-${limitsKey}`} open={limitsOpen} onOpenChange={setLimitsOpen} items={activeItems} />
    </>
  );
}

function InventoryRow({ item }: { item: InventoryListItem }) {
  const hint = [
    item.lowStockThreshold === null
      ? "No low-stock limit"
      : `Limit ${formatQty(item.lowStockThreshold, item.baseUnit)}`,
    describePack(item),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow href={routes.ui.inventoryItemDetails(item.id)} trailing="chevron">
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", !item.isActive && "text-muted")}>{item.name}</p>
        <p className="truncate text-xs text-muted">{hint}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p
          className={cn(
            "font-semibold tabular-nums",
            item.currentQty < 0 && "text-danger",
            item.currentQty >= 0 && item.needed && "text-warning"
          )}
        >
          {formatQty(item.currentQty, item.baseUnit)}
        </p>
        {!item.isActive ? (
          <Badge>Archived</Badge>
        ) : item.currentQty < 0 ? (
          <Badge variant="danger">Negative</Badge>
        ) : item.needed ? (
          <Badge variant="warning">Needed</Badge>
        ) : null}
      </div>
    </ListRow>
  );
}
