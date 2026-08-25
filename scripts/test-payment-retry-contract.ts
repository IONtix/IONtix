export {};
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

type RetryCase = {
  orderStatus: string;
  paymentStatus: string;
  shouldAllow: boolean;
};

function evaluateRetryEligibility(
  orderStatus: string,
  paymentStatus: string,
): boolean {
  if (
    orderStatus === "PENDING_PAYMENT" ||
    orderStatus === "PAYMENT_PROCESSING"
  ) {
    if (
      paymentStatus === "PENDING" ||
      paymentStatus === "AUTHORIZED"
    ) {
      return true;
    }
  }

  return false;
}

function main() {
  console.log(
    "Running payment retry contract tests...",
  );

  const cases: RetryCase[] = [
    {
      orderStatus: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      shouldAllow: true,
    },
    {
      orderStatus: "PAYMENT_PROCESSING",
      paymentStatus: "PENDING",
      shouldAllow: true,
    },
    {
      orderStatus: "PENDING_PAYMENT",
      paymentStatus: "AUTHORIZED",
      shouldAllow: true,
    },
    {
      orderStatus: "PAYMENT_PROCESSING",
      paymentStatus: "AUTHORIZED",
      shouldAllow: true,
    },
    {
      orderStatus: "PAID",
      paymentStatus: "SUCCESS",
      shouldAllow: false,
    },
    {
      orderStatus: "EXPIRED",
      paymentStatus: "EXPIRED",
      shouldAllow: false,
    },
    {
      orderStatus: "CANCELLED",
      paymentStatus: "CANCELLED",
      shouldAllow: false,
    },
    {
      orderStatus: "FAILED",
      paymentStatus: "FAILED",
      shouldAllow: false,
    },
  ];

  for (const testCase of cases) {
    const actual =
      evaluateRetryEligibility(
        testCase.orderStatus,
        testCase.paymentStatus,
      );

    assert(
      actual === testCase.shouldAllow,
      `${testCase.orderStatus}/${testCase.paymentStatus} retry eligibility tidak sesuai.`,
    );
  }

  console.log(
    "  ✓ PENDING_PAYMENT + PENDING → retry",
  );

  console.log(
    "  ✓ PAYMENT_PROCESSING + PENDING → retry",
  );

  console.log(
    "  ✓ PENDING_PAYMENT + AUTHORIZED → retry",
  );

  console.log(
    "  ✓ PAYMENT_PROCESSING + AUTHORIZED → retry",
  );

  console.log(
    "  ✓ PAID + SUCCESS → ditolak",
  );

  console.log(
    "  ✓ EXPIRED → ditolak",
  );

  console.log(
    "  ✓ CANCELLED → ditolak",
  );

  console.log(
    "  ✓ FAILED → ditolak",
  );

  console.log();
  console.log(
    "ALL PAYMENT RETRY TESTS PASSED.",
  );
}

main();
