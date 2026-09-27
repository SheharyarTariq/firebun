import Link from "next/link";
import { cn } from "@/utils/cn";

export interface TabLink {
  href: string;
  label: string;
  active: boolean;
}

interface TabLinksProps extends React.HTMLAttributes<HTMLElement> {
  tabs: TabLink[];
}

/**
 * A segmented row of links for switching between views of one screen (Finance: Summary /
 * Orders / Purchases / Expenses). Links, not `Chips`: each view is its own URL, so back,
 * reload and sharing all land on the same tab.
 *
 * Deliberately not chip-shaped — the period chips sit right above it, and two rows of identical
 * pills read as one long filter.
 */
export default function TabLinks({ tabs, className, ...props }: TabLinksProps) {
  return (
    <nav className={cn("flex rounded-field bg-muted-bg p-1 lg:max-w-xl", className)} {...props}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg px-2 text-label transition-colors",
            tab.active ? "bg-surface text-foreground shadow-1" : "text-muted active:bg-surface/60"
          )}
        >
          <span className="truncate">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
