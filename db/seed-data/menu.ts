/**
 * The Fire Bun menu as printed (docs/raw/IMG_8577.HEIC, IMG_8578.HEIC), September 2026.
 * Prices in PKR. Lines marked CONFIRM were hard to read on the photo or are not on
 * the printed menu at all and must be checked with the owner.
 */

export interface SeedVariant {
  name: string;
  price: number;
}

export interface SeedItem {
  name: string;
  description?: string;
  variants: SeedVariant[];
}

export interface SeedCategory {
  name: string;
  items: SeedItem[];
}

export type SeedSlotOption =
  /** One specific item; `variant` defaults to the item's only variant. */
  | { item: string; variant?: string }
  /** Every item in a category that has a variant with this name (e.g. all "M" pizzas). */
  | { category: string; variant: string };

export interface SeedDealSlot {
  label: string;
  quantity: number;
  options: SeedSlotOption[];
}

export interface SeedDeal {
  name: string;
  price: number;
  description: string;
  slots: SeedDealSlot[];
}

const single = (name: string, price: number, description?: string): SeedItem => ({
  name,
  description,
  variants: [{ name: "Regular", price }],
});

const sized = (name: string, prices: Record<string, number>): SeedItem => ({
  name,
  variants: Object.entries(prices).map(([variant, price]) => ({ name: variant, price })),
});

const PIZZA = { S: 600, M: 999, L: 1400, XL: 1850 };
const SPECIAL_PIZZA = { S: 700, M: 1150, L: 1550, XL: 2000 };

