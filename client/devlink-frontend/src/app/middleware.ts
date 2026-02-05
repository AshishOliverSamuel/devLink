import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes that REQUIRE authentication
 */
const PROTECTED_ROUTES = [
  "/chat",
  "/create-post",
  "/dashboard",
  "/me",
  "/search",
  "/update-profile",
  "/users",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  
  const isDocumentRequest =
    req.headers.get("accept")?.includes("text/html");

  const token = req.cookies.get("access_token")?.value;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !token) {
    if (isDocumentRequest) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/create-post",
    "/dashboard/:path*",
    "/me",
    "/search/:path*",
    "/update-profile",
    "/users/:path*",
  ],
};
