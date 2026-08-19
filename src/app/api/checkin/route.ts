import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import { requireEventPermission } from "@/lib/auth/organization";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      qrCode?: unknown;
      gate?: unknown;
      deviceId?: unknown;
      notes?: unknown;
    };

    const qrCode =
      typeof body.qrCode === "string"
        ? body.qrCode.trim()
        : "";

    const gate =
      typeof body.gate === "string"
        ? body.gate.trim()
        : null;

    const deviceId =
      typeof body.deviceId === "string"
        ? body.deviceId.trim()
        : null;

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : null;

    if (!qrCode) {
      return NextResponse.json(
        {
          success: false,
          error: "QR Code wajib diisi.",
        },
        { status: 400 },
      );
    }

    const user = await requireAuth();

    /*
     * Ambil ticket terlebih dahulu untuk mengetahui event scope.
     * Permission kemudian diperiksa terhadap event tersebut.
     */
    const ticket = await prisma.ticket.findUnique({
      where: {
        qrCode,
      },
      select: {
        id: true,
        eventId: true,
        participantId: true,
        status: true,
        isScanned: true,
        checkedInAt: true,
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            isPublished: true,
          },
        },
        participant: {
          select: {
            fullName: true,
          },
        },
        order: {
          select: {
            fullName: true,
            isClaimed: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          result: "INVALID",
          error: "QR Code tidak valid atau tiket tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    await requireEventPermission(
      ticket.eventId,
      "checkin.manage",
    );

    /*
     * Semua mutation check-in dilakukan dalam transaction yang
     * mengunci ticket row sehingga dua scanner paralel tidak
     * dapat membuat dua CheckIn untuk ticket yang sama.
     */
    const result = await prisma.$transaction(
      async (tx) => {
        const lockedTicket = await tx.ticket.findUnique({
          where: {
            id: ticket.id,
          },
          select: {
            id: true,
            eventId: true,
            participantId: true,
            status: true,
            isScanned: true,
            checkedInAt: true,
            event: {
              select: {
                id: true,
                title: true,
                status: true,
                isPublished: true,
              },
            },
            participant: {
              select: {
                fullName: true,
              },
            },
            order: {
              select: {
                fullName: true,
                isClaimed: true,
              },
            },
            category: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!lockedTicket) {
          throw new Error("Tiket tidak ditemukan.");
        }

        await tx.$queryRaw`
          SELECT "id"
          FROM "Ticket"
          WHERE "id" = ${lockedTicket.id}
          FOR UPDATE
        `;

        const existingCheckIn = await tx.checkIn.findUnique({
          where: {
            eventId_ticketId: {
              eventId: lockedTicket.eventId,
              ticketId: lockedTicket.id,
            },
          },
          select: {
            id: true,
            status: true,
            checkedInAt: true,
            gate: true,
          },
        });

        if (
          existingCheckIn?.status === "CHECKED_IN" ||
          lockedTicket.isScanned ||
          lockedTicket.checkedInAt
        ) {
          await tx.ticketScan.create({
            data: {
              ticketId: lockedTicket.id,
              eventId: lockedTicket.eventId,
              scannedById: user.id,
              result: "ALREADY_USED",
              deviceId,
              message: "Ticket sudah melakukan check-in.",
            },
          });

          return {
            success: false as const,
            result: "ALREADY_USED" as const,
            statusCode: 409,
            ticketId: lockedTicket.id,
            eventId: lockedTicket.eventId,
            eventTitle: lockedTicket.event.title,
            participantName:
              lockedTicket.participant?.fullName ??
              lockedTicket.order?.fullName ??
              "Peserta",
            category: lockedTicket.category.name,
            racepackClaimed:
              lockedTicket.order?.isClaimed ?? false,
            checkedInAt:
              existingCheckIn?.checkedInAt ??
              lockedTicket.checkedInAt ??
              null,
          };
        }

        if (
          lockedTicket.status === "CANCELLED" ||
          lockedTicket.status === "REFUNDED"
        ) {
          await tx.ticketScan.create({
            data: {
              ticketId: lockedTicket.id,
              eventId: lockedTicket.eventId,
              scannedById: user.id,
              result: "CANCELLED",
              deviceId,
              message: "Ticket sudah dibatalkan.",
            },
          });

          return {
            success: false as const,
            result: "CANCELLED" as const,
            statusCode: 409,
            ticketId: lockedTicket.id,
            error: "Tiket sudah dibatalkan atau direfund.",
          };
        }

        if (lockedTicket.status === "EXPIRED") {
          await tx.ticketScan.create({
            data: {
              ticketId: lockedTicket.id,
              eventId: lockedTicket.eventId,
              scannedById: user.id,
              result: "EXPIRED",
              deviceId,
              message: "Ticket sudah expired.",
            },
          });

          return {
            success: false as const,
            result: "EXPIRED" as const,
            statusCode: 409,
            ticketId: lockedTicket.id,
            error: "Tiket sudah expired.",
          };
        }

        if (lockedTicket.status !== "ACTIVE") {
          await tx.ticketScan.create({
            data: {
              ticketId: lockedTicket.id,
              eventId: lockedTicket.eventId,
              scannedById: user.id,
              result: "INVALID",
              deviceId,
              message:
                "Status tiket belum memungkinkan untuk check-in.",
            },
          });

          return {
            success: false as const,
            result: "INVALID" as const,
            statusCode: 409,
            ticketId: lockedTicket.id,
            error:
              "Tiket belum aktif dan belum dapat digunakan untuk check-in.",
          };
        }

        if (
          lockedTicket.event.status !== "PUBLISHED" ||
          !lockedTicket.event.isPublished
        ) {
          await tx.ticketScan.create({
            data: {
              ticketId: lockedTicket.id,
              eventId: lockedTicket.eventId,
              scannedById: user.id,
              result: "INVALID",
              deviceId,
              message: "Event belum aktif untuk check-in.",
            },
          });

          return {
            success: false as const,
            result: "INVALID" as const,
            statusCode: 409,
            ticketId: lockedTicket.id,
            error:
              "Event belum aktif untuk proses check-in.",
          };
        }

        const now = new Date();

        const checkIn = await tx.checkIn.create({
          data: {
            eventId: lockedTicket.eventId,
            ticketId: lockedTicket.id,
            participantId: lockedTicket.participantId,
            status: "CHECKED_IN",
            checkedInById: user.id,
            gate,
            notes,
            checkedInAt: now,
          },
          select: {
            id: true,
            checkedInAt: true,
            gate: true,
            status: true,
          },
        });

        await tx.ticket.update({
          where: {
            id: lockedTicket.id,
          },
          data: {
            isScanned: true,
            checkedInAt: now,
            status: "USED",
          },
        });

        await tx.ticketScan.create({
          data: {
            ticketId: lockedTicket.id,
            eventId: lockedTicket.eventId,
            scannedById: user.id,
            result: "SUCCESS",
            deviceId,
            message: "Check-in berhasil.",
          },
        });

        return {
          success: true as const,
          result: "SUCCESS" as const,
          statusCode: 200,
          ticketId: lockedTicket.id,
          checkInId: checkIn.id,
          eventId: lockedTicket.eventId,
          eventTitle: lockedTicket.event.title,
          participantName:
            lockedTicket.participant?.fullName ??
            lockedTicket.order?.fullName ??
            "Peserta",
          category: lockedTicket.category.name,
          racepackClaimed:
            lockedTicket.order?.isClaimed ?? false,
          checkedInAt: checkIn.checkedInAt,
          gate: checkIn.gate,
          ticketStatus: "USED" as const,
        };
      },
      {
        maxWait: 10_000,
        timeout: 10_000,
      },
    );

    return NextResponse.json(
      result,
      { status: result.statusCode },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
