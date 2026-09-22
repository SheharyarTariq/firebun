import { cn } from "@/utils/cn";

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  neutral: "bg-muted-bg text-muted",
  brand: "bg-brand text-brand-ink",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

export default function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-caption tracking-normal whitespace-nowrap",
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    />
  );
}
