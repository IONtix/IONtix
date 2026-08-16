"use client";

import { useState } from "react";
import {
  Search,
  MoreHorizontal,
  Calendar,
  MapPin,
  Clock,
  Globe,
} from "lucide-react";

// Struktur data yang aman (menyesuaikan kemungkinan nama kolom di database Anda)
interface EventData {
  id: string;
  name?: string;
  title?: string; // Beberapa skema menggunakan 'title' alih-alih 'name'
  location?: string;
  date?: Date;
  startDate?: Date; // Berjaga-jaga jika menggunakan 'startDate'
  isPublished: boolean;
  createdAt: Date;
  eo?: {
    name: string | null;
  } | null;
}

export default function EventTable({ initialData }: { initialData: EventData[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fitur Filter Real-time (Mencari nama event atau nama EO)
  const filtered = initialData.filter((event: EventData) => {
    const searchLower = searchTerm.toLowerCase();
    const eventName = (event.name || event.title || "").toLowerCase();
    const eoName = (event.eo?.name || "").toLowerCase();
    return eventName.includes(searchLower) || eoName.includes(searchLower);
  });

  const formatDate = (dateValue: Date | string | undefined) => {
    if (!dateValue) return "Tanggal Belum Ditentukan";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateValue));
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Search Bar & Filter Buatan */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama event atau Mitra EO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* Placeholder untuk Tab Filter Masa Depan */}
        <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50">
          <button className="px-4 py-1.5 text-xs font-semibold rounded-md bg-white text-slate-700 shadow-sm">
            Semua Event
          </button>
          <button className="px-4 py-1.5 text-xs font-semibold rounded-md text-slate-500 hover:text-slate-700">
            Menunggu
          </button>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200/80">
            <tr>
              <th className="px-6 py-4">Informasi Event</th>
              <th className="px-6 py-4">Mitra Penyelenggara</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map((event: EventData) => (
                <tr
                  key={event.id}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-base mb-1">
                        {event.name || event.title || "Event Tanpa Judul"}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(
                            event.date || event.startDate || event.createdAt,
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {event.location || "Lokasi Online/TBA"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {(event.eo?.name || "EO").charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">
                        {event.eo?.name || "Mandiri (Internal)"}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {event.isPublished ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 border border-emerald-200 shadow-sm">
                        <Globe className="h-3.5 w-3.5" />
                        Live / Publik
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 border border-amber-200 shadow-sm">
                        <Clock className="h-3.5 w-3.5" />
                        Draft / Menunggu
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent group-hover:border-blue-100 group-hover:shadow-sm">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                    <Globe className="h-10 w-10 text-slate-300" />
                    <p className="text-slate-500 font-medium">
                      Belum ada event yang didaftarkan.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
