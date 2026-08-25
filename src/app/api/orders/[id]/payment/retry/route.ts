import { NextResponse } from "next/server";

import {
  requireAuth,
} from "@/lib/auth/authorization";

import {
  retryPaymentSession,
} from "@/lib/payment/retry";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user =
      await requireAuth();

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order ID wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await retryPaymentSession({
        orderId: id,
        userId: user.id,
      });

    return NextResponse.json({
      success: true,
      message:
        "Payment session berhasil dibuat ulang.",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal membuat ulang payment session.";

    const status =
      message.includes(
        "Terlalu banyak retry payment",
      )
        ? 429
        : message.includes(
            "tidak memiliki akses",
          )
          ? 403
        : message.includes(
              "tidak ditemukan",
            )
          ? 404
          : message.includes(
                "sudah",
              ) ||
              message.includes(
                "melewati",
              ) ||
              message.includes(
                "tidak dapat",
              )
            ? 409
            : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status,
      },
    );
  }
}
