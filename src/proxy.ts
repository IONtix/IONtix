import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const DASHBOARD_ROLES = new Set([
  "SUPER_ADMIN",
  "EVENT_ORGANIZER",
  "STAFF",
]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ------------------------------------------------------------
  // SUPER ADMIN AREA
  // ------------------------------------------------------------
  if (pathname.startsWith("/super-admin")) {
    // Halaman login Super Admin harus tetap public.
    if (pathname === "/super-admin/login") {
      return NextResponse.next();
    }

    // Semua halaman lain di /super-admin membutuhkan login.
    if (!token) {
      return NextResponse.redirect(
        new URL("/super-admin/login", req.url),
      );
    }

    // Hanya SUPER_ADMIN yang boleh masuk area ini.
    if (token.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  }

  // ------------------------------------------------------------
  // INTERNAL DASHBOARD
  // ------------------------------------------------------------
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (
      typeof token.role !== "string" ||
      !DASHBOARD_ROLES.has(token.role)
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/super-admin/:path*",
  ],
};

export default proxy;
