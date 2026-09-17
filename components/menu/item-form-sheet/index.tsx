"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  createMenuItemAction,
  updateMenuItemAction,
} from "@/app/(app)/(admin)/menu/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Chips from "@/components/common/Chips";
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
}

interface VariantRow {
  key: number;
  name: string;
  price: string;
}

const SIZE_TEMPLATES: { label: string; sizes: string[] }[] = [
  { label: "Single price", sizes: ["Regular"] },
  { label: "S / M / L / XL", sizes: ["S", "M", "L", "XL"] },
  { label: "S / L", sizes: ["S", "L"] },
];

let rowKey = 0;
const makeRows = (names: string[]): VariantRow[] =>
  names.map((name) => ({ key: rowKey++, name, price: "" }));

/** Parents remount this with a new `key` on each open so the form starts fresh. */
export default function ItemFormSheet({ open, onOpenChange, categories, item }: ItemFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(item);
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

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updateRow = (key: number, patch: Partial<VariantRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    clearError("variants");
  };

  const handleSubmit = async () => {
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

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit item" : kind === "deal" ? "New deal" : "New menu item"}
      footer={
        <Button size="lg" className="w-full" isLoading={isPending} onClick={handleSubmit}>
          {isEdit ? "Save changes" : "Add to menu"}
        </Button>
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
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError("name");
          }}
          error={errors.name}
        />

        <Select
          label="Category"
          options={activeCategories.map((c) => ({ value: String(c.id), label: c.name }))}
          placeholder="Pick a category"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            clearError("categoryId");
          }}
          error={errors.categoryId}
        />

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
  );
}
