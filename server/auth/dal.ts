import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type UserRole } from "@/db/schema";
import { routes } from "@/utils/routes";
import { SESSION_COOKIE } from "./constants";
import { verifySessionToken, type SessionPayload } from "./jwt";

/**
 * Data Access Layer for auth. `proxy.ts` only does an optimistic cookie check; these
 * functions are the real guard and must be called in every page, layout that needs the
 * user, Server Action and Route Handler.
 */

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

/** The decoded session cookie, or null. Memoised per request. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
});

/** Redirects to sign-in when there is no valid session. */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) redirect(routes.ui.signIn);
  return session;
});

/**
 * Loads the user and re-checks that the account is active and the session has not been
 * revoked (token_version). Invalid sessions go through the sign-out route, which clears
 * the cookie — redirecting straight to sign-in would loop through the proxy.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await verifySession();
  const user = await getDb().query.users.findFirst({
    where: eq(users.id, Number(session.sub)),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      tokenVersion: true,
    },
  });

  if (!user || !user.isActive || user.tokenVersion !== session.tv) {
    redirect(routes.ui.signOut);
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** Admin-only pages and actions. Staff are sent back to the counter. */
export const requireAdmin = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect(routes.ui.pos);
  return user;
});
