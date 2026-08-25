import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

import {
  createIontixTestCapability,
} from "@/lib/payment/test-capability";

import TestPaymentActions from "./TestPaymentActions";

interface TestPaymentPageProps {
  params: Promise<{
    externalId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function TestPaymentPage({
  params,
}: TestPaymentPageProps) {
  const { externalId } = await params;

  if (!externalId) {
    notFound();
  }

  const payment = await prisma.payment.findUnique({
    where: {
      externalId,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          fullName: true,
          email: true,
          totalPrice: true,
          currency: true,
          status: true,
          event: {
            select: {
              id: true,
              title: true,
              location: true,
              date: true,
            },
          },
          ticketCategory: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!payment || !payment.order) {
    notFound();
  }

  const safeExternalId =
    payment.externalId ??
    externalId;

  const testCapability =
    createIontixTestCapability(
      safeExternalId,
    );

  const ticketCategoryName = payment.order.ticketCategory?.name ?? "Tiket";


  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: payment.currency,
    maximumFractionDigits: 0,
  }).format(payment.amount);

  const formattedDate = new Date(payment.order.event.date).toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const formattedExpiresAt = payment.expiresAt
    ? new Date(payment.expiresAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href={`/checkout/${payment.order.event.id}`}
            className="text-sm font-semibold text-slate-400 transition-colors hover:text-white"
          >
            ← Kembali ke Checkout
          </Link>

          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            IONTIX TEST PAYMENT
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-800 bg-slate-950/80 px-6 py-6 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
              Simulasi Pembayaran
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Selesaikan Pembayaran
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ini adalah halaman sandbox IONTIX_TEST. Tidak ada uang sungguhan
              yang diproses.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Event
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  {payment.order.event.title}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Kategori
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  {ticketCategoryName}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Peserta
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  {payment.order.fullName}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {payment.order.email}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Total
                </p>

                <p className="mt-1 text-2xl font-black text-emerald-300">
                  {formattedAmount}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Nomor Pesanan
                  </p>

                  <p className="mt-1 font-mono text-xs text-slate-300">
                    {payment.order.orderNumber}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Status
                  </p>

                  <p className="mt-1 text-sm font-bold text-amber-300">
                    {payment.status}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Event Date
                  </p>

                  <p className="mt-1 text-sm text-slate-300">{formattedDate}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Payment Expires
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {formattedExpiresAt}
                  </p>
                </div>
              </div>
            </div>

            <TestPaymentActions
              externalId={safeExternalId}
              capability={testCapability}
              amount={payment.amount}
              currency={payment.currency}
              initialStatus={payment.status}
            />

            <p className="text-center text-[11px] leading-5 text-slate-500">
              Provider: {payment.provider} • Currency: {payment.currency}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
