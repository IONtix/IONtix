import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  consumeRateLimit,
  peekRateLimit,
} from "@/lib/security/rate-limit";

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
    "Running rate-limit contract...",
  );

  const key =
    `rate-limit-test:${crypto.randomUUID()}`;

  try {
    /*
     * Read-only check.
     */
    const initial =
      await peekRateLimit({
        key,
        limit: 3,
        windowSeconds: 60,
      });

    assert(
      initial.allowed,
      "Initial request harus ALLOW.",
    );

    assert(
      initial.count === 0,
      "Peek tidak boleh mengonsumsi counter.",
    );

    console.log(
      "  ✓ Initial peek → ALLOW",
    );

    /*
     * Consume #1.
     */
    const first =
      await consumeRateLimit({
        key,
        limit: 3,
        windowSeconds: 60,
      });

    assert(
      first.allowed,
      "Consume #1 harus ALLOW.",
    );

    assert(
      first.count === 1,
      "Counter setelah consume #1 harus 1.",
    );

    console.log(
      "  ✓ Consume #1 → ALLOW",
    );

    const second =
      await consumeRateLimit({
        key,
        limit: 3,
        windowSeconds: 60,
      });

    const third =
      await consumeRateLimit({
        key,
        limit: 3,
        windowSeconds: 60,
      });

    const fourth =
      await consumeRateLimit({
        key,
        limit: 3,
        windowSeconds: 60,
      });

    assert(
      second.allowed,
      "Consume #2 harus ALLOW.",
    );

    assert(
      third.allowed,
      "Consume #3 harus ALLOW.",
    );

    assert(
      !fourth.allowed,
      "Consume #4 harus DENY.",
    );

    assert(
      fourth.count === 4,
      "Counter setelah limit harus tetap mencatat attempt #4.",
    );

    assert(
      fourth.remaining === 0,
      "Remaining setelah limit harus 0.",
    );

    console.log(
      "  ✓ Consume #2 → ALLOW",
    );

    console.log(
      "  ✓ Consume #3 → ALLOW",
    );

    console.log(
      "  ✓ Consume #4 → DENY",
    );

    /*
     * Concurrency:
     * 20 consume paralel dengan limit 5.
     */
    const concurrentKey =
      `rate-limit-concurrency:${crypto.randomUUID()}`;

    const results =
      await Promise.all(
        Array.from(
          { length: 20 },
          () =>
            consumeRateLimit({
              key:
                concurrentKey,
              limit: 5,
              windowSeconds: 60,
            }),
        ),
      );

    const allowedCount =
      results.filter(
        (
          item: Awaited<
            ReturnType<
              typeof consumeRateLimit
            >
          >,
        ) => item.allowed,
      ).length;

    assert(
      allowedCount === 5,
      `Concurrency gagal: expected 5 ALLOW, received ${allowedCount}.`,
    );

    const stored =
      await prisma.rateLimitBucket.findUnique({
        where: {
          key: concurrentKey,
        },
        select: {
          count: true,
        },
      });

    assert(
      stored?.count === 20,
      `Concurrency counter harus 20, received ${stored?.count ?? "null"}.`,
    );

    console.log(
      "  ✓ 20 request paralel → tepat 5 ALLOW",
    );

    console.log(
      "  ✓ Counter concurrency = 20",
    );

    console.log(
      "\nALL RATE LIMIT TESTS PASSED.",
    );
  } finally {
    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "rate-limit-test:",
        },
      },
    });

    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "rate-limit-concurrency:",
        },
      },
    });

    console.log(
      "→ Rate-limit fixtures dibersihkan.",
    );
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
