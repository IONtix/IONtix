import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Sesuaikan jika lokasi file prisma Anda berbeda (misal: @/lib/db)
import bcrypt from "bcryptjs";
import { ROLE_NAMES } from "@/lib/admin/role-policy";
import {
  checkRegistrationRateLimit,
} from "@/lib/security/registration-rate-limit";

import {
  validatePasswordPolicy,
} from "@/lib/auth/password-policy";

export async function POST(req: Request) {
  try {
    const { name, email, phone, password } = await req.json();

    // 1. Validasi input dasar
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        {
          message:
            "Nama, email, dan kata sandi wajib diisi.",
        },
        { status: 400 },
      );
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedName =
      name.trim();

    const normalizedPhone =
      typeof phone === "string"
        ? phone.trim() || null
        : null;

    const passwordPolicy =
      validatePasswordPolicy(
        password,
      );

    if (
      !passwordPolicy.valid
    ) {
      return NextResponse.json(
        {
          message:
            passwordPolicy.reason ??
            "Kata sandi tidak memenuhi kebijakan keamanan.",
        },
        { status: 400 },
      );
    }

    const rateLimitResult =
      await checkRegistrationRateLimit({
        headers: req.headers,
      });

    if (
      !rateLimitResult.allowed
    ) {
      return NextResponse.json(
        {
          message:
            "Terlalu banyak percobaan registrasi. Silakan coba lagi nanti.",
        },
        { status: 429 },
      );
    }

    // 2. Cek apakah email sudah pernah terdaftar di database
    const existingUser =
      await prisma.user.findUnique({
        where: {
          email:
            normalizedEmail,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "Email ini sudah terdaftar. Silakan gunakan email lain atau login.",
        },
        { status: 400 },
      );
    }

    // 3. Enkripsi password demi keamanan
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Simpan akun EO baru ke database
    const newUser = await prisma.user.create({
      data: {
        name:
          normalizedName,
        email:
          normalizedEmail,
        phone:
          normalizedPhone,
        password:
          hashedPassword,
        role: {
          connect: {
            name:
              ROLE_NAMES.PARTICIPANT,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message:
          "Registrasi peserta berhasil!",
        userId:
          newUser.id,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    /*
     * Concurrent registration dengan email
     * yang sama dapat sama-sama lolos
     * findUnique() sebelum salah satunya
     * memenangkan unique constraint database.
     *
     * Perlakukan P2002 sebagai duplicate
     * registration, bukan server error.
     */
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message:
            "Email ini sudah terdaftar. Silakan gunakan email lain atau login.",
        },
        { status: 400 },
      );
    }

    console.error(
      "Error pada Registrasi:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Terjadi kesalahan internal pada server.",
      },
      { status: 500 },
    );
  }
}
