"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Ellipsis,
  ReceiptText,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/db/schema/users";
import { cn } from "@/utils/cn";
import { routes } from "@/utils/routes";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const STAFF_ITEMS: NavItem[] = [
  { href: routes.ui.pos, label: "Counter", icon: ShoppingBag },
  { href: routes.ui.orders, label: "Orders", icon: ReceiptText },
  { href: routes.ui.expenses, label: "Expenses", icon: Wallet },
  { href: routes.ui.more, label: "More", icon: Ellipsis },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: routes.ui.pos, label: "Counter", icon: ShoppingBag },
  { href: routes.ui.orders, label: "Orders", icon: ReceiptText },
  { href: routes.ui.inventory, label: "Inventory", icon: Boxes },
  { href: routes.ui.menu, label: "Menu", icon: UtensilsCrossed },
  { href: routes.ui.more, label: "More", icon: Ellipsis },
];

interface BottomNavProps {
  role: UserRole;
  /** Small counters shown on a tab, keyed by href (e.g. items needing restock). */
  badges?: Partial<Record<string, number>>;
}

export default function BottomNav({ role, badges = {} }: BottomNavProps) {
  const pathname = usePathname();
  const items = role === "admin" ? ADMIN_ITEMS : STAFF_ITEMS;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-safe"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge = badges[item.href] ?? 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted transition-colors",
                  active && "text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-brand/25 text-brand-strong"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span
                      aria-label={`${badge} needing attention`}
                      className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white"
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
