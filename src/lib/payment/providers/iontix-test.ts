import { PaymentStatus } from "@/generated/prisma/client";

import type {
  CreatePaymentInput,
  PaymentNotification,
  PaymentProvider,
  PaymentSession,
  PaymentStatusResult,
} from "../types";

export class IontixTestProvider implements PaymentProvider {
  readonly name = "IONTIX_TEST" as const;

  async createPayment(input: CreatePaymentInput): Promise<PaymentSession> {
    const expiresAt = input.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000);

    return {
      provider: this.name,
      externalId: input.externalId,
      status: PaymentStatus.PENDING,
      amount: input.amount,
      currency: input.currency,
      checkoutUrl: `/checkout/test/${input.externalId}`,
      token: input.externalId,
      expiresAt,
      metadata: {
        mode: "development",
      },
    };
  }

  async getPaymentStatus(externalId: string): Promise<PaymentStatusResult> {
    /*
     * IONTIX_TEST tidak menyimpan state payment
     * di memory. Source of truth ada di database.
     *
     * Status query aktual ditangani oleh layer
     * payment persistence/confirmation.
     */
    return {
      provider: this.name,
      externalId,
      status: PaymentStatus.PENDING,
      paidAt: null,
      expiresAt: null,
    };
  }

  async verifyNotification(payload: unknown): Promise<PaymentNotification> {
    if (typeof payload !== "object" || payload === null) {
      throw new Error("Payload payment notification tidak valid.");
    }

    const body = payload as Record<string, unknown>;

    const externalId =
      typeof body.externalId === "string" ? body.externalId.trim() : "";

    const statusValue = typeof body.status === "string" ? body.status : "";

    const amount = typeof body.amount === "number" ? body.amount : null;

    const currency = typeof body.currency === "string" ? body.currency : null;

    if (!externalId) {
      throw new Error("externalId wajib diisi.");
    }

    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount payment wajib diisi dan harus valid.");
    }

    if (!currency) {
      throw new Error("Currency payment wajib diisi.");
    }

    const status = Object.values(PaymentStatus).includes(
      statusValue as PaymentStatus,
    )
      ? (statusValue as PaymentStatus)
      : PaymentStatus.FAILED;

    /*
     * Provider test TIDAK mengubah state.
     *
     * confirmPayment() adalah satu-satunya layer
     * yang mengubah state database setelah validasi.
     */
    return {
      provider: this.name,
      externalId,
      status,
      amount,
      currency,
      providerTransactionId:
        typeof body.providerTransactionId === "string"
          ? body.providerTransactionId
          : null,
      rawPayload: body as PaymentNotification["rawPayload"],
    };
  }
}
