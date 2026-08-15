"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

// Mendefinisikan tipe data Event
interface EventData {
  id: string;
  nama: string;
  tanggal: string;
  status: string;
  tiketTerjual: number;
  target: number;
  pendapatan: string;
}

// Mendefinisikan tipe data Transaksi Terbaru
interface TransactionData {
  id: string;
  pembeli: string;
  event: string;
  total: string;
  status: string;
  tanggal: string;
}

// Menambahkan recentTransactions ke dalam Props
interface DashboardClientProps {
  metrics: {
    totalRevenue: string;
    totalTickets: number;
    activeEvents: number;
  };
  eventsList: EventData[];
  recentTransactions: TransactionData[];
}

export default function DashboardClient({
  metrics,
  eventsList,
  recentTransactions,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState("ringkasan");

  // Fungsi untuk Logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "ringkasan":
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Kartu Statistik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-3xl border border-border/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                <p className="text-sm font-bold text-muted-foreground mb-4">
                  Total Pendapatan
                </p>
                <p className="text-3xl font-black text-foreground group-hover:text-[#F57C00] transition-colors">
                  {metrics.totalRevenue}
                </p>
                <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1">
                  <span>↑</span> Real-time tersinkronisasi
                </p>
              </div>
              <div className="bg-card p-6 rounded-3xl border border-border/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                <p className="text-sm font-bold text-muted-foreground mb-4">
                  Tiket Terjual
                </p>
                <p className="text-3xl font-black text-foreground group-hover:text-[#0B1B3D] transition-colors">
                  {metrics.totalTickets}{" "}
                  <span className="text-base text-muted-foreground font-medium">
                    tiket
                  </span>
                </p>
              </div>
              <div className="bg-card p-6 rounded-3xl border border-border/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <p className="text-sm font-bold text-muted-foreground mb-4">
                  Event Aktif
                </p>
                <p className="text-3xl font-black text-foreground">
                  {metrics.activeEvents}{" "}
                  <span className="text-base text-muted-foreground font-medium">
                    event
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Tabel Event Terkini */}
              <div className="bg-card rounded-3xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
                  <h3 className="font-bold text-lg text-[#0B1B3D]">
                    Event Berlangsung
                  </h3>
                  <button
                    onClick={() => setActiveTab("kelola_event")}
                    className="text-sm font-bold text-[#F57C00] hover:text-[#E65100] transition-colors"
                  >
                    Lihat Semua →
                  </button>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4 font-bold">Nama Event</th>
                        <th className="px-6 py-4 font-bold">Status</th>
                        <th className="px-6 py-4 font-bold text-right">
                          Penjualan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {eventsList.length > 0 ? (
                        eventsList.map((event) => (
                          <tr
                            key={event.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-6 py-4 font-black text-[#0B1B3D]">
                              {event.nama}
                              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                                {event.tanggal}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${event.status === "Buka" ? "bg-emerald-500/10 text-emerald-600" : "bg-[#F57C00]/10 text-[#F57C00]"}`}
                              >
                                {event.status === "Buka" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                                {event.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-foreground">
                              {event.tiketTerjual}{" "}
                              <span className="text-muted-foreground font-medium">
                                / {event.target}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-6 py-8 text-center text-muted-foreground"
                          >
                            Belum ada data event.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabel Transaksi Terbaru */}
              <div className="bg-card rounded-3xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
                  <h3 className="font-bold text-lg text-[#0B1B3D]">
                    Transaksi Terakhir
                  </h3>
                  <button
                    onClick={() => setActiveTab("keuangan")}
                    className="text-sm font-bold text-[#F57C00] hover:text-[#E65100] transition-colors"
                  >
                    Keuangan →
                  </button>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4 font-bold">Pembeli</th>
                        <th className="px-6 py-4 font-bold">Nominal</th>
                        <th className="px-6 py-4 font-bold text-right">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recentTransactions.length > 0 ? (
                        recentTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="font-black text-[#0B1B3D]">
                                {tx.pembeli}
                              </p>
                              <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate max-w-37.5">
                                {tx.event}
                              </p>
                            </td>
                            <td className="px-6 py-4 font-bold text-emerald-600">
                              {tx.total}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tx.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-600" : tx.status === "PENDING" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}
                              >
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-6 py-8 text-center text-muted-foreground"
                          >
                            Belum ada transaksi terbaru.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      case "kelola_event":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-border/80 rounded-3xl bg-muted/10">
            <span className="text-4xl mb-4">🏃‍♂️</span>
            <h3 className="text-xl font-bold text-foreground">
              Modul Kelola Event
            </h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Semua daftar event Anda akan muncul di sini beserta pengaturan
              tiket dan rute.
            </p>
          </div>
        );
      case "keuangan":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-border/80 rounded-3xl bg-emerald-500/5">
            <span className="text-4xl mb-4">💳</span>
            <h3 className="text-xl font-bold text-foreground">
              Modul Keuangan & Pencairan
            </h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Riwayat mutasi, pajak, dan permintaan pencairan dana secara
              real-time.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row selection:bg-[#F57C00] selection:text-white">
      {/* Sidebar Navigasi */}
      <aside className="hidden md:flex w-64 flex-col bg-[#0B1B3D] border-r border-border/50 px-4 py-6 text-white relative z-20 shadow-2xl">
        <div className="mb-10 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="IONtix Logo"
            className="h-8 w-auto brightness-0 invert opacity-90"
          />
        </div>
        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab("ringkasan")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-all ${activeTab === "ringkasan" ? "bg-[#F57C00] text-white shadow-md shadow-[#F57C00]/20" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
          >
            <span className="text-lg">📊</span> Ringkasan
          </button>
          <button
            onClick={() => setActiveTab("kelola_event")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-all ${activeTab === "kelola_event" ? "bg-[#F57C00] text-white shadow-md shadow-[#F57C00]/20" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
          >
            <span className="text-lg">🏃‍♂️</span> Kelola Event
          </button>
          <button
            onClick={() => setActiveTab("keuangan")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold transition-all ${activeTab === "keuangan" ? "bg-[#F57C00] text-white shadow-md shadow-[#F57C00]/20" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
          >
            <span className="text-lg">💳</span> Keuangan
          </button>
        </nav>
        <div className="pt-4 border-t border-white/10 mt-auto">
          {/* Tombol Logout Fungsional */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-zinc-400 hover:text-red-400 rounded-xl font-medium transition-all text-left"
          >
            <span className="text-lg">🚪</span> Keluar Akses
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-background/80 backdrop-blur-md border-b border-border/60 h-16 sm:h-20 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <h2 className="font-bold text-lg text-foreground md:hidden">
            Dashboard
          </h2>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <Link href="/dashboard/create">
              <Button className="bg-[#F57C00] hover:bg-[#E65100] text-white rounded-full px-5 py-2 text-xs sm:text-sm font-bold shadow-md shadow-[#F57C00]/20 transition-all cursor-pointer">
                + Buat Event Baru
              </Button>
            </Link>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0B1B3D] text-white flex items-center justify-center font-bold text-sm shadow-inner cursor-pointer hover:scale-105 transition-transform">
              EO
            </div>
          </div>
        </header>

        <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B1B3D]">
              {activeTab === "ringkasan" && "Selamat Datang, Mitra IONtix! 👋"}
              {activeTab === "kelola_event" && "Manajemen Event Lari"}
              {activeTab === "keuangan" && "Laporan Keuangan"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Pantau performa event dan transaksi Anda secara real-time hari
              ini.
            </p>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
