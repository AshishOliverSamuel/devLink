import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/chat",
  "/create-post",
  "/dashboard",
  "/me",
  "/search",
  "/update-profile",
  "/users",
];

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/verify-otp",
  "/verify-again",
];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const { pathname } = req.nextUrl;

  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
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

    "/login",
    "/register",
    "/verify-otp",
    "/verify-again",
  ],
};
