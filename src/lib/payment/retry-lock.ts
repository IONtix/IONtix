import crypto from "node:crypto";

import { Prisma } from "@/generated/prisma/client";

import prisma from "@/lib/prisma";

const RETRY_LOCK_TTL_SECONDS = 60;

export async function acquirePaymentRetryLock(
  orderId: string,
): Promise<boolean> {
  const now = new Date();

  await prisma.paymentRetryLock.deleteMany({
    where: {
      orderId,
      expiresAt: {
        lte: now,
      },
    },
  });

  try {
    await prisma.paymentRetryLock.create({
      data: {
        id: crypto.randomUUID(),
        orderId,
        expiresAt: new Date(
          now.getTime() +
            RETRY_LOCK_TTL_SECONDS * 1000,
        ),
      },
    });

    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }

    throw error;
  }
}

export async function releasePaymentRetryLock(
  orderId: string,
): Promise<void> {
  await prisma.paymentRetryLock.deleteMany({
    where: {
      orderId,
    },
  });
}
