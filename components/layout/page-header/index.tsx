import BackArrow from "@/components/common/BackArrow";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Renders a back button; used on detail pages. */
  backHref?: string;
  /** Right-hand slot for buttons or a badge. */
  actions?: React.ReactNode;
  className?: string;
}

/** Sticky dark brand header used at the top of every screen. */
export default function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-ink px-4 text-ink-foreground pt-safe",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2">
        {backHref && <BackArrow href={backHref} className="-ml-2" />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-ink-muted">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {/* Thin yellow→orange rule from the printed menu board. */}
      <div aria-hidden className="-mx-4 h-0.5 bg-gradient-to-r from-brand via-brand-strong to-brand" />
    </header>
  );
}
