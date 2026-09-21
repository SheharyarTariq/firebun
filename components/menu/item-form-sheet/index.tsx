"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  createCategoryAction,
  createMenuItemAction,
  deleteMenuItemAction,
  updateMenuItemAction,
} from "@/app/(app)/(admin)/menu/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import Toggle from "@/components/common/Toggle";
import type { MenuCategory, MenuItem, MenuItemKind } from "@/db/schema";
import { callAction } from "@/utils/call-action";
import { routes } from "@/utils/routes";
import { validateAndSetErrors } from "@/utils/validation";
import { createMenuItemSchema, updateMenuItemSchema } from "../schema";

interface ItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategory[];
  /** Present when editing; sizes are then managed on the item page. */
  item?: MenuItem;
  /** Editing only: what would block a delete (sold lines, offered inside a deal). */
  deleteBlock?: { orderLines: number; dealUses: number };
}

interface VariantRow {
  key: number;
  name: string;
  price: string;
}

/** Chosen in the category dropdown to type a new one instead of picking. */
const NEW_CATEGORY = "__new__";

const SIZE_TEMPLATES: { label: string; sizes: string[] }[] = [
  { label: "Single price", sizes: ["Regular"] },
  { label: "S / M / L / XL", sizes: ["S", "M", "L", "XL"] },
  { label: "S / L", sizes: ["S", "L"] },
];

let rowKey = 0;
const makeRows = (names: string[]): VariantRow[] =>
  names.map((name) => ({ key: rowKey++, name, price: "" }));

