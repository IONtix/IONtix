import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requirePermission,
} from "@/lib/auth/authorization";

import { UserStatus } from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const ALLOWED_STATUS = new Set<UserStatus>([
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
]);

export async function PATCH(request: Request, { params }: RouteContext) {
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

    /*
     * Jangan izinkan admin mengubah status
     * akun sendiri melalui endpoint ini.
     */
    if (actor.id === id) {
      return NextResponse.json(
        {
          message:
            "Anda tidak dapat mengubah status akun sendiri dari endpoint ini.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const requestedStatus =
      typeof body.status === "string" ? body.status.trim().toUpperCase() : "";

    if (!Object.values(UserStatus).includes(requestedStatus as UserStatus)) {
      return NextResponse.json(
        {
          message: "Status pengguna tidak valid.",
        },
        { status: 400 },
      );
    }

    const status = requestedStatus as UserStatus;

    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json(
        {
          message: "Status tidak valid. Gunakan ACTIVE atau SUSPENDED.",
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

    /*
     * User yang sudah DELETED tidak dapat
     * diaktifkan kembali melalui endpoint ini.
     * Pemulihan akun akan menjadi workflow tersendiri.
     */
    if (targetUser.isDeleted || targetUser.status === UserStatus.DELETED) {
      return NextResponse.json(
        {
          message:
            "Pengguna sudah berstatus DELETED dan tidak dapat diubah melalui endpoint ini.",
        },
        { status: 409 },
      );
    }

    /*
     * Super Admin tidak boleh ditangguhkan
     * melalui endpoint status biasa.
     *
     * Perubahan privilege platform-level akan
     * kita tangani melalui security workflow
     * khusus nantinya.
     */
    if (
      targetUser.role?.name === "SUPER_ADMIN" &&
      status === UserStatus.SUSPENDED
    ) {
      return NextResponse.json(
        {
          message:
            "Akun SUPER_ADMIN tidak dapat ditangguhkan melalui endpoint ini.",
        },
        { status: 403 },
      );
    }

    /*
     * Tidak perlu melakukan UPDATE bila status
     * memang sudah sama.
     */
    if (targetUser.status === status) {
      const currentUser = await prisma.user.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          isDeleted: true,
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
          message: `Status pengguna sudah ${status}.`,
          user: currentUser,
        },
        { status: 200 },
      );
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id,
        },
        data: {
          status,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          isDeleted: true,
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
          action:
            status === UserStatus.ACTIVE ? "USER_ACTIVATED" : "USER_SUSPENDED",
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
            role: user.role?.name ?? null,
          },
          metadata: {
            changedBy: actor.email,
            previousStatus: targetUser.status,
            newStatus: status,
          },
        },
      });

      return user;
    });

    return NextResponse.json(
      {
        message:
          status === UserStatus.ACTIVE
            ? "Pengguna berhasil diaktifkan."
            : "Pengguna berhasil ditangguhkan.",
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
