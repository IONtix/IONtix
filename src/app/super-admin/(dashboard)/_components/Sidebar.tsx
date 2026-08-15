"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Ticket,
  Wallet,
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { name: "Manajemen Pengguna", href: "/super-admin/users", icon: Users },
    { name: "Mitra EO", href: "/super-admin/eo", icon: Building2 },
    { name: "Event & Tiket", href: "/super-admin/events", icon: Ticket },
    { name: "Keuangan", href: "/super-admin/finance", icon: Wallet },
  ];

  // Sembunyikan sidebar jika sedang di halaman login
  if (pathname === "/super-admin/login") return null;

  return (
    <aside className="w-[280px] flex-col bg-white text-slate-700 hidden md:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 border-r border-slate-200/80 h-full">
      <div className="flex h-20 items-center px-6 border-b border-slate-200/80 bg-white backdrop-blur-md">
        <Link
          href="/super-admin"
          className="flex items-center gap-3 group w-full"
        >
          <div className="relative h-10 w-32 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="IONtix Logo"
              fill
              className="object-contain object-left drop-shadow-sm"
              priority
            />
          </div>
          <div className="flex items-center justify-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
              Admin
            </span>
          </div>
        </Link>
      </div>

      <div className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Menu Utama
      </div>

      <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Pengecekan URL yang lebih presisi
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href) && item.href !== "/super-admin");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-blue-50/80 text-blue-700 border border-blue-100 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-transform duration-200 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
        <Link
          href="/api/auth/signout?callbackUrl=/super-admin/login"
          className="group flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-all duration-200 border border-transparent"
        >
          <LogOut className="h-5 w-5 text-red-400 group-hover:text-red-600 transition-colors" />
          Otorisasi Keluar
        </Link>
      </div>
    </aside>
  );
}
