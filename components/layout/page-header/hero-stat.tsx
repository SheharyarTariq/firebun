import { cn } from "@/utils/cn";

export interface HeroFigure {
  label: string;
  value: string;
  /** "brand" for the headline figure, "warning" for something that needs attention. */
  tone?: "default" | "brand" | "warning";
}

const TONE: Record<NonNullable<HeroFigure["tone"]>, string> = {
  default: "text-ink-foreground",
  brand: "text-brand",
  warning: "text-warning-bg",
};

/**
 * The figures a screen leads with, sized to be read at arm's length inside the dark canopy.
 *
 * These used to live in the header's subtitle, which is a single truncating `text-label` line —
 * Orders showed "3 paid · Rs 4,2…" with the day's takings cut in half.
 */
export default function HeroStat({ figures }: { figures: HeroFigure[] }) {
  return (
    <dl className="flex items-end gap-6">
      {figures.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="truncate text-caption uppercase text-ink-muted">{f.label}</dt>
          <dd className={cn("truncate text-display tabular-nums", TONE[f.tone ?? "default"])}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
