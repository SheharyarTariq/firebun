import "server-only";
import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export async function listUsers() {
  return getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.isActive), asc(users.name));
}

export type UserRow = Awaited<ReturnType<typeof listUsers>>[number];
