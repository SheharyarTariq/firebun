"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, Eye, EyeOff, Plus } from "lucide-react";
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
import { callAction } from "@/utils/call-action";
import { validateAndSetErrors } from "@/utils/validation";
import { categorySchema } from "../schema";

type Category = MenuCategory & { items: { id: number }[] };

interface CategoryManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
}

type Action = "create" | "rename" | "up" | "down" | "toggle";

/** List of categories; tapping one opens its actions in a second sheet (rename, move, hide). */
export default function CategoryManagerSheet({ open, onOpenChange, categories }: CategoryManagerSheetProps) {
  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [, startTransition] = useTransition();

  const selected = categories.find((c) => c.id === selectedId) ?? null;
  const selectedIndex = selected ? categories.indexOf(selected) : -1;

  const run = (action: Action, fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
    setPendingAction(action);
    startTransition(async () => {
      const result = await fn();
      setPendingAction(null);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      if (success) toast.success(success);
    });
  };

  const handleCreate = async () => {
    if (!(await validateAndSetErrors(categorySchema, { name: newName }, setErrors))) return;
    run("create", () => callAction(createCategoryAction({ name: newName })), `${newName.trim()} added`);
    setNewName("");
  };

  const openActions = (category: Category) => {
    setSelectedId(category.id);
    setEditName(category.name);
    setErrors({});
  };

  const handleRename = async () => {
    if (!selected) return;
    if (!(await validateAndSetErrors(categorySchema, { name: editName }, setErrors))) return;
    if (editName.trim() === selected.name) return;
    run("rename", () => callAction(updateCategoryAction(selected.id, { name: editName, isActive: selected.isActive })), "Category renamed");
  };

  const handleToggle = () => {
    if (!selected) return;
    const next = !selected.isActive;
    run(
      "toggle",
      () => callAction(updateCategoryAction(selected.id, { name: selected.name, isActive: next })),
      next ? `${selected.name} is back on the counter` : `${selected.name} hidden from the counter`
    );
  };

  const handleMove = (direction: "up" | "down") => {
    if (!selected) return;
    run(direction, () => callAction(moveCategoryAction(selected.id, direction)));
  };

  return (
    <>
      <BottomSheet
        open={open && selected === null}
        onOpenChange={onOpenChange}
        title="Categories"
        description="Tap a category to rename, reorder or hide it. This order is the counter's order."
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
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              error={errors.name}
              containerClassName="flex-1"
            />
            <Button className="h-12 shrink-0" isLoading={pendingAction === "create"} startIcon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
              Add
            </Button>
          </div>

          <ul className="divide-y divide-border rounded-card border border-border">
            {categories.map((category, index) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => openActions(category)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-surface-2"
                >
                  <span className="w-6 text-center text-xs font-semibold tabular-nums text-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{category.name}</span>
                      {!category.isActive && <Badge>Hidden</Badge>}
                    </span>
                    <span className="text-xs text-muted">
                      {category.items.length} item{category.items.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>

      <BottomSheet
        open={open && selected !== null}
        onOpenChange={(next) => !next && setSelectedId(null)}
        title={selected?.name ?? ""}
        description={`Position ${selectedIndex + 1} of ${categories.length}`}
        footer={
          <Button variant="outline" size="lg" className="w-full" startIcon={<ArrowLeft className="h-5 w-5" />} onClick={() => setSelectedId(null)}>
            All categories
          </Button>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <Input
                label="Name"
                autoComplete="off"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (errors.name) setErrors({});
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRename();
                }}
                error={errors.name}
                containerClassName="flex-1"
              />
              <Button
                className="h-12 shrink-0"
                variant="secondary"
                disabled={editName.trim() === selected.name || pendingAction !== null}
                isLoading={pendingAction === "rename"}
                onClick={handleRename}
              >
                Save
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="lg"
                startIcon={<ArrowUp className="h-5 w-5" />}
                disabled={selectedIndex <= 0 || pendingAction !== null}
                isLoading={pendingAction === "up"}
                onClick={() => handleMove("up")}
              >
                Move up
              </Button>
              <Button
                variant="outline"
                size="lg"
                startIcon={<ArrowDown className="h-5 w-5" />}
                disabled={selectedIndex >= categories.length - 1 || pendingAction !== null}
                isLoading={pendingAction === "down"}
                onClick={() => handleMove("down")}
              >
                Move down
              </Button>
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start"
              startIcon={selected.isActive ? <EyeOff className="h-5 w-5 text-muted" /> : <Eye className="h-5 w-5 text-muted" />}
              disabled={pendingAction !== null}
              isLoading={pendingAction === "toggle"}
              onClick={handleToggle}
            >
              {selected.isActive ? "Hide from the counter" : "Show on the counter"}
            </Button>
            <p className="text-xs text-muted">
              Hidden categories keep their items; nothing is deleted. Items themselves can be hidden or marked sold out from their own page.
            </p>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
