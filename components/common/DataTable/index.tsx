import Link from "next/link";
import { cn } from "@/utils/cn";

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Numbers go right so their digits line up. */
  align?: "left" | "right";
  /** Hidden on phones; the table keeps only the columns a counter glance needs. */
  desktopOnly?: boolean;
  /** Content for this column in the totals row. */
  footer?: React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Makes the whole row a link (order details, the inventory item…). */
  rowHref?: (row: T) => string;
  /** Muted or struck-through rows (cancelled orders, voided purchases). */
  rowClassName?: (row: T) => string | undefined;
  /** Read by screen readers as the table's name. */
  caption: string;
  className?: string;
}

/**
 * A plain, server-rendered table for reading records (the Finance tabs).
 *
 * Phones get the columns marked essential and nothing else, so a row never scrolls sideways at
 * 360px; `desktopOnly` columns appear from `md`. The wrapper still scrolls horizontally as a
 * last resort for a very long value rather than breaking the page width.
 */
export default function DataTable<T>({ columns, rows, rowKey, rowHref, rowClassName, caption, className }: DataTableProps<T>) {
  const hasFooter = columns.some((c) => c.footer !== undefined);
  const hide = (c: DataColumn<T>) => (c.desktopOnly ? "hidden md:table-cell" : undefined);
  const align = (c: DataColumn<T>) => (c.align === "right" ? "text-right" : "text-left");

  return (
    <div className={cn("overflow-x-auto rounded-card bg-surface shadow-1", className)}>
      <table className="w-full border-collapse text-body">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn("px-3 py-2.5 text-caption whitespace-nowrap uppercase text-muted first:pl-4 last:pr-4", align(c), hide(c))}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={rowKey(row)}
                // `relative` anchors the stretched link below, so the whole row is the tap target.
                className={cn("relative align-top", href && "active:bg-surface-2 md:hover:bg-surface-2", rowClassName?.(row))}
              >
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("px-3 py-3 first:pl-4 last:pr-4", align(c), hide(c), c.className)}>
                    {i === 0 && href ? (
                      <Link href={href} className="after:absolute after:inset-0 after:content-['']">
                        {c.cell(row)}
                      </Link>
                    ) : (
                      c.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {hasFooter && (
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-2/60 font-semibold">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-3 whitespace-nowrap first:pl-4 last:pr-4", align(c), hide(c))}>
                  {c.footer}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
