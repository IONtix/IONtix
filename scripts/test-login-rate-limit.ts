import "dotenv/config";

import prisma from "@/lib/prisma";
import {
  checkLoginRateLimit,
  getLoginRateLimitKeys,
  recordLoginFailure,
} from "@/lib/security/login-rate-limit";

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
    "Running login rate-limit contract...",
  );

  const headers =
    new Headers({
      "x-forwarded-for":
        "203.0.113.50",
    });

  const email =
    "admin@iontix.com";

  /*
   * Read-only check tidak boleh mengonsumsi bucket.
   */
  const before =
    await checkLoginRateLimit({
      email,
      headers,
    });

  assert(
    before.allowed,
    "Initial login should be allowed.",
  );

  const secondCheck =
    await checkLoginRateLimit({
      email,
      headers,
    });

  assert(
    secondCheck.allowed,
    "Repeated eligibility check tidak boleh mengonsumsi bucket.",
  );

  console.log(
    "  ✓ Read-only check tidak mengonsumsi failure budget",
  );

  /*
   * Record five failed attempts.
   * Lima masih merupakan batas account bucket.
   */
  for (let i = 0; i < 5; i += 1) {
    await recordLoginFailure({
      email,
      headers,
    });
  }

  console.log(
    "  ✓ 5 failed login attempts tercatat",
  );

  const blocked =
    await checkLoginRateLimit({
      email,
      headers,
    });

  assert(
    !blocked.allowed,
    "Account harus blocked setelah 5 failures.",
  );

  console.log(
    "  ✓ Attempt berikutnya → DENY",
  );

  /*
   * Account berbeda menggunakan bucket berbeda.
   */
  const otherEmail =
    "another-account@iontix.com";

  const other =
    await checkLoginRateLimit({
      email:
        otherEmail,
      headers,
    });

  assert(
    other.allowed,
    "Account berbeda harus tetap ALLOW.",
  );

  console.log(
    "  ✓ Account berbeda → bucket terpisah",
  );

  /*
   * Pastikan bucket memang tercatat sebagai
   * rate-limit failure, bukan phantom row.
   */
  const keys =
    getLoginRateLimitKeys({
      email,
      headers,
    });

  const buckets =
    await prisma.rateLimitBucket.findMany({
      where: {
        key: {
          in: [
            keys.ipKey,
            keys.accountKey,
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
    "IP + account buckets harus tersedia.",
  );

  console.log(
    "  ✓ IP + account failure buckets tersedia",
  );

  console.log(
    "\nALL LOGIN RATE-LIMIT TESTS PASSED.",
  );
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
    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "login:",
        },
      },
    });

    await prisma.$disconnect();
  });

export {};
