import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    const eoId = session.user.id;
    if (!eoId) {
      return NextResponse.json(
        { error: "ID EO tidak ditemukan." },
        { status: 400 },
      );
    }

    // 1. Ambil Parameter eventId dari URL Query
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get("eventId");

    // 2. Ambil daftar semua event milik EO ini untuk Dropdown Menu
    const availableEvents = await prisma.event.findMany({
      where: { eoId: eoId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });

    // 3. Tentukan filter berdasarkan pilihan dropdown
    const eventWhereClause =
      eventIdParam && eventIdParam !== "ALL"
        ? { eoId: eoId, id: eventIdParam } // Jika pilih 1 event
        : { eoId: eoId }; // Jika pilih "Semua Event"

    // 4. Ambil Event & Kategori berdasarkan filter
    const eoEvents = await prisma.event.findMany({
      where: eventWhereClause,
      select: {
        id: true,
        categories: {
          select: { id: true, capacity: true },
        },
      },
    });

    const categoryIds = eoEvents.flatMap((event) =>
      event.categories.map((cat) => cat.id),
    );

    const totalKapasitas = eoEvents.reduce((acc, event) => {
      return (
        acc +
        event.categories.reduce(
          (catAcc, cat) => catAcc + (cat.capacity || 0),
          0,
        )
      );
    }, 0);

    // 5. Ambil Transaksi BERHASIL
    const successTransactions = await prisma.transaction.findMany({
      where: {
        status: "SUCCESS",
        tickets: { some: { categoryId: { in: categoryIds } } },
      },
      select: { id: true, amount: true, createdAt: true },
    });

    const totalPendapatan = successTransactions.reduce(
      (sum, trx) => sum + trx.amount,
      0,
    );

    // 6. Hitung Tiket & Check-In
    const totalTiketTerjual = await prisma.ticket.count({
      where: { categoryId: { in: categoryIds } },
    });

    const pesertaCheckIn = await prisma.ticket.count({
      where: { categoryId: { in: categoryIds }, isScanned: true },
    });

    const menungguCheckIn = Math.max(0, totalTiketTerjual - pesertaCheckIn);

    // 7. Kalkulasi Grafik 7 Hari Terakhir
    const salesChart = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dailyTotal = successTransactions
        .filter((trx) => trx.createdAt >= date && trx.createdAt < nextDate)
        .reduce((sum, trx) => sum + trx.amount, 0);

      salesChart.push({
        name: date.toLocaleDateString("id-ID", { weekday: "short" }),
        total: dailyTotal,
      });
    }

    // 8. Transaksi Terbaru
    const recentTransactions = await prisma.transaction.findMany({
      where: { tickets: { some: { categoryId: { in: categoryIds } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        runner: { select: { name: true } },
        tickets: {
          select: {
            category: {
              select: {
                name: true,
                event: { select: { title: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    const formattedRecentTransactions = recentTransactions.map((trx) => {
      const firstTicket = trx.tickets[0];
      return {
        id: trx.id.slice(0, 8).toUpperCase(),
        name: trx.runner?.name || "Pelari",
        category: `${firstTicket?.category?.event?.title || "Event"} - ${firstTicket?.category?.name || "Tiket"}`,
        amount: trx.amount,
        status: trx.status,
        date:
          new Date(trx.createdAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB",
      };
    });

    return NextResponse.json(
      {
        metrics: {
          totalPendapatan,
          persentaseKenaikan: 0,
          tiketTerjual: totalTiketTerjual,
          totalKapasitas: totalKapasitas === 0 ? 100 : totalKapasitas,
          pesertaCheckIn,
          menungguCheckIn,
          saldoSiapCair: totalPendapatan,
        },
        salesChart,
        recentTransactions: formattedRecentTransactions,
        availableEvents, // <-- DIKIRIM KE FRONTEND UNTUK DROPDOWN
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("EO dashboard error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data" },
      { status: 500 },
    );
  }
}
