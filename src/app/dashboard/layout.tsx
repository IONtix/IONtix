"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  Wallet,
  ScanLine,
  Settings,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const menuItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Manajemen Event", href: "/dashboard/events", icon: CalendarDays },
    { name: "Data Peserta", href: "/dashboard/participants", icon: Users },
    { name: "Transaksi", href: "/dashboard/transactions", icon: CreditCard },
    { name: "Keuangan & Pencairan", href: "/dashboard/finance", icon: Wallet },
    { name: "Gate Scanner", href: "/dashboard/scanner", icon: ScanLine },
    { name: "Pengaturan Mitra", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#050A14] font-sans text-slate-200">
      <aside className="z-20 hidden w-72 flex-col border-r border-slate-800/80 bg-[#090F1C] lg:flex">
        <div className="flex h-20 items-center border-b border-slate-800/80 px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="IONtix"
              width={160}
              height={48}
              priority
              className="h-7 w-auto object-contain brightness-200"
            />
            <span className="rounded border border-[#F57C00]/20 bg-[#F57C00]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F57C00]">
              EO PANEL
            </span>
          </Link>
        </div>

        <div className="scrollbar-hide flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
          <p className="mb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Menu Utama
          </p>

          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-300 ${
                  isActive
                    ? "border-l-2 border-[#F57C00] bg-linear-to-r from-[#F57C00]/10 to-transparent text-white"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? "text-[#F57C00]"
                      : "text-slate-500 transition-colors group-hover:text-slate-300"
                  }
                />
                <span
                  className={`text-sm font-bold ${isActive ? "text-white" : ""}`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-slate-800/80 bg-[#090F1C] p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition-all hover:border-red-900/50 hover:bg-red-950/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#F57C00] to-amber-600 text-sm font-black text-white shadow-md">
              EO
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-red-400">
                Mitra EO Resmi
              </p>
              <p className="truncate text-[10px] text-slate-400">
                admin@eo-mitra.com
              </p>
            </div>
            <LogOut
              size={16}
              className="shrink-0 text-slate-500 transition-colors group-hover:text-red-500"
            />
          </button>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#090F1C]/90 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="-ml-2 p-2 text-slate-300 hover:text-white"
            aria-label="Buka menu"
          >
            <Menu size={24} />
          </button>

          <Image
            src="/logo.png"
            alt="IONtix"
            width={120}
            height={36}
            priority
            className="h-5 w-auto object-contain brightness-200"
          />
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#F57C00] to-amber-600 text-xs font-bold text-white">
          EO
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-slate-800/80 bg-[#090F1C] transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-6">
          <span className="rounded border border-[#F57C00]/20 bg-[#F57C00]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#F57C00]">
            EO PANEL
          </span>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-400 hover:text-white"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all ${
                  isActive
                    ? "bg-[#F57C00]/10 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-[#F57C00]" : "text-slate-500"}
                />
                <span className="text-sm font-bold">{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-slate-800/80 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-bold text-slate-400 transition-all hover:bg-red-950/30 hover:text-red-400"
          >
            <LogOut size={18} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </div>

      <main className="flex h-screen flex-1 flex-col overflow-hidden bg-[#050A14]">
        <header className="sticky top-0 z-10 hidden h-20 items-center justify-between border-b border-slate-800/60 bg-[#050A14] px-8 lg:flex">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black capitalize tracking-wide text-white">
              {pathname === "/dashboard"
                ? "Dashboard Overview"
                : pathname.split("/").pop()?.replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              className="relative p-2 text-slate-400 transition-colors hover:text-white"
              aria-label="Notifikasi"
            >
              <Bell size={20} />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-[#050A14] bg-red-500" />
            </button>

            <div className="group flex cursor-pointer items-center gap-3 border-l border-slate-800/80 pl-6">
              <div className="text-right">
                <p className="text-sm font-bold text-white">Mitra EO</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Terverifikasi
                </p>
              </div>

              <ChevronDown
                size={16}
                className="text-slate-500 transition-colors group-hover:text-white"
              />
            </div>
          </div>
        </header>

        <div className="scrollbar-hide relative flex-1 overflow-y-auto p-4 pt-24 lg:p-8 lg:pt-8">
          <div className="pointer-events-none absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-[#F57C00]/5 blur-[120px]" />
          {children}
        </div>
      </main>
    </div>
  );
}
