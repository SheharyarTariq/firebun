import { cn } from "@/utils/cn";

interface PageBodyProps {
  children: React.ReactNode;
  /**
   * Vertical rhythm between direct children. 3 for lists and dense screens, 4 where the page is
   * a handful of distinct blocks.
   */
  gap?: 3 | 4;
  /** Extra classes for the padded inner column (e.g. `pb-28` to clear a floating bar). */
  className?: string;
}

/**
 * The light sheet the page content sits on, rising into the dark canopy above it.
 *
 * The outer ink layer is only ever visible through the two top corners — that notch is what
 * makes the header read as a canopy the page is tucked under, rather than a black strip sitting
 * on top of it. It scrolls away with the content, exactly like the sign-in form sheet.
 *
 * The inner column uses `page-gutter`, the same container the canopy and the floating bars use,
 * so everything on a screen shares one set of margins at every width.
 */
export default function PageBody({ children, gap = 3, className }: PageBodyProps) {
  return (
    <div className="flex flex-1 flex-col bg-ink">
      <div className="flex flex-1 flex-col rounded-t-[1.25rem] bg-background">
        <div className={cn("page-gutter py-4", gap === 4 ? "space-y-4" : "space-y-3", className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
