import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/authorization";

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role === "SUPER_ADMIN") {
      const organizations =
        await prisma.organization.findMany({
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        });

      return NextResponse.json({
        success: true,
        data: {
          role: user.role,
          organizations,
        },
      });
    }

    const memberships =
      await prisma.organizationMember.findMany({
        where: {
          userId: user.id,
          isActive: true,
          organization: {
            status: "ACTIVE",
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          organizationId: true,
          isOwner: true,
          title: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        organizations: memberships.map(
          (membership) => ({
            id:
              membership.organization.id,
            name:
              membership.organization.name,
            slug:
              membership.organization.slug,
            status:
              membership.organization.status,
            isOwner:
              membership.isOwner,
            title:
              membership.title,
          }),
        ),
      },
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/organizations/context error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat organization context.",
      },
      { status: 500 },
    );
  }
}
