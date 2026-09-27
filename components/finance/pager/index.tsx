import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { periodSearch, type DateRange, type PeriodPreset } from "@/utils/helper";

interface PagerProps {
  basePath: string;
  preset: PeriodPreset;
  range: DateRange;
  page: number;
  pageSize: number;
  total: number;
}

/** "51–100 of 163" with Previous / Next links that keep the period. Hidden when one page holds everything. */
export default function Pager({ basePath, preset, range, page, pageSize, total }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1 && page <= 1) return null;

  const href = (p: number) => `${basePath}${periodSearch(preset, range, p > 1 ? { page: String(p) } : undefined)}`;
  const first = Math.min(total, (page - 1) * pageSize + 1);
  const last = Math.min(total, page * pageSize);

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <PagerLink href={page > 1 ? href(Math.min(page - 1, pages)) : undefined} label="Previous">
        <ChevronLeft className="h-4 w-4" /> Previous
      </PagerLink>
      <span className="text-label text-muted tabular-nums">
        {page > pages ? `Page ${page} is empty` : `${first}–${last} of ${total}`}
      </span>
      <PagerLink href={page < pages ? href(page + 1) : undefined} label="Next">
        Next <ChevronRight className="h-4 w-4" />
      </PagerLink>
    </nav>
  );
}

function PagerLink({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  const className = "inline-flex h-11 items-center gap-1 rounded-field border border-border bg-surface px-3 text-label font-semibold";
  if (!href) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(className, "opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(className, "active:bg-surface-2 md:hover:bg-surface-2")}>
      {children}
    </Link>
  );
}
