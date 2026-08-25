import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import { userOwnsOrder } from "@/lib/order/ownership";
import {
  assertOrderParticipantOrManagerAccess,
  assertOrderClaimAccess,
} from "@/lib/order/authorization";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function expectDenied(
  fn: () => void,
  label: string,
): void {
  try {
    fn();
  } catch (error) {
    assert(
      error instanceof Error,
      `${label} harus menghasilkan Error.`,
    );
    console.log(`  ✓ ${label} → DENY`);
    return;
  }

  throw new Error(
    `TEST FAILED: ${label} harus ditolak.`,
  );
}

async function main(): Promise<void> {
  console.log(
    "Running real order ownership E2E regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let organizationId: string | null = null;
  let eventId: string | null = null;
  let categoryId: string | null = null;
  let orderId: string | null = null;

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
    const otherUser = users[1]!;

    console.log("✓ Dua user ACTIVE tersedia.");

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

    organizationId =
      organization.id;

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
            `Order Ownership E2E ${suffix}`,
          slug:
            `order-ownership-e2e-${suffix}`,
          description:
            "Temporary order ownership fixture",
          date:
            new Date(
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

    const category =
      await prisma.ticketCategory.create({
        data: {
          eventId: event.id,
          name: "Ownership Test",
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
          buyerUserId:
            owner.id,
          fullName:
            owner.name,
          email:
            owner.email,
          phone:
            "0000000000",
          ticketCategoryId:
            category.id,
          subtotal: 1000,
          totalPrice: 1000,
          currency: "IDR",
          status: "PAID",
        },
        select: {
          id: true,
          buyerUserId: true,
          email: true,
        },
      });

    orderId = order.id;

    assert(
      order.buyerUserId ===
        owner.id,
      "Fixture buyerUserId harus owner A.",
    );

    console.log(
      `✓ Order fixture: ${order.id}`,
    );

    console.log(
      "→ BEFORE transfer/ownership...",
    );

    assert(
      userOwnsOrder({
        currentUserId:
          owner.id,
        currentUserEmail:
          owner.email,
        buyerUserId:
          order.buyerUserId,
        orderEmail:
          order.email,
      }) === true,
      "Owner A harus ALLOW.",
    );

    console.log(
      "  ✓ Owner A → ALLOW",
    );

    assert(
      userOwnsOrder({
        currentUserId:
          otherUser.id,
        currentUserEmail:
          otherUser.email,
        buyerUserId:
          order.buyerUserId,
        orderEmail:
          order.email,
      }) === false,
      "User B harus DENY.",
    );

    console.log(
      "  ✓ User B → DENY",
    );

    /*
     * Critical IDOR regression:
     * email sama tidak boleh mengalahkan buyerUserId yang berbeda.
     */
    expectDenied(
      () =>
        assertOrderParticipantOrManagerAccess({
          currentUserId:
            otherUser.id,
          currentUserEmail:
            owner.email,
          buyerUserId:
            owner.id,
          orderEmail:
            owner.email,
          eventPermissionGranted:
            false,
        }),
      "User B dengan email order sama",
    );

    assert(
      (() => {
        assertOrderParticipantOrManagerAccess({
          currentUserId:
            owner.id,
          currentUserEmail:
            owner.email,
          buyerUserId:
            owner.id,
          orderEmail:
            owner.email,
          eventPermissionGranted:
            false,
        });

        return true;
      })(),
      "Owner A harus mendapat akses object-level.",
    );

    console.log(
      "  ✓ Order detail owner A → ALLOW",
    );

    expectDenied(
      () =>
        assertOrderParticipantOrManagerAccess({
          currentUserId:
            otherUser.id,
          currentUserEmail:
            otherUser.email,
          buyerUserId:
            owner.id,
          orderEmail:
            owner.email,
          eventPermissionGranted:
            false,
        }),
      "Order detail user B",
    );

    assert(
      (() => {
        assertOrderParticipantOrManagerAccess({
          currentUserId:
            otherUser.id,
          currentUserEmail:
            otherUser.email,
          buyerUserId:
            owner.id,
          orderEmail:
            owner.email,
          eventPermissionGranted:
            true,
        });

        return true;
      })(),
      "Event manager harus bypass ownership.",
    );

    console.log(
      "  ✓ Event manager → ALLOW",
    );

    assert(
      (() => {
        assertOrderClaimAccess({
          currentUserId:
            owner.id,
          currentUserEmail:
            owner.email,
          buyerUserId:
            owner.id,
          orderEmail:
            owner.email,
          eventPermissionGranted:
            false,
        });

        return true;
      })(),
      "Owner harus dapat claim.",
    );

    console.log(
      "  ✓ Claim owner A → ALLOW",
    );

    expectDenied(
      () =>
        assertOrderClaimAccess({
          currentUserId:
            otherUser.id,
          currentUserEmail:
            otherUser.email,
          buyerUserId:
            owner.id,
          orderEmail:
            owner.email,
          eventPermissionGranted:
            false,
        }),
      "Claim user B",
    );

    assert(
      (() => {
        assertOrderClaimAccess({
          currentUserId:
            otherUser.id,
          currentUserEmail:
            otherUser.email,
          buyerUserId:
            owner.id,
          orderEmail:
            owner.email,
          eventPermissionGranted:
            true,
        });

        return true;
      })(),
      "Claim manager harus bypass ownership.",
    );

    console.log(
      "  ✓ Claim event manager → ALLOW",
    );

    /*
     * Verify persisted canonical owner.
     */
    const persisted =
      await prisma.order.findUnique({
        where: {
          id: order.id,
        },
        select: {
          id: true,
          buyerUserId: true,
          email: true,
        },
      });

    assert(
      persisted?.buyerUserId ===
        owner.id,
      "buyerUserId persisted harus owner A.",
    );

    console.log(
      "  ✓ buyerUserId persisted = owner A",
    );

    console.log(
      "\nALL ORDER OWNERSHIP E2E TESTS PASSED.",
    );
  } finally {
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

    void organizationId;
    console.log(
      "→ Fixture dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nORDER OWNERSHIP E2E FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
