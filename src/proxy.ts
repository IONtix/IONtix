import { withAuth } from "next-auth/middleware";

// Middleware ini akan mengecek token sesi (session) yang aktif
export default withAuth({
  pages: {
    signIn: "/login", // Jika belum login, lempar paksa ke halaman ini
  },
});

// Tentukan halaman mana saja yang akan dikunci (dilindungi) oleh "Satpam" ini
export const config = {
  matcher: [
    // Mengunci halaman utama dashboard dan SELURUH halaman di dalamnya
    "/dashboard/:path*",
  ],
};
