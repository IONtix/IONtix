import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireSuperAdmin,
} from "@/lib/auth/authorization";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

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
            "Anda tidak dapat melakukan impersonation terhadap akun Anda sendiri.",
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

    if (targetUser.isDeleted || targetUser.status !== "ACTIVE") {
      return NextResponse.json(
        {
          message: "Impersonation hanya dapat dilakukan terhadap akun ACTIVE.",
        },
        { status: 403 },
      );
    }

    if (targetUser.role?.name === "SUPER_ADMIN") {
      return NextResponse.json(
        {
          message: "Impersonation terhadap akun SUPER_ADMIN tidak diizinkan.",
        },
        { status: 403 },
      );
    }

    const roleName = targetUser.role?.name ?? "PESERTA";

    let redirectUrl = "/";

    if (roleName === "EO") {
      redirectUrl = "/dashboard/events";
    } else if (roleName === "USER" || roleName === "PESERTA") {
      redirectUrl = "/";
    }

    await prisma.adminAction.create({
      data: {
        actorUserId: actor.id,
        action: "IMPERSONATION_REQUESTED",
        targetType: "User",
        targetId: targetUser.id,
        reason: "Super Admin meminta impersonation terhadap user.",
        metadata: {
          targetEmail: targetUser.email,
          targetRole: roleName,
          redirectUrl,
        },
      },
    });

    return NextResponse.json(
      {
        message:
          "Permintaan impersonation telah dicatat. Session impersonation belum diaktifkan.",
        redirectUrl,
        target: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: roleName,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
