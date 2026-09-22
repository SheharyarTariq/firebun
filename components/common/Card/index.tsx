import { cn } from "@/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 1 (default) sits on the page — lists, forms, most things.
   * 2 lifts off it — a summary a screen is built around, or a card stacked on another card.
   */
  elevation?: 1 | 2;
}

const ELEVATION: Record<NonNullable<CardProps["elevation"]>, string> = {
  1: "bg-surface shadow-1",
  2: "bg-surface-raised shadow-2",
};

/**
 * Surface container. Pass `p-0` and your own padding for list-style cards.
 *
 * Depth, not a border, is what separates a card from the page — a 1px outline on every surface
 * made them all read the same. `border-border` is for dividers inside a card (`divide-y`) and
 * for form fields.
 */
export default function Card({ className, elevation = 1, ...props }: CardProps) {
  return <div className={cn("rounded-card p-4", ELEVATION[elevation], className)} {...props} />;
}
