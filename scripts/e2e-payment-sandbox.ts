export {};

import "dotenv/config";

const e2eDatabaseUrl = process.env.DATABASE_URL;

if (!e2eDatabaseUrl) {
  throw new Error(
    "DATABASE_URL tidak tersedia untuk E2E sandbox.",
  );
}

/*
 * E2E sandbox hanya:
 * - membaca DATABASE_URL development
 * - mengubah sslmode agar koneksi dapat dipakai
 *   oleh standalone test runner.
 *
 * Tidak mengubah .env.
 * Tidak mengubah Prisma config.
 */
try {
  const databaseUrl = new URL(
    e2eDatabaseUrl,
  );

  databaseUrl.searchParams.set(
    "sslmode",
    "require",
  );

  process.env.DATABASE_URL =
    databaseUrl.toString();
} catch {
  throw new Error(
    "DATABASE_URL tidak valid.",
  );
}


import crypto from "node:crypto";

type CheckoutResult = {
  success: boolean;
  error?: string;
  orderIds?: string[];
  paymentSessions?: Array<{
    orderId: string;
    externalId: string;
    checkoutUrl: string | null;
    token: string | null;
    status: string;
  }>;
};

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `E2E TEST FAILED: ${message}`,
    );
  }
}

function uniqueSuffix(): string {
  return crypto.randomBytes(5).toString("hex");
}

