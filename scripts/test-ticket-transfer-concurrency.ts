import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";

type TransferResult =
  | {
      success: true;
      toUserId: string;
    }
  | {
      success: false;
      toUserId: string;
    };

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
    "Running real concurrent ticket transfer regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let participantAId: string | null = null;
  let orderId: string | null = null;
  let ticketId: string | null = null;

  try {
    console.log("→ Mencari source user...");

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

    assert(
      Boolean(sourceUser),
      "Source user harus tersedia.",
    );

    const targetUsers =
      await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          isDeleted: false,
          id: {
            not: sourceUser!.id,
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
        take: 3,
      });

    assert(
      targetUsers.length >= 2,
      "Minimal dua target user ACTIVE dengan participant profile diperlukan.",
    );

    const targetB = targetUsers[0];
    const targetC = targetUsers[1];

    console.log("✓ Source user tersedia.");
    console.log("✓ Dua target user tersedia.");

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
            `Transfer Concurrency ${suffix}`,
          slug:
            `transfer-concurrency-${suffix}`,
          description:
            "Temporary concurrent transfer fixture",
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
          name: "Transfer Concurrency",
          price: 1,
          capacity: 10,
        },
        select: {
          id: true,
        },
      });

    categoryId = category.id;

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
            `transfer-source-${suffix}@iontix.local`,
          phone:
            "0000000000",
        },
        select: {
          id: true,
        },
      });

    participantAId =
      participantA.id;

    await prisma.participantEvent.create({
      data: {
        participantId:
          participantA.id,
        eventId:
          event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    await prisma.participantEvent.create({
      data: {
        participantId:
          targetB.participant!.id,
        eventId:
          event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    await prisma.participantEvent.create({
      data: {
        participantId:
          targetC.participant!.id,
        eventId:
          event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    const order =
      await prisma.order.create({
        data: {
          eventId:
            event.id,
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
          currency:
            "IDR",
          status:
            "PAID",
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
          orderId:
            order.id,
          eventId:
            event.id,
          participantId:
            participantA.id,
          userId:
            sourceUser!.id,
          categoryId:
            category.id,
          ticketNumber:
            `TRANSFER-CONC-${suffix}`,
          qrCode:
            `IONTIX-TRANSFER-CONC-${suffix}`,
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
      `✓ Ticket fixture: ${ticket.id}`,
    );

    async function transferTo(
      targetUserId: string,
      targetParticipantId: string,
    ): Promise<TransferResult> {
      return prisma.$transaction(
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

          /*
           * Ownership yang valid untuk kedua request
           * harus tetap source owner.
           *
           * Request kedua akan membaca state setelah
           * request pertama commit dan kalah secara
           * deterministic.
           */
          if (
            locked!.userId !==
            sourceUser!.id
          ) {
            return {
              success: false,
              toUserId:
                targetUserId,
            };
          }

          if (
            locked!.status !==
            "ACTIVE"
          ) {
            return {
              success: false,
              toUserId:
                targetUserId,
            };
          }

          const target =
            await tx.user.findUnique({
              where: {
                id:
                  targetUserId,
              },
              select: {
                id: true,
                name: true,
                status: true,
                isDeleted: true,
                participant: {
                  select: {
                    id: true,
                  },
                },
              },
            });

          if (
            !target ||
            target.status !==
              "ACTIVE" ||
            target.isDeleted ||
            !target.participant
          ) {
            return {
              success: false,
              toUserId:
                targetUserId,
            };
          }

          await tx.ticket.update({
            where: {
              id: ticket.id,
            },
            data: {
              userId:
                target.id,
              participantId:
                targetParticipantId,
              transferredAt:
                new Date(),
            },
          });

          await tx.ticketTransfer.create({
            data: {
              ticketId:
                ticket.id,
              fromUserId:
                sourceUser!.id,
              toUserId:
                target.id,
              fromName:
                sourceUser!.name,
              toName:
                target.name,
              reason:
                "29E-3 concurrency test",
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
              },
              afterData: {
                userId:
                  target.id,
              },
              metadata: {
                eventId:
                  ticket.eventId,
                reason:
                  "29E-3 concurrency test",
              },
            },
          });

          return {
            success: true,
            toUserId:
              target.id,
          };
        },
        {
          maxWait: 10_000,
          timeout: 15_000,
        },
      );
    }

    console.log(
      "→ Menjalankan A→B dan A→C secara paralel...",
    );

    const results =
      await Promise.allSettled([
        transferTo(
          targetB.id,
          targetB.participant!.id,
        ),
        transferTo(
          targetC.id,
          targetC.participant!.id,
        ),
      ]);

    const fulfilled =
      results.filter(
        (
          result,
        ): result is PromiseFulfilledResult<TransferResult> =>
          result.status ===
          "fulfilled",
      );

    const rejected =
      results.filter(
        (
          result,
        ): result is PromiseRejectedResult =>
          result.status ===
          "rejected",
      );

    assert(
      rejected.length === 0,
      "Tidak boleh ada transaction transfer yang rejected.",
    );

    const values =
      fulfilled.map(
        (item) =>
          item.value,
      );

    const successCount =
      values.filter(
        (item) =>
          item.success,
      ).length;

    const failureCount =
      values.filter(
        (item) =>
          !item.success,
      ).length;

    console.log(
      `  Fulfilled = ${fulfilled.length}`,
    );
    console.log(
      `  SUCCESS = ${successCount}`,
    );
    console.log(
      `  CONFLICT = ${failureCount}`,
    );

    assert(
      successCount === 1,
      `Harus ada tepat 1 transfer sukses, ditemukan ${successCount}.`,
    );

    assert(
      failureCount === 1,
      `Harus ada tepat 1 transfer gagal, ditemukan ${failureCount}.`,
    );

    console.log(
      "  ✓ Tepat 1 transfer berhasil",
    );

    console.log(
      "  ✓ Tepat 1 transfer kalah",
    );

    const finalTicket =
      await prisma.ticket.findUnique({
        where: {
          id:
            ticket.id,
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
      finalTicket?.status ===
        "ACTIVE",
      "Status final harus ACTIVE.",
    );

    assert(
      finalTicket?.ticketNumber ===
        ticket.ticketNumber,
      "ticketNumber berubah.",
    );

    assert(
      finalTicket?.qrCode ===
        ticket.qrCode,
      "qrCode berubah.",
    );

    assert(
      finalTicket?.orderId ===
        ticket.orderId,
      "orderId berubah.",
    );

    assert(
      finalTicket?.eventId ===
        ticket.eventId,
      "eventId berubah.",
    );

    const finalUserId =
      finalTicket?.userId;

    assert(
      finalUserId ===
        targetB.id ||
      finalUserId ===
        targetC.id,
      "Owner final harus B atau C.",
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
      `Harus ada 1 TicketTransfer, ditemukan ${transferCount}.`,
    );

    assert(
      auditCount === 1,
      `Harus ada 1 AuditLog transfer, ditemukan ${auditCount}.`,
    );

    console.log(
      `  ✓ Owner final = ${finalUserId}`,
    );
    console.log(
      "  ✓ Exactly 1 TicketTransfer",
    );
    console.log(
      "  ✓ Exactly 1 AuditLog",
    );
    console.log(
      "  ✓ ticketNumber tetap",
    );
    console.log(
      "  ✓ qrCode tetap",
    );
    console.log(
      "  ✓ orderId tetap",
    );
    console.log(
      "  ✓ eventId tetap",
    );
    console.log(
      "\nALL CONCURRENT TICKET TRANSFER TESTS PASSED.",
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

    if (participantAId) {
      await prisma.participantEvent.deleteMany({
        where: {
          participantId:
            participantAId,
        },
      });

      await prisma.participant.deleteMany({
        where: {
          id:
            participantAId,
        },
      });
    }

    if (eventId) {
      await prisma.participantEvent.deleteMany({
        where: {
          eventId:
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
      "\nCONCURRENT TICKET TRANSFER TEST FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
