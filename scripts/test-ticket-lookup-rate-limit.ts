import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  POST,
} from "@/app/api/cek-tiket/route";
import {
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
    "http://localhost:3000/api/cek-tiket",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "x-forwarded-for":
          ip,
      },
      body: JSON.stringify({
        email,
      }),
    },
  );
}

async function main(): Promise<void> {
  console.log(
    "Running public ticket lookup abuse regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  const email =
    `lookup-test-${suffix}@iontix.local`;

  const ip =
    "203.0.113.120";

  try {
    /*
     * Email belum punya order.
     * Response harus tetap 404, tetapi request
     * tersebut tetap mengonsumsi rate-limit budget.
     */
    const first =
      await POST(
        makeRequest(
          email,
          ip,
        ),
      );

    assert(
      first.status === 404,
      `Request #1 harus 404, received ${first.status}.`,
    );

    console.log(
      "  ✓ Request #1 → 404",
    );

    /*
     * Email bucket = 10.
     * Consume request 2–10.
     */
    for (
      let i = 2;
      i <= 10;
      i += 1
    ) {
      const response =
        await POST(
          makeRequest(
            email,
            ip,
          ),
        );

      assert(
        response.status === 404,
        `Request #${i} harus 404, received ${response.status}.`,
      );
    }

    console.log(
      "  ✓ Request #2–#10 → 404",
    );

    /*
     * Request #11 → email bucket blocked.
     */
    const blocked =
      await POST(
        makeRequest(
          email,
          ip,
        ),
      );

    assert(
      blocked.status === 429,
      `Request #11 harus 429, received ${blocked.status}.`,
    );

    console.log(
      "  ✓ Request #11 → 429",
    );

    const body =
      await blocked.json();

    assert(
      typeof body.error ===
        "string",
      "Blocked response harus memiliki error.",
    );

    /*
     * Unknown email tidak boleh mengekspos
     * apakah email tersebut ada.
     */
    assert(
      !("orders" in body),
      "Blocked response tidak boleh mengembalikan orders.",
    );

    console.log(
      "  ✓ Blocked response tidak mengekspos orders",
    );

    /*
     * Bucket harus menyimpan hash, bukan raw
     * email/IP.
     */
    const ipKey =
      `cek-tiket:ip:${hashRateLimitIdentifier(ip)}`;

    const emailKey =
      `cek-tiket:email:${hashRateLimitIdentifier(
        normalizeEmail(email),
      )}`;

    const rawKeyPrefix =
      `cek-tiket:email:${email}`;

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
      "IP + email buckets harus tersedia.",
    );

    assert(
      !buckets.some(
        (bucket) =>
          bucket.key ===
          rawKeyPrefix,
      ),
      "Raw email tidak boleh disimpan sebagai key.",
    );

    console.log(
      "  ✓ IP + email buckets tersedia",
    );
    console.log(
      "  ✓ Raw email tidak disimpan sebagai key",
    );

    /*
     * IP berbeda + email sama masih dibatasi
     * oleh email bucket.
     */
    const differentIp =
      "203.0.113.121";

    const sameEmailDifferentIp =
      await POST(
        makeRequest(
          email,
          differentIp,
        ),
      );

    assert(
      sameEmailDifferentIp.status ===
        429,
      "Email bucket harus tetap memblokir meskipun IP berubah.",
    );

    console.log(
      "  ✓ IP berubah tetapi email bucket tetap DENY",
    );

    console.log(
      "\nALL PUBLIC TICKET LOOKUP RATE-LIMIT TESTS PASSED.",
    );
  } finally {
    await prisma.rateLimitBucket.deleteMany({
      where: {
        key: {
          startsWith:
            "cek-tiket:",
        },
      },
    });

    console.log(
      "→ Cek-tiket rate-limit fixtures dibersihkan.",
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
