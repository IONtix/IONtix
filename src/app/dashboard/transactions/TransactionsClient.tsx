"use client";

import useSWR from "swr";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  RefreshCw,
  Search,
  Ticket,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

interface EventOption {
  id: string;
  title: string;
}

interface TransactionItem {
  id: string;
  amount: number;
  status: string;
  statusLabel: string;
  paymentMethod: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;

  order: {
    id: string;
    orderNumber: string;
    status: string;
    approvalStatus: string;
    totalPrice: number;

    customer: {
      fullName: string;
      email: string;
    };

    event: {
      id: string;
      title: string;
    };

  } | null;

  payment: {
    provider: string;
    method: string | null;
    status: string;
    currency: string;
    paidAt: string | null;
  } | null;

  runner: {
    id: string;
    name: string;
    email: string;
  } | null;

  tickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    participantId: string | null;
    category: {
      id: string;
      name: string;
    };
  }>;
}

interface TransactionsResponse {
  success: boolean;
  data: TransactionItem[];

  summary: {
    total: number;
    success: number;
    pending: number;
    failed: number;
    expired: number;
    totalAmount: number;
    successfulAmount: number;
  };

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  error?: string;
}

interface TransactionsMetaResponse {
  success: boolean;
  data: {
    events: EventOption[];
    providers: string[];
    paymentMethods: string[];
    transactionStatuses: string[];
    paymentStatuses: string[];
  };
  error?: string;
}

const ORGANIZATION_ID =
  "cmsvr15xc000z49jatsfbfi3c";

const DEFAULT_PAGE_SIZE = 25;

async function fetcher<T>(
  url: string,
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const payload = (await response.json()) as T & {
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

    case "PENDING":
      return "PENDING";

    case "FAILED":
      return "FAILED";

    case "EXPIRED":
      return "EXPIRED";

    default:
      return status ?? "—";
  }
}

