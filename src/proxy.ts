import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";

const PROTECTED_PREFIXES = [
  "/dots",
  "/new",
  "/settings",
  "/connections",
  "/api/conversations",
  "/api/dots",
  "/api/vakil",
  "/api/events",
  "/api/files",
  "/api/legal",
  "/vakil",
];
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Optimistic auth check: verifies the session JWT signature/expiry from the
 * cookie and redirects accordingly. Pages and Route Handlers still perform
 * their own secure (database-backed) checks — this is redirect UX only.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET ?? "";
  const session =
    token && secret ? await verifySessionToken(token, secret) : null;

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dots/:path*",
    "/vakil/:path*",
    "/new/:path*",
    "/settings/:path*",
    "/connections/:path*",
    "/api/conversations/:path*",
    "/api/dots/:path*",
    "/api/vakil/:path*",
    "/api/events/:path*",
    "/api/files/:path*",
    "/api/legal/:path*",
    "/login",
    "/signup",
  ],
};
