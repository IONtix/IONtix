// src/app/api/users/[id]/impersonate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(
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

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      );
    }

    // Tentukan URL tujuan berdasarkan role pengguna target
    const roleName = targetUser.role?.name || (targetUser as any).role;
    let redirectUrl = "/dashboard";
    if (roleName === "EO") redirectUrl = "/dashboard/events";
    if (roleName === "USER") redirectUrl = "/";

    return NextResponse.json({
      message: `Berhasil berganti peran sebagai ${targetUser.name || targetUser.email}`,
      redirectUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Gagal melakukan impersonasi" },
      { status: 500 },
    );
  }
}
