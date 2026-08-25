// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Dapatkan token pengguna
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 2. Proteksi Rute Super Admin (Area Dashboard saja)
  if (pathname.startsWith("/super-admin")) {
    // Jika BELUM login
    if (!token) {
      const loginUrl = new URL("/super-admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
    // Jika SUDAH login tapi BUKAN Super Admin
    if (token.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // 3. Proteksi Rute Dashboard EO
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!["EO", "SUPER_ADMIN"].includes(token.role as string)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

// ⚠️ BAGIAN PALING PENTING: EXCLUDE SEMUA HALAMAN LOGIN & API DARI MIDDLEWARE!
export const config = {
  matcher: [
    /*
     * Match rute /super-admin dan /dashboard
     * TETAPI KECUALIKAN /super-admin/login, /login, api auth, dan static files
     */
    "/((?!login|super-admin/login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
