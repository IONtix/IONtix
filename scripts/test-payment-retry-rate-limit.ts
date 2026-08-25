import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  checkPaymentRetryRateLimit,
} from "@/lib/security/payment-retry-rate-limit";
import {
  hashRateLimitIdentifier,
} from "@/lib/security/rate-limit-key";

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

async function main(): Promise<void> {
  console.log(
    "Running payment retry rate-limit contract...",
  );

  const userId =
    `user-${crypto.randomUUID()}`;

  const orderId =
    `order-${crypto.randomUUID()}`;

  const otherOrderId =
    `order-${crypto.randomUUID()}`;

  try {
    /*
     * Order limit = 3.
     */
    const first =
      await checkPaymentRetryRateLimit({
        userId,
        orderId,
      });

    const second =
      await checkPaymentRetryRateLimit({
        userId,
        orderId,
      });

    const third =
      await checkPaymentRetryRateLimit({
        userId,
        orderId,
      });

    assert(
      first.allowed,
      "Retry #1 harus ALLOW.",
    );

    assert(
      second.allowed,
      "Retry #2 harus ALLOW.",
    );

    assert(
      third.allowed,
      "Retry #3 harus ALLOW.",
    );

    console.log(
      "  ✓ Order retry #1–#3 → ALLOW",
    );

    const fourth =
      await checkPaymentRetryRateLimit({
        userId,
        orderId,
      });

    assert(
      !fourth.allowed,
      "Retry #4 pada order yang sama harus DENY.",
    );

    console.log(
      "  ✓ Order retry #4 → DENY",
    );

    /*
     * User berbeda order tetap boleh,
     * selama user bucket belum mencapai limit.
     */
    const otherOrder =
      await checkPaymentRetryRateLimit({
        userId,
        orderId:
          otherOrderId,
      });

    assert(
      otherOrder.allowed,
      "Order berbeda milik user yang sama harus masih ALLOW.",
    );

    console.log(
      "  ✓ Order berbeda → ALLOW",
    );

    /*
     * Pastikan kedua bucket memang tercatat.
     */
    const userKey =
      `retry:user:${hashRateLimitIdentifier(
        userId,
      )}`;

    const orderKey =
      `retry:order:${hashRateLimitIdentifier(
        orderId,
      )}`;

    const buckets =
      await prisma.rateLimitBucket.findMany({
        where: {
          key: {
            in: [
              userKey,
              orderKey,
            ],
          },
        },
        select: {
          key: true,
          count: true,
        },
      });

    assert(
      buckets.length === 2,
      "User + order retry buckets harus tersedia.",
    );

    console.log(
      "  ✓ User + order buckets tersedia",
    );

    console.log(
      "\nALL PAYMENT RETRY RATE-LIMIT TESTS PASSED.",
    );
  } finally {
    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "retry:",
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error();
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
