import "dotenv/config";

import crypto from "node:crypto";

import {
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import prisma from "@/lib/prisma";
import { retryPaymentSession } from "@/lib/payment/retry";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

async function main(): Promise<void> {
  console.log(
    "Running real payment retry ownership E2E...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let orderId: string | null = null;
  let paymentId: string | null = null;
  let transactionId: string | null = null;

  try {
    const users =
      await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: 2,
      });

    assert(
      users.length >= 2,
      "Minimal dua user ACTIVE diperlukan.",
    );

    const owner = users[0]!;
    const attacker = users[1]!;

    console.log(
      "✓ Owner A + attacker B tersedia.",
    );

    const organization =
      await prisma.organization.findFirst({
        select: {
          id: true,
        },
      });

    assert(
      organization,
      "Organization fixture harus tersedia.",
    );

    const event =
      await prisma.event.create({
        data: {
          organization: {
            connect: {
              id: organization.id,
            },
          },
          eo: {
            connect: {
              id: owner.id,
            },
          },
          title:
            `Retry Ownership E2E ${suffix}`,
          slug:
            `retry-ownership-e2e-${suffix}`,
          description:
            "Temporary payment retry ownership fixture",
          date:
            new Date(
              Date.now() + 86_400_000,
            ),
          location:
            "IONtix Test Venue",
          status: "PUBLISHED",
          isPublished: true,
        },
        select: {
          id: true,
        },
      });

    eventId = event.id;

    const category =
      await prisma.ticketCategory.create({
        data: {
          eventId: event.id,
          name: "Retry Ownership Test",
          price: 1000,
          capacity: 10,
        },
        select: {
          id: true,
        },
      });

    categoryId = category.id;

    const order =
      await prisma.order.create({
        data: {
          eventId: event.id,
          buyerUserId: owner.id,
          fullName:
            owner.name,
          email:
            owner.email,
          phone:
            "0000000000",
          ticketCategoryId:
            category.id,
          subtotal: 1000,
          discountTotal: 0,
          addonTotal: 0,
          totalPrice: 1000,
          currency: "IDR",
          status:
            OrderStatus.PENDING_PAYMENT,
        },
        select: {
          id: true,
          buyerUserId: true,
          status: true,
        },
      });

    orderId = order.id;

    const payment =
      await prisma.payment.create({
        data: {
          orderId: order.id,
          userId: owner.id,
          externalId:
            `RETRY-E2E-${suffix}`,
          provider:
            "IONTIX_TEST",
          amount: 1000,
          currency: "IDR",
          status:
            PaymentStatus.PENDING,
          expiresAt:
            new Date(
              Date.now() + 30 * 60 * 1000,
            ),
        },
        select: {
          id: true,
          status: true,
          externalId: true,
        },
      });

    paymentId = payment.id;

    const transaction =
      await prisma.transaction.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          runnerId: owner.id,
          amount: 1000,
          status:
            PaymentStatus.PENDING,
          externalId:
            payment.externalId,
        },
        select: {
          id: true,
        },
      });

    transactionId =
      transaction.id;

    console.log(
      `✓ Order fixture: ${order.id}`,
    );

    console.log(
      "→ BEFORE retry...",
    );

    const beforePayment =
      await prisma.payment.findUnique({
        where: {
          id: payment.id,
        },
        select: {
          status: true,
          providerTransactionId: true,
          providerResponse: true,
          expiresAt: true,
        },
      });

    const beforeTransaction =
      await prisma.transaction.findUnique({
        where: {
          id: transaction.id,
        },
        select: {
          status: true,
        },
      });

    assert(
      beforePayment?.status ===
        PaymentStatus.PENDING,
      "Payment awal harus PENDING.",
    );

    assert(
      beforeTransaction?.status ===
        PaymentStatus.PENDING,
      "Transaction awal harus PENDING.",
    );

    console.log(
      "  ✓ Payment = PENDING",
    );
    console.log(
      "  ✓ Transaction = PENDING",
    );

    console.log(
      "→ Attacker B mencoba retry Order A...",
    );

    let denied = false;

    try {
      await retryPaymentSession({
        orderId: order.id,
        userId: attacker.id,
      });
    } catch (error) {
      denied = true;

      assert(
        error instanceof Error,
        "Retry non-owner harus menghasilkan Error.",
      );

      assert(
        error.message ===
          "Anda tidak memiliki akses ke order ini.",
        "Pesan authorization retry tidak sesuai.",
      );

      console.log(
        "  ✓ Non-owner → DENY",
      );
    }

    assert(
      denied,
      "Non-owner harus ditolak.",
    );

    const afterPayment =
      await prisma.payment.findUnique({
        where: {
          id: payment.id,
        },
        select: {
          status: true,
          providerTransactionId: true,
          providerResponse: true,
          expiresAt: true,
        },
      });

    const afterTransaction =
      await prisma.transaction.findUnique({
        where: {
          id: transaction.id,
        },
        select: {
          status: true,
        },
      });

    assert(
      afterPayment?.status ===
        beforePayment?.status,
      "Payment status tidak boleh berubah akibat unauthorized retry.",
    );

    assert(
      afterPayment?.providerTransactionId ===
        beforePayment?.providerTransactionId,
      "Provider transaction ID tidak boleh berubah.",
    );

    assert(
      JSON.stringify(
        afterPayment?.providerResponse ??
          null,
      ) ===
        JSON.stringify(
          beforePayment?.providerResponse ??
            null,
        ),
      "Provider response tidak boleh berubah.",
    );

    assert(
      afterTransaction?.status ===
        beforeTransaction?.status,
      "Transaction status tidak boleh berubah akibat unauthorized retry.",
    );

    console.log(
      "  ✓ Payment tetap PENDING",
    );
    console.log(
      "  ✓ Provider transaction ID tetap",
    );
    console.log(
      "  ✓ Provider response tetap",
    );
    console.log(
      "  ✓ Transaction tetap PENDING",
    );

    console.log(
      "\nALL PAYMENT RETRY OWNERSHIP E2E TESTS PASSED.",
    );
  } finally {
    if (transactionId) {
      await prisma.transaction.deleteMany({
        where: {
          id: transactionId,
        },
      });
    }

    if (paymentId) {
      await prisma.payment.deleteMany({
        where: {
          id: paymentId,
        },
      });
    }

    if (orderId) {
      await prisma.order.deleteMany({
        where: {
          id: orderId,
        },
      });
    }

    if (categoryId) {
      await prisma.ticketCategory.deleteMany({
        where: {
          id: categoryId,
        },
      });
    }

    if (eventId) {
      await prisma.event.deleteMany({
        where: {
          id: eventId,
        },
      });
    }

    console.log(
      "→ Fixture dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nPAYMENT RETRY OWNERSHIP E2E FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
