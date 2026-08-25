import {
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import prisma from "@/lib/prisma";

import {
  checkPaymentRetryRateLimit,
} from "@/lib/security/payment-retry-rate-limit";

import {
  paymentService,
} from "@/lib/payment";

import {
  registerPaymentProviders,
} from "@/lib/payment/providers";

import {
  acquirePaymentRetryLock,
  releasePaymentRetryLock,
} from "@/lib/payment/retry-lock";

export type RetryPaymentResult = {
  orderId: string;
  externalId: string;
  provider: string;
  status: PaymentStatus;
  checkoutUrl: string | null;
  expiresAt: Date | null;
};

export async function retryPaymentSession({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}): Promise<RetryPaymentResult> {
  registerPaymentProviders();

  const order =
    await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        ticketCategory: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        participant: true,
      },
    });

  if (!order) {
    throw new Error(
      "Order tidak ditemukan.",
    );
  }

  if (
    order.buyerUserId !== userId
  ) {
    throw new Error(
      "Anda tidak memiliki akses ke order ini.",
    );
  }

  if (
    order.status ===
      OrderStatus.PAID
  ) {
    throw new Error(
      "Order sudah dibayar.",
    );
  }

  if (
    order.status ===
      OrderStatus.EXPIRED ||
    order.status ===
      OrderStatus.CANCELLED ||
    order.status ===
      OrderStatus.FAILED
  ) {
    throw new Error(
      "Order sudah tidak dapat dibayar.",
    );
  }

  const payment =
    order.payments[0];

  if (!payment) {
    throw new Error(
      "Payment order tidak ditemukan.",
    );
  }

  if (
    payment.status ===
      PaymentStatus.SUCCESS
  ) {
    throw new Error(
      "Payment sudah berhasil.",
    );
  }

  const now =
    new Date();

  if (
    payment.expiresAt &&
    payment.expiresAt <= now
  ) {
    throw new Error(
      "Payment sudah melewati batas waktu pembayaran.",
    );
  }

  const rateLimitResult =
    await checkPaymentRetryRateLimit({
      userId,
      orderId: order.id,
    });

  if (
    !rateLimitResult.allowed
  ) {
    throw new Error(
      "Terlalu banyak retry payment. Silakan coba lagi nanti.",
    );
  }

  const provider =
    payment.provider;

  const customer = {
    userId,
    name:
      order.fullName ??
      order.participant?.fullName ??
      null,
    email:
      order.email ??
      order.participant?.email ??
      null,
    phone:
      order.phone ??
      order.participant?.phone ??
      null,
  };

  const items = order.ticketCategory
    ? [
        {
          id:
            order.ticketCategory.id,
          name:
            order.ticketCategory.name,
          quantity: 1,
          unitPrice:
            order.ticketCategory.price,
          totalPrice:
            order.ticketCategory.price,
        },
      ]
    : [];

  const acquired =
    await acquirePaymentRetryLock(
      order.id,
    );

  if (!acquired) {
    throw new Error(
      "Payment sedang diproses. Silakan tunggu beberapa saat.",
    );
  }

  try {
    const session =
      await paymentService.createPayment(
        provider,
        {
          orderId: order.id,
          externalId:
            payment.externalId ??
            "",
          amount:
            payment.amount,
          currency:
            payment.currency,
          method:
            payment.method,
          customer,
          items,
          expiresAt:
            payment.expiresAt,
          metadata: {
            source:
              "IONTIX-payment-retry",
            orderId:
              order.id,
          },
        },
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status:
              session.status,
            providerTransactionId:
              session.providerTransactionId ??
              payment.providerTransactionId ??
              null,
            providerResponse:
              session.providerResponse ??
              undefined,
            expiresAt:
              session.expiresAt ??
              payment.expiresAt,
          },
        });

        await tx.transaction.updateMany({
          where: {
            paymentId:
              payment.id,
          },
          data: {
            status:
              session.status,
          },
        });
      },
    );

  return {
    orderId:
      order.id,
    externalId:
      payment.externalId ??
      "",
    provider,
    status:
      session.status,
    checkoutUrl:
      session.checkoutUrl ??
      null,
    expiresAt:
      session.expiresAt ??
      payment.expiresAt ??
      null,
  };

  } finally {
    await releasePaymentRetryLock(
      order.id,
    );
  }
}
