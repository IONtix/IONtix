import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";

type ConcurrentResult = {
  success: boolean;
  result: "SUCCESS" | "ALREADY_USED" | "INVALID";
  ticketId: string;
  checkInId?: string;
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
    "Running real concurrent check-in regression...",
  );

  const suffix = crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let participantId: string | null = null;
  let orderId: string | null = null;
  let ticketId: string | null = null;

  try {
    console.log("→ Mencari existing user untuk actor...");

    const actor = await prisma.user.findFirst({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    assert(
      Boolean(actor),
      "Minimal satu user ACTIVE harus tersedia.",
    );

    console.log("✓ Actor tersedia.");

    console.log("→ Mencari organization fixture...");

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

    console.log("✓ Organization tersedia.");

    console.log("→ Membuat event fixture...");

    const event = await prisma.event.create({
      data: {
        organization: {
          connect: {
            id: organization!.id,
          },
        },
        eo: {
          connect: {
            id: actor!.id,
          },
        },
        title: `Check-in Concurrency ${suffix}`,
        slug: `checkin-concurrency-${suffix}`,
        description: "Temporary test fixture",
        date: new Date(Date.now() + 86_400_000),
        location: "IONtix Test Venue",
        status: "PUBLISHED",
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    eventId = event.id;

    console.log(`✓ Event: ${event.id}`);

    console.log("→ Membuat ticket category...");

    const category =
      await prisma.ticketCategory.create({
        data: {
          eventId: event.id,
          name: "Concurrency Test",
          price: 1,
          capacity: 10,
        },
        select: {
          id: true,
        },
      });

    categoryId = category.id;

    console.log(`✓ Category: ${category.id}`);

    console.log("→ Membuat participant fixture...");

    const participant =
      await prisma.participant.create({
        data: {
          fullName: "Concurrency Test Participant",
          email: `checkin-${suffix}@iontix.local`,
          phone: "0000000000",
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      });

    participantId = participant.id;

    await prisma.participantEvent.create({
      data: {
        participantId: participant.id,
        eventId: event.id,
        approvalStatus: "APPROVED",
      },
    });

    console.log(
      `✓ Participant: ${participant.id}`,
    );

    console.log("→ Membuat order fixture...");

    const order = await prisma.order.create({
      data: {
        eventId: event.id,
        buyerUserId: actor!.id,
        participantId: participant.id,
        fullName: participant.fullName,
        email: participant.email,
        subtotal: 1,
        totalPrice: 1,
        currency: "IDR",
        status: "PAID",
        approvalStatus: "APPROVED",
        ticketCategoryId: category.id,
      },
      select: {
        id: true,
      },
    });

    orderId = order.id;

    console.log(`✓ Order: ${order.id}`);

    console.log("→ Membuat ACTIVE ticket...");

    const ticket = await prisma.ticket.create({
      data: {
        orderId: order.id,
        eventId: event.id,
        participantId: participant.id,
        userId: actor!.id,
        categoryId: category.id,
        ticketNumber: `CONC-${suffix}`,
        qrCode: `IONTIX-CONC-${suffix}`,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    ticketId = ticket.id;

    console.log(`✓ Ticket: ${ticket.id}`);

    /*
     * Gunakan transaction yang sama secara konseptual
     * dengan production mutation:
     *
     * 1. baca ticket
     * 2. FOR UPDATE
     * 3. cek existing CheckIn
     * 4. SUCCESS → create CheckIn + USED
     * 5. second transaction → ALREADY_USED
     */
    async function runCheckIn(
      actorId: string,
      deviceId: string,
    ): Promise<ConcurrentResult> {
      return prisma.$transaction(
        async (tx) => {
          const lockedTicket =
            await tx.ticket.findUnique({
              where: {
                id: ticket.id,
              },
              select: {
                id: true,
                eventId: true,
                participantId: true,
                status: true,
                isScanned: true,
                checkedInAt: true,
              },
            });

          assert(
            Boolean(lockedTicket),
            "Ticket harus tersedia.",
          );

          await tx.$queryRaw`
            SELECT "id"
            FROM "Ticket"
            WHERE "id" = ${lockedTicket!.id}
            FOR UPDATE
          `;

          const existingCheckIn =
            await tx.checkIn.findUnique({
              where: {
                eventId_ticketId: {
                  eventId:
                    lockedTicket!.eventId,
                  ticketId:
                    lockedTicket!.id,
                },
              },
              select: {
                id: true,
                status: true,
                checkedInAt: true,
              },
            });

          if (
            existingCheckIn?.status ===
              "CHECKED_IN" ||
            lockedTicket!.isScanned ||
            Boolean(lockedTicket!.checkedInAt)
          ) {
            await tx.ticketScan.create({
              data: {
                ticketId: lockedTicket!.id,
                eventId:
                  lockedTicket!.eventId,
                scannedById: actorId,
                result: "ALREADY_USED",
                deviceId,
                message:
                  "Concurrent regression: already used.",
              },
            });

            return {
              success: false,
              result: "ALREADY_USED",
              ticketId: lockedTicket!.id,
            };
          }

          assert(
            lockedTicket!.status === "ACTIVE",
            "Fixture ticket harus ACTIVE.",
          );

          const checkIn =
            await tx.checkIn.create({
              data: {
                eventId:
                  lockedTicket!.eventId,
                ticketId:
                  lockedTicket!.id,
                participantId:
                  lockedTicket!.participantId,
                status: "CHECKED_IN",
                checkedInById: actorId,
                checkedInAt: new Date(),
              },
              select: {
                id: true,
              },
            });

          await tx.ticket.update({
            where: {
              id: lockedTicket!.id,
            },
            data: {
              isScanned: true,
              checkedInAt: new Date(),
              status: "USED",
            },
          });

          await tx.ticketScan.create({
            data: {
              ticketId: lockedTicket!.id,
              eventId:
                lockedTicket!.eventId,
              scannedById: actorId,
              result: "SUCCESS",
              deviceId,
              message:
                "Concurrent regression: success.",
            },
          });

          return {
            success: true,
            result: "SUCCESS",
            ticketId: lockedTicket!.id,
            checkInId: checkIn.id,
          };
        },
        {
          maxWait: 10_000,
          timeout: 10_000,
        },
      );
    }

    console.log(
      "→ Menjalankan dua check-in secara paralel...",
    );

    const results =
      await Promise.allSettled([
        runCheckIn(
          actor!.id,
          `device-A-${suffix}`,
        ),
        runCheckIn(
          actor!.id,
          `device-B-${suffix}`,
        ),
      ]);

    const fulfilled =
      results.filter(
        (
          result,
        ): result is PromiseFulfilledResult<ConcurrentResult> =>
          result.status === "fulfilled",
      );

    const rejected =
      results.filter(
        (
          result,
        ): result is PromiseRejectedResult =>
          result.status === "rejected",
      );

    assert(
      rejected.length === 0,
      "Tidak boleh ada transaction concurrency yang rejected.",
    );

    const values = fulfilled.map(
      (item) => item.value,
    );

    const successCount =
      values.filter(
        (item) => item.result === "SUCCESS",
      ).length;

    const alreadyUsedCount =
      values.filter(
        (item) => item.result === "ALREADY_USED",
      ).length;

    console.log(
      `  Fulfilled = ${fulfilled.length}`,
    );
    console.log(
      `  SUCCESS = ${successCount}`,
    );
    console.log(
      `  ALREADY_USED = ${alreadyUsedCount}`,
    );

    assert(
      successCount === 1,
      `Harus ada tepat 1 SUCCESS, ditemukan ${successCount}.`,
    );

    assert(
      alreadyUsedCount === 1,
      `Harus ada tepat 1 ALREADY_USED, ditemukan ${alreadyUsedCount}.`,
    );

    console.log("  ✓ Tepat 1 SUCCESS");
    console.log("  ✓ Tepat 1 ALREADY_USED");

    console.log(
      "→ Memeriksa final ticket state...",
    );

    const finalTicket =
      await prisma.ticket.findUnique({
        where: {
          id: ticket.id,
        },
        select: {
          status: true,
          isScanned: true,
          checkedInAt: true,
        },
      });

    assert(
      finalTicket?.status === "USED",
      "Final ticket harus USED.",
    );

    assert(
      finalTicket?.isScanned === true,
      "Final isScanned harus true.",
    );

    assert(
      finalTicket?.checkedInAt !== null,
      "Final checkedInAt harus terisi.",
    );

    console.log("  ✓ Ticket final = USED");
    console.log("  ✓ isScanned = true");
    console.log("  ✓ checkedInAt terisi");

    const checkInCount =
      await prisma.checkIn.count({
        where: {
          ticketId: ticket.id,
          eventId: event.id,
          status: "CHECKED_IN",
        },
      });

    assert(
      checkInCount === 1,
      `Harus ada tepat 1 CheckIn, ditemukan ${checkInCount}.`,
    );

    console.log(
      "  ✓ Tepat 1 CheckIn",
    );

    const successScanCount =
      await prisma.ticketScan.count({
        where: {
          ticketId: ticket.id,
          eventId: event.id,
          result: "SUCCESS",
        },
      });

    const duplicateScanCount =
      await prisma.ticketScan.count({
        where: {
          ticketId: ticket.id,
          eventId: event.id,
          result: "ALREADY_USED",
        },
      });

    assert(
      successScanCount === 1,
      `Harus ada tepat 1 SUCCESS TicketScan, ditemukan ${successScanCount}.`,
    );

    assert(
      duplicateScanCount === 1,
      `Harus ada tepat 1 ALREADY_USED TicketScan, ditemukan ${duplicateScanCount}.`,
    );

    console.log(
      "  ✓ Tepat 1 SUCCESS TicketScan",
    );
    console.log(
      "  ✓ Tepat 1 ALREADY_USED TicketScan",
    );

    console.log(
      "\nALL CONCURRENT CHECK-IN TESTS PASSED.",
    );
  } finally {
    console.log(
      "→ Membersihkan fixture...",
    );

    if (ticketId) {
      await prisma.ticketScan.deleteMany({
        where: {
          ticketId,
        },
      });

      await prisma.checkIn.deleteMany({
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

    if (participantId) {
      await prisma.participantEvent.deleteMany({
        where: {
          participantId,
        },
      });

      await prisma.participant.deleteMany({
        where: {
          id: participantId,
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

    console.log("✓ Fixture dibersihkan.");
  }
}

main()
  .catch((error) => {
    console.error(
      "\nCONCURRENT CHECK-IN TEST FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
