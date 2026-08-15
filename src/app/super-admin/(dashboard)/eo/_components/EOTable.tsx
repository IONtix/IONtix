"use client";

import { useState } from "react";
import { Search, MoreHorizontal, Building2, CheckCircle2 } from "lucide-react";

// Struktur data yang diharapkan dari Server
interface EOData {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
}

export default function EOTable({ initialData }: { initialData: EOData[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fitur Filter Real-time
  const filtered = initialData.filter((eo) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (eo.name?.toLowerCase() || "").includes(searchLower) ||
      eo.email.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Search Bar */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama instansi EO atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Tabel Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4">Mitra EO</th>
              <th className="px-6 py-4">Status Akun</th>
              <th className="px-6 py-4">Tanggal Bergabung</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map((eo) => (
                <tr
                  key={eo.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {eo.name || "Tanpa Nama"}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {eo.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aktif
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(eo.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  Tidak ada data Mitra EO ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
