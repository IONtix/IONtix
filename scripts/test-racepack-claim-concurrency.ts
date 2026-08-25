import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";

type ClaimResult =
  | {
      success: true;
      result: "CLAIMED";
    }
  | {
      success: false;
      result: "ALREADY_CLAIMED";
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
    "Running real concurrent racepack claim regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let eventId: string | null = null;
  let categoryId: string | null = null;
  let participantId: string | null = null;
  let orderId: string | null = null;

  try {
    console.log(
      "→ Mencari existing user...",
    );

    const actor =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

    assert(
      Boolean(actor),
      "User ACTIVE harus tersedia.",
    );

    console.log("✓ Actor tersedia.");

    console.log(
      "→ Mencari organization...",
    );

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

    console.log(
      "✓ Organization tersedia.",
    );

    console.log(
      "→ Membuat event fixture...",
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
              id: actor!.id,
            },
          },
          title:
            `Racepack Claim Concurrency ${suffix}`,
          slug:
            `racepack-claim-concurrency-${suffix}`,
          description:
            "Temporary racepack claim test",
          date: new Date(
            Date.now() +
              86_400_000,
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

    console.log(
      `✓ Event: ${event.id}`,
    );

    const category =
      await prisma.ticketCategory.create({
        data: {
          eventId: event.id,
          name: "Racepack Concurrency",
          price: 1,
          capacity: 10,
        },
        select: {
          id: true,
        },
      });

    categoryId = category.id;

    console.log(
      `✓ Category: ${category.id}`,
    );

    const participant =
      await prisma.participant.create({
        data: {
          fullName:
            "Racepack Test Participant",
          email:
            `racepack-${suffix}@iontix.local`,
          phone: "0000000000",
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      });

    participantId =
      participant.id;

    await prisma.participantEvent.create({
      data: {
        participantId:
          participant.id,
        eventId:
          event.id,
        approvalStatus:
          "APPROVED",
      },
    });

    console.log(
      `✓ Participant: ${participant.id}`,
    );

    const order =
      await prisma.order.create({
        data: {
          eventId: event.id,
          buyerUserId: actor!.id,
          participantId:
            participant.id,
          fullName:
            participant.fullName,
          email:
            participant.email,
          subtotal: 1,
          totalPrice: 1,
          currency: "IDR",
          status: "PAID",
          approvalStatus:
            "APPROVED",
          ticketCategoryId:
            category.id,
          isClaimed: false,
        },
        select: {
          id: true,
          isClaimed: true,
        },
      });

    orderId = order.id;

    assert(
      order.isClaimed === false,
      "Fixture order harus belum claimed.",
    );

    console.log(
      `✓ Order: ${order.id}`,
    );

    async function claimRacepack(): Promise<ClaimResult> {
      return prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.order.updateMany({
              where: {
                id: order.id,
                isClaimed: false,
              },
              data: {
                isClaimed: true,
              },
            });

          if (
            updated.count !== 1
          ) {
            return {
              success: false,
              result:
                "ALREADY_CLAIMED",
            };
          }

          return {
            success: true,
            result: "CLAIMED",
          };
        },
        {
          maxWait: 10_000,
          timeout: 10_000,
        },
      );
    }

    console.log(
      "→ Menjalankan dua claim paralel...",
    );

    const results =
      await Promise.allSettled([
        claimRacepack(),
        claimRacepack(),
      ]);

    const fulfilled =
      results.filter(
        (
          result,
        ): result is PromiseFulfilledResult<ClaimResult> =>
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
      "Tidak boleh ada transaction claim yang rejected.",
    );

    const values =
      fulfilled.map(
        (result) =>
          result.value,
      );

    const claimedCount =
      values.filter(
        (result) =>
          result.result ===
          "CLAIMED",
      ).length;

    const conflictCount =
      values.filter(
        (result) =>
          result.result ===
          "ALREADY_CLAIMED",
      ).length;

    console.log(
      `  Fulfilled = ${fulfilled.length}`,
    );
    console.log(
      `  CLAIMED = ${claimedCount}`,
    );
    console.log(
      `  ALREADY_CLAIMED = ${conflictCount}`,
    );

    assert(
      claimedCount === 1,
      `Harus ada tepat 1 CLAIMED, ditemukan ${claimedCount}.`,
    );

    assert(
      conflictCount === 1,
      `Harus ada tepat 1 ALREADY_CLAIMED, ditemukan ${conflictCount}.`,
    );

    console.log(
      "  ✓ Tepat 1 CLAIMED",
    );
    console.log(
      "  ✓ Tepat 1 ALREADY_CLAIMED",
    );

    const finalOrder =
      await prisma.order.findUnique({
        where: {
          id: order.id,
        },
        select: {
          isClaimed: true,
          status: true,
        },
      });

    assert(
      finalOrder?.isClaimed ===
        true,
      "Order final harus isClaimed=true.",
    );

    assert(
      finalOrder?.status ===
        "PAID",
      "Order racepack fixture harus tetap PAID.",
    );

    console.log(
      "  ✓ isClaimed final = true",
    );
    console.log(
      "  ✓ Order tetap PAID",
    );

    console.log(
      "\nALL CONCURRENT RACEPACK CLAIM TESTS PASSED.",
    );
  } finally {
    console.log(
      "→ Membersihkan fixture...",
    );

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

    console.log(
      "✓ Fixture dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nCONCURRENT RACEPACK TEST FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
