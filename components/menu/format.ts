import { formatMoney } from "@/utils/helper";

/** "Rs 350" for a single price, "S 600 · M 999 · L 1,400" for sizes. */
export function summariseVariants(
  variants: { name: string; price: number; isActive: boolean }[]
): string {
  const active = variants.filter((v) => v.isActive);
  const list = active.length > 0 ? active : variants;
  if (list.length === 0) return "No price";
  if (list.length === 1) return formatMoney(list[0].price);
  return list.map((v) => `${v.name} ${formatMoney(v.price).replace("Rs ", "")}`).join(" · ");
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
