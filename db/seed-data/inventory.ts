/**
 * Starting inventory as bought by the shop (September 2026), one pack of each as opening
 * stock. Pack price sets the cost basis (pack price ÷ pack size). Prices in PKR.
 * The owner sets low-stock limits himself, so none are seeded.
 */
import type { BaseUnit, DisplayUnit } from "@/utils/helper";

export interface SeedInventoryItem {
  name: string;
  baseUnit: BaseUnit;
  displayUnit: DisplayUnit;
  packLabel: string;
  /** In the display unit (2 kg, 12 L, 50 pcs). */
  packSize: number;
  packPrice: number;
}

const weight = (
  name: string,
  packLabel: string,
  packSizeKg: number,
  packPrice: number
): SeedInventoryItem => ({
  name,
  baseUnit: "g",
  displayUnit: "kg",
  packLabel,
  packSize: packSizeKg,
  packPrice,
});

const pieces = (
  name: string,
  packLabel: string,
  packSize: number,
  packPrice: number
): SeedInventoryItem => ({
  name,
  baseUnit: "pcs",
  displayUnit: "pcs",
  packLabel,
  packSize,
  packPrice,
});

export const INVENTORY_ITEMS: SeedInventoryItem[] = [
  // Dairy & frozen
  weight("Cheese (Ambrosia)", "block", 2, 2800),
  weight("Cheese (Al Noor)", "block", 2, 2400),
  weight("Fries (Panda)", "packet", 2, 800),
  weight("Fries (Mack)", "packet", 2.5, 1025),
  pieces("Nuggets", "packet", 45, 995),
  pieces("Chicken Wings", "packet", 50, 1113),
  {
    // Carton of 12 × 1 L; shakes use ~100 ml each, so milk is tracked by volume.
    name: "Milk (Nurpur)",
    baseUnit: "ml",
    displayUnit: "L",
    packLabel: "carton",
    packSize: 12,
    packPrice: 3690,
  },
  pieces("Jumbo Patty", "packet", 8, 995),
  // Owner wrote "zinger thai" — read as thigh; rename in Inventory if wrong.
  pieces("Zinger Thigh", "packet", 20, 2730),
  pieces("Seekh Kabab", "packet", 12, 500),
  pieces("Plain Paratha", "packet", 30, 1100),
  pieces("Chicken Pieces", "packet", 16, 1880),

  // Sauces (cartons of tubs; sizes confirmed by the owner)
  weight("Mayonnaise (Wrada Real)", "carton", 16, 10200), // 4 × 4 kg
  weight("Mayonnaise (Delish Classic)", "carton", 16, 6050), // 4 × 4 kg
  weight("Dressing (Young's)", "bottle", 2, 650),
  weight("Mayonnaise (Besto)", "carton", 15, 1500), // 3 × 5 kg

  // Bread
  pieces("Burger Bun (Harvest)", "packet", 2, 77),
  pieces("Mighty Bun (Dawn)", "packet", 2, 115),
  pieces("Royal Bun (Dawn)", "packet", 2, 95),
  pieces("Burger Bun (Dawn)", "packet", 2, 80),
  pieces("Shawarma Bread Large", "packet", 4, 110),
  pieces("Shawarma Bread Small", "packet", 5, 110),
  pieces("Tortilla (Golden Leaf)", "packet", 8, 300),

  // Drinks (bottles)
  pieces("7up 1 L (Next)", "pack", 6, 750),
  pieces("Pepsi 1 L (Next)", "pack", 6, 750),
  pieces("Aquafina 1.5 L", "pack", 6, 490),
  pieces("Aquafina 500 ml", "pack", 12, 500),
];
