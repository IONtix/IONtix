// src/app/super-admin/_components/MetricCards.tsx
"use client";

import { Wallet, Ticket, Building2, Users, ArrowUpRight } from "lucide-react";

interface MetricCardsProps {
  data: {
    totalRevenue: number;
    totalTickets: number;
    totalEOs: number;
    totalUsers: number;
  };
}

export default function MetricCards({ data }: MetricCardsProps) {
  // Format mata uang Rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const metrics = [
    {
      title: "Total Pendapatan",
      value: formatRupiah(data.totalRevenue),
      icon: Wallet,
      trend: "Real-time",
      color: "blue",
    },
    {
      title: "Tiket Terjual",
      value: data.totalTickets.toLocaleString("id-ID"),
      icon: Ticket,
      trend: "Real-time",
      color: "slate",
    },
    {
      title: "Mitra EO Aktif",
      value: data.totalEOs.toLocaleString("id-ID"),
      icon: Building2,
      trend: "Terverifikasi",
      color: "slate",
    },
    {
      title: "Total Pengguna",
      value: data.totalUsers.toLocaleString("id-ID"),
      icon: Users,
      trend: "Semua Role",
      color: "slate",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((item, index) => {
        const Icon = item.icon;

        return (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300/80"
          >
            {/* Efek gradient tipis di background saat di-hover */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-slate-50 opacity-0 blur-2xl transition-opacity group-hover:opacity-100 pointer-events-none" />

            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    item.color === "blue"
                      ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100/50"
                      : "bg-slate-50 text-slate-600 ring-1 ring-slate-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {item.title}
                </h3>
              </div>
            </div>

            <div className="relative flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">
                  {item.value}
                </p>
              </div>

              {/* Badge Status */}
              <div className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 border border-slate-100">
                <ArrowUpRight className="h-3 w-3" />
                {item.trend}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
