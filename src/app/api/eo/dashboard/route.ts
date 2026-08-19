import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  CheckInStatus,
  OrderStatus,
} from "@/generated/prisma/client";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import {
  requireEventAccess,
  requireOrganizationMembership,
} from "@/lib/auth/organization";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get("eventId");

    /*
     * SUPER_ADMIN:
     * - dapat melihat seluruh event platform
     * - dapat memfilter event tertentu
     *
     * User non-SUPER_ADMIN:
     * - wajib memiliki membership organisasi aktif
     * - hanya dapat melihat event dalam organisasinya
     */
    const membership =
      user.role === "SUPER_ADMIN"
        ? null
        : await requireOrganizationMembership();

    /*
     * Bila user memilih event tertentu, validasi ownership
     * secara eksplisit terlebih dahulu. Ini mencegah IDOR
     * ketika eventId milik organisasi lain dikirim melalui URL.
     */
    if (eventIdParam && eventIdParam !== "ALL") {
      await requireEventAccess(eventIdParam);
    }

    const eventWhere =
      eventIdParam && eventIdParam !== "ALL" ? { id: eventIdParam } : undefined;

    const organizationEventWhere = membership
      ? {
          organizationId: membership.organizationId,
          ...(eventIdParam && eventIdParam !== "ALL"
            ? { id: eventIdParam }
            : {}),
        }
      : undefined;

    /*
     * Event yang tersedia untuk dropdown.
     */
    const availableEvents = await prisma.event.findMany({
      where: membership !== null ? organizationEventWhere : eventWhere,
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    /*
     * Ambil event dalam scope yang sama dengan dropdown.
     * Untuk EO/member: organizationId adalah boundary utama.
     * Untuk SUPER_ADMIN: seluruh event diperbolehkan.
     */
    const scopedEvents = await prisma.event.findMany({
      where: membership !== null ? organizationEventWhere : eventWhere,
      select: {
        id: true,
        categories: {
          select: {
            id: true,
            capacity: true,
          },
        },
      },
    });

    /*
     * Bila eventId diminta tetapi tidak ditemukan dalam scope,
     * jangan mengembalikan dashboard kosong secara diam-diam.
     * requireEventAccess() di atas sudah memfilter authorization.
     * Kondisi ini terutama menjaga konsistensi ketika data berubah
     * antara dua query.
     */
    if (eventIdParam && eventIdParam !== "ALL" && scopedEvents.length === 0) {
      return NextResponse.json(
        {
          error: "Event tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const categoryIds = scopedEvents.flatMap((event) =>
      event.categories.map((category) => category.id),
    );

    const totalKapasitas = scopedEvents.reduce(
      (eventTotal, event) =>
        eventTotal +
        event.categories.reduce(
          (categoryTotal, category) => categoryTotal + category.capacity,
          0,
        ),
      0,
    );

    /*
     * Belum ada kategori/tiket pada event.
     * Kembalikan dashboard kosong secara valid.
     */
    if (categoryIds.length === 0) {
      return NextResponse.json(
        {
          metrics: {
            totalPendapatan: 0,
            persentaseKenaikan: 0,
            tiketTerjual: 0,
            totalKapasitas,
            pesertaCheckIn: 0,
            menungguCheckIn: 0,
            racepackDiambil: 0,
            racepackBelumDiambil: 0,
            saldoSiapCair: 0,
          },
          salesChart: [],
          recentTransactions: [],
          availableEvents,
        },
        { status: 200 },
      );
    }

    /*
     * Semua transaksi berikut dibatasi melalui categoryIds
     * yang berasal dari event dalam scope user.
     */
    const successTransactions = await prisma.transaction.findMany({
      where: {
        status: "SUCCESS",
        tickets: {
          some: {
            categoryId: {
              in: categoryIds,
            },
          },
        },
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
      },
    });

    const totalPendapatan = successTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    /*
     * ============================================================
     * CANONICAL OPERATIONAL METRICS
     * ============================================================
     *
     * Ticket sold:
     *   Ticket yang terhubung ke Order PAID.
     *
     * Check-in:
     *   CheckIn.status = CHECKED_IN.
     *
     * Racepack:
     *   Order.isClaimed menjadi source of truth.
     *
     * Semua query tetap berada di event/category scope
     * yang sudah lolos authorization di atas.
     */

    const eventIds = scopedEvents.map(
      (event) => event.id,
    );

    const paidTicketWhere = {
      categoryId: {
        in: categoryIds,
      },
      order: {
        status: OrderStatus.PAID,
      },
    };

    const [
      totalTiketTerjual,
      pesertaCheckIn,
      racepackDiambil,
      racepackBelumDiambil,
    ] = await Promise.all([
      prisma.ticket.count({
        where: paidTicketWhere,
      }),

      prisma.checkIn.count({
        where: {
          eventId: {
            in: eventIds,
          },
          status: CheckInStatus.CHECKED_IN,
        },
      }),

      prisma.ticket.count({
        where: {
          ...paidTicketWhere,
          order: {
            status: OrderStatus.PAID,
            isClaimed: true,
          },
        },
      }),

      prisma.ticket.count({
        where: {
          ...paidTicketWhere,
          order: {
            status: OrderStatus.PAID,
            isClaimed: false,
          },
        },
      }),
    ]);

    const menungguCheckIn = Math.max(
      0,
      totalTiketTerjual - pesertaCheckIn,
    );

    /*
     * Grafik penjualan 7 hari terakhir.
     */
    const salesChart: Array<{
      name: string;
      total: number;
    }> = [];

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dailyTotal = successTransactions
        .filter(
          (transaction) =>
            transaction.createdAt >= date && transaction.createdAt < nextDate,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      salesChart.push({
        name: date.toLocaleDateString("id-ID", {
          weekday: "short",
        }),
        total: dailyTotal,
      });
    }

    /*
     * Transaksi terbaru.
     * categoryIds sudah menjadi authorization boundary.
     */
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        tickets: {
          some: {
            categoryId: {
              in: categoryIds,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      include: {
        runner: {
          select: {
            name: true,
          },
        },
        tickets: {
          select: {
            category: {
              select: {
                name: true,
                event: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
          take: 1,
        },
      },
    });

    const formattedRecentTransactions = recentTransactions.map(
      (transaction) => {
        const firstTicket = transaction.tickets[0];

        return {
          id: transaction.id.slice(0, 8).toUpperCase(),
          name: transaction.runner?.name || "Pelari",
          category: `${firstTicket?.category?.event?.title || "Event"} - ${
            firstTicket?.category?.name || "Tiket"
          }`,
          amount: transaction.amount,
          status: transaction.status,
          date:
            new Date(transaction.createdAt).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }) + " WIB",
        };
      },
    );

    return NextResponse.json(
      {
        metrics: {
          totalPendapatan,
          persentaseKenaikan: 0,
          tiketTerjual: totalTiketTerjual,
          totalKapasitas,
          pesertaCheckIn,
          menungguCheckIn,
          racepackDiambil,
          racepackBelumDiambil,
          saldoSiapCair: totalPendapatan,
        },
        salesChart,
        recentTransactions: formattedRecentTransactions,
        availableEvents,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("EO dashboard error:", error);

    return authorizationErrorResponse(error);
  }
}
