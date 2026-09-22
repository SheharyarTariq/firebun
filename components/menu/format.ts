import { formatMoney } from "@/utils/helper";

/**
 * "Rs 350" for a single price, "Rs 999 – 1,800" across sizes.
 *
 * This used to list every size ("S 999 · M 1,450 · L 1,600 · XL 1,800 · Family 2,200"), which
 * truncated mid-number on a phone and so told you less than the range does. The per-size prices
 * are one tap away on the item screen.
 */
export function summariseVariants(
  variants: { name: string; price: number; isActive: boolean }[]
): string {
  const active = variants.filter((v) => v.isActive);
  const list = active.length > 0 ? active : variants;
  if (list.length === 0) return "No price";
  if (list.length === 1) return formatMoney(list[0].price);
  const prices = list.map((v) => v.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  if (low === high) return `${formatMoney(low)} · ${list.length} sizes`;
  return `${formatMoney(low)} – ${formatMoney(high).replace("Rs ", "")}`;
}

export interface CostEstimate {
  /** Ingredient cost for one unit, or null when there is no recipe. */
  cost: number | null;
  /** false when at least one ingredient has no cost yet. */
  complete: boolean;
  lines: number;
}

export function estimateCost(
  recipes: { quantity: number; inventoryItem: { avgCost: number | null } }[]
): CostEstimate {
  if (recipes.length === 0) return { cost: null, complete: true, lines: 0 };
  let cost = 0;
  let complete = true;
  for (const line of recipes) {
    if (line.inventoryItem.avgCost === null) {
      complete = false;
      continue;
    }
    cost += line.quantity * line.inventoryItem.avgCost;
  }
  return { cost, complete, lines: recipes.length };
}

export function marginPct(price: number, cost: number): number | null {
  if (price <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
}
