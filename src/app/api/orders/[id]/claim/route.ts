import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  AuthorizationError,
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import { requireEventPermission } from "@/lib/auth/organization";
import {
  assertOrderClaimAccess,
} from "@/lib/order/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID pesanan tidak ditemukan.",
        },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        buyerUserId: true,
        email: true,
        isClaimed: true,
        ticketCategory: {
          select: {
            eventId: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          error: "Tiket tidak ditemukan!",
        },
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
      await requireEventPermission(
        order.ticketCategory.eventId,
        "participants.manage",
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

    assertOrderClaimAccess({
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

    if (order.isClaimed) {
      return NextResponse.json(
        {
          error: "Racepack sudah pernah diambil sebelumnya!",
        },
        { status: 409 },
      );
    }

    /*
     * Atomic update prevents two concurrent requests
     * from both successfully claiming the same order.
     */
    const updated = await prisma.order.updateMany({
      where: {
        id,
        isClaimed: false,
      },
      data: {
        isClaimed: true,
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json(
        {
          error: "Racepack sudah pernah diambil sebelumnya!",
        },
        { status: 409 },
      );
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        isClaimed: true,
      },
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error: unknown) {
    console.error("POST /api/orders/[id]/claim error:", error);

    return authorizationErrorResponse(error);
  }
}
