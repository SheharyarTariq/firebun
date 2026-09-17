/**
 * Idempotent seed: first admin user, the settings row, and the printed menu.
 * Run with `npm run db:seed` after `npm run db:migrate`.
 *
 * Builds its own client (instead of importing db/index.ts) because that module is
 * marked server-only and cannot be imported from a plain Node script.
 */
import { config as loadEnv } from "dotenv";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashPassword } from "@/server/auth/password";
import { slugify, toBaseQty } from "@/utils/helper";
import { createPool } from "./pool";
import * as schema from "./schema";
import { INVENTORY_ITEMS } from "./seed-data/inventory";
import {
  DEALS,
  DEALS_CATEGORY,
  MENU_CATEGORIES,
  type SeedSlotOption,
} from "./seed-data/menu";

loadEnv({ path: ".env.local" });

type Db = ReturnType<typeof createDb>;

function createDb(url: string) {
  const client = createPool(url, 1);
  return { client, db: drizzle(client, { schema, casing: "snake_case" }) };
}

async function seedAdmin(db: Db["db"]) {
  const [{ value: userCount }] = await db.select({ value: count() }).from(schema.users);
  if (userCount > 0) {
    console.log("• users: already present, skipping");
    return;
  }

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@gmail.com").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  await db.insert(schema.users).values({
    name: "Admin",
    email,
    passwordHash: await hashPassword(password),
    role: "admin",
  });
  console.log(`• users: created admin (${email} / ${password}) — change the password after first sign-in`);
}

async function seedSettings(db: Db["db"]) {
  const inserted = await db
    .insert(schema.settings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning({ id: schema.settings.id });
  console.log(inserted.length ? "• settings: created" : "• settings: already present, skipping");
}

async function seedMenu(db: Db["db"]) {
  const [{ value: categoryCount }] = await db
    .select({ value: count() })
    .from(schema.menuCategories);
  if (categoryCount > 0) {
    console.log("• menu: categories already present, skipping");
    return;
  }

  // variant lookup: "Item name|Variant name" -> variant id, plus category -> item names
  const variantIds = new Map<string, number>();
  const itemsByCategory = new Map<string, string[]>();
  const onlyVariantOf = new Map<string, string>();

  await db.transaction(async (tx) => {
    let categorySort = 0;

    for (const category of MENU_CATEGORIES) {
      const [cat] = await tx
        .insert(schema.menuCategories)
        .values({ name: category.name, sortOrder: categorySort++ })
        .returning({ id: schema.menuCategories.id });

      itemsByCategory.set(
        category.name,
        category.items.map((i) => i.name)
      );

      let itemSort = 0;
      for (const item of category.items) {
        const [row] = await tx
          .insert(schema.menuItems)
          .values({
            categoryId: cat.id,
            name: item.name,
            kind: "single",
            slug: slugify(item.name),
            description: item.description,
            sortOrder: itemSort++,
          })
          .returning({ id: schema.menuItems.id });

        let variantSort = 0;
        for (const variant of item.variants) {
          const [v] = await tx
            .insert(schema.menuItemVariants)
            .values({
              menuItemId: row.id,
              name: variant.name,
              price: variant.price,
              sortOrder: variantSort++,
            })
            .returning({ id: schema.menuItemVariants.id });
          variantIds.set(`${item.name}|${variant.name}`, v.id);
        }
        if (item.variants.length === 1) {
          onlyVariantOf.set(item.name, item.variants[0].name);
        }
      }
    }

    // Deals
    const [dealsCat] = await tx
      .insert(schema.menuCategories)
      .values({ name: DEALS_CATEGORY, sortOrder: categorySort++ })
      .returning({ id: schema.menuCategories.id });

    const resolveOptions = (options: SeedSlotOption[]): number[] => {
      const ids: number[] = [];
      for (const option of options) {
        if ("category" in option) {
          for (const itemName of itemsByCategory.get(option.category) ?? []) {
            const id = variantIds.get(`${itemName}|${option.variant}`);
            if (id) ids.push(id);
          }
        } else {
          const variantName = option.variant ?? onlyVariantOf.get(option.item);
          const id = variantName ? variantIds.get(`${option.item}|${variantName}`) : undefined;
          if (!id) {
            throw new Error(`Seed: cannot resolve deal option ${option.item} / ${variantName}`);
          }
          ids.push(id);
        }
      }
      if (ids.length === 0) throw new Error("Seed: deal slot resolved to no options");
      return ids;
    };

    let dealSort = 0;
    for (const deal of DEALS) {
      const [item] = await tx
        .insert(schema.menuItems)
        .values({
          categoryId: dealsCat.id,
          name: deal.name,
          kind: "deal",
          slug: slugify(deal.name),
          description: deal.description,
          sortOrder: dealSort++,
        })
        .returning({ id: schema.menuItems.id });

      const [variant] = await tx
        .insert(schema.menuItemVariants)
        .values({ menuItemId: item.id, name: "Regular", price: deal.price })
        .returning({ id: schema.menuItemVariants.id });

      let slotSort = 0;
      for (const slot of deal.slots) {
        const [slotRow] = await tx
          .insert(schema.dealSlots)
          .values({
            dealVariantId: variant.id,
            label: slot.label,
            quantity: slot.quantity,
            sortOrder: slotSort++,
          })
          .returning({ id: schema.dealSlots.id });

        await tx.insert(schema.dealSlotOptions).values(
          resolveOptions(slot.options).map((variantId) => ({
            slotId: slotRow.id,
            variantId,
          }))
        );
      }
    }
  });

  console.log(
    `• menu: seeded ${MENU_CATEGORIES.length + 1} categories, ${variantIds.size} variants, ${DEALS.length} deals`
  );
}

const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1e3) / 1e3;
const round6 = (n: number) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

