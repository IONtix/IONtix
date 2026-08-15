import Sidebar from "./_components/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Bell, Search } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. OTORISASI KEAMANAN: Hanya cek sesi. Tidak perlu lagi mengecek URL halaman login.
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  // 2. RENDER TAMPILAN DASHBOARD UTAMA
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* SIDEBAR ENTERPRISE KITA */}
      <Sidebar />

      {/* AREA KONTEN UTAMA */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* HEADER GLASSMORPHISM */}
        <header className="sticky top-0 flex h-20 items-center justify-between bg-white/70 backdrop-blur-xl px-8 border-b border-slate-200/80 z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
          <div className="hidden md:flex items-center bg-slate-100/50 hover:bg-slate-100 border border-slate-200/80 rounded-lg px-4 py-2 w-[400px] focus-within:bg-white focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300">
            <Search className="h-4 w-4 text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="Pencarian cepat..."
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 font-medium"
            />
            <kbd className="hidden lg:inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-400 border border-slate-200 shadow-sm ml-2">
              <span className="text-xs">⌘</span> K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-5">
            <button className="relative p-2.5 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 pl-5 border-l border-slate-200/80">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-sm text-slate-900 leading-tight">
                  {session.user?.name || "Admin"}
                </p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {(session.user as any).role || "SUPER_ADMIN"}
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {session.user?.name?.charAt(0).toUpperCase() || "A"}
              </div>
            </div>
          </div>
        </header>

        {/* AREA INI AKAN DIISI OLEH page.tsx DARI MASING-MASING MENU */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-8 relative scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
