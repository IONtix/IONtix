import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import { requireAnyEventPermission } from "@/lib/auth/organization";
import { AuthorizationError } from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function assertOrderAccess(orderEmail: string | null, eventId: string) {
  const user = await requireAuth();

  /*
   * EO/Staff:
   * - harus memiliki akses ke event
   * - dan memiliki minimal salah satu permission:
   *   orders.view atau participants.view
   *
   * Participant:
   * - tetap boleh mengakses order miliknya sendiri.
   */
  try {
    await requireAnyEventPermission(
      eventId,
      ["orders.view", "participants.view"],
    );
    return user;
  } catch (error) {
    /*
     * If the user is not an event manager, allow the
     * participant to access only their own order.
     */
    if (
      error instanceof AuthorizationError &&
      orderEmail &&
      user.email.toLowerCase() === orderEmail.toLowerCase()
    ) {
      return user;
    }

    throw error;
  }
}

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

    await assertOrderAccess(order.email, order.ticketCategory.event.id);

    return NextResponse.json(order);
  } catch (error: unknown) {
    console.error("GET /api/orders/[id] error:", error);

    return authorizationErrorResponse(error);
  }
}
