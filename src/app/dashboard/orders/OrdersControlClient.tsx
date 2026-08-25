"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  PackageCheck,
  RefreshCw,
  Search,
  Ticket,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

interface EventOption {
  id: string;
  title: string;
}

interface OrderTicket {
  id: string;
  ticketNumber: string;
  status: string;
  participantId: string | null;
  category: {
    id: string;
    name: string;
  };
}

interface OrderRow {
  id: string;
  orderNumber: string;

  customer: {
    fullName: string;
    email: string;
    phone: string;
  };

  event: {
    id: string;
    title: string;
  };

  participant: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;

  amount: {
    subtotal: number;
    discountTotal: number;
    addonTotal: number;
    totalPrice: number;
    currency: string;
  };

  status: string;
  statusLabel: string;
  approvalStatus: string;
  isClaimed: boolean;

  createdAt: string;
  paidAt: string | null;

  ticket: OrderTicket | null;
}

interface OrdersResponse {
  success: boolean;

  data: OrderRow[];

  summary: {
    total: number;
    paid: number;
    pendingPayment: number;
    paymentProcessing: number;
    expired: number;
    failed: number;
    cancelled: number;
    refunded: number;
    partiallyRefunded: number;
    ticketIssued: number;
    racepackClaimed: number;
    totalAmount: number;
    paidAmount: number;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  error?: string;
}

interface OrdersMetaResponse {
  success: boolean;

  data: {
    events: EventOption[];
    orderStatuses: string[];
    approvalStatuses: string[];
  };

