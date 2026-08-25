import { NextResponse } from "next/server";

import { authorizationErrorResponse } from "@/lib/auth/authorization";

import { deleteRole, getRoleById, updateRole } from "@/lib/admin/roles";

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
        data: role,
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

    const input: {
      name?: string;
      description?: string | null;
      permissionIds?: string[];
    } = {};

    if (payload.name !== undefined) {
      if (typeof payload.name !== "string") {
        return NextResponse.json(
          {
            message: "Nama role harus berupa string.",
          },
          { status: 400 },
        );
      }

      input.name = payload.name;
    }

    if (payload.description !== undefined) {
      if (
        payload.description !== null &&
        typeof payload.description !== "string"
      ) {
        return NextResponse.json(
          {
            message: "Deskripsi role harus berupa string atau null.",
          },
          { status: 400 },
        );
      }

      input.description = payload.description;
    }

    if (payload.permissionIds !== undefined) {
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

      input.permissionIds = payload.permissionIds as string[];
    }

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        {
          message: "Tidak ada perubahan yang dikirim.",
        },
        { status: 400 },
      );
    }

    const role = await updateRole(id, input);

    return NextResponse.json(
      {
        success: true,
        message: "Role berhasil diperbarui.",
        data: role,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
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

    const result = await deleteRole(id);

    return NextResponse.json(
      {
        success: true,
        message: "Role berhasil dihapus.",
        data: result,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