/**
 * Inventory items with one pack each as opening stock. Inserts the item and its
 * `opening` ledger row directly (the seed cannot import server-only modules); the
 * cached quantity and average cost are exactly what applyMovement would set for a
 * new item. Skips names that already exist, so reruns are safe.
 */
async function seedInventory(db: Db["db"]) {
  const admin = await db.query.users.findFirst({
    where: eq(schema.users.role, "admin"),
    columns: { id: true },
  });
  if (!admin) throw new Error("Seed: admin user must exist before inventory");

  const existing = new Set(
    (await db.select({ name: schema.inventoryItems.name }).from(schema.inventoryItems)).map((r) =>
      r.name.trim().toLowerCase()
    )
  );

  let created = 0;
  await db.transaction(async (tx) => {
    for (const row of INVENTORY_ITEMS) {
      if (existing.has(row.name.toLowerCase())) continue;

      const packSizeBase = round3(toBaseQty(row.packSize, row.displayUnit, row.baseUnit));
      const unitCost = round6(row.packPrice / packSizeBase);

      const [item] = await tx
        .insert(schema.inventoryItems)
        .values({
          name: row.name,
          baseUnit: row.baseUnit,
          displayUnit: row.displayUnit,
          packSize: packSizeBase,
          packLabel: row.packLabel,
          currentQty: packSizeBase,
          avgCost: unitCost,
        })
        .returning({ id: schema.inventoryItems.id });

      await tx.insert(schema.stockMovements).values({
        inventoryItemId: item.id,
        type: "opening",
        quantityDelta: packSizeBase,
        unitCost,
        referenceType: "manual",
        note: `Opening stock (seed) — 1 ${row.packLabel} @ Rs ${row.packPrice}`,
        createdBy: admin.id,
      });
      created++;
    }
  });

  console.log(
    created > 0
      ? `• inventory: seeded ${created} items with opening stock (${INVENTORY_ITEMS.length - created} already present)`
      : "• inventory: all items already present, skipping"
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  }

  const { client, db } = createDb(url);
  try {
    await seedAdmin(db);
    await seedSettings(db);
    await seedMenu(db);
    await seedInventory(db);

    const [settingsRow] = await db
      .select({ shopName: schema.settings.shopName })
      .from(schema.settings)
      .where(eq(schema.settings.id, 1));
    console.log(`Done. Shop: ${settingsRow?.shopName ?? "?"}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
