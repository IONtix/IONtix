import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  ApprovalStatus,
  OrderStatus,
  PaymentStatus,
  TicketStatus,
  Prisma,
} from "@/generated/prisma/client";
import {
  ticketStatusForPaymentLifecycle,
} from "@/lib/ticket/lifecycle";

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

  return prisma.$transaction(
    async (tx) => {
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

      const order = payment.order;

      if (!order) {
        throw new Error("Order payment tidak ditemukan.");
      }

      /*
       * Idempotency:
       * SUCCESS yang sudah final tidak boleh menerbitkan ticket kedua.
       */
      const alreadyFinal =
        payment.status === PaymentStatus.SUCCESS &&
        normalizedStatus === PaymentStatus.SUCCESS;

      const targetOrderStatus = mapOrderStatus(normalizedStatus);

      const paidAt =
        normalizedStatus === PaymentStatus.SUCCESS
          ? (input.paidAt ?? new Date())
          : null;

      if (!alreadyFinal) {
        const isPostPaymentRefundTransition =
          normalizedStatus === PaymentStatus.REFUNDED ||
          normalizedStatus === PaymentStatus.PARTIALLY_REFUNDED;

        /*
         * Refund / partial refund adalah transisi sah
         * setelah payment SUCCESS.
         *
         * State lain tetap tidak boleh menurunkan payment
         * SUCCESS karena stale callback protection.
         */
        const allowedStatuses = [
          PaymentStatus.PENDING,
          PaymentStatus.AUTHORIZED,
          PaymentStatus.SETTLEMENT,
          ...(isPostPaymentRefundTransition
            ? [PaymentStatus.SUCCESS]
            : []),
        ];

        const updateResult =
          await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: {
                in: allowedStatuses,
              },
            },
            data: {
              status: normalizedStatus,
              providerTransactionId:
                input.providerTransactionId ??
                payment.providerTransactionId ??
                null,
              providerResponse: toJsonValue(
                input.providerResponse,
              ),
              paidAt,
              expiresAt:
                input.expiresAt ??
                payment.expiresAt ??
                null,
            },
          });

        /*
         * Jika tidak ada row yang berubah, cek apakah payment
         * sudah diproses oleh request lain atau callback yang sama
         * sudah pernah diterapkan.
         */
        if (updateResult.count === 0) {
          const latest = await tx.payment.findUnique({
            where: {
              id: payment.id,
            },
            select: {
              id: true,
              status: true,
              amount: true,
              externalId: true,
              paidAt: true,
            },
          });

          if (!latest) {
            throw new Error("Payment gagal dimuat kembali.");
          }

          /*
           * Stale callback protection:
           *
           * Jika payment sudah SUCCESS tetapi provider mengirim
           * callback lama seperti PENDING / FAILED / CANCELLED /
           * EXPIRED, callback tersebut tidak boleh menurunkan
           * state payment yang sudah final.
           *
           * REFUNDED dan PARTIALLY_REFUNDED tetap diproses karena
           * keduanya merupakan transisi pasca-pembayaran yang valid.
           */
          const isStaleAfterSuccess =
            latest.status === PaymentStatus.SUCCESS &&
            (
              normalizedStatus === PaymentStatus.PENDING ||
              normalizedStatus === PaymentStatus.FAILED ||
              normalizedStatus === PaymentStatus.CANCELLED ||
              normalizedStatus === PaymentStatus.EXPIRED
            );

          if (isStaleAfterSuccess) {
            const currentTickets =
              await tx.ticket.findMany({
                where: {
                  orderId: order.id,
                },
                select: {
                  id: true,
                },
              });

            return {
              success: true,
              paymentId: latest.id,
              orderId: order.id,
              paymentStatus:
                PaymentStatus.SUCCESS,
              orderStatus:
                OrderStatus.PAID,
              ticketIds:
                currentTickets.map(
                  (ticket) =>
                    ticket.id,
                ),
              alreadyProcessed: true,
            };
          }

          /*
           * Idempotency untuk callback REFUNDED /
           * PARTIALLY_REFUNDED yang sama.
           *
           * Callback kedua tidak boleh dianggap sebagai
           * concurrent conflict.
           */
          const isAlreadyAppliedPostPaymentTransition =
            (normalizedStatus ===
              PaymentStatus.REFUNDED ||
              normalizedStatus ===
                PaymentStatus.PARTIALLY_REFUNDED) &&
            latest.status ===
              normalizedStatus;

          if (
            isAlreadyAppliedPostPaymentTransition
          ) {
            const currentTickets =
              await tx.ticket.findMany({
                where: {
                  orderId: order.id,
                },
                select: {
                  id: true,
                },
              });

            return {
              success: true,
              paymentId: latest.id,
              orderId: order.id,
              paymentStatus:
                latest.status,
              orderStatus:
                mapOrderStatus(
                  latest.status,
                ),
              ticketIds:
                currentTickets.map(
                  (ticket) =>
                    ticket.id,
                ),
              alreadyProcessed: true,
            };
          }

          if (
            latest.status !==
              PaymentStatus.SUCCESS ||
            normalizedStatus !==
              PaymentStatus.SUCCESS
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

      /*
       * Update order hanya setelah payment berhasil diproses.
       */
      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: targetOrderStatus,
          paidAt:
            normalizedStatus === PaymentStatus.SUCCESS ? paidAt : order.paidAt,
        },
      });

      /*
       * Payment REFUNDED adalah lifecycle transition pasca-payment.
       * Ticket ACTIVE yang terkait order diubah menjadi REFUNDED
       * dalam transaction yang sama dengan perubahan payment/order.
       *
       * Partial refund sengaja tidak mengubah ticket otomatis
       * karena belum ada policy pembagian refund per ticket.
       */
      if (
        normalizedStatus === PaymentStatus.REFUNDED
      ) {
        const tickets =
          await tx.ticket.findMany({
            where: {
              orderId: order.id,
            },
            select: {
              id: true,
              status: true,
            },
          });

        for (const ticket of tickets) {
          const nextStatus =
            ticketStatusForPaymentLifecycle(
              normalizedStatus,
              ticket.status,
            );

          if (!nextStatus) {
            continue;
          }

          await tx.ticket.update({
            where: {
              id: ticket.id,
            },
            data: {
              status: nextStatus,
            },
          });
        }
      }

      /*
       * Selalu sinkronkan transaction yang terkait payment.
       */
      await tx.transaction.updateMany({
        where: {
          paymentId: payment.id,
        },
        data: {
          status: normalizedStatus,
          externalId: input.externalId.trim(),
          paymentMethod: payment.method ? String(payment.method) : null,
          metadata:
            input.providerResponse === undefined
              ? undefined
              : toJsonValue(input.providerResponse),
        },
      });

      let ticketIds: string[] = [];

      /*
       * Ticket hanya diterbitkan ketika payment SUCCESS.
       * Approval workflow tetap dihormati.
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

          const transactionId =
            payment.transactions[0]?.id ??
            (
              await tx.transaction.findFirst({
                where: {
                  paymentId: payment.id,
                },
                select: {
                  id: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
              })
            )?.id ??
            null;

          const ticket = await tx.ticket.create({
            data: {
              qrCode: createQrCode(),
              orderId: order.id,
              transactionId,
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
        orderStatus: targetOrderStatus,
        ticketIds,
        alreadyProcessed:
          alreadyFinal ||
          (ticketIds.length > 0 &&
            finalPayment.status === PaymentStatus.SUCCESS),
      };
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}
