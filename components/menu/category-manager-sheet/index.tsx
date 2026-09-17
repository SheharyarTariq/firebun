"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  createCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
} from "@/app/(app)/(admin)/menu/actions";
import Badge from "@/components/common/Badge";
import BottomSheet from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import type { MenuCategory } from "@/db/schema";
import { validateAndSetErrors } from "@/utils/validation";
import { categorySchema } from "../schema";

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: (MenuCategory & { items: { id: number }[] })[];
}

export default function CategoryManagerSheet({
  open,
  onOpenChange,
  categories,
}: CategoryManagerSheetProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const handleCreate = async () => {
    if (!(await validateAndSetErrors(categorySchema, { name: newName }, setErrors))) return;
    startTransition(async () => {
      const result = await createCategoryAction({ name: newName });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Category added");
      setNewName("");
    });
  };

  const handleRename = async (category: MenuCategory) => {
    if (!(await validateAndSetErrors(categorySchema, { name: editName }, setErrors))) return;
    startTransition(async () => {
      const result = await updateCategoryAction(category.id, {
        name: editName,
        isActive: category.isActive,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditingId(null);
    });
  };

  const handleToggle = (category: MenuCategory) => {
    startTransition(async () => {
      const result = await updateCategoryAction(category.id, {
        name: category.name,
        isActive: !category.isActive,
      });
      if (!result.ok) toast.error(result.error);
    });
  };

  const handleMove = (id: number, direction: "up" | "down") => {
    startTransition(async () => {
      const result = await moveCategoryAction(id, direction);
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Categories"
      description="Order here is the order on the counter screen."
    >
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <Input
            label="New category"
            placeholder="e.g. Desserts"
            autoComplete="off"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (errors.name) setErrors({});
            }}
            error={errors.name}
            containerClassName="flex-1"
          />
          <Button
            className="h-12 shrink-0"
            isLoading={isPending}
            startIcon={<Plus className="h-4 w-4" />}
            onClick={handleCreate}
          >
            Add
          </Button>
        </div>

        <ul className="divide-y divide-border rounded-card border border-border">
          {categories.map((category, index) => (
            <li key={category.id} className="flex items-center gap-2 px-3 py-2.5">
              {editingId === category.id ? (
                <>
                  <Input
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    containerClassName="flex-1"
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename(category);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button
                    size="sm"
                    aria-label="Save"
                    className="px-2.5"
                    onClick={() => handleRename(category)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Cancel"
                    className="px-2.5"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditName(category.name);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{category.name}</span>
                      {!category.isActive && <Badge>Hidden</Badge>}
                    </span>
                    <span className="text-xs text-muted">
                      {category.items.length} item{category.items.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Rename"
                    className="px-2"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditName(category.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Move up"
                    className="px-2"
                    disabled={index === 0 || isPending}
                    onClick={() => handleMove(category.id, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Move down"
                    className="px-2"
                    disabled={index === categories.length - 1 || isPending}
                    onClick={() => handleMove(category.id, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 text-xs"
                    disabled={isPending}
                    onClick={() => handleToggle(category)}
                  >
                    {category.isActive ? "Hide" : "Show"}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  );
}
