// src/app/super-admin/(dashboard)/page.tsx
import prisma from "@/lib/prisma";

import MetricCards from "./_components/MetricCards";
import RevenueChart from "./_components/RevenueChart";
import PendingEvents from "./_components/PendingEvents";
import RecentTransactions from "./_components/RecentTransactions";
import { Download, Megaphone } from "lucide-react";

export default async function SuperAdminDashboard() {
  // Pengecekan session (getServerSession) dihapus dari sini
  // karena sudah dilindungi sepenuhnya oleh (dashboard)/layout.tsx

  // Fetching Data Paralel yang Super Cepat
  const [
    totalUsers,
    totalEOs,
    totalTickets,
    revenueAgg,
    recentTransactions,
    pendingEvents,
    allTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { role: { name: { equals: "EO", mode: "insensitive" } } },
    }),
    prisma.ticket.count(),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: { in: ["Berhasil", "SUCCESS", "PAID"] } },
    }),
    prisma.transaction.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      include: { runner: true }, // Pastikan model 'runner' atau 'user' sesuai dengan skema Prisma Anda
    }),
    prisma.event.findMany({
      where: { status: "PENDING_REVIEW" },
      take: 3,
      orderBy: { createdAt: "desc" },
      include: { eo: true },
    }),
    prisma.transaction.findMany({
      where: { status: { in: ["Berhasil", "SUCCESS", "PAID"] } },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.amount || 0;
  const currentYear = new Date().getFullYear();
  const monthlyData = new Array(12).fill(0);

  allTransactions.forEach((trx) => {
    if (trx.createdAt && trx.createdAt.getFullYear() === currentYear) {
      const month = trx.createdAt.getMonth();
      monthlyData[month] += trx.amount || 0;
    }
  });

  const maxMonthlyRevenue = Math.max(...monthlyData, 1);
  const chartHeights = monthlyData.map((amount) =>
    Math.round((amount / maxMonthlyRevenue) * 100),
  );

  return (
    <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-[1600px] mx-auto">
      {/* HEADER SECTION - ENTERPRISE STYLE */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Platform Overview
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/80 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Database Connected
            </span>
            <span className="text-sm font-medium text-slate-400">
              Sinkronisasi real-time aktif
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:bg-slate-50 hover:border-slate-300">
            <Download className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            Ekspor Laporan
          </button>
          <button className="group flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5">
            <Megaphone className="h-4 w-4 text-slate-300" />
            Pengumuman Global
          </button>
        </div>
      </div>

      {/* METRICS GRID */}
      <MetricCards
        data={{ totalRevenue, totalTickets, totalEOs, totalUsers }}
      />

      {/* CHARTS & APPROVAL SECTION */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RevenueChart
          currentYear={currentYear}
          monthlyData={monthlyData}
          chartHeights={chartHeights}
        />
        <PendingEvents pendingEvents={pendingEvents} />
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <RecentTransactions recentTransactions={recentTransactions} />
    </div>
  );
}
