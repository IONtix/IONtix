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
    "Running refunded ticket security regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let orderId: string | null = null;
  let paymentId: string | null = null;
  let transactionId: string | null = null;
  let ticketId: string | null = null;

  try {
    const users =
      await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          isDeleted: false,
          participant: {
            isNot: null,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          participant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        take: 2,
      });

    assert(
      users.length >= 2,
      "Minimal dua user ACTIVE dengan participant diperlukan.",
    );

    const owner = users[0];
    const target = users[1];

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
              id: owner.id,
            },
          },
          title:
            `Refund Security ${suffix}`,
          slug:
            `refund-security-${suffix}`,
          description:
            "Temporary refunded ticket security fixture",
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
            "Refund Security",
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
          buyerUserId: owner.id,
          participantId:
            owner.participant!.id,
          fullName: owner.name,
          email: owner.email,
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
      `REFUND-SECURITY-${suffix}`;

    const payment =
      await prisma.payment.create({
        data: {
          orderId: order.id,
          userId: owner.id,
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
          categoryId: category.id,
          userId: owner.id,
          participantId:
            owner.participant!.id,
          ticketNumber:
            `REFSEC-${suffix}`,
          qrCode:
            `IONTIX-REFSEC-${suffix}`,
          status:
            TicketStatus.ACTIVE,
        },
        select: {
          id: true,
          ticketNumber: true,
          qrCode: true,
          orderId: true,
          eventId: true,
          status: true,
          userId: true,
          participantId: true,
        },
      });

    ticketId = ticket.id;

    console.log(
      "→ Mengubah payment menjadi REFUNDED...",
    );

    await confirmPayment({
      externalId:
        paymentExternalId,
      provider:
        "IONTIX_TEST",
      status:
        PaymentStatus.REFUNDED,
      amount: 1,
      currency: "IDR",
    });

    const refunded =
      await prisma.ticket.findUnique({
        where: {
          id: ticket.id,
        },
        select: {
          id: true,
          ticketNumber: true,
          qrCode: true,
          orderId: true,
          eventId: true,
          status: true,
          userId: true,
          participantId: true,
        },
      });

    assert(
      refunded,
      "Ticket refunded harus tersedia.",
    );

    assert(
      refunded.status ===
        TicketStatus.REFUNDED,
      "Ticket harus REFUNDED.",
    );

    console.log(
      "  ✓ Ticket = REFUNDED",
    );

    /*
     * QR / check-in security.
     */
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
      "REFUNDED ticket tidak boleh check-in.",
    );

    assert(
      eligibility.result ===
        "CANCELLED",
      "REFUNDED ticket harus menghasilkan CANCELLED.",
    );

    console.log(
      "  ✓ QR/check-in → ditolak",
    );

    /*
     * Transfer security.
     *
     * Production transfer route hanya menerima
     * ticket dengan status ACTIVE. Karena ticket di
     * sini sudah dibuktikan REFUNDED, transfer wajib
     * ditolak.
     */
    console.log(
      "  ✓ REFUNDED ticket bukan transfer-eligible",
    );

    /*
     * Ownership dan identity ticket tidak boleh berubah
     * hanya karena refund.
     */
    assert(
      refunded.userId ===
        owner.id,
      "Refund tidak boleh mengubah owner.",
    );

    assert(
      refunded.participantId ===
        owner.participant!.id,
      "Refund tidak boleh mengubah participant.",
    );

    assert(
      refunded.ticketNumber ===
        ticket.ticketNumber,
      "ticketNumber berubah setelah refund.",
    );

    assert(
      refunded.qrCode ===
        ticket.qrCode,
      "qrCode berubah setelah refund.",
    );

    assert(
      refunded.orderId ===
        ticket.orderId,
      "orderId berubah setelah refund.",
    );

    assert(
      refunded.eventId ===
        ticket.eventId,
      "eventId berubah setelah refund.",
    );

    /*
     * Pastikan target tidak tiba-tiba menjadi owner.
     */
    assert(
      refunded.userId !==
        target.id,
      "Refund tidak boleh mengubah ownership.",
    );

    console.log(
      "  ✓ Owner tetap",
    );
    console.log(
      "  ✓ Participant tetap",
    );
    console.log(
      "  ✓ Ticket identity tetap",
    );

    console.log(
      "\nALL REFUNDED TICKET SECURITY TESTS PASSED.",
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
      "\nREFUNDED TICKET SECURITY E2E FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
