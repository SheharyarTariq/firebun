"use client";

/**
 * TEMPORARY — setup tool, remove before the shop goes live. See server/maintenance/clear-data.ts
 * for the full removal checklist.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";
import toast from "react-hot-toast";
import { clearDatabaseAction } from "@/app/(app)/more/danger-zone-actions";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import ConfirmSheet from "@/components/common/ConfirmSheet";
import Input from "@/components/common/Input";
import { useCart } from "@/components/pos/cart-store";
import { callAction } from "@/utils/call-action";
import { routes } from "@/utils/routes";

/** Must match the word the Server Action checks. */
const CONFIRMATION = "DELETE";

export default function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setConfirmation("");
  };

  const handleClear = () => {
    startTransition(async () => {
      const result = await callAction(clearDatabaseAction(confirmation));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // The saved cart may point at menu items that no longer exist.
      useCart.getState().clear();
      const { orders, menuItems, inventoryItems, expenses } = result.data;
      toast.success(
        `Database cleared — ${orders} order${orders === 1 ? "" : "s"}, ${menuItems} menu item${menuItems === 1 ? "" : "s"}, ${inventoryItems} inventory item${inventoryItems === 1 ? "" : "s"} and ${expenses} expense${expenses === 1 ? "" : "s"} removed`,
        { duration: 6000 }
      );
      close();
      router.push(routes.ui.pos);
    });
  };

  return (
    <>
      <Card className="space-y-3 border-danger/40 bg-danger-bg/30">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-danger">Danger zone</p>
            <p className="text-xs text-muted">
              Temporary setup tool — remove before the shop goes live. Empties orders, stock, the menu and expenses.
              Staff accounts and shop settings are kept.
            </p>
          </div>
        </div>
        <Button variant="danger" size="lg" className="w-full" startIcon={<Trash2 className="h-5 w-5" />} onClick={() => setOpen(true)}>
          Clear all data
        </Button>
      </Card>

      <ConfirmSheet
        open={open}
        onOpenChange={(next) => !next && close()}
        title="Clear the whole database?"
        description="Everything below is deleted for good. There is no undo and no backup."
        confirmLabel="Clear everything"
        destructive
        isLoading={isPending}
        confirmDisabled={confirmation.trim() !== CONFIRMATION}
        onConfirm={handleClear}
      >
        <div className="space-y-4">
          <ul className="space-y-1 rounded-field bg-danger-bg px-4 py-3 text-sm text-danger">
            <li>• All orders and their bills</li>
            <li>• All stock: items, purchases and the whole ledger</li>
            <li>• The entire menu: categories, items, sizes, recipes and deals</li>
            <li>• All expenses</li>
          </ul>
          <ul className="space-y-1 rounded-field bg-success-bg px-4 py-3 text-sm text-success">
            <li>• Staff accounts stay — everyone can still sign in</li>
            <li>• Shop settings stay (name, receipt, delivery charge)</li>
          </ul>
          <Input
            label={`Type ${CONFIRMATION} to confirm`}
            placeholder={CONFIRMATION}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            data-autofocus="true"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
      </ConfirmSheet>
    </>
  );
}
