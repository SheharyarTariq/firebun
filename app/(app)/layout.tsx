import BottomNav, { type NavBadge } from "@/components/layout/bottom-nav";
import OfflineBanner from "@/components/layout/offline-banner";
import { getCurrentUser } from "@/server/auth/dal";
import { countInventoryAttention } from "@/server/inventory/queries";
import { countItemsWithoutRecipe } from "@/server/menu/queries";
import { countPendingOrders } from "@/server/orders/queries";
import { getSettings } from "@/server/settings/queries";
import { routes } from "@/utils/routes";

/** App shell for signed-in users: page content plus the bottom tab bar. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // One round trip for everything the shell needs; the inventory count is cheap enough to
  // run for staff too rather than waiting on the role first.
  const [user, settings, pendingCount, attention, missingRecipes] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    countPendingOrders(),
    countInventoryAttention(),
    countItemsWithoutRecipe(),
  ]);

  const badges: Partial<Record<string, NavBadge>> = {
    // Unpaid deliveries are normal business, so the badge is brand-coloured, not red.
    [routes.ui.orders]: { count: pendingCount, tone: "brand" },
  };
  if (user.role === "admin") {
    badges[routes.ui.inventory] = {
      count: attention.needed + attention.negative,
      // Red only when a ledger went negative (a count is overdue); low stock is a warning.
      tone: attention.negative > 0 ? "danger" : "warning",
    };
    // Items without a recipe sell without deducting stock — worth a nudge until done.
    badges[routes.ui.menu] = { count: missingRecipes, tone: "warning" };
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <div className="flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav role={user.role} showExpenses={user.role === "admin" || settings.staffCanAddExpenses} badges={badges} />
    </div>
  );
}
