import { Download } from "lucide-react";
import Card from "@/components/common/Card";
import type { FinanceDataset } from "@/server/finance/exports";
import type { DateRange } from "@/utils/helper";
import { routes } from "@/utils/routes";

interface DatasetHeaderProps {
  type: FinanceDataset;
  range: DateRange;
  /** The headline figure for the period, e.g. "Rs 4,437". */
  value: string;
  /** What the figure is and how many rows are behind it. */
  label: string;
  /** Extra detail under the label ("2 unpaid · 1 cancelled"). */
  meta?: string;
}

/** The period's total for one tab, with the CSV of exactly these rows beside it. */
export default function DatasetHeader({ type, range, value, label, meta }: DatasetHeaderProps) {
  return (
    <Card className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-label text-muted">{label}</p>
        {meta && <p className="text-label text-muted">{meta}</p>}
      </div>
      {/* A plain link: the browser downloads the file, no client JS needed. */}
      <a
        href={routes.api.financeExport(type, range.from, range.to)}
        download
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-field border border-border bg-surface px-4 text-body font-semibold transition-[background-color,transform] active:scale-[0.98] active:bg-surface-2 md:hover:bg-surface-2"
      >
        <Download className="h-4 w-4" />
        CSV
      </a>
    </Card>
  );
}
