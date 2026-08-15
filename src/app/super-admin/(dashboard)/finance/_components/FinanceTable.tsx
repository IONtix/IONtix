"use client";

import { useState } from "react";
import {
  Search,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
} from "lucide-react";

interface TransactionData {
  id: string;
  amount: number;
  status: string;
  createdAt: Date;
  paymentMethod?: string;
  runner?: {
    name?: string | null;
    email?: string;
  } | null;
}

export default function FinanceTable({ initialData }: { initialData: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = initialData.filter((trx: TransactionData) => {
    const searchLower = searchTerm.toLowerCase();
    const buyerName = (trx.runner?.name || "").toLowerCase();
    const buyerEmail = (trx.runner?.email || "").toLowerCase();
    const trxId = trx.id.toLowerCase();
    return (
      buyerName.includes(searchLower) ||
      buyerEmail.includes(searchLower) ||
      trxId.includes(searchLower)
    );
  });

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateValue));
  };

  const renderStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (["BERHASIL", "SUCCESS", "PAID"].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Berhasil
        </span>
      );
    }
    if (["PENDING", "WAITING"].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 border border-rose-200">
        <XCircle className="h-3.5 w-3.5" />
        Gagal / Expired
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header Bar & Search */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID transaksi, nama, atau email pembeli..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all self-start sm:self-auto">
          <Download className="h-4 w-4 text-slate-400" />
          Unduh CSV / Excel
        </button>
      </div>

      {/* Tabel Mutasi */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4">ID Transaksi</th>
              <th className="px-6 py-4">Pembeli / User</th>
              <th className="px-6 py-4">Nominal</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Waktu Transaksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map((trx: TransactionData) => (
                <tr
                  key={trx.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      #{trx.id.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {trx.runner?.name || "User Anonym"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {trx.runner?.email || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" />
                      {formatRupiah(trx.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">{renderStatusBadge(trx.status)}</td>
                  <td className="px-6 py-4 text-right text-xs font-medium text-slate-500">
                    {formatDate(trx.createdAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  Belum ada catatan mutasi keuangan transaksi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
