import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  OrderStatus,
} from "@/generated/prisma/client";

import {
  processCheckout,
} from "@/app/actions/checkout";

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

function buildPayload(
  eventId: string,
  ticketId: string,
  email: string,
) {
  return {
    eventId,
    totalAmount: 100000,
    paymentMethod: "qris",
    participants: [
      {
        ticketId,
        fullName: `Concurrency ${email}`,
        email,
        phone: "081234567890",
        jerseySize: "M",
        customAnswers: {},
      },
    ],
    addons: [],
  };
}

async function main(): Promise<void> {
  console.log(
    "Running deterministic checkout concurrency regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  const emailA =
    `checkout-concurrency-a-${suffix}@iontix.local`;

  const emailB =
    `checkout-concurrency-b-${suffix}@iontix.local`;

  let eventId:
    string | null = null;

  let categoryId:
    string | null = null;

  const orderIds:
    string[] = [];

  const createdUserEmails = [
    emailA,
    emailB,
  ];

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

    const event =
      await prisma.event.create({
        data: {
          organizationId:
            organization.id,
          title:
            `Checkout Concurrency ${suffix}`,
          slug:
            `checkout-concurrency-${suffix}`,
          description:
            "Deterministic checkout concurrency regression.",
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

    eventId =
      event.id;

    const category =
      await prisma.ticketCategory.create({
        data: {
          eventId:
            event.id,
          name:
            `Concurrency Category ${suffix}`,
          price:
            100000,
          capacity:
            1,
          isActive:
            true,
        },
        select: {
          id: true,
        },
      });

    categoryId =
      category.id;

    console.log(
      "✓ Capacity fixture = 1",
    );

    const results =
      await Promise.all([
        processCheckout(
          buildPayload(
            event.id,
            category.id,
            emailA,
          ),
        ),
        processCheckout(
          buildPayload(
            event.id,
            category.id,
            emailB,
          ),
        ),
      ]);

    const successfulResults =
      results.filter(
        (response) =>
          response.success ===
          true,
      );

    const failedResults =
      results.filter(
        (response) =>
          response.success !==
          true,
      );

    console.log(
      `  Success responses = ${successfulResults.length}`,
    );

    console.log(
      `  Failure responses = ${failedResults.length}`,
    );

    for (
      const response of failedResults
    ) {
      console.log(
        `  Failure response: ${JSON.stringify(response)}`,
      );
    }

    assert(
      successfulResults.length ===
        1,
      `Capacity 1 harus menghasilkan tepat 1 checkout sukses, received ${successfulResults.length}.`,
    );

    assert(
      failedResults.length ===
        1,
      `Capacity 1 harus menghasilkan tepat 1 checkout gagal, received ${failedResults.length}.`,
    );

    const activeOrders =
      await prisma.order.findMany({
        where: {
          eventId:
            event.id,
          ticketCategoryId:
            category.id,
          status: {
            in: [
              OrderStatus.PENDING_PAYMENT,
              OrderStatus.PAYMENT_PROCESSING,
              OrderStatus.PAID,
            ],
          },
        },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });

    for (const order of activeOrders) {
      orderIds.push(
        order.id,
      );
    }

    console.log(
      `  Active orders = ${activeOrders.length}`,
    );

    assert(
      activeOrders.length ===
        1,
      `Capacity 1 tidak boleh menghasilkan lebih dari 1 active order, received ${activeOrders.length}.`,
    );

    console.log(
      "  ✓ Tidak terjadi overselling",
    );

    const paymentCount =
      await prisma.payment.count({
        where: {
          orderId: {
            in:
              orderIds,
          },
        },
      });

    assert(
      paymentCount ===
        1,
      `Harus ada tepat satu payment untuk checkout yang menang, received ${paymentCount}.`,
    );

    console.log(
      "  ✓ Tepat satu payment dibuat",
    );

    console.log(
      "\nALL CHECKOUT CONCURRENCY TESTS PASSED.",
    );
  } finally {
    if (eventId) {
      await prisma.order.deleteMany({
        where: {
          eventId:
            eventId,
        },
      });
    }

    await prisma.user.deleteMany({
      where: {
        email: {
          in:
            createdUserEmails,
        },
      },
    });

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

    console.log(
      "→ Checkout concurrency fixtures dibersihkan.",
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
