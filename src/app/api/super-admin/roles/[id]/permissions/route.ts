import { NextResponse } from "next/server";

import { authorizationErrorResponse } from "@/lib/auth/authorization";

import { getRoleById, updateRolePermissions } from "@/lib/admin/roles";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          message: "ID role tidak ditemukan.",
        },
        { status: 400 },
      );
    }

    const role = await getRoleById(id);

    return NextResponse.json(
      {
        success: true,
        data: {
          role: {
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
          },
          permissions: role.permissions,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          message: "ID role tidak ditemukan.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        {
          message: "Payload request tidak valid.",
        },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;

    if (!Array.isArray(payload.permissionIds)) {
      return NextResponse.json(
        {
          message: "permissionIds harus berupa array.",
        },
        { status: 400 },
      );
    }

    if (!payload.permissionIds.every((value) => typeof value === "string")) {
      return NextResponse.json(
        {
          message: "Semua permissionIds harus berupa string.",
        },
        { status: 400 },
      );
    }

    const role = await updateRolePermissions(id, {
      permissionIds: payload.permissionIds as string[],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Permission role berhasil diperbarui.",
        data: {
          id: role.id,
          name: role.name,
          permissions: role.permissions,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
