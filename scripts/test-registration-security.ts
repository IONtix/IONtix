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
  body: {
    name: string;
    email: string;
    phone: string;
    password: string;
  },
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
      body:
        JSON.stringify(body),
    },
  );
}

async function main(): Promise<void> {
  console.log(
    "Running registration security regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  const createdUserIds:
    string[] = [];

  try {
    /*
     * ============================================================
     * 1. EMAIL NORMALIZATION
     * ============================================================
     */

    const normalizedEmail =
      `reg-normalize-${suffix}@iontix.local`;

    const first =
      await POST(
        makeRequest(
          {
            name:
              "  Registration Normalization  ",
            email:
              `  ${normalizedEmail.toUpperCase()}  `,
            phone:
              "  081234567890  ",
            password:
              "Strong-Test-Password-123!",
          },
          "203.0.113.160",
        ),
      );

    assert(
      first.status ===
        201,
      `Normalized registration harus 201, received ${first.status}.`,
    );

    const firstBody =
      await first.json();

    assert(
      typeof firstBody.userId ===
        "string",
      "Registration pertama harus menghasilkan userId.",
    );

    createdUserIds.push(
      firstBody.userId,
    );

    const stored =
      await prisma.user.findUnique({
        where: {
          email:
            normalizedEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
        },
      });

    assert(
      stored,
      "User hasil normalization harus ditemukan.",
    );

    assert(
      stored.email ===
        normalizedEmail,
      "Email harus tersimpan dalam bentuk trim + lowercase.",
    );

    assert(
      stored.name ===
        "Registration Normalization",
      "Name harus tersimpan dalam bentuk trim.",
    );

    assert(
      stored.phone ===
        "081234567890",
      "Phone harus tersimpan dalam bentuk trim.",
    );

    console.log(
      "  ✓ Email/name/phone normalization",
    );

    /*
     * Duplicate dengan casing + whitespace berbeda.
     */
    const duplicate =
      await POST(
        makeRequest(
          {
            name:
              "Duplicate Normalization",
            email:
              `  ${normalizedEmail.toUpperCase()}  `,
            phone:
              "081111111111",
            password:
              "Strong-Test-Password-123!",
          },
          "203.0.113.161",
        ),
      );

    assert(
      duplicate.status ===
        400,
      `Duplicate normalized email harus 400, received ${duplicate.status}.`,
    );

    console.log(
      "  ✓ Duplicate normalized email → 400",
    );

    /*
     * ============================================================
     * 2. CONCURRENT DUPLICATE REGISTRATION
     * ============================================================
     */

    const concurrentEmail =
      `reg-race-${suffix}@iontix.local`;

    const concurrentRequests =
      await Promise.allSettled([
        POST(
          makeRequest(
            {
              name:
                "Concurrent Registration A",
              email:
                concurrentEmail,
              phone:
                "082000000001",
              password:
                "Strong-Test-Password-123!",
            },
            "203.0.113.170",
          ),
        ),
        POST(
          makeRequest(
            {
              name:
                "Concurrent Registration B",
              email:
                ` ${concurrentEmail.toUpperCase()} `,
              phone:
                "082000000002",
              password:
                "Strong-Test-Password-123!",
            },
            "203.0.113.171",
          ),
        ),
      ]);

    const responses =
      concurrentRequests.map(
        (result) => {
          assert(
            result.status ===
              "fulfilled",
            "Kedua concurrent registration harus menyelesaikan response.",
          );

          return result.value;
        },
      );

    assert(
      responses.length ===
        2,
      `Kedua HTTP request harus menghasilkan response, received ${responses.length}.`,
    );

    const statuses =
      responses
        .map(
          (response) =>
            response.status,
        )
        .sort(
          (a, b) =>
            a - b,
        );

    assert(
      statuses[0] === 201 &&
        statuses[1] === 400,
      `Concurrent duplicate harus menghasilkan [400, 201], received ${JSON.stringify(statuses)}.`,
    );

    console.log(
      "  ✓ Concurrent duplicate → tepat satu 201 + satu 400",
    );

    const concurrentUsers =
      await prisma.user.findMany({
        where: {
          email:
            concurrentEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

    assert(
      concurrentUsers.length ===
        1,
      `Concurrent duplicate harus menghasilkan tepat 1 user, received ${concurrentUsers.length}.`,
    );

    createdUserIds.push(
      concurrentUsers[0]!.id,
    );

    console.log(
      "  ✓ Concurrent duplicate → tepat 1 user",
    );

    /*
     * ============================================================
     * 3. INVALID INPUT
     * ============================================================
     */

    const invalid =
      await POST(
        makeRequest(
          {
            name:
              "Invalid Registration",
            email:
              "   ",
            phone:
              "",
            password:
              "",
          },
          "203.0.113.180",
        ),
      );

    assert(
      invalid.status ===
        400,
      `Invalid registration harus 400, received ${invalid.status}.`,
    );

    console.log(
      "  ✓ Invalid registration → 400",
    );

    console.log(
      "\nALL REGISTRATION SECURITY TESTS PASSED.",
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
      "→ Registration security fixtures dibersihkan.",
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
