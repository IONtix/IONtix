"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TestPaymentActionsProps {
  externalId: string;
  amount: number;
  currency: string;
  initialStatus: string;
}

type PaymentActionStatus = "SUCCESS" | "FAILED" | "EXPIRED";

export default function TestPaymentActions({
  externalId,
  amount,
  currency,
  initialStatus,
}: TestPaymentActionsProps) {
  const router = useRouter();

  const [status, setStatus] = useState(initialStatus);
  const [loadingStatus, setLoadingStatus] =
    useState<PaymentActionStatus | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isFinal =
    status === "SUCCESS" || status === "FAILED" || status === "EXPIRED";

  async function confirmPayment(nextStatus: PaymentActionStatus) {
    if (loadingStatus || isFinal) {
      return;
    }

    setLoadingStatus(nextStatus);
    setMessage(null);

    try {
      const response = await fetch("/api/payments/iontix-test/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "IONTIX_TEST",
          externalId,
          status: nextStatus,
          amount,
          currency,
          providerTransactionId: `UI-TEST-${nextStatus}-${Date.now()}`,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          orderId?: string;
          paymentStatus?: string;
          orderStatus?: string;
          ticketIds?: string[];
          alreadyProcessed?: boolean;
        };
      };

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error ?? "Pembayaran gagal diproses.");
      }

      setStatus(data.data.paymentStatus ?? nextStatus);

      if (nextStatus === "SUCCESS") {
        const ticketId = data.data.ticketIds?.[0];

        setMessage({
          type: "success",
          text: ticketId
            ? "Pembayaran berhasil. E-ticket berhasil diterbitkan."
            : "Pembayaran berhasil diproses.",
        });

        if (ticketId) {
          window.setTimeout(() => {
            router.push(`/ticket/${ticketId}`);
          }, 900);
          return;
        }

        return;
      }

      setMessage({
        type: nextStatus === "FAILED" ? "error" : "success",
        text:
          nextStatus === "FAILED"
            ? "Pembayaran ditandai gagal."
            : "Pembayaran ditandai kedaluwarsa.",
      });
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses pembayaran.",
      });
    } finally {
      setLoadingStatus(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
          Mode Sandbox
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Pilih hasil simulasi pembayaran untuk menguji lifecycle IONTIX tanpa
          gateway eksternal.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            message.type === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/20 bg-rose-400/10 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => confirmPayment("SUCCESS")}
          disabled={Boolean(loadingStatus) || isFinal}
          className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingStatus === "SUCCESS"
            ? "Memproses Pembayaran..."
            : "Simulasikan Pembayaran Berhasil"}
        </button>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => confirmPayment("FAILED")}
            disabled={Boolean(loadingStatus) || isFinal}
            className="w-full rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-3.5 text-sm font-bold text-rose-300 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "FAILED" ? "Memproses..." : "Simulasikan Gagal"}
          </button>

          <button
            type="button"
            onClick={() => confirmPayment("EXPIRED")}
            disabled={Boolean(loadingStatus) || isFinal}
            className="w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 text-sm font-bold text-amber-300 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "EXPIRED"
              ? "Memproses..."
              : "Simulasikan Kedaluwarsa"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          Status Payment
        </p>
        <p className="mt-1 text-lg font-black text-white">{status}</p>
      </div>
    </div>
  );
}
