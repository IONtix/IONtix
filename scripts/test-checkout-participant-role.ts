import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  OrderStatus,
  PaymentStatus,
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

async function main(): Promise<void> {
  console.log(
    "Running checkout participant-role regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId:
    string | null = null;
  let categoryId:
    string | null = null;
  let userId:
    string | null = null;
  let participantId:
    string | null = null;
  let participantEventId:
    string | null = null;
  const orderIds:
    string[] = [];

  const email =
    `checkout-role-${suffix}@iontix.local`;

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
            `Checkout Role ${suffix}`,
          slug:
            `checkout-role-${suffix}`,
          description:
            "Checkout participant role regression.",
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
            `Role Category ${suffix}`,
          price:
            100000,
          capacity:
            10,
          isActive:
            true,
        },
        select: {
          id: true,
        },
      });

    categoryId =
      category.id;

    await processCheckout({
      eventId:
        event.id,
      totalAmount:
        100000,
      paymentMethod:
        "qris",
      participants: [
        {
          ticketId:
            category.id,
          fullName:
            "Checkout Role Test",
          email,
          phone:
            "081234567890",
          jerseySize:
            "M",
          customAnswers:
            {},
        },
      ],
      addons: [],
    });

    /*
     * Jangan bergantung pada bentuk union
     * CheckoutOrderResponse. Cari order yang
     * benar-benar tersimpan di database.
     */
    const createdOrder =
      await prisma.order.findFirst({
        where: {
          eventId:
            event.id,
          email,
          buyerUserId: {
            not: null,
          },
        },
        orderBy: {
          createdAt:
            "desc",
        },
        select: {
          id: true,
        },
      });

    assert(
      createdOrder,
      "Order checkout harus tersimpan.",
    );

    orderIds.push(
      createdOrder.id,
    );

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

    assert(
      user,
      "User baru harus dibuat.",
    );

    userId =
      user.id;

    assert(
      user.role?.name ===
        "PARTICIPANT",
      `User baru harus role PARTICIPANT, received ${user.role?.name}.`,
    );

    console.log(
      "  ✓ User baru → PARTICIPANT",
    );

    const participant =
      await prisma.participant.findUnique({
        where: {
          userId:
            user.id,
        },
        select: {
          id: true,
        },
      });

    assert(
      participant,
      "Participant canonical harus dibuat.",
    );

    participantId =
      participant.id;

    const participantEvent =
      await prisma.participantEvent.findUnique({
        where: {
          participantId_eventId: {
            participantId:
              participant.id,
            eventId:
              event.id,
          },
        },
        select: {
          id: true,
        },
      });

    assert(
      participantEvent,
      "ParticipantEvent harus dibuat.",
    );

    participantEventId =
      participantEvent.id;

    const order =
      await prisma.order.findUnique({
        where: {
          id:
            createdOrder.id,
        },
        select: {
          id:
            true,
          buyerUserId:
            true,
          status:
            true,
          totalPrice:
            true,
        },
      });

    assert(
      order,
      "Order harus tersimpan.",
    );

    assert(
      order.buyerUserId ===
        user.id,
      "buyerUserId harus menunjuk ke user checkout.",
    );

    assert(
      order.status ===
        OrderStatus.PENDING_PAYMENT,
      "Order awal harus PENDING_PAYMENT.",
    );

    assert(
      order.totalPrice ===
        100000,
      "Total order harus berasal dari harga server-side.",
    );

    const payment =
      await prisma.payment.findFirst({
        where: {
          orderId:
            order.id,
        },
        select: {
          status:
            true,
          amount:
            true,
        },
      });

    assert(
      payment,
      "Payment harus dibuat.",
    );

    assert(
      payment.status ===
        PaymentStatus.PENDING,
      "Payment awal harus PENDING.",
    );

    assert(
      payment.amount ===
        100000,
      "Payment amount harus berasal dari server-side order total.",
    );

    console.log(
      "  ✓ Participant + ParticipantEvent + Order + Payment valid",
    );

    console.log(
      "\nALL CHECKOUT PARTICIPANT-ROLE TESTS PASSED.",
    );
  } finally {
    if (participantEventId) {
      await prisma.participantEvent.deleteMany({
        where: {
          id:
            participantEventId,
        },
      });
    }

    if (participantId) {
      await prisma.participant.deleteMany({
        where: {
          id:
            participantId,
        },
      });
    }

    if (orderIds.length > 0) {
      await prisma.order.deleteMany({
        where: {
          id: {
            in:
              orderIds,
          },
        },
      });
    }

    if (userId) {
      await prisma.user.deleteMany({
        where: {
          id:
            userId,
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

    console.log(
      "→ Checkout role fixtures dibersihkan.",
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
