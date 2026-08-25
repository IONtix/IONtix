// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

import {
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";

import {
  checkResetPasswordRateLimit,
} from "@/lib/security/reset-password-rate-limit";

export async function POST(req: Request) {
  try {
    const body =
      await req.json() as {
        token?: unknown;
        newPassword?: unknown;
      };

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    if (
      !token ||
      !newPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Token dan password baru wajib diisi",
        },
        { status: 400 },
      );
    }

    const passwordPolicy =
      validatePasswordPolicy(
        newPassword,
      );

    if (
      !passwordPolicy.valid
    ) {
      return NextResponse.json(
        {
          error:
            passwordPolicy.reason ??
            "Password tidak memenuhi kebijakan keamanan.",
        },
        { status: 400 },
      );
    }

    const rateLimitResult =
      await checkResetPasswordRateLimit({
        token,
        headers:
          req.headers,
      });

    if (
      !rateLimitResult.allowed
    ) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak percobaan reset password. Silakan coba lagi nanti.",
        },
        { status: 429 },
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
