import { NextResponse, type NextRequest } from "next/server";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth-storage";

const PRIVATE_PREFIXES = ["/dashboard", "/admin", "/onboarding"];

function loginUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/connexion";
  url.searchParams.set("next", request.nextUrl.pathname);
  return url;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPrivate = PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isPrivate) return NextResponse.next();

  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === "1";
  if (!hasSession) return NextResponse.redirect(loginUrl(request));

  const role = request.cookies.get(ROLE_COOKIE)?.value;
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && role && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = role === "institutional" ? "/dashboard" : "/datasets";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if ((pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && role && role === "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding"],
};
