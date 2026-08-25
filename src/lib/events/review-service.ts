import prisma from "@/lib/prisma";

import {
  writeAuditLog,
} from "@/lib/audit/audit-log";

import {
  assertEventCanPublish,
} from "./lifecycle";

export async function listPendingReviewEvents() {
  return prisma.event.findMany({
    where: {
      status: "PENDING_REVIEW",
    },
    orderBy: {
      updatedAt: "asc",
    },
    include: {
      eo: true,
      organization: true,
      sport: true,
      categories: true,
      eventForm: {
        include: {
          version: true,
        },
      },
    },
  });
}

export async function returnEventToDraft({
  eventId,
  actorUserId,
  reason,
}: {
  eventId: string;
  actorUserId: string;
  reason: string;
}) {
  const normalizedReason =
    reason.trim();

  if (!normalizedReason) {
    throw new Error(
      "Alasan pengembalian wajib diisi.",
    );
  }

  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        status: true,
        isPublished: true,
        publishedAt: true,
      },
    });

  if (!event) {
    throw new Error(
      "Event tidak ditemukan.",
    );
  }

  if (
    event.status !==
    "PENDING_REVIEW"
  ) {
    throw new Error(
      "Event tidak sedang menunggu review.",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const updated =
        await tx.event.update({
          where: {
            id: eventId,
          },
          data: {
            status: "DRAFT",
            isPublished: false,
            publishedAt: null,
          },
        });

      await writeAuditLog(tx, {
        actorUserId,
        action:
          "EVENT_RETURNED_TO_DRAFT",
        module: "EVENT_REVIEW",
        entityType: "Event",
        entityId: eventId,
        beforeData: {
          status: event.status,
          isPublished:
            event.isPublished,
          publishedAt:
            event.publishedAt,
        },
        afterData: {
          status: updated.status,
          isPublished:
            updated.isPublished,
          publishedAt:
            updated.publishedAt,
        },
        metadata: {
          reason:
            normalizedReason,
        },
      });

      return updated;
    },
  );
}

export async function approveAndPublishEvent({
  eventId,
  actorUserId,
}: {
  eventId: string;
  actorUserId: string;
}) {
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
    event.status !==
    "PENDING_REVIEW"
  ) {
    throw new Error(
      "Event tidak sedang menunggu review.",
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
          action:
            "EVENT_REVIEW_APPROVED",
          module: "EVENT_REVIEW",
          entityType: "Event",
          entityId: eventId,
          beforeData: {
            status: event.status,
          },
          afterData: {
            status:
              result.status,
            isPublished:
              result.isPublished,
            publishedAt:
              result.publishedAt,
          },
          metadata: {
            readiness:
              readiness.summary,
          },
        });

        return result;
      },
    );

  return {
    event: updated,
    readiness,
  };
}
