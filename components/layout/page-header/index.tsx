import BackArrow from "@/components/common/BackArrow";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Renders a back button; used on detail pages. */
  backHref?: string;
  /** Runs instead of navigating when the back arrow is tapped (unsaved-changes prompt). */
  onBack?: () => void;
  /** Right-hand slot for buttons or a badge. */
  actions?: React.ReactNode;
  /**
   * The screen's headline figure, shown large inside the dark canopy with the brand glow behind
   * it — the day's takings, how many items need buying. Subtitles truncate at `text-label`;
   * a number that matters belongs here instead.
   */
  hero?: React.ReactNode;
  className?: string;
}

/**
 * The dark canopy at the top of every screen.
 *
 * It carries the language of the sign-in screen inward: ink ground, a soft brand glow, and the
 * page content rising into it as a rounded sheet (see PageBody). That overlap replaced the 2px
 * yellow rule this header used to draw on all sixteen screens.
 */
export default function PageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  actions,
  hero,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn("sticky top-0 z-30 overflow-hidden bg-ink text-ink-foreground pt-safe", className)}
    >
      {/*
       * `page-gutter` is the same container the page body below uses, so the title sits directly
       * above the content it names. With a fixed 512px column the ink bar ran the full width of
       * a monitor while its contents floated in the middle of the screen.
       */}
      <div className="page-gutter relative">
        {hero && (
          // Anchored inside the container, not the full-bleed bar, so the glow stays behind the
          // hero figure instead of drifting to the far left of a wide screen.
          <div
            aria-hidden
            className="brand-glow pointer-events-none absolute -top-8 left-0 h-56 w-56 -translate-x-1/3"
          />
        )}
        <div className="relative flex h-header items-center gap-2">
          {backHref && <BackArrow href={backHref} onBack={onBack} className="-ml-2" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title">{title}</h1>
            {subtitle && <p className="truncate text-label text-ink-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {/* `relative`, or the absolutely-positioned glow above paints over the figures. */}
        {hero && <div className="relative pb-5">{hero}</div>}
      </div>
    </header>
  );
}
