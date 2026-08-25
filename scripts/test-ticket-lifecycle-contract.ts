import {
  ticketStatusForPaymentLifecycle,
} from "@/lib/ticket/lifecycle";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function main(): void {
  console.log(
    "Running ticket lifecycle contract tests...",
  );

  assert(
    ticketStatusForPaymentLifecycle(
      "REFUNDED",
      "ACTIVE",
    ) === "REFUNDED",
    "ACTIVE + REFUNDED harus menjadi REFUNDED.",
  );

  console.log(
    "  ✓ ACTIVE + REFUNDED → REFUNDED",
  );

  assert(
    ticketStatusForPaymentLifecycle(
      "REFUNDED",
      "USED",
    ) === null,
    "USED tidak boleh diturunkan oleh refund lifecycle.",
  );

  console.log(
    "  ✓ USED + REFUNDED → unchanged",
  );

  assert(
    ticketStatusForPaymentLifecycle(
      "REFUNDED",
      "CANCELLED",
    ) === null,
    "CANCELLED tidak perlu diturunkan lagi.",
  );

  console.log(
    "  ✓ CANCELLED + REFUNDED → unchanged",
  );

  assert(
    ticketStatusForPaymentLifecycle(
      "REFUNDED",
      "REFUNDED",
    ) === null,
    "REFUNDED harus idempotent.",
  );

  console.log(
    "  ✓ REFUNDED + REFUNDED → unchanged",
  );

  assert(
    ticketStatusForPaymentLifecycle(
      "PARTIALLY_REFUNDED",
      "ACTIVE",
    ) === null,
    "Partial refund tidak boleh menebak lifecycle ticket.",
  );

  console.log(
    "  ✓ PARTIALLY_REFUNDED + ACTIVE → unchanged",
  );

  assert(
    ticketStatusForPaymentLifecycle(
      "CANCELLED",
      "ACTIVE",
    ) === null,
    "Payment CANCELLED tidak boleh menurunkan ticket ACTIVE.",
  );

  console.log(
    "  ✓ CANCELLED + ACTIVE → unchanged",
  );

  assert(
    ticketStatusForPaymentLifecycle(
      "EXPIRED",
      "ACTIVE",
    ) === null,
    "Payment EXPIRED tidak boleh menurunkan ticket ACTIVE.",
  );

  console.log(
    "  ✓ EXPIRED + ACTIVE → unchanged",
  );

  console.log(
    "\nALL TICKET LIFECYCLE CONTRACT TESTS PASSED.",
  );
}

main();

export {};
