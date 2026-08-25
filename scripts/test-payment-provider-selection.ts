export {};
function normalizeProvider(
  value: string | undefined,
): string {
  return (
    value ??
    "IONTIX_TEST"
  )
    .trim()
    .toUpperCase();
}

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

function main() {
  console.log(
    "Running payment provider selection tests...",
  );

  const defaultProvider =
    normalizeProvider(
      undefined,
    );

  const testProvider =
    normalizeProvider(
      "IONTIX_TEST",
    );

  const midtransProvider =
    normalizeProvider(
      "midtrans",
    );

  const paddedMidtrans =
    normalizeProvider(
      "  midtrans  ",
    );

  assert(
    defaultProvider ===
      "IONTIX_TEST",
    "Default provider harus IONTIX_TEST.",
  );

  assert(
    testProvider ===
      "IONTIX_TEST",
    "IONTIX_TEST normalization gagal.",
  );

  assert(
    midtransProvider ===
      "MIDTRANS",
    "MIDTRANS normalization gagal.",
  );

  assert(
    paddedMidtrans ===
      "MIDTRANS",
    "Whitespace normalization gagal.",
  );

  console.log(
    "  ✓ Default → IONTIX_TEST",
  );

  console.log(
    "  ✓ IONTIX_TEST normalization",
  );

  console.log(
    "  ✓ MIDTRANS normalization",
  );

  console.log(
    "  ✓ Whitespace normalization",
  );

  console.log();
  console.log(
    "ALL PROVIDER SELECTION TESTS PASSED.",
  );
}

main();
