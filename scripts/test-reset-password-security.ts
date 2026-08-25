import "dotenv/config";

import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

import {
  POST,
} from "@/app/api/auth/reset-password/route";

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
  token: string,
  password: string,
  ip: string,
): Request {
  return new Request(
    "http://localhost:3000/api/auth/reset-password",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-forwarded-for":
          ip,
      },
      body:
        JSON.stringify({
          token,
          newPassword:
            password,
        }),
    },
  );
}

async function main(): Promise<void> {
  console.log(
    "Running reset-password security regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let userId:
    string | null = null;

  try {
    const role =
      await prisma.role.findUnique({
        where: {
          name:
            "PARTICIPANT",
        },
        select: {
          id: true,
        },
      });

    assert(
      role,
      "Role PARTICIPANT harus tersedia.",
    );

    const resetToken =
      crypto.randomBytes(32).toString("hex");

    const user =
      await prisma.user.create({
        data: {
          name:
            `Reset Security ${suffix}`,
          email:
            `reset-security-${suffix}@iontix.local`,
          password:
            await bcrypt.hash(
              "OldPassword123",
              12,
            ),
          role: {
            connect: {
              id:
                role.id,
            },
          },
          resetToken,
          resetTokenExpiry:
            new Date(
              Date.now() +
                60 * 60 * 1000,
            ),
        },
        select: {
          id: true,
          email: true,
          password: true,
        },
      });

    userId =
      user.id;

    /*
     * ----------------------------------------------------------
     * Weak password rejected.
     * ----------------------------------------------------------
     */

    const weak =
      await POST(
        makeRequest(
          resetToken,
          "abcdefgh",
          "203.0.113.210",
        ),
      );

    assert(
      weak.status ===
        400,
      `Weak reset password harus 400, received ${weak.status}.`,
    );

    const afterWeak =
      await prisma.user.findUnique({
        where: {
          id:
            user.id,
        },
        select: {
          password:
            true,
          resetToken:
            true,
        },
      });

    assert(
      afterWeak?.resetToken ===
        resetToken,
      "Token harus tetap tersedia setelah password lemah ditolak.",
    );

    console.log(
      "  ✓ Password lemah → 400 tanpa mengonsumsi token",
    );

    /*
     * ----------------------------------------------------------
     * Valid reset.
     * ----------------------------------------------------------
     */

    const valid =
      await POST(
        makeRequest(
          resetToken,
          "NewStrongPassword123",
          "203.0.113.211",
        ),
      );

    assert(
      valid.status ===
        200,
      `Valid reset harus 200, received ${valid.status}.`,
    );

    console.log(
      "  ✓ Valid reset → 200",
    );

    const afterValid =
      await prisma.user.findUnique({
        where: {
          id:
            user.id,
        },
        select: {
          password:
            true,
          resetToken:
            true,
          resetTokenExpiry:
            true,
        },
      });

    assert(
      afterValid,
      "User harus tetap tersedia setelah reset.",
    );

    assert(
      afterValid.resetToken ===
        null &&
      afterValid.resetTokenExpiry ===
        null,
      "Reset token harus dikonsumsi setelah sukses.",
    );

    assert(
      await bcrypt.compare(
        "NewStrongPassword123",
        afterValid.password,
      ),
      "Password baru harus benar-benar tersimpan.",
    );

    console.log(
      "  ✓ Token consumed + password updated",
    );

    /*
     * ----------------------------------------------------------
     * Replay must fail.
     * ----------------------------------------------------------
     */

    const replay =
      await POST(
        makeRequest(
          resetToken,
          "AnotherStrongPassword123",
          "203.0.113.212",
        ),
      );

    assert(
      replay.status ===
        400,
      `Replay token harus 400, received ${replay.status}.`,
    );

    console.log(
      "  ✓ Replay token → 400",
    );

    /*
     * ----------------------------------------------------------
     * Rate limit.
     * ----------------------------------------------------------
     */

    const replayToken =
      crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: {
        id:
          user.id,
      },
      data: {
        resetToken:
          replayToken,
        resetTokenExpiry:
          new Date(
            Date.now() +
              60 * 60 * 1000,
          ),
      },
    });

    let blockedCount =
      0;

    for (
      let i = 0;
      i < 6;
      i += 1
    ) {
      const response =
        await POST(
          makeRequest(
            replayToken,
            "StrongPassword123",
            "203.0.113.220",
          ),
        );

      if (
        response.status ===
        429
      ) {
        blockedCount +=
          1;
      }
    }

    assert(
      blockedCount >=
        1,
      "Reset password harus diblok setelah melewati rate limit.",
    );

    console.log(
      "  ✓ Reset password rate limit → 429",
    );

    console.log(
      "\nALL RESET-PASSWORD SECURITY TESTS PASSED.",
    );
  } finally {
    if (userId) {
      await prisma.user.deleteMany({
        where: {
          id:
            userId,
        },
      });
    }

    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "reset-password:",
        },
      },
    });

    console.log(
      "→ Reset-password fixtures dibersihkan.",
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
