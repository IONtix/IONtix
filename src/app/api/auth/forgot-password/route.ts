// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import {
  isResetPasswordDevExposureEnabled,
} from "@/lib/auth/reset-password-mode";
import {
  checkForgotPasswordRateLimit,
} from "@/lib/security/forgot-password-rate-limit";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const cleanEmail =
      email.trim().toLowerCase();

    const rateLimitResult =
      await checkForgotPasswordRateLimit({
        email: cleanEmail,
        headers: req.headers,
      });

    if (
      !rateLimitResult.allowed
    ) {
      return NextResponse.json(
        {
          message:
            "Jika email Anda terdaftar, instruksi reset password telah dikirim.",
        },
        { status: 429 },
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: cleanEmail,
        },
      });

    if (!user) {
      // Keamanan: Tetap berikan respon sukses agar peretas tidak bisa tebak email
      return NextResponse.json({
        message:
          "Jika email Anda terdaftar, instruksi reset password telah dikirim.",
      });
    }

    // Buat token rahasia acak & masa berlaku 1 jam
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 Jam dari sekarang

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Buat link reset password lengkap
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;


    const response: {
      message: string;
      resetToken?: string;
      resetUrl?: string;
    } = {
      message:
        "Instruksi reset password berhasil dibuat!",
    };

    /*
     * Token hanya boleh diekspos secara eksplisit pada
     * environment development yang memang sedang digunakan
     * untuk debugging lokal.
     *
     * Production selalu menolak exposure ini.
     */
    if (
      isResetPasswordDevExposureEnabled()
    ) {
      response.resetToken =
        resetToken;
      response.resetUrl =
        resetUrl;
    }

    return NextResponse.json(
      response,
    );
  } catch (error: unknown) {
    console.error("Error forgot password:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem" },
      { status: 500 },
    );
  }
}
