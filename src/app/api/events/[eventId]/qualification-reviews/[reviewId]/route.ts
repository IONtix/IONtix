import { NextResponse } from "next/server";

import {
  requireAuth,
} from "@/lib/auth/authorization";

import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

import {
  getQualificationReview,
  canReviewQualification,
  reviewQualification,
} from "@/lib/qualification/review-service";

import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    eventId: string;
    reviewId: string;
  }>;
};

async function authorizeEvent(
  userRole: string,
  eventId: string,
) {
  if (!canReviewQualification(userRole)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          message:
            "Anda tidak memiliki hak verifikasi kualifikasi.",
        },
        { status: 403 },
      ),
    };
  }

  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!event) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          message: "Acara tidak ditemukan.",
        },
        { status: 404 },
      ),
    };
  }

  await requireResolvedOrganizationPermission(
    event.organizationId ?? undefined,
    "participants.view",
  );

  return {
    ok: true as const,
  };
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireAuth();
    const { eventId, reviewId } =
      await context.params;

    const auth = await authorizeEvent(
      user.role,
      eventId,
    );

    if (!auth.ok) {
      return auth.response;
    }

    const review =
      await getQualificationReview(
        reviewId,
      );

    if (
      !review ||
      review.eventId !== eventId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Data verifikasi tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error(
      "GET qualification review:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data verifikasi.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireAuth();
    const { eventId, reviewId } =
      await context.params;

    const auth = await authorizeEvent(
      user.role,
      eventId,
    );

    if (!auth.ok) {
      return auth.response;
    }

    const existing =
      await getQualificationReview(
        reviewId,
      );

    if (
      !existing ||
      existing.eventId !== eventId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Data verifikasi tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const body =
      (await request.json()) as {
        status?: "APPROVED" | "REJECTED";
        rejectionReason?: string;
        notes?: string;
      };

    if (
      body.status !== "APPROVED" &&
      body.status !== "REJECTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status verifikasi tidak valid.",
        },
        { status: 422 },
      );
    }

    const result =
      await reviewQualification({
        reviewId,
        reviewerUserId: user.id,
        status: body.status,
        rejectionReason:
          body.rejectionReason,
        notes: body.notes,
      });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "PATCH qualification review:",
      error,
    );

    const status =
      error &&
      typeof error === "object" &&
      "status" in error
        ? Number(
            (
              error as {
                status: number;
              }
            ).status,
          )
        : 500;

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui verifikasi.",
      },
      { status },
    );
  }
}
