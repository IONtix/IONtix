import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      ticketCategory: {
        include: {
          event: true,
        },
      },
      addonOrders: {
        include: {
          addon: true, // <-- BARU: Mengambil detail Add-on (nama, tipe, harga)
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan!" },
      { status: 404 },
    );
  }

  return NextResponse.json(order);
}
