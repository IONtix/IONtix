// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 1. Cek Autentikasi (Hanya Super Admin yang boleh membuat user)
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Akses ditolak. Hanya Super Admin." },
        { status: 401 },
      );
    }

    // 2. Ambil data dari body request
    const body = await req.json();
    const { name, email, password, role, phone, status } = body;

    // 3. Validasi dasar
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Nama, Email, dan Password wajib diisi!" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password minimal 6 karakter!" },
        { status: 400 },
      );
    }

    // 4. Cek apakah email sudah terdaftar di database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email ini sudah digunakan!" },
        { status: 400 },
      );
    }

    // 5. Enkripsi (Hash) Password menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Simpan data ke Database melalui Prisma
    // CATATAN: Jika 'phone' atau 'status' belum ada di schema.prisma Anda, hapus atau komen baris tersebut
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role ? { connectOrCreate: { where: { name: role }, create: { name: role, isSystem: false } } } : undefined,
        phone: phone || undefined,
        status: status || undefined,
      },
    });

    return NextResponse.json(
      { message: "Pengguna berhasil ditambahkan!", user: newUser },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("API Create User Error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
