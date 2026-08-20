import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

function normalizeOptional(
  value: string | null,
) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const organizationId =
      normalizeOptional(
        searchParams.get(
          "organizationId",
        ),
      );

    await requireResolvedOrganizationPermission(
      organizationId,
      "payments.view",
    );

    const events =
      await prisma.event.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          title: "asc",
        },
      });

    const eventIds =
      events.map((event) => event.id);

    const providers =
      eventIds.length === 0
        ? []
        : Array.from(
            new Set(
              (
                await prisma.payment.findMany({
                  where: {
                    order: {
                      eventId: {
                        in: eventIds,
                      },
                    },
                  },
                  select: {
                    provider: true,
                  },
                  distinct: ["provider"],
                  orderBy: {
                    provider: "asc",
                  },
                })
              ).map(
                (payment) =>
                  payment.provider,
              ),
            ),
          );

    /*
     * PaymentMethod adalah enum schema.
     * Kita expose nilai yang memang digunakan pada
     * data payment di organization ini.
     */
    const paymentMethods =
      eventIds.length === 0
        ? []
        : Array.from(
            new Set(
              (
                await prisma.payment.findMany({
                  where: {
                    order: {
                      eventId: {
                        in: eventIds,
                      },
                    },
                    method: {
                      not: null,
                    },
                  },
                  select: {
                    method: true,
                  },
                  distinct: ["method"],
                  orderBy: {
                    method: "asc",
                  },
                })
              )
                .map(
                  (payment) =>
                    payment.method,
                )
                .filter(
                  (
                    method,
                  ): method is NonNullable<
                    typeof method
                  > => Boolean(method),
                ),
            ),
          );

    /*
     * Status transaction adalah String,
     * sehingga metadata status berasal dari data
     * transaction aktual, bukan daftar yang ditebak.
     */
    const transactionStatuses =
      eventIds.length === 0
        ? []
        : Array.from(
            new Set(
              (
                await prisma.transaction.findMany({
                  where: {
                    order: {
                      eventId: {
                        in: eventIds,
                      },
                    },
                  },
                  select: {
                    status: true,
                  },
                  distinct: ["status"],
                  orderBy: {
                    status: "asc",
                  },
                })
              ).map(
                (transaction) =>
                  transaction.status,
              ),
            ),
          );

    const paymentStatuses =
      eventIds.length === 0
        ? []
        : Array.from(
            new Set(
              (
                await prisma.payment.findMany({
                  where: {
                    order: {
                      eventId: {
                        in: eventIds,
                      },
                    },
                  },
                  select: {
                    status: true,
                  },
                  distinct: ["status"],
                  orderBy: {
                    status: "asc",
                  },
                })
              ).map(
                (payment) =>
                  payment.status,
              ),
            ),
          );

    return NextResponse.json({
      success: true,

      data: {
        events,
        providers,
        paymentMethods,
        transactionStatuses,
        paymentStatuses,
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/transactions/meta error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