export default function TransactionsClient() {
  const [search, setSearch] =
    useState("");

  const [eventId, setEventId] =
    useState("");

  const [paymentStatus, setPaymentStatus] =
    useState("");

  const [
    transactionStatus,
    setTransactionStatus,
  ] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [provider, setProvider] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

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
      String(pageSize),
    );

    if (search.trim()) {
      params.set(
        "search",
        search.trim(),
      );
    }

    if (eventId) {
      params.set("eventId", eventId);
    }

    if (paymentStatus) {
      params.set(
        "paymentStatus",
        paymentStatus,
      );
    }

    if (transactionStatus) {
      params.set(
        "transactionStatus",
        transactionStatus,
      );
    }

    if (paymentMethod) {
      params.set(
        "paymentMethod",
        paymentMethod,
      );
    }

    if (provider) {
      params.set(
        "provider",
        provider,
      );
    }

    return params.toString();
  }, [
    eventId,
    page,
    pageSize,
    paymentMethod,
    paymentStatus,
    provider,
    search,
    transactionStatus,
  ]);

  const {
    data,
    error,
    isLoading,
    isValidating,
  } = useSWR<TransactionsResponse>(
    `/api/transactions?${queryString}`,
    (url) =>
      fetcher<TransactionsResponse>(
        url,
      ),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const {
    data: metaData,
    error: metaError,
  } =
    useSWR<TransactionsMetaResponse>(
      `/api/transactions/meta?organizationId=${ORGANIZATION_ID}`,
      (url) =>
        fetcher<TransactionsMetaResponse>(
          url,
        ),
      {
        revalidateOnFocus: false,
      },
    );

  const transactions =
    data?.data ?? [];

  const summary = data?.summary ?? {
    total: 0,
    success: 0,
    pending: 0,
    failed: 0,
    expired: 0,
    totalAmount: 0,
    successfulAmount: 0,
  };

  const pagination =
    data?.pagination ?? {
      page: 1,
      pageSize,
      total: 0,
      totalPages: 0,
    };

  const events =
    metaData?.data.events ?? [];

  const providers =
    metaData?.data.providers ?? [];

  const paymentMethods =
    metaData?.data.paymentMethods ?? [];

  const paymentStatuses =
    metaData?.data.paymentStatuses ?? [];

  const transactionStatuses =
    metaData?.data
      .transactionStatuses ?? [];

  function resetFilters() {
    setSearch("");
    setEventId("");
    setPaymentStatus("");
    setTransactionStatus("");
    setPaymentMethod("");
    setProvider("");
    setPage(1);
  }

  const hasFilters =
    Boolean(search) ||
    Boolean(eventId) ||
    Boolean(paymentStatus) ||
    Boolean(transactionStatus) ||
    Boolean(paymentMethod) ||
    Boolean(provider);

  return (
    <div className="min-h-screen -m-6 bg-slate-50 p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-700">
              <Activity size={13} />
              Finance Operations
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Transaction Control Center
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Pantau transaksi, pembayaran,
              customer, event, dan ticket
              dalam satu workspace operasional.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* ERROR */}
        {(error || metaError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="mt-0.5 text-red-600"
              />

              <div>
                <p className="text-sm font-black text-red-800">
                  Gagal memuat Transaction Control Center
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            label="Total Transaksi"
            value={String(summary.total)}
            icon={
              <Activity
                size={17}
                className="text-slate-500"
              />
            }
          />

          <KpiCard
            label="Berhasil"
            value={String(summary.success)}
            icon={
              <CheckCircle2
                size={17}
                className="text-emerald-500"
              />
            }
          />

          <KpiCard
            label="Pending"
            value={String(summary.pending)}
            icon={
              <Clock3
                size={17}
                className="text-amber-500"
              />
            }
          />

          <KpiCard
            label="Failed"
            value={String(summary.failed)}
            icon={
              <AlertCircle
                size={17}
                className="text-red-500"
              />
            }
          />

          <KpiCard
            label="Expired"
            value={String(summary.expired)}
            icon={
              <Clock3
                size={17}
                className="text-orange-500"
              />
            }
          />

          <KpiCard
            label="Pendapatan Berhasil"
            value={formatCurrency(
              summary.successfulAmount,
            )}
            icon={
              <CreditCard
                size={17}
                className="text-blue-500"
              />
            }
          />
        </div>

        {/* TOTAL VALUE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Total Nilai Transaksi
              </p>

              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {formatCurrency(
                  summary.totalAmount,
                )}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold text-slate-400">
                Pendapatan Berhasil
              </p>

              <p className="mt-1 text-sm font-black text-emerald-600">
                {formatCurrency(
                  summary.successfulAmount,
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

              <h2 className="text-sm font-black text-slate-900">
                Filter Transaksi
              </h2>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 transition hover:text-orange-700"
              >
                <X size={14} />
                Reset
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(260px,2fr)_repeat(5,minmax(135px,1fr))]">
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
                placeholder="Cari transaction, order, customer..."
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
              value={paymentStatus}
              onChange={(value) => {
                setPaymentStatus(value);
                setPage(1);
              }}
              placeholder="Payment Status"
              options={paymentStatuses.map(
                (status) => ({
                  value: status,
                  label: statusLabel(status),
                }),
              )}
            />

            <SelectField
              value={transactionStatus}
              onChange={(value) => {
                setTransactionStatus(
                  value,
                );
                setPage(1);
              }}
              placeholder="Transaction Status"
              options={transactionStatuses.map(
                (status) => ({
                  value: status,
                  label: statusLabel(status),
                }),
              )}
            />

            <SelectField
              value={paymentMethod}
              onChange={(value) => {
                setPaymentMethod(value);
                setPage(1);
              }}
              placeholder="Payment Method"
              options={paymentMethods.map(
                (method) => ({
                  value: method,
                  label: method,
                }),
              )}
            />

            <SelectField
              value={provider}
              onChange={(value) => {
                setProvider(value);
                setPage(1);
              }}
              placeholder="Provider"
              options={providers.map(
                (item) => ({
                  value: item,
                  label: item,
                }),
              )}
            />
          </div>

          {(isLoading ||
            isValidating) && (
            <div className="mt-3 text-[11px] font-bold text-slate-400">
              Memperbarui data transaksi…
            </div>
          )}

          {!metaData && !metaError && (
            <div className="mt-3 text-[11px] font-bold text-slate-400">
              Memuat opsi filter…
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Transaction
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Event
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Ticket
                  </th>

                  <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Waktu
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading &&
                transactions.length === 0 ? (
                  <LoadingRows />
                ) : transactions.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <Activity
                        size={30}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-black text-slate-600">
                        Tidak ada transaksi
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Coba ubah filter pencarian.
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map(
                    (transaction) => (
                      <TransactionRow
                        key={
                          transaction.id
                        }
                        transaction={
                          transaction
                        }
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
                ? "0 transaksi"
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
                  } transaksi`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  pagination.page <= 1
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
  icon: React.ReactNode;
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

function SelectField({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
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
        onChange(event.target.value)
      }
      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100"
    >
      <option value="">
        {placeholder}
      </option>

      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: TransactionItem;
}) {
  const ticket =
    transaction.tickets[0] ?? null;

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50/80">
      <td className="px-5 py-4 align-top">
        <div className="min-w-[210px]">
          <p className="font-mono text-[11px] font-black text-slate-900">
            {transaction.id}
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            {transaction.externalId ??
              "No external ID"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[190px]">
          <p className="text-sm font-black text-slate-900">
            {transaction.order
              ?.customer.fullName ??
              transaction.runner?.name ??
              "—"}
          </p>

          <p className="mt-1 truncate text-xs text-slate-400">
            {transaction.order
              ?.customer.email ??
              transaction.runner?.email ??
              "—"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[180px]">
          <p className="text-sm font-black text-slate-900">
            {transaction.order
              ?.event.title ?? "—"}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            {transaction.order
              ?.orderNumber ?? "—"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 text-right align-top">
        <p className="text-sm font-black text-slate-900">
          {formatCurrency(
            transaction.amount,
          )}
        </p>

        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {transaction.payment
            ?.currency ?? "IDR"}
        </p>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[150px]">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(
              transaction.status,
            )}`}
          >
            {statusLabel(
              transaction.status,
            )}
          </span>

          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <CreditCard size={13} />

            <span>
              {transaction.payment
                ?.method ??
                transaction.paymentMethod ??
                "—"}
            </span>
          </div>

          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            {transaction.payment
              ?.provider ?? "—"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4 align-top">
        <div className="min-w-[150px]">
          {ticket ? (
            <>
              <div className="flex items-center gap-2">
                <Ticket
                  size={14}
                  className="text-blue-500"
                />

                <p className="text-xs font-black text-slate-900">
                  {ticket.ticketNumber}
                </p>
              </div>

              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                {ticket.category.name}
              </p>

              <span
                className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusClass(
                  ticket.status,
                )}`}
              >
                {ticket.status}
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold text-slate-400">
              Belum ada ticket
            </span>
          )}
        </div>
      </td>

      <td className="px-5 py-4 text-right align-top">
        <p className="whitespace-nowrap text-xs font-black text-slate-700">
          {formatDate(
            transaction.createdAt,
          )}
        </p>

        {transaction.payment
          ?.paidAt && (
          <p className="mt-1 whitespace-nowrap text-[10px] font-semibold text-emerald-600">
            Paid{" "}
            {formatDate(
              transaction.payment
                .paidAt,
            )}
          </p>
        )}
      </td>
    </tr>
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
            length: 7,
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
