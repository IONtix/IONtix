import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { PaymentStatus } from "@/generated/prisma/client";

import { paymentService, PaymentProviderError } from "@/lib/payment";

import { registerPaymentProviders } from "@/lib/payment/providers";

import { confirmPayment } from "@/lib/payment/confirmation";

export async function POST(request: Request) {
  try {
    /*
     * IONTIX_TEST hanya untuk development/sandbox.
     * Jangan expose endpoint ini sebagai payment endpoint
     * produksi.
     */
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "IONTIX_TEST payment confirmation tidak tersedia di production.",
        },
        { status: 404 },
      );
    }

    registerPaymentProviders();

    const body = (await request.json()) as {
      externalId?: unknown;
      status?: unknown;
      providerTransactionId?: unknown;
      amount?: unknown;
      currency?: unknown;
      providerResponse?: unknown;
    };

    const externalId =
      typeof body.externalId === "string" ? body.externalId.trim() : "";

    const requestedStatus = typeof body.status === "string" ? body.status : "";

    if (!externalId) {
      return NextResponse.json(
        {
          error: "externalId wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (requestedStatus !== PaymentStatus.SUCCESS) {
      return NextResponse.json(
        {
          error: "Endpoint test confirmation hanya menerima status SUCCESS.",
        },
        { status: 400 },
      );
    }

    const notification = await paymentService.verifyNotification(
      "IONTIX_TEST",
      {
        externalId,
        status: PaymentStatus.SUCCESS,
        providerTransactionId:
          typeof body.providerTransactionId === "string"
            ? body.providerTransactionId
            : `TEST-TX-${crypto.randomUUID()}`,
        amount: typeof body.amount === "number" ? body.amount : undefined,
        currency: typeof body.currency === "string" ? body.currency : undefined,
        providerResponse: body.providerResponse ?? {
          mode: "development",
        },
      },
    );

    const result = await confirmPayment({
      externalId: notification.externalId,
      provider: notification.provider,
      status: notification.status,
      providerTransactionId: notification.providerTransactionId,
      amount: notification.amount,
      currency: notification.currency,
      providerResponse: notification.rawPayload,
      paidAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: result.alreadyProcessed
          ? "Payment sudah diproses sebelumnya."
          : "Payment berhasil dikonfirmasi.",
        data: result,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("IONTIX_TEST payment confirmation error:", error);

    if (error instanceof PaymentProviderError) {
      return NextResponse.json(
        {
          error: error.message,
          provider: error.provider,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengonfirmasi pembayaran.",
      },
      { status: 500 },
    );
  }
}
