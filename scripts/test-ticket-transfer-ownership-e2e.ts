import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import { userOwnsTicket } from "@/lib/ticket/ownership";

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
    "Running real ticket transfer ownership regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let orderId: string | null = null;
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

    const sourceUser = users[0];
    const targetUser = users[1];

    const organization =
      await prisma.organization.findFirst({
        select: {
          id: true,
        },
      });

    assert(
      Boolean(organization),
      "Organization harus tersedia.",
    );

    const event =
      await prisma.event.create({
        data: {
          organization: {
            connect: {
              id: organization!.id,
            },
          },
          eo: {
            connect: {
              id: sourceUser.id,
            },
          },
          title:
            `Transfer Ownership E2E ${suffix}`,
          slug:
            `transfer-ownership-e2e-${suffix}`,
          description:
            "Temporary ownership regression fixture",
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
            "Ownership E2E Test",
          price: 1,
          capacity: 10,
        },
        select: {
          id: true,
        },
      });

    categoryId = category.id;

    await prisma.participantEvent.create({
      data: {
        participantId:
          sourceUser.participant!.id,
        eventId: event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    await prisma.participantEvent.create({
      data: {
        participantId:
          targetUser.participant!.id,
        eventId: event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    const order =
      await prisma.order.create({
        data: {
          eventId: event.id,
          buyerUserId:
            sourceUser.id,
          participantId:
            sourceUser.participant!.id,
          fullName:
            sourceUser.name,
          email:
            sourceUser.email,
          subtotal: 1,
          totalPrice: 1,
          currency:
            "IDR",
          status: "PAID",
          approvalStatus:
            "APPROVED",
          ticketCategoryId:
            category.id,
        },
        select: {
          id: true,
        },
      });

    orderId = order.id;

    const originalQr =
      `IONTIX-OWNERSHIP-${suffix}`;

    const ticket =
      await prisma.ticket.create({
        data: {
          orderId: order.id,
          eventId: event.id,
          participantId:
            sourceUser.participant!.id,
          userId:
            sourceUser.id,
          categoryId:
            category.id,
          ticketNumber:
            `OWN-${suffix}`,
          qrCode:
            originalQr,
          status:
            "ACTIVE",
        },
        select: {
          id: true,
          ticketNumber: true,
          qrCode: true,
          orderId: true,
          eventId: true,
          userId: true,
          participantId: true,
          status: true,
        },
      });

    ticketId = ticket.id;

    console.log(
      "→ BEFORE transfer...",
    );

    assert(
      userOwnsTicket({
        currentUserId:
          sourceUser.id,
        currentUserEmail:
          sourceUser.email,
        ticketOwnerId:
          ticket.userId,
        ticketOwnerEmail:
          sourceUser.email,
      }),
      "Owner A harus dapat mengakses ticket sebelum transfer.",
    );

    assert(
      !userOwnsTicket({
        currentUserId:
          targetUser.id,
        currentUserEmail:
          targetUser.email,
        ticketOwnerId:
          ticket.userId,
        ticketOwnerEmail:
          sourceUser.email,
      }),
      "Owner B tidak boleh mengakses ticket sebelum transfer.",
    );

    console.log(
      "  ✓ Owner A → ALLOW",
    );
    console.log(
      "  ✓ Owner B → DENY",
    );

    console.log(
      "→ Menjalankan transfer transaction...",
    );

    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT "id"
          FROM "Ticket"
          WHERE "id" = ${ticket.id}
          FOR UPDATE
        `;

        const locked =
          await tx.ticket.findUnique({
            where: {
              id: ticket.id,
            },
            select: {
              id: true,
              userId: true,
              participantId: true,
              status: true,
            },
          });

        assert(
          locked,
          "Ticket harus tersedia.",
        );

        assert(
          locked.userId ===
            sourceUser.id,
          "Ownership awal harus A.",
        );

        assert(
          locked.status ===
            "ACTIVE",
          "Ticket harus ACTIVE.",
        );

        await tx.ticket.update({
          where: {
            id: ticket.id,
          },
          data: {
            userId:
              targetUser.id,
            participantId:
              targetUser.participant!.id,
            transferredAt:
              new Date(),
          },
        });

        await tx.ticketTransfer.create({
          data: {
            ticketId:
              ticket.id,
            fromUserId:
              sourceUser.id,
            toUserId:
              targetUser.id,
            fromName:
              sourceUser.name,
            toName:
              targetUser.name,
            reason:
              "29F-2B ownership regression",
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId:
              sourceUser.id,
            action:
              "TICKET_TRANSFERRED",
            module:
              "TICKETING",
            entityType:
              "Ticket",
            entityId:
              ticket.id,
            beforeData: {
              userId:
                sourceUser.id,
              participantId:
                sourceUser.participant!.id,
            },
            afterData: {
              userId:
                targetUser.id,
              participantId:
                targetUser.participant!.id,
            },
          },
        });
      },
      {
        maxWait: 10_000,
        timeout: 15_000,
      },
    );

    const transferred =
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
          userId: true,
          participantId: true,
          status: true,
        },
      });

    assert(
      transferred,
      "Ticket hasil transfer tidak ditemukan.",
    );

    assert(
      transferred.userId ===
        targetUser.id,
      "Owner akhir harus B.",
    );

    assert(
      transferred.participantId ===
        targetUser.participant!.id,
      "Participant akhir harus B.",
    );

    assert(
      userOwnsTicket({
        currentUserId:
          sourceUser.id,
        currentUserEmail:
          sourceUser.email,
        ticketOwnerId:
          transferred.userId,
        ticketOwnerEmail:
          targetUser.email,
      }) === false,
      "Owner lama A harus kehilangan akses.",
    );

    assert(
      userOwnsTicket({
        currentUserId:
          targetUser.id,
        currentUserEmail:
          targetUser.email,
        ticketOwnerId:
          transferred.userId,
        ticketOwnerEmail:
          targetUser.email,
      }) === true,
      "Owner baru B harus mendapatkan akses.",
    );

    assert(
      transferred.ticketNumber ===
        ticket.ticketNumber,
      "ticketNumber berubah.",
    );

    assert(
      transferred.qrCode ===
        ticket.qrCode,
      "qrCode berubah.",
    );

    assert(
      transferred.orderId ===
        ticket.orderId,
      "orderId berubah.",
    );

    assert(
      transferred.eventId ===
        ticket.eventId,
      "eventId berubah.",
    );

    assert(
      transferred.status ===
        "ACTIVE",
      "Status ticket berubah.",
    );

    const transferCount =
      await prisma.ticketTransfer.count({
        where: {
          ticketId:
            ticket.id,
        },
      });

    const auditCount =
      await prisma.auditLog.count({
        where: {
          entityType:
            "Ticket",
          entityId:
            ticket.id,
          action:
            "TICKET_TRANSFERRED",
        },
      });

    assert(
      transferCount === 1,
      `TicketTransfer harus 1, ditemukan ${transferCount}.`,
    );

    assert(
      auditCount === 1,
      `AuditLog harus 1, ditemukan ${auditCount}.`,
    );

    console.log(
      "  ✓ Owner A setelah transfer → DENY",
    );
    console.log(
      "  ✓ Owner B setelah transfer → ALLOW",
    );
    console.log(
      "  ✓ Ticket ID tetap",
    );
    console.log(
      "  ✓ ticketNumber tetap",
    );
    console.log(
      "  ✓ QR tetap",
    );
    console.log(
      "  ✓ orderId tetap",
    );
    console.log(
      "  ✓ eventId tetap",
    );
    console.log(
      "  ✓ Status ACTIVE tetap",
    );
    console.log(
      "  ✓ TicketTransfer = 1",
    );
    console.log(
      "  ✓ AuditLog = 1",
    );

    console.log(
      "\nALL TRANSFER OWNERSHIP E2E TESTS PASSED.",
    );
  } finally {
    console.log(
      "→ Membersihkan fixture...",
    );

    if (ticketId) {
      await prisma.auditLog.deleteMany({
        where: {
          entityType:
            "Ticket",
          entityId:
            ticketId,
          action:
            "TICKET_TRANSFERRED",
        },
      });

      await prisma.ticketTransfer.deleteMany({
        where: {
          ticketId,
        },
      });

      await prisma.ticket.deleteMany({
        where: {
          id:
            ticketId,
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

    if (eventId) {
      await prisma.participantEvent.deleteMany({
        where: {
          eventId,
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
      "✓ Fixture dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nTRANSFER OWNERSHIP E2E FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
