"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChefHat, ChevronRight, Plus, Search, Settings2, UtensilsCrossed } from "lucide-react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Chips, { type ChipOption } from "@/components/common/Chips";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import PageHeader from "@/components/layout/page-header";
import type { MenuCategoryWithItems, MenuListItem } from "@/server/menu/queries";
import { cn } from "@/utils/cn";
import { routes } from "@/utils/routes";
import CategoryManagerSheet from "./category-manager-sheet";
import { summariseVariants } from "./format";
import ItemFormSheet from "./item-form-sheet";

interface MenuScreenProps {
  categories: MenuCategoryWithItems[];
}

const ALL = "all";
const NO_RECIPE = "no-recipe";

/** Single items whose active sizes all lack a recipe (deals are composed of other items). */
const needsRecipe = (item: MenuListItem) =>
  item.kind === "single" && item.isActive && !item.variants.some((v) => v.isActive && v.recipes.length > 0);

export default function MenuScreen({ categories }: MenuScreenProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);

  const openCreate = () => {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  };

  const allItems = categories.flatMap((c) => c.items);
  const totalItems = allItems.filter((i) => i.isActive).length;
  const soldOut = allItems.filter((i) => i.isActive && !i.isAvailable).length;
  const singles = allItems.filter((i) => i.kind === "single" && i.isActive);
  const missingRecipe = singles.filter(needsRecipe).length;
  const withRecipe = singles.length - missingRecipe;

  const chipOptions: ChipOption[] = [
    { value: ALL, label: "All", count: totalItems },
    ...(missingRecipe > 0 ? [{ value: NO_RECIPE, label: "No recipe", count: missingRecipe }] : []),
    ...categories
      .filter((c) => c.isActive || c.items.length > 0)
      .map((c) => ({ value: String(c.id), label: c.name, count: c.items.length })),
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => categoryFilter === ALL || categoryFilter === NO_RECIPE || String(c.id) === categoryFilter)
      .map((c) => ({
        ...c,
        items: c.items
          .filter((i) => categoryFilter !== NO_RECIPE || needsRecipe(i))
          .filter((i) => q === "" || i.name.toLowerCase().includes(q)),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, categoryFilter, query]);

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle={`${totalItems} items · ${withRecipe} of ${singles.length} have a recipe${soldOut ? ` · ${soldOut} sold out` : ""}`}
        actions={
          <Button size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Add
          </Button>
        }
      />

      <div className="space-y-3 p-4">
        <Input
          type="search"
          placeholder="Search menu"
          startIcon={<Search className="h-5 w-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Chips
            aria-label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={chipOptions}
            className="min-w-0 flex-1"
          />
          <Button
            size="icon"
            variant="outline"
            aria-label="Manage categories"
            className="shrink-0"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>

        {missingRecipe > 0 && categoryFilter !== NO_RECIPE && query === "" && (
          <button
            type="button"
            onClick={() => setCategoryFilter(NO_RECIPE)}
            className="flex w-full items-center gap-3 rounded-card border border-brand/50 bg-brand/10 px-4 py-3 text-left transition-colors active:bg-brand/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
              <ChefHat className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {missingRecipe === singles.length ? "Recipes are the next step" : `${missingRecipe} item${missingRecipe === 1 ? "" : "s"} still without a recipe`}
              </span>
              <span className="block text-xs text-muted">
                Sales only deduct stock for items with a recipe. Tap to see which ones are missing.
              </span>
            </span>
            <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted" />
          </button>
        )}

        {visible.length === 0 ? (
          categories.length === 0 ? (
            // Nothing can be added until a category exists, so point straight at that.
            <EmptyState
              icon={Settings2}
              title="Start with a category"
              description="Menu items live inside categories like Burgers, Pizza and Drinks. Add one, then add items to it."
              action={
                <Button startIcon={<Plus className="h-4 w-4" />} onClick={() => setManageOpen(true)}>
                  Add category
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={UtensilsCrossed}
              title={totalItems === 0 ? "No menu items yet" : "Nothing matches"}
              description={
                totalItems === 0
                  ? "Add items with their sizes and prices, then link each size to inventory."
                  : "Try a different search or category."
              }
              action={
                totalItems === 0 ? (
                  <Button startIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                    Add first item
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          visible.map((category) => (
            <section key={category.id} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {category.name}
                {!category.isActive && <Badge>Hidden</Badge>}
              </h2>
              <Card className="divide-y divide-border p-0">
                {category.items.map((item) => (
                  <MenuRow key={item.id} item={item} />
                ))}
              </Card>
            </section>
          ))
        )}
      </div>

      <ItemFormSheet
        key={createKey}
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
      />
      <CategoryManagerSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />
    </>
  );
}

function MenuRow({ item }: { item: MenuListItem }) {
  const isDeal = item.kind === "deal";
  const activeVariants = item.variants.filter((v) => v.isActive);
  const withRecipe = activeVariants.filter((v) => v.recipes.length > 0).length;
  const slots = item.variants.reduce((n, v) => n + v.dealSlots.length, 0);

  return (
    <Link
      href={routes.ui.menuItemDetails(item.id)}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface-2"
    >
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", !item.isActive && "text-muted line-through")}>
          {item.name}
        </p>
        <p className="truncate text-xs text-muted">{summariseVariants(item.variants)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {!item.isActive ? (
          <Badge>Hidden</Badge>
        ) : !item.isAvailable ? (
          <Badge variant="danger">Sold out</Badge>
        ) : null}
        {isDeal ? (
          <Badge variant={slots > 0 ? "info" : "warning"}>
            {slots > 0 ? `${slots} slot${slots === 1 ? "" : "s"}` : "No slots"}
          </Badge>
        ) : withRecipe === 0 ? (
          <Badge variant="warning">No recipe</Badge>
        ) : withRecipe < activeVariants.length ? (
          <Badge variant="warning">
            Recipe {withRecipe}/{activeVariants.length}
          </Badge>
        ) : (
          <Badge variant="success">Recipe ✓</Badge>
        )}
      </div>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
