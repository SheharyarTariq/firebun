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

export interface NavBadge {
  count: number;
  tone: "brand" | "warning" | "danger";
}

const COUNTER: NavItem = { href: routes.ui.pos, label: "Counter", icon: ShoppingBag };
const ORDERS: NavItem = { href: routes.ui.orders, label: "Orders", icon: ReceiptText };
const EXPENSES: NavItem = { href: routes.ui.expenses, label: "Expenses", icon: Wallet };
const INVENTORY: NavItem = { href: routes.ui.inventory, label: "Inventory", icon: Boxes };
const MENU: NavItem = { href: routes.ui.menu, label: "Menu", icon: UtensilsCrossed };
const MORE: NavItem = { href: routes.ui.more, label: "More", icon: Ellipsis };

/** Screens reached from More light up the More tab. */
const MORE_CHILDREN = [routes.ui.printer, routes.ui.finance, routes.ui.users, routes.ui.settings, routes.ui.expenses];

const BADGE_TONE: Record<NavBadge["tone"], string> = {
  brand: "bg-brand text-brand-ink",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
};

interface BottomNavProps {
  role: UserRole;
  /** Staff only see the Expenses tab when the admin lets them add expenses. */
  showExpenses: boolean;
  /** Small counters shown on a tab, keyed by href. */
  badges?: Partial<Record<string, NavBadge>>;
}

export default function BottomNav({ role, showExpenses, badges = {} }: BottomNavProps) {
  const pathname = usePathname();
  const items =
    role === "admin" ? [COUNTER, ORDERS, INVENTORY, MENU, MORE] : [COUNTER, ORDERS, ...(showExpenses ? [EXPENSES] : []), MORE];
  const hrefs = new Set(items.map((i) => i.href));

  const isActive = (item: NavItem) => {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
    // Anything not on the bar (finance, printer, expenses for admins…) belongs to More.
    return item.href === routes.ui.more && MORE_CHILDREN.some((h) => !hrefs.has(h) && (pathname === h || pathname.startsWith(`${h}/`)));
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-safe"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map((item) => {
          const active = isActive(item);
          const badge = badges[item.href];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-nav flex-col items-center justify-center gap-1 text-caption tracking-normal text-muted transition-colors",
                  active && "text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-brand/25 text-brand-text"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {badge && badge.count > 0 && (
                    <span
                      className={cn(
                        "absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-caption tracking-normal leading-none",
                        BADGE_TONE[badge.tone]
                      )}
                    >
                      {badge.count > 99 ? "99+" : badge.count}
                      <span className="sr-only"> needing attention</span>
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
