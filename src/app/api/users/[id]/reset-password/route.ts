import { NextResponse } from "next/server";
import crypto from "node:crypto";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireSuperAdmin,
} from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

export async function POST(_request: Request, { params }: RouteContext) {
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
          message:
            "Gunakan alur pemulihan password pribadi untuk akun Anda sendiri.",
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

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.deleteMany({
      where: {
        email: targetUser.email,
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        email: targetUser.email,
        token,
        expires,
      },
    });

    await prisma.adminAction.create({
      data: {
        actorUserId: actor.id,
        action: "PASSWORD_RESET_REQUESTED",
        targetType: "User",
        targetId: targetUser.id,
        reason: "Permintaan reset password dibuat oleh Super Admin.",
        metadata: {
          targetEmail: targetUser.email,
          expiresAt: expires.toISOString(),
        },
      },
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
