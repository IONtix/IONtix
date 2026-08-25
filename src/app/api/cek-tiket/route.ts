import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  checkTicketLookupRateLimit,
} from "@/lib/security/ticket-lookup-rate-limit";

export async function POST(
  req: Request,
) {
  try {
    const body =
      (await req.json()) as {
        email?: unknown;
      };

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          error: "Email wajib diisi",
        },
        { status: 400 },
      );
    }

    const rateLimitResult =
      await checkTicketLookupRateLimit({
        email,
        headers: req.headers,
      });

    if (
      !rateLimitResult.allowed
    ) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak permintaan. Silakan coba lagi nanti.",
        },
        { status: 429 },
      );
    }

    const orders =
      await prisma.order.findMany({
        where: {
          email,
          status: "PAID",
          tickets: {
            some: {
              status: "ACTIVE",
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          jerseySize: true,

          ticketCategory: {
            select: {
              name: true,

              event: {
                select: {
                  title: true,
                  isPublished: true,
                  status: true,
                },
              },
            },
          },

          tickets: {
            where: {
              status: "ACTIVE",
            },
            select: {
              id: true,
              ticketNumber: true,
              status: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const visibleOrders =
      orders.filter((order) => {
        const event =
          order.ticketCategory?.event;

        return Boolean(
          event &&
            event.isPublished &&
            event.status === "PUBLISHED",
        );
      });

    if (visibleOrders.length === 0) {
      return NextResponse.json(
        {
          error:
            "Tiket aktif tidak ditemukan untuk email ini.",
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
    console.error(
      "POST /api/cek-tiket error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan sistem",
      },
      { status: 500 },
    );
  }
}
