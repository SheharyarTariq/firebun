import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/utils/cn";

interface ListRowProps {
  /** Navigates (a `Link`). Give `href` or `onClick`; with neither it is a plain row. */
  href?: string;
  /** Opens something in place (a `button`). */
  onClick?: () => void;
  disabled?: boolean;
  /** Tighter rows (`py-3`) for lists with a lot of lines. */
  dense?: boolean;
  /**
   * The cue that a row is tappable: a chevron when it goes somewhere else, a pencil when it opens
   * an editor here. Anything else is rendered as given (e.g. a badge plus chevron).
   */
  trailing?: "chevron" | "pencil" | React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const ICON = "h-4 w-4 shrink-0 text-muted";

/**
 * One row of a list inside `<Card className="divide-y divide-border p-0">`. Keeps the padding, the
 * pressed state and the trailing chevron/pencil the same on every screen.
 */
export default function ListRow({ href, onClick, disabled, dense = false, trailing, className, children }: ListRowProps) {
  const base = cn("flex w-full items-center gap-3 px-4 text-left transition-colors", dense ? "py-3" : "py-3.5", className);
  const end =
    trailing === "chevron" ? <ChevronRight aria-hidden className={ICON} /> : trailing === "pencil" ? <Pencil aria-hidden className={ICON} /> : trailing;

  if (href) {
    return (
      <Link href={href} className={cn(base, "active:bg-surface-2")}>
        {children}
        {end}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" disabled={disabled} onClick={onClick} className={cn(base, "enabled:active:bg-surface-2")}>
        {children}
        {end}
      </button>
    );
  }
  return (
    <div className={base}>
      {children}
      {end}
    </div>
  );
}
