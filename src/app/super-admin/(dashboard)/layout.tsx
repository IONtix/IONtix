import Sidebar from "./_components/Sidebar";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import { redirect } from "next/navigation";
import { Bell, Search } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let actor;

  try {
    /*
     * Seluruh area Super Admin Dashboard menggunakan
     * platform.view sebagai gateway utama.
     *
     * Authorization tetap diverifikasi di server.
     * Kita tidak lagi bergantung pada session.role
     * yang dikirim ke client.
     */
    actor = await requirePermission("platform.view");
  } catch (error: unknown) {
    /*
     * Hanya error authorization yang diarahkan kembali
     * ke halaman login. Error server lainnya tetap
     * dibiarkan naik agar tidak disamarkan sebagai
     * masalah autentikasi.
     */
    if (
      error instanceof AuthorizationError &&
      (error.status === 401 || error.status === 403)
    ) {
      redirect("/super-admin/login");
    }

    throw error;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans selection:bg-blue-600 selection:text-white">
      <Sidebar />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/70 px-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] backdrop-blur-xl">
          <div className="hidden w-100 items-center rounded-lg border border-slate-200/80 bg-slate-100/50 px-4 py-2 transition-all duration-300 hover:bg-slate-100 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 md:flex">
            <Search className="mr-3 h-4 w-4 text-slate-400" />

            <input
              type="text"
              placeholder="Pencarian cepat..."
              className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none"
              aria-label="Pencarian cepat"
            />

            <kbd className="ml-2 hidden items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-400 shadow-sm lg:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-5">
            <button
              type="button"
              className="relative rounded-full p-2.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
              aria-label="Notifikasi"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200/80 pl-5">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-slate-900">
                  {actor.name || "Admin"}
                </p>

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {actor.role}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-md">
                {actor.name?.charAt(0).toUpperCase() || "A"}
              </div>
            </div>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto scroll-smooth bg-[#F8FAFC] p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
