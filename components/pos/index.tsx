"use client";

import { useMemo, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import Chips from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import PageHeader from "@/components/layout/page-header";
import type { UserRole } from "@/db/schema/users";
import type { CatalogCategory, CatalogItem } from "@/server/orders/queries";
import CartBar from "./cart-bar";
import CartSheet from "./cart-sheet";
import DealSheet from "./deal-sheet";
import ItemCard from "./item-card";
import ItemSheet from "./item-sheet";

export interface PosSettings {
  defaultDeliveryCharge: number;
  staffMaxDiscountPct: number;
  autoPrintOnPlace: boolean;
  printKitchenCopy: boolean;
}

interface PosScreenProps {
  catalog: CatalogCategory[];
  settings: PosSettings;
  user: { name: string; role: UserRole };
  /** Shop-local business date, shown in the header. */
  businessDateLabel: string;
}

const ALL = "all";

type Sheet = { type: "item"; item: CatalogItem } | { type: "deal"; item: CatalogItem } | { type: "cart" } | null;

export default function PosScreen({ catalog, settings, user, businessDateLabel }: PosScreenProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const openSheet = (next: Exclude<Sheet, null>) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((c) => categoryId === ALL || String(c.id) === categoryId)
      .flatMap((c) => c.items)
      .filter((i) => q === "" || i.name.toLowerCase().includes(q));
  }, [catalog, categoryId, query]);

  return (
    <>
      <PageHeader title="Counter" subtitle={`${businessDateLabel} · ${user.name}`} />

      <div className="sticky top-14 z-20 space-y-2 bg-background px-4 pb-2 pt-3">
        <Input
          type="search"
          placeholder="Search menu"
          startIcon={<Search className="h-5 w-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Chips
          aria-label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={[{ value: ALL, label: "All" }, ...catalog.map((c) => ({ value: String(c.id), label: c.name }))]}
        />
      </div>

      <div className="px-4 pb-24">
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={catalog.length === 0 ? "The menu is empty" : "Nothing matches"}
            description={
              catalog.length === 0
                ? "An admin needs to add menu items first."
                : "Try another search or category."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onSelect={() => openSheet({ type: item.kind === "deal" ? "deal" : "item", item })}
              />
            ))}
          </div>
        )}
      </div>

      <CartBar defaultDeliveryCharge={settings.defaultDeliveryCharge} onOpen={() => openSheet({ type: "cart" })} />

      <ItemSheet
        key={`item-${sheetKey}`}
        open={sheet?.type === "item"}
        onOpenChange={(open) => !open && setSheet(null)}
        item={sheet?.type === "item" ? sheet.item : undefined}
      />
      <DealSheet
        key={`deal-${sheetKey}`}
        open={sheet?.type === "deal"}
        onOpenChange={(open) => !open && setSheet(null)}
        item={sheet?.type === "deal" ? sheet.item : undefined}
      />
      <CartSheet
        key={`cart-${sheetKey}`}
        open={sheet?.type === "cart"}
        onOpenChange={(open) => !open && setSheet(null)}
        settings={settings}
        role={user.role}
      />
    </>
  );
}
