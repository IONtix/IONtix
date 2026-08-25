import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { PaymentStatus } from "@/generated/prisma/client";

import { paymentService, PaymentProviderError } from "@/lib/payment";

import { registerPaymentProviders } from "@/lib/payment/providers";

import { confirmPayment } from "@/lib/payment/confirmation";
import {
  isIontixTestHttpEnabled,
} from "@/lib/payment/test-mode";

import {
  verifyIontixTestCapability,
} from "@/lib/payment/test-capability";

export async function POST(request: Request) {
  try {
    /*
     * Endpoint HTTP IONTIX_TEST harus diaktifkan secara
     * eksplisit. NODE_ENV non-production saja tidak cukup
     * karena preview/staging dapat tetap publicly accessible.
     */
    if (
      !isIontixTestHttpEnabled()
    ) {
      return NextResponse.json(
        {
          error:
            "IONTIX_TEST HTTP endpoint tidak diaktifkan.",
        },
        { status: 404 },
      );
    }

    registerPaymentProviders();

    const body = (await request.json()) as {
      provider?: unknown;
      externalId?: unknown;
      capability?: unknown;
      status?: unknown;
      providerTransactionId?: unknown;
      amount?: unknown;
      currency?: unknown;
      providerResponse?: unknown;
      expiresAt?: unknown;
    };

    const provider =
      typeof body.provider === "string" ? body.provider.trim() : "IONTIX_TEST";

    const externalId =
      typeof body.externalId === "string"
        ? body.externalId.trim()
        : "";

    const capability =
      typeof body.capability === "string"
        ? body.capability.trim()
        : "";

    const requestedStatus =
      typeof body.status === "string"
        ? body.status
        : "";

    if (!externalId) {
      return NextResponse.json(
        {
          error:
            "externalId wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (
      !capability ||
      !verifyIontixTestCapability(
        capability,
        externalId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Sandbox capability tidak valid.",
        },
        { status: 403 },
      );
    }

    const amount = typeof body.amount === "number" ? body.amount : undefined;

    const currency =
      typeof body.currency === "string" ? body.currency : undefined;

    /*
     * Untuk test provider mismatch, provider harus
     * benar-benar dikirim oleh request.
     */
    if (provider !== "IONTIX_TEST") {
      return NextResponse.json(
        {
          error: `Provider "${provider}" tidak didukung oleh endpoint IONTIX_TEST.`,
        },
        { status: 400 },
      );
    }

    const supportedStatuses = Object.values(PaymentStatus);

    if (!supportedStatuses.includes(requestedStatus as PaymentStatus)) {
      return NextResponse.json(
        {
          error: "Status payment tidak valid.",
        },
        { status: 400 },
      );
    }

    const requestedPaymentStatus = requestedStatus as PaymentStatus;

    if (
      requestedPaymentStatus === PaymentStatus.SUCCESS &&
      (amount === undefined || !Number.isFinite(amount) || amount <= 0)
    ) {
      return NextResponse.json(
        {
          error: "Amount wajib diisi untuk status SUCCESS.",
        },
        { status: 400 },
      );
    }

    if (requestedPaymentStatus === PaymentStatus.SUCCESS && !currency) {
      return NextResponse.json(
        {
          error: "Currency wajib diisi untuk status SUCCESS.",
        },
        { status: 400 },
      );
    }

    const notification = await paymentService.verifyNotification(
      "IONTIX_TEST",
      {
        externalId,
        status: requestedPaymentStatus,
        providerTransactionId:
          typeof body.providerTransactionId === "string"
            ? body.providerTransactionId
            : `TEST-TX-${crypto.randomUUID()}`,
        amount,
        currency,
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
      paidAt:
        requestedPaymentStatus === PaymentStatus.SUCCESS ? new Date() : null,
      expiresAt:
        typeof body.expiresAt === "string" ? new Date(body.expiresAt) : null,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.alreadyProcessed
          ? "Payment sudah diproses sebelumnya."
          : "Payment berhasil diproses.",
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
            : "Gagal memproses pembayaran.",
      },
      { status: 500 },
    );
  }
}
