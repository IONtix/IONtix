import { NextResponse } from "next/server";

import { authorizationErrorResponse } from "@/lib/auth/authorization";
import { cloneRole } from "@/lib/admin/roles";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          message: "ID role sumber tidak ditemukan.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (
      typeof body !== "object" ||
      body === null
    ) {
      return NextResponse.json(
        {
          message: "Payload request tidak valid.",
        },
        { status: 400 },
      );
    }

    const payload =
      body as Record<string, unknown>;

    const name =
      typeof payload.name === "string"
        ? payload.name
        : "";

    const description =
      payload.description === null ||
      payload.description === undefined ||
      typeof payload.description === "string"
        ? (payload.description as
            | string
            | null
            | undefined)
        : undefined;

    const role = await cloneRole(
      id,
      name,
      description,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Role berhasil di-clone.",
        data: role,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
