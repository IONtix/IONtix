import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  PaymentStatus,
  OrderStatus,
} from "@/generated/prisma/client";
import {
  paymentService,
} from "@/lib/payment";
import { retryPaymentSession } from "@/lib/payment/retry";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `TEST FAILED: ${message}`,
    );
  }
}

function sleep(
  ms: number,
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms),
  );
}

async function main(): Promise<void> {
  console.log(
    "Running deterministic payment retry concurrency regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let orderId: string | null = null;
  let eventId: string | null = null;
  let categoryId: string | null = null;
  let participantId: string | null = null;
  let participantEventId: string | null = null;
  let paymentId: string | null = null;
  let transactionId: string | null = null;

  const originalCreatePayment =
    paymentService.createPayment.bind(
      paymentService,
    );

  let providerCallCount = 0;

  try {
    /*
     * ============================================================
     * FIXTURE
     * ============================================================
     */

    const user =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          isDeleted: false,
          role: {
            name: "PESERTA",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

    assert(
      user,
      "User PESERTA aktif harus tersedia.",
    );

    const organization =
      await prisma.organization.findFirst({
        select: {
          id: true,
        },
      });

    assert(
      organization,
      "Organization fixture harus tersedia.",
    );

    const event =
      await prisma.event.create({
        data: {
          organizationId:
            organization.id,
          title:
            `Retry Concurrency ${suffix}`,
          slug:
            `retry-concurrency-${suffix}`,
          description:
            "Deterministic retry concurrency regression fixture.",
          date:
            new Date(
              Date.now() +
                24 *
                  60 *
                  60 *
                  1000,
            ),
          location:
            "IONtix Retry Concurrency Test",
          status:
            "PUBLISHED",
          isPublished:
            true,
        },
        select: {
          id: true,
        },
      });

    eventId = event.id;

    const category =
      await prisma.ticketCategory.create({
        data: {
          eventId:
            event.id,
          name:
            "Retry Concurrency Test",
          price:
            100000,
          capacity:
            10,
          isActive:
            true,
        },
        select: {
          id: true,
        },
      });

    categoryId =
      category.id;

    const participant =
      await prisma.participant.create({
        data: {
          userId:
            user.id,
          fullName:
            user.name ??
            "Retry Test User",
          email:
            user.email,
          phone:
            "080000000000",
        },
        select: {
          id: true,
        },
      });

    participantId =
      participant.id;

    const participantEvent =
      await prisma.participantEvent.create({
        data: {
          participantId:
            participant.id,
          eventId:
            event.id,
        },
        select: {
          id: true,
        },
      });

    participantEventId =
      participantEvent.id;

    const order =
      await prisma.order.create({
        data: {
          eventId:
            event.id,
          buyerUserId:
            user.id,
          participantId:
            participant.id,
          ticketCategoryId:
            category.id,
          fullName:
            user.name ??
            "Retry Test User",
          email:
            user.email,
          phone:
            "080000000000",
          subtotal:
            100000,
          totalPrice:
            100000,
          currency:
            "IDR",
          status:
            OrderStatus.PENDING_PAYMENT,
        },
        select: {
          id: true,
        },
      });

    orderId =
      order.id;

    const payment =
      await prisma.payment.create({
        data: {
          orderId:
            order.id,
          userId:
            user.id,
          externalId:
            `IONTIX-RETRY-CONCURRENCY-${suffix}`,
          provider:
            "IONTIX_TEST",
          status:
            PaymentStatus.PENDING,
          amount:
            100000,
          currency:
            "IDR",
          expiresAt:
            new Date(
              Date.now() +
                15 *
                  60 *
                  1000,
            ),
        },
        select: {
          id: true,
          externalId: true,
        },
      });

    paymentId =
      payment.id;

    const transaction =
      await prisma.transaction.create({
        data: {
          orderId:
            order.id,
          paymentId:
            payment.id,
          runnerId:
            user.id,
          amount:
            100000,
          status:
            PaymentStatus.PENDING,
          paymentMethod:
            null,
          externalId:
            payment.externalId ??
            undefined,
        },
        select: {
          id: true,
        },
      });

    transactionId =
      transaction.id;

    console.log(
      "✓ Retry concurrency fixture dibuat.",
    );

    /*
     * ============================================================
     * DETERMINISTIC PROVIDER DELAY
     * ============================================================
     */

    paymentService.createPayment =
      async (...args) => {
        providerCallCount += 1;

        console.log(
          `  → Provider call #${providerCallCount} masuk.`,
        );

        /*
         * Pastikan request kedua sempat mencapai
         * PaymentRetryLock ketika request pertama
         * masih memegang lock.
         */
        await sleep(500);

        return originalCreatePayment(
          ...args,
        );
      };

    /*
     * ============================================================
     * CONCURRENT RETRY
     * ============================================================
     */

    console.log(
      "→ Menjalankan dua retry owner secara paralel...",
    );

    const results =
      await Promise.allSettled([
        retryPaymentSession({
          orderId:
            order.id,
          userId:
            user.id,
        }),
        retryPaymentSession({
          orderId:
            order.id,
          userId:
            user.id,
        }),
      ]);

    const fulfilled =
      results.filter(
        (result) =>
          result.status ===
          "fulfilled",
      );

    const rejected =
      results.filter(
        (result) =>
          result.status ===
          "rejected",
      );

    console.log(
      `  Fulfilled = ${fulfilled.length}`,
    );

    console.log(
      `  Rejected = ${rejected.length}`,
    );

    console.log(
      `  Provider calls = ${providerCallCount}`,
    );

    assert(
      fulfilled.length === 1,
      `Expected exactly 1 fulfilled retry, received ${fulfilled.length}.`,
    );

    assert(
      rejected.length === 1,
      `Expected exactly 1 rejected retry, received ${rejected.length}.`,
    );

    assert(
      providerCallCount === 1,
      `Provider harus dipanggil tepat 1 kali, received ${providerCallCount}.`,
    );

    const rejectionMessages =
      rejected
        .filter(
          (
            result,
          ): result is PromiseRejectedResult =>
            result.status ===
            "rejected",
        )
        .map(
          (result) =>
            result.reason instanceof Error
              ? result.reason.message
              : String(
                  result.reason,
                ),
        );

    console.log(
      "  Rejection messages:",
      rejectionMessages,
    );

    assert(
      rejectionMessages.some(
        (message) =>
          message.includes(
            "Payment sedang diproses",
          ),
      ),
      "Request kedua harus ditolak karena PaymentRetryLock.",
    );

    console.log(
      "  ✓ Concurrent retry kedua ditolak oleh retry lock",
    );

    console.log(
      "  ✓ Provider hanya dipanggil satu kali",
    );

    /*
     * ============================================================
     * FINAL DATABASE ASSERTIONS
     * ============================================================
     */

    const finalPayment =
      await prisma.payment.findUnique({
        where: {
          id: payment.id,
        },
        select: {
          status: true,
          externalId: true,
        },
      });

    assert(
      finalPayment,
      "Payment final harus tersedia.",
    );

    assert(
      finalPayment.externalId ===
        payment.externalId,
      "External ID payment harus tetap sama.",
    );

    const finalTransactions =
      await prisma.transaction.count({
        where: {
          paymentId:
            payment.id,
        },
      });

    assert(
      finalTransactions === 1,
      `Transaction count harus 1, received ${finalTransactions}.`,
    );

    console.log(
      `  ✓ Final Payment status = ${finalPayment.status}`,
    );

    console.log(
      "  ✓ External ID tetap sama",
    );

    console.log(
      "  ✓ Transaction count tetap 1",
    );

    console.log(
      "\nALL DETERMINISTIC RETRY CONCURRENCY TESTS PASSED.",
    );
  } finally {
    /*
     * Restore provider method walaupun test gagal.
     */
    paymentService.createPayment =
      originalCreatePayment;

    if (transactionId) {
      await prisma.transaction.deleteMany({
        where: {
          id: transactionId,
        },
      });
    }

    if (paymentId) {
      await prisma.payment.deleteMany({
        where: {
          id: paymentId,
        },
      });
    }

    if (orderId) {
      await prisma.order.deleteMany({
        where: {
          id: orderId,
        },
      });
    }

    if (participantEventId) {
      await prisma.participantEvent.deleteMany({
        where: {
          id:
            participantEventId,
        },
      });
    }

    if (participantId) {
      await prisma.participant.deleteMany({
        where: {
          id:
            participantId,
        },
      });
    }

    if (categoryId) {
      await prisma.ticketCategory.deleteMany({
        where: {
          id:
            categoryId,
        },
      });
    }

    if (eventId) {
      await prisma.event.deleteMany({
        where: {
          id:
            eventId,
        },
      });
    }

    console.log(
      "→ Retry concurrency fixture dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error();
    console.error(
      "\nDETERMINISTIC RETRY CONCURRENCY TEST FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
