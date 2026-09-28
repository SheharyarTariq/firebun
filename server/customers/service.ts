import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { getDb, type DbOrTx } from "@/db";
import { customers, type Customer } from "@/db/schema";
import { ServiceError } from "@/server/errors";
import { isPhoneLike, normalisePhone, titleCaseName } from "@/utils/helper";
import { countUnpaidOrdersFor } from "./queries";

export interface CustomerInput {
  /** Optional: the phone is the identity, so a customer may be known only by their number. */
  name?: string | null;
  phone: string;
  note?: string | null;
}

function normalise(input: CustomerInput) {
  const phone = normalisePhone(input.phone);
  if (!isPhoneLike(phone)) {
    throw new ServiceError("That does not look like a phone number.", { phone: "Check the number" });
  }
  const name = input.name?.trim() ? titleCaseName(input.name) : null;
  return { name, phone, note: input.note?.trim() || null };
}

/**
 * The phone is the identity, so a clash is reported by naming who already has it — the
 * cashier can then pick that customer instead of inventing a second row for one person.
 */
async function assertPhoneFree(tx: DbOrTx, phone: string, exceptId?: number) {
  const [clash] = await tx
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(exceptId ? and(eq(customers.phone, phone), ne(customers.id, exceptId)) : eq(customers.phone, phone));
  if (clash) {
    throw new ServiceError(`${clash.name ?? "Another customer"} already has that number.`, { phone: "Already used" });
  }
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const values = normalise(input);
  return getDb().transaction(async (tx) => {
    await assertPhoneFree(tx, values.phone);
    const [row] = await tx.insert(customers).values(values).returning();
    return row;
  });
}

export async function updateCustomer(id: number, input: CustomerInput): Promise<Customer> {
  const values = normalise(input);
  return getDb().transaction(async (tx) => {
    await assertPhoneFree(tx, values.phone, id);
    const [row] = await tx
      .update(customers)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    if (!row) throw new ServiceError("Customer not found.");
    return row;
  });
}

/**
 * Past orders keep their own name and phone, so deleting loses no history — but it would hide
 * a debt, so it waits until the customer is square.
 */
export async function deleteCustomer(id: number): Promise<void> {
  const [customer] = await getDb().select().from(customers).where(eq(customers.id, id));
  if (!customer) throw new ServiceError("Customer not found.");

  const unpaid = await countUnpaidOrdersFor(id);
  if (unpaid.orders > 0) {
    throw new ServiceError(
      `${customer.name} still owes Rs ${unpaid.amount.toLocaleString("en-PK")} on ${unpaid.orders} order${unpaid.orders === 1 ? "" : "s"}. Settle those first.`
    );
  }
  await getDb().delete(customers).where(eq(customers.id, id));
}

/**
 * Used while placing an order: find the customer by phone or make one. Keeps the counter to a
 * single step when a regular turns up whose number is already on file.
 */
export async function findOrCreateCustomer(tx: DbOrTx, input: CustomerInput): Promise<Customer> {
  const values = normalise(input);
  const [existing] = await tx.select().from(customers).where(eq(customers.phone, values.phone));
  if (existing) return existing;
  const [row] = await tx.insert(customers).values(values).returning();
  return row;
}
