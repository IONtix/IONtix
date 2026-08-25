import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit/audit-log";

export class QualificationAuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status = 403,
  ) {
    super(message);
    this.name =
      "QualificationAuthorizationError";
  }
}

const VERIFIER_ROLES = new Set([
  "SUPER_ADMIN",
  "FIELD_VERIFICATION",
  "EO",
]);

export function canReviewQualification(
  role: string,
): boolean {
  return VERIFIER_ROLES.has(role);
}

function withResponseData(
  review: {
    id: string;
    participantResponseId: string;
    participantId: string;
    eventId: string;
    eventFormId: string;
    eventFormFieldId: string;
    status:
      | "PENDING"
      | "APPROVED"
      | "REJECTED";
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    notes: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
  response: unknown,
) {
  return {
    ...review,
    participantResponse: response,
  };
}

export async function listQualificationReviews(
  eventId: string,
  status?: "PENDING" | "APPROVED" | "REJECTED",
) {
  const reviews =
    await prisma.qualificationReview.findMany({
      where: {
        eventId,
        ...(status
          ? {
              status,
            }
          : {}),
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

  if (reviews.length === 0) {
    return [];
  }

  const responseIds =
    reviews.map(
      (review) =>
        review.participantResponseId,
    );

  const responses =
    await prisma.participantResponse.findMany({
      where: {
        id: {
          in: responseIds,
        },
      },
      select: {
        id: true,
        value: true,
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        eventFormField: {
          select: {
            id: true,
            key: true,
            label: true,
            fieldType: true,
            description: true,
            isRequired: true,
          },
        },
      },
    });

  const responseById =
    new Map(
      responses.map(
        (response) => [
          response.id,
          response,
        ],
      ),
    );

  return reviews.map(
    (review) =>
      withResponseData(
        review,
        responseById.get(
          review.participantResponseId,
        ) ?? null,
      ),
  );
}

export async function getQualificationReview(
  reviewId: string,
) {
  const review =
    await prisma.qualificationReview.findUnique({
      where: {
        id: reviewId,
      },
    });

  if (!review) {
    return null;
  }

  const response =
    await prisma.participantResponse.findUnique({
      where: {
        id: review.participantResponseId,
      },
      select: {
        id: true,
        value: true,
        createdAt: true,
        updatedAt: true,
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        eventFormField: {
          select: {
            id: true,
            key: true,
            label: true,
            fieldType: true,
            description: true,
            validation: true,
            isRequired: true,
          },
        },
      },
    });

  return withResponseData(
    review,
    response,
  );
}

export async function reviewQualification({
  reviewId,
  reviewerUserId,
  status,
  rejectionReason,
  notes,
}: {
  reviewId: string;
  reviewerUserId: string;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
  notes?: string;
}) {
  if (
    status === "REJECTED" &&
    !rejectionReason?.trim()
  ) {
    throw new QualificationAuthorizationError(
      "Alasan penolakan wajib diisi.",
      422,
    );
  }

  const review =
    await prisma.qualificationReview.findUnique({
      where: {
        id: reviewId,
      },
    });

  if (!review) {
    throw new QualificationAuthorizationError(
      "Data kualifikasi tidak ditemukan.",
      404,
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const currentEnrollment =
        await tx.participantEvent.findUnique({
          where: {
            participantId_eventId: {
              participantId:
                review.participantId,
              eventId:
                review.eventId,
            },
          },
          select: {
            id: true,
            approvalStatus: true,
          },
        });

      if (!currentEnrollment) {
        throw new QualificationAuthorizationError(
          "Pendaftaran peserta pada acara tidak ditemukan.",
          404,
        );
      }

      const updated =
        await tx.qualificationReview.update({
          where: {
            id: reviewId,
          },
          data: {
            status,
            reviewedByUserId:
              reviewerUserId,
            reviewedAt:
              new Date(),
            rejectionReason:
              status === "REJECTED"
                ? rejectionReason?.trim()
                : null,
            notes:
              notes?.trim() || null,
          },
        });

      const pendingCount =
        await tx.qualificationReview.count({
          where: {
            participantId:
              review.participantId,
            eventId:
              review.eventId,
            status: "PENDING",
          },
        });

      const rejectedCount =
        await tx.qualificationReview.count({
          where: {
            participantId:
              review.participantId,
            eventId:
              review.eventId,
            status: "REJECTED",
          },
        });

      let approvalStatus:
        | "PENDING"
        | "APPROVED"
        | "REJECTED";

      if (rejectedCount > 0) {
        approvalStatus = "REJECTED";
      } else if (pendingCount === 0) {
        approvalStatus = "APPROVED";
      } else {
        approvalStatus = "PENDING";
      }

      const updatedEnrollment =
        await tx.participantEvent.update({
          where: {
            participantId_eventId: {
              participantId:
                review.participantId,
              eventId:
                review.eventId,
            },
          },
          data: {
            approvalStatus,
          },
          select: {
            id: true,
            approvalStatus: true,
          },
        });

      await writeAuditLog(tx, {
        actorUserId:
          reviewerUserId,
        action:
          status === "APPROVED"
            ? "QUALIFICATION_APPROVED"
            : "QUALIFICATION_REJECTED",
        module: "QUALIFICATION",
        entityType:
          "QualificationReview",
        entityId: review.id,
        beforeData: {
          reviewStatus:
            review.status,
          participantEventApprovalStatus:
            currentEnrollment.approvalStatus,
        },
        afterData: {
          reviewStatus:
            updated.status,
          participantEventApprovalStatus:
            updatedEnrollment.approvalStatus,
          reviewedAt:
            updated.reviewedAt,
          rejectionReason:
            updated.rejectionReason,
          notes:
            updated.notes,
        },
        metadata: {
          participantId:
            review.participantId,
          eventId:
            review.eventId,
          eventFormId:
            review.eventFormId,
          eventFormFieldId:
            review.eventFormFieldId,
        },
      });

      return updated;
    },
  );
}
