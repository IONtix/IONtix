import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import { requireAnyEventPermission } from "@/lib/auth/organization";
import { AuthorizationError } from "@/lib/auth/authorization";
import {
  assertOrderParticipantOrManagerAccess,
} from "@/lib/order/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID pesanan tidak ditemukan." },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        ticketCategory: {
          include: {
            event: true,
          },
        },
        addonOrders: {
          include: {
            addon: true,
          },
        },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            qrCode: true,
            status: true,
            issuedAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan!" },
        { status: 404 },
      );
    }

    if (!order.ticketCategory) {
      return NextResponse.json(
        { error: "Kategori tiket untuk pesanan ini tidak ditemukan." },
        { status: 409 },
      );
    }

    const user =
      await requireAuth();

    let eventPermissionGranted =
      false;

    try {
      await requireAnyEventPermission(
        order.ticketCategory.event.id,
        [
          "orders.view",
          "participants.view",
        ],
      );

      eventPermissionGranted =
        true;
    } catch (error) {
      if (
        !(
          error instanceof
          AuthorizationError
        )
      ) {
        throw error;
      }
    }

    assertOrderParticipantOrManagerAccess({
      currentUserId:
        user.id,
      currentUserEmail:
        user.email,
      buyerUserId:
        order.buyerUserId,
      orderEmail:
        order.email,
      eventPermissionGranted,
    });

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error("GET /api/orders/[id] error:", error);

    return authorizationErrorResponse(error);
  }
}
