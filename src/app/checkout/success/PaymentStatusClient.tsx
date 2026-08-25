"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type TicketSnapshot = {
  id: string;
  ticketNumber: string;
  status: string;
  issuedAt?: string | null;
};

type PaymentSnapshot = {
  id: string;
  status: string;
  externalId: string | null;
  expiresAt: string | null;
};

export type PaymentStatusOrderSnapshot = {
  id: string;
  orderNumber: string;
  status: string;
  totalPrice: number;
  currency: string;
  fullName: string | null;
  email: string | null;
  ticketCategory?: {
    id: string;
    name: string;
    event: {
      id: string;
      title: string;
    };
  } | null;
  payments: PaymentSnapshot[];
  tickets: TicketSnapshot[];
};

type Props = {
  initialOrder: PaymentStatusOrderSnapshot;
};

type RetryResponse = {
  success?: boolean;
  error?: string;
  data?: {
    orderId: string;
    externalId: string;
    provider: string;
    status: string;
    checkoutUrl: string | null;
    token: string | null;
    expiresAt: string | null;
  };
};

const POLL_INTERVAL_MS = 3_000;
const POLL_WINDOW_MS = 60_000;

function isTerminalOrderStatus(status: string): boolean {
  return [
    "FAILED",
    "EXPIRED",
    "CANCELLED",
    "PAID",
  ].includes(status);
}

function hasActiveTicket(order: PaymentStatusOrderSnapshot): boolean {
  return order.tickets.some(
    (ticket) => ticket.status === "ACTIVE",
  );
}

