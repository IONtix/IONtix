"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  History,
  Loader2,
  PackageCheck,
  Printer,
  ScanLine,
  Ticket,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

interface DetailResponse {
  success: boolean;

  data: {
    participantEvent: {
      id: string;
      registeredAt: string;
      approvalStatus: string;
    };

    participant: {
      id: string;
      userId: string | null;
      fullName: string;
      email: string;
      phone: string;
      dateOfBirth: string | null;
      gender: string | null;
      bloodType: string | null;
      emergencyContact: unknown;
      profilePhotoUrl: string | null;
      createdAt: string;
      updatedAt: string;
    };

    event: {
      id: string;
      title: string;
    };

    operational: {
      latestOrder: {
        id: string;
        orderNumber: string;
        status: string;
        approvalStatus: string;
        totalPrice: number;
        currency: string;
        createdAt: string;
      } | null;

      operationalOrder: {
        id: string;
        orderNumber: string;
        status: string;
        totalPrice: number;
        currency: string;
        createdAt: string;
      } | null;

      payment: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        paidAt: string | null;
        createdAt: string;
      } | null;

      ticket: {
        id: string;
        ticketNumber: string;
        qrCode: string;
        status: string;
        isScanned: boolean;
        issuedAt: string | null;
        checkedInAt: string | null;
        category: {
          id: string;
          name: string;
          price: number;
        };
        order: {
          id: string;
          orderNumber: string;
          status: string;
          isClaimed: boolean;
        } | null;
      } | null;

      checkIn: {
        id: string;
        status: string;
        gate: string | null;
        notes: string | null;
        checkedInAt: string | null;
        createdAt: string;
      } | null;

      racepackClaimed: boolean;
    };

    histories: {
      orders: Array<{
        id: string;
        orderNumber: string;
        status: string;
        totalPrice: number;
        currency: string;
        createdAt: string;
        paidAt: string | null;
      }>;

      payments: Array<{
        id: string;
        status: string;
        amount: number;
        currency: string;
        paidAt: string | null;
        createdAt: string;
        orderNumber: string;
      }>;

      transactions: Array<{
        id: string;
        amount: number;
        status: string;
        paymentMethod: string | null;
        createdAt: string;
        orderNumber: string;
      }>;

      tickets: Array<{
        id: string;
        ticketNumber: string;
        qrCode: string;
        status: string;
        issuedAt: string | null;
        createdAt: string;
        category: {
          name: string;
        };
      }>;

      checkIns: Array<{
        id: string;
        ticketNumber: string;
        status: string;
        gate: string | null;
        checkedInAt: string | null;
        createdAt: string;
      }>;

      scans: Array<{
        id: string;
        ticketNumber: string;
        result: string;
        message: string | null;
        scannedAt: string;
      }>;

      transfers: Array<{
        id: string;
        ticketNumber: string;
        fromName: string | null;
        toName: string | null;
        reason: string | null;
        transferredAt: string;
      }>;
    };
  };

  error?: string;
}

async function fetcher(url: string): Promise<DetailResponse> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload = (await response.json()) as DetailResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Gagal memuat detail peserta.");
  }

  return payload;
}

function formatCurrency(value: number) {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status?: string) {
  switch (status) {
    case "PAID":
    case "SUCCESS":
    case "ACTIVE":
    case "CHECKED_IN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PENDING":
    case "PENDING_PAYMENT":
    case "AUTHORIZED":
    case "NOT_CHECKED_IN":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "PAID":
      return "PAID";
    case "SUCCESS":
      return "SUCCESS";
    case "ACTIVE":
      return "ACTIVE";
    case "CHECKED_IN":
      return "SUDAH CHECK-IN";
    case "NOT_CHECKED_IN":
      return "BELUM CHECK-IN";
    case "PENDING":
      return "PENDING";
    case "PENDING_PAYMENT":
      return "MENUNGGU PEMBAYARAN";
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "FAILED":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    case "CANCELLED":
      return "CANCELLED";
    case "REJECTED":
      return "DITOLAK";
    default:
      return status ?? "—";
  }
}

interface TimelineItemData {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  tone: "orange" | "green" | "red" | "blue" | "slate";
  icon: ReactNode;
}

