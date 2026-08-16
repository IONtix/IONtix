import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireSuperAdmin,
} from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const ALLOWED_STATUS = new Set(["ACTIVE", "SUSPENDED"]);

export async function PATCH(request: Request, { params }: RouteContext) {
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
            "Anda tidak dapat mengubah status akun sendiri dari endpoint ini.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const status =
      typeof body.status === "string" ? body.status.trim().toUpperCase() : "";

    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json(
        {
          message: "Status tidak valid. Gunakan ACTIVE atau SUSPENDED.",
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
        role: {
          select: {
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
            "Pengguna sudah berstatus DELETED dan tidak dapat diaktifkan melalui endpoint ini.",
        },
        { status: 409 },
      );
    }

    if (targetUser.role?.name === "SUPER_ADMIN" && status === "SUSPENDED") {
      return NextResponse.json(
        {
          message:
            "Akun SUPER_ADMIN tidak dapat ditangguhkan melalui endpoint ini.",
        },
        { status: 403 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: status as "ACTIVE" | "SUSPENDED",
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

    await prisma.adminAction.create({
      data: {
        actorUserId: actor.id,
        action: status === "ACTIVE" ? "USER_ACTIVATED" : "USER_SUSPENDED",
        targetType: "User",
        targetId: targetUser.id,
        reason:
          status === "ACTIVE"
            ? "Akun diaktifkan oleh Super Admin."
            : "Akun ditangguhkan oleh Super Admin.",
        metadata: {
          previousStatus: targetUser.status,
          newStatus: status,
          targetEmail: targetUser.email,
        },
      },
    });

    return NextResponse.json(
      {
        message: `Status pengguna diperbarui menjadi ${status}.`,
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
