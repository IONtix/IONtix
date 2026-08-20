import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

function normalizeOptional(
  value: string | null,
) {
  const normalized = value?.trim();

  return normalized
    ? normalized
    : undefined;
}

export async function GET(
  request: Request,
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const organizationId =
      normalizeOptional(
        searchParams.get(
          "organizationId",
        ),
      );

    await requireResolvedOrganizationPermission(
      organizationId,
      "orders.view",
    );

    const events =
      await prisma.event.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          title: "asc",
        },
      });

    const orderStatuses =
      await prisma.order.findMany({
        where: {
          event: {
            organizationId,
          },
        },
        select: {
          status: true,
        },
        distinct: ["status"],
        orderBy: {
          status: "asc",
        },
      });

    const approvalStatuses =
      await prisma.order.findMany({
        where: {
          event: {
            organizationId,
          },
        },
        select: {
          approvalStatus: true,
        },
        distinct: [
          "approvalStatus",
        ],
        orderBy: {
          approvalStatus: "asc",
        },
      });

    return NextResponse.json({
      success: true,

      data: {
        events,

        orderStatuses:
          orderStatuses.map(
            (item) => item.status,
          ),

        approvalStatuses:
          approvalStatuses.map(
            (item) =>
              item.approvalStatus,
          ),

        /*
         * Expose enum-compatible sort fields
         * supaya UI tidak mengarang sendiri.
         */
        sortFields: [
          "createdAt",
          "totalPrice",
          "status",
        ],

        sortDirections: [
          "asc",
          "desc",
        ],
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/orders/meta error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
