// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// ==============================================================
// 1. API UNTUK MENGEDIT USER (PUT) - FAILSAFE & ENTERPRISE
// ==============================================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { message: "ID pengguna tidak ditemukan" },
        { status: 400 },
      );
    }

    // Cek Akses Super Admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Tidak memiliki hak akses" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name, role } = body; // role bisa "USER", "EO", "SUPER_ADMIN"

    // Mapping variasi nama role agar selalu cocok dengan database
    let normalizedRoleName = role;
    if (role === "EO") normalizedRoleName = "EO";

    // Build payload update dasar
    const updateData: Prisma.UserUpdateInput = {
      name,
    };

    // Coba tangani relasi Role
    try {
      // 1. Cari role di database (case-insensitive search)
      let roleRecord = await prisma.role.findFirst({
        where: {
          name: {
            equals: normalizedRoleName,
            mode: "insensitive",
          },
        },
      });

      // 2. Jika tidak ditemukan, cari alternatif nama (misal "Mitra EO")
      if (!roleRecord && normalizedRoleName === "EO") {
        roleRecord = await prisma.role.findFirst({
          where: { name: { contains: "EO", mode: "insensitive" } },
        });
      }

      // 3. Jika masih tidak ada, buatkan role baru secara otomatis
      if (!roleRecord) {
        roleRecord = await prisma.role.create({
          data: { name: normalizedRoleName },
        });
      }

      // 4. Hubungkan role ke user
      updateData.role = {
        connect: { id: roleRecord.id },
      };
    } catch (roleError: unknown) {
      console.warn("Gagal menghubungkan role:", roleError);
      return NextResponse.json(
        { message: "Role pengguna tidak dapat ditetapkan." },
        { status: 400 },
      );
    }

    // Eksekusi update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    });

    return NextResponse.json(
      { message: "Pengguna berhasil diperbarui", user: updatedUser },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message :
          "Terjadi kesalahan pada server saat memperbarui data.",
      },
      { status: 500 },
    );
  }
}

// ==============================================================
// 2. API UNTUK MENGHAPUS / DEACTIVATE USER (DELETE)
// ==============================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { message: "ID pengguna tidak ditemukan" },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Tidak memiliki hak akses" },
        { status: 401 },
      );
    }

    if (session.user.id === id) {
      return NextResponse.json(
        { message: "Anda tidak dapat menonaktifkan akun Anda sendiri!" },
        { status: 400 },
      );
    }

    // Eksekusi hapus
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Pengguna berhasil dihapus" },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error deleting user:", error);

    if (error instanceof Object && "code" in error && error.code === "P2003") {
      return NextResponse.json(
        {
          message:
            "User ini tidak dapat dihapus karena memiliki data transaksi/event terikat.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Gagal menghapus pengguna" },
      { status: 500 },
    );
  }
}
