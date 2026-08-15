"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Trash2,
  Tag,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Lock,
} from "lucide-react";
import { getEvents, deleteEventWithPassword } from "../../actions/event";

export default function EventManagementPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("semua");

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    eventId: "",
    eventName: "",
  });
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const result = await getEvents();
      if (result.success && result.data) {
        setEvents(result.data);
      }
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // FUNGSI MEMASTIKAN URL GAMBAR SELALU VALID
  const getValidImageUrl = (event: any) => {
    const rawImage =
      event.imageUrl ||
      event.posterUrl ||
      event.image ||
      event.poster ||
      event.bannerUrl ||
      event.posterPreview;

    if (!rawImage) return null;

    if (
      rawImage.startsWith("http://") ||
      rawImage.startsWith("https://") ||
      rawImage.startsWith("data:")
    ) {
      return rawImage;
    }

    return rawImage.startsWith("/") ? rawImage : `/${rawImage}`;
  };

  // FUNGSI CEK STATUS OTOMATIS BERDASARKAN TANGGAL
  const getEventStatus = (event: any) => {
    if (event.isPublished === false) return "draft";

    const eventDateObj = event.date ? new Date(event.date) : null;
    const now = new Date();

    if (eventDateObj && eventDateObj < now) {
      return "selesai";
    }

    return "publish"; // Berjalan
  };

  // FITUR FILTER
  const filteredEvents = events.filter((event) => {
    const displayLocation =
      event.location || event.venue || event.locationName || "";
    const matchesSearch =
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      displayLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const status = getEventStatus(event);
    const matchesTab = activeTab === "semua" ? true : activeTab === status;

    return matchesSearch && matchesTab;
  });

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    setIsDeleting(true);
    try {
      const result = await deleteEventWithPassword(
        deleteModal.eventId,
        deletePassword,
      );
      if (result.success) {
        setDeleteModal({ isOpen: false, eventId: "", eventName: "" });
        setDeletePassword("");
        fetchEvents();
      } else {
        setDeleteError(result.error || "Gagal menghapus event.");
      }
    } catch (err) {
      setDeleteError("Terjadi kesalahan jaringan.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "publish") {
      return (
        <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 z-20 relative">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />{" "}
          Berjalan
        </span>
      );
    }
    if (status === "selesai") {
      return (
        <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 z-20 relative">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Selesai
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 z-20 relative">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Draft
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 p-6 sm:p-8 md:p-10 font-sans selection:bg-[#F57C00] selection:text-white">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Manajemen Event
          </h1>
          <p className="text-sm font-medium text-slate-400">
            Kelola daftar event lari, pantau penjualan tiket, dan atur
            operasional event Anda.
          </p>
        </div>
        <Link
          href="/dashboard/events/create"
          className="bg-linear-to-r from-[#F57C00] to-[#E65100] text-white px-7 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(245,124,0,0.3)] hover:shadow-[0_0_30px_rgba(245,124,0,0.5)] hover:-translate-y-0.5 transition-all"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span className="text-sm uppercase tracking-wider">
            Buat Event Baru
          </span>
        </Link>
      </div>

      {/* FILTER & TABS */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8 max-w-7xl mx-auto">
        <div className="flex bg-[#131A2B] p-1.5 rounded-xl border border-[#1E293B] shadow-lg w-full lg:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: "semua", label: "Semua Event" },
            { id: "publish", label: "Berjalan" },
            { id: "draft", label: "Draft" },
            { id: "selesai", label: "Selesai" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#1E293B] text-white shadow-md"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search
              size={18}
              className="text-slate-500 group-focus-within:text-[#F57C00] transition-colors"
            />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#131A2B] border border-[#1E293B] text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#F57C00] focus:ring-1 focus:ring-[#F57C00] transition-all text-sm font-medium shadow-lg placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* DATA TAMPILAN */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 size={48} className="text-[#F57C00] animate-spin mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              Menarik Data Event...
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#131A2B] border border-[#1E293B] rounded-3xl shadow-xl">
            <div className="w-20 h-20 bg-[#1E293B] rounded-2xl flex items-center justify-center mb-6 border border-[#2A374A]">
              <Calendar size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 tracking-tight">
              Belum Ada Event
            </h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md text-center">
              Anda belum membuat event apapun, atau tidak ada data pada filter "
              {activeTab}".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const eventDateObj = event.date
                ? new Date(event.date)
                : new Date();
              const formattedDate = eventDateObj.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const formattedTime = eventDateObj.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const status = getEventStatus(event);
              const isSelesai = status === "selesai";
              const displayLocation =
                event.location ||
                event.venue ||
                event.locationName ||
                "Lokasi tidak diatur";

              const imageUrl = getValidImageUrl(event);

              return (
                <div
                  key={event.id}
                  className={`bg-[#131A2B] rounded-3xl border flex flex-col overflow-hidden transition-all duration-300 group ${
                    isSelesai
                      ? "border-slate-800 opacity-80"
                      : "border-[#1E293B] hover:border-[#F57C00]/50 hover:shadow-[0_10px_30px_rgba(245,124,0,0.1)]"
                  }`}
                >
                  <div className="h-52 relative overflow-hidden bg-[#0A0E17]">
                    <div className="absolute inset-0 bg-linear-to-t from-[#131A2B] via-[#131A2B]/40 to-transparent z-10 pointer-events-none" />

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={event.title}
                        className={`w-full h-full object-cover transition-transform duration-700 opacity-80 ${
                          isSelesai
                            ? "grayscale"
                            : "group-hover:opacity-100 group-hover:scale-110"
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase bg-[#0F1623]">
                        Tanpa Banner
                      </div>
                    )}

                    {isSelesai && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <span className="bg-red-500 text-white font-black text-xs px-4 py-2 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                          EVENT TELAH SELESAI
                        </span>
                      </div>
                    )}

                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                      {getStatusBadge(status)}
                    </div>
                    <div className="absolute top-4 right-4 z-20">
                      <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Tag size={12} className="text-[#F57C00]" />{" "}
                        {event.category || "RUN"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col relative z-20 -mt-8">
                    <h3
                      className={`text-xl font-black text-white mb-4 line-clamp-2 leading-snug drop-shadow-md ${
                        !isSelesai &&
                        "group-hover:text-[#F57C00] transition-colors"
                      }`}
                    >
                      {event.title}
                    </h3>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm font-semibold text-slate-400">
                        <div className="p-1.5 rounded-md bg-[#1E293B] text-[#3B82F6] border border-[#2A374A]">
                          <Calendar size={16} />
                        </div>
                        <span>
                          {formattedDate} • {formattedTime} WIB
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-semibold text-slate-400">
                        <div className="p-1.5 rounded-md bg-[#1E293B] text-[#10B981] border border-[#2A374A]">
                          <MapPin size={16} />
                        </div>
                        <span className="truncate">{displayLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* KARTU BOTTOM: HAPUS DI KIRI, KELOLA EVENT DI KANAN */}
                  <div className="px-6 py-4 border-t border-[#1E293B] flex items-center justify-between bg-[#0F1623]">
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          eventId: event.id,
                          eventName: event.title,
                        })
                      }
                      className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Hapus Event"
                    >
                      <Trash2 size={18} />
                    </button>

                    {isSelesai ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-widest cursor-not-allowed">
                        Ditutup
                      </span>
                    ) : (
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="flex items-center gap-1.5 text-xs font-black text-[#F57C00] hover:text-[#E65100] uppercase tracking-widest transition-colors group/btn"
                      >
                        KELOLA EVENT{" "}
                        <ChevronRight
                          size={16}
                          className="group-hover/btn:translate-x-1 transition-transform"
                        />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL HAPUS */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#131A2B] border border-[#1E293B] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-[#1E293B] flex items-center justify-between bg-[#0A0E17]">
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle size={24} />
                </div>
                <h2 className="text-lg font-black tracking-tight">
                  Hapus Event
                </h2>
              </div>
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, eventId: "", eventName: "" })
                }
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmDelete} className="p-6 space-y-6">
              <div>
                <p className="text-slate-300 text-sm mb-2">
                  Anda akan menghapus event{" "}
                  <span className="font-bold text-white">
                    "{deleteModal.eventName}"
                  </span>{" "}
                  secara permanen.
                </p>
                <p className="text-slate-500 text-xs">
                  Silakan masukkan password akun EO Anda untuk konfirmasi
                  keamanan.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Password Konfirmasi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={16} className="text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Masukkan password Anda..."
                    className="w-full bg-[#0A0E17] border border-[#1E293B] text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm"
                  />
                </div>
                {deleteError && (
                  <p className="text-red-500 text-xs font-bold mt-1">
                    {deleteError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal({
                      isOpen: false,
                      eventId: "",
                      eventName: "",
                    })
                  }
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-slate-300 bg-[#1E293B] hover:bg-[#2A374A] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !deletePassword}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer"
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
