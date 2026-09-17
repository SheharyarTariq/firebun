import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";

export const USER_ROLES = ["admin", "staff"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text().notNull(),
    /** Sign-in identifier; stored lower-case. Will also carry password-reset mail later. */
    email: text().notNull(),
    passwordHash: text().notNull(),
    role: text({ enum: USER_ROLES }).notNull().default("staff"),
    isActive: boolean().notNull().default(true),
    /** Bumped on deactivation / password change to invalidate existing session cookies. */
    tokenVersion: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
    check("users_role_check", sql`${t.role} in ('admin', 'staff')`),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
