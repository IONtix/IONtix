import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { authorizationErrorResponse } from "@/lib/auth/authorization";
import { requireEventPermission } from "@/lib/auth/organization";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qrCode = searchParams.get("qrCode")?.trim() ?? "";

    if (!qrCode) {
      return NextResponse.json(
        {
          success: false,
          error: "QR Code wajib diisi.",
        },
        { status: 400 },
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: {
        qrCode,
      },
      select: {
        id: true,
        ticketNumber: true,
        qrCode: true,
        eventId: true,
        participantId: true,
        status: true,
        isScanned: true,
        checkedInAt: true,
        order: {
          select: {
            id: true,
            fullName: true,
            email: true,
            jerseySize: true,
            isClaimed: true,
          },
        },
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            isPublished: true,
            date: true,
            location: true,
          },
        },
        checkIns: {
          select: {
            id: true,
            status: true,
            checkedInAt: true,
            gate: true,
          },
          take: 1,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: "QR Code tidak valid atau tiket tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    await requireEventPermission(ticket.eventId, "checkin.manage");

    const participantName =
      ticket.participant?.fullName ??
      ticket.order?.fullName ??
      "Peserta";

    const existingCheckIn = ticket.checkIns[0] ?? null;

    const isAlreadyCheckedIn =
      existingCheckIn?.status === "CHECKED_IN" ||
      ticket.isScanned ||
      ticket.checkedInAt !== null;

    const canCheckIn =
      ticket.status === "ACTIVE" &&
      ticket.event.status === "PUBLISHED" &&
      ticket.event.isPublished &&
      !isAlreadyCheckedIn;

    return NextResponse.json({
      success: true,
      data: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrCode: ticket.qrCode,
        orderId: ticket.order?.id ?? null,

        eventId: ticket.eventId,
        eventTitle: ticket.event.title,
        eventStatus: ticket.event.status,

        participantId: ticket.participantId,
        participantName,
        participantEmail:
          ticket.participant?.email ?? ticket.order?.email ?? null,
        participantPhone:
          ticket.participant?.phone ?? null,

        category: ticket.category.name,
        jerseySize: ticket.order?.jerseySize ?? null,

        ticketStatus: ticket.status,
        isCheckedIn: isAlreadyCheckedIn,
        checkedInAt:
          existingCheckIn?.checkedInAt ??
          ticket.checkedInAt ??
          null,

        racepackClaimed: ticket.order?.isClaimed ?? false,

        canCheckIn,
      },
    });
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
