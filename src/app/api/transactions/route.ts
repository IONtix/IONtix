import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";
import { Prisma } from "@/generated/prisma/client";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(
  value: string | null,
  fallback: number,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function normalizeOptional(
  value: string | null,
) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function parseDate(
  value: string | undefined,
) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function transactionStatusLabel(
  status: string,
) {
  const normalized = status.trim().toUpperCase();

  switch (normalized) {
    case "SUCCESS":
      return "SUCCESS";

    case "PENDING":
      return "PENDING";

    case "FAILED":
      return "FAILED";

    case "EXPIRED":
      return "EXPIRED";

    case "CANCELLED":
      return "CANCELLED";

    default:
      return status;
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } =
      new URL(request.url);

    const organizationId =
      normalizeOptional(
        searchParams.get("organizationId"),
      );

    const requestedEventId =
      normalizeOptional(
        searchParams.get("eventId"),
      );

    const search =
      normalizeOptional(
        searchParams.get("search"),
      );

    const paymentStatus =
      normalizeOptional(
        searchParams.get("paymentStatus"),
      );

    const transactionStatus =
      normalizeOptional(
        searchParams.get(
          "transactionStatus",
        ),
      );

    const paymentMethod =
      normalizeOptional(
        searchParams.get("paymentMethod"),
      );

    const provider =
      normalizeOptional(
        searchParams.get("provider"),
      );

    const dateFrom = parseDate(
      normalizeOptional(
        searchParams.get("dateFrom"),
      ),
    );

    const dateTo = parseDate(
      normalizeOptional(
        searchParams.get("dateTo"),
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

    /*
     * ============================================================
     * ORGANIZATION AUTHORIZATION
     * ============================================================
     */
    await requireResolvedOrganizationPermission(
      organizationId,
      "payments.view",
    );

    /*
     * ============================================================
     * EVENT SCOPE
     * ============================================================
     *
     * Transaction tidak memiliki organizationId langsung.
     * Organization boundary diturunkan melalui Order -> Event.
     */
    const eventWhere: Prisma.EventWhereInput = {
      organizationId:
        organizationId ?? undefined,
    };

    if (requestedEventId) {
      eventWhere.id = requestedEventId;
    }

    const scopedEvents =
      await prisma.event.findMany({
        where: eventWhere,
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          title: "asc",
        },
      });

    if (requestedEventId &&
        scopedEvents.length === 0) {
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

    if (scopedEventIds.length === 0) {
      return NextResponse.json({
        success: true,

        data: [],

        summary: {
          total: 0,
          success: 0,
          pending: 0,
          failed: 0,
          expired: 0,
          totalAmount: 0,
          successfulAmount: 0,
        },

        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      });
    }

    /*
     * ============================================================
     * TRANSACTION WHERE
     * ============================================================
     */
    const where: Prisma.TransactionWhereInput =
      {
        order: {
          eventId: {
            in: scopedEventIds,
          },
        },
      };

    if (transactionStatus) {
      where.status =
        transactionStatus;
    }

    const paymentWhere:
      | Prisma.PaymentWhereInput
      | undefined =
      provider || paymentStatus || paymentMethod
        ? {
            ...(provider
              ? {
                  provider,
                }
              : {}),
            ...(paymentStatus
              ? {
                  status:
                    paymentStatus as Prisma.PaymentWhereInput["status"],
                }
              : {}),
            ...(paymentMethod
              ? {
                  method:
                    paymentMethod as Prisma.PaymentWhereInput["method"],
                }
              : {}),
          }
        : undefined;

    if (paymentWhere) {
      where.payment = paymentWhere;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom
          ? { gte: dateFrom }
          : {}),
        ...(dateTo
          ? { lte: dateTo }
          : {}),
      };
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
          externalId: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          order: {
            orderNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          order: {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          order: {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          payment: {
            providerTransactionId: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    /*
     * ============================================================
     * SORT
     * ============================================================
     */
    const orderBy:
      | Prisma.TransactionOrderByWithRelationInput
      | Prisma.TransactionOrderByWithRelationInput[] =
      sort === "amount"
        ? {
            amount: direction,
          }
        : sort === "status"
          ? {
              status: direction,
            }
          : {
              createdAt: direction,
            };

    /*
     * ============================================================
     * TOTAL
     * ============================================================
     */
    const total =
      await prisma.transaction.count({
        where,
      });

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / pageSize);

    /*
     * ============================================================
     * PAGE DATA
     * ============================================================
     */
    const transactions =
      await prisma.transaction.findMany({
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
              status: true,
              approvalStatus: true,
              totalPrice: true,

              event: {
                select: {
                  id: true,
                  title: true,
                },
              },

            },
          },

          payment: {
            select: {
              provider: true,
              method: true,
              status: true,
              currency: true,
              paidAt: true,
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
     * ============================================================
     * SUMMARY — FILTER-AWARE, DATABASE LEVEL
     * ============================================================
     *
     * Semua KPI mengikuti filter yang sama dengan tabel.
     */
    const summaryRows =
      await prisma.transaction.findMany({
        where,
        select: {
          amount: true,
          status: true,
        },
      });

    const summary = summaryRows.reduce(
      (result, transaction) => {
        const normalized =
          transaction.status
            .trim()
            .toUpperCase();

        result.total += 1;
        result.totalAmount +=
          transaction.amount;

        if (normalized === "SUCCESS") {
          result.success += 1;
          result.successfulAmount +=
            transaction.amount;
        }

        if (normalized === "PENDING") {
          result.pending += 1;
        }

        if (normalized === "FAILED") {
          result.failed += 1;
        }

        if (normalized === "EXPIRED") {
          result.expired += 1;
        }

        return result;
      },
      {
        total: 0,
        success: 0,
        pending: 0,
        failed: 0,
        expired: 0,
        totalAmount: 0,
        successfulAmount: 0,
      },
    );

    /*
     * ============================================================
     * RESPONSE
     * ============================================================
     */
    const data = transactions.map(
      (transaction) => ({
        id: transaction.id,

        amount: transaction.amount,

        status:
          transaction.status,

        statusLabel:
          transactionStatusLabel(
            transaction.status,
          ),

        paymentMethod:
          transaction.paymentMethod,

        externalId:
          transaction.externalId,

        createdAt:
          transaction.createdAt,

        updatedAt:
          transaction.updatedAt,

        order: transaction.order
          ? {
              id: transaction.order.id,
              orderNumber:
                transaction.order
                  .orderNumber,

              status:
                transaction.order.status,

              approvalStatus:
                transaction.order
                  .approvalStatus,

              totalPrice:
                transaction.order
                  .totalPrice,

              customer: {
                fullName:
                  transaction.order
                    .fullName,
                email:
                  transaction.order
                    .email,
              },

              event:
                transaction.order.event,
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

              currency:
                transaction.payment
                  .currency,

              paidAt:
                transaction.payment
                  .paidAt,
            }
          : null,

        runner:
          transaction.runner
            ? {
                id:
                  transaction.runner
                    .id,
                name:
                  transaction.runner
                    .name,
                email:
                  transaction.runner
                    .email,
              }
            : null,

        tickets:
          transaction.tickets.map(
            (ticket) => ({
              id: ticket.id,
              ticketNumber:
                ticket.ticketNumber,
              status: ticket.status,
              participantId:
                ticket.participantId,
              category:
                ticket.category,
            }),
          ),
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
      "GET /api/transactions error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
