import { cn } from "@/utils/cn";

interface LoaderProps {
  size?: "sm" | "md";
  className?: string;
}

/** Three bouncing dots in the current text colour. */
export default function Loader({ size = "md", className }: LoaderProps) {
  const dot = cn(
    "rounded-full bg-current animate-bounce",
    size === "sm" ? "h-1.5 w-1.5" : "h-2.5 w-2.5"
  );

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center gap-1", className)}
    >
      <span className={cn(dot, "[animation-delay:-0.3s]")} />
      <span className={cn(dot, "[animation-delay:-0.15s]")} />
      <span className={dot} />
    </span>
  );
}
