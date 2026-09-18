import { Suspense } from "react";
import FinanceShell from "@/components/finance";
import { getTodayBusinessDate } from "@/server/settings/queries";

/** Header + period picker persist here; the page underneath swaps per period. */
export default async function FinanceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const today = await getTodayBusinessDate();
  return (
    <Suspense>
      <FinanceShell today={today}>{children}</FinanceShell>
    </Suspense>
  );
}
