import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import { requireEventPermission } from "@/lib/auth/organization";
import { evaluateCheckInEligibility } from "@/lib/checkin/rules";

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

        const eligibility =
          evaluateCheckInEligibility({
            ticketStatus:
              lockedTicket.status,
            eventStatus:
              lockedTicket.event.status,
            eventIsPublished:
              lockedTicket.event.isPublished,
            isAlreadyCheckedIn:
              existingCheckIn?.status ===
                "CHECKED_IN" ||
              lockedTicket.isScanned ||
              Boolean(
                lockedTicket.checkedInAt,
              ),
          });

        if (!eligibility.canCheckIn) {
          /*
           * "VALID" adalah hasil eligibility, bukan
           * TicketScanResult. VALID tidak pernah dicatat
           * sebagai scan failure; hanya hasil invalid
           * yang dicatat ke TicketScan.
           */
          const scanResult =
            eligibility.result === "VALID"
              ? "INVALID"
              : eligibility.result;

          await tx.ticketScan.create({
            data: {
              ticketId:
                lockedTicket.id,
              eventId:
                lockedTicket.eventId,
              scannedById: user.id,
              result: scanResult,
              deviceId,
              message:
                eligibility.error ??
                "Check-in tidak diperbolehkan.",
            },
          });

          return {
            success: false as const,
            result:
              eligibility.result,
            statusCode: 409,
            ticketId:
              lockedTicket.id,
            eventId:
              lockedTicket.eventId,
            eventTitle:
              lockedTicket.event.title,
            participantName:
              lockedTicket.participant
                ?.fullName ??
              lockedTicket.order
                ?.fullName ??
              "Peserta",
            category:
              lockedTicket.category.name,
            racepackClaimed:
              lockedTicket.order
                ?.isClaimed ?? false,
            checkedInAt:
              existingCheckIn?.checkedInAt ??
              lockedTicket.checkedInAt ??
              null,
            error:
              eligibility.error ??
              "Check-in tidak diperbolehkan.",
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
