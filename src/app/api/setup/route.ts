import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // 1. Kita enkripsi password "admin123"
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // 2. Kita buat akun EO baru (atau abaikan jika email sudah ada)
    const user = await prisma.user.upsert({
      where: { email: "eo@iontix.com" },
      update: {},
      create: {
        name: "Admin IONtix",
        email: "eo@iontix.com",
        password: hashedPassword,
        role: { connect: { name: "EO" } },
      },
    });

    return NextResponse.json({
      message: "✅ AKUN EO BERHASIL DIBUAT!",
      email: user.email,
      password: "admin123",
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 });
  }
}
