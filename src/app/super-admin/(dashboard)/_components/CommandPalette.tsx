// src/app/super-admin/_components/CommandPalette.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  Ticket,
  Settings,
  Building2,
} from "lucide-react";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Daftar menu/aksi yang bisa dicari
  const menuItems = [
    { name: "Ke Dashboard", path: "/super-admin", icon: LayoutDashboard },
    { name: "Manajemen Pengguna", path: "/super-admin/users", icon: Users },
    { name: "Mitra EO", path: "/super-admin/eo", icon: Building2 },
    { name: "Event & Tiket", path: "/super-admin/events", icon: Ticket },
    {
      name: "Pengaturan Sistem",
      path: "/super-admin/settings",
      icon: Settings,
    },
  ];

  // Efek untuk mendengarkan shortcut keyboard Cmd+K / Ctrl+K dan Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fokus otomatis ke input saat modal terbuka
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearchQuery(""); // Reset pencarian saat ditutup
    }
  }, [isOpen]);

  // Filter menu berdasarkan pencarian
  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelect = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal dialog */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ketik perintah atau cari halaman..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="ml-3 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ESC
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filteredItems.length > 0 ? (
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Navigasi Cepat
              </p>
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item.path)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">
              Tidak ada hasil yang ditemukan untuk "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </>
  );
}
