import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    // Cari tiket (Order) berdasarkan email
    const orders = await prisma.order.findMany({
      where: { email: email },
      include: {
        ticketCategory: {
          include: {
            event: true, // Ambil data kategori dan eventnya
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "Tiket tidak ditemukan untuk email ini." },
        { status: 404 },
      );
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem" },
      { status: 500 },
    );
  }
}