  error?: string;
}

const ORGANIZATION_ID =
  "cmsvr15xc000z49jatsfbfi3c";

const PAGE_SIZE = 25;

async function fetcher<T>(
  url: string,
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload =
    (await response.json()) as T & {
      error?: string;
    };

  if (!response.ok) {
    throw new Error(
      payload.error ??
        "Gagal mengambil data.",
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
  switch (
    status?.toUpperCase()
  ) {
    case "PAID":
    case "ACTIVE":
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PENDING":
    case "PENDING_PAYMENT":
    case "PAYMENT_PROCESSING":
    case "NONE":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "EXPIRED":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "CANCELLED":
      return "border-slate-300 bg-slate-100 text-slate-600";

    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function orderStatusLabel(
  status?: string,
) {
  switch (
    status?.toUpperCase()
  ) {
    case "DRAFT":
      return "DRAFT";

    case "PENDING_PAYMENT":
      return "MENUNGGU PEMBAYARAN";

    case "PAYMENT_PROCESSING":
      return "PEMBAYARAN DIPROSES";

    case "PAID":
      return "PAID";

    case "EXPIRED":
      return "EXPIRED";

    case "CANCELLED":
      return "DIBATALKAN";

    case "REFUNDED":
      return "REFUNDED";

    case "PARTIALLY_REFUNDED":
      return "REFUND SEBAGIAN";

    case "FAILED":
      return "FAILED";

    default:
      return status ?? "—";
  }
}

function approvalLabel(
  status?: string,
) {
  switch (
    status?.toUpperCase()
  ) {
    case "APPROVED":
      return "APPROVED";

    case "REJECTED":
      return "REJECTED";

    case "PENDING":
      return "PENDING";

    case "NONE":
      return "NONE";

    default:
      return status ?? "—";
  }
}

export default function OrdersControlClient() {
  const [search, setSearch] =
    useState("");
  const [eventId, setEventId] =
    useState("");
  const [status, setStatus] =
    useState("");
  const [approvalStatus, setApprovalStatus] =
    useState("");
  const [page, setPage] =
    useState(1);

  const queryString = useMemo(() => {
    const params =
      new URLSearchParams();

    params.set(
      "organizationId",
      ORGANIZATION_ID,
    );

    params.set(
      "page",
      String(page),
    );

    params.set(
      "pageSize",
      String(PAGE_SIZE),
    );

    if (search.trim()) {
      params.set(
        "search",
        search.trim(),
      );
    }

    if (eventId) {
      params.set(
        "eventId",
        eventId,
      );
    }

    if (status) {
      params.set(
        "status",
        status,
      );
    }

    if (approvalStatus) {
      params.set(
        "approvalStatus",
        approvalStatus,
      );
    }

    return params.toString();
  }, [
    approvalStatus,
    eventId,
    page,
    search,
    status,
  ]);

  const {
    data,
    error,
    isLoading,
    isValidating,
  } = useSWR<OrdersResponse>(
    `/api/orders?${queryString}`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const {
    data: metaData,
    error: metaError,
  } =
    useSWR<OrdersMetaResponse>(
      `/api/orders/meta?organizationId=${ORGANIZATION_ID}`,
      fetcher,
      {
        revalidateOnFocus: false,
      },
    );

  const orders =
    data?.data ?? [];

  const summary =
    data?.summary ?? {
      total: 0,
      paid: 0,
      pendingPayment: 0,
      paymentProcessing: 0,
      expired: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
      partiallyRefunded: 0,
      ticketIssued: 0,
      racepackClaimed: 0,
      totalAmount: 0,
      paidAmount: 0,
    };

  const pagination =
    data?.pagination ?? {
      page: 1,
      pageSize: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    };

  const events =
    metaData?.data.events ??
    [];

  const orderStatuses =
    metaData?.data.orderStatuses ??
    [];

  const approvalStatuses =
    metaData?.data.approvalStatuses ??
    [];

  const hasFilters =
    Boolean(search) ||
    Boolean(eventId) ||
    Boolean(status) ||
    Boolean(approvalStatus);

  function resetFilters() {
    setSearch("");
    setEventId("");
    setStatus("");
    setApprovalStatus("");
    setPage(1);
  }

  return (
    <div className="min-h-screen -m-6 bg-slate-50 p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">
              <PackageCheck size={13} />
              Commerce & Fulfillment
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Order Control Center
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Kelola pesanan dari
              registrasi hingga ticket dan
              racepack dalam satu workspace
              operasional.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* ERROR */}
        {(error ||
          metaError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="mt-0.5 text-red-600"
              />

              <div>
                <p className="text-sm font-black text-red-800">
                  Gagal memuat Order Control Center
                </p>

                <p className="mt-1 text-xs text-red-600">
                  {error?.message ??
                    metaError?.message ??
                    "Data tidak tersedia."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
          <KpiCard
            label="Total Order"
            value={String(summary.total)}
            icon={
              <PackageCheck
                size={17}
                className="text-slate-500"
              />
            }
          />

          <KpiCard
            label="Paid"
            value={String(summary.paid)}
            icon={
              <CheckCircle2
                size={17}
                className="text-emerald-500"
              />
            }
          />

          <KpiCard
            label="Pending Payment"
            value={String(
              summary.pendingPayment,
            )}
            icon={
              <Clock3
                size={17}
                className="text-amber-500"
              />
            }
          />

          <KpiCard
            label="Ticket Issued"
            value={String(
              summary.ticketIssued,
            )}
            icon={
              <Ticket
                size={17}
                className="text-blue-500"
              />
            }
          />

          <KpiCard
            label="Racepack Claimed"
            value={String(
              summary.racepackClaimed,
            )}
            icon={
              <PackageCheck
                size={17}
                className="text-emerald-500"
              />
            }
          />

          <KpiCard
            label="Expired"
            value={String(
              summary.expired,
            )}
            icon={
              <Clock3
                size={17}
                className="text-orange-500"
              />
            }
          />

          <KpiCard
            label="Failed"
            value={String(
              summary.failed,
            )}
            icon={
              <AlertCircle
                size={17}
                className="text-red-500"
              />
            }
          />
        </div>

        {/* VALUE SUMMARY */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Total Nilai Order
              </p>

              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {formatCurrency(
                  summary.totalAmount,
                )}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold text-slate-400">
                Nilai Order Paid
              </p>

              <p className="mt-1 text-sm font-black text-emerald-600">
                {formatCurrency(
                  summary.paidAmount,
                )}
              </p>
            </div>
          </div>
        </div>

        {/* FILTER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter
                size={17}
                className="text-orange-500"
              />

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Filter Order
                </h2>

                <p className="text-[11px] text-slate-400">
                  Fokus pada status order dan
                  fulfillment.
                </p>
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 transition hover:text-orange-700"
              >
                <X size={14} />
                Reset
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(340px,2fr)_repeat(3,minmax(180px,1fr))]">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value,
                  );
                  setPage(1);
                }}
                placeholder="Cari order, customer, participant..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <SelectField
              value={eventId}
              onChange={(value) => {
                setEventId(value);
                setPage(1);
              }}
              placeholder="Semua Event"
              options={events.map(
                (event) => ({
                  value: event.id,
                  label: event.title,
                }),
              )}
            />

            <SelectField
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              placeholder="Order Status"
              options={orderStatuses.map(
                (item) => ({
                  value: item,
                  label:
                    orderStatusLabel(
                      item,
                    ),
                }),
              )}
            />

            <SelectField
              value={approvalStatus}
              onChange={(value) => {
                setApprovalStatus(
                  value,
                );
                setPage(1);
              }}
              placeholder="Approval Status"
              options={approvalStatuses.map(
                (item) => ({
                  value: item,
                  label:
                    approvalLabel(
                      item,
                    ),
                }),
              )}
            />
          </div>

          {(isLoading ||
            isValidating) && (
            <div className="mt-3 text-[11px] font-bold text-slate-400">
              Memperbarui data order…
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Daftar Order
              </h2>

              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {pagination.total} order ditemukan
              </p>
            </div>

            <span className="hidden text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 md:block">
              Order & Fulfillment
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <TableHeader>
                    Order
                  </TableHeader>

                  <TableHeader>
                    Customer
                  </TableHeader>

                  <TableHeader>
                    Participant
                  </TableHeader>

                  <TableHeader>
                    Event
                  </TableHeader>

                  <TableHeader align="right">
                    Amount
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader>
                    Fulfillment
                  </TableHeader>

                  <TableHeader align="right">
                    Waktu
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {isLoading &&
                orders.length === 0 ? (
                  <LoadingRows />
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-16 text-center"
                    >
                      <PackageCheck
                        size={30}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-black text-slate-600">
                        Tidak ada order
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Coba ubah filter
                        pencarian.
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.map(
                    (order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                      />
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-400">
              {pagination.total === 0
                ? "0 order"
                : `Menampilkan ${
                    (pagination.page -
                      1) *
                      pagination.pageSize +
                    1
                  }–${Math.min(
                    pagination.page *
                      pagination.pageSize,
                    pagination.total,
                  )} dari ${
                    pagination.total
                  } order`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  pagination.page <=
                  1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        current - 1,
                        1,
                      ),
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              <span className="min-w-24 text-center text-xs font-black text-slate-600">
                Page{" "}
                {pagination.page} /{" "}
                {Math.max(
                  pagination.totalPages,
                  1,
                )}
              </span>

              <button
                type="button"
                disabled={
                  pagination.totalPages ===
                    0 ||
                  pagination.page >=
                    pagination.totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      current + 1,
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          {icon}
        </div>
      </div>

      <p className="mt-4 break-words text-xl font-black tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-4 text-${align} text-[10px] font-black uppercase tracking-[0.12em] text-slate-400`}
    >
      {children}
    </th>
  );
}

function SelectField({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value,
        )
      }
      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
    >
      <option value="">
        {placeholder}
      </option>

      {options.map(
        (option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ),
      )}
    </select>
  );
}

function OrderRow({
  order,
}: {
  order: OrderRow;
}) {
  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50/80">
      <td className="px-5 py-4 align-top">
        <div className="min-w-[180px]">
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="font-mono text-[11px] font-black text-slate-900 transition hover:text-orange-600"
          >
            {order.orderNumber}
          </Link>

          <p className="mt-1 font-mono text-[10px] text-slate-400">
            {order.id}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[180px]">
          <p className="text-sm font-black text-slate-900">
            {order.customer.fullName}
          </p>

          <p className="mt-1 truncate text-xs text-slate-400">
            {order.customer.email}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[165px]">
          {order.participant ? (
            <>
              <p className="text-sm font-black text-slate-900">
                {
                  order
                    .participant
                    .fullName
                }
              </p>

              <p className="mt-1 truncate text-xs text-slate-400">
                {
                  order
                    .participant
                    .email
                }
              </p>
            </>
          ) : (
            <span className="text-xs font-semibold text-slate-400">
              Tidak terhubung
            </span>
          )}
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[180px]">
          <p className="text-sm font-black text-slate-900">
            {order.event.title}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 text-right align-top">
        <p className="whitespace-nowrap text-sm font-black text-slate-900">
          {formatCurrency(
            order.amount.totalPrice,
          )}
        </p>

        {order.amount.addonTotal >
          0 && (
          <p className="mt-1 whitespace-nowrap text-[10px] font-semibold text-slate-400">
            Add-on{" "}
            {formatCurrency(
              order.amount
                .addonTotal,
            )}
          </p>
        )}
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[145px]">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(
              order.status,
            )}`}
          >
            {order.statusLabel}
          </span>

          <div className="mt-2">
            <span
              className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusClass(
                order.approvalStatus,
              )}`}
            >
              Approval{" "}
              {approvalLabel(
                order.approvalStatus,
              )}
            </span>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[170px] space-y-2">
          <FulfillmentLine
            icon={
              <Ticket
                size={13}
              />
            }
            label="Ticket"
            value={
              order.ticket
                ? order.ticket
                    .status
                : "BELUM"
            }
            tone={
              order.ticket
                ? "success"
                : "muted"
            }
          />

          <FulfillmentLine
            icon={
              <PackageCheck
                size={13}
              />
            }
            label="Racepack"
            value={
              order.isClaimed
                ? "SUDAH DIAMBIL"
                : "BELUM DIAMBIL"
            }
            tone={
              order.isClaimed
                ? "success"
                : "muted"
            }
          />
        </div>
      </td>

      <td className="px-5 py-4 text-right align-top">
        <p className="whitespace-nowrap text-xs font-black text-slate-700">
          {formatDate(
            order.createdAt,
          )}
        </p>

        {order.paidAt && (
          <p className="mt-1 whitespace-nowrap text-[10px] font-semibold text-emerald-600">
            Paid{" "}
            {formatDate(
              order.paidAt,
            )}
          </p>
        )}
      </td>
    </tr>
  );
}

function FulfillmentLine({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "success" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600">
        {icon}
        <span>{label}</span>
      </div>

      <span
        className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <tr
          key={index}
          className="border-b border-slate-100"
        >
          {Array.from({
            length: 8,
          }).map(
            (_, cellIndex) => (
              <td
                key={cellIndex}
                className="px-5 py-5"
              >
                <div className="h-4 animate-pulse rounded bg-slate-100" />
              </td>
            ),
          )}
        </tr>
      ))}
    </>
  );
}
