"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const MENU_ITEMS: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/super-admin",
    icon: LayoutDashboard,
  },
  {
    name: "Manajemen Pengguna",
    href: "/super-admin/users",
    icon: Users,
  },
  {
    name: "Roles & Permissions",
    href: "/super-admin/roles",
    icon: ShieldCheck,
  },
  {
    name: "Mitra EO",
    href: "/super-admin/eo",
    icon: Building2,
  },
  {
    name: "Event & Tiket",
    href: "/super-admin/events",
    icon: Ticket,
  },
  {
    name: "Keuangan",
    href: "/super-admin/finance",
    icon: Wallet,
  },
];

function isMenuItemActive(pathname: string, href: string): boolean {
  if (href === "/super-admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/super-admin/login") {
    return null;
  }

  return (
    <aside className="hidden h-full w-70 shrink-0 flex-col border-r border-slate-200/80 bg-white text-slate-700 shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:flex">
      {/* BRAND */}
      <div className="flex h-20 items-center border-b border-slate-200/80 bg-white px-6 backdrop-blur-md">
        <Link
          href="/super-admin"
          className="group flex w-full items-center gap-3"
          aria-label="Kembali ke Super Admin Dashboard"
        >
          <div className="relative h-10 w-32 shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="IONtix Logo"
              fill
              sizes="128px"
              className="object-contain object-left drop-shadow-sm"
              priority
            />
          </div>

          <div className="flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/* SECTION LABEL */}
      <div className="px-6 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Menu Utama
      </div>

      {/* NAVIGATION */}
      <nav
        className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-4"
        aria-label="Navigasi Super Admin"
      >
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isMenuItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-3.5 rounded-lg border px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "border-blue-100 bg-blue-50/80 text-blue-700 shadow-sm"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
                  isActive
                    ? "text-blue-600"
                    : "text-slate-400 group-hover:text-slate-600"
                }`}
              />

              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* SIGN OUT */}
      <div className="border-t border-slate-200/80 bg-slate-50/50 p-4">
        <Link
          href="/api/auth/signout?callbackUrl=/super-admin/login"
          className="group flex items-center gap-3.5 rounded-lg border border-transparent px-4 py-3 text-sm font-semibold text-red-500 transition-all duration-200 hover:border-red-100 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5 text-red-400 transition-colors group-hover:text-red-600" />
          <span>Otorisasi Keluar</span>
        </Link>
      </div>
    </aside>
  );
}
