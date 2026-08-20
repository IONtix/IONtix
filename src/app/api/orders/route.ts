import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function normalizeOptional(
  value: string | null,
) {
  const normalized = value?.trim();

  return normalized
    ? normalized
    : undefined;
}

function parsePositiveInt(
  value: string | null,
  fallback: number,
) {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

function statusLabel(
  status: string,
) {
  switch (status) {
    case "DRAFT":
      return "DRAFT";

    case "PENDING_PAYMENT":
      return "MENUNGGU PEMBAYARAN";

    case "PAYMENT_PROCESSING":
      return "PEMBAYARAN DIPROSES";

    case "PAID":
      return "PAID";

    case "EXPIRED":
      return "EXPIRED";

    case "CANCELLED":
      return "DIBATALKAN";

    case "REFUNDED":
      return "REFUNDED";

    case "PARTIALLY_REFUNDED":
      return "REFUND SEBAGIAN";

    case "FAILED":
      return "FAILED";

    default:
      return status;
  }
}

export async function GET(
  request: Request,
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const organizationId =
      normalizeOptional(
        searchParams.get(
          "organizationId",
        ),
      );

    const eventId =
      normalizeOptional(
        searchParams.get("eventId"),
      );

    const search =
      normalizeOptional(
        searchParams.get("search"),
      );

    const status =
      normalizeOptional(
        searchParams.get("status"),
      );

    const approvalStatus =
      normalizeOptional(
        searchParams.get(
          "approvalStatus",
        ),
      );

    const page = parsePositiveInt(
      searchParams.get("page"),
      DEFAULT_PAGE,
    );

    const requestedPageSize =
      parsePositiveInt(
        searchParams.get("pageSize"),
        DEFAULT_PAGE_SIZE,
      );

    const pageSize = Math.min(
      requestedPageSize,
      MAX_PAGE_SIZE,
    );

    const sort =
      searchParams.get("sort")?.trim() ||
      "createdAt";

    const direction =
      searchParams.get("direction") ===
      "asc"
        ? "asc"
        : "desc";

    await requireResolvedOrganizationPermission(
      organizationId,
      "orders.view",
    );

    /*
     * Organization boundary diturunkan melalui Event.
     */
    const scopedEvents =
      await prisma.event.findMany({
        where: {
          organizationId,
          ...(eventId
            ? { id: eventId }
            : {}),
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          title: "asc",
        },
      });

    if (
      eventId &&
      scopedEvents.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Event tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const scopedEventIds =
      scopedEvents.map(
        (event) => event.id,
      );

    if (
      scopedEventIds.length === 0
    ) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          total: 0,
          paid: 0,
          pendingPayment: 0,
          paymentProcessing: 0,
          expired: 0,
          failed: 0,
          cancelled: 0,
          refunded: 0,
          partiallyRefunded: 0,
          ticketIssued: 0,
          racepackClaimed: 0,
          totalAmount: 0,
          paidAmount: 0,
        },
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const where: Prisma.OrderWhereInput = {
      eventId: {
        in: scopedEventIds,
      },
    };

    if (status) {
      where.status =
        status as Prisma.OrderWhereInput["status"];
    }

    if (approvalStatus) {
      where.approvalStatus =
        approvalStatus as Prisma.OrderWhereInput["approvalStatus"];
    }

    if (search) {
      where.OR = [
        {
          id: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          orderNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          participant: {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          participant: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const orderBy:
      | Prisma.OrderOrderByWithRelationInput
      | Prisma.OrderOrderByWithRelationInput[] =
      sort === "totalPrice"
        ? {
            totalPrice: direction,
          }
        : sort === "status"
          ? {
              status: direction,
            }
          : {
              createdAt: direction,
            };

    const total =
      await prisma.order.count({
        where,
      });

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total / pageSize,
          );

    const orders =
      await prisma.order.findMany({
        where,
        orderBy: [
          orderBy,
          {
            id: direction,
          },
        ],
        skip:
          (page - 1) * pageSize,
        take: pageSize,

        select: {
          id: true,
          orderNumber: true,
          eventId: true,
          buyerUserId: true,
          participantId: true,

          fullName: true,
          email: true,
          phone: true,

          subtotal: true,
          discountTotal: true,
          addonTotal: true,
          totalPrice: true,
          currency: true,

          status: true,
          approvalStatus: true,
          isClaimed: true,

          expiresAt: true,
          paidAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,

          event: {
            select: {
              id: true,
              title: true,
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

          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          items: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              itemType: true,
              name: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,

              ticketCategory: {
                select: {
                  id: true,
                  name: true,
                },
              },

              addon: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
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
              updatedAt: true,
            },
          },

          transactions: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              amount: true,
              status: true,
              paymentMethod: true,
              externalId: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          tickets: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              ticketNumber: true,
              status: true,
              participantId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    /*
     * Summary mengikuti filter yang sama
     * dengan tabel.
     */
    const summaryRows =
      await prisma.order.findMany({
        where,
        select: {
          status: true,
          totalPrice: true,
          isClaimed: true,
          tickets: {
            select: {
              id: true,
            },
            take: 1,
          },
        },
      });

    const summary =
      summaryRows.reduce(
        (result, order) => {
          result.total += 1;
          result.totalAmount +=
            order.totalPrice;

          if (order.tickets.length > 0) {
            result.ticketIssued += 1;
          }

          if (order.isClaimed) {
            result.racepackClaimed += 1;
          }

          switch (order.status) {
            case "PAID":
              result.paid += 1;
              result.paidAmount +=
                order.totalPrice;
              break;

            case "PENDING_PAYMENT":
              result.pendingPayment += 1;
              break;

            case "PAYMENT_PROCESSING":
              result.paymentProcessing += 1;
              break;

            case "EXPIRED":
              result.expired += 1;
              break;

            case "FAILED":
              result.failed += 1;
              break;

            case "CANCELLED":
              result.cancelled += 1;
              break;

            case "REFUNDED":
              result.refunded += 1;
              break;

            case "PARTIALLY_REFUNDED":
              result.partiallyRefunded += 1;
              break;

            default:
              break;
          }

          return result;
        },
        {
          total: 0,
          paid: 0,
          pendingPayment: 0,
          paymentProcessing: 0,
          expired: 0,
          failed: 0,
          cancelled: 0,
          refunded: 0,
          partiallyRefunded: 0,
          ticketIssued: 0,
          racepackClaimed: 0,
          totalAmount: 0,
          paidAmount: 0,
        },
      );

    const data = orders.map(
      (order) => ({
        id: order.id,
        orderNumber:
          order.orderNumber,

        customer: {
          fullName:
            order.fullName ??
            order.participant
              ?.fullName ??
            order.buyer?.name ??
            "—",
          email:
            order.email ??
            order.participant
              ?.email ??
            order.buyer?.email ??
            "—",
          phone:
            order.phone ??
            order.participant
              ?.phone ??
            "—",
        },

        event: order.event,

        participant:
          order.participant,

        buyer: order.buyer,

        amount: {
          subtotal: order.subtotal,
          discountTotal:
            order.discountTotal,
          addonTotal:
            order.addonTotal,
          totalPrice:
            order.totalPrice,
          currency: order.currency,
        },

        status: order.status,
        statusLabel:
          statusLabel(order.status),

        approvalStatus:
          order.approvalStatus,

        isClaimed:
          order.isClaimed,

        expiresAt:
          order.expiresAt,
        paidAt:
          order.paidAt,
        cancelledAt:
          order.cancelledAt,
        createdAt:
          order.createdAt,
        updatedAt:
          order.updatedAt,

        items: order.items,

        payment:
          order.payments[0] ?? null,

        transaction:
          order.transactions[0] ??
          null,

        ticket:
          order.tickets[0] ?? null,
      }),
    );

    return NextResponse.json({
      success: true,

      data,

      summary,

      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/orders error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
