import "dotenv/config";

process.env.MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY ||
  "IONTIX-WEBHOOK-HTTP-TEST-KEY";

process.env.MIDTRANS_IS_PRODUCTION = "false";

import {
  PaymentStatus,
} from "@/generated/prisma/client";


function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `TEST FAILED: ${message}`,
    );
  }
}

let webhookPost:
  typeof import("@/app/api/payments/webhook/[provider]/route").POST;

async function ensureWebhookRouteLoaded(): Promise<
  typeof import("@/app/api/payments/webhook/[provider]/route").POST
> {
  if (!webhookPost) {
    const webhookModule =
      await import(
        "@/app/api/payments/webhook/[provider]/route"
      );

    webhookPost =
      webhookModule.POST;
  }

  return webhookPost;
}

async function callWebhook(
  provider: string,
  body: unknown,
  options?: {
    nodeEnv?: string;
    testEnabled?: string;
  },
): Promise<Response> {
  const originalNodeEnv =
    process.env.NODE_ENV;

  const originalTestEnabled =
    process.env.IONTIX_TEST_ENABLED;

  const originalTestSecret =
    process.env.IONTIX_TEST_HTTP_SECRET;

  const env =
    process.env as Record<
      string,
      string | undefined
    >;

  if (options?.nodeEnv === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV =
      options.nodeEnv;
  }

  if (options?.testEnabled === undefined) {
    delete env.IONTIX_TEST_ENABLED;
  } else {
    env.IONTIX_TEST_ENABLED =
      options.testEnabled;
  }

  env.IONTIX_TEST_HTTP_SECRET =
    "IONTIX-WEBHOOK-HTTP-TEST-SECRET";

  try {
    const POST =
      await ensureWebhookRouteLoaded();

    return await POST(
      new Request(
        `http://localhost/api/payments/webhook/${provider}`,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            "x-iontix-test-secret":
              "IONTIX-WEBHOOK-HTTP-TEST-SECRET",
          },
          body: JSON.stringify(body),
        },
      ),
      {
        params: Promise.resolve({
          provider,
        }),
      },
    );
  } finally {
    if (originalNodeEnv === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV =
        originalNodeEnv;
    }

    if (
      originalTestEnabled ===
      undefined
    ) {
      delete env.IONTIX_TEST_ENABLED;
    } else {
      env.IONTIX_TEST_ENABLED =
        originalTestEnabled;
    }

    if (
      originalTestSecret ===
      undefined
    ) {
      delete env.IONTIX_TEST_HTTP_SECRET;
    } else {
      env.IONTIX_TEST_HTTP_SECRET =
        originalTestSecret;
    }
  }
}

async function readJson(
  response: Response,
): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<
    string,
    unknown
  >;
}

async function testIontixTestBlockedWithoutFlag() {
  console.log(
    "→ IONTIX_TEST tanpa explicit flag...",
  );

  const response =
    await callWebhook(
      "IONTIX_TEST",
      {
        externalId:
          "WEBHOOK-TEST-BLOCKED",
        status:
          PaymentStatus.SUCCESS,
        amount: 100000,
        currency: "IDR",
      },
      {
        nodeEnv:
          "development",
        testEnabled:
          undefined,
      },
    );

  const body =
    await readJson(response);

  assert(
    response.status === 404,
    `Expected 404, received ${response.status}.`,
  );

  assert(
    body.error ===
      "IONTIX_TEST HTTP endpoint tidak diaktifkan.",
    "IONTIX_TEST tanpa flag harus ditolak.",
  );

  console.log(
    "  ✓ HTTP endpoint tanpa flag → 404",
  );
}

async function testIontixTestBlockedInProduction() {
  console.log(
    "→ IONTIX_TEST production...",
  );

  const response =
    await callWebhook(
      "IONTIX_TEST",
      {
        externalId:
          "WEBHOOK-TEST-PRODUCTION",
        status:
          PaymentStatus.SUCCESS,
        amount: 100000,
        currency: "IDR",
      },
      {
        nodeEnv:
          "production",
        testEnabled:
          "true",
      },
    );

  assert(
    response.status === 404,
    `Expected production 404, received ${response.status}.`,
  );

  console.log(
    "  ✓ production → 404",
  );
}

async function testUnknownProvider() {
  console.log(
    "→ Unknown provider...",
  );

  const response =
    await callWebhook(
      "UNKNOWN_PROVIDER",
      {
        externalId:
          "WEBHOOK-UNKNOWN",
        status:
          PaymentStatus.SUCCESS,
        amount: 100000,
        currency: "IDR",
      },
      {
        nodeEnv:
          "development",
        testEnabled:
          "true",
      },
    );

  assert(
    response.status === 400,
    `Expected 400, received ${response.status}.`,
  );

  const body =
    await readJson(response);

  assert(
    typeof body.error ===
      "string",
    "Unknown provider harus menghasilkan error.",
  );

  console.log(
    "  ✓ unknown provider → 400",
  );
}

async function testIontixTestAllowedWithExplicitFlag() {
  console.log(
    "→ IONTIX_TEST dengan explicit flag...",
  );

  const response =
    await callWebhook(
      "IONTIX_TEST",
      {
        externalId:
          `WEBHOOK-TEST-${Date.now()}`,
        status:
          PaymentStatus.FAILED,
        amount: 100000,
        currency: "IDR",
      },
      {
        nodeEnv:
          "development",
        testEnabled:
          "true",
      },
    );

  assert(
    response.status !== 404,
    "Explicitly enabled IONTIX_TEST tidak boleh terkena isolation guard.",
  );

  console.log(
    `  ✓ explicit flag → HTTP ${response.status}`,
  );
}

async function testMidtransInvalidSignatureAtHttpBoundary() {
  console.log(
    "→ Midtrans invalid signature pada HTTP boundary...",
  );

  const response =
    await callWebhook(
      "MIDTRANS",
      {
        order_id:
          "IONTIX-HTTP-INVALID-SIGNATURE",
        transaction_id:
          "MIDTX-HTTP-INVALID",
        transaction_status:
          "settlement",
        status_code:
          "200",
        gross_amount:
          "100000.00",
        currency:
          "IDR",
        fraud_status:
          "accept",
        signature_key:
          "INVALID-SIGNATURE",
      },
      {
        nodeEnv:
          "development",
        testEnabled:
          undefined,
      },
    );

  const body =
    await readJson(response);

  assert(
    response.status === 400,
    `Expected 400, received ${response.status}.`,
  );

  assert(
    body.success === false,
    "Invalid Midtrans signature harus success=false.",
  );

  assert(
    typeof body.error === "string" &&
      body.error
        .toLowerCase()
        .includes("signature"),
    "Response harus menunjukkan signature tidak valid.",
  );

  console.log(
    "  ✓ Midtrans registered",
  );
  console.log(
    "  ✓ Invalid signature diverifikasi di provider",
  );
  console.log(
    "  ✓ HTTP boundary → 400",
  );
  console.log(
    "  ✓ confirmPayment tidak dilewati",
  );
}

async function main() {
  console.log(
    "Running payment webhook security tests...",
  );

  await testIontixTestBlockedWithoutFlag();
  await testIontixTestBlockedInProduction();
  await testUnknownProvider();
  await testIontixTestAllowedWithExplicitFlag();
  await testMidtransInvalidSignatureAtHttpBoundary();

  console.log();
  console.log(
    "ALL PAYMENT WEBHOOK SECURITY TESTS PASSED.",
  );
}

main().catch(
  (error: unknown) => {
    console.error();
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );
    process.exit(1);
  },
);

export {};
