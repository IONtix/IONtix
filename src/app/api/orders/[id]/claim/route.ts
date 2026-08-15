import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    return NextResponse.json(
      { error: "Tiket tidak ditemukan!" },
      { status: 404 },
    );
  }

  if (order.isClaimed) {
    return NextResponse.json(
      { error: "Racepack sudah pernah diambil sebelumnya!" },
      { status: 400 },
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { isClaimed: true },
  });

  return NextResponse.json(updatedOrder);
}
