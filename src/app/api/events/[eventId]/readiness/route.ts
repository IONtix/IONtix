import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import {
  requireAuth,
} from "@/lib/auth/authorization";

import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

import {
  evaluateEventReadiness,
} from "@/lib/events/readiness";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await requireAuth();

    const { eventId } =
      await context.params;

    const event =
      await prisma.event.findUnique({
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
          message:
            "Event tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    await requireResolvedOrganizationPermission(
      event.organizationId ??
        undefined,
      "events.view",
    );

    const readiness =
      await evaluateEventReadiness(
        eventId,
      );

    return NextResponse.json({
      success: true,
      data: readiness,
    });
  } catch (error) {
    console.error(
      "GET event readiness:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memeriksa kesiapan event.",
      },
      {
        status: 500,
      },
    );
  }
}
