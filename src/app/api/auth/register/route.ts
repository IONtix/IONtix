import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Sesuaikan jika lokasi file prisma Anda berbeda (misal: @/lib/db)
import bcrypt from "bcryptjs";
import { ROLE_NAMES } from "@/lib/admin/role-policy";

export async function POST(req: Request) {
  try {
    const { name, email, phone, password } = await req.json();

    // 1. Validasi input dasar
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Nama, email, dan kata sandi wajib diisi." },
        { status: 400 },
      );
    }

    // 2. Cek apakah email sudah pernah terdaftar di database
    const existingUser = await prisma.user.findUnique({
      where: { email },
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
        name,
        email,
        phone,
        password: hashedPassword,
        role: { connect: { name: ROLE_NAMES.PARTICIPANT } },
      },
    });

    return NextResponse.json(
      { message: "Registrasi peserta berhasil!", userId: newUser.id },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Error pada Registrasi:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal pada server." },
      { status: 500 },
    );
  }
}
