// src/app/api/users/[id]/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });
    }

    const { status } = await request.json(); // "ACTIVE" | "SUSPENDED"

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(
      {
        message: `Status pengguna diperbarui menjadi ${status}`,
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Gagal mengubah status" },
      { status: 500 },
    );
  }
}
