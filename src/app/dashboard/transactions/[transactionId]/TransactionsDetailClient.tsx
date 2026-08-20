"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  PackageCheck,
  ScanLine,
  Ticket,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

interface TransactionDetailResponse {
  success: boolean;
  data: {
    transaction: {
      id: string;
      amount: number;
      status: string;
      paymentMethod: string | null;
      externalId: string | null;
      metadata: unknown;
      createdAt: string;
      updatedAt: string;
    };

    organization: {
      id: string;
    };

    event: {
      id: string;
      title: string;
    } | null;

    customer: {
      fullName: string;
      email: string;
      phone: string | null;
    } | null;

    participant: {
      id: string;
      userId: string | null;
      fullName: string;
      email: string;
      phone: string | null;
    } | null;

    order: {
      id: string;
      orderNumber: string;
      status: string;
      approvalStatus: string;
      subtotal: number;
      discountTotal: number;
      addonTotal: number;
      totalPrice: number;
      currency: string;
      isClaimed: boolean;
      expiresAt: string | null;
      paidAt: string | null;
      cancelledAt: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;

    payment: {
      id: string;
      externalId: string;
      provider: string;
      method: string | null;
      status: string;
      amount: number;
      currency: string;
      providerTransactionId: string | null;
      paidAt: string | null;
      expiresAt: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;

    tickets: Array<{
      id: string;
      ticketNumber: string;
      qrCode: string;
      status: string;
      isScanned: boolean;
      issuedAt: string | null;
      checkedInAt: string | null;
      cancelledAt: string | null;
      transferredAt: string | null;
      createdAt: string;
      updatedAt: string;
      category: {
        id: string;
        name: string;
        price: number;
      };
      participant: {
        id: string;
        fullName: string;
        email: string;
      } | null;
      checkIns: Array<{
        id: string;
        status: string;
        gate: string | null;
        notes: string | null;
        checkedInAt: string | null;
      }>;
      scans: Array<{
        id: string;
        result: string;
        message: string | null;
        scannedAt: string;
      }>;
      transfers: Array<{
        id: string;
        fromName: string | null;
        toName: string | null;
        reason: string | null;
        transferredAt: string;
      }>;
    }>;

    operational: {
      ticketCount: number;
      hasActiveTicket: boolean;
      latestCheckIn: {
        id: string;
        status: string;
        gate: string | null;
        notes: string | null;
        checkedInAt: string | null;
      } | null;
      latestScan: {
        id: string;
        result: string;
        message: string | null;
        scannedAt: string;
      } | null;
      latestTransfer: {
        id: string;
        fromName: string | null;
        toName: string | null;
        reason: string | null;
        transferredAt: string;
      } | null;
    };

    timeline: Array<{
      id: string;
      type: string;
      status: string;
      title: string;
      description: string;
      timestamp: string;
    }>;
  };
  error?: string;
}

async function fetcher(
  url: string,
): Promise<TransactionDetailResponse> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload =
    (await response.json()) as TransactionDetailResponse;

  if (!response.ok) {
    throw new Error(
      payload.error ??
        "Gagal mengambil detail transaksi.",
    );
  }

  return payload;
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(
  status?: string,
) {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
    case "PAID":
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PENDING":
    case "PENDING_PAYMENT":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    case "EXPIRED":
      return "border-orange-200 bg-orange-50 text-orange-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function statusLabel(
  status?: string,
) {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
      return "SUCCESS";
    case "PAID":
      return "PAID";
    case "ACTIVE":
      return "ACTIVE";
    case "PENDING":
      return "PENDING";
    case "PENDING_PAYMENT":
      return "MENUNGGU PEMBAYARAN";
    case "FAILED":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return status ?? "—";
  }
}

export default function TransactionsDetailClient({
  transactionId,
}: {
  transactionId: string;
}) {
  const { data, error, isLoading } =
    useSWR<TransactionDetailResponse>(
      `/api/transactions/${transactionId}`,
      fetcher,
      {
        revalidateOnFocus: false,
      },
    );

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Activity
            size={32}
            className="mx-auto animate-pulse text-orange-500"
          />

          <p className="mt-4 text-sm font-black text-slate-700">
            Memuat Transaction 360°…
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Menyinkronkan lifecycle transaksi.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-black text-red-800">
            Gagal memuat transaksi
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error?.message ??
              data?.error ??
              "Data tidak tersedia."}
          </p>

