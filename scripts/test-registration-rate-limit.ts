import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  POST,
} from "@/app/api/auth/register/route";

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
    "http://localhost:3000/api/auth/register",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-forwarded-for":
          ip,
      },
      body: JSON.stringify({
        name:
          "Registration Abuse Test",
        email,
        phone:
          "080000000000",
        password:
          "Strong-Test-Password-123!",
      }),
    },
  );
}

async function main(): Promise<void> {
  console.log(
    "Running registration rate-limit regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  const ip =
    "203.0.113.150";

  const participantRole =
    await prisma.role.findFirst({
      where: {
        name: {
          in: [
            "PESERTA",
            "PARTICIPANT",
          ],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

  assert(
    participantRole,
    "Role PESERTA/PARTICIPANT harus tersedia sebelum test registrasi.",
  );

  console.log(
    `✓ Role registrasi tersedia: ${participantRole.name}`,
  );

  const createdUserIds:
    string[] = [];

  try {
    /*
     * Request #1–#5 memakai email berbeda,
     * sehingga duplicate-email tidak mengganggu
     * pengujian IP bucket.
     */
    for (
      let i = 1;
      i <= 5;
      i += 1
    ) {
      const email =
        `register-${suffix}-${i}@iontix.local`;

      const response =
        await POST(
          makeRequest(
            email,
            ip,
          ),
        );

      assert(
        response.status === 201,
        `Registration #${i} harus 201, received ${response.status}.`,
      );

      const body =
        await response.json();

      assert(
        typeof body.userId ===
          "string",
        `Registration #${i} harus mengembalikan userId.`,
      );

      createdUserIds.push(
        body.userId,
      );
    }

    console.log(
      "  ✓ Registration #1–#5 → 201",
    );

    /*
     * Request #6 → blocked by IP limiter.
     */
    const blocked =
      await POST(
        makeRequest(
          `register-${suffix}-6@iontix.local`,
          ip,
        ),
      );

    assert(
      blocked.status ===
        429,
      `Registration #6 harus 429, received ${blocked.status}.`,
    );

    console.log(
      "  ✓ Registration #6 → 429",
    );

    const blockedBody =
      await blocked.json();

    assert(
      typeof blockedBody.message ===
        "string",
      "Blocked response harus memiliki message.",
    );

    assert(
      !("userId" in blockedBody),
      "Blocked response tidak boleh mengembalikan userId.",
    );

    console.log(
      "  ✓ Blocked response tidak mengekspos userId",
    );

    /*
     * Pastikan request #6 tidak membuat user.
     */
    const sixthUser =
      await prisma.user.findUnique({
        where: {
          email:
            `register-${suffix}-6@iontix.local`,
        },
        select: {
          id: true,
        },
      });

    assert(
      !sixthUser,
      "Request yang diblokir tidak boleh membuat user.",
    );

    console.log(
      "  ✓ Request blocked tidak membuat user",
    );

    /*
     * IP berbeda → bucket berbeda.
     */
    const differentIpResponse =
      await POST(
        makeRequest(
          `register-${suffix}-7@iontix.local`,
          "203.0.113.151",
        ),
      );

    assert(
      differentIpResponse.status ===
        201,
      "IP berbeda harus memiliki bucket terpisah.",
    );

    const differentIpBody =
      await differentIpResponse.json();

    assert(
      typeof differentIpBody.userId ===
        "string",
      "Registration dari IP berbeda harus menghasilkan userId.",
    );

    createdUserIds.push(
      differentIpBody.userId,
    );

    console.log(
      "  ✓ IP berbeda → bucket terpisah",
    );

    console.log(
      "\nALL REGISTRATION RATE-LIMIT TESTS PASSED.",
    );
  } finally {
    if (
      createdUserIds.length >
      0
    ) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in:
              createdUserIds,
          },
        },
      });
    }

    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "register:",
        },
      },
    });

    console.log(
      "→ Registration fixtures dibersihkan.",
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
