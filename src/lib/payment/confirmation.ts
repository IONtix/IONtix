import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import {
  ApprovalStatus,
  PaymentStatus,
  TicketStatus,
  OrderStatus,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export interface ConfirmPaymentInput {
  externalId: string;
  provider: string;
  status: PaymentStatus;
  providerTransactionId?: string | null;
  amount?: number | null;
  currency?: string | null;
  providerResponse?: unknown;
  paidAt?: Date | null;
  expiresAt?: Date | null;
}

export interface ConfirmPaymentResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  ticketIds: string[];
  alreadyProcessed: boolean;
}

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function createQrCode(): string {
  return `ION-${crypto.randomUUID()}`;
}

function mapOrderStatus(paymentStatus: PaymentStatus): OrderStatus {
  switch (paymentStatus) {
    case PaymentStatus.SUCCESS:
    case PaymentStatus.SETTLEMENT:
    case PaymentStatus.AUTHORIZED:
      return OrderStatus.PAID;

    case PaymentStatus.EXPIRED:
      return OrderStatus.EXPIRED;

    case PaymentStatus.CANCELLED:
      return OrderStatus.CANCELLED;

    case PaymentStatus.REFUNDED:
      return OrderStatus.REFUNDED;

    case PaymentStatus.PARTIALLY_REFUNDED:
      return OrderStatus.PARTIALLY_REFUNDED;

    case PaymentStatus.FAILED:
      return OrderStatus.FAILED;

    case PaymentStatus.PENDING:
    default:
      return OrderStatus.PAYMENT_PROCESSING;
  }
}

export async function confirmPayment(
  input: ConfirmPaymentInput,
): Promise<ConfirmPaymentResult> {
  if (!input.externalId.trim()) {
    throw new Error("externalId wajib diisi.");
  }

  const normalizedStatus =
    input.status === PaymentStatus.SETTLEMENT ||
    input.status === PaymentStatus.AUTHORIZED
      ? PaymentStatus.SUCCESS
      : input.status;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        externalId: input.externalId.trim(),
      },
      include: {
        order: {
          include: {
            ticketCategory: true,
            tickets: true,
          },
        },
        transactions: true,
      },
    });

    if (!payment) {
      throw new Error("Payment tidak ditemukan.");
    }

    if (payment.provider !== input.provider) {
      throw new Error("Provider payment tidak sesuai.");
    }

    if (
      input.amount !== null &&
      input.amount !== undefined &&
      payment.amount !== input.amount
    ) {
      throw new Error("Nominal payment tidak sesuai dengan order.");
    }

    if (input.currency && payment.currency !== input.currency) {
      throw new Error("Currency payment tidak sesuai.");
    }

    /*
     * Idempotency:
     * jika payment sudah pernah menjadi final state yang sama,
     * jangan menerbitkan ticket dua kali.
     */
    const alreadyFinal =
      payment.status === PaymentStatus.SUCCESS &&
      normalizedStatus === PaymentStatus.SUCCESS;

    const order = payment.order;

    if (!order) {
      throw new Error("Order payment tidak ditemukan.");
    }

    const targetOrderStatus = mapOrderStatus(normalizedStatus);

    const paidAt =
      normalizedStatus === PaymentStatus.SUCCESS
        ? (input.paidAt ?? new Date())
        : null;

    if (!alreadyFinal) {
      const updateResult = await tx.payment.updateMany({
        where: {
          id: payment.id,
          /*
           * Hanya status non-final yang boleh
           * berpindah ke status baru melalui handler ini.
           */
          status: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.AUTHORIZED,
              PaymentStatus.SETTLEMENT,
            ],
          },
        },
        data: {
          status: normalizedStatus,
          providerTransactionId:
            input.providerTransactionId ??
            payment.providerTransactionId ??
            null,
          providerResponse: toJsonValue(input.providerResponse),
          paidAt,
          expiresAt: input.expiresAt ?? payment.expiresAt ?? null,
        },
      });

      /*
       * updateMany(... conditional status ...)
       * memberikan guard idempotency terhadap dua
       * notification SUCCESS yang datang bersamaan.
       */
      if (updateResult.count === 0) {
        const latest = await tx.payment.findUnique({
          where: {
            id: payment.id,
          },
          select: {
            status: true,
          },
        });

        if (
          latest?.status !== PaymentStatus.SUCCESS ||
          normalizedStatus !== PaymentStatus.SUCCESS
        ) {
          throw new Error(
            "Status payment berubah oleh proses lain. Silakan coba lagi.",
          );
        }
      }
    }

    const finalPayment = alreadyFinal
      ? payment
      : await tx.payment.findUnique({
          where: {
            id: payment.id,
          },
        });

    if (!finalPayment) {
      throw new Error("Payment gagal dimuat kembali.");
    }

    const latestOrderStatus = targetOrderStatus;

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: latestOrderStatus,
        paidAt:
          normalizedStatus === PaymentStatus.SUCCESS ? paidAt : order.paidAt,
      },
    });

    await tx.transaction.updateMany({
      where: {
        paymentId: payment.id,
      },
      data: {
        status: normalizedStatus,
        externalId: input.externalId,
        paymentMethod: payment.method ? String(payment.method) : null,
        metadata:
          input.providerResponse === undefined
            ? undefined
            : toJsonValue(input.providerResponse),
      },
    });

    let ticketIds: string[] = [];

    /*
     * Ticket hanya diterbitkan ketika payment benar-benar SUCCESS.
     * Untuk kategori dengan approval workflow, payment success
     * belum otomatis berarti ticket dapat diterbitkan.
     */
    if (
      normalizedStatus === PaymentStatus.SUCCESS &&
      (order.approvalStatus === ApprovalStatus.NONE ||
        order.approvalStatus === ApprovalStatus.APPROVED)
    ) {
      const existingTickets = await tx.ticket.findMany({
        where: {
          orderId: order.id,
        },
        select: {
          id: true,
        },
      });

      if (existingTickets.length > 0) {
        ticketIds = existingTickets.map((ticket) => ticket.id);
      } else {
        if (!order.ticketCategory) {
          throw new Error("Kategori tiket order tidak ditemukan.");
        }

        const ticket = await tx.ticket.create({
          data: {
            qrCode: createQrCode(),
            orderId: order.id,
            transactionId: payment.transactions[0]?.id ?? null,
            eventId: order.eventId,
            categoryId: order.ticketCategory.id,
            userId: payment.userId ?? order.buyerUserId ?? null,
            participantId: order.participantId ?? null,
            status: TicketStatus.ACTIVE,
            isScanned: false,
            issuedAt: paidAt ?? new Date(),
            metadata: {
              paymentExternalId: payment.externalId,
              provider: payment.provider,
            },
          },
          select: {
            id: true,
          },
        });

        ticketIds = [ticket.id];
      }
    }

    return {
      success: true,
      paymentId: payment.id,
      orderId: order.id,
      paymentStatus:
        finalPayment.status === PaymentStatus.SUCCESS &&
        normalizedStatus === PaymentStatus.SUCCESS
          ? PaymentStatus.SUCCESS
          : normalizedStatus,
      orderStatus: latestOrderStatus,
      ticketIds,
      alreadyProcessed:
        alreadyFinal ||
        (ticketIds.length > 0 && finalPayment.status === PaymentStatus.SUCCESS),
    };
  });
}
