import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  AuthorizationError,
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import { requireEventPermission } from "@/lib/auth/organization";

type RouteContext = {
  params: Promise<{ ticketId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { ticketId } = await params;

    if (!ticketId) {
      return NextResponse.json(
        {
          error: "ID tiket tidak ditemukan.",
        },
        { status: 400 },
      );
    }

    const currentUser = await requireAuth();

    const url = new URL(request.url);
    const email = (
      url.searchParams.get("email") ?? ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          error: "Email penerima wajib diisi.",
        },
        { status: 400 },
      );
    }

    const ticket =
      await prisma.ticket.findUnique({
        where: {
          id: ticketId,
        },
        select: {
          id: true,
          userId: true,
          eventId: true,
          status: true,
        },
      });

    if (!ticket) {
      return NextResponse.json(
        {
          error: "Tiket tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    let isEventManager = false;

    try {
      await requireEventPermission(
        ticket.eventId,
        "participants.manage",
      );

      isEventManager = true;
    } catch (error) {
      if (
        !(
          error instanceof AuthorizationError
        )
      ) {
        throw error;
      }
    }

    if (
      ticket.userId !== currentUser.id &&
      !isEventManager
    ) {
      throw new AuthorizationError(
        "Anda tidak memiliki akses ke tiket ini.",
        403,
      );
    }

    if (ticket.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Hanya ticket ACTIVE yang dapat ditransfer.",
        },
        { status: 409 },
      );
    }

    const targetUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          isDeleted: true,
          participant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

    /*
     * Jangan membedakan target:
     * - tidak ditemukan
     * - akun sendiri
     * - inactive/deleted
     * - belum memiliki participant
     *
     * Semua dikembalikan sebagai response generik agar
     * endpoint tidak menjadi user-enumeration oracle.
     */
    const genericTargetUnavailable = () =>
      NextResponse.json(
        {
          error:
            "Akun penerima tidak tersedia untuk transfer.",
        },
        { status: 404 },
      );

    if (!targetUser) {
      return genericTargetUnavailable();
    }

    if (
      targetUser.id === currentUser.id
    ) {
      return genericTargetUnavailable();
    }

    if (
      targetUser.isDeleted ||
      targetUser.status !== "ACTIVE"
    ) {
      return genericTargetUnavailable();
    }

    if (!targetUser.participant) {
      return genericTargetUnavailable();
    }

    /*
     * Client hanya menerima data minimum yang benar-benar
     * dibutuhkan untuk menampilkan preview dan melakukan
     * POST transfer.
     */
    return NextResponse.json({
      success: true,
      data: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/tickets/[ticketId]/transfer/target error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
