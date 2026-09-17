import { relations } from "drizzle-orm";
import { expenses } from "./expenses";
import { inventoryItems, inventoryPurchases, stockMovements } from "./inventory";
import {
  dealSlotOptions,
  dealSlots,
  menuCategories,
  menuItems,
  menuItemVariants,
  recipes,
} from "./menu";
import { orderItems, orders } from "./orders";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  createdOrders: many(orders, { relationName: "orderCreatedBy" }),
  cancelledOrders: many(orders, { relationName: "orderCancelledBy" }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  variants: many(menuItemVariants),
}));

export const menuItemVariantsRelations = relations(
  menuItemVariants,
  ({ one, many }) => ({
    item: one(menuItems, {
      fields: [menuItemVariants.menuItemId],
      references: [menuItems.id],
    }),
    recipes: many(recipes),
    dealSlots: many(dealSlots),
  })
);

export const recipesRelations = relations(recipes, ({ one }) => ({
  variant: one(menuItemVariants, {
    fields: [recipes.variantId],
    references: [menuItemVariants.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [recipes.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const dealSlotsRelations = relations(dealSlots, ({ one, many }) => ({
  dealVariant: one(menuItemVariants, {
    fields: [dealSlots.dealVariantId],
    references: [menuItemVariants.id],
  }),
  options: many(dealSlotOptions),
}));

export const dealSlotOptionsRelations = relations(dealSlotOptions, ({ one }) => ({
  slot: one(dealSlots, {
    fields: [dealSlotOptions.slotId],
    references: [dealSlots.id],
  }),
  variant: one(menuItemVariants, {
    fields: [dealSlotOptions.variantId],
    references: [menuItemVariants.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  purchases: many(inventoryPurchases),
  movements: many(stockMovements),
  recipes: many(recipes),
}));

export const inventoryPurchasesRelations = relations(
  inventoryPurchases,
  ({ one }) => ({
    item: one(inventoryItems, {
      fields: [inventoryPurchases.inventoryItemId],
      references: [inventoryItems.id],
    }),
    createdByUser: one(users, {
      fields: [inventoryPurchases.createdBy],
      references: [users.id],
    }),
  })
);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [stockMovements.inventoryItemId],
    references: [inventoryItems.id],
  }),
  createdByUser: one(users, {
    fields: [stockMovements.createdBy],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
    relationName: "orderCreatedBy",
  }),
  cancelledByUser: one(users, {
    fields: [orders.cancelledBy],
    references: [users.id],
    relationName: "orderCancelledBy",
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  parent: one(orderItems, {
    fields: [orderItems.parentOrderItemId],
    references: [orderItems.id],
    relationName: "dealChildren",
  }),
  children: many(orderItems, { relationName: "dealChildren" }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  variant: one(menuItemVariants, {
    fields: [orderItems.variantId],
    references: [menuItemVariants.id],
  }),
  dealSlot: one(dealSlots, {
    fields: [orderItems.dealSlotId],
    references: [dealSlots.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
}));
