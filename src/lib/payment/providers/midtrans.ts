import crypto from "node:crypto";

import midtransClient from "midtrans-client";

import {
  PaymentStatus,
} from "@/generated/prisma/client";

import type {
  CreatePaymentInput,
  PaymentNotification,
  PaymentProvider,
  PaymentSession,
  PaymentStatusResult,
} from "../types";

type MidtransNotification = {
  order_id?: unknown;
  transaction_id?: unknown;
  transaction_status?: unknown;
  status_code?: unknown;
  gross_amount?: unknown;
  currency?: unknown;
  fraud_status?: unknown;
  signature_key?: unknown;
  transaction_time?: unknown;
  settlement_time?: unknown;
  expiry_time?: unknown;
  payment_type?: unknown;
  status_message?: unknown;
};

type MidtransTransactionResponse = {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  status_code?: string;
  gross_amount?: string;
  currency?: string;
  fraud_status?: string;
  transaction_time?: string;
  settlement_time?: string;
  expiry_time?: string;
  payment_type?: string;
  status_message?: string;
};

function envBoolean(
  value: string | undefined,
): boolean {
  return value === "true";
}

function requireServerKey(): string {
  const key =
    process.env.MIDTRANS_SERVER_KEY?.trim();

  if (!key) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum dikonfigurasi.",
    );
  }

  return key;
}

function isProduction(): boolean {
  return envBoolean(
    process.env.MIDTRANS_IS_PRODUCTION,
  );
}

function parseAmount(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function toDateOrNull(
  value: unknown,
): Date | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const valueDate =
    new Date(value);

  return Number.isNaN(
    valueDate.getTime(),
  )
    ? null
    : valueDate;
}

function mapTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string,
): PaymentStatus {
  const normalized =
    transactionStatus
      .trim()
      .toLowerCase();

  switch (normalized) {
    case "settlement":
      return PaymentStatus.SUCCESS;

    case "capture":
      if (
        !fraudStatus ||
        fraudStatus.toLowerCase() ===
          "accept"
      ) {
        return PaymentStatus.SUCCESS;
      }

      return PaymentStatus.PENDING;

    case "pending":
    case "authorize":
      return PaymentStatus.PENDING;

    case "expire":
      return PaymentStatus.EXPIRED;

    case "cancel":
      return PaymentStatus.CANCELLED;

    case "deny":
    case "failure":
      return PaymentStatus.FAILED;

    case "refund":
    case "partial_refund":
    case "chargeback":
    case "partial_chargeback":
      return PaymentStatus.REFUNDED;

    default:
      return PaymentStatus.FAILED;
  }
}

