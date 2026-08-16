import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireSuperAdmin,
} from "@/lib/auth/authorization";

const ALLOWED_ROLES = new Set(["SUPER_ADMIN", "EO", "PESERTA", "USER"]);

const ALLOWED_STATUSES = new Set(["ACTIVE", "SUSPENDED", "PENDING", "DELETED"]);

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();

    const body = await req.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    const role =
      typeof body.role === "string"
        ? body.role.trim().toUpperCase()
        : "PESERTA";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : undefined;

    const status =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : "ACTIVE";

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          message: "Nama, Email, dan Password wajib diisi!",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          message: "Password minimal 8 karakter!",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        {
          message: "Role pengguna tidak valid.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        {
          message: "Status pengguna tidak valid.",
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message: "Email ini sudah digunakan!",
        },
        { status: 409 },
      );
    }

    const roleRecord = await prisma.role.findUnique({
      where: { name: role },
      select: {
        id: true,
        name: true,
      },
    });

    if (!roleRecord) {
      return NextResponse.json(
        {
          message:
            "Role belum dikonfigurasi. Buat role terlebih dahulu melalui seed atau administrasi sistem.",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        status: status as "ACTIVE" | "SUSPENDED" | "PENDING" | "DELETED",
        role: {
          connect: {
            id: roleRecord.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        isDeleted: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Pengguna berhasil ditambahkan!",
        user: newUser,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
