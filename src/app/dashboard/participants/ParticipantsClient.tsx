"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Loader2,
  PackageCheck,
  Search,
  TicketCheck,
  Users,
} from "lucide-react";

interface ParticipantItem {
  id: string;
  participantEventId: string;
  fullName: string;
  email: string;
  phone: string | null;

  event: {
    id: string;
    title: string;
  };

  registration: {
    registeredAt: string;
    approvalStatus: string;
  };

  order: {
    id: string;
    orderNumber: string;
    status: string;
    approvalStatus: string;
  } | null;

  payment: {
    status: string;
    amount: number;
    paidAt: string | null;
  } | null;

  ticket: {
    id: string;
    ticketNumber: string;
    qrCode: string;
    categoryId: string;
    categoryName: string;
    status: string;
  } | null;

  checkIn: {
    status: string;
    checkedInAt: string | null;
    gate: string | null;
  } | null;

  racepackClaimed: boolean;
}

interface ParticipantsResponse {
  success: boolean;
  data: ParticipantItem[];
  summary: {
    totalParticipants: number;
    activeTickets: number;
    checkedIn: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

interface EventOption {
  id: string;
  title: string;
}

interface CategoryOption {
  id: string;
  name: string;
  eventId: string;
  eventTitle: string;
}

interface ParticipantsMetaResponse {
  success: boolean;
  data: {
    events: EventOption[];
    categories: CategoryOption[];
  };
  error?: string;
}

async function fetcher<
  T extends {
    success: boolean;
    error?: string;
  },
>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(payload.error || "Gagal mengambil data.");
  }

