import "server-only";
import { cookies } from "next/headers";
import type { UserRole } from "@/db/schema/users";
import { env } from "@/server/env";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants";
import { signSession } from "./jwt";

interface SessionUser {
  id: number;
  name: string;
  role: UserRole;
  tokenVersion: number;
}

/** Signs a JWT for the user and stores it in an httpOnly cookie. Server Actions only. */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSession(
    { sub: String(user.id), name: user.name, role: user.role, tv: user.tokenVersion },
    SESSION_MAX_AGE_SECONDS
  );

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Plain http is allowed in development so phones on the LAN can sign in.
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