/** Parents remount this with a new `key` on each open so the form starts fresh. */
export default function ItemFormSheet({ open, onOpenChange, categories, item, deleteBlock }: ItemFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const activeCategories = categories.filter((c) => c.isActive || c.id === item?.categoryId);

  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    item ? String(item.categoryId) : String(activeCategories[0]?.id ?? "")
  );
  const [kind, setKind] = useState<MenuItemKind>(item?.kind ?? "single");
  const [description, setDescription] = useState(item?.description ?? "");
  const [rows, setRows] = useState<VariantRow[]>(() => makeRows(["Regular"]));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [showOnPublicMenu, setShowOnPublicMenu] = useState(item?.showOnPublicMenu ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // With no categories yet there is nothing to pick, so the sheet opens on the name field.
  const [creatingCategory, setCreatingCategory] = useState(activeCategories.length === 0);
  const [newCategory, setNewCategory] = useState("");
  const [categoryPending, setCategoryPending] = useState(false);

  const handleAddCategory = () => {
    const value = newCategory.trim();
    if (!value) {
      setErrors((prev) => ({ ...prev, categoryId: "Type a category name" }));
      return;
    }
    setCategoryPending(true);
    startTransition(async () => {
      const result = await callAction(createCategoryAction({ name: value }));
      setCategoryPending(false);
      if (!result.ok) {
        setErrors((prev) => ({ ...prev, categoryId: result.error }));
        return;
      }
      // The server title-cases it, so "burgers" comes back as the "Burgers" we select here.
      setCategoryId(String(result.data.id));
      setNewCategory("");
      setCreatingCategory(false);
      clearError("categoryId");
      toast.success("Category added");
    });
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updateRow = (key: number, patch: Partial<VariantRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    clearError("variants");
  };

  const handleSubmit = async () => {
    // A category typed but not added yet would otherwise fail as "Pick a category".
    if (creatingCategory && !categoryId) {
      setErrors((prev) => ({
        ...prev,
        categoryId: newCategory.trim() ? "Tap Add to create this category first" : "Type a category name and tap Add",
      }));
      return;
    }

    if (item) {
      const values = {
        categoryId: Number(categoryId),
        name,
        description: description.trim() || undefined,
        isActive,
        isAvailable,
        showOnPublicMenu,
      };
      if (!(await validateAndSetErrors(updateMenuItemSchema, values, setErrors))) return;
      startTransition(async () => {
        const result = await callAction(updateMenuItemAction(item.id, values));
        if (!result.ok) {
          if (result.fieldErrors) setErrors(result.fieldErrors);
          toast.error(result.error);
          return;
        }
        toast.success("Item updated");
        onOpenChange(false);
      });
      return;
    }

    const values = {
      categoryId: Number(categoryId),
      name,
      kind,
      description: description.trim() || undefined,
      variants: rows.map((r) => ({ name: r.name, price: Number(r.price) })),
    };
    if (!(await validateAndSetErrors(createMenuItemSchema, values, setErrors))) return;
    startTransition(async () => {
      const result = await callAction(createMenuItemAction(values));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success(kind === "deal" ? "Deal added — now add its slots" : "Item added — now add its recipe");
      onOpenChange(false);
      router.push(routes.ui.menuItemDetails(result.data.id));
    });
  };

  const variantsError =
    errors.variants ||
    Object.entries(errors).find(([k]) => k.startsWith("variants["))?.[1];

  const handleDelete = () => {
    if (!item) return;
    startTransition(async () => {
      const result = await callAction(deleteMenuItemAction(item.id));
      if (!result.ok) {
        toast.error(result.error);
        setConfirmDelete(false);
        return;
      }
      toast.success(`${item.name} deleted`);
      onOpenChange(false);
      router.push(routes.ui.menu);
    });
  };

  const blockedReason = !deleteBlock
    ? null
    : deleteBlock.orderLines > 0
      ? `Sold in ${deleteBlock.orderLines} order line${deleteBlock.orderLines === 1 ? "" : "s"}, so it stays for the records. Switch “On the menu” off to hide it instead.`
      : deleteBlock.dealUses > 0
        ? "Offered inside a deal. Remove it from the deal first, or switch “On the menu” off to hide it."
        : null;

  return (
    <>
    {item && (
      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={(next) => !next && setConfirmDelete(false)}
        title={`Delete ${item.name}?`}
        description={blockedReason ?? "Its sizes, prices, recipes and deal contents are deleted with it. This cannot be undone."}
        confirmLabel="Delete"
        destructive
        isLoading={isPending}
        onConfirm={blockedReason ? () => setConfirmDelete(false) : handleDelete}
      />
    )}
    <BottomSheet
      open={open && !confirmDelete}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit item" : kind === "deal" ? "New deal" : "New menu item"}
      footer={
        <div className="flex gap-2">
          {isEdit && (
            <Button variant="outline" size="lg" aria-label="Delete item" className="px-4 text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button size="lg" className="flex-1" isLoading={isPending} onClick={handleSubmit}>
            {isEdit ? "Save" : "Add to menu"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!isEdit && (
          <div className="space-y-2">
            <span className="block text-sm font-medium">Type</span>
            <Chips<MenuItemKind>
              value={kind}
              onChange={(next) => {
                setKind(next);
                if (next === "deal") setRows(makeRows(["Regular"]));
              }}
              options={[
                { value: "single", label: "Item" },
                { value: "deal", label: "Deal (bundle)" },
              ]}
            />
          </div>
        )}

        <Input
          label="Name"
          placeholder={kind === "deal" ? "e.g. Deal 9" : "e.g. Zinger Burger"}
          autoComplete="off"
          autoCapitalize="words"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          error={errors.name}
        />

        {creatingCategory ? (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <Input
                label="New category"
                placeholder="e.g. Burgers"
                autoComplete="off"
                autoCapitalize="words"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  clearError("categoryId");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                error={errors.categoryId}
                hint={activeCategories.length === 0 ? "Categories group the counter screen — Burgers, Pizza, Drinks…" : undefined}
                containerClassName="flex-1"
              />
              <Button className="h-12 shrink-0" isLoading={categoryPending} onClick={handleAddCategory}>
                Add
              </Button>
            </div>
            {activeCategories.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="-ml-3 text-muted"
                onClick={() => {
                  setCreatingCategory(false);
                  clearError("categoryId");
                }}
              >
                Choose an existing category
              </Button>
            )}
          </div>
        ) : (
          <Select
            label="Category"
            options={[
              ...activeCategories.map((c) => ({ value: String(c.id), label: c.name })),
              { value: NEW_CATEGORY, label: "+ New category…" },
            ]}
            placeholder="Pick a category"
            value={categoryId}
            onChange={(e) => {
              if (e.target.value === NEW_CATEGORY) {
                setCreatingCategory(true);
                clearError("categoryId");
                return;
              }
              setCategoryId(e.target.value);
              clearError("categoryId");
            }}
            error={errors.categoryId}
          />
        )}

        <Textarea
          label={kind === "deal" ? "What's included (shown on the bill)" : "Description (optional)"}
          placeholder={
            kind === "deal" ? "e.g. 1 Zinger Burger, 1 Regular Fries, 1 Regular Drink" : "For the future website"
          }
          rows={2}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            clearError("description");
          }}
          error={errors.description}
        />

        {!isEdit && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{kind === "deal" ? "Price" : "Sizes & prices"}</span>
              {kind === "single" && (
                <Select
                  aria-label="Size template"
                  options={SIZE_TEMPLATES.map((t) => ({ value: t.label, label: t.label }))}
                  placeholder="Template"
                  containerClassName="w-40"
                  className="h-9 text-sm"
                  value=""
                  onChange={(e) => {
                    const template = SIZE_TEMPLATES.find((t) => t.label === e.target.value);
                    if (template) setRows(makeRows(template.sizes));
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={row.key} className="flex items-start gap-2">
                  {kind === "single" && (
                    <Input
                      aria-label="Size name"
                      placeholder="Size"
                      autoCapitalize="words"
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      containerClassName="w-28"
                    />
                  )}
                  <Input
                    aria-label="Price"
                    inputMode="decimal"
                    placeholder="Price (Rs)"
                    value={row.price}
                    onChange={(e) => updateRow(row.key, { price: e.target.value })}
                    containerClassName="flex-1"
                  />
                  {kind === "single" && rows.length > 1 && (
                    <Button
                      variant="ghost"
                      aria-label={`Remove ${row.name || `size ${index + 1}`}`}
                      className="h-12 px-2.5 text-danger"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {variantsError && <p className="text-xs text-danger">{variantsError}</p>}
            {kind === "single" && (
              <Button
                variant="outline"
                size="sm"
                startIcon={<Plus className="h-4 w-4" />}
                onClick={() => setRows((prev) => [...prev, ...makeRows([""])])}
              >
                Add size
              </Button>
            )}
          </div>
        )}

        {isEdit && (
          <div className="space-y-2">
            <Toggle
              label="Available"
              description="Off = sold out; hidden from the counter until switched back on."
              checked={isAvailable}
              onChange={setIsAvailable}
            />
            <Toggle
              label="On the menu"
              description="Off = removed from the menu entirely (past orders keep it)."
              checked={isActive}
              onChange={setIsActive}
            />
            <Toggle
              label="Show on website"
              description="For the public landing page later."
              checked={showOnPublicMenu}
              onChange={setShowOnPublicMenu}
            />
          </div>
        )}
      </div>
    </BottomSheet>
    </>
  );
}