export default function ParticipantsDetailClient({
  participantEventId,
}: {
  participantEventId: string;
}) {
  const [copied, setCopied] = useState(false);

  const { data, error, isLoading } = useSWR<DetailResponse>(
    `/api/participants/${participantEventId}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={34} className="mx-auto animate-spin text-orange-500" />

          <p className="mt-4 text-sm font-black text-slate-700">
            Memuat Participant 360°…
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Menyinkronkan data operasional peserta.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-black">Gagal memuat peserta</p>

          <p className="mt-1 text-sm">
            {error?.message ?? data?.error ?? "Data tidak tersedia."}
          </p>

          <Link
            href="/dashboard/participants"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700"
          >
            <ArrowLeft size={14} />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const { participantEvent, participant, event, operational, histories } =
    data.data;

  async function copyQr() {
    if (!operational.ticket) {
      return;
    }

    try {
      await navigator.clipboard.writeText(operational.ticket.qrCode);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  }

  function printTicket() {
    window.print();
  }

  const timeline: TimelineItemData[] = [
    {
      id: `registration-${participantEvent.id}`,
      title: "Participant Registered",
      subtitle: event.title,
      date: participantEvent.registeredAt,
      tone: "orange" as const,
      icon: <UserRound size={15} />,
    },

    ...histories.orders.map(
      (order): TimelineItemData => ({
        id: `order-${order.id}`,
        title: `Order ${order.status}`,
        subtitle: order.orderNumber,
        date: order.createdAt,
        tone:
          order.status === "PAID"
            ? ("green" as const)
            : order.status === "FAILED"
              ? ("red" as const)
              : ("slate" as const),
        icon: <CreditCard size={15} />,
      }),
    ),

    ...histories.payments.map(
      (payment): TimelineItemData => ({
        id: `payment-${payment.id}`,
        title: `Payment ${payment.status}`,
        subtitle: `${payment.orderNumber} · ${formatCurrency(payment.amount)}`,
        date: payment.createdAt,
        tone:
          payment.status === "SUCCESS"
            ? ("green" as const)
            : payment.status === "FAILED"
              ? ("red" as const)
              : ("slate" as const),
        icon: <CreditCard size={15} />,
      }),
    ),

    ...histories.tickets.map(
      (ticket): TimelineItemData => ({
        id: `ticket-${ticket.id}`,
        title: `Ticket ${ticket.status}`,
        subtitle: `${ticket.ticketNumber} · ${ticket.category.name}`,
        date: ticket.issuedAt ?? ticket.createdAt,
        tone: "blue" as const,
        icon: <Ticket size={15} />,
      }),
    ),

    ...histories.checkIns.map(
      (checkIn): TimelineItemData => ({
        id: `checkin-${checkIn.id}`,
        title: `Check-In ${checkIn.status}`,
        subtitle: checkIn.gate ? `Gate ${checkIn.gate}` : checkIn.ticketNumber,
        date: checkIn.checkedInAt ?? checkIn.createdAt,
        tone: "green" as const,
        icon: <ScanLine size={15} />,
      }),
    ),

    ...histories.scans.map(
      (scan): TimelineItemData => ({
        id: `scan-${scan.id}`,
        title: `Scan ${scan.result}`,
        subtitle: scan.message ?? scan.ticketNumber,
        date: scan.scannedAt,
        tone: "slate" as const,
        icon: <ScanLine size={15} />,
      }),
    ),

    ...histories.transfers.map(
      (transfer): TimelineItemData => ({
        id: `transfer-${transfer.id}`,
        title: "Ticket Transfer",
        subtitle: `${transfer.fromName ?? "—"} → ${transfer.toName ?? "—"}`,
        date: transfer.transferredAt,
        tone: "slate" as const,
        icon: <Ticket size={15} />,
      }),
    ),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="participant-360-page -m-6 min-h-screen bg-slate-50 p-6 print:m-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-375 space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/dashboard/participants"
            className="print-hidden inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-orange-600"
          >
            <ArrowLeft size={16} />
            Kembali ke Data Peserta
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">
                <UserRound size={13} />
                Participant 360°
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                {participant.fullName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {participant.email}
                {" · "}
                {event.title}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusChip
                label="Order Terbaru"
                value={operational.latestOrder?.status ?? "—"}
              />

              <StatusChip
                label="Ticket"
                value={operational.ticket?.status ?? "NONE"}
              />

              <StatusChip
                label="Check-In"
                value={operational.checkIn?.status ?? "NOT_CHECKED_IN"}
              />
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <SummaryCard
            label="Registration"
            icon={<UserRound size={17} className="text-orange-500" />}
            primary={formatDate(participantEvent.registeredAt)}
            secondary={`Approval ${participantEvent.approvalStatus}`}
          />

          <SummaryCard
            label="Order yang Menghasilkan Ticket"
            icon={<CreditCard size={17} className="text-emerald-500" />}
            primary={operational.operationalOrder?.orderNumber ?? "Belum ada"}
            secondary={
              operational.operationalOrder
                ? `${formatCurrency(
                    operational.operationalOrder.totalPrice,
                  )} · Sumber ticket aktif`
                : "Belum ada ticket-bearing order"
            }
          />

          <SummaryCard
            label="Ticket"
            icon={<Ticket size={17} className="text-blue-500" />}
            primary={operational.ticket?.ticketNumber ?? "Belum ada"}
            secondary={operational.ticket?.category.name ?? "—"}
          />

          <SummaryCard
            label="Racepack"
            icon={
              <PackageCheck
                size={17}
                className={
                  operational.racepackClaimed
                    ? "text-cyan-600"
                    : "text-slate-400"
                }
              />
            }
            primary={
              operational.racepackClaimed ? "Sudah Diambil" : "Belum Diambil"
            }
            secondary="Status operasional"
          />
        </div>

        {/* TICKET + CHECK-IN */}
        {operational.ticket && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Ticket & QR
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    {operational.ticket.ticketNumber}
                  </h2>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${statusClass(
                    operational.ticket.status,
                  )}`}
                >
                  {operational.ticket.status}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    QR Identifier
                  </p>

                  <p className="mt-2 break-all font-mono text-sm font-bold text-slate-800">
                    {operational.ticket.qrCode}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 print-hidden">
                    <button
                      type="button"
                      onClick={copyQr}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
                    >
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}

                      {copied ? "Tersalin" : "Salin QR"}
                    </button>

                    <button
                      type="button"
                      onClick={printTicket}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-orange-600"
                    >
                      <Printer size={14} />
                      Cetak Ticket
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5">
                  <QRCodeSVG
                    value={operational.ticket.qrCode}
                    size={170}
                    level="H"
                    includeMargin
                  />

                  <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Scan untuk validasi ticket
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Check-In
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-600">
                    Status
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusClass(
                      operational.checkIn?.status ?? "NOT_CHECKED_IN",
                    )}`}
                  >
                    {statusLabel(
                      operational.checkIn?.status ?? "NOT_CHECKED_IN",
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-600">Gate</span>

                  <span className="text-sm font-black text-slate-900">
                    {operational.checkIn?.gate ?? "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-600">
                    Waktu
                  </span>

                  <span className="text-right text-sm font-black text-slate-900">
                    {operational.checkIn?.checkedInAt
                      ? formatDate(operational.checkIn.checkedInAt)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <HistoryCard
            title="Riwayat Order"
            icon={<History size={17} className="text-orange-500" />}
          >
            {histories.orders.length > 0 ? (
              histories.orders.map((order) => (
                <HistoryRow
                  key={order.id}
                  title={order.orderNumber}
                  date={order.createdAt}
                  status={order.status}
                  amount={order.totalPrice}
                />
              ))
            ) : (
              <EmptyHistory text="Belum ada riwayat order." />
            )}
          </HistoryCard>

          <HistoryCard
            title="Riwayat Payment"
            icon={<CreditCard size={17} className="text-emerald-500" />}
          >
            {histories.payments.length > 0 ? (
              histories.payments.map((payment) => (
                <HistoryRow
                  key={payment.id}
                  title={payment.orderNumber}
                  date={payment.createdAt}
                  status={payment.status}
                  amount={payment.amount}
                />
              ))
            ) : (
              <EmptyHistory text="Belum ada riwayat payment." />
            )}
          </HistoryCard>
        </div>

        {/* TIMELINE */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock3 size={17} className="text-slate-500" />

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Operational Timeline
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  Seluruh lifecycle peserta dalam satu urutan waktu.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {timeline.length > 0 ? (
              <div className="relative">
                <div className="absolute bottom-3 left-4.5 top-3 w-px bg-slate-200" />

                <div className="relative space-y-6">
                  {timeline.map((item) => (
                    <TimelineItem
                      key={item.id}
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      date={item.date}
                      tone={item.tone}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyHistory text="Belum ada aktivitas." />
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .participant-360-page {
            background: white !important;
          }

          .print-hidden {
            display: none !important;
          }

          .participant-360-page .shadow-sm {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  label,
  icon,
  primary,
  secondary,
}: {
  label: string;
  icon: ReactNode;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
          {label}
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          {icon}
        </div>
      </div>

      <p className="mt-4 wrap-break-word text-sm font-black text-slate-900">
        {primary}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-400">{secondary}</p>
    </div>
  );
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>

      <span
        className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(
          value,
        )}`}
      >
        {statusLabel(value)}
      </span>
    </div>
  );
}

function HistoryCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-black text-slate-900">{title}</h2>
        </div>
      </div>

      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function HistoryRow({
  title,
  date,
  status,
  amount,
}: {
  title: string;
  date: string;
  status: string;
  amount: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-900">{title}</p>

        <p className="mt-1 text-xs text-slate-400">{formatDate(date)}</p>
      </div>

      <div className="shrink-0 text-right">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
            status,
          )}`}
        >
          {status}
        </span>

        <p className="mt-2 text-xs font-bold text-slate-700">
          {formatCurrency(amount)}
        </p>
      </div>
    </div>
  );
}

function EmptyHistory({ text }: { text: string }) {
  return (
    <div className="px-5 py-8 text-center text-xs font-semibold text-slate-400">
      {text}
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  subtitle,
  date,
  tone,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  date: string;
  tone: "orange" | "green" | "red" | "blue" | "slate";
}) {
  const toneClass = {
    orange: "border-orange-200 bg-orange-50 text-orange-600",
    green: "border-emerald-200 bg-emerald-50 text-emerald-600",
    red: "border-red-200 bg-red-50 text-red-600",
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
  }[tone];

  return (
    <div className="relative flex gap-4">
      <div
        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${toneClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-black text-slate-900">{title}</p>

        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>

        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          {formatDate(date)}
        </p>
      </div>
    </div>
  );
}
