import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  PaymentStatus,
  OrderStatus,
  TicketStatus,
} from "@/generated/prisma/client";
import { confirmPayment } from "@/lib/payment/confirmation";
import {
  evaluateCheckInEligibility,
} from "@/lib/checkin/rules";

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
    "Running real ticket refund lifecycle regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let orderId: string | null = null;
  let paymentId: string | null = null;
  let ticketId: string | null = null;
  let transactionId: string | null = null;

  try {
    console.log("→ Mencari fixture actor...");

    const actor =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

    assert(
      actor,
      "User ACTIVE harus tersedia.",
    );

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
          organization: {
            connect: {
              id: organization.id,
            },
          },
          eo: {
            connect: {
              id: actor.id,
            },
          },
          title:
            `Refund Lifecycle ${suffix}`,
          slug:
            `refund-lifecycle-${suffix}`,
          description:
            "Temporary refund lifecycle fixture",
          date: new Date(
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
          name:
            "Refund Lifecycle",
          price: 1,
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
          buyerUserId: actor.id,
          fullName: actor.name,
          email: actor.email,
          subtotal: 1,
          totalPrice: 1,
          currency: "IDR",
          status: OrderStatus.PAID,
          approvalStatus: "APPROVED",
          ticketCategoryId:
            category.id,
        },
        select: {
          id: true,
        },
      });

    orderId = order.id;

    const paymentExternalId =
      `REFUND-E2E-${suffix}`;

    const payment =
      await prisma.payment.create({
        data: {
          orderId: order.id,
          userId: actor.id,
          externalId:
            paymentExternalId,
          provider:
            "IONTIX_TEST",
          amount: 1,
          currency: "IDR",
          status:
            PaymentStatus.SUCCESS,
        },
        select: {
          id: true,
          externalId: true,
        },
      });

    paymentId = payment.id;

    assert(
      payment.externalId ===
        paymentExternalId,
      "Payment externalId harus sesuai fixture.",
    );

    const transaction =
      await prisma.transaction.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          externalId:
            paymentExternalId,
          amount: 1,
          status:
            PaymentStatus.SUCCESS,
        },
        select: {
          id: true,
        },
      });

    transactionId =
      transaction.id;

    const ticket =
      await prisma.ticket.create({
        data: {
          orderId: order.id,
          transactionId:
            transaction.id,
          eventId: event.id,
          categoryId:
            category.id,
          userId: actor.id,
          status:
            TicketStatus.ACTIVE,
          ticketNumber:
            `REFUND-${suffix}`,
          qrCode:
            `IONTIX-REFUND-${suffix}`,
          issuedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
        },
      });

    ticketId = ticket.id;

    console.log("→ BEFORE refund...");

    assert(
      ticket.status ===
        TicketStatus.ACTIVE,
      "Ticket awal harus ACTIVE.",
    );

    const before =
      await prisma.order.findUnique({
        where: {
          id: order.id,
        },
        select: {
          status: true,
        },
      });

    assert(
      before?.status ===
        OrderStatus.PAID,
      "Order awal harus PAID.",
    );

    const beforePayment =
      await prisma.payment.findUnique({
        where: {
          id: payment.id,
        },
        select: {
          status: true,
        },
      });

    assert(
      beforePayment?.status ===
        PaymentStatus.SUCCESS,
      "Payment awal harus SUCCESS.",
    );

    console.log(
      "  ✓ Payment = SUCCESS",
    );
    console.log(
      "  ✓ Order = PAID",
    );
    console.log(
      "  ✓ Ticket = ACTIVE",
    );

    console.log(
      "→ Menjalankan confirmPayment(REFUNDED)...",
    );

    const result =
      await confirmPayment({
        externalId:
          paymentExternalId,
        provider:
          "IONTIX_TEST",
        status:
          PaymentStatus.REFUNDED,
        providerTransactionId:
          `REFUND-TXN-${suffix}`,
        amount: 1,
        currency: "IDR",
        providerResponse: {
          source:
            "29G-2 refund lifecycle regression",
        },
      });

    assert(
      result.success,
      "confirmPayment REFUNDED harus sukses.",
    );

    assert(
      result.paymentStatus ===
        PaymentStatus.REFUNDED,
      "Result paymentStatus harus REFUNDED.",
    );

    assert(
      result.orderStatus ===
        OrderStatus.REFUNDED,
      "Result orderStatus harus REFUNDED.",
    );

    console.log(
      "  ✓ confirmPayment → REFUNDED",
    );

    const afterPayment =
      await prisma.payment.findUnique({
        where: {
          id: payment.id,
        },
        select: {
          status: true,
        },
      });

    const afterOrder =
      await prisma.order.findUnique({
        where: {
          id: order.id,
        },
        select: {
          status: true,
        },
      });

    const afterTicket =
      await prisma.ticket.findUnique({
        where: {
          id: ticket.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

    assert(
      afterPayment?.status ===
        PaymentStatus.REFUNDED,
      "Database payment harus REFUNDED.",
    );

    assert(
      afterOrder?.status ===
        OrderStatus.REFUNDED,
      "Database order harus REFUNDED.",
    );

    assert(
      afterTicket?.status ===
        TicketStatus.REFUNDED,
      "Database ticket harus REFUNDED.",
    );

    console.log(
      "  ✓ Database Payment = REFUNDED",
    );
    console.log(
      "  ✓ Database Order = REFUNDED",
    );
    console.log(
      "  ✓ Database Ticket = REFUNDED",
    );

    const eligibility =
      evaluateCheckInEligibility({
        ticketStatus:
          TicketStatus.REFUNDED,
        eventStatus:
          "PUBLISHED",
        eventIsPublished: true,
        isAlreadyCheckedIn: false,
      });

    assert(
      eligibility.canCheckIn ===
        false,
      "Ticket REFUNDED tidak boleh check-in.",
    );

    assert(
      eligibility.result ===
        "CANCELLED",
      "Ticket REFUNDED harus menghasilkan CANCELLED pada QR/check-in rule.",
    );

    console.log(
      "  ✓ REFUNDED → check-in ditolak",
    );

    console.log(
      "→ Menguji idempotency REFUNDED...",
    );

    const second =
      await confirmPayment({
        externalId:
          paymentExternalId,
        provider:
          "IONTIX_TEST",
        status:
          PaymentStatus.REFUNDED,
        providerTransactionId:
          `REFUND-TXN-${suffix}-2`,
        amount: 1,
        currency: "IDR",
      });

    assert(
      second.success,
      "Callback REFUNDED kedua harus tetap sukses.",
    );

    const finalTicket =
      await prisma.ticket.findUnique({
        where: {
          id: ticket.id,
        },
        select: {
          status: true,
        },
      });

    assert(
      finalTicket?.status ===
        TicketStatus.REFUNDED,
      "Ticket tetap REFUNDED setelah callback kedua.",
    );

    console.log(
      "  ✓ REFUNDED callback kedua tetap idempotent",
    );

    console.log(
      "\nALL TICKET REFUND LIFECYCLE E2E TESTS PASSED.",
    );
  } finally {
    console.log(
      "→ Membersihkan fixture...",
    );

    if (ticketId) {
      await prisma.ticket.deleteMany({
        where: {
          id: ticketId,
        },
      });
    }

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
      "✓ Fixture dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nTICKET REFUND LIFECYCLE E2E FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