async function main() {
  /*
   * Penting:
   * env di-set SEBELUM dynamic import checkout,
   * karena PAYMENT_PROVIDER dibaca saat module dimuat.
   */
  process.env.IONTIX_PAYMENT_PROVIDER =
    "IONTIX_TEST";

  const { default: prisma } =
    await import("@/lib/prisma");

  const {
    PaymentStatus,
    OrderStatus,
    TicketStatus,
  } = await import(
    "@/generated/prisma/client"
  );

  const {
    processCheckout,
  } = await import(
    "@/app/actions/checkout"
  );

  const {
    confirmPayment,
  } = await import(
    "@/lib/payment/confirmation"
  );

  const {
    reconcileExpiredPayments,
  } = await import(
    "@/lib/payment/reconciliation"
  );

  const suffix = uniqueSuffix();

  const eventTitle =
    `IONtix E2E Sandbox ${suffix}`;

  const eventSlug =
    `iontix-e2e-${suffix}`;

  const firstEmail =
    `e2e-${suffix}-01@example.test`;

  const secondEmail =
    `e2e-${suffix}-02@example.test`;

  let eventId: string | null = null;
  let categoryId: string | null = null;

  const createdOrderIds: string[] = [];

  const createdParticipantIds: string[] = [];

  const createdUserIds: string[] = [];

  try {
    console.log(
      "→ Memeriksa role PESERTA...",
    );

    const pesertaRole =
      await prisma.role.findUnique({
        where: {
          name: "PESERTA",
        },
        select: {
          id: true,
        },
      });

    assert(
      pesertaRole,
      "Role PESERTA belum tersedia.",
    );

    console.log(
      "  ✓ Role PESERTA tersedia",
    );

    console.log(
      "→ Membuat event sandbox...",
    );

    const event =
      await prisma.event.create({
        data: {
          title: eventTitle,
          slug: eventSlug,
          description:
            "IONtix automated E2E sandbox event.",
          date: new Date(
            Date.now() +
              7 * 24 * 60 * 60 * 1000,
          ),
          location:
            "IONtix Sandbox",
          timezone:
            "Asia/Jakarta",
          status:
            "PUBLISHED",
          isPublished: true,
          publishedAt:
            new Date(),
        },
        select: {
          id: true,
        },
      });

    eventId = event.id;

    console.log(
      `  ✓ Event ${event.id}`,
    );

    console.log(
      "→ Membuat ticket category...",
    );

    const category =
      await prisma.ticketCategory.create({
        data: {
          eventId:
            event.id,
          name:
            "E2E TEST 5K",
          price:
            100000,
          capacity:
            5,
          requireApproval:
            false,
          isActive:
            true,
          sortOrder:
            1,
        },
        select: {
          id: true,
          price: true,
        },
      });

    categoryId =
      category.id;

    console.log(
      `  ✓ Category ${category.id}`,
    );

    /*
     * ============================================================
     * FLOW 1 — CHECKOUT → PENDING
     * ============================================================
     */

    console.log();
    console.log(
      "→ FLOW 1: Checkout peserta #1...",
    );

    const checkoutOne =
      (await processCheckout({
        eventId:
          event.id,
        totalAmount:
          category.price,
        paymentMethod:
          "qris",
        participants: [
          {
            ticketId:
              category.id,
            fullName:
              "IONtix E2E Participant 01",
            email:
              firstEmail,
            phone:
              "081234567890",
            jerseySize:
              "M",
            bloodType:
              "O",
            emergencyContact:
              "081234567891",
            customAnswers: {},
          },
        ],
        addons: [],
      })) as CheckoutResult;

    assert(
      checkoutOne.success,
      checkoutOne.error ??
        "Checkout pertama gagal.",
    );

    assert(
      checkoutOne.orderIds?.length === 1,
      "Checkout pertama harus menghasilkan satu order.",
    );

    assert(
      checkoutOne.paymentSessions?.length === 1,
      "Checkout pertama harus menghasilkan satu payment session.",
    );

    const orderIdOne =
      checkoutOne.orderIds![0];

    const sessionOne =
      checkoutOne.paymentSessions![0];

    createdOrderIds.push(
      orderIdOne,
    );

    console.log(
      `  ✓ Order ${orderIdOne}`,
    );

    console.log(
      `  ✓ External ID ${sessionOne.externalId}`,
    );

    assert(
      sessionOne.status ===
        PaymentStatus.PENDING,
      "Payment pertama harus PENDING.",
    );

    const orderOne =
      await prisma.order.findUnique({
        where: {
          id: orderIdOne,
        },
        include: {
          payments: true,
          transactions: true,
          participant: true,
        },
      });

    assert(
      orderOne,
      "Order pertama tidak ditemukan.",
    );

    assert(
      orderOne.status ===
        OrderStatus.PENDING_PAYMENT,
      "Order pertama harus PENDING_PAYMENT.",
    );

    assert(
      orderOne.payments.length === 1,
      "Order pertama harus memiliki satu Payment.",
    );

    assert(
      orderOne.transactions.length === 1,
      "Order pertama harus memiliki satu Transaction.",
    );

    assert(
      orderOne.payments[0].status ===
        PaymentStatus.PENDING,
      "Payment pertama harus PENDING di database.",
    );

    assert(
      orderOne.transactions[0].status ===
        PaymentStatus.PENDING,
      "Transaction pertama harus PENDING.",
    );

    assert(
      orderOne.participant,
      "Participant pertama belum dibuat.",
    );

    createdParticipantIds.push(
      orderOne.participant.id,
    );

    createdUserIds.push(
      orderOne.buyerUserId!,
    );

    const ticketsBefore =
      await prisma.ticket.count({
        where: {
          orderId:
            orderIdOne,
        },
      });

    assert(
      ticketsBefore === 0,
      "Ticket tidak boleh dibuat saat checkout.",
    );

    console.log(
      "  ✓ Order PENDING_PAYMENT",
    );

    console.log(
      "  ✓ Payment PENDING",
    );

    console.log(
      "  ✓ Transaction PENDING",
    );

    console.log(
      "  ✓ Ticket = 0",
    );

    /*
     * ============================================================
     * FLOW 2 — PROVIDER → CONFIRM SUCCESS
     * ============================================================
     */

    console.log();
    console.log(
      "→ FLOW 2: Payment SUCCESS...",
    );

    const successResult =
      await confirmPayment({
        externalId:
          sessionOne.externalId,
        provider:
          "IONTIX_TEST",
        status:
          PaymentStatus.SUCCESS,
        providerTransactionId:
          `E2E-TX-${suffix}-01`,
        amount:
          category.price,
        currency:
          "IDR",
        providerResponse: {
          mode:
            "e2e",
          scenario:
            "success",
        },
        paidAt:
          new Date(),
        expiresAt:
          null,
      });

    assert(
      successResult.success,
      "confirmPayment SUCCESS gagal.",
    );

    assert(
      successResult.orderStatus ===
        OrderStatus.PAID,
      "Order harus menjadi PAID.",
    );

    assert(
      successResult.paymentStatus ===
        PaymentStatus.SUCCESS,
      "Payment harus menjadi SUCCESS.",
    );

    assert(
      successResult.ticketIds.length === 1,
      "SUCCESS pertama harus menerbitkan satu ticket.",
    );

    console.log(
      "  ✓ Payment SUCCESS",
    );

    console.log(
      "  ✓ Order PAID",
    );

    console.log(
      "  ✓ Ticket diterbitkan",
    );

    const ticketAfterSuccess =
      await prisma.ticket.findMany({
        where: {
          orderId:
            orderIdOne,
        },
        select: {
          id: true,
          status: true,
          qrCode: true,
        },
      });

    assert(
      ticketAfterSuccess.length === 1,
      "Harus ada tepat satu ticket setelah SUCCESS.",
    );

    assert(
      ticketAfterSuccess[0].status ===
        TicketStatus.ACTIVE,
      "Ticket harus ACTIVE.",
    );

    /*
     * ============================================================
     * FLOW 3 — DUPLICATE SUCCESS / IDEMPOTENCY
     * ============================================================
     */

    console.log();
    console.log(
      "→ FLOW 3: SUCCESS duplicate...",
    );

    const duplicateSuccess =
      await confirmPayment({
        externalId:
          sessionOne.externalId,
        provider:
          "IONTIX_TEST",
        status:
          PaymentStatus.SUCCESS,
        providerTransactionId:
          `E2E-TX-${suffix}-01`,
        amount:
          category.price,
        currency:
          "IDR",
        providerResponse: {
          mode:
            "e2e",
          scenario:
            "duplicate-success",
        },
        paidAt:
          new Date(),
        expiresAt:
          null,
      });

    assert(
      duplicateSuccess.alreadyProcessed,
      "Duplicate SUCCESS seharusnya alreadyProcessed=true.",
    );

    const ticketAfterDuplicate =
      await prisma.ticket.count({
        where: {
          orderId:
            orderIdOne,
        },
      });

    assert(
      ticketAfterDuplicate === 1,
      "Duplicate SUCCESS tidak boleh membuat ticket kedua.",
    );

    console.log(
      "  ✓ Duplicate SUCCESS idempotent",
    );

    console.log(
      "  ✓ Ticket tetap 1",
    );

    /*
     * ============================================================
     * FLOW 4 — EXPIRED CHECKOUT
     * ============================================================
     */

    console.log();
    console.log(
      "→ FLOW 4: Checkout peserta #2...",
    );

    const checkoutTwo =
      (await processCheckout({
        eventId:
          event.id,
        totalAmount:
          category.price,
        paymentMethod:
          "qris",
        participants: [
          {
            ticketId:
              category.id,
            fullName:
              "IONtix E2E Participant 02",
            email:
              secondEmail,
            phone:
              "081234567892",
            jerseySize:
              "M",
            bloodType:
              "A",
            emergencyContact:
              "081234567893",
            customAnswers: {},
          },
        ],
        addons: [],
      })) as CheckoutResult;

    assert(
      checkoutTwo.success,
      checkoutTwo.error ??
        "Checkout kedua gagal.",
    );

    assert(
      checkoutTwo.orderIds?.length === 1,
      "Checkout kedua harus menghasilkan satu order.",
    );

    const orderIdTwo =
      checkoutTwo.orderIds![0];

    createdOrderIds.push(
      orderIdTwo,
    );

    const orderTwo =
      await prisma.order.findUnique({
        where: {
          id: orderIdTwo,
        },
        include: {
          payments: true,
          participant: true,
        },
      });

    assert(
      orderTwo,
      "Order kedua tidak ditemukan.",
    );

    assert(
      orderTwo.payments.length === 1,
      "Order kedua harus memiliki satu payment.",
    );

    assert(
      orderTwo.participant,
      "Participant kedua belum dibuat.",
    );

    createdParticipantIds.push(
      orderTwo.participant.id,
    );

    createdUserIds.push(
      orderTwo.buyerUserId!,
    );

    const paymentTwo =
      orderTwo.payments[0];

    const expiredAt =
      new Date(
        Date.now() - 60_000,
      );

    await prisma.payment.update({
      where: {
        id:
          paymentTwo.id,
      },
      data: {
        expiresAt:
          expiredAt,
      },
    });

    console.log(
      "  ✓ Payment kedua dibuat expired",
    );

    const reconciliation =
      await reconcileExpiredPayments(
        new Date(),
      );

    assert(
      reconciliation.processedPayments >= 1,
      "Payment expired tidak direconcile.",
    );

    const expiredOrder =
      await prisma.order.findUnique({
        where: {
          id: orderIdTwo,
        },
        select: {
          status: true,
        },
      });

    const expiredPayment =
      await prisma.payment.findUnique({
        where: {
          id:
            paymentTwo.id,
        },
        select: {
          status: true,
        },
      });

    assert(
      expiredOrder?.status ===
        OrderStatus.EXPIRED,
      "Order kedua harus EXPIRED.",
    );

    assert(
      expiredPayment?.status ===
        PaymentStatus.EXPIRED,
      "Payment kedua harus EXPIRED.",
    );

    const expiredTickets =
      await prisma.ticket.count({
        where: {
          orderId:
            orderIdTwo,
        },
      });

    assert(
      expiredTickets === 0,
      "Order expired tidak boleh memiliki ticket.",
    );

    console.log(
      "  ✓ Order EXPIRED",
    );

    console.log(
      "  ✓ Payment EXPIRED",
    );

    console.log(
      "  ✓ Ticket expired order = 0",
    );

    /*
     * ============================================================
     * FINAL ASSERTIONS
     * ============================================================
     */

    console.log();
    console.log(
      "→ Final database assertions...",
    );

    const finalOrderOne =
      await prisma.order.findUnique({
        where: {
          id:
            orderIdOne,
        },
        select: {
          status: true,
          payments: {
            select: {
              status: true,
            },
          },
        },
      });

    assert(
      finalOrderOne?.status ===
        OrderStatus.PAID,
      "Order sukses harus tetap PAID.",
    );

    assert(
      finalOrderOne.payments[0]
        ?.status ===
        PaymentStatus.SUCCESS,
      "Payment sukses harus tetap SUCCESS.",
    );

    const finalTicketCount =
      await prisma.ticket.count({
        where: {
          orderId:
            orderIdOne,
        },
      });

    assert(
      finalTicketCount === 1,
      "Order sukses harus memiliki tepat satu ticket.",
    );

    console.log(
      "  ✓ Order SUCCESS tetap PAID",
    );

    console.log(
      "  ✓ Payment SUCCESS tetap SUCCESS",
    );

    console.log(
      "  ✓ Total ticket sukses = 1",
    );

    console.log();
    console.log(
      "ALL E2E PAYMENT SANDBOX TESTS PASSED.",
    );
  } finally {
    /*
     * ============================================================
     * CLEANUP
     * ============================================================
     */

    console.log();
    console.log(
      "→ Membersihkan fixture sandbox...",
    );

    if (
      createdOrderIds.length > 0
    ) {
      await prisma.ticket.deleteMany({
        where: {
          orderId: {
            in:
              createdOrderIds,
          },
        },
      });

      await prisma.order.deleteMany({
        where: {
          id: {
            in:
              createdOrderIds,
          },
        },
      });
    }

    if (
      createdParticipantIds.length > 0
    ) {
      await prisma.participantEvent.deleteMany({
        where: {
          participantId: {
            in:
              createdParticipantIds,
          },
        },
      });

      await prisma.participant.deleteMany({
        where: {
          id: {
            in:
              createdParticipantIds,
          },
        },
      });
    }

    if (
      createdUserIds.length > 0
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
      "✓ Fixture sandbox dibersihkan.",
    );

    await prisma.$disconnect();
  }
}

main().catch(
  (error: unknown) => {
    console.error();
    console.error(
      error instanceof Error
        ? error.stack ??
            error.message
        : error,
    );

    process.exitCode = 1;
  },
);
