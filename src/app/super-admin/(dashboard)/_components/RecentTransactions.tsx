// src/app/super-admin/_components/RecentTransactions.tsx

import { MoreHorizontal, CheckCircle2, Clock } from "lucide-react";

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function RecentTransactions({
  recentTransactions,
}: {
  recentTransactions: any[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md">
      <div className="border-b border-slate-100 p-6 flex items-center justify-between bg-white">
        <h3 className="text-lg font-bold text-slate-800">
          Transaksi Tiket Terbaru
        </h3>
        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
          Lihat Semua &rarr;
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">Waktu</th>
              <th className="px-6 py-4 font-semibold tracking-wider">
                Pembeli
              </th>
              <th className="px-6 py-4 font-semibold tracking-wider">
                Nominal
              </th>
              <th className="px-6 py-4 font-semibold tracking-wider">Metode</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold tracking-wider text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  Belum ada data transaksi terbaru.
                </td>
              </tr>
            ) : (
              recentTransactions.map((trx) => (
                <tr
                  key={trx.id}
                  className="transition-colors hover:bg-slate-50/80 group"
                >
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(trx.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    {trx.runner?.name || "Anonim"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {formatRupiah(trx.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                      {trx.paymentMethod || "Manual"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
                        trx.status === "Berhasil" ||
                        trx.status === "SUCCESS" ||
                        trx.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {trx.status === "Berhasil" ||
                      trx.status === "SUCCESS" ||
                      trx.status === "PAID" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {trx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors hover:bg-blue-50 p-1.5 rounded-md">
                      <MoreHorizontal className="h-5 w-5 ml-auto" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
