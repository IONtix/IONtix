import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

async function main(): Promise<void> {
  console.log(
    "Running ticket transfer contract test...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let participantAId: string | null = null;
  let participantBId: string | null = null;
  let userAId: string | null = null;
  let userBId: string | null = null;
  let orderId: string | null = null;
  let ticketId: string | null = null;

  try {
    console.log("→ Mencari actor user...");

    const sourceUser =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

    const targetUserBase =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          isDeleted: false,
          id: {
            not: sourceUser?.id,
          },
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
            },
          },
        },
      });

    assert(
      Boolean(sourceUser),
      "Source user harus tersedia.",
    );

    assert(
      Boolean(targetUserBase),
      "Target user harus tersedia.",
    );

    assert(
      Boolean(targetUserBase?.participant),
      "Target user harus memiliki participant.",
    );

    userAId = sourceUser!.id;
    userBId = targetUserBase!.id;

    console.log("✓ Source user tersedia.");
    console.log("✓ Target user + participant tersedia.");

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
              id: sourceUser!.id,
            },
          },
          title:
            `Ticket Transfer Test ${suffix}`,
          slug:
            `ticket-transfer-test-${suffix}`,
          description:
            "Temporary transfer regression fixture",
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
          name: "Transfer Test",
          price: 1,
          capacity: 10,
        },
        select: {
          id: true,
        },
      });

    categoryId = category.id;

    console.log("✓ Event + category dibuat.");

    const participantA =
      await prisma.participant.create({
        data: {
          user: {
            connect: {
              id: sourceUser!.id,
            },
          },
          fullName:
            sourceUser!.name,
          email:
            sourceUser!.email,
          phone:
            "0000000000",
        },
        select: {
          id: true,
        },
      });

    participantAId =
      participantA.id;

    /*
     * Target user sudah memiliki Participant profile.
     * Kita gunakan profile tersebut agar tidak membuat
     * duplicate Participant untuk User B.
     */
    participantBId =
      targetUserBase!.participant!.id;

    await prisma.participantEvent.create({
      data: {
        participantId:
          participantA.id,
        eventId: event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    await prisma.participantEvent.create({
      data: {
        participantId:
          participantBId,
        eventId: event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    console.log(
      "✓ Participant event fixture dibuat.",
    );

    const order =
      await prisma.order.create({
        data: {
          eventId: event.id,
          buyerUserId:
            sourceUser!.id,
          participantId:
            participantA.id,
          fullName:
            sourceUser!.name,
          email:
            sourceUser!.email,
          subtotal: 1,
          totalPrice: 1,
          currency: "IDR",
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

    const ticket =
      await prisma.ticket.create({
        data: {
          orderId: order.id,
          eventId: event.id,
          participantId:
            participantA.id,
          userId:
            sourceUser!.id,
          categoryId:
            category.id,
          ticketNumber:
            `TRANSFER-${suffix}`,
          qrCode:
            `IONTIX-TRANSFER-${suffix}`,
          status: "ACTIVE",
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
      `✓ Ticket dibuat: ${ticket.id}`,
    );

    /*
     * 29E-2 menguji mutation transaction secara langsung.
     * Ini sama dengan core mutation route:
     * - lock
     * - ownership check
     * - target user check
     * - update ticket
     * - create TicketTransfer
     * - create AuditLog
     */
    const result =
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
                eventId: true,
                status: true,
                ticketNumber: true,
                qrCode: true,
                orderId: true,
              },
            });

          assert(
            Boolean(locked),
            "Ticket harus tersedia.",
          );

          assert(
            locked!.userId ===
              sourceUser!.id,
            "Source user harus menjadi owner awal.",
          );

          assert(
            locked!.status ===
              "ACTIVE",
            "Ticket harus ACTIVE.",
          );

          const targetUser =
            await tx.user.findUnique({
              where: {
                id: targetUserBase!.id,
              },
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                isDeleted: true,
                participant: {
                  select: {
                    id: true,
                  },
                },
              },
            });

          assert(
            Boolean(targetUser),
            "Target user harus tersedia.",
          );

          assert(
            targetUser!.status ===
              "ACTIVE",
            "Target user harus ACTIVE.",
          );

          assert(
            !targetUser!.isDeleted,
            "Target user tidak boleh deleted.",
          );

          assert(
            Boolean(
              targetUser!.participant,
            ),
            "Target user harus memiliki participant.",
          );

          const transferredAt =
            new Date();

          await tx.ticket.update({
            where: {
              id: ticket.id,
            },
            data: {
              userId:
                targetUser!.id,
              participantId:
                targetUser!.participant!.id,
              transferredAt,
            },
          });

          await tx.ticketTransfer.create({
            data: {
              ticketId:
                ticket.id,
              fromUserId:
                sourceUser!.id,
              toUserId:
                targetUser!.id,
              fromName:
                sourceUser!.name,
              toName:
                targetUser!.name,
              reason:
                "29E-2 contract test",
            },
          });

          await tx.auditLog.create({
            data: {
              actorUserId:
                sourceUser!.id,
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
                  sourceUser!.id,
                participantId:
                  participantA.id,
                ticketNumber:
                  ticket.ticketNumber,
                qrCode:
                  ticket.qrCode,
                orderId:
                  ticket.orderId,
                eventId:
                  ticket.eventId,
              },
              afterData: {
                userId:
                  targetUser!.id,
                participantId:
                  targetUser!
                    .participant!.id,
                ticketNumber:
                  ticket.ticketNumber,
                qrCode:
                  ticket.qrCode,
                orderId:
                  ticket.orderId,
                eventId:
                  ticket.eventId,
              },
            },
          });

          return true;
        },
        {
          maxWait: 10_000,
          timeout: 15_000,
        },
      );

    assert(
      result === true,
      "Transfer transaction harus sukses.",
    );

    const finalTicket =
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
      finalTicket?.userId ===
        userBId,
      "Ticket.userId harus berpindah ke target.",
    );

    assert(
      finalTicket?.participantId ===
        participantBId,
      "Ticket.participantId harus berpindah ke target participant.",
    );

    assert(
      finalTicket?.ticketNumber ===
        ticket.ticketNumber,
      "ticketNumber tidak boleh berubah.",
    );

    assert(
      finalTicket?.qrCode ===
        ticket.qrCode,
      "qrCode tidak boleh berubah.",
    );

    assert(
      finalTicket?.orderId ===
        ticket.orderId,
      "orderId tidak boleh berubah.",
    );

    assert(
      finalTicket?.eventId ===
        ticket.eventId,
      "eventId tidak boleh berubah.",
    );

    assert(
      finalTicket?.status ===
        "ACTIVE",
      "Status ticket harus tetap ACTIVE.",
    );

    const transfers =
      await prisma.ticketTransfer.findMany({
        where: {
          ticketId:
            ticket.id,
        },
        orderBy: {
          transferredAt:
            "asc",
        },
      });

    assert(
      transfers.length === 1,
      `Harus ada tepat 1 TicketTransfer, ditemukan ${transfers.length}.`,
    );

    assert(
      transfers[0].fromUserId ===
        userAId,
      "fromUserId harus source owner.",
    );

    assert(
      transfers[0].toUserId ===
        userBId,
      "toUserId harus target owner.",
    );

    const audits =
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
      audits === 1,
      `Harus ada tepat 1 AuditLog transfer, ditemukan ${audits}.`,
    );

    console.log(
      "✓ Ownership berpindah A → B",
    );
    console.log(
      "✓ Participant berpindah A → B",
    );
    console.log(
      "✓ ticketNumber tetap",
    );
    console.log(
      "✓ qrCode tetap",
    );
    console.log(
      "✓ orderId tetap",
    );
    console.log(
      "✓ eventId tetap",
    );
    console.log(
      "✓ status tetap ACTIVE",
    );
    console.log(
      "✓ TicketTransfer = 1",
    );
    console.log(
      "✓ AuditLog transfer = 1",
    );

    console.log(
      "\nALL TICKET TRANSFER CONTRACT TESTS PASSED.",
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
          id: ticketId,
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

    if (participantAId) {
      await prisma.participantEvent.deleteMany({
        where: {
          participantId:
            participantAId,
        },
      });

      await prisma.participant.deleteMany({
        where: {
          id: participantAId,
        },
      });
    }

    if (participantBId && participantBId !== participantAId) {
      await prisma.participantEvent.deleteMany({
        where: {
          participantId:
            participantBId,
          eventId:
            eventId ?? undefined,
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
      "\nTICKET TRANSFER TEST FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
