// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token dan password baru wajib diisi" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password minimal harus 8 karakter" },
        { status: 400 },
      );
    }

    // Cari user yang tokennya cocok dan belum kedaluwarsa
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token tidak valid atau sudah kadaluwarsa!" },
        { status: 400 },
      );
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password dan hapus token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      message: "Password berhasil diperbarui! Silakan login.",
    });
  } catch (error: unknown) {
    console.error("Error reset password:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui password" },
      { status: 500 },
    );
  }
}
