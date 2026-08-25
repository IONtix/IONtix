import { NextResponse } from "next/server";

import { PaymentProviderError } from "@/lib/payment/service";
import { paymentService } from "@/lib/payment";
import { registerPaymentProviders } from "@/lib/payment/providers";
import { confirmPayment } from "@/lib/payment/confirmation";
import {
  isIontixTestHttpAuthorized,
} from "@/lib/payment/test-mode";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

function normalizeProvider(
  value: string,
) {
  return value
    .trim()
    .toUpperCase();
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    registerPaymentProviders();

    const { provider: rawProvider } =
      await context.params;

    const provider =
      normalizeProvider(rawProvider);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment provider wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * IONTIX_TEST hanya boleh digunakan melalui HTTP
     * ketika explicit test-mode flag diaktifkan.
     *
     * Provider internal tetap bisa digunakan langsung oleh
     * automated tests tanpa membuka endpoint HTTP.
     */
    if (
      provider === "IONTIX_TEST" &&
      !isIontixTestHttpAuthorized(
        request,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "IONTIX_TEST HTTP endpoint tidak diaktifkan.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Gunakan centralized PaymentService verification boundary.
     *
     * Jangan memanggil provider.verifyNotification() langsung
     * dari route karena error provider harus dinormalisasi
     * menjadi PaymentProviderError agar HTTP boundary konsisten.
     */
    const payload =
      await request.json();

    const notification =
      await paymentService.verifyNotification(
        provider,
        payload,
        request.headers,
      );

    if (
      notification.provider !==
      provider
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Provider notification tidak sesuai dengan endpoint.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await confirmPayment({
        externalId:
          notification.externalId,
        provider:
          notification.provider,
        status:
          notification.status,
        providerTransactionId:
          notification.providerTransactionId,
        amount:
          notification.amount,
        currency:
          notification.currency,
        providerResponse:
          notification.rawPayload,
        paidAt:
          notification.paidAt ??
          null,
        expiresAt:
          notification.expiresAt ??
          null,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          result.alreadyProcessed
            ? "Payment sudah diproses sebelumnya."
            : "Payment notification berhasil diproses.",
        data: result,
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error(
      "Payment webhook error:",
      error,
    );

    if (
      error instanceof
      PaymentProviderError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          provider:
            error.provider,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses payment webhook.",
      },
      {
        status: 500,
      },
    );
  }
}
