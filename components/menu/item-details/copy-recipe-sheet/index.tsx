"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { copyRecipeAction } from "@/app/(app)/(admin)/menu/actions";
import BottomSheet from "@/components/common/BottomSheet";
import Input from "@/components/common/Input";
import Loader from "@/components/common/Loader";
import type { RecipeSource, VariantFull } from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { cn } from "@/utils/cn";

interface CopyRecipeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The size that receives the copy. */
  target?: VariantFull;
  targetItemId: number;
  sources: RecipeSource[];
}

/** Pick any size on the menu that has a recipe; its lines replace the target's recipe. */
export default function CopyRecipeSheet({ open, onOpenChange, target, targetItemId, sources }: CopyRecipeSheetProps) {
  const [query, setQuery] = useState("");
  const [copying, setCopying] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources
      .filter((s) => s.itemId !== targetItemId)
      .filter((s) => q === "" || s.itemName.toLowerCase().includes(q) || s.variantName.toLowerCase().includes(q));
  }, [sources, query, targetItemId]);

  const copy = (source: RecipeSource) => {
    if (!target) return;
    setCopying(source.variantId);
    startTransition(async () => {
      const result = await callAction(copyRecipeAction(source.variantId, target.id, { crossItem: true }));
      setCopying(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Recipe copied from ${source.itemName} — adjust the amounts`);
      onOpenChange(false);
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Copy a recipe"
      description={target ? `Into ${target.name === "Regular" ? "this item" : target.name}. Amounts can be changed afterwards.` : undefined}
    >
      <div className="space-y-3">
        <Input
          type="search"
          placeholder="Search items with a recipe"
          data-autofocus="true"
          startIcon={<Search className="h-5 w-5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="divide-y divide-border rounded-field border border-border">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">
              {sources.length === 0 ? "No other item has a recipe yet." : "Nothing matches."}
            </li>
          )}
          {filtered.map((s) => (
            <li key={s.variantId}>
              <button
                type="button"
                disabled={copying !== null}
                onClick={() => copy(s)}
                className={cn("flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-surface-2", copying !== null && copying !== s.variantId && "opacity-50")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {s.itemName}
                    {s.variantName !== "Regular" && <span className="text-muted"> · {s.variantName}</span>}
                  </span>
                  <span className="block text-xs text-muted">
                    {s.lines} ingredient{s.lines === 1 ? "" : "s"}
                  </span>
                </span>
                {copying === s.variantId && <Loader size="sm" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  );
}
