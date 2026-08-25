import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";

export async function GET() {
  try {
    await requireAuth();

    const sports =
      await prisma.sport.findMany({
        where: {
          isActive: true,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            name: "asc",
          },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          iconUrl: true,
          isActive: true,
          sortOrder: true,
          _count: {
            select: {
              events: true,
              templates: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: sports,
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/sports error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