export const MENU_CATEGORIES: SeedCategory[] = [
  {
    name: "Pizza",
    items: [
      sized("Chicken Tikka Pizza", PIZZA),
      sized("Fajita Pizza", PIZZA),
      sized("BBQ Pizza", PIZZA),
      sized("Achari Pizza", PIZZA),
      sized("Vegetable Pizza", PIZZA),
      sized("Zinger Pizza", PIZZA),
      sized("Cheese Lover Pizza", PIZZA),
      sized("Hot & Spicy Pizza", PIZZA),
    ],
  },
  {
    name: "Special Pizza",
    items: [
      sized("Fire Bun Special Pizza", { S: 700, M: 1200, L: 1600, XL: 2100 }),
      sized("Kebab Crust Pizza", SPECIAL_PIZZA),
      sized("Chicken Crust Pizza", SPECIAL_PIZZA),
      sized("Chicken Stuff Pizza", SPECIAL_PIZZA),
      sized("Cheese Crust Pizza", SPECIAL_PIZZA),
      sized("Lasania Pizza", SPECIAL_PIZZA),
      sized("Malai Boti Pizza", SPECIAL_PIZZA),
    ],
  },
  {
    name: "Burgers",
    items: [
      single("Fire Bun Fillet Burger", 600),
      single("Zinger Cheese Burger", 400),
      single("Petty Burger", 300),
      single("Double Petty Burger", 500),
      single("Zinger Burger", 350),
      single("Thunder Zinger Burger", 520),
      single("Petty Cheese Burger", 350),
    ],
  },
  {
    name: "Wings & Nuggets",
    items: [
      single("Hot Wings (5 pc)", 400),
      single("BBQ Wings (5 pc)", 440),
      single("Oven Baked Wings (5 pc)", 400),
      single("Nuggets (6 pc)", 300),
      single("Chicken Piece (2 pc)", 300),
    ],
  },
  {
    name: "Fries",
    items: [
      sized("Fries", { S: 250, L: 300 }),
      sized("Loaded Fries", { S: 350, L: 500 }),
      // CONFIRM: photo reads 300 / 250 (L cheaper than S) — assumed 300 / 350.
      sized("Mayo Garlic Fries", { S: 300, L: 350 }),
      sized("Pizza Fries", { S: 350, L: 500 }),
    ],
  },
  {
    name: "Shawarma & Rolls",
    items: [
      sized("Chicken Shawarma", { Small: 150, Large: 180 }),
      single("Chicken Cheese Shawarma", 230),
      single("Zinger Shawarma", 300),
      single("Zinger Cheese Shawarma", 350),
      single("Zinger Cheese Roll", 400),
      single("Zinger Paratha Roll", 350),
      single("Chicken Paratha Roll", 300),
      single("Chicken Cheese Paratha Roll", 350),
      single("Kabab Paratha Roll", 330),
    ],
  },
  {
    name: "Wraps",
    items: [
      single("Fire Bun Wrap", 600),
      single("Zinger Tortilla Wrap", 450),
      single("Chicken Tortilla Wrap", 400),
      single("Arabic Wrap", 450),
    ],
  },
  {
    name: "Pasta & Salad",
    items: [
      single("Cheddar Melt Pasta", 600),
      single("Cheesy Lazania Pasta", 700),
      single("Crispy Crunch Pasta", 550),
      single("Russian Salad", 600),
    ],
  },
  {
    name: "Shakes & Fresh Juice",
    items: [
      sized("Mango", { S: 170, L: 200 }),
      sized("Banana", { S: 170, L: 200 }),
      sized("Apple", { S: 170, L: 200 }),
      sized("Pineapple", { S: 250, L: 300 }),
      sized("Strawberry", { S: 170, L: 200 }),
      sized("Date & Banana", { S: 170, L: 250 }),
      single("Falsa", 250),
      single("Peach", 200),
      sized("Orange", { S: 170, L: 200 }),
      single("Carrot", 150),
      single("Oreo Shake", 250),
      sized("Blueberry", { S: 170, L: 200 }),
      sized("Mint Margarita", { S: 170, L: 200 }),
    ],
  },
  {
    name: "Extras",
    items: [
      single("Dip Mayo", 70),
      sized("Extra Topping", { S: 100, M: 150, L: 200, XL: 250 }),
    ],
  },
  {
    // CONFIRM: drinks are not on the printed menu but every deal includes one.
    // Prices below are placeholders — edit them in Menu → Drinks.
    name: "Drinks",
    items: [
      sized("Coca-Cola", { Regular: 80, "1 Litre": 150, "1.5 Litre": 200 }),
      sized("Sprite", { Regular: 80, "1 Litre": 150, "1.5 Litre": 200 }),
      sized("Fanta", { Regular: 80, "1 Litre": 150, "1.5 Litre": 200 }),
    ],
  },
];

export const DEALS_CATEGORY = "Deals";

const regularDrink: SeedSlotOption[] = [
  { item: "Coca-Cola", variant: "Regular" },
  { item: "Sprite", variant: "Regular" },
  { item: "Fanta", variant: "Regular" },
];
const litreDrink: SeedSlotOption[] = [
  { item: "Coca-Cola", variant: "1 Litre" },
  { item: "Sprite", variant: "1 Litre" },
  { item: "Fanta", variant: "1 Litre" },
];
const bigDrink: SeedSlotOption[] = [
  { item: "Coca-Cola", variant: "1.5 Litre" },
  { item: "Sprite", variant: "1.5 Litre" },
  { item: "Fanta", variant: "1.5 Litre" },
];
const anyPizza = (variant: string): SeedSlotOption[] => [
  { category: "Pizza", variant },
];

