/**
 * Every path string in the app lives here. `ui` paths are for <Link>, router.push and
 * redirect(). `api` paths are the few Route Handlers that exist (receipt bytes, exports);
 * all other mutations go through Server Actions and need no route string.
 */
export const routes = {
  ui: {
    indexRoute: "/",
    signIn: "/auth/sign-in",
    signOut: "/auth/sign-out",

    pos: "/pos",
    orders: "/orders",
    orderDetails: (id: string | number) => `/orders/${id}`,
    expenses: "/expenses",
    more: "/more",
    printer: "/printer",

    // Admin only
    inventory: "/inventory",
    inventoryItemDetails: (id: string | number) => `/inventory/${id}`,
    menu: "/menu",
    menuItemDetails: (id: string | number) => `/menu/${id}`,
    finance: "/finance",
    users: "/users",
    settings: "/settings",
  },

  api: {
    /** `id` may be "sample" for a test print. */
    orderReceipt: (id: string | number) => `/api/orders/${id}/receipt`,
    financeExport: (type: "orders" | "purchases" | "expenses", from: string, to: string) =>
      `/api/finance/export?type=${type}&from=${from}&to=${to}`,
  },
};
