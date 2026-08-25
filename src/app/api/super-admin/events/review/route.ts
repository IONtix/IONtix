import { NextResponse } from "next/server";

import {
  requireAuth,
} from "@/lib/auth/authorization";

import {
  listPendingReviewEvents,
  returnEventToDraft,
  approveAndPublishEvent,
} from "@/lib/events/review-service";

export async function GET() {
  try {
    const user =
      await requireAuth();

    if (
      user.role !==
      "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses hanya untuk Super Admin.",
        },
        {
          status: 403,
        },
      );
    }

    const events =
      await listPendingReviewEvents();

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil event review.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const user =
      await requireAuth();

    if (
      user.role !==
      "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses hanya untuk Super Admin.",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      (await request.json()) as {
        eventId?: string;
        action?:
          | "APPROVE"
          | "RETURN_TO_DRAFT";
        reason?: string;
      };

    if (!body.eventId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Event wajib dipilih.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.action ===
      "RETURN_TO_DRAFT"
    ) {
      const result =
        await returnEventToDraft({
          eventId:
            body.eventId,
          actorUserId:
            user.id,
          reason:
            body.reason || "",
        });

      return NextResponse.json({
        success: true,
        message:
          "Event dikembalikan ke Draft.",
        data: result,
      });
    }

    if (
      body.action === "APPROVE"
    ) {
      const result =
        await approveAndPublishEvent({
          eventId:
            body.eventId,
          actorUserId:
            user.id,
        });

      return NextResponse.json({
        success: true,
        message:
          "Event berhasil disetujui dan dipublikasikan.",
        data: result,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Tindakan review tidak valid.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memproses review event.",
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
