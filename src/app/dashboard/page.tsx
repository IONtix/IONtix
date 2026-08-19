"use client";

import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { DashboardEventOption, DashboardTransaction } from "@/lib/platform-types";
import {
  Ticket,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  PackageCheck,
  Loader2,
  AlertTriangle,
  XCircle,
  Plus,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Gagal mengambil data");
    return res.json();
  });

export default function DashboardOverviewPage() {
  // 1. STATE UNTUK FILTER EVENT
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");

  // 2. FETCH DATA DENGAN QUERY PARAMETER EVENT ID
  const { data, error, isLoading } = useSWR(
    `/api/eo/dashboard?eventId=${selectedEventId}`,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true },
  );

  if (isLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={40} className="animate-spin text-orange-600 mb-4" />
        <p className="text-sm font-bold tracking-widest uppercase animate-pulse">
          Menyinkronkan Database Realtime...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4">
        <AlertTriangle className="text-red-400 shrink-0" size={32} />
        <div>
          <h3 className="text-red-400 font-bold">Koneksi API Gagal</h3>
          <p className="text-xs text-red-400/80 mt-1">
            Pastikan server berjalan dengan baik.
          </p>
        </div>
      </div>
    );
  }

  // 3. EKSTRAK DATA TERMASUK DAFTAR EVENT
  const { metrics, salesChart, recentTransactions, availableEvents } = data;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen -m-6 p-6 animate-in fade-in duration-700">
      {/* ======================================================== */}
      {/* ULTRA MASTERPIECE CONTROL BAR: SMART FILTER & CREATE BTN */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden bg-white/95 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
        {/* Ambient Glow Subtle Background */}
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-orange-50 rounded-full blur-3xl pointer-events-none group-hover:bg-[#F57C00]/20 transition-all duration-700" />

        {/* LEFT: Custom Selector */}
        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
          <div className="p-2.5 bg-linear-to-br from-[#F57C00]/20 to-[#F57C00]/5 rounded-xl text-orange-600 border border-[#F57C00]/30 shadow-[0_0_15px_rgba(245,124,0,0.15)] shrink-0">
            <CalendarDays size={20} />
          </div>

          <div className="relative w-full sm:w-72">
            <div className="relative flex items-center bg-white border border-slate-200 rounded-xl hover:border-[#F57C00]/50 focus-within:border-[#F57C00] focus-within:ring-2 focus-within:ring-[#F57C00]/20 transition-all duration-300 shadow-inner group/select">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full appearance-none bg-transparent cursor-pointer text-slate-900 font-bold text-xs sm:text-sm pl-4 pr-10 py-2.5 outline-none tracking-wide z-10"
              >
                <option value="ALL" className="bg-white text-slate-900">
                  Semua Event Tergabung
                </option>
                {availableEvents &&
                  availableEvents.map((evt: DashboardEventOption) => (
                    <option
                      key={evt.id}
                      value={evt.id}
                      className="bg-white text-slate-900"
                    >
                      {evt.title}
                    </option>
                  ))}
              </select>
              {/* Custom Animated Chevron Arrow */}
              <div className="absolute right-3.5 text-slate-500 group-hover/select:text-orange-600 transition-colors pointer-events-none z-0">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Ultra Masterpiece Action Button */}
        <div className="relative z-10 w-full sm:w-auto">
          <Link
            href="/dashboard/events/create"
            className="block w-full sm:w-auto"
          >
            <button className="relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-linear-to-r from-[#F57C00] via-[#FF9800] to-[#E65100] text-white text-xs sm:text-sm font-black tracking-wider uppercase py-3 px-6 rounded-xl transition-all duration-300 ease-out shadow-[0_0_20px_rgba(245,124,0,0.3)] hover:shadow-[0_0_35px_rgba(245,124,0,0.6)] hover:scale-[1.02] active:scale-95 group/btn overflow-hidden">
              {/* Button Shimmer Effect */}
              <span className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />

              <div className="p-1 bg-white/20 rounded-lg group-hover/btn:rotate-90 transition-transform duration-300">
                <Plus size={16} className="text-white" />
              </div>
              <span>Buat Event Baru</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. OPERATIONAL KPI CENTER */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Total Pendapatan */}
        <div className="bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden group hover:border-[#F57C00]/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Total Pendapatan
            </h3>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600 border border-orange-200">
              <Wallet size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              Rp {metrics.totalPendapatan.toLocaleString("id-ID")}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                <ArrowUpRight size={12} className="mr-0.5" /> +
                {metrics.persentaseKenaikan}%
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                Minggu Ini
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Tiket Terjual */}
        <div className="bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Tiket Terjual
            </h3>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-200">
              <Ticket size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {metrics.tiketTerjual}
              </p>
              <p className="text-sm font-bold text-slate-500">
                / {metrics.totalKapasitas}
              </p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width:
                    metrics.totalKapasitas > 0
                      ? `${Math.min(
                          (metrics.tiketTerjual /
                            metrics.totalKapasitas) *
                            100,
                          100,
                        )}%`
                      : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Check-In */}
        <div className="bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Peserta Check-In
            </h3>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-200">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.pesertaCheckIn}
            </p>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wider">
              {metrics.tiketTerjual > 0
                ? `${Math.round(
                    (metrics.pesertaCheckIn /
                      metrics.tiketTerjual) *
                      100,
                  )}% dari tiket terjual`
                : "Belum ada tiket terjual"}
            </p>
          </div>
        </div>

        {/* Card 4: Menunggu Check-In */}
        <div className="bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Menunggu Check-In
            </h3>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-500/20">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.menungguCheckIn}
            </p>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wider">
              Peserta belum hadir
            </p>
          </div>
        </div>

        {/* Card 5: Racepack Diambil */}
        <div className="bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Racepack Diambil
            </h3>
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600 border border-cyan-500/20">
              <PackageCheck size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.racepackDiambil}
            </p>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wider">
              Sudah diserahkan
            </p>
          </div>
        </div>

        {/* Card 6: Racepack Belum Diambil */}
        <div className="bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden group hover:border-violet-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Racepack Belum Diambil
            </h3>
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600 border border-violet-500/20">
              <PackageCheck size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {metrics.racepackBelumDiambil}
            </p>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wider">
              Menunggu pengambilan
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CHART & TRANSACTIONS ROW (TETAP SAMA LENGKAP) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* CHART SECTION */}
        <div className="xl:col-span-2 bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Tren Penjualan Tiket
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {selectedEventId === "ALL"
                  ? "7 Hari Terakhir (Semua Event)"
                  : "7 Hari Terakhir (Event Terpilih)"}
              </p>
            </div>
          </div>
          <div className="h-70 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salesChart}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F57C00" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F57C00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `Rp${val / 1000000}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#1E293B",
                    borderRadius: "12px",
                  }}
                  itemStyle={{
                    color: "#F57C00",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                  labelStyle={{
                    color: "#94A3B8",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                  formatter={(value) => [
                    `Rp ${Number(value || 0).toLocaleString("id-ID")}`,
                    "Pendapatan",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#F57C00"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT TRANSACTIONS SECTION */}
        <div className="bg-linear-to-br from-white to-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Transaksi Live
            </h2>
            <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">
                Live Sync
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
            {recentTransactions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Belum ada transaksi
              </div>
            ) : (
              recentTransactions.map((trx: DashboardTransaction, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-full shrink-0 ${
                        trx.status === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-600"
                          : trx.status === "PENDING"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {trx.status === "SUCCESS" ? (
                        <CheckCircle2 size={16} />
                      ) : trx.status === "PENDING" ? (
                        <Clock size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {trx.name}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                        {trx.id} • {trx.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2 border-l border-slate-200">
                    <p className="text-xs font-black text-orange-600">
                      Rp {trx.amount.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-widest">
                      {trx.date}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
