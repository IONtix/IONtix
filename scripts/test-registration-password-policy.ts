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

function request(
  password: string,
  email: string,
): Request {
  return new Request(
    "http://localhost:3000/api/auth/register",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-forwarded-for":
          `203.0.113.${Math.floor(
            Math.random() * 50,
          ) + 180}`,
      },
      body: JSON.stringify({
        name:
          "Password Policy Test",
        email,
        phone:
          "081234567890",
        password,
      }),
    },
  );
}

async function main(): Promise<void> {
  console.log(
    "Running registration password-policy regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  const createdUserIds:
    string[] = [];

  try {
    const weakPasswords = [
      "short1",
      "12345678",
      "abcdefgh",
      "",
    ];

    for (
      let i = 0;
      i < weakPasswords.length;
      i += 1
    ) {
      const response =
        await POST(
          request(
            weakPasswords[i]!,
            `password-policy-${suffix}-${i}@iontix.local`,
          ),
        );

      assert(
        response.status ===
          400,
        `Weak password #${i + 1} harus 400, received ${response.status}.`,
      );
    }

    console.log(
      "  ✓ Password lemah → 400",
    );

    const strongEmail =
      `password-policy-strong-${suffix}@iontix.local`;

    const strong =
      await POST(
        request(
          "StrongPassword123",
          strongEmail,
        ),
      );

    assert(
      strong.status ===
        201,
      `Strong password harus 201, received ${strong.status}.`,
    );

    const strongBody =
      await strong.json();

    assert(
      typeof strongBody.userId ===
        "string",
      "Strong password harus menghasilkan userId.",
    );

    createdUserIds.push(
      strongBody.userId,
    );

    console.log(
      "  ✓ Password kuat → 201",
    );

    /*
     * Password lemah tidak boleh
     * membuat account.
     */
    const weakEmail =
      `password-policy-weak-${suffix}@iontix.local`;

    const weak =
      await POST(
        request(
          "abcdefgh",
          weakEmail,
        ),
      );

    assert(
      weak.status ===
        400,
      "Weak password harus ditolak.",
    );

    const weakUser =
      await prisma.user.findUnique({
        where: {
          email:
            weakEmail,
        },
        select: {
          id: true,
        },
      });

    assert(
      !weakUser,
      "Password lemah tidak boleh membuat user.",
    );

    console.log(
      "  ✓ Password lemah tidak membuat user",
    );

    console.log(
      "\nALL REGISTRATION PASSWORD-POLICY TESTS PASSED.",
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
      "→ Password-policy fixtures dibersihkan.",
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
