import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";

export async function GET(
  request: Request,
) {
  try {
    await requireAuth();

    const { searchParams } =
      new URL(request.url);

    const sportId =
      searchParams
        .get("sportId")
        ?.trim() || undefined;

    const templates =
      await prisma.formTemplate.findMany({
        where: {
          isActive: true,
          ...(sportId
            ? {
                sportId,
              }
            : {}),
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          sportId: true,
          name: true,
          slug: true,
          description: true,
          isSystem: true,
          isActive: true,
          allowEOEdit: true,
          createdAt: true,
          updatedAt: true,

          sport: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          versions: {
            where: {
              status: "PUBLISHED",
            },
            orderBy: {
              version: "desc",
            },
            take: 1,
            select: {
              id: true,
              version: true,
              status: true,
              publishedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/form-templates error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
