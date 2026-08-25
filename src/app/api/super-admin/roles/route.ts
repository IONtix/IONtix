import { NextResponse } from "next/server";

import { authorizationErrorResponse } from "@/lib/auth/authorization";

import { createRole, listRoles } from "@/lib/admin/roles";

export async function GET() {
  try {
    const roles = await listRoles();

    return NextResponse.json(
      {
        success: true,
        data: roles,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
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

    const name = typeof payload.name === "string" ? payload.name : "";

    const description =
      payload.description === null ||
      payload.description === undefined ||
      typeof payload.description === "string"
        ? (payload.description as string | null | undefined)
        : undefined;

    const permissionIds = Array.isArray(payload.permissionIds)
      ? payload.permissionIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [];

    const role = await createRole({
      name,
      description,
      permissionIds,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Role berhasil dibuat.",
        data: role,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
