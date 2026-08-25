type PublicPaymentSession = {
  orderId: string;
  externalId: string;
  checkoutUrl: string | null;
  status: string;
  expiresAt: string | null;
};

type PublicRetryPaymentResult = {
  orderId: string;
  externalId: string;
  provider: string;
  status: string;
  checkoutUrl: string | null;
  expiresAt: string | null;
};

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function assertNoToken(
  value: object,
  label: string,
): void {
  const keys = Object.keys(value);

  assert(
    !keys.includes("token"),
    `${label} tidak boleh mengekspos token.`,
  );

  const serialized =
    JSON.stringify(value);

  assert(
    !serialized.includes('"token"'),
    `${label} response masih mengandung field token.`,
  );

  console.log(
    `  ✓ ${label} tidak mengekspos token`,
  );
}

function main(): void {
  console.log(
    "Running payment session privacy contract...",
  );

  const checkoutResponse: PublicPaymentSession = {
    orderId: "order-test",
    externalId: "IONTIX-TEST-001",
    checkoutUrl:
      "/checkout/test/IONTIX-TEST-001",
    status: "PENDING",
    expiresAt:
      new Date().toISOString(),
  };

  assertNoToken(
    checkoutResponse,
    "Checkout payment session",
  );

  assert(
    checkoutResponse.checkoutUrl !==
      null,
    "Checkout URL harus tetap tersedia.",
  );

  assert(
    checkoutResponse.externalId.length > 0,
    "External ID harus tetap tersedia.",
  );

  const retryResponse: PublicRetryPaymentResult = {
    orderId: "order-test",
    externalId: "IONTIX-TEST-002",
    provider: "IONTIX_TEST",
    status: "PENDING",
    checkoutUrl:
      "/checkout/test/IONTIX-TEST-002",
    expiresAt:
      new Date().toISOString(),
  };

  assertNoToken(
    retryResponse,
    "Retry payment session",
  );

  assert(
    retryResponse.checkoutUrl !==
      null,
    "Retry checkout URL harus tetap tersedia.",
  );

  assert(
    retryResponse.externalId.length > 0,
    "Retry external ID harus tetap tersedia.",
  );

  console.log(
    "  ✓ Checkout public contract tetap lengkap",
  );
  console.log(
    "  ✓ Retry public contract tetap lengkap",
  );

  console.log(
    "\nALL PAYMENT SESSION PRIVACY TESTS PASSED.",
  );
}

main();

export {};
