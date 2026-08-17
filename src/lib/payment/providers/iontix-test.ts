import { PaymentStatus } from "@/generated/prisma/client";

import type {
  CreatePaymentInput,
  PaymentNotification,
  PaymentProvider,
  PaymentSession,
  PaymentStatusResult,
} from "../types";

const payments = new Map<
  string,
  {
    input: CreatePaymentInput;
    status: PaymentStatus;
    createdAt: Date;
    expiresAt: Date | null;
  }
>();

export class IontixTestProvider implements PaymentProvider {
  readonly name = "IONTIX_TEST" as const;

  async createPayment(input: CreatePaymentInput): Promise<PaymentSession> {
    const now = new Date();

    const expiresAt =
      input.expiresAt ?? new Date(now.getTime() + 30 * 60 * 1000);

    payments.set(input.externalId, {
      input,
      status: PaymentStatus.PENDING,
      createdAt: now,
      expiresAt,
    });

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
    const payment = payments.get(externalId);

    if (!payment) {
      return {
        provider: this.name,
        externalId,
        status: PaymentStatus.FAILED,
      };
    }

    return {
      provider: this.name,
      externalId,
      status: payment.status,
      paidAt:
        payment.status === PaymentStatus.SUCCESS ? payment.createdAt : null,
      expiresAt: payment.expiresAt,
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
     * PENTING:
     * verifyNotification TIDAK mengubah status payment.
     *
     * Status database baru boleh berubah setelah
     * confirmPayment() memvalidasi:
     * - provider
     * - amount
     * - currency
     * - payment yang sesuai
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
