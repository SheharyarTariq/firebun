import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { routes } from "@/utils/routes";

/**
 * Clears the session cookie and returns to sign-in. Used by the "Sign out" button and by
 * the DAL when a cookie is valid but the account was deactivated or revoked.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL(routes.ui.signIn, request.nextUrl));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
