import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

interface RouteContext {
  params: Promise<{
    participantEventId: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireAuth();

    const { participantEventId } =
      await context.params;

    const enrollmentId =
      participantEventId.trim();

    if (!enrollmentId) {
      return NextResponse.json(
        {
          error:
            "Participant enrollment tidak valid.",
        },
        { status: 400 },
      );
    }

    /*
     * ============================================================
     * STEP 1 — RESOLVE ENROLLMENT
     * ============================================================
     *
     * ParticipantEvent menjadi authorization boundary.
     */
    const enrollment =
      await prisma.participantEvent.findUnique({
        where: {
          id: enrollmentId,
        },
        select: {
          id: true,
          participantId: true,
          eventId: true,
          registeredAt: true,
          approvalStatus: true,

          event: {
            select: {
              id: true,
              title: true,
              organizationId: true,
            },
          },

          participant: {
            select: {
              id: true,
              userId: true,
              fullName: true,
              email: true,
              phone: true,
              dateOfBirth: true,
              gender: true,
              bloodType: true,
              emergencyContact: true,
              profilePhotoUrl: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            "Participant enrollment tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    /*
     * ============================================================
     * STEP 2 — ORGANIZATION AUTHORIZATION
     * ============================================================
     */
    await requireResolvedOrganizationPermission(
      enrollment.event.organizationId ??
        undefined,
      "participants.view",
    );

    const participantId =
      enrollment.participantId;

    const eventId =
      enrollment.eventId;

    /*
     * ============================================================
     * STEP 3 — EVENT-SCOPED COMMERCE HISTORY
     * ============================================================
     */
    const orders =
      await prisma.order.findMany({
        where: {
          participantId,
          eventId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          approvalStatus: true,
          subtotal: true,
          discountTotal: true,
          addonTotal: true,
          totalPrice: true,
          currency: true,
          isClaimed: true,
          expiresAt: true,
          paidAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,

          ticketCategory: {
            select: {
              id: true,
              name: true,
            },
          },

          payments: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              externalId: true,
              provider: true,
              method: true,
              status: true,
              amount: true,
              currency: true,
              providerTransactionId: true,
              paidAt: true,
              expiresAt: true,
              createdAt: true,
            },
          },

          transactions: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              externalId: true,
              createdAt: true,
            },
          },
        },
      });

    /*
     * ============================================================
     * STEP 4 — EVENT-SCOPED TICKETS
     * ============================================================
     */
    const tickets =
      await prisma.ticket.findMany({
        where: {
          participantId,
          eventId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          ticketNumber: true,
          qrCode: true,
          status: true,
          isScanned: true,
          issuedAt: true,
          checkedInAt: true,
          cancelledAt: true,
          transferredAt: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,

          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              isClaimed: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },

          checkIns: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              status: true,
              gate: true,
              notes: true,
              checkedInAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          scans: {
            orderBy: {
              scannedAt: "desc",
            },
            select: {
              id: true,
              result: true,
              deviceId: true,
              message: true,
              scannedAt: true,
            },
          },

          transfers: {
            orderBy: {
              transferredAt: "desc",
            },
            select: {
              id: true,
              fromName: true,
              toName: true,
              reason: true,
              transferredAt: true,
            },
          },
        },
      });

    /*
     * ============================================================
     * STEP 5 — OPERATIONAL SNAPSHOT
     * ============================================================
     *
     * latestOrder:
     *   histori order terakhir.
     *
     * operationalOrder:
     *   order yang menghasilkan ticket.
     *
     * active/operational ticket:
     *   ticket ACTIVE jika tersedia, otherwise ticket terbaru.
     */
    const latestOrder =
      orders[0] ?? null;

    const operationalOrder =
      orders.find(
        (order) =>
          tickets.some(
            (ticket) =>
              ticket.order?.id === order.id,
          ),
      ) ?? null;

    const activeTicket =
      tickets.find(
        (ticket) =>
          ticket.status === "ACTIVE",
      ) ??
      tickets[0] ??
      null;

    const latestCheckIn =
      activeTicket?.checkIns[0] ??
      tickets
        .flatMap(
          (ticket) => ticket.checkIns,
        )
        .sort(
          (a, b) =>
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime(),
        )[0] ??
      null;

    const racepackClaimed =
      operationalOrder?.isClaimed ??
      latestOrder?.isClaimed ??
      false;

    /*
     * ============================================================
     * STEP 6 — RESPONSE
     * ============================================================
     */
    return NextResponse.json({
      success: true,

      data: {
        participantEvent: {
          id: enrollment.id,
          registeredAt:
            enrollment.registeredAt,
          approvalStatus:
            enrollment.approvalStatus,
        },

        participant: enrollment.participant,

        event: {
          id: enrollment.event.id,
          title: enrollment.event.title,
        },

        operational: {
          latestOrder: latestOrder
            ? {
                id: latestOrder.id,
                orderNumber:
                  latestOrder.orderNumber,
                status: latestOrder.status,
                approvalStatus:
                  latestOrder.approvalStatus,
                totalPrice:
                  latestOrder.totalPrice,
                currency:
                  latestOrder.currency,
                createdAt:
                  latestOrder.createdAt,
              }
            : null,

          operationalOrder:
            operationalOrder
              ? {
                  id: operationalOrder.id,
                  orderNumber:
                    operationalOrder.orderNumber,
                  status:
                    operationalOrder.status,
                  totalPrice:
                    operationalOrder.totalPrice,
                  currency:
                    operationalOrder.currency,
                  createdAt:
                    operationalOrder.createdAt,
                }
              : null,

          payment:
            latestOrder?.payments[0] ??
            operationalOrder?.payments[0] ??
            null,

          ticket: activeTicket
            ? {
                id: activeTicket.id,
                ticketNumber:
                  activeTicket.ticketNumber,
                qrCode:
                  activeTicket.qrCode,
                status:
                  activeTicket.status,
                isScanned:
                  activeTicket.isScanned,
                issuedAt:
                  activeTicket.issuedAt,
                checkedInAt:
                  activeTicket.checkedInAt,
                category:
                  activeTicket.category,
                order:
                  activeTicket.order,
              }
            : null,

          checkIn:
            latestCheckIn,

          racepackClaimed,
        },

        histories: {
          orders,

          payments: orders.flatMap(
            (order) =>
              order.payments.map(
                (payment) => ({
                  ...payment,
                  orderId:
                    order.id,
                  orderNumber:
                    order.orderNumber,
                }),
              ),
          ),

          transactions: orders.flatMap(
            (order) =>
              order.transactions.map(
                (transaction) => ({
                  ...transaction,
                  orderId:
                    order.id,
                  orderNumber:
                    order.orderNumber,
                }),
              ),
          ),

          tickets,

          checkIns: tickets.flatMap(
            (ticket) =>
              ticket.checkIns.map(
                (checkIn) => ({
                  ...checkIn,
                  ticketId:
                    ticket.id,
                  ticketNumber:
                    ticket.ticketNumber,
                }),
              ),
          ),

          scans: tickets.flatMap(
            (ticket) =>
              ticket.scans.map(
                (scan) => ({
                  ...scan,
                  ticketId:
                    ticket.id,
                  ticketNumber:
                    ticket.ticketNumber,
                }),
              ),
          ),

          transfers: tickets.flatMap(
            (ticket) =>
              ticket.transfers.map(
                (transfer) => ({
                  ...transfer,
                  ticketId:
                    ticket.id,
                  ticketNumber:
                    ticket.ticketNumber,
                }),
              ),
          ),
        },
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/participants/[participantEventId] error:",
      error,
    );

    return authorizationErrorResponse(error);
  }
}
