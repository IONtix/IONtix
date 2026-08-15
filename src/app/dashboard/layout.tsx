"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react"; // 👈 DITAMBAHKAN: Import fungsi signOut
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

  // Fungsi untuk Logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // Definisi Menu Lengkap untuk Mitra EO
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
    <div className="min-h-screen bg-[#050A14] flex text-slate-200 overflow-hidden font-sans">
      {/* ========================================== */}
      {/* SIDEBAR (DESKTOP) */}
      {/* ========================================== */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#090F1C] border-r border-slate-800/80 z-20">
        {/* Logo Area */}
        <div className="h-20 flex items-center px-8 border-b border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="IONtix"
              className="h-7 w-auto brightness-200"
            />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F57C00] bg-[#F57C00]/10 px-2 py-1 rounded border border-[#F57C00]/20">
              EO PANEL
            </span>
          </Link>
        </div>

        {/* Menu Navigasi */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-hide">
          <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
            Menu Utama
          </p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? "bg-linear-to-r from-[#F57C00]/10 to-transparent border-l-2 border-[#F57C00] text-white"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? "text-[#F57C00]"
                      : "text-slate-500 group-hover:text-slate-300 transition-colors"
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

        {/* User Profile Mini (Bottom Sidebar) */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090F1C]">
          {/* 👇 PERBAIKAN: Menambahkan onClick handleLogout ke kotak profil ini */}
          <div
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-red-900/50 hover:bg-red-950/20 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#F57C00] to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              EO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                Mitra EO Resmi
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                admin@eo-mitra.com
              </p>
            </div>
            <LogOut
              size={16}
              className="text-slate-500 group-hover:text-red-500 transition-colors"
            />
          </div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* MOBILE HEADER & OVERLAY SIDEBAR */}
      {/* ========================================== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#090F1C]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-slate-300 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <img src="/logo.png" alt="IONtix" className="h-5 brightness-200" />
        </div>
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#F57C00] to-amber-600 flex items-center justify-center text-white font-bold text-xs">
          EO
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-[#090F1C] border-r border-slate-800/80 z-50 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F57C00] bg-[#F57C00]/10 px-2 py-1 rounded border border-[#F57C00]/20">
            EO PANEL
          </span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="py-4 px-3 space-y-1 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
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

        {/* 👇 DITAMBAHKAN: Tombol Log Out khusus untuk tampilan Mobile */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================== */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050A14]">
        {/* Desktop Topbar */}
        <header className="hidden lg:flex h-20 items-center justify-between px-8 bg-[#050A14] border-b border-slate-800/60 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-white capitalize tracking-wide">
              {pathname === "/dashboard"
                ? "Dashboard Overview"
                : pathname.split("/").pop()?.replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification Bell */}
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#050A14] rounded-full animate-pulse" />
            </button>

            {/* Topbar Profile */}
            <div className="flex items-center gap-3 pl-6 border-l border-slate-800/80 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-bold text-white">Mitra EO</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Terverifikasi
                </p>
              </div>
              <ChevronDown
                size={16}
                className="text-slate-500 group-hover:text-white transition-colors"
              />
            </div>
          </div>
        </header>

        {/* Dynamic Content injected here */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pt-24 lg:pt-8 scrollbar-hide relative">
          {/* Subtle Glow Background Effect in content area */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F57C00]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

          {children}
        </div>
      </main>
    </div>
  );
}
