"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Plus, Search } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Chips from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import PageHeader from "@/components/layout/page-header";
import type { InventoryListItem } from "@/server/inventory/queries";
import { cn } from "@/utils/cn";
import { describePack, formatQty } from "@/utils/helper";
import { routes } from "@/utils/routes";
import ItemFormSheet from "./item-form-sheet";

type Filter = "all" | "needed" | "inactive";

interface InventoryScreenProps {
  items: InventoryListItem[];
}

export default function InventoryScreen({ items }: InventoryScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  // Incremented on every open so the create form remounts empty.
  const [createKey, setCreateKey] = useState(0);

  const openCreate = () => {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  };

  const activeCount = items.filter((i) => i.isActive).length;
  const neededCount = items.filter((i) => i.isActive && i.needed).length;
  const inactiveCount = items.length - activeCount;

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
          <Button
            size="sm"
            startIcon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add
          </Button>
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
            { value: "inactive", label: "Inactive", count: inactiveCount },
          ]}
        />

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

      <ItemFormSheet key={createKey} open={createOpen} onOpenChange={setCreateOpen} />
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
    <Link
      href={routes.ui.inventoryItemDetails(item.id)}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface-2"
    >
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
          <Badge>Inactive</Badge>
        ) : item.currentQty < 0 ? (
          <Badge variant="danger">Negative</Badge>
        ) : item.needed ? (
          <Badge variant="warning">Needed</Badge>
        ) : null}
      </div>
    </Link>
  );
}
