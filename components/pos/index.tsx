"use client";

import { useCallback, useEffect, useMemo, useOptimistic, useState } from "react";
import { BluetoothOff, Search, ShoppingBag, X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import PageHeader from "@/components/layout/page-header";
import PrinterSheet from "@/components/printing/printer-sheet";
import { usePrinter } from "@/components/printing/use-printer";
import type { UserRole } from "@/db/schema/users";
import type { CatalogCategory, CatalogItem } from "@/server/orders/queries";
import type { PlaceOrderResult } from "@/server/orders/service";
import { formatOrderNumber } from "@/utils/helper";
import CartBar from "./cart-bar";
import CartSheet from "./cart-sheet";
import { quantitiesByItem, useCart, useHydrated } from "./cart-store";
import DealSheet from "./deal-sheet";
import ItemCard from "./item-card";
import ItemSheet from "./item-sheet";
import PlacedBar, { type PlacedOrder, type PrintOutcome } from "./placed-bar";

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
const NO_QUANTITIES = new Map<number, number>();

type SheetKind = "item" | "deal" | "cart" | "printer";

type AvailabilityPatch = { itemId: number; isAvailable: boolean };

function withAvailability(catalog: CatalogCategory[], patch: AvailabilityPatch): CatalogCategory[] {
  return catalog.map((c) => ({
    ...c,
    items: c.items.map((i) => (i.id === patch.itemId ? { ...i, isAvailable: patch.isAvailable } : i)),
  }));
}

export default function PosScreen({ catalog: serverCatalog, settings, user, businessDateLabel }: PosScreenProps) {
  const [catalog, applyAvailability] = useOptimistic(serverCatalog, withAvailability);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);

  // Which sheet is open, and the item the item/deal sheets show. The item is kept after
  // closing so vaul can play the slide-out; `sheetKey` remounts a sheet on every open.
  const [openSheet, setOpenSheet] = useState<SheetKind | null>(null);
  const [sheetItemId, setSheetItemId] = useState<number | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [printOutcome, setPrintOutcome] = useState<PrintOutcome>(null);
  const [pendingPrint, setPendingPrint] = useState<number | null>(null);

  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const addLine = useCart((s) => s.addLine);
  const decrementItem = useCart((s) => s.decrementItem);
  const printer = usePrinter();

  const inCart = useMemo(() => (hydrated ? quantitiesByItem(lines) : NO_QUANTITIES), [hydrated, lines]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((c) => categoryId === ALL || String(c.id) === categoryId)
      .flatMap((c) => c.items)
      .filter((i) => q === "" || i.name.toLowerCase().includes(q));
  }, [catalog, categoryId, query]);

  const sheetItem = useMemo(
    () => (sheetItemId === null ? undefined : catalog.flatMap((c) => c.items).find((i) => i.id === sheetItemId)),
    [catalog, sheetItemId]
  );

  const show = (kind: SheetKind, item?: CatalogItem) => {
    setSheetKey((k) => k + 1);
    if (item) setSheetItemId(item.id);
    setOpenSheet(kind);
  };
  const closeSheet = (open: boolean) => {
    if (!open) setOpenSheet(null);
  };

  const quickAdd = (item: CatalogItem) => {
    const variant = item.variants[0];
    addLine({
      menuItemId: item.id,
      variantId: variant.id,
      kind: "single",
      name: item.name,
      variantName: variant.name,
      unitPrice: variant.price,
      quantity: 1,
      note: null,
      dealChoices: [],
    });
  };

  const handleTap = (item: CatalogItem) => {
    if (item.kind === "deal") return show("deal", item);
    if (item.variants.length > 1 || !item.isAvailable) return show("item", item);
    quickAdd(item);
  };

  /** Prints a bill, or opens printer setup first and prints as soon as it is ready. */
  const printBill = async (orderId: number) => {
    if (!printer.canPrintNow()) {
      setPendingPrint(orderId);
      show("printer");
      return;
    }
    const id = toast.loading("Printing bill…");
    const ok = await printer.print(orderId, { kitchenCopy: settings.printKitchenCopy, quiet: true });
    setPrintOutcome(ok ? "printed" : "failed");
    if (ok) toast.success("Bill printed", { id });
    else toast.dismiss(id);
  };

  const handlePlaced = async (result: PlaceOrderResult) => {
    setPrintOutcome(null);
    setPlaced({ orderId: result.orderId, dailySeq: result.dailySeq, total: result.total, warnings: result.warnings, duplicate: result.duplicate });
    if (!settings.autoPrintOnPlace || result.duplicate || !printer.isConfigured) return;
    // Still inside the tap's activation window, so Bluetooth / RawBT are allowed to print.
    if (printer.canPrintNow()) {
      await printBill(result.orderId);
    } else {
      toast(`Printer not paired on this phone — tap Print to pair and print ${formatOrderNumber(result.dailySeq)}.`, { icon: <BluetoothOff className="h-4 w-4 text-warning" /> });
    }
  };

  const dismissPlaced = useCallback(() => setPlaced(null), []);

  // The confirmation strip makes way as soon as the next order starts.
  useEffect(
    () =>
      useCart.subscribe((state, previous) => {
        if (state.lines.length > 0 && previous.lines.length === 0) setPlaced(null);
      }),
    []
  );

  return (
    <>
      <PageHeader
        title="Counter"
        subtitle={`${businessDateLabel} · ${user.name}`}
        actions={
          printer.needsPairing ? (
            <button
              type="button"
              onClick={() => show("printer")}
              className="flex h-9 items-center gap-1.5 rounded-full border border-white/20 px-3 text-xs font-medium text-ink-muted transition-colors active:bg-white/10"
            >
              <BluetoothOff className="h-3.5 w-3.5" />
              Printer · not paired
            </button>
          ) : undefined
        }
      />

      {/* Search scrolls away with the grid; only the category chips stay pinned under the header. */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-3">
        <Input
          type="search"
          placeholder="Search menu"
          startIcon={<Search className="h-5 w-5" />}
          endIcon={
            query !== "" && (
              <Button size="icon" variant="ghost" aria-label="Clear search" className="-mr-3 h-10 w-10" onClick={() => setQuery("")}>
                <X className="h-4 w-4" />
              </Button>
            )
          }
          className="[&::-webkit-search-cancel-button]:hidden"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-1">
          <Chips
            aria-label="Category"
            value={categoryId}
            onChange={setCategoryId}
            options={[{ value: ALL, label: "All" }, ...catalog.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-28">
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
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                inCart={inCart.get(item.id) ?? 0}
                onTap={() => handleTap(item)}
                onDecrement={() => decrementItem(item.id)}
                onMore={() => show("item", item)}
              />
            ))}
          </div>
        )}
      </div>

      {placed && lines.length === 0 ? (
        <PlacedBar placed={placed} printing={printer.busy} printOutcome={printOutcome} onPrint={() => printBill(placed.orderId)} onDismiss={dismissPlaced} />
      ) : (
        <CartBar defaultDeliveryCharge={settings.defaultDeliveryCharge} onOpen={() => show("cart")} />
      )}

      <ItemSheet
        key={`item-${sheetKey}`}
        open={openSheet === "item"}
        onOpenChange={closeSheet}
        item={sheetItem}
        onAvailabilityChange={(itemId, isAvailable) => applyAvailability({ itemId, isAvailable })}
      />
      <DealSheet
        key={`deal-${sheetKey}`}
        open={openSheet === "deal"}
        onOpenChange={closeSheet}
        item={sheetItem}
        onAvailabilityChange={(itemId, isAvailable) => applyAvailability({ itemId, isAvailable })}
      />
      <CartSheet
        key={`cart-${sheetKey}`}
        open={openSheet === "cart"}
        onOpenChange={closeSheet}
        settings={settings}
        role={user.role}
        onPlaced={handlePlaced}
      />
      <PrinterSheet
        open={openSheet === "printer"}
        onOpenChange={closeSheet}
        description={pendingPrint !== null ? "The bill prints as soon as the printer is ready." : undefined}
        onReady={() => {
          if (pendingPrint === null) return;
          const orderId = pendingPrint;
          setPendingPrint(null);
          void printBill(orderId);
        }}
      />
    </>
  );
}
