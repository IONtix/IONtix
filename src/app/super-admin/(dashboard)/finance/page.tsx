import prisma from "@/lib/prisma";
import FinanceTable from "./_components/FinanceTable";
import { DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react";

export const metadata = {
  title: "Manajemen Keuangan | IONtix Admin",
};

export default async function FinancePage() {
  // Mengambil data seluruh transaksi beserta informasi user/runner
  const [transactions, aggregateData] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        runner: true, // atau user
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { status: { in: ["Berhasil", "SUCCESS", "PAID"] } },
    }),
  ]);

  const totalVolume = aggregateData._sum.amount || 0;
  // Estimasi Platform Fee (misal 5% platform fee / komisi)
  const platformFee = Math.round(totalVolume * 0.05);

  return (
    <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-[1600px] mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-emerald-600 drop-shadow-sm" />
            Manajemen Keuangan
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Rekapitulasi arus kas transaksi, komisi platform, dan riwayat
            pembayaran tiket secara real-time.
          </p>
        </div>
      </div>

      {/* Financial Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Perputaran Uang (GTV)
            </span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900">
              Rp {totalVolume.toLocaleString("id-ID")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Dari {aggregateData._count.id} transaksi berhasil
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Estimasi Platform Fee
            </span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900">
              Rp {platformFee.toLocaleString("id-ID")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Pendapatan bersih platform IONtix
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Metode Pembayaran
            </span>
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900">
              Automatic Gateway
            </h3>
            <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Midtrans / Payment Active
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Mutasi Keuangan */}
      <FinanceTable initialData={transactions} />
    </div>
  );
}
