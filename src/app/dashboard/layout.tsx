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
  ShieldCheck,
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
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Manajemen Event",
      href: "/dashboard/events",
      icon: CalendarDays,
    },
    {
      name: "Data Peserta",
      href: "/dashboard/participants",
      icon: Users,
    },
    {
      name: "Transaksi",
      href: "/dashboard/transactions",
      icon: CreditCard,
    },
    {
      name: "Keuangan & Pencairan",
      href: "/dashboard/finance",
      icon: Wallet,
    },
    {
      name: "Gate Scanner",
      href: "/dashboard/scanner",
      icon: ScanLine,
    },
    {
      name: "Pengaturan Mitra",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const isPathActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  };

  const currentItem =
    menuItems.find((item) => isPathActive(item.href)) ??
    menuItems[0];

  return (
    <div className="flex min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* ============================================================
          DESKTOP SIDEBAR
      ============================================================ */}
      <aside className="z-30 hidden w-[276px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {/* Brand */}
        <div className="flex h-20 items-center border-b border-slate-200 px-7">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <Image
              src="/logo.png"
              alt="IONtix"
              width={160}
              height={48}
              priority
              className="h-8 w-auto object-contain"
            />

            <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
              EO PANEL
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="scrollbar-hide flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-5 flex items-center justify-between px-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Menu Utama
            </p>

            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
              Online
            </span>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const active = isPathActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3.5 transition-all duration-200 ${
                    active
                      ? "bg-orange-50 text-orange-700 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-orange-500" />
                  )}

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all ${
                      active
                        ? "bg-orange-100 text-orange-600"
                        : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-600"
                    }`}
                  >
                    <Icon size={18} />
                  </span>

                  <span
                    className={`text-sm ${
                      active
                        ? "font-extrabold"
                        : "font-semibold"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Workspace status */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <ShieldCheck size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-800">
                  Workspace Terverifikasi
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Akun EO aktif dan siap mengelola event.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="border-t border-slate-200 bg-white p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-red-200 hover:bg-red-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-black text-white shadow-sm">
              EO
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-800 group-hover:text-red-600">
                Mitra EO Resmi
              </p>
              <p className="truncate text-[10px] text-slate-500">
                admin@eo-mitra.com
              </p>
            </div>

            <LogOut
              size={16}
              className="shrink-0 text-slate-400 transition-colors group-hover:text-red-500"
            />
          </button>
        </div>
      </aside>

      {/* ============================================================
          MOBILE TOP BAR
      ============================================================ */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="-ml-2 rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>

          <Image
            src="/logo.png"
            alt="IONtix"
            width={120}
            height={36}
            priority
            className="h-6 w-auto object-contain"
          />
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-black text-white shadow-sm">
          EO
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/25 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ============================================================
          MOBILE SIDEBAR
      ============================================================ */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[290px] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="IONtix"
              width={120}
              height={36}
              priority
              className="h-6 w-auto object-contain"
            />

            <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-orange-600">
              EO
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const active = isPathActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() =>
                    setIsMobileMenuOpen(false)
                  }
                  className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all ${
                    active
                      ? "bg-orange-50 text-orange-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-orange-600"
                        : "text-slate-400"
                    }
                  />

                  <span className="text-sm font-bold">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-bold text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          MAIN WORKSPACE
      ============================================================ */}
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        {/* Desktop header */}
        <header className="sticky top-0 z-40 hidden h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-8 shadow-sm backdrop-blur lg:flex">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
              IONtix Workspace
            </p>

            <h1 className="mt-1 truncate text-xl font-black tracking-tight text-slate-900">
              {pathname === "/dashboard"
                ? "Dashboard Overview"
                : currentItem.name}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification */}
            <button
              type="button"
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Notifikasi"
            >
              <Bell size={19} />

              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>

            {/* Verified status */}
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Terverifikasi
              </span>
            </div>

            {/* Profile */}
            <button
              type="button"
              className="group flex items-center gap-3 border-l border-slate-200 pl-4"
            >
              <div className="text-right">
                <p className="text-sm font-extrabold text-slate-800">
                  Mitra EO
                </p>

                <p className="text-[10px] font-semibold text-slate-500">
                  Organizer Workspace
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-xs font-black text-white shadow-sm">
                EO
              </div>

              <ChevronDown
                size={16}
                className="text-slate-400 transition-colors group-hover:text-slate-700"
              />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="scrollbar-hide relative flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
          <div className="pointer-events-none absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-orange-100/50 blur-[120px]" />

          {children}
        </div>
      </main>
    </div>
  );
}