function getPresentation(order: PaymentStatusOrderSnapshot) {
  if (
    order.status === "PAID" &&
    hasActiveTicket(order)
  ) {
    return {
      icon: "✓",
      title: "Pembayaran Berhasil",
      description:
        "Pembayaran Anda telah dikonfirmasi dan E-Ticket sudah tersedia.",
      tone:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (order.status === "PAID") {
    return {
      icon: "…",
      title: "Tiket Sedang Diterbitkan",
      description:
        "Pembayaran sudah berhasil. Sistem sedang memastikan E-Ticket tersedia.",
      tone:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (
    order.status === "PENDING_PAYMENT" ||
    order.status === "PAYMENT_PROCESSING"
  ) {
    return {
      icon: "…",
      title: "Menunggu Pembayaran",
      description:
        "Sistem masih menunggu konfirmasi pembayaran Anda.",
      tone:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (order.status === "FAILED") {
    return {
      icon: "!",
      title: "Pembayaran Gagal",
      description:
        "Pembayaran belum berhasil diproses.",
      tone:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (order.status === "EXPIRED") {
    return {
      icon: "⌛",
      title: "Pembayaran Kedaluwarsa",
      description:
        "Batas waktu pembayaran telah berakhir.",
      tone:
        "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  if (order.status === "CANCELLED") {
    return {
      icon: "×",
      title: "Pesanan Dibatalkan",
      description:
        "Pesanan ini sudah dibatalkan.",
      tone:
        "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  return {
    icon: "i",
    title: "Memeriksa Status",
    description:
      "Sistem sedang memeriksa status pembayaran.",
    tone:
      "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function formatCurrency(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: currency || "IDR",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

export default function PaymentStatusClient({
  initialOrder,
}: Props) {
  const [order, setOrder] =
    useState<PaymentStatusOrderSnapshot>(
      initialOrder,
    );

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isPolling, setIsPolling] =
    useState(
      !isTerminalOrderStatus(initialOrder.status) ||
        (
          initialOrder.status === "PAID" &&
          !hasActiveTicket(initialOrder)
        ),
    );

  const [pollElapsed, setPollElapsed] =
    useState(0);

  const [refreshMessage, setRefreshMessage] =
    useState<string | null>(null);

  const [retrying, setRetrying] =
    useState(false);

  const requestInFlight =
    useRef(false);

  const pollStartedAt =
    useRef<number | null>(null);

  const refreshOrder = useCallback(
    async (): Promise<boolean> => {
      if (requestInFlight.current) {
        return false;
      }

      requestInFlight.current = true;
      setIsRefreshing(true);
      setRefreshMessage(null);

      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(order.id)}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          },
        );

        const data =
          (await response.json()) as
            | PaymentStatusOrderSnapshot
            | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Status pesanan tidak dapat diperbarui.",
          );
        }

        setOrder(
          data as PaymentStatusOrderSnapshot,
        );

        const nextOrder =
          data as PaymentStatusOrderSnapshot;

        const terminal =
          isTerminalOrderStatus(
            nextOrder.status,
          );

        const ticketReady =
          nextOrder.status === "PAID" &&
          hasActiveTicket(nextOrder);

        if (
          terminal &&
          ticketReady
        ) {
          setIsPolling(false);
        }

        return true;
      } catch (error) {
        setRefreshMessage(
          error instanceof Error
            ? error.message
            : "Gagal memperbarui status.",
        );

        return false;
      } finally {
        requestInFlight.current = false;
        setIsRefreshing(false);
      }
    },
    [order.id],
  );

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    pollStartedAt.current =
      Date.now();

    const firstRun =
      window.setTimeout(() => {
        void refreshOrder();
      }, 0);

    const interval =
      window.setInterval(() => {
        const startedAt =
          pollStartedAt.current ??
          Date.now();

        const elapsed =
          Date.now() - startedAt;

        setPollElapsed(elapsed);

        if (
          elapsed >=
          POLL_WINDOW_MS
        ) {
          window.clearInterval(
            interval,
          );
          setIsPolling(false);
          return;
        }

        void refreshOrder();
      }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(
        firstRun,
      );
      window.clearInterval(
        interval,
      );
    };
  }, [isPolling, refreshOrder]);

  const handleManualRefresh =
    async () => {
      setPollElapsed(0);
      await refreshOrder();

      const currentOrder =
        order;

      if (
        !isTerminalOrderStatus(
          currentOrder.status,
        ) ||
        (
          currentOrder.status === "PAID" &&
          !hasActiveTicket(currentOrder)
        )
      ) {
        setIsPolling(true);
      }
    };

  const handleRetryPayment =
    async () => {
      if (retrying) {
        return;
      }

      setRetrying(true);
      setRefreshMessage(null);

      try {
        const response =
          await fetch(
            `/api/orders/${encodeURIComponent(
              order.id,
            )}/payment/retry`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials: "include",
            },
          );

        const data =
          (await response.json()) as RetryResponse;

        if (
          !response.ok ||
          !data.success ||
          !data.data
        ) {
          throw new Error(
            data.error ??
              "Sesi pembayaran belum dapat dibuat ulang.",
          );
        }

        setRefreshMessage(
          "Sesi pembayaran berhasil dibuat ulang.",
        );

        if (
          data.data.checkoutUrl
        ) {
          window.location.assign(
            data.data.checkoutUrl,
          );
          return;
        }

        await refreshOrder();
      } catch (error) {
        setRefreshMessage(
          error instanceof Error
            ? error.message
            : "Gagal membuat ulang sesi pembayaran.",
        );
      } finally {
        setRetrying(false);
      }
    };

  const presentation =
    getPresentation(order);

  const activeTicket =
    order.tickets.find(
      (ticket) =>
        ticket.status ===
        "ACTIVE",
    );

  const latestPayment =
    order.payments[0] ?? null;

  const pollingSeconds =
    Math.min(
      60,
      Math.floor(
        pollElapsed / 1000,
      ),
    );

  return (
    <div className="space-y-5">
      <div
        className={`rounded-3xl border p-6 shadow-md ${presentation.tone}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-xl font-black">
            {presentation.icon}
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {presentation.title}
            </h1>

            <p className="mt-2 text-sm leading-6">
              {presentation.description}
            </p>

            {isPolling && (
              <p className="mt-3 text-xs font-semibold opacity-80">
                Memeriksa status otomatis…
                {" "}
                {pollingSeconds}s / 60s
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-md">
        <div className="space-y-4">

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Event
            </p>
            <p className="mt-1 text-lg font-black">
              {order.ticketCategory?.event.title ??
                "Event IONtix"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Order
              </p>
              <p className="mt-1 font-mono text-sm font-bold">
                {order.orderNumber}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-sm font-black">
                {order.status}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total
              </span>

              <span className="text-xl font-black">
                {formatCurrency(
                  order.totalPrice,
                  order.currency,
                )}
              </span>
            </div>
          </div>

          {latestPayment && (
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Payment
              </p>

              <p className="mt-1 text-sm font-bold">
                {latestPayment.status}
              </p>

              {latestPayment.externalId && (
                <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                  {latestPayment.externalId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {order.status === "PAID" &&
        activeTicket && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              E-TICKET TERSEDIA
            </p>

            <p className="mt-2 font-mono text-sm font-black text-emerald-900">
              {activeTicket.ticketNumber}
            </p>

            <Link
              href={`/ticket/${activeTicket.id}`}
              className="mt-4 block"
            >
              <Button className="w-full font-bold">
                Lihat E-Ticket
              </Button>
            </Link>
          </div>
        )}

      {order.status === "PAID" &&
        !activeTicket && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-black text-amber-900">
              Tiket sedang diterbitkan
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-700">
              Pembayaran sudah berhasil, tetapi tiket belum tersedia.
              Sistem akan memeriksa kembali secara otomatis.
            </p>
          </div>
        )}

      {order.status !== "PAID" &&
        order.status !== "FAILED" &&
        order.status !== "EXPIRED" &&
        order.status !== "CANCELLED" && (
          <Button
            type="button"
            onClick={handleManualRefresh}
            disabled={
              isRefreshing
            }
            variant="outline"
            className="w-full font-bold"
          >
            {isRefreshing
              ? "Memeriksa..."
              : "Periksa Status Sekarang"}
          </Button>
        )}

      {(order.status === "FAILED" ||
        order.status === "PENDING_PAYMENT" ||
        order.status === "PAYMENT_PROCESSING") && (
        <Button
          type="button"
          onClick={handleRetryPayment}
          disabled={retrying}
          className="w-full font-bold"
        >
          {retrying
            ? "Menyiapkan Pembayaran..."
            : "Coba Bayar Lagi"}
        </Button>
      )}

      {refreshMessage && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            {refreshMessage}
          </p>
        </div>
      )}
    </div>
  );
}
