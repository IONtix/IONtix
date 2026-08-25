import { NextResponse } from "next/server";

import {
  requireAuth,
} from "@/lib/auth/authorization";

import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

import {
  canReviewQualification,
  listQualificationReviews,
} from "@/lib/qualification/review-service";

import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireAuth();

    if (!canReviewQualification(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda tidak memiliki hak verifikasi kualifikasi.",
        },
        { status: 403 },
      );
    }

    const { eventId } = await context.params;

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
      return NextResponse.json(
        {
          success: false,
          message: "Acara tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    await requireResolvedOrganizationPermission(
      event.organizationId ?? undefined,
      "participants.view",
    );

    const queryStatus =
      new URL(request.url).searchParams.get("status");

    const status =
      queryStatus === "PENDING" ||
      queryStatus === "APPROVED" ||
      queryStatus === "REJECTED"
        ? queryStatus
        : undefined;

    const reviews =
      await listQualificationReviews(
        eventId,
        status,
      );

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error(
      "GET qualification reviews:",
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
