import prisma from "@/lib/prisma";
import {
  evaluateEventReadiness,
} from "./readiness";

export class EventLifecycleError extends Error {
  constructor(
    message: string,
    public readonly status = 409,
  ) {
    super(message);
    this.name =
      "EventLifecycleError";
  }
}

export async function assertEventCanPublish(
  eventId: string,
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
    throw new EventLifecycleError(
      "Event tidak ditemukan.",
      404,
    );
  }

  if (
    event.status === "CANCELLED" ||
    event.status === "ARCHIVED"
  ) {
    throw new EventLifecycleError(
      "Event yang dibatalkan atau diarsipkan tidak dapat dipublikasikan.",
    );
  }

  const readiness =
    await evaluateEventReadiness(
      eventId,
    );

  if (!readiness.ready) {
    const blockers =
      readiness.checks
        .filter(
          (check) =>
            !check.passed &&
            check.severity ===
              "ERROR",
        )
        .map(
          (check) =>
            check.message ||
            check.label,
        );

    throw new EventLifecycleError(
      `Event belum siap dipublikasikan: ${blockers.join("; ")}`,
    );
  }

  return readiness;
}

export function canTransitionEvent(
  from: string,
  to: string,
) {
  const transitions: Record<
    string,
    string[]
  > = {
    DRAFT: [
      "PENDING_REVIEW",
      "PUBLISHED",
      "ARCHIVED",
    ],
    PENDING_REVIEW: [
      "DRAFT",
      "PUBLISHED",
      "CANCELLED",
    ],
    PUBLISHED: [
      "SUSPENDED",
      "SOLD_OUT",
      "COMPLETED",
      "CANCELLED",
      "ARCHIVED",
    ],
    SUSPENDED: [
      "PUBLISHED",
      "CANCELLED",
      "ARCHIVED",
    ],
    SOLD_OUT: [
      "COMPLETED",
      "CANCELLED",
      "ARCHIVED",
    ],
    COMPLETED: [
      "ARCHIVED",
    ],
    CANCELLED: [
      "ARCHIVED",
    ],
    ARCHIVED: [],
  };

  return (
    transitions[from]?.includes(
      to,
    ) ?? false
  );
}
