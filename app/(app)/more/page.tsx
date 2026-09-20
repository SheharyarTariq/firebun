import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Printer,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/app/actions";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import PageHeader from "@/components/layout/page-header";
import ChangePasswordSheet from "@/components/more/change-password-sheet";
import DangerZone from "@/components/more/danger-zone";
import SignOutButton from "@/components/more/sign-out-button";
import InstallCard from "@/components/pwa/install-card";
import { config } from "@/config";
import { getCurrentUser } from "@/server/auth/dal";
import { getTodaySnapshot } from "@/server/finance/queries";
import { getTodayBusinessDate } from "@/server/settings/queries";
import { formatMoney } from "@/utils/helper";
import { routes } from "@/utils/routes";

export const metadata: Metadata = { title: "More" };

interface MoreLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ADMIN_LINKS: MoreLink[] = [
  {
    href: routes.ui.finance,
    label: "Finance",
    description: "Income, spend and profit by period",
    icon: TrendingUp,
  },
  {
    href: routes.ui.expenses,
    label: "Expenses",
    description: "Rent, bills, salaries and other spend",
    icon: Wallet,
  },
  {
    href: routes.ui.users,
    label: "Staff accounts",
    description: "Add staff, reset passwords, deactivate",
    icon: Users,
  },
  {
    href: routes.ui.settings,
    label: "Shop settings & printer",
    description: "Delivery charge, receipt, printer",
    icon: Settings,
  },
];

const COMMON_LINKS: MoreLink[] = [
  {
    href: routes.ui.printer,
    label: "Printer",
    description: "Choose how this phone prints bills, test print",
    icon: Printer,
  },
];

export default async function MorePage() {
  const user = await getCurrentUser();
  const today = user.role === "admin" ? await getTodaySnapshot(await getTodayBusinessDate()) : null;
  const links = user.role === "admin" ? [...ADMIN_LINKS, ...COMMON_LINKS] : COMMON_LINKS;
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <PageHeader title="More" />
      <div className="space-y-4 p-4">
        <Card className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/25 text-base font-semibold text-brand-text">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          <Badge variant={user.role === "admin" ? "brand" : "neutral"}>
            {user.role === "admin" ? "Admin" : "Staff"}
          </Badge>
        </Card>

        {today && (
          <Link href={routes.ui.finance} className="block rounded-card bg-ink p-4 text-ink-foreground shadow-md transition-transform active:scale-[0.99]">
            <span className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Today</span>
              <span className="flex items-center gap-1 text-xs text-ink-muted">
                Finance <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </span>
            <span className="mt-2 grid grid-cols-2 gap-3">
              <span>
                <span className="block text-2xl font-bold tabular-nums text-brand">{formatMoney(today.income)}</span>
                <span className="block text-xs text-ink-muted">
                  {today.orders} paid order{today.orders === 1 ? "" : "s"}
                </span>
              </span>
              <span>
                <span className="block text-2xl font-bold tabular-nums">{formatMoney(today.profit)}</span>
                <span className="block text-xs text-ink-muted">profit (est.)</span>
              </span>
            </span>
            {today.pendingOrders > 0 && (
              <span className="mt-2 block text-xs text-warning-bg">
                {today.pendingOrders} delivery order{today.pendingOrders === 1 ? "" : "s"} unpaid · {formatMoney(today.pendingAmount)}
              </span>
            )}
          </Link>
        )}

        <InstallCard />

        {links.length > 0 && (
          <Card className="divide-y divide-border p-0">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface-2"
              >
                <link.icon className="h-5 w-5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{link.label}</p>
                  <p className="truncate text-xs text-muted">{link.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </Card>
        )}

        <div className="space-y-2">
          <ChangePasswordSheet />
          <form action={signOutAction}>
            <SignOutButton />
          </form>
        </div>

        {/* TEMPORARY — setup tool; see server/maintenance/clear-data.ts to remove it. */}
        {user.role === "admin" && <DangerZone />}

        <p className="text-center text-xs text-muted">{config.appName} · v0.1</p>
      </div>
    </>
  );
}
