import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requirePermission,
} from "@/lib/auth/authorization";

import { UserStatus } from "@/generated/prisma/client";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const actor = await requirePermission("users.manage");

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

    if (
      requestedStatus !== undefined &&
      !Object.values(UserStatus).includes(requestedStatus as UserStatus)
    ) {
      return NextResponse.json(
        {
          message: "Status pengguna tidak valid.",
        },
        { status: 400 },
      );
    }

    if (requestedStatus === UserStatus.DELETED && actor.id === id) {
      return NextResponse.json(
        {
          message: "Anda tidak dapat menandai akun sendiri sebagai DELETED.",
        },
        { status: 400 },
      );
    }

    /*
     * Mengubah role merupakan operasi RBAC,
     * sehingga users.manage saja belum cukup.
     */
    if (requestedRole !== undefined) {
      if (!actor.permissions.includes("roles.manage")) {
        return NextResponse.json(
          {
            message:
              'Permission "roles.manage" diperlukan untuk mengubah role pengguna.',
          },
          { status: 403 },
        );
      }

      /*
       * Jangan mengubah role akun sendiri melalui endpoint ini.
       * Perubahan privilege diri sendiri terlalu berisiko.
       */
      if (actor.id === id) {
        return NextResponse.json(
          {
            message:
              "Anda tidak dapat mengubah role akun Anda sendiri melalui endpoint ini.",
          },
          { status: 400 },
        );
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id,
      },
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
            isSystem: true,
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

    /*
     * Target SUPER_ADMIN / role perubahan privilege tinggi
     * hanya dapat dilakukan oleh platform Super Admin.
     *
     * roles.manage membuka RBAC umum, tetapi kita tetap
     * menjaga SUPER_ADMIN sebagai platform-level privilege.
     */
    let roleRecord:
      | {
          id: string;
          name: string;
          isSystem: boolean;
        }
      | undefined;

    if (requestedRole !== undefined) {
      roleRecord =
        (await prisma.role.findUnique({
          where: {
            name: requestedRole,
          },
          select: {
            id: true,
            name: true,
            isSystem: true,
          },
        })) ?? undefined;

      if (!roleRecord) {
        return NextResponse.json(
          {
            message: `Role "${requestedRole}" tidak ditemukan.`,
          },
          { status: 400 },
        );
      }

      if (roleRecord.name === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          {
            message:
              "Hanya Super Admin yang dapat memberikan role SUPER_ADMIN.",
          },
          { status: 403 },
        );
      }
    }

    /*
     * Tidak boleh menghapus / menurunkan privilege
     * Super Admin terakhir secara tidak sengaja.
     */
    if (
      targetUser.role?.name === "SUPER_ADMIN" &&
      requestedRole !== undefined &&
      requestedRole !== "SUPER_ADMIN"
    ) {
      const superAdminCount = await prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          isDeleted: false,
          role: {
            name: "SUPER_ADMIN",
          },
        },
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          {
            message:
              "Tidak dapat menurunkan role Super Admin terakhir di platform.",
          },
          { status: 409 },
        );
      }
    }

    /*
     * Tidak boleh membuat akun menjadi DELETED
     * jika target merupakan Super Admin terakhir.
     */
    if (
      requestedStatus === UserStatus.DELETED &&
      targetUser.role?.name === "SUPER_ADMIN"
    ) {
      const superAdminCount = await prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          isDeleted: false,
          role: {
            name: "SUPER_ADMIN",
          },
        },
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          {
            message:
              "Tidak dapat menonaktifkan Super Admin terakhir di platform.",
          },
          { status: 409 },
        );
      }
    }

    const data: {
      name?: string;
      status?: UserStatus;
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
      const status = requestedStatus as UserStatus;

      data.status = status;
      data.isDeleted = status === UserStatus.DELETED;
    }

    if (roleRecord) {
      data.role = {
        connect: {
          id: roleRecord.id,
        },
      };
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          message: "Tidak ada perubahan yang dikirim.",
        },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id,
        },
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

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "USER_UPDATE",
          module: "users",
          entityType: "User",
          entityId: user.id,
          beforeData: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            status: targetUser.status,
            isDeleted: targetUser.isDeleted,
            role: targetUser.role?.name ?? null,
          },
          afterData: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            status: user.status,
            isDeleted: user.isDeleted,
            role: user.role?.name ?? null,
          },
          metadata: {
            changedBy: actor.email,
            changedFields: Object.keys(data),
          },
        },
      });

      return user;
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
    const actor = await requirePermission("users.manage");

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
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        isDeleted: true,
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

    if (targetUser.isDeleted || targetUser.status === UserStatus.DELETED) {
      return NextResponse.json(
        {
          message: "Pengguna sudah tidak aktif.",
        },
        { status: 409 },
      );
    }

    /*
     * Jangan menghapus Super Admin terakhir.
     */
    if (targetUser.role?.name === "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          isDeleted: false,
          role: {
            name: "SUPER_ADMIN",
          },
        },
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          {
            message:
              "Tidak dapat menonaktifkan Super Admin terakhir di platform.",
          },
          { status: 409 },
        );
      }
    }

    const deletedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id,
        },
        data: {
          isDeleted: true,
          status: UserStatus.DELETED,
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

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "USER_DELETE",
          module: "users",
          entityType: "User",
          entityId: user.id,
          beforeData: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            status: targetUser.status,
            isDeleted: targetUser.isDeleted,
            role: targetUser.role?.name ?? null,
          },
          afterData: {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status,
            isDeleted: user.isDeleted,
          },
          metadata: {
            deletedBy: actor.email,
          },
        },
      });

      return user;
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
