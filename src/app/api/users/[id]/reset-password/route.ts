import { NextResponse } from "next/server";
import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requirePermission,
} from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

export async function POST(_request: Request, { params }: RouteContext) {
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
          message:
            "Gunakan alur pemulihan password pribadi untuk akun Anda sendiri.",
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

    if (targetUser.isDeleted || targetUser.status === "DELETED") {
      return NextResponse.json(
        {
          message:
            "Akun yang sudah DELETED tidak dapat dibuatkan reset password.",
        },
        { status: 409 },
      );
    }

    if (targetUser.status !== "ACTIVE") {
      return NextResponse.json(
        {
          message: "Reset password hanya dapat dilakukan untuk akun ACTIVE.",
        },
        { status: 409 },
      );
    }

    /*
     * Reset password untuk SUPER_ADMIN hanya boleh
     * dilakukan oleh SUPER_ADMIN platform.
     */
    if (
      targetUser.role?.name === "SUPER_ADMIN" &&
      actor.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          message:
            "Hanya Super Admin yang dapat melakukan reset password akun SUPER_ADMIN.",
        },
        { status: 403 },
      );
    }

    const token = crypto.randomBytes(32).toString("hex");

    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.$transaction(async (tx) => {
      /*
       * Satu user/email hanya boleh memiliki
       * satu active reset token.
       */
      await tx.passwordResetToken.deleteMany({
        where: {
          email: targetUser.email,
        },
      });

      await tx.passwordResetToken.create({
        data: {
          email: targetUser.email,
          token,
          expires,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "PASSWORD_RESET_REQUESTED",
          module: "security",
          entityType: "User",
          entityId: targetUser.id,
          metadata: {
            targetEmail: targetUser.email,
            targetName: targetUser.name,
            targetRole: targetUser.role?.name ?? null,
            expiresAt: expires.toISOString(),
            initiatedBy: actor.email,
          },
        },
      });
    });

    return NextResponse.json(
      {
        message:
          "Permintaan reset password berhasil dibuat. Pengiriman email belum diaktifkan pada environment ini.",
        expiresAt: expires.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
