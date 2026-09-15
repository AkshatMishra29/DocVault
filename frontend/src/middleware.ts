import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * PROTECTED routes — any path that starts with these requires a valid token.
 * The token is stored in a cookie called `dv_token` (set on login).
 */
const PROTECTED_PREFIXES = [
  "/home",
  "/vault",
  "/upload",
  "/document",
  "/reminders",
  "/cards",
  "/family",
  "/sharing",
  "/settings",
];

/**
 * PUBLIC routes — no auth needed.
 */
const PUBLIC_PREFIXES = ["/login", "/signup", "/s/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and Next.js internals through immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // Read the auth cookie (set at login by the app)
  const token = request.cookies.get("dv_token")?.value;

  // ── Unauthenticated user trying to access a protected route ──────────────
  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    // Pass the originally requested URL so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    // Security headers
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  // ── Authenticated user trying to visit login/signup ───────────────────────
  if (isPublic && token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // ── Root path → redirect based on auth state ─────────────────────────────
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(token ? "/home" : "/login", request.url)
    );
  }

  const response = NextResponse.next();

  // ── Security headers on every response ───────────────────────────────────
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  return response;
}

export const config = {
  // Run middleware on all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
