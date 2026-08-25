import { NextResponse } from "next/server";

import {
  requireAuth,
} from "@/lib/auth/authorization";

import {
  requireEventPermission,
} from "@/lib/auth/organization";

import {
  publishEvent,
  submitEventForReview,
} from "@/lib/events/publish-control";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireAuth();

    const { eventId } =
      await context.params;

    await requireEventPermission(
      eventId,
      "events.manage",
    );

    const body =
      (await request.json()) as {
        action?: "SUBMIT_REVIEW" | "PUBLISH";
      };

    if (
      body.action !== "SUBMIT_REVIEW" &&
      body.action !== "PUBLISH"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tindakan event tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.action === "SUBMIT_REVIEW"
    ) {
      if (
        user.role !== "EO"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Hanya Penyelenggara/EO yang dapat mengajukan event untuk review.",
          },
          {
            status: 403,
          },
        );
      }

      const result =
        await submitEventForReview(
          eventId,
          user.id,
        );

      return NextResponse.json({
        success: true,
        message:
          "Event berhasil diajukan untuk review.",
        data: result,
      });
    }

    if (
      user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hanya Super Admin yang dapat mempublikasikan event.",
        },
        {
          status: 403,
        },
      );
    }

    const result =
      await publishEvent(
        eventId,
        user.id,
      );

    return NextResponse.json({
      success: true,
      message:
        "Event berhasil dipublikasikan.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Publish control error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memproses event.",
      },
      {
        status:
          error &&
          typeof error === "object" &&
          "status" in error
            ? Number(
                (
                  error as {
                    status: number;
                  }
                ).status,
              )
            : 500,
      },
    );
  }
}
