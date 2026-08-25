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

type TransferBody = {
  toUserId?: unknown;
  reason?: unknown;
};

export async function POST(
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

    const body = (await request.json()) as TransferBody;

    const toUserId =
      typeof body.toUserId === "string"
        ? body.toUserId.trim()
        : "";

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (!toUserId) {
      return NextResponse.json(
        {
          error: "Target user wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (toUserId === currentUser.id) {
      return NextResponse.json(
        {
          error:
            "Ticket sudah dimiliki oleh akun tersebut.",
        },
        { status: 409 },
      );
    }

    /*
     * Initial read hanya untuk menentukan event dan
     * ownership/permission. Mutation final tetap
     * diverifikasi ulang di dalam transaction.
     */
    const initialTicket =
      await prisma.ticket.findUnique({
        where: {
          id: ticketId,
        },
        select: {
          id: true,
          userId: true,
          eventId: true,
          status: true,
          ticketNumber: true,
          participantId: true,
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

    if (!initialTicket) {
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
        initialTicket.eventId,
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

    const isCurrentOwner =
      initialTicket.userId ===
      currentUser.id;

    if (!isCurrentOwner && !isEventManager) {
      throw new AuthorizationError(
        "Anda tidak memiliki akses untuk mentransfer ticket ini.",
        403,
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          /*
           * Lock ticket untuk mencegah dua transfer
           * paralel memenangkan ownership yang sama.
           */
          await tx.$queryRaw`
            SELECT "id"
            FROM "Ticket"
            WHERE "id" = ${ticketId}
            FOR UPDATE
          `;

          const ticket =
            await tx.ticket.findUnique({
              where: {
                id: ticketId,
              },
              select: {
                id: true,
                userId: true,
                participantId: true,
                eventId: true,
                status: true,
                ticketNumber: true,
                qrCode: true,
                orderId: true,
                transferredAt: true,
              },
            });

          if (!ticket) {
            throw new AuthorizationError(
              "Tiket tidak ditemukan.",
              404,
            );
          }

          if (
            ticket.userId !==
              currentUser.id &&
            !isEventManager
          ) {
            throw new AuthorizationError(
              "Ownership ticket sudah berubah atau Anda tidak lagi memiliki akses.",
              403,
            );
          }

          if (ticket.status !== "ACTIVE") {
            throw new AuthorizationError(
              `Ticket dengan status "${ticket.status}" tidak dapat ditransfer.`,
              409,
            );
          }

          const targetUser =
            await tx.user.findUnique({
              where: {
                id: toUserId,
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

          if (!targetUser) {
            throw new AuthorizationError(
              "Target user tidak ditemukan.",
              404,
            );
          }

          if (
            targetUser.isDeleted ||
            targetUser.status !==
              "ACTIVE"
          ) {
            throw new AuthorizationError(
              "Target user tidak aktif.",
              409,
            );
          }

          if (!targetUser.participant) {
            throw new AuthorizationError(
              "Target user belum memiliki participant profile.",
              409,
            );
          }

          const beforeData = {
            ticketId: ticket.id,
            userId: ticket.userId,
            participantId:
              ticket.participantId,
            ticketNumber:
              ticket.ticketNumber,
            status: ticket.status,
            transferredAt:
              ticket.transferredAt,
          };

          await tx.ticket.update({
            where: {
              id: ticket.id,
            },
            data: {
              userId:
                targetUser.id,
              participantId:
                targetUser.participant.id,
              transferredAt:
                new Date(),
            },
          });

          await tx.ticketTransfer.create({
            data: {
              ticketId:
                ticket.id,
              fromUserId:
                ticket.userId,
              toUserId:
                targetUser.id,
              fromName:
                currentUser.name,
              toName:
                targetUser.name,
              reason:
                reason || null,
            },
          });

          const updatedTicket =
            await tx.ticket.findUnique({
              where: {
                id: ticket.id,
              },
              select: {
                id: true,
                ticketNumber: true,
                userId: true,
                participantId: true,
                status: true,
                transferredAt: true,
              },
            });

          await tx.auditLog.create({
            data: {
              actorUserId:
                currentUser.id,
              action:
                "TICKET_TRANSFERRED",
              module: "TICKETING",
              entityType: "Ticket",
              entityId: ticket.id,
              beforeData,
              afterData: {
                ticketId: ticket.id,
                userId:
                  updatedTicket?.userId ??
                  null,
                participantId:
                  updatedTicket?.participantId ??
                  null,
                ticketNumber:
                  updatedTicket?.ticketNumber ??
                  ticket.ticketNumber,
                status:
                  updatedTicket?.status ??
                  ticket.status,
                transferredAt:
                  updatedTicket?.transferredAt ??
                  null,
              },
              metadata: {
                fromUserId:
                  ticket.userId,
                toUserId:
                  targetUser.id,
                reason:
                  reason || null,
                eventId:
                  ticket.eventId,
              },
            },
          });

          return {
            ticket:
              updatedTicket,
            targetUser: {
              id:
                targetUser.id,
              name:
                targetUser.name,
              email:
                targetUser.email,
              participantId:
                targetUser.participant.id,
            },
          };
        },
        {
          maxWait: 10_000,
          timeout: 15_000,
        },
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Ticket berhasil ditransfer.",
        data: result,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error(
      "POST /api/tickets/[ticketId]/transfer error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
