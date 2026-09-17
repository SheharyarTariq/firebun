import BottomNav from "@/components/layout/bottom-nav";
import { getCurrentUser } from "@/server/auth/dal";
import { countNeededItems } from "@/server/inventory/queries";
import { countPendingOrders } from "@/server/orders/queries";
import { routes } from "@/utils/routes";

/** App shell for signed-in users: page content plus the bottom tab bar. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const [neededCount, pendingCount] = await Promise.all([
    user.role === "admin" ? countNeededItems() : Promise.resolve(0),
    countPendingOrders(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav
        role={user.role}
        badges={{ [routes.ui.inventory]: neededCount, [routes.ui.orders]: pendingCount }}
      />
    </div>
  );
}
