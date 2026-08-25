import "dotenv/config";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { POST } from "@/app/api/auth/forgot-password/route";
import {
  getClientIp,
  hashRateLimitIdentifier,
  normalizeEmail,
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

function makeRequest(
  email: string,
  ip: string,
): Request {
  return new Request(
    "http://localhost:3000/api/auth/forgot-password",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({
        email,
      }),
    },
  );
}

async function main(): Promise<void> {
  console.log(
    "Running forgot-password abuse regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  const email =
    `forgot-test-${suffix}@iontix.local`;

  const password =
    await bcrypt.hash(
      "Temporary-Password-123!",
      12,
    );

  const role =
    await prisma.role.findUnique({
      where: {
        name: "PESERTA",
      },
      select: {
        id: true,
      },
    });

  assert(
    role,
    "Role PESERTA harus tersedia.",
  );

  const user =
    await prisma.user.create({
      data: {
        name:
          `Forgot Password ${suffix}`,
        email,
        password,
        roleId: role.id,
        status: "ACTIVE",
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

  const ip =
    "203.0.113.101";

  try {
    /*
     * Request pertama valid.
     */
    const firstResponse =
      await POST(
        makeRequest(
          email,
          ip,
        ),
      );

    assert(
      firstResponse.status ===
        200,
      `Request pertama harus 200, received ${firstResponse.status}.`,
    );

    console.log(
      "  ✓ Request #1 → 200",
    );

    const afterFirst =
      await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          resetToken: true,
          resetTokenExpiry: true,
        },
      });

    assert(
      Boolean(
        afterFirst?.resetToken,
      ),
      "Reset token harus dibuat.",
    );

    console.log(
      "  ✓ Reset token dibuat",
    );

    /*
     * Request ke-2 dan ke-3 tetap diperbolehkan
     * berdasarkan email limit = 3.
     */
    await POST(
      makeRequest(
        email,
        ip,
      ),
    );

    await POST(
      makeRequest(
        email,
        ip,
      ),
    );

    /*
     * Simpan token TERAKHIR yang sah sebelum
     * request diblokir.
     */
    const beforeBlocked =
      await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          resetToken: true,
          resetTokenExpiry: true,
        },
      });

    const tokenBeforeBlocked =
      beforeBlocked?.resetToken;

    assert(
      Boolean(tokenBeforeBlocked),
      "Token sebelum blocked request harus tersedia.",
    );

    /*
     * Request ke-4 → email bucket blocked.
     */
    const blockedResponse =
      await POST(
        makeRequest(
          email,
          ip,
        ),
      );

    assert(
      blockedResponse.status ===
        429,
      `Request #4 harus 429, received ${blockedResponse.status}.`,
    );

    console.log(
      "  ✓ Request #4 → 429",
    );

    const blockedBody =
      await blockedResponse.json();

    assert(
      typeof blockedBody.message ===
        "string",
      "Blocked response harus tetap memiliki message generik.",
    );

    assert(
      !("resetToken" in blockedBody),
      "Blocked response tidak boleh mengekspos resetToken.",
    );

    assert(
      !("resetUrl" in blockedBody),
      "Blocked response tidak boleh mengekspos resetUrl.",
    );

    console.log(
      "  ✓ Response blocked tetap generik",
    );

    /*
     * Token tidak boleh berubah setelah blocked request.
     */
    const afterBlocked =
      await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          resetToken: true,
          resetTokenExpiry: true,
        },
      });

    assert(
      afterBlocked?.resetToken ===
        tokenBeforeBlocked,
      "Blocked request tidak boleh merotasi reset token.",
    );

    console.log(
      "  ✓ Blocked request tidak merotasi reset token",
    );

    /*
     * Unknown email tetap generic,
     * tetapi menggunakan bucket yang berbeda.
     */
    const unknownResponse =
      await POST(
        makeRequest(
          `unknown-${suffix}@iontix.local`,
          "203.0.113.102",
        ),
      );

    assert(
      unknownResponse.status ===
        200,
      "Unknown email harus tetap generic 200.",
    );

    const unknownBody =
      await unknownResponse.json();

    assert(
      typeof unknownBody.message ===
        "string",
      "Unknown email harus menghasilkan response generic.",
    );

    assert(
      !("resetToken" in unknownBody),
      "Unknown email tidak boleh mengekspos resetToken.",
    );

    assert(
      !("resetUrl" in unknownBody),
      "Unknown email tidak boleh mengekspos resetUrl.",
    );

    console.log(
      "  ✓ Unknown email → generic response",
    );

    /*
     * Pastikan keys memakai hash,
     * bukan raw email/IP.
     */
    const ipKey =
      `forgot-password:ip:${hashRateLimitIdentifier(
        getClientIp(
          new Headers({
            "x-forwarded-for":
              ip,
          }),
        ),
      )}`;

    const emailKey =
      `forgot-password:email:${hashRateLimitIdentifier(
        normalizeEmail(email),
      )}`;

    const buckets =
      await prisma.rateLimitBucket.findMany({
        where: {
          key: {
            in: [
              ipKey,
              emailKey,
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
      "Forgot-password IP + email buckets harus tersedia.",
    );

    console.log(
      "  ✓ IP + email buckets tersedia",
    );

    console.log(
      "\nALL FORGOT-PASSWORD RATE-LIMIT TESTS PASSED.",
    );
  } finally {
    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "forgot-password:",
        },
      },
    });

    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    console.log(
      "→ Forgot-password fixtures dibersihkan.",
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
