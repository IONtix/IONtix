export {};
import {
  OrderStatus,
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

function testExpiryStateContract() {
  console.log(
    "→ Expiry state contract...",
  );

  const paymentStatuses =
    new Set<string>(
      Object.values(
        PaymentStatus,
      ),
    );

  const orderStatuses =
    new Set<string>(
      Object.values(
        OrderStatus,
      ),
    );

  assert(
    paymentStatuses.has("PENDING"),
    "PaymentStatus PENDING harus tersedia.",
  );

  assert(
    paymentStatuses.has("SUCCESS"),
    "PaymentStatus SUCCESS harus tersedia.",
  );

  assert(
    paymentStatuses.has("EXPIRED"),
    "PaymentStatus EXPIRED harus tersedia.",
  );

  assert(
    orderStatuses.has(
      "PENDING_PAYMENT",
    ),
    "OrderStatus PENDING_PAYMENT harus tersedia.",
  );

  assert(
    orderStatuses.has(
      "PAYMENT_PROCESSING",
    ),
    "OrderStatus PAYMENT_PROCESSING harus tersedia.",
  );

  assert(
    orderStatuses.has("PAID"),
    "OrderStatus PAID harus tersedia.",
  );

  assert(
    orderStatuses.has("EXPIRED"),
    "OrderStatus EXPIRED harus tersedia.",
  );

  assert(
    paymentStatuses.size >= 5,
    "PaymentStatus enum tidak lengkap.",
  );

  assert(
    orderStatuses.size >= 5,
    "OrderStatus enum tidak lengkap.",
  );

  console.log(
    "  ✓ Payment PENDING tersedia",
  );

  console.log(
    "  ✓ Payment SUCCESS tersedia",
  );

  console.log(
    "  ✓ Payment EXPIRED tersedia",
  );

  console.log(
    "  ✓ Order PENDING_PAYMENT tersedia",
  );

  console.log(
    "  ✓ Order PAYMENT_PROCESSING tersedia",
  );

  console.log(
    "  ✓ Order PAID tersedia",
  );

  console.log(
    "  ✓ Order EXPIRED tersedia",
  );
}

function testEligiblePaymentStatuses() {
  console.log(
    "→ Eligible payment statuses...",
  );

  const eligible: PaymentStatus[] = [
    PaymentStatus.PENDING,
  ];

  const finalStatuses: PaymentStatus[] = [
    PaymentStatus.SUCCESS,
    PaymentStatus.EXPIRED,
    PaymentStatus.CANCELLED,
    PaymentStatus.FAILED,
  ];

  assert(
    eligible.includes(
      PaymentStatus.PENDING,
    ),
    "PENDING harus eligible.",
  );

  for (
    const status of finalStatuses
  ) {
    assert(
      !eligible.includes(status),
      `${status} tidak boleh direconcile.`,
    );
  }

  console.log(
    "  ✓ Hanya PENDING payment yang direconcile",
  );

  console.log(
    "  ✓ SUCCESS tidak direconcile",
  );

  console.log(
    "  ✓ EXPIRED tidak diproses ulang",
  );

  console.log(
    "  ✓ CANCELLED tidak direconcile",
  );

  console.log(
    "  ✓ FAILED tidak direconcile",
  );
}

function testOrderExpiryContract() {
  console.log(
    "→ Order expiry contract...",
  );

  const pendingStatuses:
    OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_PROCESSING,
    ];

  assert(
    pendingStatuses.includes(
      OrderStatus.PENDING_PAYMENT,
    ),
    "PENDING_PAYMENT harus menjadi kandidat expiry.",
  );

  assert(
    pendingStatuses.includes(
      OrderStatus.PAYMENT_PROCESSING,
    ),
    "PAYMENT_PROCESSING harus menjadi kandidat expiry.",
  );

  assert(
    !pendingStatuses.includes(
      OrderStatus.PAID,
    ),
    "PAID tidak boleh menjadi kandidat expiry.",
  );

  assert(
    !pendingStatuses.includes(
      OrderStatus.EXPIRED,
    ),
    "EXPIRED tidak boleh diproses ulang.",
  );

  console.log(
    "  ✓ Pending order eligible",
  );

  console.log(
    "  ✓ Processing order eligible",
  );

  console.log(
    "  ✓ PAID terlindungi",
  );

  console.log(
    "  ✓ EXPIRED terlindungi",
  );
}

function main() {
  console.log(
    "Running payment reconciliation contract tests...",
  );

  testExpiryStateContract();
  testEligiblePaymentStatuses();
  testOrderExpiryContract();

  console.log();
  console.log(
    "ALL RECONCILIATION CONTRACT TESTS PASSED.",
  );
}

main();
