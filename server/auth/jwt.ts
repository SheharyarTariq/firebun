import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/db/schema/users";

/**
 * Pure JWT helpers (no Next.js imports) so `proxy.ts` can verify the session cookie
 * without pulling in server-only modules.
 */
export interface SessionPayload {
  /** users.id as a string */
  sub: string;
  name: string;
  role: UserRole;
  /** users.token_version at sign-in; a mismatch means the session was revoked */
  tv: number;
}

function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
  maxAgeSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ name: payload.name, role: payload.role, tv: payload.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSeconds)
    .sign(getKey());
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "admin" && payload.role !== "staff") ||
      typeof payload.tv !== "number"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      name: typeof payload.name === "string" ? payload.name : "",
      role: payload.role,
      tv: payload.tv,
    };
  } catch {
    return null;
  }
}
