// src/app/api/users/[id]/reset-password/route.ts
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

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      );
    }

    // Simulasi trigger pengiriman email reset password
    // Di sini Anda bisa mengintegrasikan layanan email seperti Resend, SendGrid, atau Nodemailer.

    return NextResponse.json({
      message: `Link reset password berhasil dikirim ke ${targetUser.email}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Gagal mengirimi reset password" },
      { status: 500 },
    );
  }
}