export const DEALS: SeedDeal[] = [
  {
    name: "Deal 1",
    price: 580,
    description: "1 Zinger Burger, 1 Regular Fries, 1 Regular Drink",
    slots: [
      { label: "Zinger Burger", quantity: 1, options: [{ item: "Zinger Burger" }] },
      { label: "Regular Fries", quantity: 1, options: [{ item: "Fries", variant: "S" }] },
      { label: "Regular Drink", quantity: 1, options: regularDrink },
    ],
  },
  {
    name: "Deal 2",
    price: 1100,
    description: "2 Zinger Burgers, 1 Small Shawarma, 1 Regular Fries, 2 Regular Drinks",
    slots: [
      { label: "Zinger Burger", quantity: 2, options: [{ item: "Zinger Burger" }] },
      {
        label: "Small Shawarma",
        quantity: 1,
        options: [{ item: "Chicken Shawarma", variant: "Small" }],
      },
      { label: "Regular Fries", quantity: 1, options: [{ item: "Fries", variant: "S" }] },
      { label: "Regular Drink", quantity: 2, options: regularDrink },
    ],
  },
  {
    name: "Deal 3",
    price: 800,
    description: "1 Small Pizza, 1 Regular Fries, 1 Regular Drink",
    slots: [
      { label: "Small Pizza", quantity: 1, options: anyPizza("S") },
      { label: "Regular Fries", quantity: 1, options: [{ item: "Fries", variant: "S" }] },
      { label: "Regular Drink", quantity: 1, options: regularDrink },
    ],
  },
  {
    name: "Deal 4",
    price: 950,
    description: "3 Large Shawarma, 5 Wings, 1 Litre Drink",
    slots: [
      {
        label: "Large Shawarma",
        quantity: 3,
        options: [{ item: "Chicken Shawarma", variant: "Large" }],
      },
      {
        label: "Wings (5 pc)",
        quantity: 1,
        options: [
          { item: "Hot Wings (5 pc)" },
          { item: "BBQ Wings (5 pc)" },
          { item: "Oven Baked Wings (5 pc)" },
        ],
      },
      { label: "1 Litre Drink", quantity: 1, options: litreDrink },
    ],
  },
  {
    name: "Deal 5",
    price: 3000,
    description: "2 Medium Pizza, 2 Large Shawarma, 1 Fries, 1.5 Litre Drink",
    slots: [
      { label: "Medium Pizza", quantity: 2, options: anyPizza("M") },
      {
        label: "Large Shawarma",
        quantity: 2,
        options: [{ item: "Chicken Shawarma", variant: "Large" }],
      },
      { label: "Fries", quantity: 1, options: [{ item: "Fries", variant: "S" }] },
      { label: "1.5 Litre Drink", quantity: 1, options: bigDrink },
    ],
  },
  {
    name: "Deal 6",
    price: 1799,
    description: "2 Small Pizza, 1 Zinger Burger, 1 Petty Burger, 1 Litre Drink",
    slots: [
      { label: "Small Pizza", quantity: 2, options: anyPizza("S") },
      { label: "Zinger Burger", quantity: 1, options: [{ item: "Zinger Burger" }] },
      { label: "Petty Burger", quantity: 1, options: [{ item: "Petty Burger" }] },
      { label: "1 Litre Drink", quantity: 1, options: litreDrink },
    ],
  },
  {
    name: "Deal 7",
    price: 1499,
    description: "2 Fire Bun Burgers, 1 Fire Bun Wrap, 1 Litre Drink",
    slots: [
      {
        label: "Fire Bun Fillet Burger",
        quantity: 2,
        options: [{ item: "Fire Bun Fillet Burger" }],
      },
      { label: "Fire Bun Wrap", quantity: 1, options: [{ item: "Fire Bun Wrap" }] },
      { label: "1 Litre Drink", quantity: 1, options: litreDrink },
    ],
  },
  {
    name: "Deal 8",
    price: 1900,
    description: "4 Zinger Burgers, 4 Chicken Pieces, 1.5 Litre Drink",
    slots: [
      { label: "Zinger Burger", quantity: 4, options: [{ item: "Zinger Burger" }] },
      {
        label: "Chicken Piece (2 pc)",
        quantity: 2,
        options: [{ item: "Chicken Piece (2 pc)" }],
      },
      { label: "1.5 Litre Drink", quantity: 1, options: bigDrink },
    ],
  },
];
