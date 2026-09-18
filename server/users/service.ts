import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses, inventoryPurchases, orders, settings, stockMovements, users, type User, type UserRole } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { ServiceError } from "@/server/errors";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<{ id: number }> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();

  const existing = await db.query.users.findFirst({
    where: sql`lower(${users.email}) = ${email}`,
    columns: { id: true },
  });
  if (existing) {
    throw new ServiceError("An account with this email already exists.", {
      email: "Already in use",
    });
  }

  const [row] = await db
    .insert(users)
    .values({
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
    })
    .returning({ id: users.id });
  return row;
}

/**
 * Rules: you cannot deactivate or demote yourself, and the shop must always keep at
 * least one active admin. Deactivating or changing a role signs that user out everywhere.
 */
export async function updateUser(
  id: number,
  input: UpdateUserInput,
  actorId: number
): Promise<void> {
  await getDb().transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, id)).for("update");
    if (!target) throw new ServiceError("User not found.");

    const roleChanges = input.role !== undefined && input.role !== target.role;
    const deactivates = input.isActive === false && target.isActive;

    if (id === actorId && (roleChanges || deactivates)) {
      throw new ServiceError("You cannot deactivate or change the role of your own account.");
    }

    const losesAdmin =
      target.role === "admin" &&
      target.isActive &&
      ((roleChanges && input.role !== "admin") || deactivates);
    if (losesAdmin) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
      if (n <= 1) throw new ServiceError("There must be at least one active admin.");
    }

    await tx
      .update(users)
      .set({
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.role !== undefined && { role: input.role }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...((roleChanges || deactivates) && {
          tokenVersion: sql`${users.tokenVersion} + 1`,
        }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  });
}

/**
 * Deletes an account that never did anything. As soon as a user has placed an order,
 * recorded a purchase, counted stock or added an expense, that history points at them and
 * the account is deactivated instead.
 */
export async function deleteUser(id: number, actorId: number): Promise<void> {
  if (id === actorId) throw new ServiceError("You cannot delete your own account.");
  await getDb().transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, id)).for("update");
    if (!target) throw new ServiceError("User not found.");

    const [row] = await tx
      .select({
        orders: sql<number>`(select count(*) from ${orders} where ${orders.createdBy} = ${id} or ${orders.cancelledBy} = ${id})`,
        purchases: sql<number>`(select count(*) from ${inventoryPurchases} where ${inventoryPurchases.createdBy} = ${id} or ${inventoryPurchases.voidedBy} = ${id})`,
        movements: sql<number>`(select count(*) from ${stockMovements} where ${stockMovements.createdBy} = ${id})`,
        expenses: sql<number>`(select count(*) from ${expenses} where ${expenses.createdBy} = ${id} or ${expenses.updatedBy} = ${id})`,
        settings: sql<number>`(select count(*) from ${settings} where ${settings.updatedBy} = ${id})`,
      })
      .from(users)
      .where(eq(users.id, id));
    const used = Object.values(row).reduce((n, v) => n + Number(v), 0);
    if (used > 0) {
      throw new ServiceError(`${target.name} has records in the app (orders, stock or expenses), so the account cannot be deleted. Deactivate it instead.`);
    }

    if (target.role === "admin" && target.isActive) {
      const [{ n }] = await tx
        .select({ n: count() })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
      if (n <= 1) throw new ServiceError("There must be at least one active admin.");
    }

    await tx.delete(users).where(eq(users.id, id));
  });
}

/** Admin sets a new password for someone else; their other sessions are signed out. */
export async function resetUserPassword(id: number, password: string): Promise<void> {
  const [row] = await getDb()
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (!row) throw new ServiceError("User not found.");
}

/** A signed-in user changes their own password. Returns the row for re-issuing the session. */
export async function changeOwnPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<User> {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !user.isActive) throw new ServiceError("Account not found.");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ServiceError("Current password is wrong.", {
      currentPassword: "Wrong password",
    });
  }

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}
