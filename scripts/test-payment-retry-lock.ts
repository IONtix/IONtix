import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  acquirePaymentRetryLock,
  releasePaymentRetryLock,
} from "@/lib/payment/retry-lock";

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
    "Running payment retry lock contract...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let orderId: string | null = null;

  try {
    const user =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          isDeleted: false,
          role: {
            name: "PESERTA",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

    assert(
      user,
      "User PESERTA aktif harus tersedia.",
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
          organizationId:
            organization.id,
          title:
            `Retry Lock ${suffix}`,
          slug:
            `retry-lock-${suffix}`,
          description:
            "Payment retry lock regression fixture.",
          date:
            new Date(
              Date.now() +
                24 *
                  60 *
                  60 *
                  1000,
            ),
          location:
            "IONtix Lock Test",
          status:
            "PUBLISHED",
          isPublished:
            true,
        },
        select: {
          id: true,
        },
      });

    try {
      const order =
        await prisma.order.create({
          data: {
            eventId:
              event.id,
            buyerUserId:
              user.id,
            fullName:
              user.name ??
              "Retry Lock User",
            email:
              user.email,
            subtotal:
              100000,
            totalPrice:
              100000,
            currency:
              "IDR",
            status:
              "PENDING_PAYMENT",
          },
          select: {
            id: true,
          },
        });

      orderId = order.id;

      console.log(
        "✓ Order fixture dibuat.",
      );

      /*
       * Dua request paralel untuk order yang sama.
       */
      const results =
        await Promise.all([
          acquirePaymentRetryLock(
            order.id,
          ),
          acquirePaymentRetryLock(
            order.id,
          ),
        ]);

      const acquiredCount =
        results.filter(
          Boolean,
        ).length;

      assert(
        acquiredCount === 1,
        `Expected exactly 1 lock owner, received ${acquiredCount}.`,
      );

      console.log(
        "  ✓ Dua request paralel → tepat 1 lock owner",
      );

      const lock =
        await prisma.paymentRetryLock.findUnique({
          where: {
            orderId:
              order.id,
          },
          select: {
            orderId: true,
            expiresAt: true,
          },
        });

      assert(
        lock,
        "Lock harus tersimpan.",
      );

      assert(
        lock.expiresAt >
          new Date(),
        "Lock harus memiliki expiry di masa depan.",
      );

      console.log(
        "  ✓ Lock tersimpan dengan expiry valid",
      );

      /*
       * Release membuka kembali retry.
       */
      await releasePaymentRetryLock(
        order.id,
      );

      const afterRelease =
        await prisma.paymentRetryLock.findUnique({
          where: {
            orderId:
              order.id,
          },
        });

      assert(
        !afterRelease,
        "Lock harus terhapus setelah release.",
      );

      console.log(
        "  ✓ Release menghapus lock",
      );

      const reacquired =
        await acquirePaymentRetryLock(
          order.id,
        );

      assert(
        reacquired,
        "Order harus dapat acquire kembali setelah release.",
      );

      console.log(
        "  ✓ Lock dapat di-acquire kembali setelah release",
      );

      console.log(
        "\nALL PAYMENT RETRY LOCK TESTS PASSED.",
      );
    } finally {
      /*
       * Pastikan lock dibersihkan sebelum order
       * dan event dihapus.
       */
      if (orderId) {
        await releasePaymentRetryLock(
          orderId,
        );

        await prisma.order.deleteMany({
          where: {
            id: orderId,
          },
        });

        orderId = null;
      }
    }

    await prisma.event.deleteMany({
      where: {
        id: event.id,
      },
    });

    console.log(
      "→ Retry lock fixtures dibersihkan.",
    );
  } finally {
    if (orderId) {
      await releasePaymentRetryLock(
        orderId,
      );

      await prisma.order.deleteMany({
        where: {
          id: orderId,
        },
      });
    }
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
