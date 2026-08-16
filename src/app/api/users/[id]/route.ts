import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireSuperAdmin,
} from "@/lib/auth/authorization";

const ALLOWED_ROLES = new Set(["SUPER_ADMIN", "EO", "PESERTA", "USER"]);

const ALLOWED_STATUSES = new Set(["ACTIVE", "SUSPENDED", "PENDING", "DELETED"]);

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const actor = await requireSuperAdmin();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          message: "ID pengguna tidak ditemukan.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : undefined;

    const requestedRole =
      typeof body.role === "string"
        ? body.role.trim().toUpperCase()
        : undefined;

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : undefined;

    if (name !== undefined && name.length === 0) {
      return NextResponse.json(
        {
          message: "Nama pengguna tidak boleh kosong.",
        },
        { status: 400 },
      );
    }

    if (requestedRole !== undefined && !ALLOWED_ROLES.has(requestedRole)) {
      return NextResponse.json(
        {
          message: "Role pengguna tidak valid.",
        },
        { status: 400 },
      );
    }

    if (
      requestedStatus !== undefined &&
      !ALLOWED_STATUSES.has(requestedStatus)
    ) {
      return NextResponse.json(
        {
          message: "Status pengguna tidak valid.",
        },
        { status: 400 },
      );
    }

    if (requestedStatus === "DELETED" && actor.id === id) {
      return NextResponse.json(
        {
          message: "Anda tidak dapat menandai akun sendiri sebagai DELETED.",
        },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        isDeleted: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          message: "Pengguna tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const data: {
      name?: string;
      status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "DELETED";
      isDeleted?: boolean;
      role?: {
        connect: {
          id: string;
        };
      };
    } = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (requestedStatus !== undefined) {
      data.status = requestedStatus as
        | "ACTIVE"
        | "SUSPENDED"
        | "PENDING"
        | "DELETED";

      data.isDeleted = requestedStatus === "DELETED";
    }

    if (requestedRole !== undefined) {
      const roleRecord = await prisma.role.findUnique({
        where: {
          name: requestedRole,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!roleRecord) {
        return NextResponse.json(
          {
            message: "Role belum dikonfigurasi.",
          },
          { status: 400 },
        );
      }

      data.role = {
        connect: {
          id: roleRecord.id,
        },
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
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
        message: "Pengguna berhasil diperbarui.",
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const actor = await requireSuperAdmin();

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          message: "ID pengguna tidak ditemukan.",
        },
        { status: 400 },
      );
    }

    if (actor.id === id) {
      return NextResponse.json(
        {
          message: "Anda tidak dapat menonaktifkan akun Anda sendiri.",
        },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        isDeleted: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          message: "Pengguna tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    if (targetUser.isDeleted || targetUser.status === "DELETED") {
      return NextResponse.json(
        {
          message: "Pengguna sudah tidak aktif.",
        },
        { status: 409 },
      );
    }

    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        status: "DELETED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        isDeleted: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Pengguna berhasil dinonaktifkan.",
        user: deletedUser,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
