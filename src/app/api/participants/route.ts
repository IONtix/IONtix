import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";
import {
  CheckInStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  TicketStatus,
} from "@/generated/prisma/client";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const ORDER_STATUSES = new Set(Object.values(OrderStatus));
const PAYMENT_STATUSES = new Set(Object.values(PaymentStatus));
const TICKET_STATUSES = new Set(Object.values(TicketStatus));
const CHECKIN_STATUSES = new Set(Object.values(CheckInStatus));

type SortField = "createdAt" | "name" | "eventTitle";
type SortDirection = "asc" | "desc";

function parsePositiveInt(
  value: string | null,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseEnumFilter<T extends string>(
  value: string | null,
  allowed: Set<T>,
  fieldName: string,
): T | null {
  if (!value) {
    return null;
  }

  if (!allowed.has(value as T)) {
    throw new Error(`Filter ${fieldName} tidak valid.`);
  }

  return value as T;
}

function parseSort(value: string | null): SortField {
  if (
    value === "createdAt" ||
    value === "name" ||
    value === "eventTitle"
  ) {
    return value;
  }

  return "createdAt";
}

function parseDirection(value: string | null): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function sortSql(
  sort: SortField,
  direction: SortDirection,
): Prisma.Sql {
  const directionSql = Prisma.raw(direction.toUpperCase());

  switch (sort) {
    case "name":
      return Prisma.sql`
        p."fullName" ${directionSql},
        pe."id" ASC
      `;

    case "eventTitle":
      return Prisma.sql`
        e."title" ${directionSql},
        pe."id" ASC
      `;

    default:
      return Prisma.sql`
        pe."registeredAt" ${directionSql},
        pe."id" ASC
      `;
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);

    const organizationId =
      searchParams.get("organizationId")?.trim() || undefined;

    const requestedEventId =
      searchParams.get("eventId")?.trim() || null;

    const requestedCategoryId =
      searchParams.get("categoryId")?.trim() || null;

    const search =
      searchParams.get("search")?.trim() || null;

    const page = parsePositiveInt(
      searchParams.get("page"),
      DEFAULT_PAGE,
    );

    const requestedPageSize = parsePositiveInt(
      searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
    );

    const pageSize = Math.min(
      requestedPageSize,
      MAX_PAGE_SIZE,
    );

    const sort = parseSort(
      searchParams.get("sort"),
    );

    const direction = parseDirection(
      searchParams.get("direction"),
    );

    const orderStatus = parseEnumFilter(
      searchParams.get("orderStatus"),
      ORDER_STATUSES,
      "orderStatus",
    );

    const paymentStatus = parseEnumFilter(
      searchParams.get("paymentStatus"),
      PAYMENT_STATUSES,
      "paymentStatus",
    );

    const ticketStatus = parseEnumFilter(
      searchParams.get("ticketStatus"),
      TICKET_STATUSES,
      "ticketStatus",
    );

    const checkInStatus = parseEnumFilter(
      searchParams.get("checkInStatus"),
      CHECKIN_STATUSES,
      "checkInStatus",
    );

    const racepackStatus =
      searchParams.get("racepackStatus")?.trim() || null;

    if (
      racepackStatus &&
      racepackStatus !== "CLAIMED" &&
      racepackStatus !== "UNCLAIMED"
    ) {
      throw new Error(
        'Filter racepackStatus harus "CLAIMED" atau "UNCLAIMED".',
      );
    }

    /*
     * ============================================================
     * ORGANIZATION / PERMISSION SCOPE
     * ============================================================
     */
    let scopedOrganizationId: string | null = null;

    if (user.role !== "SUPER_ADMIN") {
      const membership =
        await requireResolvedOrganizationPermission(
          organizationId,
          "participants.view",
        );

      scopedOrganizationId =
        membership.organizationId;
    } else if (organizationId) {
      /*
       * SUPER_ADMIN boleh menggunakan organizationId
       * sebagai filter platform-level.
       */
      scopedOrganizationId = organizationId;
    }

    /*
     * EventId harus berada di dalam organization scope.
     */
    if (requestedEventId) {
      const scopedEvent =
        await prisma.event.findFirst({
          where: {
            id: requestedEventId,
            ...(scopedOrganizationId
              ? {
                  organizationId:
                    scopedOrganizationId,
                }
              : {}),
          },
          select: {
            id: true,
          },
        });

      if (!scopedEvent) {
        return NextResponse.json(
          {
            error: "Event tidak ditemukan.",
          },
          { status: 404 },
        );
      }
    }

    /*
     * ============================================================
     * DATABASE FILTER
     * ============================================================
     *
     * Satu row = satu ParticipantEvent.
     *
     * Semua operational filter dikorelasikan langsung dengan:
     *   ParticipantEvent.participantId
     *   ParticipantEvent.eventId
     *
     * sehingga participant multi-event tidak dapat mencampur
     * order/payment/ticket/check-in dari event lain.
     */
    const whereParts: Prisma.Sql[] = [
      Prisma.sql`1 = 1`,
    ];

    if (scopedOrganizationId) {
      whereParts.push(
        Prisma.sql`e."organizationId" = ${scopedOrganizationId}`,
      );
    }

    if (requestedEventId) {
      whereParts.push(
        Prisma.sql`pe."eventId" = ${requestedEventId}`,
      );
    }

    if (search) {
      const searchPattern = `%${search}%`;

      whereParts.push(
        Prisma.sql`
          (
            p."fullName" ILIKE ${searchPattern}
            OR p."email" ILIKE ${searchPattern}
            OR p."phone" ILIKE ${searchPattern}
            OR EXISTS (
              SELECT 1
              FROM "Ticket" st
              WHERE
                st."participantId" = pe."participantId"
                AND st."eventId" = pe."eventId"
                AND st."ticketNumber" ILIKE ${searchPattern}
            )
          )
        `,
      );
    }

    if (requestedCategoryId) {
      whereParts.push(
        Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "Ticket" ct
            WHERE
              ct."participantId" = pe."participantId"
              AND ct."eventId" = pe."eventId"
              AND ct."categoryId" = ${requestedCategoryId}
          )
        `,
      );
    }

    if (orderStatus) {
      whereParts.push(
        Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "Order" os
            WHERE
              os."participantId" = pe."participantId"
              AND os."eventId" = pe."eventId"
              AND os."status" = ${orderStatus}
          )
        `,
      );
    }

    if (paymentStatus) {
      whereParts.push(
        Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "Payment" ps
            INNER JOIN "Order" po
              ON po."id" = ps."orderId"
            WHERE
              po."participantId" = pe."participantId"
              AND po."eventId" = pe."eventId"
              AND ps."status" = ${paymentStatus}
          )
        `,
      );
    }

    if (ticketStatus) {
      whereParts.push(
        Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "Ticket" ts
            WHERE
              ts."participantId" = pe."participantId"
              AND ts."eventId" = pe."eventId"
              AND ts."status" = ${ticketStatus}
          )
        `,
      );
    }

    if (checkInStatus) {
      whereParts.push(
        Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "CheckIn" cs
            WHERE
              cs."participantId" = pe."participantId"
              AND cs."eventId" = pe."eventId"
              AND cs."status" = ${checkInStatus}
          )
        `,
      );
    }

    if (racepackStatus) {
      const claimed = racepackStatus === "CLAIMED";

      whereParts.push(
        Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "Order" rs
            WHERE
              rs."participantId" = pe."participantId"
              AND rs."eventId" = pe."eventId"
              AND rs."isClaimed" = ${claimed}
          )
        `,
      );
    }

    const whereSql = Prisma.join(
      whereParts,
      " AND ",
    );

    const orderBySql = sortSql(
      sort,
      direction,
    );

    /*
     * ============================================================
     * COUNT + PAGE
     * ============================================================
     */
    const totalRows =
      await prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "ParticipantEvent" pe
          INNER JOIN "Participant" p
            ON p."id" = pe."participantId"
          INNER JOIN "Event" e
            ON e."id" = pe."eventId"
          WHERE ${whereSql}
        `,
      );

    const total = Number(
      totalRows[0]?.count ?? BigInt(0),
    );

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / pageSize);

    const offset = (page - 1) * pageSize;

    const pageRows =
      await prisma.$queryRaw<
        Array<{ id: string }>
      >(
        Prisma.sql`
          SELECT pe."id"
          FROM "ParticipantEvent" pe
          INNER JOIN "Participant" p
            ON p."id" = pe."participantId"
          INNER JOIN "Event" e
            ON e."id" = pe."eventId"
          WHERE ${whereSql}
          ORDER BY ${orderBySql}
          LIMIT ${pageSize}
          OFFSET ${offset}
        `,
      );

    const enrollmentIds =
      pageRows.map((row) => row.id);

    if (enrollmentIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      });
    }

    /*
     * ============================================================
     * ENROLLMENT DETAILS
     * ============================================================
     */
    const enrollments =
      await prisma.participantEvent.findMany({
        where: {
          id: {
            in: enrollmentIds,
          },
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
        },
      });

    /*
     * Prisma tidak menjamin urutan IN(...) mengikuti pageRows.
     * Kita map kembali mengikuti urutan database page.
     */
    const enrollmentById = new Map(
      enrollments.map((enrollment) => [
        enrollment.id,
        enrollment,
      ]),
    );

    const orderedEnrollments = enrollmentIds
      .map((id) => enrollmentById.get(id))
      .filter(
        (
          enrollment,
        ): enrollment is NonNullable<
          (typeof enrollments)[number]
        > => Boolean(enrollment),
      );

    /*
     * ============================================================
     * EXACT PARTICIPANT × EVENT ORDER LOOKUP
     * ============================================================
     */
    const participantIds = Array.from(
      new Set(
        orderedEnrollments.map(
          (enrollment) =>
            enrollment.participantId,
        ),
      ),
    );

    const eventIds = Array.from(
      new Set(
        orderedEnrollments.map(
          (enrollment) => enrollment.eventId,
        ),
      ),
    );

    const orders =
      await prisma.order.findMany({
        where: {
          participantId: {
            in: participantIds,
          },
          eventId: {
            in: eventIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          participantId: true,
          eventId: true,
          orderNumber: true,
          status: true,
          approvalStatus: true,
          isClaimed: true,
          totalPrice: true,
          paidAt: true,
          createdAt: true,

          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              status: true,
              amount: true,
              paidAt: true,
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
              qrCode: true,
              eventId: true,
              participantId: true,
              categoryId: true,
              status: true,

              category: {
                select: {
                  id: true,
                  name: true,
                },
              },

              checkIns: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
                select: {
                  status: true,
                  checkedInAt: true,
                  gate: true,
                },
              },
            },
          },
        },
      });

    /*
     * Karena order desc, order pertama adalah
     * order terbaru untuk pair participantId:eventId.
     */
    const latestOrderByPair = new Map<
      string,
      (typeof orders)[number]
    >();

    for (const order of orders) {
      if (!order.participantId) {
        continue;
      }

      const key =
        `${order.participantId}:${order.eventId}`;

      if (!latestOrderByPair.has(key)) {
        latestOrderByPair.set(key, order);
      }
    }

    const data = orderedEnrollments.map(
      (enrollment) => {
        const key =
          `${enrollment.participantId}:${enrollment.eventId}`;

        const order =
          latestOrderByPair.get(key) ?? null;

        const payment =
          order?.payments[0] ?? null;

        const ticket =
          order?.tickets.find(
            (item) =>
              item.eventId ===
                enrollment.eventId &&
              item.participantId ===
                enrollment.participantId,
          ) ?? null;

        const checkIn =
          ticket?.checkIns[0] ?? null;

        return {
          id: enrollment.participantId,

          fullName:
            enrollment.participant.fullName,

          email:
            enrollment.participant.email,

          phone:
            enrollment.participant.phone,

          event: {
            id: enrollment.event.id,
            title: enrollment.event.title,
          },

          registration: {
            registeredAt:
              enrollment.registeredAt,

            approvalStatus:
              enrollment.approvalStatus,
          },

          order: order
            ? {
                id: order.id,
                orderNumber:
                  order.orderNumber,
                status: order.status,
                approvalStatus:
                  order.approvalStatus,
              }
            : null,

          payment: payment
            ? {
                status: payment.status,
                amount: payment.amount,
                paidAt: payment.paidAt,
              }
            : null,

          ticket: ticket
            ? {
                id: ticket.id,
                ticketNumber:
                  ticket.ticketNumber,
                qrCode: ticket.qrCode,
                categoryId:
                  ticket.categoryId,
                categoryName:
                  ticket.category.name,
                status: ticket.status,
              }
            : null,

          checkIn: checkIn
            ? {
                status: checkIn.status,
                checkedInAt:
                  checkIn.checkedInAt,
                gate: checkIn.gate,
              }
            : null,

          racepackClaimed:
            order?.isClaimed ?? false,
        };
      },
    );

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/participants error:",
      error,
    );

    return authorizationErrorResponse(error);
  }
}
