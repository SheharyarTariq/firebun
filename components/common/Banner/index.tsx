import { ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

type BannerTone = "danger" | "warning" | "success" | "info" | "brand";

const TONE_STYLES: Record<BannerTone, string> = {
  danger: "rounded-field bg-danger-bg text-danger",
  warning: "rounded-field bg-warning-bg text-warning",
  success: "rounded-field bg-success-bg text-success",
  info: "rounded-field bg-info-bg text-info",
  brand: "rounded-card border border-brand/50 bg-brand/10",
};

interface BannerProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onClick"> {
  tone: BannerTone;
  /** Slimmer padding for one-line strips. */
  compact?: boolean;
  /** Brand tile on the left (a lucide icon); pairs with `title`. */
  icon?: React.ReactNode;
  /** Bold first line; `children` then becomes the smaller description under it. */
  title?: string;
  /** Makes the whole banner a button with a trailing chevron ("tap to see which"). */
  onClick?: () => void;
}

/**
 * A coloured strip for notices and errors inside a screen or sheet. With `onClick` it is a
 * tappable call to action and shows a chevron so it reads as one.
 */
export default function Banner({ tone, compact = false, icon, title, onClick, className, children, ...props }: BannerProps) {
  const base = cn(TONE_STYLES[tone], compact ? "px-4 py-2.5 text-sm" : "px-4 py-3 text-sm");

  if (!onClick) {
    return (
      <div className={cn(base, className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center text-left transition-colors",
        icon ? "gap-3" : "gap-2",
        base,
        tone === "brand" && "active:bg-brand/20",
        className
      )}
      {...props}
    >
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        {title && <span className="block text-sm font-semibold">{title}</span>}
        {title ? <span className="block text-xs text-muted">{children}</span> : children}
      </span>
      <ChevronRight aria-hidden className={cn("h-4 w-4 shrink-0", tone === "brand" && "text-muted")} />
    </button>
  );
}
