import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/constants";
import { verifySessionToken } from "@/server/auth/jwt";
import { routes } from "@/utils/routes";

/**
 * Optimistic auth check: reads the session cookie (no database) and redirects
 * signed-out users to sign-in, signed-in users away from sign-in. The real checks live
 * in server/auth/dal.ts and run inside every page and Server Action.
 */
const PUBLIC_PREFIXES = ["/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !isPublic) {
    const url = new URL(routes.ui.signIn, request.nextUrl);
    if (pathname !== routes.ui.indexRoute) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && pathname === routes.ui.signIn) {
    return NextResponse.redirect(new URL(routes.ui.pos, request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Route Handlers (they verify the session themselves), Next
    // internals, the PWA manifest and static assets.
    "/((?!api|_next/static|_next/image|manifest.webmanifest|assets|icon.svg|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.webp$|.*\\.jpg$).*)",
  ],
};