  return payload;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getPaymentClass(status?: string) {
  switch (status) {
    case "SUCCESS":
    case "SETTLEMENT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "PENDING":
    case "AUTHORIZED":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getTicketClass(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "USED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "CANCELLED":
    case "REFUNDED":
    case "EXPIRED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getCheckInClass(status?: string) {
  switch (status) {
    case "CHECKED_IN":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export default function ParticipantsClient() {
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");
  const [checkInStatus, setCheckInStatus] = useState("");
  const [racepackStatus, setRacepackStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  /*
   * Event options dibuat dari response event yang sedang
   * tersedia untuk participant scope. Untuk tahap UI pertama,
   * kita derive dari data page yang diterima.
   */
  const query = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (eventId) {
      params.set("eventId", eventId);
    }

    if (categoryId) {
      params.set("categoryId", categoryId);
    }

    if (paymentStatus) {
      params.set("paymentStatus", paymentStatus);
    }

    if (ticketStatus) {
      params.set("ticketStatus", ticketStatus);
    }

    if (checkInStatus) {
      params.set("checkInStatus", checkInStatus);
    }

    if (racepackStatus) {
      params.set("racepackStatus", racepackStatus);
    }

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    return `/api/participants?${params.toString()}`;
  }, [
    search,
    eventId,
    categoryId,
    paymentStatus,
    ticketStatus,
    checkInStatus,
    racepackStatus,
    page,
  ]);

  const { data, error, isLoading, isValidating } = useSWR<ParticipantsResponse>(
    query,
    (url) => fetcher<ParticipantsResponse>(url),
    {
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  );

  const { data: metaData, error: metaError } = useSWR<ParticipantsMetaResponse>(
    "/api/participants/meta?organizationId=cmsvr15xc000z49jatsfbfi3c",
    (url) => fetcher<ParticipantsMetaResponse>(url),
    {
      revalidateOnFocus: false,
    },
  );

  const participants = useMemo(() => data?.data ?? [], [data?.data]);

  const total = data?.summary.totalParticipants ?? data?.pagination.total ?? 0;

  const activeTickets = data?.summary.activeTickets ?? 0;

  const checkedIn = data?.summary.checkedIn ?? 0;

  const totalPages = data?.pagination.totalPages ?? 0;

  const eventOptions = metaData?.data.events ?? [];

  const categoryOptions = useMemo(() => {
    const categories = metaData?.data.categories ?? [];

    if (!eventId) {
      return categories;
    }

    return categories.filter((category) => category.eventId === eventId);
  }, [metaData?.data.categories, eventId]);

  function resetFilters() {
    setSearch("");
    setEventId("");
    setCategoryId("");
    setPaymentStatus("");
    setTicketStatus("");
    setCheckInStatus("");
    setRacepackStatus("");
    setPage(1);
  }

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="min-h-screen -m-6 bg-slate-50 p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">
              <Users size={13} />
              Participant Control Center
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Data Peserta
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Kelola peserta, pembayaran, ticket, check-in, dan racepack dari
              satu workspace operasional.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            {isValidating && (
              <>
                <Loader2 size={14} className="animate-spin" />
                Memperbarui data…
              </>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Total Peserta
              </span>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-2 text-orange-600">
                <Users size={17} />
              </div>
            </div>

            <p className="text-3xl font-black text-slate-900">{total}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Ticket Aktif
              </span>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-600">
                <TicketCheck size={17} />
              </div>
            </div>

            <p className="text-3xl font-black text-slate-900">
              {activeTickets}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Sudah Check-In
              </span>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 size={17} />
              </div>
            </div>

            <p className="text-3xl font-black text-slate-900">{checkedIn}</p>
          </div>
        </div>

        {/* Filter panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <Filter size={16} />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Smart Filters
                </h2>
                <p className="text-[11px] text-slate-400">
                  Filter diproses langsung oleh API.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-orange-600 transition-colors hover:text-orange-700"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="relative xl:col-span-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  updateFilter(setSearch, event.target.value)
                }
                placeholder="Cari nama, email, phone, ticket…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <select
              value={eventId}
              onChange={(event) => {
                const nextEventId = event.target.value;

                setEventId(nextEventId);
                setCategoryId("");
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Semua Event</option>

              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            <select
              value={categoryId}
              onChange={(event) =>
                updateFilter(setCategoryId, event.target.value)
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Semua Kategori</option>

              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={paymentStatus}
              onChange={(event) =>
                updateFilter(setPaymentStatus, event.target.value)
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Payment</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <select
              value={ticketStatus}
              onChange={(event) =>
                updateFilter(setTicketStatus, event.target.value)
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Ticket</option>
              <option value="ACTIVE">Active</option>
              <option value="USED">Used</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <select
              value={racepackStatus}
              onChange={(event) =>
                updateFilter(setRacepackStatus, event.target.value)
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Racepack</option>
              <option value="CLAIMED">Diambil</option>
              <option value="UNCLAIMED">Belum Diambil</option>
            </select>

            <select
              value={checkInStatus}
              onChange={(event) =>
                updateFilter(setCheckInStatus, event.target.value)
              }
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
            >
              <option value="">Check-In</option>
              <option value="CHECKED_IN">Checked-In</option>
              <option value="NOT_CHECKED_IN">Belum</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Metadata warning */}
        {metaError && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            <AlertTriangle size={15} />
            Filter event/kategori belum dapat dimuat sepenuhnya.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />

            <div>
              <p className="text-sm font-black">Gagal memuat data peserta</p>

              <p className="mt-1 text-xs text-red-600">{error.message}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && !data ? (
          <div className="flex min-h-105 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Loader2 size={34} className="animate-spin text-orange-500" />

            <p className="mt-4 text-sm font-black text-slate-700">
              Memuat data peserta…
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Menyinkronkan lifecycle peserta.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Daftar Peserta
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {total} enrollment ditemukan
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Clock3 size={14} />
                Server-side pagination
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-275 w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Peserta
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Event
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Payment
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Ticket
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Check-In
                    </th>

                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Racepack
                    </th>

                    <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {participants.length > 0 ? (
                    participants.map((participant) => (
                      <tr
                        key={`${participant.id}:${participant.event.id}`}
                        className="group transition-colors hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-orange-600">
                              {participant.fullName.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">
                                {participant.fullName}
                              </p>

                              <p className="truncate text-xs text-slate-400">
                                {participant.email}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {formatDate(
                                  participant.registration.registeredAt,
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-55 truncate text-sm font-bold text-slate-800">
                            {participant.event.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {participant.order?.orderNumber
                              ? `Order ${participant.order.orderNumber}`
                              : "Belum ada order"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getPaymentClass(participant.payment?.status)}`}
                            >
                              {participant.payment?.status ?? "NO PAYMENT"}
                            </span>

                            {participant.payment && (
                              <p className="text-xs font-bold text-slate-600">
                                {formatRupiah(participant.payment.amount)}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {participant.ticket ? (
                            <div className="space-y-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getTicketClass(participant.ticket.status)}`}
                              >
                                {participant.ticket.status}
                              </span>

                              <p className="text-xs font-bold text-slate-700">
                                {participant.ticket.ticketNumber}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Belum ada ticket
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getCheckInClass(participant.checkIn?.status)}`}
                          >
                            {participant.checkIn?.status ?? "NOT_CHECKED_IN"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                              participant.racepackClaimed
                                ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                            }`}
                          >
                            <PackageCheck size={12} />

                            {participant.racepackClaimed
                              ? "Diambil"
                              : "Belum Diambil"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/participants/${participant.participantEventId}`}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                            <Users size={26} />
                          </div>

                          <h3 className="mt-4 text-sm font-black text-slate-800">
                            Tidak ada peserta
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            Coba ubah pencarian atau filter Anda.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs font-medium text-slate-400">
                Menampilkan halaman{" "}
                <span className="font-black text-slate-700">
                  {data?.pagination.page ?? 1}
                </span>{" "}
                dari{" "}
                <span className="font-black text-slate-700">
                  {totalPages || 1}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-black text-white">
                  {page}
                </span>

                <button
                  type="button"
                  disabled={totalPages === 0 || page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