          <Link
            href="/dashboard/transactions"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700"
          >
            <ArrowLeft size={14} />
            Kembali ke Transaksi
          </Link>
        </div>
      </div>
    );
  }

  const {
    transaction,
    event,
    customer,
    participant,
    order,
    payment,
    tickets,
    operational,
    timeline,
  } = data.data;

  const ticket =
    tickets[0] ?? null;

  return (
    <div className="min-h-screen -m-6 bg-slate-50 p-6">
      <div className="mx-auto max-w-[1450px] space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-orange-600"
          >
            <ArrowLeft size={16} />
            Kembali ke Transaksi
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">
                <Activity size={13} />
                Transaction 360°
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                {transaction.id}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {event?.title ?? "Event tidak tersedia"}
              </p>
            </div>

            <span
              className={`inline-flex self-start rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide lg:self-auto ${statusClass(
                transaction.status,
              )}`}
            >
              {statusLabel(
                transaction.status,
              )}
            </span>
          </div>
        </div>

        {/* HERO SUMMARY */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
          <SummaryCard
            title="Nominal Transaksi"
            value={formatCurrency(
              transaction.amount,
            )}
            subtitle={
              transaction.paymentMethod ??
              "Metode tidak tersedia"
            }
            icon={
              <CreditCard
                size={18}
                className="text-orange-500"
              />
            }
          />

          <SummaryCard
            title="Payment"
            value={
              payment?.status ??
              "Tidak tersedia"
            }
            subtitle={
              payment
                ? `${payment.provider} · ${
                    payment.method ?? "—"
                  }`
                : "Belum ada payment"
            }
            icon={
              <CheckCircle2
                size={18}
                className={
                  payment?.status ===
                  "SUCCESS"
                    ? "text-emerald-500"
                    : "text-slate-400"
                }
              />
            }
          />

          <SummaryCard
            title="Order"
            value={
              order?.orderNumber ??
              "Tidak tersedia"
            }
            subtitle={
              order?.status ??
              "—"
            }
            icon={
              <PackageCheck
                size={18}
                className="text-blue-500"
              />
            }
          />

          <SummaryCard
            title="Ticket"
            value={
              ticket?.ticketNumber ??
              "Belum ada ticket"
            }
            subtitle={
              ticket?.status ??
              "—"
            }
            icon={
              <Ticket
                size={18}
                className={
                  operational.hasActiveTicket
                    ? "text-emerald-500"
                    : "text-slate-400"
                }
              />
            }
          />
        </div>

        {/* CUSTOMER + EVENT + PARTICIPANT */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <InfoCard
            title="Customer"
            icon={
              <UserRound
                size={17}
                className="text-orange-500"
              />
            }
          >
            <InfoRow
              label="Nama"
              value={
                customer?.fullName ?? "—"
              }
            />

            <InfoRow
              label="Email"
              value={customer?.email ?? "—"}
            />

            <InfoRow
              label="Telepon"
              value={customer?.phone ?? "—"}
            />
          </InfoCard>

          <InfoCard
            title="Participant"
            icon={
              <UserRound
                size={17}
                className="text-blue-500"
              />
            }
          >
            <InfoRow
              label="Nama"
              value={
                participant?.fullName ??
                "—"
              }
            />

            <InfoRow
              label="Email"
              value={
                participant?.email ??
                "—"
              }
            />

            <InfoRow
              label="Participant ID"
              value={
                participant?.id ??
                "—"
              }
            />
          </InfoCard>

          <InfoCard
            title="Event"
            icon={
              <Activity
                size={17}
                className="text-emerald-500"
              />
            }
          >
            <InfoRow
              label="Event"
              value={event?.title ?? "—"}
            />

            <InfoRow
              label="Event ID"
              value={event?.id ?? "—"}
            />

            <InfoRow
              label="Organization"
              value={
                data.data.organization.id
              }
            />
          </InfoCard>
        </div>

        {/* TRANSACTION + PAYMENT */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <InfoCard
            title="Transaction"
            icon={
              <Activity
                size={17}
                className="text-slate-500"
              />
            }
          >
            <InfoRow
              label="Transaction ID"
              value={transaction.id}
              mono
            />

            <InfoRow
              label="External ID"
              value={
                transaction.externalId ??
                "—"
              }
              mono
            />

            <InfoRow
              label="Status"
              value={
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
                    transaction.status,
                  )}`}
                >
                  {statusLabel(
                    transaction.status,
                  )}
                </span>
              }
            />

            <InfoRow
              label="Dibuat"
              value={formatDate(
                transaction.createdAt,
              )}
            />
          </InfoCard>

          <InfoCard
            title="Payment"
            icon={
              <CreditCard
                size={17}
                className="text-emerald-500"
              />
            }
          >
            <InfoRow
              label="Provider"
              value={payment?.provider ?? "—"}
            />

            <InfoRow
              label="Method"
              value={
                payment?.method ??
                transaction.paymentMethod ??
                "—"
              }
            />

            <InfoRow
              label="Payment Status"
              value={
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
                    payment?.status,
                  )}`}
                >
                  {statusLabel(
                    payment?.status,
                  )}
                </span>
              }
            />

            <InfoRow
              label="Provider Transaction ID"
              value={
                payment?.providerTransactionId ??
                "—"
              }
              mono
            />

            <InfoRow
              label="Paid At"
              value={
                payment?.paidAt
                  ? formatDate(
                      payment.paidAt,
                    )
                  : "—"
              }
            />
          </InfoCard>
        </div>

        {/* ORDER */}
        {order && (
          <InfoCard
            title="Order"
            icon={
              <PackageCheck
                size={17}
                className="text-blue-500"
              />
            }
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoRow
                label="Order Number"
                value={order.orderNumber}
                mono
              />

              <InfoRow
                label="Status"
                value={order.status}
              />

              <InfoRow
                label="Approval"
                value={order.approvalStatus}
              />

              <InfoRow
                label="Total"
                value={formatCurrency(
                  order.totalPrice,
                )}
              />

              <InfoRow
                label="Subtotal"
                value={formatCurrency(
                  order.subtotal,
                )}
              />

              <InfoRow
                label="Discount"
                value={formatCurrency(
                  order.discountTotal,
                )}
              />

              <InfoRow
                label="Addon"
                value={formatCurrency(
                  order.addonTotal,
                )}
              />

              <InfoRow
                label="Racepack"
                value={
                  order.isClaimed
                    ? "Sudah Diambil"
                    : "Belum Diambil"
                }
              />
            </div>
          </InfoCard>
        )}

        {/* TICKET */}
        {ticket && (
          <InfoCard
            title="Ticket"
            icon={
              <Ticket
                size={17}
                className="text-blue-500"
              />
            }
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow
                  label="Ticket Number"
                  value={ticket.ticketNumber}
                  mono
                />

                <InfoRow
                  label="Category"
                  value={ticket.category.name}
                />

                <InfoRow
                  label="Price"
                  value={formatCurrency(
                    ticket.category.price,
                  )}
                />

                <InfoRow
                  label="Status"
                  value={
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
                        ticket.status,
                      )}`}
                    >
                      {statusLabel(
                        ticket.status,
                      )}
                    </span>
                  }
                />

                <InfoRow
                  label="Scanned"
                  value={
                    ticket.isScanned
                      ? "Sudah Scan"
                      : "Belum Scan"
                  }
                />

                <InfoRow
                  label="Issued"
                  value={
                    ticket.issuedAt
                      ? formatDate(
                          ticket.issuedAt,
                        )
                      : "—"
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  QR Code
                </p>

                <p className="mt-3 break-all font-mono text-xs font-bold text-slate-700">
                  {ticket.qrCode}
                </p>

                <a
                  href={`/ticket/${ticket.id}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                >
                  <ExternalLink size={14} />
                  Buka Ticket
                </a>
              </div>
            </div>
          </InfoCard>
        )}

        {/* OPERATIONAL */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <OperationalCard
            title="Ticket"
            value={String(
              operational.ticketCount,
            )}
            subtitle={
              operational.hasActiveTicket
                ? "Ada ticket aktif"
                : "Tidak ada ticket aktif"
            }
            icon={
              <Ticket
                size={18}
                className="text-blue-500"
              />
            }
          />

          <OperationalCard
            title="Check-In"
            value={
              operational.latestCheckIn
                ?.status ??
              "BELUM CHECK-IN"
            }
            subtitle={
              operational.latestCheckIn
                ?.gate
                ? `Gate ${operational.latestCheckIn.gate}`
                : "Belum ada aktivitas check-in"
            }
            icon={
              <ScanLine
                size={18}
                className="text-emerald-500"
              />
            }
          />

          <OperationalCard
            title="Latest Scan"
            value={
              operational.latestScan
                ?.result ??
              "BELUM ADA SCAN"
            }
            subtitle={
              operational.latestScan
                ?.message ??
              "Belum ada aktivitas scan"
            }
            icon={
              <Clock3
                size={18}
                className="text-orange-500"
              />
            }
          />
        </div>

        {/* TIMELINE */}
        <InfoCard
          title="Operational Timeline"
          icon={
            <Clock3
              size={17}
              className="text-slate-500"
            />
          }
        >
          {timeline.length > 0 ? (
            <div className="relative">
              <div className="absolute bottom-4 left-[18px] top-4 w-px bg-slate-200" />

              <div className="relative space-y-6">
                {timeline.map(
                  (item) => (
                    <TimelineItem
                      key={item.id}
                      item={item}
                    />
                  ),
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">
              Belum ada timeline transaksi.
            </div>
          )}
        </InfoCard>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          {icon}
        </div>
      </div>

      <p className="mt-4 min-w-0 break-all text-base font-black leading-6 text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        {icon}

        <h2 className="text-sm font-black text-slate-900">
          {title}
        </h2>
      </div>

      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>

      <span
        className={`break-words text-sm font-bold text-slate-800 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function OperationalCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-base font-black text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function TimelineItem({
  item,
}: {
  item: {
    id: string;
    type: string;
    status: string;
    title: string;
    description: string;
    timestamp: string;
  };
}) {
  const tone =
    item.status === "SUCCESS" ||
    item.status === "PAID" ||
    item.status === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
      : item.status === "FAILED"
        ? "border-red-200 bg-red-50 text-red-600"
        : item.status === "EXPIRED"
          ? "border-orange-200 bg-orange-50 text-orange-600"
          : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <div className="relative flex gap-4">
      <div
        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone}`}
      >
        {item.type ===
        "TICKET_ISSUED" ? (
          <Ticket size={15} />
        ) : item.type ===
          "CHECK_IN" ? (
          <ScanLine size={15} />
        ) : item.type ===
          "PAYMENT_CREATED" ||
          item.type ===
          "PAYMENT_PAID" ? (
          <CreditCard size={15} />
        ) : (
          <Activity size={15} />
        )}
      </div>

      <div className="min-w-0 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-900">
            {item.title}
          </p>

          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${statusClass(
              item.status,
            )}`}
          >
            {statusLabel(item.status)}
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {item.description}
        </p>

        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          {formatDate(
            item.timestamp,
          )}
        </p>
      </div>
    </div>
  );
}
