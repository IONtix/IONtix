import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit/audit-log";

import {
  assertEventCanPublish,
} from "./lifecycle";

export async function submitEventForReview(
  eventId: string,
  actorUserId: string,
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        organizationId: true,
        eoId: true,
        status: true,
      },
    });

  if (!event) {
    throw new Error(
      "Event tidak ditemukan.",
    );
  }

  const readiness =
    await assertEventCanPublish(
      eventId,
    );

  const updated =
    await prisma.$transaction(
      async (tx) => {
        const result =
          await tx.event.update({
            where: {
              id: eventId,
            },
            data: {
              status: "PENDING_REVIEW",
              isPublished: false,
              publishedAt: null,
            },
          });

        await writeAuditLog(tx, {
          actorUserId,
          action: "EVENT_SUBMITTED_FOR_REVIEW",
          module: "EVENT",
          entityType: "Event",
          entityId: eventId,
          beforeData: {
            status: event.status,
            isPublished: false,
          },
          afterData: {
            status: result.status,
            isPublished: result.isPublished,
          },
        });

        return result;
      },
    );

  return {
    event: updated,
    readiness,
    actorUserId,
  };
}

export async function publishEvent(
  eventId: string,
  actorUserId: string,
) {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!event) {
    throw new Error(
      "Event tidak ditemukan.",
    );
  }

  if (
    event.status === "CANCELLED" ||
    event.status === "ARCHIVED"
  ) {
    throw new Error(
      "Event ini tidak dapat dipublikasikan.",
    );
  }

  const readiness =
    await assertEventCanPublish(
      eventId,
    );

  const updated =
    await prisma.$transaction(
      async (tx) => {
        const result =
          await tx.event.update({
            where: {
              id: eventId,
            },
            data: {
              status: "PUBLISHED",
              isPublished: true,
              publishedAt:
                new Date(),
            },
          });

        await writeAuditLog(tx, {
          actorUserId,
          action: "EVENT_PUBLISHED",
          module: "EVENT",
          entityType: "Event",
          entityId: eventId,
          beforeData: {
            status: event.status,
            isPublished: false,
          },
          afterData: {
            status: result.status,
            isPublished: result.isPublished,
            publishedAt:
              result.publishedAt,
          },
        });

        return result;
      },
    );

  return {
    event: updated,
    readiness,
    actorUserId,
  };
}
