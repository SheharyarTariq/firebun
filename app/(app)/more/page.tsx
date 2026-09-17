import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  LogOut,
  Printer,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/app/actions";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import PageHeader from "@/components/layout/page-header";
import ChangePasswordSheet from "@/components/more/change-password-sheet";
import { config } from "@/config";
import { getCurrentUser } from "@/server/auth/dal";
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
  const links = [...COMMON_LINKS, ...(user.role === "admin" ? ADMIN_LINKS : [])];
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/25 text-base font-semibold text-brand-strong">
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
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              startIcon={<LogOut className="h-4 w-4" />}
            >
              Sign out
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted">{config.appName} · v0.1</p>
      </div>
    </>
  );
}
