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
    transactionId: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await requireAuth();

    const { transactionId } =
      await context.params;

    const normalizedTransactionId =
      transactionId.trim();

    if (!normalizedTransactionId) {
      return NextResponse.json(
        {
          error:
            "Transaction ID tidak valid.",
        },
        { status: 400 },
      );
    }

    /*
     * ============================================================
     * TRANSACTION CORE
     * ============================================================
     *
     * Kita gunakan relation select yang sama dengan
     * pola yang sudah terbukti lulus pada list API.
     */
    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id: normalizedTransactionId,
        },
        select: {
          id: true,
          orderId: true,
          paymentId: true,
          runnerId: true,
          amount: true,
          status: true,
          paymentMethod: true,
          externalId: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,

          order: {
            select: {
              id: true,
              orderNumber: true,
              eventId: true,
              fullName: true,
              email: true,
              phone: true,
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
                },
              },
            },
          },

          payment: {
            select: {
              id: true,
              externalId: true,
              provider: true,
              method: true,
              status: true,
              providerTransactionId: true,
              paidAt: true,
              createdAt: true,
            },
          },

          runner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          tickets: {
            orderBy: {
              createdAt: "asc",
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
              createdAt: true,
              updatedAt: true,

              category: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },

              participant: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },

              checkIns: {
                orderBy: {
                  checkedInAt: "asc",
                },
                select: {
                  id: true,
                  status: true,
                  gate: true,
                  notes: true,
                  checkedInAt: true,
                },
              },

              scans: {
                orderBy: {
                  scannedAt: "asc",
                },
                select: {
                  id: true,
                  result: true,
                  message: true,
                  scannedAt: true,
                },
              },

              transfers: {
                orderBy: {
                  transferredAt: "asc",
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
          },
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          error:
            "Transaction tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    /*
     * ============================================================
     * ORGANIZATION AUTHORIZATION
     * ============================================================
     */
    const organizationId =
      transaction.order?.event
        .organizationId ?? undefined;

    await requireResolvedOrganizationPermission(
      organizationId,
      "payments.view",
    );

    /*
     * ============================================================
     * OPERATIONAL DERIVATION
     * ============================================================
     */
    const allCheckIns =
      transaction.tickets.flatMap(
        (ticket) => ticket.checkIns,
      );

    const allScans =
      transaction.tickets.flatMap(
        (ticket) => ticket.scans,
      );

    const allTransfers =
      transaction.tickets.flatMap(
        (ticket) => ticket.transfers,
      );

    const latestCheckIn =
      [...allCheckIns].sort(
        (a, b) =>
          new Date(
            b.checkedInAt ??
              0,
          ).getTime() -
          new Date(
            a.checkedInAt ??
              0,
          ).getTime(),
      )[0] ?? null;

    const latestScan =
      [...allScans].sort(
        (a, b) =>
          new Date(
            b.scannedAt,
          ).getTime() -
          new Date(
            a.scannedAt,
          ).getTime(),
      )[0] ?? null;

    const latestTransfer =
      [...allTransfers].sort(
        (a, b) =>
          new Date(
            b.transferredAt,
          ).getTime() -
          new Date(
            a.transferredAt,
          ).getTime(),
      )[0] ?? null;

    /*
     * ============================================================
     * TIMELINE
     * ============================================================
     */
    const timeline = [
      {
        id: `transaction-created-${transaction.id}`,
        type: "TRANSACTION_CREATED",
        status: transaction.status,
        title: "Transaction Created",
        description:
          transaction.externalId ??
          transaction.id,
        timestamp:
          transaction.createdAt,
      },

      transaction.payment?.createdAt
        ? {
            id: `payment-created-${transaction.payment.id}`,
            type: "PAYMENT_CREATED",
            status:
              transaction.payment.status,
            title: "Payment Created",
            description:
              `${transaction.payment.provider} · ${
                transaction.payment
                  .method ??
                "—"
              }`,
            timestamp:
              transaction.payment
                .createdAt,
          }
        : null,

      transaction.payment?.paidAt
        ? {
            id: `payment-paid-${transaction.payment.id}`,
            type: "PAYMENT_PAID",
            status:
              transaction.payment.status,
            title: "Payment Successful",
            description:
              transaction.payment
                .providerTransactionId ??
              transaction.payment
                .externalId,
            timestamp:
              transaction.payment.paidAt,
          }
        : null,

      transaction.order?.paidAt
        ? {
            id: `order-paid-${transaction.order.id}`,
            type: "ORDER_PAID",
            status:
              transaction.order.status,
            title: "Order Paid",
            description:
              transaction.order
                .orderNumber,
            timestamp:
              transaction.order.paidAt,
          }
        : null,

      ...transaction.tickets.flatMap(
        (ticket) =>
          ticket.issuedAt
            ? [
                {
                  id: `ticket-issued-${ticket.id}`,
                  type: "TICKET_ISSUED",
                  status: ticket.status,
                  title: "Ticket Issued",
                  description:
                    `${ticket.ticketNumber} · ${ticket.category.name}`,
                  timestamp:
                    ticket.issuedAt,
                },
              ]
            : [],
      ),

      ...transaction.tickets.flatMap(
        (ticket) =>
          ticket.checkIns.map(
            (checkIn) => ({
              id: `checkin-${checkIn.id}`,
              type: "CHECK_IN",
              status:
                checkIn.status,
              title: "Check-In",
              description:
                checkIn.gate
                  ? `Gate ${checkIn.gate}`
                  : ticket.ticketNumber,
              timestamp:
                checkIn.checkedInAt ??
                transaction.createdAt,
            }),
          ),
      ),

      ...transaction.tickets.flatMap(
        (ticket) =>
          ticket.scans.map(
            (scan) => ({
              id: `scan-${scan.id}`,
              type: "SCAN",
              status:
                scan.result,
              title: "Ticket Scan",
              description:
                scan.message ??
                ticket.ticketNumber,
              timestamp:
                scan.scannedAt,
            }),
          ),
      ),

      ...transaction.tickets.flatMap(
        (ticket) =>
          ticket.transfers.map(
            (transfer) => ({
              id: `transfer-${transfer.id}`,
              type: "TRANSFER",
              status: "TRANSFERRED",
              title: "Ticket Transfer",
              description:
                `${transfer.fromName ?? "—"} → ${
                  transfer.toName ?? "—"
                }`,
              timestamp:
                transfer.transferredAt,
            }),
          ),
      ),
    ]
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => Boolean(item),
      )
      .sort(
        (a, b) =>
          new Date(
            a.timestamp,
          ).getTime() -
          new Date(
            b.timestamp,
          ).getTime(),
      );

    return NextResponse.json({
      success: true,

      data: {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          paymentMethod:
            transaction.paymentMethod,
          externalId:
            transaction.externalId,
          metadata:
            transaction.metadata,
          createdAt:
            transaction.createdAt,
          updatedAt:
            transaction.updatedAt,
        },

        organization: {
          id: organizationId,
        },

        event: transaction.order?.event
          ? {
              id:
                transaction.order.event
                  .id,
              title:
                transaction.order.event
                  .title,
            }
          : null,

        customer:
          transaction.order
            ? {
                fullName:
                  transaction.order
                    .fullName,
                email:
                  transaction.order
                    .email,
              }
            : transaction.runner
              ? {
                  fullName:
                    transaction.runner
                      .name,
                  email:
                    transaction.runner
                      .email,
                  phone: null,
                }
              : null,

        order: transaction.order
          ? {
              orderNumber:
                transaction.order
                  .orderNumber,
              status:
                transaction.order.status,
              approvalStatus:
                transaction.order
                  .approvalStatus,
              subtotal:
                transaction.order
                  .subtotal,
              discountTotal:
                transaction.order
                  .discountTotal,
              addonTotal:
                transaction.order
                  .addonTotal,
              totalPrice:
                transaction.order
                  .totalPrice,
              isClaimed:
                transaction.order
                  .isClaimed,
            }
          : null,

        payment: transaction.payment
          ? {
              provider:
                transaction.payment
                  .provider,
              method:
                transaction.payment
                  .method,
              status:
                transaction.payment
                  .status,
              providerTransactionId:
                transaction.payment
                  .providerTransactionId,
              paidAt:
                transaction.payment
                  .paidAt,
            }
          : null,

        tickets:
          transaction.tickets.map(
            (ticket) => ({
              id: ticket.id,
              ticketNumber:
                ticket.ticketNumber,
              qrCode: ticket.qrCode,
              status: ticket.status,
              isScanned:
                ticket.isScanned,
              issuedAt:
                ticket.issuedAt,
              checkedInAt:
                ticket.checkedInAt,
              cancelledAt:
                ticket.cancelledAt,
              transferredAt:
                ticket.transferredAt,
              createdAt:
                ticket.createdAt,
              updatedAt:
                ticket.updatedAt,
              category:
                ticket.category,
              participant:
                ticket.participant,
              checkIns:
                ticket.checkIns,
              scans:
                ticket.scans,
              transfers:
                ticket.transfers,
            }),
          ),

        operational: {
          ticketCount:
            transaction.tickets.length,

          hasActiveTicket:
            transaction.tickets.some(
              (ticket) =>
                ticket.status ===
                "ACTIVE",
            ),

          latestCheckIn,
          latestScan,
          latestTransfer,
        },

        timeline,
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/transactions/[transactionId] error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
