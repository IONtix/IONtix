import {
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import prisma from "@/lib/prisma";

export type ExpiryReconciliationResult = {
  processedOrders: number;
  processedPayments: number;
  processedTransactions: number;
  orderIds: string[];
};

export async function reconcileExpiredPayments(
  now = new Date(),
): Promise<ExpiryReconciliationResult> {
  return prisma.$transaction(
    async (tx) => {
      const expiredPayments =
        await tx.payment.findMany({
          where: {
            status: {
              in: [
                PaymentStatus.PENDING,
              ],
            },
            expiresAt: {
              not: null,
              lte: now,
            },
          },
          select: {
            id: true,
            orderId: true,
            externalId: true,
          },
        });

      if (
        expiredPayments.length === 0
      ) {
        return {
          processedOrders: 0,
          processedPayments: 0,
          processedTransactions: 0,
          orderIds: [],
        };
      }

      const paymentIds =
        expiredPayments.map(
          (payment) => payment.id,
        );

      const orderIds = Array.from(
        new Set(
          expiredPayments
            .map(
              (payment) =>
                payment.orderId,
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ),
      );

      const paymentResult =
        await tx.payment.updateMany({
          where: {
            id: {
              in: paymentIds,
            },
            status: {
              in: [
                PaymentStatus.PENDING,
              ],
            },
          },
          data: {
            status:
              PaymentStatus.EXPIRED,
          },
        });

      const orderResult =
        orderIds.length > 0
          ? await tx.order.updateMany({
              where: {
                id: {
                  in: orderIds,
                },
                status: {
                  in: [
                    OrderStatus.PENDING_PAYMENT,
                    OrderStatus.PAYMENT_PROCESSING,
                  ],
                },
              },
              data: {
                status:
                  OrderStatus.EXPIRED,
              },
            })
          : {
              count: 0,
            };

      const transactionResult =
        await tx.transaction.updateMany({
          where: {
            paymentId: {
              in: paymentIds,
            },
            status: {
              in: [
                PaymentStatus.PENDING,
              ],
            },
          },
          data: {
            status:
              PaymentStatus.EXPIRED,
          },
        });

      return {
        processedOrders:
          orderResult.count,
        processedPayments:
          paymentResult.count,
        processedTransactions:
          transactionResult.count,
        orderIds,
      };
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}
