"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import type { DashboardEvent } from "@/lib/platform-types";
import { getEventStatusMeta } from "@/lib/events/status";
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
  const [events, setEvents] = useState<DashboardEvent[]>([]);
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

      if (result.success && Array.isArray(result.data)) {
        setEvents(result.data);
      } else if (!result.success) {
        setEvents([]);
      }
    } catch (error: unknown) {
      console.error("Terjadi kesalahan:", error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEvents();
  }, []);

  const getValidImageUrl = (event: DashboardEvent) => {
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

  const getEventStatus = (event: DashboardEvent) => {
    return event.status || "DRAFT";
  };

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
        setDeleteModal({
          isOpen: false,
          eventId: "",
          eventName: "",
        });
        setDeletePassword("");
        void fetchEvents();
      } else {
        setDeleteError(result.error || "Gagal menghapus event.");
      }
    } catch {
      setDeleteError("Terjadi kesalahan jaringan.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const meta = getEventStatusMeta(status);

    const toneClass = {
      neutral:
        "border-slate-500/20 bg-slate-500/10 text-slate-400",
      warning:
        "border-amber-500/20 bg-amber-500/10 text-amber-400",
      success:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      danger:
        "border-red-500/20 bg-red-500/10 text-red-400",
      info:
        "border-blue-500/20 bg-blue-500/10 text-blue-400",
    }[meta.tone];

    const dotClass = {
      neutral: "bg-slate-400",
      warning: "bg-amber-400",
      success: "bg-emerald-400",
      danger: "bg-red-400",
      info: "bg-blue-400",
    }[meta.tone];

    return (
      <span
        title={meta.description}
        className={`z-20 relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${toneClass}`}
      >
        <div className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {meta.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] p-6 font-sans text-slate-200 selection:bg-[#F57C00] selection:text-white sm:p-8 md:p-10">
      <div className="mx-auto mb-10 flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-white">
            Manajemen Event
          </h1>
          <p className="text-sm font-medium text-slate-400">
            Kelola daftar event lari, pantau penjualan tiket, dan atur
            operasional event Anda.
          </p>
        </div>

        <Link
          href="/dashboard/events/create"
          className="flex items-center gap-2 rounded-xl bg-linear-to-r from-[#F57C00] to-[#E65100] px-7 py-3.5 font-bold text-white shadow-[0_0_20px_rgba(245,124,0,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(245,124,0,0.5)]"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span className="text-sm uppercase tracking-wider">
            Buat Event Baru
          </span>
        </Link>
      </div>

      <div className="mx-auto mb-8 flex max-w-7xl flex-col items-center justify-between gap-6 lg:flex-row">
        <div className="no-scrollbar flex w-full overflow-x-auto rounded-xl border border-[#1E293B] bg-[#131A2B] p-1.5 shadow-lg lg:w-auto">
          {[
            {
              id: "semua",
              label: "Semua Event",
            },
            {
              id: "DRAFT",
              label: "Draft",
            },
            {
              id: "PENDING_REVIEW",
              label: "Menunggu Review",
            },
            {
              id: "PUBLISHED",
              label: "Dipublikasikan",
            },
            {
              id: "COMPLETED",
              label: "Selesai",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#1E293B] text-white shadow-md"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="group relative w-full lg:w-80">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search
              size={18}
              className="text-slate-500 transition-colors group-focus-within:text-[#F57C00]"
            />
          </div>

          <input
            type="text"
            placeholder="Cari nama atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#1E293B] bg-[#131A2B] py-3 pl-11 pr-4 text-sm font-medium text-white shadow-lg outline-none transition-all placeholder:text-slate-600 focus:border-[#F57C00] focus:ring-1 focus:ring-[#F57C00]"
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 size={48} className="mb-4 animate-spin text-[#F57C00]" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Menarik Data Event...
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#1E293B] bg-[#131A2B] py-20 shadow-xl">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#2A374A] bg-[#1E293B]">
              <Calendar size={32} className="text-slate-400" />
            </div>

            <h3 className="mb-2 text-xl font-black tracking-tight text-white">
              Belum Ada Event
            </h3>

            <p className="mb-6 max-w-md text-center text-sm text-slate-400">
              Anda belum membuat event apapun, atau tidak ada data pada filter
              &quot;{activeTab}&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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

              const isSelesai = status === "COMPLETED";

              const displayLocation =
                event.location ||
                event.venue ||
                event.locationName ||
                "Lokasi tidak diatur";

              const imageUrl = getValidImageUrl(event);

              return (
                <div
                  key={event.id}
                  className={`group flex flex-col overflow-hidden rounded-3xl border bg-[#131A2B] transition-all duration-300 ${
                    isSelesai
                      ? "border-slate-800 opacity-80"
                      : "border-[#1E293B] hover:border-[#F57C00]/50 hover:shadow-[0_10px_30px_rgba(245,124,0,0.1)]"
                  }`}
                >
                  <div className="relative h-52 overflow-hidden bg-[#0A0E17]">
                    <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-[#131A2B] via-[#131A2B]/40 to-transparent" />

                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={event.title}
                        width={1200}
                        height={700}
                        className={`h-full w-full object-cover opacity-80 transition-transform duration-700 ${
                          isSelesai
                            ? "grayscale"
                            : "group-hover:scale-110 group-hover:opacity-100"
                        }`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#0F1623] text-xs font-bold uppercase text-slate-600">
                        Tanpa Banner
                      </div>
                    )}

                    {isSelesai && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                        <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg">
                          EVENT TELAH SELESAI
                        </span>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 z-20 flex gap-2">
                      {getStatusBadge(status)}
                    </div>

                    <div className="absolute right-4 top-4 z-20">
                      <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                        <Tag size={12} className="text-[#F57C00]" />{" "}
                        {event.category || "RUN"}
                      </span>
                    </div>
                  </div>

                  <div className="-mt-8 relative z-20 flex flex-1 flex-col p-6">
                    <h3
                      className={`mb-4 line-clamp-2 text-xl font-black leading-snug tracking-tight text-white drop-shadow-md ${
                        !isSelesai &&
                        "transition-colors group-hover:text-[#F57C00]"
                      }`}
                    >
                      {event.title}
                    </h3>

                    <div className="mb-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm font-semibold text-slate-400">
                        <div className="rounded-md border border-[#2A374A] bg-[#1E293B] p-1.5 text-[#3B82F6]">
                          <Calendar size={16} />
                        </div>

                        <span>
                          {formattedDate} • {formattedTime} WIB
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm font-semibold text-slate-400">
                        <div className="rounded-md border border-[#2A374A] bg-[#1E293B] p-1.5 text-[#10B981]">
                          <MapPin size={16} />
                        </div>

                        <span className="truncate">{displayLocation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#1E293B] bg-[#0F1623] px-6 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          eventId: event.id,
                          eventName: event.title,
                        })
                      }
                      className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                      title="Hapus Event"
                    >
                      <Trash2 size={18} />
                    </button>

                    {isSelesai ? (
                      <span className="flex cursor-not-allowed items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Ditutup
                      </span>
                    ) : (
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="group/btn flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#F57C00] transition-colors hover:text-[#E65100]"
                      >
                        KELOLA EVENT{" "}
                        <ChevronRight
                          size={16}
                          className="transition-transform group-hover/btn:translate-x-1"
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

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#1E293B] bg-[#131A2B] shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#0A0E17] p-6">
              <div className="flex items-center gap-3 text-red-500">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <AlertCircle size={24} />
                </div>

                <h2 className="text-lg font-black tracking-tight">
                  Hapus Event
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    eventId: "",
                    eventName: "",
                  })
                }
                className="cursor-pointer text-slate-500 transition-colors hover:text-white"
                aria-label="Tutup dialog hapus event"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-6 p-6">
              <div>
                <p className="mb-2 text-sm text-slate-300">
                  Anda akan menghapus event{" "}
                  <span className="font-bold text-white">
                    &quot;
                    {deleteModal.eventName}
                    &quot;
                  </span>{" "}
                  secara permanen.
                </p>

                <p className="text-xs text-slate-500">
                  Silakan masukkan password akun EO Anda untuk konfirmasi
                  keamanan.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Password Konfirmasi
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock size={16} className="text-slate-500" />
                  </div>

                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Masukkan password Anda..."
                    className="w-full rounded-xl border border-[#1E293B] bg-[#0A0E17] py-3 pl-11 pr-4 text-sm text-white outline-none transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {deleteError && (
                  <p className="mt-1 text-xs font-bold text-red-500">
                    {deleteError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModal({
                      isOpen: false,
                      eventId: "",
                      eventName: "",
                    });
                    setDeletePassword("");
                    setDeleteError("");
                  }}
                  className="flex-1 cursor-pointer rounded-xl bg-[#1E293B] px-4 py-3 text-sm font-bold text-slate-300 transition-colors hover:bg-[#2A374A]"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isDeleting || !deletePassword}
                  className="flex-1 cursor-pointer rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
