import Loader from "@/components/common/Loader";
import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "header";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  startIcon?: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-strong active:bg-brand-strong",
  secondary: "bg-ink text-ink-foreground hover:bg-ink/90 active:bg-ink/80",
  outline: "border border-border bg-surface text-foreground hover:bg-surface-2 active:bg-surface-2",
  ghost: "text-foreground hover:bg-surface-2 active:bg-surface-2",
  danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
  /** Ghost button for the dark page header. */
  header: "text-ink-foreground hover:bg-white/10 active:bg-white/10",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  // 36px to look, 44px to hit: the pseudo-element extends the tap area 4px above and below.
  sm: "relative h-9 gap-1.5 rounded-lg px-3 text-sm after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
  md: "h-11 gap-2 rounded-field px-4 text-sm",
  lg: "h-12 gap-2 rounded-field px-5 text-base",
  /** Icon-only button: a full 44px square target. Always pass an `aria-label`. */
  icon: "h-11 w-11 rounded-field p-0",
};

/** The only button used outside `components/common`. Minimum 44px tall for thumbs. */
export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  startIcon,
  className,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...props}
    >
      {isLoading ? <Loader size="sm" /> : startIcon}
      {children}
    </button>
  );
}