export class MidtransProvider
  implements PaymentProvider
{
  readonly name = "MIDTRANS" as const;

  private readonly snap: InstanceType<
    typeof midtransClient.Snap
  >;

  constructor() {
    this.snap =
      new midtransClient.Snap({
        isProduction:
          isProduction(),
        serverKey:
          requireServerKey(),
      });
  }

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<PaymentSession> {
    const parameter = {
      transaction_details: {
        order_id:
          input.externalId,
        gross_amount:
          Math.round(input.amount),
      },

      customer_details:
        input.customer
          ? {
              first_name:
                input.customer.name ??
                undefined,
              email:
                input.customer.email ??
                undefined,
              phone:
                input.customer.phone ??
                undefined,
            }
          : undefined,

      item_details:
        input.items?.map(
          (item) => ({
            id: item.id,
            price:
              Math.round(item.unitPrice),
            quantity: item.quantity,
            name: item.name,
          }),
        ),
    };

    const response =
      await this.snap.createTransaction(
        parameter,
      );

    const token =
      typeof response.token ===
      "string"
        ? response.token
        : null;

    const redirectUrl =
      typeof response.redirect_url ===
      "string"
        ? response.redirect_url
        : null;

    if (!token && !redirectUrl) {
      throw new Error(
        "Midtrans tidak mengembalikan Snap token atau redirect URL.",
      );
    }

    return {
      provider: this.name,
      externalId:
        input.externalId,
      status:
        PaymentStatus.PENDING,
      amount:
        input.amount,
      currency:
        input.currency,
      token,
      checkoutUrl:
        redirectUrl,
      expiresAt:
        input.expiresAt ??
        null,
      providerResponse:
        response,
      metadata: {
        environment:
          isProduction()
            ? "production"
            : "sandbox",
      },
    };
  }

  async getPaymentStatus(
    externalId: string,
  ): Promise<PaymentStatusResult> {
    const response =
      await this.snap.transaction.status(
        externalId,
      ) as MidtransTransactionResponse;

    const transactionStatus =
      typeof response.transaction_status ===
      "string"
        ? response.transaction_status
        : "pending";

    const fraudStatus =
      typeof response.fraud_status ===
      "string"
        ? response.fraud_status
        : undefined;

    return {
      provider: this.name,
      externalId,
      status:
        mapTransactionStatus(
          transactionStatus,
          fraudStatus,
        ),
      providerTransactionId:
        typeof response.transaction_id ===
        "string"
          ? response.transaction_id
          : null,
      paidAt:
        transactionStatus === "settlement" ||
        (
          transactionStatus === "capture" &&
          (
            !fraudStatus ||
            fraudStatus === "accept"
          )
        )
          ? toDateOrNull(
              response.settlement_time ??
                response.transaction_time,
            )
          : null,
      expiresAt:
        toDateOrNull(
          response.expiry_time,
        ),
      providerResponse:
        response,
    };
  }

  async verifyNotification(
    payload: unknown,
    headers?: Headers,
  ): Promise<PaymentNotification> {
    void headers;

    if (
      typeof payload !== "object" ||
      payload === null
    ) {
      throw new Error(
        "Payload Midtrans tidak valid.",
      );
    }

    const body =
      payload as MidtransNotification;

    const orderId =
      typeof body.order_id ===
      "string"
        ? body.order_id.trim()
        : "";

    const statusCode =
      typeof body.status_code ===
      "string"
        ? body.status_code.trim()
        : "";

    const grossAmount =
      typeof body.gross_amount ===
      "string"
        ? body.gross_amount.trim()
        : typeof body.gross_amount ===
            "number"
          ? String(
              body.gross_amount,
            )
          : "";

    const signatureKey =
      typeof body.signature_key ===
      "string"
        ? body.signature_key.trim()
        : "";

    const transactionStatus =
      typeof body.transaction_status ===
      "string"
        ? body.transaction_status.trim()
        : "";

    if (!orderId) {
      throw new Error(
        "Midtrans order_id wajib diisi.",
      );
    }

    if (!statusCode) {
      throw new Error(
        "Midtrans status_code wajib diisi.",
      );
    }

    if (!grossAmount) {
      throw new Error(
        "Midtrans gross_amount wajib diisi.",
      );
    }

    if (!signatureKey) {
      throw new Error(
        "Midtrans signature_key wajib diisi.",
      );
    }

    const serverKey =
      requireServerKey();

    const calculated =
      crypto
        .createHash("sha512")
        .update(
          `${orderId}${statusCode}${grossAmount}${serverKey}`,
          "utf8",
        )
        .digest("hex");

    const expected =
      Buffer.from(
        calculated,
        "utf8",
      );

    const received =
      Buffer.from(
        signatureKey,
        "utf8",
      );

    if (
      expected.length !==
      received.length ||
      !crypto.timingSafeEqual(
        expected,
        received,
      )
    ) {
      throw new Error(
        "Signature Midtrans tidak valid.",
      );
    }

    const fraudStatus =
      typeof body.fraud_status ===
      "string"
        ? body.fraud_status.trim()
        : undefined;

    const currency =
      typeof body.currency ===
      "string"
        ? body.currency.trim()
        : null;

    const amount =
      parseAmount(
        body.gross_amount,
      );

    if (
      amount === null ||
      amount <= 0
    ) {
      throw new Error(
        "Midtrans gross_amount tidak valid.",
      );
    }

    const mappedStatus =
      mapTransactionStatus(
        transactionStatus,
        fraudStatus,
      );

    /*
     * Midtrans merekomendasikan:
     * - status_code 200
     * - fraud_status ACCEPT bila tersedia
     * - capture / settlement sebagai sukses.
     *
     * Kita tetap memetakan status non-success
     * agar expire/cancel/deny juga diproses oleh
     * confirmPayment().
     */
    if (
      mappedStatus ===
      PaymentStatus.SUCCESS
    ) {
      if (statusCode !== "200") {
        throw new Error(
          "Midtrans success notification memiliki status_code bukan 200.",
        );
      }

      if (
        fraudStatus &&
        fraudStatus.toLowerCase() !==
          "accept"
      ) {
        throw new Error(
          "Midtrans success notification memiliki fraud_status yang tidak dapat diterima.",
        );
      }
    }

    const providerTransactionId =
      typeof body.transaction_id ===
      "string"
        ? body.transaction_id
        : null;

    return {
      provider: this.name,
      externalId: orderId,
      status: mappedStatus,
      providerTransactionId,
      amount,
      currency,
      paidAt:
        mappedStatus ===
        PaymentStatus.SUCCESS
          ? toDateOrNull(
              body.settlement_time ??
                body.transaction_time,
            )
          : null,
      expiresAt:
        toDateOrNull(
          body.expiry_time,
        ),
      rawPayload:
        body as PaymentNotification["rawPayload"],
    };
  }
}
