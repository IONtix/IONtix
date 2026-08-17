import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requirePermission,
} from "@/lib/auth/authorization";

import { UserStatus } from "@/generated/prisma/client";

const CREATEABLE_STATUSES = new Set<UserStatus>([
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
  UserStatus.PENDING,
]);

export async function POST(req: Request) {
  try {
    const actor = await requirePermission("users.manage");

    const body = await req.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    const roleName =
      typeof body.role === "string"
        ? body.role.trim().toUpperCase()
        : "PESERTA";

    const phone = typeof body.phone === "string" ? body.phone.trim() : null;

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : UserStatus.ACTIVE;

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

    if (!Object.values(UserStatus).includes(requestedStatus as UserStatus)) {
      return NextResponse.json(
        {
          message: "Status pengguna tidak valid.",
        },
        { status: 400 },
      );
    }

    const status = requestedStatus as UserStatus;

    if (!CREATEABLE_STATUSES.has(status)) {
      return NextResponse.json(
        {
          message: "User baru tidak dapat dibuat dengan status DELETED.",
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message: "Email ini sudah digunakan!",
        },
        { status: 409 },
      );
    }

    /*
     * Role sekarang bersumber dari database.
     * Tidak ada lagi hard-coded ALLOWED_ROLES.
     */
    const roleRecord = await prisma.role.findUnique({
      where: {
        name: roleName,
      },
      select: {
        id: true,
        name: true,
        isSystem: true,
      },
    });

    if (!roleRecord) {
      return NextResponse.json(
        {
          message: `Role "${roleName}" tidak ditemukan.`,
        },
        { status: 400 },
      );
    }

    /*
     * SUPER_ADMIN adalah privilege platform-level.
     * Membuat user dengan role SUPER_ADMIN
     * membutuhkan roles.manage.
     */
    if (
      roleRecord.name === "SUPER_ADMIN" &&
      actor.role !== "SUPER_ADMIN" &&
      !actor.permissions.includes("roles.manage")
    ) {
      return NextResponse.json(
        {
          message:
            "Permission roles.manage diperlukan untuk membuat user SUPER_ADMIN.",
        },
        { status: 403 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    /*
     * User + audit log dibuat dalam satu
     * database transaction.
     */
    const createdUser = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          status,
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

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "USER_CREATE",
          module: "users",
          entityType: "User",
          entityId: newUser.id,
          afterData: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            status: newUser.status,
            role: newUser.role?.name ?? null,
          },
          metadata: {
            createdBy: actor.email,
            assignedRole: roleRecord.name,
          },
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Pengguna berhasil ditambahkan!",
        user: createdUser,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
