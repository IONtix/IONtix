import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);

    const organizationId =
      searchParams.get("organizationId")?.trim() ||
      undefined;

    let scopedOrganizationId: string | null = null;

    if (user.role !== "SUPER_ADMIN") {
      const membership =
        await requireResolvedOrganizationPermission(
          organizationId,
          "participants.view",
        );

      scopedOrganizationId =
        membership.organizationId;
    } else if (organizationId) {
      scopedOrganizationId = organizationId;
    } else {
      return NextResponse.json(
        {
          error:
            "Organization context diperlukan.",
        },
        { status: 409 },
      );
    }

    const events =
      await prisma.event.findMany({
        where: {
          organizationId:
            scopedOrganizationId,
        },
        select: {
          id: true,
          title: true,
          categories: {
            select: {
              id: true,
              name: true,
              eventId: true,
            },
            orderBy: {
              name: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const eventOptions = events.map(
      (event) => ({
        id: event.id,
        title: event.title,
      }),
    );

    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        eventId: string;
        eventTitle: string;
      }
    >();

    for (const event of events) {
      for (const category of event.categories) {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          eventId: category.eventId,
          eventTitle: event.title,
        });
      }
    }

    const categories =
      Array.from(categoryMap.values());

    return NextResponse.json({
      success: true,
      data: {
        events: eventOptions,
        categories,
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/participants/meta error:",
      error,
    );

    return authorizationErrorResponse(error);
  }
}
