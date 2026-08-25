export {};
import crypto from "node:crypto";

import {
  PaymentStatus,
} from "@/generated/prisma/client";

import {
  IontixTestProvider,
} from "@/lib/payment/providers/iontix-test";

import {
  MidtransProvider,
} from "@/lib/payment/providers/midtrans";

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

async function testIontixTestProvider() {
  console.log(
    "→ IONTIX_TEST provider...",
  );

  const provider =
    new IontixTestProvider();

  const statuses = [
    PaymentStatus.PENDING,
    PaymentStatus.SUCCESS,
    PaymentStatus.EXPIRED,
    PaymentStatus.CANCELLED,
    PaymentStatus.FAILED,
  ];

  for (const status of statuses) {
    const notification =
      await provider.verifyNotification({
        externalId:
          `TEST-${status}`,
        status,
        amount: 100000,
        currency: "IDR",
        providerTransactionId:
          `TX-${status}`,
      });

    assert(
      notification.provider ===
        "IONTIX_TEST",
      `Provider mismatch untuk ${status}.`,
    );

    assert(
      notification.externalId ===
        `TEST-${status}`,
      `externalId mismatch untuk ${status}.`,
    );

    assert(
      notification.status === status,
      `Status mismatch untuk ${status}.`,
    );
  }

  console.log(
    "  ✓ PENDING",
  );
  console.log(
    "  ✓ SUCCESS",
  );
  console.log(
    "  ✓ EXPIRED",
  );
  console.log(
    "  ✓ CANCELLED",
  );
  console.log(
    "  ✓ FAILED",
  );
}

function makeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
) {
  return crypto
    .createHash("sha512")
    .update(
      `${orderId}${statusCode}${grossAmount}${serverKey}`,
      "utf8",
    )
    .digest("hex");
}

async function testMidtransStatusMapping() {
  console.log(
    "→ Midtrans status mapping...",
  );

  const serverKey =
    "IONTIX-SANDBOX-TEST-KEY";

  process.env.MIDTRANS_SERVER_KEY =
    serverKey;

  process.env.MIDTRANS_IS_PRODUCTION =
    "false";

  const provider =
    new MidtransProvider();

  const scenarios = [
    {
      name: "settlement",
      transaction_status:
        "settlement",
      status_code: "200",
      fraud_status: undefined,
      expected:
        PaymentStatus.SUCCESS,
    },
    {
      name: "capture",
      transaction_status:
        "capture",
      status_code: "200",
      fraud_status: "accept",
      expected:
        PaymentStatus.SUCCESS,
    },
    {
      name: "pending",
      transaction_status:
        "pending",
      status_code: "201",
      fraud_status: undefined,
      expected:
        PaymentStatus.PENDING,
    },
    {
      name: "expire",
      transaction_status:
        "expire",
      status_code: "407",
      fraud_status: undefined,
      expected:
        PaymentStatus.EXPIRED,
    },
    {
      name: "cancel",
      transaction_status:
        "cancel",
      status_code: "200",
      fraud_status: undefined,
      expected:
        PaymentStatus.CANCELLED,
    },
    {
      name: "deny",
      transaction_status:
        "deny",
      status_code: "200",
      fraud_status: undefined,
      expected:
        PaymentStatus.FAILED,
    },
  ];

  for (const scenario of scenarios) {
    const orderId =
      `IONTIX-${scenario.name.toUpperCase()}`;

    const grossAmount =
      "100000";

    const signature =
      makeMidtransSignature(
        orderId,
        scenario.status_code,
        grossAmount,
        serverKey,
      );

    const notification =
      await provider.verifyNotification({
        order_id: orderId,
        transaction_id:
          `MIDTX-${scenario.name}`,
        transaction_status:
          scenario.transaction_status,
        status_code:
          scenario.status_code,
        gross_amount:
          grossAmount,
        currency: "IDR",
        fraud_status:
          scenario.fraud_status,
        signature_key:
          signature,
        transaction_time:
          "2026-08-21 15:00:00",
        settlement_time:
          "2026-08-21 15:01:00",
      });

    assert(
      notification.status ===
        scenario.expected,
      `${scenario.name}: expected ${scenario.expected}, received ${notification.status}.`,
    );
  }

  console.log(
    "  ✓ settlement → SUCCESS",
  );
  console.log(
    "  ✓ capture/accept → SUCCESS",
  );
  console.log(
    "  ✓ pending → PENDING",
  );
  console.log(
    "  ✓ expire → EXPIRED",
  );
  console.log(
    "  ✓ cancel → CANCELLED",
  );
  console.log(
    "  ✓ deny → FAILED",
  );
}

async function testInvalidMidtransSignature() {
  console.log(
    "→ Midtrans invalid signature...",
  );

  const serverKey =
    "IONTIX-SANDBOX-TEST-KEY";

  process.env.MIDTRANS_SERVER_KEY =
    serverKey;

  process.env.MIDTRANS_IS_PRODUCTION =
    "false";

  const provider =
    new MidtransProvider();

  let rejected = false;

  try {
    await provider.verifyNotification({
      order_id:
        "IONTIX-INVALID-SIGNATURE",
      transaction_id:
        "MIDTX-INVALID",
      transaction_status:
        "settlement",
      status_code:
        "200",
      gross_amount:
        "100000",
      currency:
        "IDR",
      fraud_status:
        "accept",
      signature_key:
        "INVALID-SIGNATURE",
    });
  } catch {
    rejected = true;
  }

  assert(
    rejected,
    "Signature Midtrans yang salah tidak ditolak.",
  );

  console.log(
    "  ✓ Invalid signature ditolak",
  );
}

async function testMidtransCreatePaymentContract() {
  console.log(
    "→ Midtrans create payment contract...",
  );

  const serverKey =
    "IONTIX-SANDBOX-TEST-KEY";

  process.env.MIDTRANS_SERVER_KEY =
    serverKey;

  process.env.MIDTRANS_IS_PRODUCTION =
    "false";

  const provider =
    new MidtransProvider();

  /*
   * Kita tidak memanggil API Midtrans sungguhan.
   * createPayment() memang membutuhkan network,
   * sehingga contract test ini hanya memastikan
   * provider dapat dibuat tanpa production secret.
   */
  assert(
    provider.name === "MIDTRANS",
    "Midtrans provider name salah.",
  );

  console.log(
    "  ✓ Midtrans provider contract valid",
  );
}

async function main() {
  console.log(
    "Running payment contract tests...",
  );

  await testIontixTestProvider();
  await testMidtransStatusMapping();
  await testInvalidMidtransSignature();
  await testMidtransCreatePaymentContract();

  console.log();
  console.log(
    "ALL PAYMENT CONTRACT TESTS PASSED.",
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
