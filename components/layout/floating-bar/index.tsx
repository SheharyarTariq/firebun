import { cn } from "@/utils/cn";

interface FloatingBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A bar pinned just above the bottom tab bar: the POS cart bar, the order-placed strip, the
 * settings save button, the order-detail actions.
 *
 * All four wrote out the same positioning by hand, down to the byte, each with its own `4.25rem`
 * literal for the nav height and its own 512px cap — which on a wide screen left the POS with a
 * narrow pill floating under a much wider grid, aligned to neither edge. They now share this
 * container, so a bar always lines up with the content above it.
 */
export default function FloatingBar({ children, className }: FloatingBarProps) {
  return (
    <div className="bottom-nav-offset pointer-events-none fixed inset-x-0 z-30 pb-2">
      <div className={cn("page-gutter pointer-events-auto", className)}>{children}</div>
    </div>
  );
}
