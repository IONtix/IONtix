import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    await requireAuth();

    const { id } = await context.params;

    const template =
      await prisma.formTemplate.findUnique({
        where: {
          id,
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
              description: true,
              iconUrl: true,
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

              fields: {
                where: {
                  isVisible: true,
                },
                orderBy: {
                  order: "asc",
                },
                select: {
                  id: true,
                  key: true,
                  label: true,
                  description: true,
                  fieldType: true,
                  placeholder: true,
                  defaultValue: true,
                  validation: true,
                  order: true,
                  isRequired: true,
                  isSystem: true,
                  isEditableByEO: true,
                  isVisible: true,

                  options: {
                    where: {
                      isActive: true,
                    },
                    orderBy: {
                      order: "asc",
                    },
                    select: {
                      id: true,
                      label: true,
                      value: true,
                      order: true,
                      isActive: true,
                    },
                  },
                },
              },

              rules: {
                orderBy: {
                  priority: "asc",
                },
                select: {
                  id: true,
                  conditionFieldId: true,
                  operator: true,
                  comparisonValue: true,
                  targetFieldId: true,
                  action: true,
                  priority: true,
                },
              },
            },
          },
        },
      });

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: "Template tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error: unknown) {
    console.error(
      "GET /api/form-templates/[id] error:",
      error,
    );

    return authorizationErrorResponse(
      error,
    );
  }
}
