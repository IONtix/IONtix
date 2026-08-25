import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";

import {
  createIontixTestCapability,
} from "@/lib/payment/test-capability";

import {
  PaymentStatus,
} from "@/generated/prisma/client";

import {
  POST,
} from "@/app/api/payments/iontix-test/confirm/route";

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
  body: unknown,
): Request {
  return new Request(
    "http://localhost:3000/api/payments/iontix-test/confirm",
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
      },
      body:
        JSON.stringify(body),
    },
  );
}

async function main(): Promise<void> {
  console.log(
    "Running IONTIX_TEST confirm capability route regression...",
  );

  const originalEnabled =
    process.env.IONTIX_TEST_ENABLED;

  const originalSecret =
    process.env
      .IONTIX_TEST_CAPABILITY_SECRET;

  process.env.IONTIX_TEST_ENABLED =
    "true";

  process.env
    .IONTIX_TEST_CAPABILITY_SECRET =
    "LOCAL-CONFIRM-ROUTE-TEST-SECRET";

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let orderId:
    string | null = null;

  let paymentId:
    string | null = null;

  let transactionId:
    string | null = null;

  let eventId:
    string | null = null;

  let categoryId:
    string | null = null;

  try {
    const organization =
      await prisma.organization.findFirst({
        select: {
          id: true,
        },
      });

    assert(
      organization,
      "Organization harus tersedia.",
    );

    const participant =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          isDeleted: false,
          role: {
            name: "PARTICIPANT",
          },
        },
        select: {
          id: true,
        },
      });

    assert(
      participant,
      "User PARTICIPANT aktif harus tersedia.",
    );

    const event =
      await prisma.event.create({
        data: {
          organizationId:
            organization.id,
          title:
            `Capability Route ${suffix}`,
          slug:
            `capability-route-${suffix}`,
          description:
            "Capability route regression fixture.",
          date:
            new Date(
              Date.now() +
                24 * 60 * 60 * 1000,
            ),
          location:
            "Regression Test",
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
            `Capability Category ${suffix}`,
          price:
            100000,
          capacity:
            10,
        },
        select: {
          id: true,
        },
      });

    categoryId =
      category.id;

    /*
     * Kita membuat fixture minimal langsung
     * untuk confirmPayment.
     *
     * Detail field mengikuti schema/project
     * melalui create sebelumnya pada payment
     * regression.
     */
    const order =
      await prisma.order.create({
        data: {
          orderNumber:
            `CAP-${suffix}`,
          buyerUserId:
            participant.id,
          eventId:
            event.id,
          ticketCategoryId:
            category.id,
          fullName:
            "Capability Route Test",
          email:
            `capability-${suffix}@iontix.local`,
          phone:
            "081234567890",
          totalPrice:
            100000,
          status:
            "PENDING_PAYMENT",
        },
        select: {
          id: true,
        },
      });

    orderId =
      order.id;

    const paymentExternalId =
      `IONTIX-CAPABILITY-${suffix}`;

    const payment =
      await prisma.payment.create({
        data: {
          orderId:
            order.id,
          externalId:
            paymentExternalId,
          provider:
            "IONTIX_TEST",
          amount:
            100000,
          currency:
            "IDR",
          method:
            "OTHER",
          status:
            PaymentStatus.PENDING,
        },
        select: {
          id: true,
          externalId:
            true,
        },
      });

    paymentId =
      payment.id;

    assert(
      payment.externalId ===
        paymentExternalId,
      "Payment externalId fixture harus tersedia.",
    );

    const transaction =
      await prisma.transaction.create({
        data: {
          paymentId:
            payment.id,
          orderId:
            order.id,
          externalId:
            payment.externalId,
          amount:
            100000,
          status:
            PaymentStatus.PENDING,
        },
        select: {
          id: true,
        },
      });

    transactionId =
      transaction.id;

    const validCapability =
      createIontixTestCapability(
        paymentExternalId,
      );

    /*
     * =========================================================
     * VALID
     * =========================================================
     */

    const valid =
      await POST(
        makeRequest({
          provider:
            "IONTIX_TEST",
          externalId:
            payment.externalId,
          capability:
            validCapability,
          status:
            PaymentStatus.FAILED,
          amount:
            100000,
          currency:
            "IDR",
          providerTransactionId:
            `CAP-VALID-${suffix}`,
        }),
      );

    assert(
      valid.status ===
        200,
      `Valid capability harus 200, received ${valid.status}.`,
    );

    console.log(
      "  ✓ Valid capability → 200",
    );

    /*
     * =========================================================
     * MISSING
     * =========================================================
     */

    const missing =
      await POST(
        makeRequest({
          provider:
            "IONTIX_TEST",
          externalId:
            payment.externalId,
          status:
            PaymentStatus.FAILED,
        }),
      );

    assert(
      missing.status ===
        403,
      `Missing capability harus 403, received ${missing.status}.`,
    );

    console.log(
      "  ✓ Missing capability → 403",
    );

    /*
     * =========================================================
     * WRONG PAYMENT
     * =========================================================
     */

    const wrongExternalId =
      await POST(
        makeRequest({
          provider:
            "IONTIX_TEST",
          externalId:
            `${payment.externalId}-OTHER`,
          capability:
            validCapability,
          status:
            PaymentStatus.FAILED,
        }),
      );

    assert(
      wrongExternalId.status ===
        403,
      `Capability A + externalId B harus 403, received ${wrongExternalId.status}.`,
    );

    console.log(
      "  ✓ Capability A + externalId B → 403",
    );

    /*
     * =========================================================
     * TAMPERED
     * =========================================================
     */

    const parts =
      validCapability.split(".");

    const tampered =
      `${parts[0]}x.${parts[1]}`;

    const tamperedResponse =
      await POST(
        makeRequest({
          provider:
            "IONTIX_TEST",
          externalId:
            payment.externalId,
          capability:
            tampered,
          status:
            PaymentStatus.FAILED,
        }),
      );

    assert(
      tamperedResponse.status ===
        403,
      `Tampered capability harus 403, received ${tamperedResponse.status}.`,
    );

    console.log(
      "  ✓ Tampered capability → 403",
    );

    console.log(
      "\nALL IONTIX_TEST CONFIRM CAPABILITY ROUTE TESTS PASSED.",
    );
  } finally {
    if (transactionId) {
      await prisma.transaction.deleteMany({
        where: {
          id:
            transactionId,
        },
      });
    }

    if (paymentId) {
      await prisma.payment.deleteMany({
        where: {
          id:
            paymentId,
        },
      });
    }

    if (orderId) {
      await prisma.order.deleteMany({
        where: {
          id:
            orderId,
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

    if (
      originalEnabled ===
      undefined
    ) {
      delete process.env
        .IONTIX_TEST_ENABLED;
    } else {
      process.env
        .IONTIX_TEST_ENABLED =
        originalEnabled;
    }

    if (
      originalSecret ===
      undefined
    ) {
      delete process.env
        .IONTIX_TEST_CAPABILITY_SECRET;
    } else {
      process.env
        .IONTIX_TEST_CAPABILITY_SECRET =
        originalSecret;
    }

    console.log(
      "→ Confirm capability fixtures dibersihkan.",
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
