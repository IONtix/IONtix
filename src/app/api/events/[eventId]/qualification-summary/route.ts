import { NextResponse } from "next/server";

import {
  requireAuth,
} from "@/lib/auth/authorization";

import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

const REVIEW_ROLES = new Set([
  "SUPER_ADMIN",
  "FIELD_VERIFICATION",
  "EO",
]);

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireAuth();

    if (!REVIEW_ROLES.has(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Anda tidak memiliki akses ke workspace verifikasi.",
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
        title: true,
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

    const [
      pending,
      approved,
      rejected,
    ] = await Promise.all([
      prisma.qualificationReview.count({
        where: {
          eventId,
          status: "PENDING",
        },
      }),
      prisma.qualificationReview.count({
        where: {
          eventId,
          status: "APPROVED",
        },
      }),
      prisma.qualificationReview.count({
        where: {
          eventId,
          status: "REJECTED",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        event,
        pending,
        approved,
        rejected,
        total:
          pending +
          approved +
          rejected,
      },
    });
  } catch (error) {
    console.error(
      "GET qualification summary:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil ringkasan verifikasi.",
      },
      { status: 500 },
    );
  }
}
