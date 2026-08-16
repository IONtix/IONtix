import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: unknown;
    };

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        {
          error: "Email wajib diisi",
        },
        { status: 400 },
      );
    }

    /*
     * Endpoint ini memang ditujukan untuk fitur publik
     * "Cek Tiket". Karena itu response dibatasi hanya
     * informasi yang diperlukan untuk menemukan tiket.
     *
     * Jangan mengembalikan password, transaction object
     * lengkap, atau relasi database yang tidak dibutuhkan.
     */
    const orders = await prisma.order.findMany({
      where: {
        email,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        jerseySize: true,
        isClaimed: true,
        approvalStatus: true,
        createdAt: true,
        ticketCategory: {
          select: {
            id: true,
            name: true,
            event: {
              select: {
                id: true,
                title: true,
                date: true,
                endDate: true,
                location: true,
                isPublished: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    /*
     * Jangan mengembalikan order yang tidak lagi terhubung
     * ke event aktif/published ke endpoint publik.
     */
    const visibleOrders = orders.filter((order) => {
      const event = order.ticketCategory?.event;

      return Boolean(
        event && event.isPublished && event.status === "PUBLISHED",
      );
    });

    if (visibleOrders.length === 0) {
      return NextResponse.json(
        {
          error: "Tiket tidak ditemukan untuk email ini.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        orders: visibleOrders,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("POST /api/cek-tiket error:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan sistem",
      },
      { status: 500 },
    );
  }
}
